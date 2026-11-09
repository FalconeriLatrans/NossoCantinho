import type { SupabaseClientType } from '../../lib/supabase'
import { ensureOk } from './errors'

export interface CoupleInfo {
  id: string
  name: string
  inviteCode: string
  memberCount: number
}

interface CoupleRow {
  id: string
  name: string
  invite_code: string
}

/** Casal do usuário logado (ou `null` se ele ainda não criou/entrou em um). */
export async function fetchCouple(client: SupabaseClientType, userId: string): Promise<CoupleInfo | null> {
  const { data, error } = await client
    .from('couple_members')
    .select('couple_id, couples(id, name, invite_code)')
    .eq('user_id', userId)
    .maybeSingle()
  ensureOk(error, 'carregar os dados do casal')
  if (!data) return null

  const row = data as unknown as { couple_id: string; couples: CoupleRow | CoupleRow[] | null }
  const couple = Array.isArray(row.couples) ? row.couples[0] : row.couples

  const { count, error: countError } = await client
    .from('couple_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('couple_id', row.couple_id)
  ensureOk(countError, 'carregar os dados do casal')

  return {
    id: row.couple_id,
    name: couple?.name ?? 'Nosso Cantinho',
    inviteCode: couple?.invite_code ?? '',
    memberCount: count ?? 1,
  }
}

export async function createCouple(client: SupabaseClientType, name: string): Promise<void> {
  const { error } = await client.rpc('create_couple', { couple_name: name })
  ensureOk(error, 'criar o cantinho')
}

export async function joinCouple(client: SupabaseClientType, code: string): Promise<void> {
  const { error } = await client.rpc('join_couple', { code: code.trim().toLowerCase() })
  if (error && /inválido|invalido/i.test(error.message)) throw new Error('Código de convite inválido. Confira e tente de novo.')
  if (error && /completo/i.test(error.message)) throw new Error('Este cantinho já tem duas pessoas.')
  ensureOk(error, 'entrar no cantinho')
}

export async function signIn(client: SupabaseClientType, email: string, password: string): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
  if (!error) return
  if (/invalid login credentials/i.test(error.message)) throw new Error('E-mail ou senha incorretos.')
  if (/email not confirmed/i.test(error.message)) {
    throw new Error('Este e-mail ainda não foi confirmado. No Supabase, abra Authentication → Users e confirme o usuário.')
  }
  ensureOk(error, 'entrar')
}
