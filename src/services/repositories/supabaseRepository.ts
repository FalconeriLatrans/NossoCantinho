/**
 * Persistência no Supabase (Postgres + Storage).
 *
 * Tabelas: experiences, memories, memory_photos, feedbacks,
 * feedback_memories, feedback_experiences — ver supabase/schema.sql.
 * Fotos: bucket privado `memory-photos`, caminho `<couple_id>/<memory_id>/<photo_id>.<ext>`.
 */
import { PHOTO_BUCKET, SIGNED_URL_TTL } from '../../constants'
import type { SupabaseClientType } from '../../lib/supabase'
import type { Experience, Feedback, Memory, Photo, WishStatus } from '../../types'
import { isoToLocalDateTime, localDateTimeToISO } from '../../utils/date'
import { ensureOk } from '../supabase/errors'
import type { CantinhoRepository, PhotoUpload } from './types'

/* ---------- Formato das linhas no banco ---------- */

interface PhotoRow {
  id: string
  memory_id: string
  storage_path: string
  is_cover: boolean
  position: number
}

interface MemoryRow {
  id: string
  title: string
  description: string
  memory_date: string
  is_anniversary: boolean
  experience_id: string | null
  created_at: string
}

interface WishRow {
  id: string
  title: string
  category: string
  source_url: string
  description: string
  status: WishStatus
  planned_at: string | null
  location: string
  created_at: string
}

interface FeedbackRow {
  id: string
  feedback_date: string
  roberto_text: string
  tamiris_text: string
  created_at: string
}

// Consultas simples, sem "embed" (tabela(colunas)): não dependem de o Supabase
// detectar as chaves estrangeiras, o que falhava em bancos atualizados do schema antigo.
const MEMORY_COLUMNS = 'id, title, description, memory_date, is_anniversary, experience_id, created_at'
const PHOTO_COLUMNS = 'id, memory_id, storage_path, is_cover, position'
const WISH_COLUMNS = 'id, title, category, source_url, description, status, planned_at, location, created_at'
const FEEDBACK_COLUMNS = 'id, feedback_date, roberto_text, tamiris_text, created_at'

/* ---------- Conversões linha ⇄ app ---------- */

const groupBy = <T, K extends keyof T>(rows: T[], key: K) => {
  const map = new Map<T[K], T[]>()
  rows.forEach((row) => map.set(row[key], [...(map.get(row[key]) ?? []), row]))
  return map
}

const toMemory = (row: MemoryRow, photos: PhotoRow[] = []): Memory => ({
  id: row.id,
  title: row.title,
  description: row.description ?? '',
  memory_date: row.memory_date,
  is_anniversary: row.is_anniversary,
  experience_id: row.experience_id,
  created_at: row.created_at,
  photos: [...photos]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ id: p.id, is_cover: p.is_cover, path: p.storage_path })),
})

const toWish = (row: WishRow): Experience => ({
  ...row,
  source_url: row.source_url ?? '',
  description: row.description ?? '',
  location: row.location ?? '',
  planned_at: isoToLocalDateTime(row.planned_at),
})

const toFeedback = (row: FeedbackRow, memoryIds: string[] = [], experienceIds: string[] = []): Feedback => ({
  id: row.id,
  feedback_date: row.feedback_date,
  roberto_text: row.roberto_text ?? '',
  tamiris_text: row.tamiris_text ?? '',
  created_at: row.created_at,
  memory_ids: memoryIds,
  experience_ids: experienceIds,
})

const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

/* ---------- Repositório ---------- */

export interface SupabaseRepositoryOptions {
  client: SupabaseClientType
  coupleId: string
  userId: string
}

export function createSupabaseRepository({ client, coupleId, userId }: SupabaseRepositoryOptions): CantinhoRepository {
  const bucket = () => client.storage.from(PHOTO_BUCKET)

  /** Cache de URLs assinadas: path → { url, validade }. */
  const urlCache = new Map<string, { url: string; expiresAt: number }>()
  const cacheUrl = (path: string, url: string, ttlSeconds: number) =>
    urlCache.set(path, { url, expiresAt: Date.now() + ttlSeconds * 1000 })

  /** Gera de uma vez as URLs de todas as fotos (evita uma requisição por foto). */
  async function prefetchUrls(paths: string[]) {
    const missing = paths.filter((p) => !urlCache.has(p))
    for (let i = 0; i < missing.length; i += 100) {
      const chunk = missing.slice(i, i + 100)
      const { data } = await bucket().createSignedUrls(chunk, SIGNED_URL_TTL)
      data?.forEach((item) => {
        if (item.path && item.signedUrl && !item.error) cacheUrl(item.path, item.signedUrl, SIGNED_URL_TTL)
      })
    }
  }

  async function removeFiles(paths: string[]) {
    if (!paths.length) return
    await bucket().remove(paths)
    paths.forEach((p) => urlCache.delete(p))
  }

  async function uploadPhotos(memoryId: string, uploads: PhotoUpload[]): Promise<Map<string, string>> {
    const paths = new Map<string, string>()
    try {
      for (const { id, blob } of uploads) {
        const ext = EXTENSIONS[blob.type] ?? 'jpg'
        const path = `${coupleId}/${memoryId}/${id}.${ext}`
        const { error } = await bucket().upload(path, blob, {
          contentType: EXTENSIONS[blob.type] ? blob.type : 'image/jpeg',
          upsert: false,
        })
        ensureOk(error, 'enviar a foto')
        paths.set(id, path)
        // Exibe na hora a partir do arquivo local, sem baixar de volta.
        urlCache.set(path, { url: URL.createObjectURL(blob), expiresAt: Number.POSITIVE_INFINITY })
      }
      return paths
    } catch (error) {
      await removeFiles([...paths.values()]).catch(() => undefined)
      throw error
    }
  }

  /** Sincroniza a tabela memory_photos com a lista final de fotos da memória. */
  async function syncPhotoRows(memory: Memory, previous: Memory | undefined, newPaths: Map<string, string>) {
    const previousPhotos = previous?.photos ?? []
    const keptIds = new Set(memory.photos.map((p) => p.id))
    const removed = previousPhotos.filter((p) => !keptIds.has(p.id))

    // 1. Fotos removidas: arquivo primeiro, depois a linha.
    if (removed.length) {
      await removeFiles(removed.map((p) => p.path).filter((p): p is string => Boolean(p))).catch(() => undefined)
      const { error } = await client.from('memory_photos').delete().in('id', removed.map((p) => p.id))
      ensureOk(error, 'remover fotos')
    }

    // 2. Capa: o banco aceita só uma por memória, então desmarca a antiga antes.
    const oldCover = previousPhotos.find((p) => p.is_cover && keptIds.has(p.id))
    const newCover = memory.photos.find((p) => p.is_cover)
    if (oldCover && oldCover.id !== newCover?.id) {
      const { error } = await client.from('memory_photos').update({ is_cover: false }).eq('id', oldCover.id)
      ensureOk(error, 'atualizar a capa')
    }

    // 3. Ordem das fotos que já existiam.
    const previousIndex = new Map(previousPhotos.map((p, i) => [p.id, i]))
    for (const [position, photo] of memory.photos.entries()) {
      const before = previousIndex.get(photo.id)
      if (before !== undefined && before !== position) {
        const { error } = await client.from('memory_photos').update({ position }).eq('id', photo.id)
        ensureOk(error, 'reordenar fotos')
      }
    }

    // 4. Fotos novas.
    const newRows = memory.photos
      .map((photo, position) => ({ photo, position }))
      .filter(({ photo }) => newPaths.has(photo.id))
      .map(({ photo, position }) => ({
        id: photo.id,
        memory_id: memory.id,
        couple_id: coupleId,
        storage_path: newPaths.get(photo.id) as string,
        is_cover: photo.is_cover,
        position,
      }))
    if (newRows.length) {
      const { error } = await client.from('memory_photos').insert(newRows)
      ensureOk(error, 'salvar as fotos')
    }

    // 5. Nova capa entre as fotos que já existiam.
    if (newCover && newCover.id !== oldCover?.id && !newPaths.has(newCover.id)) {
      const { error } = await client.from('memory_photos').update({ is_cover: true }).eq('id', newCover.id)
      ensureOk(error, 'atualizar a capa')
    }
  }

  async function replaceLinks(
    table: 'feedback_memories' | 'feedback_experiences',
    column: 'memory_id' | 'experience_id',
    feedbackId: string,
    ids: string[],
    isNew: boolean,
  ) {
    if (!isNew) {
      const { error } = await client.from(table).delete().eq('feedback_id', feedbackId)
      ensureOk(error, 'atualizar os vínculos do feedback')
    }
    if (ids.length) {
      const { error } = await client.from(table).insert(ids.map((id) => ({ feedback_id: feedbackId, [column]: id })))
      ensureOk(error, 'salvar os vínculos do feedback')
    }
  }

  return {
    mode: 'supabase',

    async load() {
      const [wishes, memories, photos, feedbacks, memoryLinks, wishLinks] = await Promise.all([
        client.from('experiences').select(WISH_COLUMNS).eq('couple_id', coupleId),
        client.from('memories').select(MEMORY_COLUMNS).eq('couple_id', coupleId),
        client.from('memory_photos').select(PHOTO_COLUMNS).eq('couple_id', coupleId),
        client.from('feedbacks').select(FEEDBACK_COLUMNS).eq('couple_id', coupleId),
        // As tabelas de vínculo não têm couple_id; o RLS já filtra pelo casal.
        client.from('feedback_memories').select('feedback_id, memory_id'),
        client.from('feedback_experiences').select('feedback_id, experience_id'),
      ])
      ensureOk(wishes.error, 'carregar os desejos (tabela experiences)')
      ensureOk(memories.error, 'carregar as memórias (tabela memories)')
      ensureOk(photos.error, 'carregar as fotos (tabela memory_photos)')
      ensureOk(feedbacks.error, 'carregar os feedbacks (tabela feedbacks)')
      ensureOk(memoryLinks.error, 'carregar os vínculos (tabela feedback_memories)')
      ensureOk(wishLinks.error, 'carregar os vínculos (tabela feedback_experiences)')

      const photosByMemory = groupBy((photos.data ?? []) as unknown as PhotoRow[], 'memory_id')
      const memoryLinksByFeedback = groupBy(
        (memoryLinks.data ?? []) as unknown as { feedback_id: string; memory_id: string }[],
        'feedback_id',
      )
      const wishLinksByFeedback = groupBy(
        (wishLinks.data ?? []) as unknown as { feedback_id: string; experience_id: string }[],
        'feedback_id',
      )

      const data = {
        wishes: ((wishes.data ?? []) as unknown as WishRow[]).map(toWish),
        memories: ((memories.data ?? []) as unknown as MemoryRow[]).map((m) => toMemory(m, photosByMemory.get(m.id))),
        feedbacks: ((feedbacks.data ?? []) as unknown as FeedbackRow[]).map((f) =>
          toFeedback(
            f,
            (memoryLinksByFeedback.get(f.id) ?? []).map((l) => l.memory_id),
            (wishLinksByFeedback.get(f.id) ?? []).map((l) => l.experience_id),
          ),
        ),
      }
      const paths = data.memories.flatMap((m) => m.photos.map((p) => p.path)).filter((p): p is string => Boolean(p))
      await prefetchUrls(paths).catch(() => undefined)
      return data
    },

    async getPhotoUrl(photo) {
      if (!photo.path) return null
      const cached = urlCache.get(photo.path)
      if (cached && cached.expiresAt - Date.now() > 60_000) return cached.url
      const { data, error } = await bucket().createSignedUrl(photo.path, SIGNED_URL_TTL)
      if (error || !data?.signedUrl) return null
      cacheUrl(photo.path, data.signedUrl, SIGNED_URL_TTL)
      return data.signedUrl
    },

    async saveMemory(memory, uploads, previous) {
      const isNew = !previous
      const newPaths = await uploadPhotos(memory.id, uploads)

      const fields = {
        title: memory.title,
        description: memory.description,
        memory_date: memory.memory_date,
        is_anniversary: memory.is_anniversary,
        experience_id: memory.experience_id,
      }
      try {
        const { error } = isNew
          ? await client.from('memories').insert({ id: memory.id, couple_id: coupleId, created_by: userId, ...fields })
          : await client.from('memories').update(fields).eq('id', memory.id)
        ensureOk(error, 'salvar a memória')
      } catch (error) {
        await removeFiles([...newPaths.values()]).catch(() => undefined)
        throw error
      }

      try {
        await syncPhotoRows(memory, previous, newPaths)
      } catch (error) {
        // Memória nova: desfaz (linha + arquivos) para não criar duplicada ao tentar de novo.
        if (isNew) {
          await client.from('memories').delete().eq('id', memory.id)
          await removeFiles([...newPaths.values()]).catch(() => undefined)
        }
        throw error
      }

      const photos: Photo[] = memory.photos.map((p) => ({ ...p, path: p.path ?? newPaths.get(p.id) }))
      return { ...memory, photos }
    },

    async deleteMemory(memory) {
      await removeFiles(memory.photos.map((p) => p.path).filter((p): p is string => Boolean(p))).catch(() => undefined)
      const { error } = await client.from('memories').delete().eq('id', memory.id)
      ensureOk(error, 'excluir a memória')
    },

    async saveWish(wish, isNew) {
      const fields = {
        title: wish.title,
        category: wish.category,
        source_url: wish.source_url,
        description: wish.description,
        status: wish.status,
        planned_at: localDateTimeToISO(wish.planned_at),
        location: wish.location,
      }
      const { error } = isNew
        ? await client.from('experiences').insert({ id: wish.id, couple_id: coupleId, created_by: userId, ...fields })
        : await client.from('experiences').update(fields).eq('id', wish.id)
      ensureOk(error, 'salvar o desejo')
      return wish
    },

    async deleteWish(id) {
      const { error } = await client.from('experiences').delete().eq('id', id)
      ensureOk(error, 'excluir o desejo')
    },

    async saveFeedback(feedback, isNew) {
      const fields = {
        feedback_date: feedback.feedback_date,
        roberto_text: feedback.roberto_text,
        tamiris_text: feedback.tamiris_text,
      }
      const { error } = isNew
        ? await client.from('feedbacks').insert({ id: feedback.id, couple_id: coupleId, created_by: userId, ...fields })
        : await client.from('feedbacks').update(fields).eq('id', feedback.id)
      ensureOk(error, 'salvar o feedback')

      try {
        await replaceLinks('feedback_memories', 'memory_id', feedback.id, feedback.memory_ids, isNew)
        await replaceLinks('feedback_experiences', 'experience_id', feedback.id, feedback.experience_ids, isNew)
      } catch (error) {
        // Feedback novo: desfaz para o usuário poder tentar de novo sem criar duplicado.
        if (isNew) await client.from('feedbacks').delete().eq('id', feedback.id)
        throw error
      }
      return feedback
    },

    async deleteFeedback(id) {
      const { error } = await client.from('feedbacks').delete().eq('id', id)
      ensureOk(error, 'excluir o feedback')
    },
  }
}
