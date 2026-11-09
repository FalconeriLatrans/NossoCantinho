import type { KeyboardEvent, ReactNode } from 'react'
import { themeClass } from '../../constants'
import type { Theme } from '../../types'

interface ClickableCardProps {
  onOpen: () => void
  label: string
  className?: string
  theme: Theme
  children: ReactNode
}

/** Cartão clicável acessível também pelo teclado (Tab + Enter/Espaço). */
export function ClickableCard({ onOpen, label, className = '', theme, children }: ClickableCardProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article className={`card card--${theme} ${themeClass(theme)} ${className}`} role="button" tabIndex={0} aria-label={label} onClick={onOpen} onKeyDown={onKeyDown}>
      {children}
    </article>
  )
}
