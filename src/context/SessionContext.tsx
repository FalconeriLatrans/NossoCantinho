import { createContext, useContext } from 'react'
import type { CoupleInfo } from '../services/supabase/session'

/** Usuário logado e o casal dele (só existe no modo Supabase). */
export interface CloudSession {
  userId: string
  email: string
  couple: CoupleInfo
  signOut: () => Promise<void>
  refreshCouple: () => Promise<void>
}

export const SessionContext = createContext<CloudSession | null>(null)

/** `null` no modo local (sem Supabase configurado). */
export function useSession(): CloudSession | null {
  return useContext(SessionContext)
}
