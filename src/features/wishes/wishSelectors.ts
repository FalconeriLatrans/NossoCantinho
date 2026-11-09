import type { Experience } from '../../types'

/** Desejos planejados em ordem cronológica (os próximos encontros). */
export const getPlanned = (wishes: Experience[]): Experience[] =>
  wishes
    .filter((w) => w.status === 'planned' && w.planned_at)
    .sort((a, b) => (a.planned_at ?? '').localeCompare(b.planned_at ?? ''))

const STATUS_ORDER: Record<Experience['status'], number> = { planned: 0, wish: 1, done: 2 }

/** Planejados primeiro, depois desejos, por fim realizados; mais novos antes. */
export const sortWishes = (wishes: Experience[]): Experience[] =>
  [...wishes].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.created_at.localeCompare(a.created_at),
  )
