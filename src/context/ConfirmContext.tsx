import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Modal } from '../components/ui/Modal'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

/**
 * Substitui `window.confirm` por um diálogo no visual do app.
 * Uso: `if (await confirm({ title: 'Excluir?' })) { ... }`
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<Confirm>((opts) => {
    resolver.current?.(false)
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal title={options.title} onClose={() => close(false)} size="sm" layer="top">
          {options.message && <p className="confirm-message">{options.message}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn--soft" onClick={() => close(false)}>
              {options.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              type="button"
              className={`btn ${options.tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
              onClick={() => close(true)}
              autoFocus
            >
              {options.confirmLabel ?? 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.')
  return ctx
}
