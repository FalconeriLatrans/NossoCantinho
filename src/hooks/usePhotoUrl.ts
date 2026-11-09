import { useEffect, useState } from 'react'
import { useCantinho } from '../context/CantinhoContext'
import type { PhotoRef } from '../types'

type PhotoUrlState = { status: 'loading' | 'missing'; url: null } | { status: 'ready'; url: string }

/** URL de exibição de uma foto salva (IndexedDB no modo local, URL assinada no Supabase). */
export function usePhotoUrl(photo: PhotoRef | null | undefined): PhotoUrlState {
  const { getPhotoUrl } = useCantinho()
  const [state, setState] = useState<PhotoUrlState>({ status: 'loading', url: null })
  const id = photo?.id
  const path = photo?.path

  useEffect(() => {
    if (!id) {
      setState({ status: 'missing', url: null })
      return
    }
    let active = true
    setState({ status: 'loading', url: null })
    getPhotoUrl({ id, path })
      .then((url) => {
        if (active) setState(url ? { status: 'ready', url } : { status: 'missing', url: null })
      })
      .catch(() => {
        if (active) setState({ status: 'missing', url: null })
      })
    return () => {
      active = false
    }
  }, [id, path, getPhotoUrl])

  return state
}
