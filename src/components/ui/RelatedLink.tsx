import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface RelatedLinkProps {
  icon: ReactNode
  label: string
  children: ReactNode
  onClick: () => void
}

/** Botão de navegação entre registros relacionados (memória ↔ desejo ↔ feedback). */
export function RelatedLink({ icon, label, children, onClick }: RelatedLinkProps) {
  return (
    <button type="button" className="related-link" onClick={onClick}>
      <span className="related-link__icon" aria-hidden>
        {icon}
      </span>
      <span className="related-link__text">
        <small>{label}</small>
        {children}
      </span>
      <ChevronRight aria-hidden className="related-link__chevron" />
    </button>
  )
}

export function RelatedSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="related-section">
      <h3>{title}</h3>
      {children}
    </div>
  )
}
