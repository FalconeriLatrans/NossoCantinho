import type { CantinhoData, Experience, Feedback, Memory, PhotoRef } from '../../types'

/** Foto nova, já comprimida, pronta para ser gravada. */
export interface PhotoUpload {
  id: string
  blob: Blob
}

/**
 * Contrato de persistência. O app não sabe se os dados vão para o navegador
 * (modo local) ou para o Supabase: só conversa com esta interface.
 */
export interface CantinhoRepository {
  readonly mode: 'local' | 'supabase'

  load(): Promise<CantinhoData>
  getPhotoUrl(photo: PhotoRef): Promise<string | null>

  /** Grava a memória e suas fotos. Retorna a memória como ficou salva (ex.: com `path` das fotos). */
  saveMemory(memory: Memory, uploads: PhotoUpload[], previous: Memory | undefined): Promise<Memory>
  deleteMemory(memory: Memory): Promise<void>

  saveWish(wish: Experience, isNew: boolean): Promise<Experience>
  deleteWish(id: string): Promise<void>

  saveFeedback(feedback: Feedback, isNew: boolean): Promise<Feedback>
  deleteFeedback(id: string): Promise<void>

  /** Modo local: grava o estado completo depois de cada mudança. */
  persistSnapshot?(data: CantinhoData): boolean
  /** Limpeza opcional executada uma vez após carregar (ex.: fotos órfãs). */
  cleanup?(data: CantinhoData): Promise<void>
}

/** Erro com código do banco/Storage, para o app poder reagir (ex.: registro duplicado). */
export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    /** Mensagem original do Supabase, útil para diagnosticar. */
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
