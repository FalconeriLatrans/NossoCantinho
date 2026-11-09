import { Heart, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '../../context/SessionContext'
import { AccountModal } from '../../features/auth/AccountModal'

interface HeaderProps {
  onHome: () => void
}

export function Header({ onHome }: HeaderProps) {
  const session = useSession()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome}>
        <span className="brand__mark" aria-hidden>
          <Heart fill="currentColor" />
        </span>
        Roberto e Tamiris
      </button>

      {session ? (
        <>
          <button type="button" className="account-btn" onClick={() => setAccountOpen(true)} aria-label="Nossa conta">
            <UserRound aria-hidden />
            <span className="account-btn__label">{session.email}</span>
          </button>
          {accountOpen && <AccountModal session={session} onClose={() => setAccountOpen(false)} />}
        </>
      ) : (
        <span className="demo-pill" title="Os dados ficam salvos apenas neste navegador, neste aparelho.">
          ✦ Salvo neste aparelho
        </span>
      )}
    </header>
  )
}
