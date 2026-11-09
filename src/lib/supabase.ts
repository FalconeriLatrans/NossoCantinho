/**
 * Cliente Supabase (ainda não utilizado pela interface).
 *
 * O app hoje funciona em modo local (localStorage + IndexedDB). Quando a
 * integração for implementada, basta criar um repositório que use este
 * cliente com a mesma interface de `services/localRepository.ts`.
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))

export const supabase = isSupabaseConfigured && url && key ? createClient(url, key) : null
