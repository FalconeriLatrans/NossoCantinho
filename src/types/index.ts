/** Datas no formato `YYYY-MM-DD` (sem fuso horário). */
export type ISODate = string
/** Data e hora local no formato `YYYY-MM-DDTHH:mm` (valor de `<input type="datetime-local">`). */
export type LocalDateTime = string

export interface Photo {
  id: string
  is_cover: boolean
  /** Caminho no Supabase Storage (`<couple_id>/<memory_id>/<id>.webp`). Ausente no modo local. */
  path?: string
}

/** O mínimo para exibir uma foto. */
export type PhotoRef = Pick<Photo, 'id' | 'path'>

export interface Memory {
  id: string
  title: string
  description: string
  memory_date: ISODate
  /** Repete no calendário todo ano, a partir do ano da memória. */
  is_anniversary: boolean
  photos: Photo[]
  /** Desejo que originou esta memória (opcional). */
  experience_id: string | null
  created_at: string
}

export type WishStatus = 'wish' | 'planned' | 'done'

/** Um "desejo" do casal. O nome segue a tabela `experiences` do banco. */
export interface Experience {
  id: string
  title: string
  category: string
  source_url: string
  description: string
  status: WishStatus
  planned_at: LocalDateTime | null
  location: string
  created_at: string
}

export interface Feedback {
  id: string
  feedback_date: ISODate
  roberto_text: string
  tamiris_text: string
  memory_ids: string[]
  experience_ids: string[]
  created_at: string
}

export interface CantinhoData {
  memories: Memory[]
  wishes: Experience[]
  feedbacks: Feedback[]
}

export type EntityKind = 'memory' | 'wish' | 'feedback'

export interface EntityRef {
  kind: EntityKind
  id: string
}

export type Tab = 'memories' | 'wishes' | 'feedbacks' | 'calendar'

/** Tema de cores de cada seção (ver styles/themes.css). */
export type Theme = EntityKind

/* ---------- Valores de formulário ---------- */

/** Foto no formulário: já salva (sem `file`) ou recém-adicionada (com `file`). */
export interface PhotoDraft extends PhotoRef {
  file?: File
}

export interface MemoryFormValues {
  title: string
  description: string
  memory_date: ISODate
  is_anniversary: boolean
  experience_id: string | null
  photos: PhotoDraft[]
  coverId: string | null
}

export type WishFormValues = Omit<Experience, 'id' | 'created_at'>

export type FeedbackFormValues = Omit<Feedback, 'id' | 'created_at'>
