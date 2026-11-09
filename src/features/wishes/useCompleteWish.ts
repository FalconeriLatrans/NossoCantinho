import { useCallback } from 'react'
import { useNavigation } from '../../app/navigation'
import { useCantinho } from '../../context/CantinhoContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import type { Experience } from '../../types'
import { datePart, todayISO } from '../../utils/date'
import { errorMessage } from '../../utils/errors'

/**
 * Fluxo "desejo realizado → criar memória vinculada".
 * Corrige o bug da versão anterior, em que a memória era aberta em branco e
 * sem o vínculo com o desejo.
 */
export function useCompleteWish() {
  const { data, markWishDone } = useCantinho()
  const nav = useNavigation()
  const confirm = useConfirm()
  const toast = useToast()

  const offerMemory = useCallback(
    async (wish: Experience) => {
      if (data.memories.some((m) => m.experience_id === wish.id)) return
      const create = await confirm({
        title: 'Desejo realizado! ♥',
        message: 'Quer guardar esse momento como uma memória vinculada a este desejo?',
        confirmLabel: 'Criar memória',
        cancelLabel: 'Agora não',
      })
      if (!create) return
      nav.closeDetail()
      nav.openEditor({
        kind: 'memory',
        prefill: {
          title: wish.title,
          experience_id: wish.id,
          memory_date: datePart(wish.planned_at) ?? todayISO(),
        },
      })
    },
    [confirm, data.memories, nav],
  )

  const completeWish = useCallback(
    async (wish: Experience) => {
      try {
        await markWishDone(wish.id)
      } catch (error) {
        toast(errorMessage(error, 'Não foi possível atualizar o desejo.'), 'error')
        return
      }
      toast('Desejo marcado como realizado.')
      await offerMemory(wish)
    },
    [markWishDone, offerMemory, toast],
  )

  return { completeWish, offerMemory }
}
