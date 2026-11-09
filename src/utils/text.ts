/** Minúsculas e sem acentos: "Memória" → "memoria". */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Verdadeiro se a busca estiver vazia ou aparecer em algum dos campos. */
export function matchesQuery(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = normalizeText(query)
  if (!needle) return true
  return fields.some((field) => field && normalizeText(field).includes(needle))
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Aceita apenas links http(s), evitando `javascript:` e similares. */
export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
