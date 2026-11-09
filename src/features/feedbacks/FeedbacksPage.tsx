import { MessageCircleHeart, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigation } from '../../app/navigation'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useCantinho } from '../../context/CantinhoContext'
import { formatLongDate } from '../../utils/date'
import { matchesQuery } from '../../utils/text'
import { FeedbackCard } from './FeedbackCard'
import './feedbacks.css'

export function FeedbacksPage({ query }: { query: string }) {
  const { data } = useCantinho()
  const nav = useNavigation()

  const feedbacks = useMemo(
    () =>
      [...data.feedbacks]
        .sort((a, b) => b.feedback_date.localeCompare(a.feedback_date) || b.created_at.localeCompare(a.created_at))
        .filter((f) => matchesQuery(query, f.roberto_text, f.tamiris_text, formatLongDate(f.feedback_date))),
    [data.feedbacks, query],
  )

  return (
    <>
      <SectionHeading
        title="O que queremos dizer um ao outro."
        subtitle="Um espaço íntimo para registrar nossas percepções."
        action={
          <button type="button" className="btn btn--primary" onClick={() => nav.openEditor({ kind: 'feedback' })}>
            <Plus aria-hidden /> Novo feedback
          </button>
        }
      />

      {feedbacks.length > 0 ? (
        <div className="feedback-list">
          {feedbacks.map((f) => (
            <FeedbackCard key={f.id} feedback={f} onOpen={() => nav.openDetail({ kind: 'feedback', id: f.id })} />
          ))}
        </div>
      ) : data.feedbacks.length > 0 ? (
        <EmptyState icon={<MessageCircleHeart />} title="Nenhum feedback encontrado para essa busca." />
      ) : (
        <EmptyState
          icon={<MessageCircleHeart />}
          title="Nenhum feedback ainda."
          description="Combinem um momento para escrever o que sentiram e o que querem cultivar juntos."
        />
      )}
    </>
  )
}
