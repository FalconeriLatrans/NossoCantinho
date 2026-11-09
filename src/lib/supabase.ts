/**
 * Cliente Supabase.
 *
 * Com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY preenchidas, o app exige login
 * e grava tudo no Supabase. Sem elas, funciona em modo local (só no navegador).
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))

export const supabase =
  isSupabaseConfigured && url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
    : null

export type SupabaseClientType = NonNullable<typeof supabase>
