import { useMemo } from 'react'
import { CantinhoProvider } from '../context/CantinhoContext'
import type { CloudSession } from '../context/SessionContext'
import { supabase, type SupabaseClientType } from '../lib/supabase'
import { createLocalRepository } from '../services/repositories/localRepository'
import { createSupabaseRepository } from '../services/repositories/supabaseRepository'
import { App } from './App'
import { AuthGate } from './AuthGate'

/**
 * Escolhe o modo de funcionamento:
 * - Supabase configurado (variáveis VITE_SUPABASE_*) → login + dados na nuvem;
 * - sem configuração → modo local, dados só neste navegador.
 */
export function Root() {
  const client = supabase
  if (!client) return <LocalApp />
  return <AuthGate client={client}>{(session) => <CloudApp client={client} session={session} />}</AuthGate>
}

function LocalApp() {
  const repository = useMemo(() => createLocalRepository(), [])
  return (
    <CantinhoProvider repository={repository}>
      <App />
    </CantinhoProvider>
  )
}

function CloudApp({ client, session }: { client: SupabaseClientType; session: CloudSession }) {
  const coupleId = session.couple.id
  const { userId } = session
  const repository = useMemo(
    () => createSupabaseRepository({ client, coupleId, userId }),
    [client, coupleId, userId],
  )
  return (
    <CantinhoProvider key={`${coupleId}:${userId}`} repository={repository}>
      <App />
    </CantinhoProvider>
  )
}
