import type { Memory, Photo } from '../../types'

export const getCover = (memory: Memory): Photo | undefined =>
  memory.photos.find((p) => p.is_cover) ?? memory.photos[0]

/** Mais recentes primeiro; empate pela data de criação. */
export const sortMemories = (memories: Memory[]): Memory[] =>
  [...memories].sort(
    (a, b) => b.memory_date.localeCompare(a.memory_date) || b.created_at.localeCompare(a.created_at),
  )
