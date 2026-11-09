import { RepositoryError } from '../services/repositories/types'

/** Mensagem legível de um erro qualquer, com texto padrão de reserva. */
export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback
  // Mensagem genérica? Anexa o detalhe técnico para facilitar o diagnóstico.
  if (error instanceof RepositoryError && error.detail && error.message.startsWith('Não foi possível')) {
    return `${error.message} (${error.detail})`
  }
  return error.message
}
