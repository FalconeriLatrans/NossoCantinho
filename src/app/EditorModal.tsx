import { useCallback, useRef } from 'react'
import { Modal } from '../components/ui/Modal'
import { useCantinho } from '../context/CantinhoContext'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { FeedbackForm } from '../features/feedbacks/FeedbackForm'
import { MemoryForm } from '../features/memories/MemoryForm'
import { useCompleteWish } from '../features/wishes/useCompleteWish'
import { WishForm } from '../features/wishes/WishForm'
import type { FeedbackFormValues, MemoryFormValues, WishFormValues } from '../types'
import { errorMessage } from '../utils/errors'
import { useNavigation, type EditorState } from './navigation'

const TITLES = {
  memory: ['Nova memória', 'Editar memória'],
  wish: ['Novo desejo', 'Editar desejo'],
  feedback: ['Novo feedback', 'Editar feedback'],
} as const

interface EditorModalProps {
  editor: EditorState
  onClose: () => void
}

export function EditorModal({ editor, onClose }: EditorModalProps) {
  const { data, saveMemory, saveWish, saveFeedback } = useCantinho()
  const nav = useNavigation()
  const confirm = useConfirm()
  const toast = useToast()
  const { offerMemory } = useCompleteWish()

  const dirty = useRef(false)
  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value
  }, [])

  /** Evita perder o que foi digitado ao fechar sem querer. */
  const requestClose = async () => {
    if (
      dirty.current &&
      !(await confirm({
        title: 'Descartar alterações?',
        message: 'O que você preencheu ainda não foi salvo.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar editando',
        tone: 'danger',
      }))
    ) {
      return
    }
    onClose()
  }

  const isEditing = Boolean(editor.id)
  const title = TITLES[editor.kind][isEditing ? 1 : 0]

  /** Depois de salvar uma edição, volta para o detalhe do registro. */
  const finish = (id: string, message: string) => {
    onClose()
    toast(message)
    if (isEditing) nav.openDetail({ kind: editor.kind, id })
  }

  if (editor.kind === 'memory') {
    const memory = editor.id ? data.memories.find((m) => m.id === editor.id) : undefined
    if (editor.id && !memory) return null
    const handleSubmit = async (values: MemoryFormValues) => {
      try {
        const saved = await saveMemory(values, editor.id)
        finish(saved.id, 'Memória salva.')
      } catch (error) {
        toast(errorMessage(error, 'Não foi possível salvar a memória.'), 'error')
      }
    }
    return (
      <Modal title={title} onClose={requestClose} theme={editor.kind}>
        <MemoryForm
          memory={memory}
          prefill={editor.prefill}
          wishes={data.wishes}
          onSubmit={handleSubmit}
          onDirtyChange={onDirtyChange}
        />
      </Modal>
    )
  }

  if (editor.kind === 'wish') {
    const wish = editor.id ? data.wishes.find((w) => w.id === editor.id) : undefined
    if (editor.id && !wish) return null
    const handleSubmit = async (values: WishFormValues) => {
      try {
        const saved = await saveWish(values, editor.id)
        finish(saved.id, 'Desejo salvo.')
        // Marcou como realizado pelo formulário: oferece criar a memória também.
        if (saved.status === 'done' && wish?.status !== 'done') void offerMemory(saved)
      } catch (error) {
        toast(errorMessage(error, 'Não foi possível salvar o desejo.'), 'error')
      }
    }
    return (
      <Modal title={title} onClose={requestClose} theme={editor.kind}>
        <WishForm
          wish={wish}
          linkedMemories={wish ? data.memories.filter((m) => m.experience_id === wish.id).length : 0}
          onSubmit={handleSubmit}
          onDirtyChange={onDirtyChange}
        />
      </Modal>
    )
  }

  const feedback = editor.id ? data.feedbacks.find((f) => f.id === editor.id) : undefined
  if (editor.id && !feedback) return null
  const handleSubmit = async (values: FeedbackFormValues) => {
    try {
      const saved = await saveFeedback(values, editor.id)
      finish(saved.id, 'Feedback salvo.')
    } catch (error) {
      toast(errorMessage(error, 'Não foi possível salvar o feedback.'), 'error')
    }
  }
  return (
    <Modal title={title} onClose={requestClose} theme={editor.kind}>
      <FeedbackForm
        feedback={feedback}
        memories={data.memories}
        wishes={data.wishes}
        onSubmit={handleSubmit}
        onDirtyChange={onDirtyChange}
      />
    </Modal>
  )
}
