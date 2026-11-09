import type { ISODate, LocalDateTime } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Converte um Date para `YYYY-MM-DD` usando o fuso LOCAL.
 * (`toISOString()` usa UTC e, no Brasil, “pula” para o dia seguinte após as 21h.)
 */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const todayISO = (): ISODate => toISODate(new Date())

/** Interpreta `YYYY-MM-DD` como meio-dia local (evita deslocamentos de fuso). */
export function parseISODate(value: ISODate): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d), 12)
}

/** Interpreta `YYYY-MM-DDTHH:mm` como horário local. */
export function parseLocalDateTime(value: LocalDateTime | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [, y, mo, d, h, mi] = match
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
}

/** Date → `YYYY-MM-DDTHH:mm` no fuso local (formato do `<input type="datetime-local">`). */
export function toLocalDateTime(date: Date): LocalDateTime {
  return `${toISODate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `YYYY-MM-DDTHH:mm` local → ISO 8601 em UTC (para colunas `timestamptz`). */
export function localDateTimeToISO(value: LocalDateTime | null | undefined): string | null {
  return parseLocalDateTime(value)?.toISOString() ?? null
}

/** ISO 8601 (vindo do banco) → `YYYY-MM-DDTHH:mm` local. */
export function isoToLocalDateTime(value: string | null | undefined): LocalDateTime | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : toLocalDateTime(date)
}

export function formatLongDate(value: ISODate): string {
  const date = parseISODate(value)
  if (!date) return 'Sem data'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateTime(value: LocalDateTime | null | undefined): string {
  const date = parseLocalDateTime(value)
  if (!date) return 'Sem data'
  const day = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

/** "Novembro de 2026" (só a primeira letra maiúscula). */
export function formatMonthYear(date: Date): string {
  const text = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function isPastDateTime(value: LocalDateTime | null | undefined, now = new Date()): boolean {
  const date = parseLocalDateTime(value)
  return date ? date.getTime() < now.getTime() : false
}

/** Extrai a parte `YYYY-MM-DD` de um datetime local. */
export const datePart = (value: LocalDateTime | null | undefined): ISODate | null =>
  value && value.length >= 10 ? value.slice(0, 10) : null

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}
