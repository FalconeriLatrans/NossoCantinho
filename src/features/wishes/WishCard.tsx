import { Clock3, MapPin } from 'lucide-react'
import { ClickableCard } from '../../components/ui/ClickableCard'
import type { Experience } from '../../types'
import { formatDateTime } from '../../utils/date'
import { StatusBadge } from './StatusBadge'

export function WishCard({ wish, onOpen }: { wish: Experience; onOpen: () => void }) {
  return (
    <ClickableCard onOpen={onOpen} label={`Abrir desejo: ${wish.title}`} className={wish.status === 'done' ? 'card--done' : ''}>
      <div className="card__body">
        <div className="card__row">
          <StatusBadge status={wish.status} />
          <span className="card__date">{wish.category}</span>
        </div>
        <h3 className="card__title">{wish.title}</h3>
        {wish.description && <p className="card__text">{wish.description}</p>}
        {wish.planned_at && (
          <p className="card__meta">
            <Clock3 aria-hidden /> {formatDateTime(wish.planned_at)}
          </p>
        )}
        {wish.location && (
          <p className="card__meta">
            <MapPin aria-hidden /> {wish.location}
          </p>
        )}
      </div>
    </ClickableCard>
  )
}
