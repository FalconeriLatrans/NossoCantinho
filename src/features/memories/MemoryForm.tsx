import { useState, type FormEvent } from 'react'
import { WISH_STATUS_LABEL } from '../../constants'
import { useDirtyTracker } from '../../hooks/useDirtyTracker'
import type { Experience, Memory, MemoryFormValues } from '../../types'
import { todayISO } from '../../utils/date'
import { PhotoManager } from './PhotoManager'
import { getCover } from './memorySelectors'

interface MemoryFormProps {
  memory?: Memory
  prefill?: Partial<MemoryFormValues>
  wishes: Experience[]
  onSubmit: (values: MemoryFormValues) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

function initialValues(memory?: Memory, prefill?: Partial<MemoryFormValues>): MemoryFormValues {
  return {
    title: memory?.title ?? '',
    description: memory?.description ?? '',
    memory_date: memory?.memory_date ?? todayISO(),
    is_anniversary: memory?.is_anniversary ?? false,
    experience_id: memory?.experience_id ?? null,
    photos: memory?.photos.map((p) => ({ id: p.id, path: p.path })) ?? [],
    coverId: memory ? (getCover(memory)?.id ?? null) : null,
    ...prefill,
  }
}

export function MemoryForm({ memory, prefill, wishes, onSubmit, onDirtyChange }: MemoryFormProps) {
  const [values, setValues] = useState(() => initialValues(memory, prefill))
  const [saving, setSaving] = useState(false)

  useDirtyTracker(JSON.stringify({ ...values, photos: values.photos.map((p) => p.id) }), onDirtyChange)

  // Só desejos realizados podem virar memória. Um vínculo antigo com desejo
  // não realizado continua visível para não sumir sem aviso.
  const linkable = wishes.filter((w) => w.status === 'done' || w.id === values.experience_id)

  const set = <K extends keyof MemoryFormValues>(key: K, value: MemoryFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
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
        Título
        <input
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          required
          maxLength={120}
          placeholder="Ex.: Nosso primeiro encontro"
          autoFocus={!memory}
        />
      </label>

      <label className="field">
        Data
        <input type="date" value={values.memory_date} onChange={(e) => set('memory_date', e.target.value)} required />
      </label>

      <label className="field">
        Descrição
        <textarea
          rows={4}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="O que fez esse dia ser especial?"
        />
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={values.is_anniversary}
          onChange={(e) => set('is_anniversary', e.target.checked)}
        />
        Repetir anualmente no calendário ♥
      </label>

      <PhotoManager
        photos={values.photos}
        coverId={values.coverId}
        onChange={(photos, coverId) => setValues((v) => ({ ...v, photos, coverId }))}
      />

      <label className="field">
        Desejo realizado relacionado
        <select
          value={values.experience_id ?? ''}
          onChange={(e) => set('experience_id', e.target.value || null)}
          disabled={linkable.length === 0}
        >
          <option value="">{linkable.length ? 'Nenhum' : 'Nenhum desejo realizado ainda'}</option>
          {linkable.map((wish) => (
            <option key={wish.id} value={wish.id}>
              {wish.status === 'done' ? wish.title : `${wish.title} · ${WISH_STATUS_LABEL[wish.status]} (ainda não realizado)`}
            </option>
          ))}
        </select>
        <span className="field-hint">Só desejos marcados como “Realizado” podem ser vinculados a uma memória.</span>
      </label>

      <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar memória'}
      </button>
    </form>
  )
}
