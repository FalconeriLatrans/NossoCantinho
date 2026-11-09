import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { TOAST_DURATION_MS } from '../constants'

type ToastTone = 'default' | 'error'

interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

type ShowToast = (message: string, tone?: ToastTone) => void

const ToastContext = createContext<ShowToast | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((message, tone = 'default') => {
    // Cancela o timer anterior: antes, uma mensagem nova sumia antes do tempo.
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, tone })
    timer.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`toast ${toast.tone === 'error' ? 'toast--error' : ''}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return ctx
}
