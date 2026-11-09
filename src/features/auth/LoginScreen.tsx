import { useState, type FormEvent } from 'react'
import { CenteredScreen } from '../../components/layout/CenteredScreen'
import type { SupabaseClientType } from '../../lib/supabase'
import { signIn } from '../../services/supabase/session'
import { errorMessage } from '../../utils/errors'
import './auth.css'

export function LoginScreen({ client }: { client: SupabaseClientType }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await signIn(client, email, password)
      // O AuthGate percebe o login sozinho (onAuthStateChange).
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar.'))
      setLoading(false)
    }
  }

  return (
    <CenteredScreen title="Que bom te ver por aqui ♥" subtitle="Entre para abrir o nosso cantinho.">
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="field">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </CenteredScreen>
  )
}
