import { HeartHandshake, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CenteredScreen } from '../../components/layout/CenteredScreen'
import type { SupabaseClientType } from '../../lib/supabase'
import { createCouple, joinCouple } from '../../services/supabase/session'
import { errorMessage } from '../../utils/errors'
import './auth.css'

interface CoupleSetupScreenProps {
  client: SupabaseClientType
  email: string
  onDone: () => Promise<void>
  onSignOut: () => void
}

/**
 * Primeiro acesso: uma pessoa cria o cantinho e recebe um código;
 * a outra entra com esse código.
 */
export function CoupleSetupScreen({ client, email, onDone, onSignOut }: CoupleSetupScreenProps) {
  const [name, setName] = useState('Nosso Cantinho')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState('')

  const run = async (kind: 'create' | 'join', action: () => Promise<void>) => {
    if (busy) return
    setBusy(kind)
    setError('')
    try {
      await action()
      await onDone()
    } catch (err) {
      setError(errorMessage(err, 'Algo deu errado. Tente de novo.'))
      setBusy(null)
    }
  }

  const onCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    run('create', () => createCouple(client, name))
  }
  const onJoin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    run('join', () => joinCouple(client, code))
  }

  return (
    <CenteredScreen
      wide
      title="Vamos montar o nosso cantinho"
      subtitle="Uma pessoa cria o cantinho e envia o código para a outra entrar. Só precisa fazer isso uma vez."
    >
      <div className="setup-options">
        <form className="setup-option" onSubmit={onCreate}>
          <HeartHandshake className="setup-option__icon" aria-hidden />
          <h2>Sou o primeiro a entrar</h2>
          <label className="field">
            Nome do cantinho
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <button type="submit" className="btn btn--primary btn--full" disabled={busy !== null}>
            {busy === 'create' ? 'Criando…' : 'Criar cantinho'}
          </button>
        </form>

        <form className="setup-option" onSubmit={onJoin}>
          <KeyRound className="setup-option__icon" aria-hidden />
          <h2>Recebi um código</h2>
          <label className="field">
            Código de convite
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="ex.: a1b2c3d4e5f6"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="submit" className="btn btn--soft btn--full" disabled={busy !== null}>
            {busy === 'join' ? 'Entrando…' : 'Entrar no cantinho'}
          </button>
        </form>
      </div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <p className="centered-screen__footer">
        Conectado como <b>{email}</b> ·{' '}
        <button type="button" className="link-btn" onClick={onSignOut}>
          sair
        </button>
      </p>
    </CenteredScreen>
  )
}
