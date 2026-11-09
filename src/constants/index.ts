import type { Tab, WishStatus } from '../types'

export const APP_NAME = 'Nosso Cantinho'

/** Nomes exibidos nos feedbacks. Altere aqui para personalizar o casal. */
export const PARTNERS = {
  roberto: 'Roberto',
  tamiris: 'Tamiris',
} as const

export const WISH_CATEGORIES = [
  'Gastronomia',
  'Passeio',
  'Viagem',
  'Natureza',
  'Cultura',
  'Aventura',
  'Outro',
] as const

export const WISH_STATUS_LABEL: Record<WishStatus, string> = {
  wish: 'Desejamos',
  planned: 'Planejado',
  done: 'Realizado',
}

export const TAB_ORDER: Tab[] = ['memories', 'wishes', 'feedbacks', 'calendar']

export const TAB_LABEL: Record<Tab, string> = {
  memories: 'Memórias',
  wishes: 'Desejos',
  feedbacks: 'Feedbacks',
  calendar: 'Calendário',
}

/** Slug usado na URL (#memorias) para manter a aba ao recarregar a página. */
export const TAB_HASH: Record<Tab, string> = {
  memories: 'memorias',
  wishes: 'desejos',
  feedbacks: 'feedbacks',
  calendar: 'calendario',
}

export const STORAGE_KEYS = {
  memories: 'nosso-cantinho:v4:memories',
  wishes: 'nosso-cantinho:v4:wishes',
  feedbacks: 'nosso-cantinho:v4:feedbacks',
  /** Chaves da versão anterior, lidas uma única vez para migração. */
  legacy: {
    memories: 'nc_memories_v3',
    wishes: 'nc_experiences_v3',
    feedbacks: 'nc_feedbacks_v1',
  },
} as const

export const PHOTO_SETTINGS = {
  /** Maior lado da imagem após redimensionar (px). */
  maxDimension: 1600,
  /** Qualidade JPEG/WebP (0–1). */
  quality: 0.82,
  /** Tamanho máximo aceito do arquivo original. */
  maxFileBytes: 25 * 1024 * 1024,
} as const

export const TOAST_DURATION_MS = 3500
