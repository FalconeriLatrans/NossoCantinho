import { MapPin, MessageCircleHeart } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { PhotoImage } from '../../components/ui/PhotoImage'
import { RelatedLink, RelatedSection } from '../../components/ui/RelatedLink'
import { useCantinho } from '../../context/CantinhoContext'
import type { Memory } from '../../types'
import { formatLongDate, parseISODate } from '../../utils/date'

export function MemoryDetail({ memory }: { memory: Memory }) {
  const { data } = useCantinho()
  const nav = useNavigation()

  const wish = memory.experience_id ? data.wishes.find((w) => w.id === memory.experience_id) : undefined
  const feedbacks = data.feedbacks.filter((f) => f.memory_ids.includes(memory.id))
  const years = anniversaryYears(memory)

  return (
    <>
      <p className="detail__meta">
        {formatLongDate(memory.memory_date)}
        {memory.is_anniversary && years > 0 && ` · ${years} ${years === 1 ? 'ano' : 'anos'}`}
      </p>
      {memory.description && <p className="detail__text">{memory.description}</p>}

      {memory.photos.length > 0 && (
        <div className="photo-gallery">
          {memory.photos.map((photo) => (
            <PhotoImage key={photo.id} photoId={photo.id} alt={`Foto de ${memory.title}`} />
          ))}
        </div>
      )}

      {(wish || feedbacks.length > 0) && (
        <RelatedSection title="Relacionados">
          {wish && (
            <RelatedLink icon={<MapPin />} label="Desejo" onClick={() => nav.openDetail({ kind: 'wish', id: wish.id })}>
              {wish.title}
            </RelatedLink>
          )}
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

function anniversaryYears(memory: Memory): number {
  const date = parseISODate(memory.memory_date)
  if (!date) return 0
  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  const beforeAnniversary =
    now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  if (beforeAnniversary) years -= 1
  return Math.max(0, years)
}
