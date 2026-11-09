import { BookHeart, CircleCheck, Clock3, ExternalLink, MapPin, MessageCircleHeart, Plus } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { RelatedLink, RelatedSection } from '../../components/ui/RelatedLink'
import { useCantinho } from '../../context/CantinhoContext'
import type { Experience } from '../../types'
import { datePart, formatDateTime, formatLongDate, todayISO } from '../../utils/date'
import { safeExternalUrl } from '../../utils/text'
import { StatusBadge } from './StatusBadge'
import { useCompleteWish } from './useCompleteWish'

export function WishDetail({ wish }: { wish: Experience }) {
  const { data } = useCantinho()
  const nav = useNavigation()
  const { completeWish } = useCompleteWish()

  const memories = data.memories.filter((m) => m.experience_id === wish.id)
  const feedbacks = data.feedbacks.filter((f) => f.experience_ids.includes(wish.id))
  const link = safeExternalUrl(wish.source_url)

  return (
    <>
      <div className="detail__badges">
        <StatusBadge status={wish.status} />
      </div>

      {(wish.planned_at || wish.location) && (
        <ul className="detail__facts">
          {wish.planned_at && (
            <li>
              <Clock3 aria-hidden /> {formatDateTime(wish.planned_at)}
            </li>
          )}
          {wish.location && (
            <li>
              <MapPin aria-hidden /> {wish.location}
            </li>
          )}
        </ul>
      )}

      {wish.description && <p className="detail__text">{wish.description}</p>}

      {link && (
        <a className="external-link" href={link} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden /> Abrir link de origem
        </a>
      )}

      {wish.status === 'planned' && (
        <button type="button" className="btn btn--soft btn--full" onClick={() => completeWish(wish)}>
          <CircleCheck aria-hidden /> Marcar como realizado
        </button>
      )}

      {wish.status === 'done' && memories.length === 0 && (
        <button
          type="button"
          className="btn btn--soft btn--full"
          onClick={() => {
            nav.closeDetail()
            nav.openEditor({
              kind: 'memory',
              prefill: { title: wish.title, experience_id: wish.id, memory_date: datePart(wish.planned_at) ?? todayISO() },
            })
          }}
        >
          <Plus aria-hidden /> Criar memória deste desejo
        </button>
      )}

      {(memories.length > 0 || feedbacks.length > 0) && (
        <RelatedSection title="Relacionados">
          {memories.map((m) => (
            <RelatedLink key={m.id} icon={<BookHeart />} label="Memória" onClick={() => nav.openDetail({ kind: 'memory', id: m.id })}>
              {m.title}
            </RelatedLink>
          ))}
          {feedbacks.map((f) => (
            <RelatedLink
              key={f.id}
              icon={<MessageCircleHeart />}
              label="Feedback"
              onClick={() => nav.openDetail({ kind: 'feedback', id: f.id })}
            >
              {formatLongDate(f.feedback_date)}
            </RelatedLink>
          ))}
        </RelatedSection>
      )}
    </>
  )
}
