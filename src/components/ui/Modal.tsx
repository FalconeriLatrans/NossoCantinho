import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: ReactNode
  eyebrow?: ReactNode
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md'
  /** `top` fica acima de outros modais (ex.: confirmação sobre um detalhe). */
  layer?: 'base' | 'top'
}

let openModals = 0

export function Modal({ title, eyebrow, onClose, children, size = 'md', layer = 'base' }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Esc fecha apenas o modal do topo; trava a rolagem da página enquanto aberto.
  useEffect(() => {
    openModals += 1
    const depth = openModals
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && depth === openModals) {
        event.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openModals -= 1
      if (openModals === 0) document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div
      className={`overlay ${layer === 'top' ? 'overlay--top' : ''}`}
      onMouseDown={(e) => {
        // Só fecha se o clique começou E terminou no fundo (evita fechar ao selecionar texto).
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className={`dialog dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button type="button" className="dialog__close" onClick={onClose} aria-label="Fechar">
          <X aria-hidden />
        </button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {children}
      </section>
    </div>
  )
}
