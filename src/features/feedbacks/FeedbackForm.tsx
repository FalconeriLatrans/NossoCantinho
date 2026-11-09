import { useState, type FormEvent } from 'react'
import { CheckboxDropdown } from '../../components/ui/CheckboxDropdown'
import { PARTNERS, WISH_STATUS_LABEL } from '../../constants'
import { useDirtyTracker } from '../../hooks/useDirtyTracker'
import type { Experience, Feedback, FeedbackFormValues, Memory } from '../../types'
import { formatLongDate, todayISO } from '../../utils/date'
import { pluralize } from '../../utils/text'
import { sortMemories } from '../memories/memorySelectors'

interface FeedbackFormProps {
  feedback?: Feedback
  memories: Memory[]
  wishes: Experience[]
  onSubmit: (values: FeedbackFormValues) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

function initialValues(feedback?: Feedback): FeedbackFormValues {
  return {
    feedback_date: feedback?.feedback_date ?? todayISO(),
    roberto_text: feedback?.roberto_text ?? '',
    tamiris_text: feedback?.tamiris_text ?? '',
    memory_ids: feedback?.memory_ids ?? [],
    experience_ids: feedback?.experience_ids ?? [],
  }
}

export function FeedbackForm({ feedback, memories, wishes, onSubmit, onDirtyChange }: FeedbackFormProps) {
  const [values, setValues] = useState(() => initialValues(feedback))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useDirtyTracker(JSON.stringify(values), onDirtyChange)

  const set = <K extends keyof FeedbackFormValues>(key: K, value: FeedbackFormValues[K]) => {
    setError('')
    setValues((v) => ({ ...v, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (!values.roberto_text.trim() && !values.tamiris_text.trim()) {
      setError('Escreva pelo menos um dos dois feedbacks.')
      return
    }
    setSaving(true)
    try {
      await onSubmit(values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        Data do feedback
        <input type="date" value={values.feedback_date} onChange={(e) => set('feedback_date', e.target.value)} required />
      </label>

      <label className="field">
        Feedback da {PARTNERS.tamiris}
        <textarea
          rows={4}
          value={values.tamiris_text}
          onChange={(e) => set('tamiris_text', e.target.value)}
          placeholder={`O que a ${PARTNERS.tamiris} gostaria de compartilhar?`}
        />
      </label>
      
      <label className="field">
        Feedback do {PARTNERS.roberto}
        <textarea
          rows={4}
          value={values.roberto_text}
          onChange={(e) => set('roberto_text', e.target.value)}
          placeholder={`O que o ${PARTNERS.roberto} gostaria de compartilhar?`}
        />
      </label>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <CheckboxDropdown
        legend="Memórias relacionadas"
        options={sortMemories(memories).map((m) => ({ id: m.id, label: m.title, hint: formatLongDate(m.memory_date) }))}
        selected={values.memory_ids}
        onChange={(ids) => set('memory_ids', ids)}
        summary={(n) => `${pluralize(n, 'memória vinculada', 'memórias vinculadas')}`}
        emptyText="Nenhuma memória cadastrada ainda."
      />

      <CheckboxDropdown
        legend="Desejos relacionados"
        options={wishes.map((w) => ({ id: w.id, label: w.title, hint: WISH_STATUS_LABEL[w.status] }))}
        selected={values.experience_ids}
        onChange={(ids) => set('experience_ids', ids)}
        summary={(n) => `${pluralize(n, 'desejo vinculado', 'desejos vinculados')}`}
        emptyText="Nenhum desejo cadastrado ainda."
      />

      <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar feedback'}
      </button>
    </form>
  )
}
