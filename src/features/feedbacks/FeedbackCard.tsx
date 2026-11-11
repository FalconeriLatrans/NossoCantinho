import { ClickableCard } from '../../components/ui/ClickableCard'
import { PARTNERS } from '../../constants'
import type { Feedback } from '../../types'
import { formatLongDate } from '../../utils/date'
import { pluralize } from '../../utils/text'

export function FeedbackCard({ feedback, onOpen }: { feedback: Feedback; onOpen: () => void }) {
  const links = [
    feedback.memory_ids.length > 0 && pluralize(feedback.memory_ids.length, 'memória', 'memórias'),
    feedback.experience_ids.length > 0 && pluralize(feedback.experience_ids.length, 'desejo', 'desejos'),
  ].filter(Boolean)

  return (
    <ClickableCard theme="feedback" onOpen={onOpen} label={`Abrir feedback de ${formatLongDate(feedback.feedback_date)}`} className="feedback-card">
      <h3 className="feedback-card__date">{formatLongDate(feedback.feedback_date)}</h3>
      {feedback.tamiris_text && <FeedbackEntry author={PARTNERS.tamiris} text={feedback.tamiris_text} clamp />}
      {feedback.roberto_text && <FeedbackEntry author={PARTNERS.roberto} text={feedback.roberto_text} clamp />}
      {links.length > 0 && <p className="card__meta">Vinculado a {links.join(' e ')}</p>}
    </ClickableCard>
  )
}

export function FeedbackEntry({ author, text, clamp = false }: { author: string; text: string; clamp?: boolean }) {
  return (
    <div className="feedback-entry">
      <b>{author}</b>
      <p className={clamp ? 'is-clamped' : undefined}>{text}</p>
    </div>
  )
}
