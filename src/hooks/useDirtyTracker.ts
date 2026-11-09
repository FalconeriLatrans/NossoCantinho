import { useEffect, useRef } from 'react'

/**
 * Informa ao componente pai se o formulário tem alterações não salvas,
 * comparando uma "foto" serializada do estado atual com a inicial.
 */
export function useDirtyTracker(snapshot: string, onDirtyChange?: (dirty: boolean) => void) {
  const initial = useRef(snapshot)
  const dirty = snapshot !== initial.current
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])
}
