import { useEffect, useState } from 'react'
import { photoStore } from '../services/photoStore'

type PhotoUrlState = { status: 'loading' | 'missing'; url: null } | { status: 'ready'; url: string }

/** Carrega do IndexedDB a URL de exibição de uma foto salva. */
export function usePhotoUrl(photoId: string | null | undefined): PhotoUrlState {
  const [state, setState] = useState<PhotoUrlState>({ status: 'loading', url: null })

  useEffect(() => {
    if (!photoId) {
      setState({ status: 'missing', url: null })
      return
    }
    let active = true
    setState({ status: 'loading', url: null })
    photoStore
      .getUrl(photoId)
      .then((url) => {
        if (active) setState(url ? { status: 'ready', url } : { status: 'missing', url: null })
      })
      .catch(() => {
        if (active) setState({ status: 'missing', url: null })
      })
    return () => {
      active = false
    }
  }, [photoId])

  return state
}
