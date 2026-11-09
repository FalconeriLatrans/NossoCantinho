/** Copia texto para a área de transferência. Retorna `false` se o navegador não permitir. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
