import { RepositoryError } from '../repositories/types'

interface SupabaseLikeError {
  message: string
  code?: string
  statusCode?: string | number
}

const MIGRATION_HINT =
  'O banco do Supabase ainda não foi atualizado. Rode o arquivo supabase/migrations/001_atualizar_schema_antigo.sql no SQL Editor.'

/** Traduz erros do Supabase para mensagens que o casal entenda. */
export function friendlyMessage(error: SupabaseLikeError, action: string): string {
  const msg = error.message ?? ''
  const code = error.code ?? ''

  // função/coluna inexistente → migração não executada
  if (['PGRST202', 'PGRST204', '42703', '42883', '42P01'].includes(code) || /could not find the (function|.*column)|does not exist/i.test(msg)) {
    return MIGRATION_HINT
  }
  if (code === '42501' || /row-level security|permission denied|unauthorized/i.test(msg)) {
    return 'Sem permissão para essa ação. Verifique se seu usuário já entrou no cantinho do casal.'
  }
  if (/jwt expired|invalid jwt|refresh token/i.test(msg)) return 'Sua sessão expirou. Saia e entre novamente.'
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  }
  if (/maximum allowed size|payload too large/i.test(msg)) return 'Uma das fotos é grande demais (máx. 10 MB).'
  if (/mime type/i.test(msg)) return 'Formato de imagem não aceito. Use JPG, PNG ou WebP.'
  if (code === '23505') return 'Esse registro já existe.'
  if (code === '23514') return 'Algum campo obrigatório ficou vazio.'
  return `Não foi possível ${action}.`
}

/** Lança `RepositoryError` se a resposta do Supabase trouxe erro. */
export function ensureOk(error: SupabaseLikeError | null | undefined, action: string): void {
  if (error) {
    const detail = [error.code, error.message].filter(Boolean).join(' · ')
    throw new RepositoryError(friendlyMessage(error, action), error.code, detail)
  }
}
