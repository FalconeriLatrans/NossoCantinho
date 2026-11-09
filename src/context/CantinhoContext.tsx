import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { SYNC_MIN_INTERVAL_MS } from '../constants'
import { ensureSingleCover } from '../services/local/localStorageData'
import { photoStore } from '../services/local/photoStore'
import type { CantinhoRepository, PhotoUpload } from '../services/repositories/types'
import { RepositoryError } from '../services/repositories/types'
import type {
  CantinhoData,
  Experience,
  Feedback,
  FeedbackFormValues,
  Memory,
  MemoryFormValues,
  PhotoRef,
  WishFormValues,
} from '../types'
import { createId } from '../utils/id'
import { compressImage } from '../utils/image'
import { cantinhoReducer } from './cantinhoReducer'
import { useToast } from './ToastContext'

export type LoadStatus = 'loading' | 'ready' | 'error'

interface CantinhoApi {
  data: CantinhoData
  status: LoadStatus
  loadError: { message: string; detail?: string } | null
  mode: CantinhoRepository['mode']
  reload: () => Promise<CantinhoData>
  getPhotoUrl: (photo: PhotoRef) => Promise<string | null>
  saveMemory: (values: MemoryFormValues, id?: string) => Promise<Memory>
  deleteMemory: (id: string) => Promise<void>
  saveWish: (values: WishFormValues, id?: string) => Promise<Experience>
  deleteWish: (id: string) => Promise<void>
  markWishDone: (id: string) => Promise<void>
  saveFeedback: (values: FeedbackFormValues, id?: string) => Promise<Feedback>
  deleteFeedback: (id: string) => Promise<void>
  importData: (data: CantinhoData, onProgress?: (done: number, total: number) => void) => Promise<void>
}

const CantinhoContext = createContext<CantinhoApi | null>(null)

const EMPTY: CantinhoData = { memories: [], wishes: [], feedbacks: [] }
const isDuplicate = (error: unknown) => error instanceof RepositoryError && error.code === '23505'

interface CantinhoProviderProps {
  repository: CantinhoRepository
  children: ReactNode
}

export function CantinhoProvider({ repository, children }: CantinhoProviderProps) {
  const [data, dispatch] = useReducer(cantinhoReducer, EMPTY)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [loadError, setLoadError] = useState<CantinhoApi['loadError']>(null)
  const toast = useToast()

  // Ref para ler o estado mais recente dentro de funções assíncronas.
  const dataRef = useRef(data)
  dataRef.current = data

  /* ---------- Carregamento e sincronização ---------- */

  const lastLoad = useRef(0)
  const reload = useCallback(async () => {
    lastLoad.current = Date.now()
    try {
      const loaded = await repository.load()
      dispatch({ type: 'replace', data: loaded })
      setLoadError(null)
      setStatus('ready')
      return loaded
    } catch (error) {
      setLoadError({
        message: error instanceof Error ? error.message : 'Não foi possível carregar os dados.',
        detail: error instanceof RepositoryError ? error.detail : error instanceof Error ? undefined : String(error),
      })
      setStatus((s) => (s === 'ready' ? s : 'error'))
      throw error
    }
  }, [repository])

  useEffect(() => {
    // Usa os dados recém-carregados (o estado do React ainda não foi atualizado aqui).
    reload()
      .then((loaded) => repository.cleanup?.(loaded))
      .catch(() => undefined)
  }, [reload, repository])

  // Ao voltar para o app (trocar de aba, desbloquear o celular), busca o que o outro salvou.
  useEffect(() => {
    if (repository.mode !== 'supabase') return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > SYNC_MIN_INTERVAL_MS) {
        reload().catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [reload, repository.mode])

  /* Modo local: grava tudo sempre que algo muda. */
  const lastSaveFailed = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || !repository.persistSnapshot) return
    const ok = repository.persistSnapshot(data)
    if (!ok && !lastSaveFailed.current) {
      toast('Não foi possível salvar neste navegador. Verifique o espaço disponível.', 'error')
    }
    lastSaveFailed.current = !ok
  }, [data, status, repository, toast])

  /** Se algo falhar no meio do caminho no Supabase, recarrega para a tela refletir o banco. */
  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        return await action()
      } catch (error) {
        if (repository.mode === 'supabase') reload().catch(() => undefined)
        throw error
      }
    },
    [reload, repository.mode],
  )

  /* ---------- Memórias ---------- */

  const persistMemory = useCallback(
    async (memory: Memory, uploads: PhotoUpload[], previous: Memory | undefined) => {
      const saved = await repository.saveMemory(memory, uploads, previous)
      dispatch({ type: 'memory/upsert', memory: saved })
      return saved
    },
    [repository],
  )

  const saveMemory = useCallback<CantinhoApi['saveMemory']>(
    (values, id) =>
      run(async () => {
        const previous = id ? dataRef.current.memories.find((m) => m.id === id) : undefined

        // Comprime as fotos novas antes de enviar.
        const uploads: PhotoUpload[] = []
        for (const photo of values.photos) {
          if (photo.file) uploads.push({ id: photo.id, blob: await compressImage(photo.file) })
        }

        const memory: Memory = {
          id: previous?.id ?? createId(),
          title: values.title.trim(),
          description: values.description.trim(),
          memory_date: values.memory_date,
          is_anniversary: values.is_anniversary,
          experience_id: values.experience_id,
          photos: ensureSingleCover(
            values.photos.map((p) => ({ id: p.id, path: p.path, is_cover: p.id === values.coverId })),
          ),
          created_at: previous?.created_at ?? new Date().toISOString(),
        }
        return persistMemory(memory, uploads, previous)
      }),
    [persistMemory, run],
  )

  const deleteMemory = useCallback<CantinhoApi['deleteMemory']>(
    (id) =>
      run(async () => {
        const memory = dataRef.current.memories.find((m) => m.id === id)
        if (!memory) return
        await repository.deleteMemory(memory)
        dispatch({ type: 'memory/delete', id })
      }),
    [repository, run],
  )

  /* ---------- Desejos ---------- */

  const saveWish = useCallback<CantinhoApi['saveWish']>(
    (values, id) =>
      run(async () => {
        const previous = id ? dataRef.current.wishes.find((w) => w.id === id) : undefined
        const wish: Experience = {
          ...values,
          id: previous?.id ?? createId(),
          title: values.title.trim(),
          description: values.description.trim(),
          location: values.location.trim(),
          source_url: values.source_url.trim(),
          created_at: previous?.created_at ?? new Date().toISOString(),
        }
        const saved = await repository.saveWish(wish, !previous)
        dispatch({ type: 'wish/upsert', wish: saved })
        return saved
      }),
    [repository, run],
  )

  const deleteWish = useCallback<CantinhoApi['deleteWish']>(
    (id) =>
      run(async () => {
        await repository.deleteWish(id)
        dispatch({ type: 'wish/delete', id })
      }),
    [repository, run],
  )

  const markWishDone = useCallback<CantinhoApi['markWishDone']>(
    (id) =>
      run(async () => {
        const wish = dataRef.current.wishes.find((w) => w.id === id)
        if (!wish) return
        await repository.saveWish({ ...wish, status: 'done' }, false)
        dispatch({ type: 'wish/markDone', id })
      }),
    [repository, run],
  )

  /* ---------- Feedbacks ---------- */

  const saveFeedback = useCallback<CantinhoApi['saveFeedback']>(
    (values, id) =>
      run(async () => {
        const previous = id ? dataRef.current.feedbacks.find((f) => f.id === id) : undefined
        const feedback: Feedback = {
          ...values,
          id: previous?.id ?? createId(),
          roberto_text: values.roberto_text.trim(),
          tamiris_text: values.tamiris_text.trim(),
          created_at: previous?.created_at ?? new Date().toISOString(),
        }
        const saved = await repository.saveFeedback(feedback, !previous)
        dispatch({ type: 'feedback/upsert', feedback: saved })
        return saved
      }),
    [repository, run],
  )

  const deleteFeedback = useCallback<CantinhoApi['deleteFeedback']>(
    (id) =>
      run(async () => {
        await repository.deleteFeedback(id)
        dispatch({ type: 'feedback/delete', id })
      }),
    [repository, run],
  )

  /* ---------- Importação (dados do navegador → Supabase) ---------- */

  const importData = useCallback<CantinhoApi['importData']>(
    async (local, onProgress) => {
      const total = local.wishes.length + local.memories.length + local.feedbacks.length
      let done = 0
      const step = () => onProgress?.(++done, total)
      // Registros já enviados numa tentativa anterior são ignorados (chave duplicada).
      const tolerant = async (action: () => Promise<unknown>) => {
        try {
          await action()
        } catch (error) {
          if (!isDuplicate(error)) throw error
        }
        step()
      }

      // Ordem importa: desejos → memórias (referenciam desejos) → feedbacks (referenciam ambos).
      for (const wish of local.wishes) await tolerant(() => repository.saveWish(wish, true))
      for (const memory of local.memories) {
        await tolerant(async () => {
          const uploads: PhotoUpload[] = []
          for (const photo of memory.photos) {
            const blob = await photoStore.getBlob(photo.id).catch(() => null)
            if (blob) uploads.push({ id: photo.id, blob })
          }
          const available = new Set(uploads.map((u) => u.id))
          const photos = ensureSingleCover(memory.photos.filter((p) => available.has(p.id)))
          await repository.saveMemory({ ...memory, photos }, uploads, undefined)
        })
      }
      for (const feedback of local.feedbacks) await tolerant(() => repository.saveFeedback(feedback, true))

      await reload()
    },
    [reload, repository],
  )

  const getPhotoUrl = useCallback((photo: PhotoRef) => repository.getPhotoUrl(photo), [repository])

  const api = useMemo<CantinhoApi>(
    () => ({
      data,
      status,
      loadError,
      mode: repository.mode,
      reload,
      getPhotoUrl,
      saveMemory,
      deleteMemory,
      saveWish,
      deleteWish,
      markWishDone,
      saveFeedback,
      deleteFeedback,
      importData,
    }),
    [
      data,
      status,
      loadError,
      repository.mode,
      reload,
      getPhotoUrl,
      saveMemory,
      deleteMemory,
      saveWish,
      deleteWish,
      markWishDone,
      saveFeedback,
      deleteFeedback,
      importData,
    ],
  )

  return <CantinhoContext.Provider value={api}>{children}</CantinhoContext.Provider>
}

export function useCantinho(): CantinhoApi {
  const ctx = useContext(CantinhoContext)
  if (!ctx) throw new Error('useCantinho precisa estar dentro de <CantinhoProvider>.')
  return ctx
}
