import { RepositoryError } from '../services/repositories/types'

/** Mensagem legível de um erro qualquer, com o detalhe técnico do Supabase quando houver. */
export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback
  if (error instanceof RepositoryError && error.detail) return `${error.message} (${error.detail})`
  return error.message
}
