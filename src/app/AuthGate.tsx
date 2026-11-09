import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CenteredScreen, LoadingScreen } from '../components/layout/CenteredScreen'
import { SessionContext, type CloudSession } from '../context/SessionContext'
import { CoupleSetupScreen } from '../features/auth/CoupleSetupScreen'
import { LoginScreen } from '../features/auth/LoginScreen'
import type { SupabaseClientType } from '../lib/supabase'
import { fetchCouple, type CoupleInfo } from '../services/supabase/session'
import { errorMessage } from '../utils/errors'

interface AuthUser {
  id: string
  email: string
}

interface AuthGateProps {
  client: SupabaseClientType
  children: (session: CloudSession) => ReactNode
}

const toUser = (session: { user: { id: string; email?: string } } | null): AuthUser | null =>
  session ? { id: session.user.id, email: session.user.email ?? '' } : null

/**
 * Porteiro do modo Supabase:
 * sem login → tela de login · sem casal → criar/entrar · tudo certo → app.
 */
export function AuthGate({ client, children }: AuthGateProps) {
  // undefined = ainda verificando
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)
  const [couple, setCouple] = useState<CoupleInfo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mantém o mesmo objeto se o usuário não mudou (ex.: renovação automática do token).
    const update = (next: AuthUser | null) =>
      setUser((prev) => (prev && next && prev.id === next.id && prev.email === next.email ? prev : next))

    client.auth
      .getSession()
      .then(({ data }) => update(toUser(data.session)))
      .catch(() => update(null))
    const { data } = client.auth.onAuthStateChange((_event, session) => update(toUser(session)))
    return () => data.subscription.unsubscribe()
  }, [client])

  const userId = user?.id
  const hasCouple = useRef(false)
  hasCouple.current = Boolean(couple)

  const loadCouple = useCallback(async () => {
    if (!userId) return
    try {
      setCouple(await fetchCouple(client, userId))
      setError(null)
    } catch (err) {
      // Falha numa atualização em segundo plano não deve derrubar o app aberto.
      if (!hasCouple.current) setError(errorMessage(err, 'Não foi possível carregar os dados do casal.'))
    }
  }, [client, userId])

  useEffect(() => {
    setCouple(undefined)
    setError(null)
    if (userId) loadCouple()
  }, [userId, loadCouple])

  // Enquanto o par não entrou, confere de novo ao voltar para o app.
  useEffect(() => {
    if (!couple || couple.memberCount >= 2) return
    const onVisible = () => document.visibilityState === 'visible' && loadCouple()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [couple, loadCouple])

  const signOut = useCallback(async () => {
    await client.auth.signOut()
    setUser(null)
  }, [client])

  const session = useMemo<CloudSession | null>(
    () =>
      user && couple
        ? { userId: user.id, email: user.email, couple, signOut, refreshCouple: loadCouple }
        : null,
    [user, couple, signOut, loadCouple],
  )

  if (user === undefined) return <LoadingScreen />
  if (user === null) return <LoginScreen client={client} />

  if (error) {
    return (
      <CenteredScreen title="Algo deu errado" subtitle={error}>
        <div className="dialog-actions">
          <button type="button" className="btn btn--soft" onClick={signOut}>
            Sair
          </button>
          <button type="button" className="btn btn--primary" onClick={loadCouple}>
            Tentar de novo
          </button>
        </div>
      </CenteredScreen>
    )
  }

  if (couple === undefined) return <LoadingScreen />
  if (couple === null) {
    return <CoupleSetupScreen client={client} email={user.email} onDone={loadCouple} onSignOut={signOut} />
  }

  return session ? <SessionContext.Provider value={session}>{children(session)}</SessionContext.Provider> : null
}
