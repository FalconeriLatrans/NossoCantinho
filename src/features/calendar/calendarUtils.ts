import type { Experience, ISODate, Memory } from '../../types'
import { datePart, isLeapYear, toISODate } from '../../utils/date'

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export interface CalendarDay {
  date: ISODate
  day: number
}

/** Dias do mês + quantidade de células vazias antes do dia 1 (semana começando na segunda). */
export function buildMonth(month: Date): { leadingBlanks: number; days: CalendarDay[] } {
  const year = month.getFullYear()
  const m = month.getMonth()
  const leadingBlanks = (new Date(year, m, 1).getDay() + 6) % 7
  const total = new Date(year, m + 1, 0).getDate()
  const days = Array.from({ length: total }, (_, i) => ({
    day: i + 1,
    date: toISODate(new Date(year, m, i + 1)),
  }))
  return { leadingBlanks, days }
}

/**
 * Uma memória aparece no dia exato e, se for anual, todo ano a partir do ano
 * original (antes aparecia também em anos anteriores à própria memória).
 * Aniversários em 29/02 aparecem em 28/02 nos anos não bissextos.
 */
export function memoryFallsOn(memory: Memory, date: ISODate): boolean {
  if (memory.memory_date === date) return true
  if (!memory.is_anniversary) return false

  const [origYear, origMonthDay] = [memory.memory_date.slice(0, 4), memory.memory_date.slice(5)]
  const [year, monthDay] = [date.slice(0, 4), date.slice(5)]
  if (year <= origYear) return false
  if (origMonthDay === monthDay) return true
  return origMonthDay === '02-29' && monthDay === '02-28' && !isLeapYear(Number(year))
}

export function wishFallsOn(wish: Experience, date: ISODate): boolean {
  return wish.status === 'planned' && datePart(wish.planned_at) === date
}
