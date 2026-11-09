import { Pencil, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { Modal } from '../components/ui/Modal'
import { useCantinho } from '../context/CantinhoContext'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { FeedbackDetail } from '../features/feedbacks/FeedbackDetail'
import { MemoryDetail } from '../features/memories/MemoryDetail'
import { WishDetail } from '../features/wishes/WishDetail'
import type { EntityRef } from '../types'
import { formatLongDate } from '../utils/date'
import { useNavigation } from './navigation'

const DELETE_COPY = {
  memory: { title: 'Excluir esta memória?', message: 'As fotos e os vínculos com feedbacks também serão removidos.' },
  wish: { title: 'Excluir este desejo?', message: 'Memórias e feedbacks vinculados serão mantidos, apenas sem o vínculo.' },
  feedback: { title: 'Excluir este feedback?', message: 'Essa ação não pode ser desfeita.' },
} as const

export function DetailModal({ entity }: { entity: EntityRef }) {
  const { data, deleteMemory, deleteWish, deleteFeedback } = useCantinho()
  const nav = useNavigation()
  const confirm = useConfirm()
  const toast = useToast()

  const memory = entity.kind === 'memory' ? data.memories.find((m) => m.id === entity.id) : undefined
  const wish = entity.kind === 'wish' ? data.wishes.find((w) => w.id === entity.id) : undefined
  const feedback = entity.kind === 'feedback' ? data.feedbacks.find((f) => f.id === entity.id) : undefined
  const exists = Boolean(memory || wish || feedback)

  // Se o registro deixou de existir (ex.: excluído), fecha o modal.
  useEffect(() => {
    if (!exists) nav.closeDetail()
  }, [exists, nav])

  if (!exists) return null

  const handleDelete = async () => {
    const copy = DELETE_COPY[entity.kind]
    const ok = await confirm({ ...copy, confirmLabel: 'Excluir', tone: 'danger' })
    if (!ok) return
    if (entity.kind === 'memory') await deleteMemory(entity.id)
    if (entity.kind === 'wish') deleteWish(entity.id)
    if (entity.kind === 'feedback') deleteFeedback(entity.id)
    nav.closeDetail()
    toast('Registro excluído.')
  }

  const header = memory
    ? { eyebrow: `Memória${memory.is_anniversary ? ' · Anual' : ''}`, title: memory.title }
    : wish
      ? { eyebrow: `Desejo · ${wish.category}`, title: wish.title }
      : { eyebrow: 'Feedback do casal', title: feedback ? formatLongDate(feedback.feedback_date) : '' }

  return (
    <Modal eyebrow={header.eyebrow} title={header.title} onClose={nav.closeDetail}>
      {memory && <MemoryDetail memory={memory} />}
      {wish && <WishDetail wish={wish} />}
      {feedback && <FeedbackDetail feedback={feedback} />}

      <div className="dialog-actions">
        <button
          type="button"
          className="btn btn--soft"
          onClick={() => {
            nav.closeDetail()
            nav.openEditor({ kind: entity.kind, id: entity.id })
          }}
        >
          <Pencil aria-hidden /> Editar
        </button>
        <button type="button" className="btn btn--danger" onClick={handleDelete}>
          <Trash2 aria-hidden /> Excluir
        </button>
      </div>
    </Modal>
  )
}
