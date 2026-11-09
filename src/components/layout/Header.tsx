import { Heart } from 'lucide-react'

interface HeaderProps {
  onHome: () => void
}

export function Header({ onHome }: HeaderProps) {
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome}>
        <span className="brand__mark" aria-hidden>
          <Heart fill="currentColor" />
        </span>
        nosso <b>cantinho</b>
      </button>
      <span className="demo-pill" title="Os dados ficam salvos apenas neste navegador, neste aparelho.">
        ✦ Salvo neste aparelho
      </span>
    </header>
  )
}
