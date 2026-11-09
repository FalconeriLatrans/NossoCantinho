import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { ensureSingleCover, loadData, saveData } from '../services/localRepository'
import { photoStore } from '../services/photoStore'
import type {
  CantinhoData,
  Experience,
  Feedback,
  FeedbackFormValues,
  Memory,
  MemoryFormValues,
  WishFormValues,
} from '../types'
import { createId } from '../utils/id'
import { compressImage } from '../utils/image'
import { cantinhoReducer } from './cantinhoReducer'
import { useToast } from './ToastContext'

interface CantinhoApi {
  data: CantinhoData
  saveMemory: (values: MemoryFormValues, id?: string) => Promise<Memory>
  deleteMemory: (id: string) => Promise<void>
  saveWish: (values: WishFormValues, id?: string) => Experience
  deleteWish: (id: string) => void
  markWishDone: (id: string) => void
  saveFeedback: (values: FeedbackFormValues, id?: string) => Feedback
  deleteFeedback: (id: string) => void
}

const CantinhoContext = createContext<CantinhoApi | null>(null)

export function CantinhoProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(cantinhoReducer, undefined, loadData)
  const toast = useToast()

  // Ref para ler o estado mais recente dentro de funções assíncronas.
  const dataRef = useRef(data)
  dataRef.current = data

  /* Persistência: salva sempre que algo muda. */
  const lastSaveFailed = useRef(false)
  useEffect(() => {
    const ok = saveData(data)
    if (!ok && !lastSaveFailed.current) {
      toast('Não foi possível salvar neste navegador. Verifique o espaço disponível.', 'error')
    }
    lastSaveFailed.current = !ok
  }, [data, toast])

  /* Limpeza única de fotos órfãs no IndexedDB. */
  useEffect(() => {
    const referenced = new Set(dataRef.current.memories.flatMap((m) => m.photos.map((p) => p.id)))
    photoStore.removeOrphans(referenced).catch(() => undefined)
  }, [])

  const saveMemory = useCallback<CantinhoApi['saveMemory']>(async (values, id) => {
    const previous = id ? dataRef.current.memories.find((m) => m.id === id) : undefined

    // 1. Comprime e grava as fotos novas antes de salvar a memória.
    const newPhotos = values.photos.filter((p) => p.file)
    const stored: string[] = []
    try {
      for (const photo of newPhotos) {
        const blob = await compressImage(photo.file as File)
        await photoStore.put(photo.id, blob)
        stored.push(photo.id)
      }
    } catch (error) {
      await photoStore.remove(stored).catch(() => undefined)
      throw error
    }

    // 2. Monta a memória com exatamente uma capa (se houver fotos).
    const photos = ensureSingleCover(
      values.photos.map((p) => ({ id: p.id, is_cover: p.id === values.coverId })),
    )
    const memory: Memory = {
      id: previous?.id ?? createId(),
      title: values.title.trim(),
      description: values.description.trim(),
      memory_date: values.memory_date,
      is_anniversary: values.is_anniversary,
      experience_id: values.experience_id,
      photos,
      created_at: previous?.created_at ?? new Date().toISOString(),
    }
    dispatch({ type: 'memory/upsert', memory })

    // 3. Apaga do IndexedDB as fotos removidas na edição.
    const keptIds = new Set(photos.map((p) => p.id))
    const removed = (previous?.photos ?? []).filter((p) => !keptIds.has(p.id)).map((p) => p.id)
    photoStore.remove(removed).catch(() => undefined)

    return memory
  }, [])

  const deleteMemory = useCallback<CantinhoApi['deleteMemory']>(async (id) => {
    const memory = dataRef.current.memories.find((m) => m.id === id)
    dispatch({ type: 'memory/delete', id })
    if (memory) await photoStore.remove(memory.photos.map((p) => p.id)).catch(() => undefined)
  }, [])

  const saveWish = useCallback<CantinhoApi['saveWish']>((values, id) => {
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
    dispatch({ type: 'wish/upsert', wish })
    return wish
  }, [])

  const deleteWish = useCallback((id: string) => dispatch({ type: 'wish/delete', id }), [])
  const markWishDone = useCallback((id: string) => dispatch({ type: 'wish/markDone', id }), [])

  const saveFeedback = useCallback<CantinhoApi['saveFeedback']>((values, id) => {
    const previous = id ? dataRef.current.feedbacks.find((f) => f.id === id) : undefined
    const feedback: Feedback = {
      ...values,
      id: previous?.id ?? createId(),
      roberto_text: values.roberto_text.trim(),
      tamiris_text: values.tamiris_text.trim(),
      created_at: previous?.created_at ?? new Date().toISOString(),
    }
    dispatch({ type: 'feedback/upsert', feedback })
    return feedback
  }, [])

  const deleteFeedback = useCallback((id: string) => dispatch({ type: 'feedback/delete', id }), [])

  const api = useMemo<CantinhoApi>(
    () => ({ data, saveMemory, deleteMemory, saveWish, deleteWish, markWishDone, saveFeedback, deleteFeedback }),
    [data, saveMemory, deleteMemory, saveWish, deleteWish, markWishDone, saveFeedback, deleteFeedback],
  )

  return <CantinhoContext.Provider value={api}>{children}</CantinhoContext.Provider>
}

export function useCantinho(): CantinhoApi {
  const ctx = useContext(CantinhoContext)
  if (!ctx) throw new Error('useCantinho precisa estar dentro de <CantinhoProvider>.')
  return ctx
}
