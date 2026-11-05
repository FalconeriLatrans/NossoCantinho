export type Memory = {
  id: string
  title: string
  description: string
  memory_date: string | null
  photo_url: string | null
  author_id?: string
  created_at?: string
}

export type Experience = {
  id: string
  title: string
  category: string
  source_url: string
  description: string
  status: 'wish' | 'planned' | 'done'
  author_id?: string
  created_at?: string
}
