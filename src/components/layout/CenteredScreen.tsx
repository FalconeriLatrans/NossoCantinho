import { Heart } from 'lucide-react'
import type { ReactNode } from 'react'

interface CenteredScreenProps {
  title?: string
  subtitle?: string
  children?: ReactNode
  wide?: boolean
}

/** Tela cheia centralizada, usada em login, configuração do casal, carregamento e erros. */
export function CenteredScreen({ title, subtitle, children, wide = false }: CenteredScreenProps) {
  return (
    <main className="centered-screen">
      <div className={`centered-screen__card ${wide ? 'is-wide' : ''}`}>
        <div className="centered-screen__brand">
          <span className="brand__mark" aria-hidden>
            <Heart fill="currentColor" />
          </span>
          Roberto e Tamiris
        </div>
        {title && <h1 className="centered-screen__title">{title}</h1>}
        {subtitle && <p className="centered-screen__subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>
  )
}

export function LoadingScreen({ message = 'Carregando…' }: { message?: string }) {
  return (
    <CenteredScreen>
      <p className="loading" role="status">
        <span className="loading__dot" aria-hidden /> {message}
      </p>
    </CenteredScreen>
  )
}
