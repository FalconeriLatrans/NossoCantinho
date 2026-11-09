import { BookHeart, MapPin } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { RelatedLink, RelatedSection } from '../../components/ui/RelatedLink'
import { PARTNERS } from '../../constants'
import { useCantinho } from '../../context/CantinhoContext'
import type { Experience, Feedback, Memory } from '../../types'
import { FeedbackEntry } from './FeedbackCard'

export function FeedbackDetail({ feedback }: { feedback: Feedback }) {
  const { data } = useCantinho()
  const nav = useNavigation()

  const memories = feedback.memory_ids
    .map((id) => data.memories.find((m) => m.id === id))
    .filter((m): m is Memory => Boolean(m))
  const wishes = feedback.experience_ids
    .map((id) => data.wishes.find((w) => w.id === id))
    .filter((w): w is Experience => Boolean(w))

  return (
    <>
      {feedback.roberto_text && <FeedbackEntry author={PARTNERS.roberto} text={feedback.roberto_text} />}
      {feedback.tamiris_text && <FeedbackEntry author={PARTNERS.tamiris} text={feedback.tamiris_text} />}

      {(memories.length > 0 || wishes.length > 0) && (
        <RelatedSection title="Relacionados">
          {memories.map((m) => (
            <RelatedLink key={m.id} theme="memory" icon={<BookHeart />} label="Memória" onClick={() => nav.openDetail({ kind: 'memory', id: m.id })}>
              {m.title}
            </RelatedLink>
          ))}
          {wishes.map((w) => (
            <RelatedLink key={w.id} theme="wish" icon={<MapPin />} label="Desejo" onClick={() => nav.openDetail({ kind: 'wish', id: w.id })}>
              {w.title}
            </RelatedLink>
          ))}
        </RelatedSection>
      )}
    </>
  )
}
