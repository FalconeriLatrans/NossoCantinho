/**
 * Persistência local (localStorage) dos registros do casal.
 *
 * Também migra os dados salvos pela versão anterior do app (chaves *_v3/_v1),
 * normalizando campos ausentes para que dados antigos não quebrem a interface.
 */
import { STORAGE_KEYS, WISH_CATEGORIES } from '../constants'
import type { CantinhoData, Experience, Feedback, Memory, Photo, WishStatus } from '../types'
import { todayISO } from '../utils/date'
import { createId } from '../utils/id'

type Raw = Record<string, unknown>

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null
const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)
const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
const nowIso = () => new Date().toISOString()

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

/* ---------- Normalização ---------- */

function toPhotos(value: unknown): Photo[] {
  if (!Array.isArray(value)) return []
  const photos = value
    .filter(isObject)
    // Versão anterior salvava `blob:` URLs, que deixam de existir ao recarregar.
    .filter((p) => typeof p.id === 'string' && !(typeof p.url === 'string' && p.url.startsWith('blob:')))
    .map((p) => ({ id: p.id as string, is_cover: p.is_cover === true }))
  return ensureSingleCover(photos)
}

export function ensureSingleCover(photos: Photo[]): Photo[] {
  if (!photos.length) return photos
  const coverId = photos.find((p) => p.is_cover)?.id ?? photos[0].id
  return photos.map((p) => ({ ...p, is_cover: p.id === coverId }))
}

function toMemory(raw: unknown): Memory | null {
  if (!isObject(raw) || typeof raw.id !== 'string') return null
  return {
    id: raw.id,
    title: str(raw.title, 'Sem título'),
    description: str(raw.description),
    memory_date: str(raw.memory_date, todayISO()),
    is_anniversary: raw.is_anniversary === true,
    photos: toPhotos(raw.photos),
    experience_id: strOrNull(raw.experience_id),
    created_at: str(raw.created_at, nowIso()),
  }
}

const STATUSES: WishStatus[] = ['wish', 'planned', 'done']

function toWish(raw: unknown): Experience | null {
  if (!isObject(raw) || typeof raw.id !== 'string') return null
  const status = STATUSES.includes(raw.status as WishStatus) ? (raw.status as WishStatus) : 'wish'
  const plannedAt = strOrNull(raw.planned_at)
  const location = str(raw.location)
  return {
    id: raw.id,
    title: str(raw.title, 'Sem título'),
    category: str(raw.category, WISH_CATEGORIES[WISH_CATEGORIES.length - 1]),
    source_url: str(raw.source_url),
    description: str(raw.description),
    // "Planejado" sem data/local é inconsistente: volta para "Desejamos".
    status: status === 'planned' && (!plannedAt || !location.trim()) ? 'wish' : status,
    planned_at: plannedAt ? plannedAt.slice(0, 16) : null,
    location,
    created_at: str(raw.created_at, nowIso()),
  }
}

function toFeedback(raw: unknown): Feedback | null {
  if (!isObject(raw)) return null
  // Formato antigo: { author: 'me' | 'partner', body }
  const body = str(raw.body)
  return {
    id: str(raw.id) || createId(),
    feedback_date: str(raw.feedback_date) || todayISO(),
    roberto_text: str(raw.roberto_text, raw.author === 'me' ? body : ''),
    tamiris_text: str(raw.tamiris_text, raw.author === 'partner' ? body : ''),
    memory_ids: strArray(raw.memory_ids),
    experience_ids: strArray(raw.experience_ids),
    created_at: str(raw.created_at, nowIso()),
  }
}

function parseList<T>(value: unknown, parse: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.map(parse).filter((item): item is T => item !== null)
}

/** Remove vínculos que apontam para registros que não existem mais. */
function removeDanglingReferences(data: CantinhoData): CantinhoData {
  const memoryIds = new Set(data.memories.map((m) => m.id))
  const wishIds = new Set(data.wishes.map((w) => w.id))
  return {
    wishes: data.wishes,
    memories: data.memories.map((m) =>
      m.experience_id && !wishIds.has(m.experience_id) ? { ...m, experience_id: null } : m,
    ),
    feedbacks: data.feedbacks.map((f) => ({
      ...f,
      memory_ids: f.memory_ids.filter((id) => memoryIds.has(id)),
      experience_ids: f.experience_ids.filter((id) => wishIds.has(id)),
    })),
  }
}

/* ---------- Dados de exemplo (primeiro acesso) ---------- */

function seedData(): CantinhoData {
  const created = nowIso()
  return {
    memories: [
      {
        id: createId(),
        title: 'Um dia para guardar',
        description: 'Aqueles momentos simples que acabam se tornando inesquecíveis.',
        memory_date: todayISO(),
        is_anniversary: false,
        photos: [],
        experience_id: null,
        created_at: created,
      },
    ],
    wishes: [
      {
        id: createId(),
        title: 'Aquele restaurante que salvamos',
        category: 'Gastronomia',
        source_url: '',
        description: 'Adicionar detalhes sobre esse lugar.',
        status: 'wish',
        planned_at: null,
        location: '',
        created_at: created,
      },
    ],
    feedbacks: [],
  }
}

/* ---------- API pública ---------- */

export function loadData(): CantinhoData {
  const current = {
    memories: readJson(STORAGE_KEYS.memories),
    wishes: readJson(STORAGE_KEYS.wishes),
    feedbacks: readJson(STORAGE_KEYS.feedbacks),
  }
  const hasCurrent = Object.values(current).some((v) => v !== null)

  const source = hasCurrent
    ? current
    : {
        memories: readJson(STORAGE_KEYS.legacy.memories),
        wishes: readJson(STORAGE_KEYS.legacy.wishes),
        feedbacks: readJson(STORAGE_KEYS.legacy.feedbacks),
      }

  if (!hasCurrent && Object.values(source).every((v) => v === null)) {
    return seedData()
  }

  return removeDanglingReferences({
    memories: parseList(source.memories, toMemory),
    wishes: parseList(source.wishes, toWish),
    feedbacks: parseList(source.feedbacks, toFeedback),
  })
}

/** Salva tudo. Retorna `false` se o navegador recusar (cota cheia, modo privado etc.). */
export function saveData(data: CantinhoData): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.memories, JSON.stringify(data.memories))
    localStorage.setItem(STORAGE_KEYS.wishes, JSON.stringify(data.wishes))
    localStorage.setItem(STORAGE_KEYS.feedbacks, JSON.stringify(data.feedbacks))
    return true
  } catch {
    return false
  }
}
