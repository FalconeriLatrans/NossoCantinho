import type { Tab, Theme, WishStatus } from '../types'

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

/** Tema de cores de cada aba (o calendário mistura as três cores). */
export const TAB_THEME: Record<Tab, Theme | null> = {
  memories: 'memory',
  wishes: 'wish',
  feedbacks: 'feedback',
  calendar: null,
}

/** Classe CSS do tema: `theme-memory`, `theme-wish`, `theme-feedback`. */
export const themeClass = (theme: Theme | null | undefined) => (theme ? `theme-${theme}` : '')

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
  /** Marca que os dados deste aparelho já foram enviados ao Supabase (ou ignorados). */
  importHandled: 'nosso-cantinho:v4:import-handled',
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
/** Erros ficam mais tempo na tela, para dar tempo de ler (ou fotografar) o detalhe. */
export const ERROR_TOAST_DURATION_MS = 9000

/** Bucket privado do Supabase Storage onde ficam as fotos. */
export const PHOTO_BUCKET = 'memory-photos'
/** Validade das URLs assinadas das fotos (segundos). */
export const SIGNED_URL_TTL = 60 * 60
/** Intervalo mínimo entre recargas automáticas ao voltar para o app (ms). */
export const SYNC_MIN_INTERVAL_MS = 15_000
