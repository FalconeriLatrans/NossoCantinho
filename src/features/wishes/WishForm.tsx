import { useState, type FormEvent } from 'react'
import { WISH_CATEGORIES, WISH_STATUS_LABEL } from '../../constants'
import { useDirtyTracker } from '../../hooks/useDirtyTracker'
import type { Experience, WishFormValues, WishStatus } from '../../types'

interface WishFormProps {
  wish?: Experience
  /** Memórias vinculadas a este desejo: enquanto houver, ele continua "Realizado". */
  linkedMemories?: number
  onSubmit: (values: WishFormValues) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

const STATUSES: WishStatus[] = ['wish', 'planned', 'done']

function initialValues(wish?: Experience): WishFormValues {
  return {
    title: wish?.title ?? '',
    category: wish?.category ?? WISH_CATEGORIES[0],
    source_url: wish?.source_url ?? '',
    description: wish?.description ?? '',
    status: wish?.status ?? 'wish',
    planned_at: wish?.planned_at ?? null,
    location: wish?.location ?? '',
  }
}

export function WishForm({ wish, linkedMemories = 0, onSubmit, onDirtyChange }: WishFormProps) {
  const [values, setValues] = useState(() => initialValues(wish))
  const [saving, setSaving] = useState(false)
  useDirtyTracker(JSON.stringify(values), onDirtyChange)

  const set = <K extends keyof WishFormValues>(key: K, value: WishFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const statusLocked = linkedMemories > 0 && wish?.status === 'done'
  const isPlanned = values.status === 'planned'
  const showDate = values.status !== 'wish'

  // Categoria personalizada vinda de dados antigos continua selecionável.
  const categories: string[] = WISH_CATEGORIES.includes(values.category as (typeof WISH_CATEGORIES)[number])
    ? [...WISH_CATEGORIES]
    : [values.category, ...WISH_CATEGORIES]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await onSubmit({
        ...values,
        // "Desejamos" ainda não tem data marcada.
        planned_at: values.status === 'wish' ? null : values.planned_at || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        Nome
        <input
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          required
          maxLength={120}
          placeholder="Ex.: Jantar naquele italiano"
          autoFocus={!wish}
        />
      </label>

      <div className="form__row">
        <label className="field">
          Categoria
          <select value={values.category} onChange={(e) => set('category', e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Status
          <select
            value={values.status}
            onChange={(e) => set('status', e.target.value as WishStatus)}
            disabled={statusLocked}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {WISH_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showDate && (
        <label className="field">
          Data e horário {isPlanned ? '' : '(opcional)'}
          <input
            type="datetime-local"
            value={values.planned_at ?? ''}
            onChange={(e) => set('planned_at', e.target.value || null)}
            required={isPlanned}
          />
        </label>
      )}

      <label className="field">
        Local {isPlanned ? '' : '(opcional)'}
        <input
          value={values.location}
          onChange={(e) => set('location', e.target.value)}
          required={isPlanned}
          placeholder="Endereço ou nome do lugar"
        />
      </label>

      <label className="field">
        Link de origem (opcional)
        <input
          type="url"
          value={values.source_url}
          onChange={(e) => set('source_url', e.target.value)}
          placeholder="https://…"
        />
      </label>

      <label className="field">
        Descrição / observações
        <textarea rows={3} value={values.description} onChange={(e) => set('description', e.target.value)} />
      </label>

      {isPlanned && <p className="field-hint">“Planejado” precisa de data, horário e local.</p>}
      {statusLocked && (
        <p className="field-hint">
          Este desejo tem {linkedMemories === 1 ? 'uma memória vinculada' : `${linkedMemories} memórias vinculadas`}, por
          isso continua como “Realizado”.
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar desejo'}
      </button>
    </form>
  )
}
