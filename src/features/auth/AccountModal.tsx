import { Copy, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useCantinho } from '../../context/CantinhoContext'
import { useToast } from '../../context/ToastContext'
import type { CloudSession } from '../../context/SessionContext'
import { copyToClipboard } from '../../utils/clipboard'
import { errorMessage } from '../../utils/errors'
import './auth.css'

export function AccountModal({ session, onClose }: { session: CloudSession; onClose: () => void }) {
  const { reload } = useCantinho()
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)
  const complete = session.couple.memberCount >= 2

  const sync = async () => {
    setSyncing(true)
    try {
      await Promise.all([reload(), session.refreshCouple()])
      toast('Tudo atualizado.')
    } catch (error) {
      toast(errorMessage(error, 'Não foi possível sincronizar.'), 'error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Modal eyebrow="Nossa conta" title={session.couple.name} onClose={onClose} size="sm">
      <p className="account__line">
        Conectado como <b>{session.email}</b>
      </p>

      {complete ? (
        <p className="account__line">Vocês dois já estão no cantinho ♥</p>
      ) : (
        <div className="invite-code">
          <p>Envie este código para seu amor entrar:</p>
          <div className="invite-code__row">
            <code>{session.couple.inviteCode}</code>
            <button
              type="button"
              className="icon-btn"
              aria-label="Copiar código"
              onClick={async () => toast((await copyToClipboard(session.couple.inviteCode)) ? 'Código copiado.' : 'Não foi possível copiar.')}
            >
              <Copy aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--soft" onClick={sync} disabled={syncing}>
          <RefreshCw aria-hidden /> {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
        <button type="button" className="btn btn--danger" onClick={() => session.signOut()}>
          <LogOut aria-hidden /> Sair
        </button>
      </div>
    </Modal>
  )
}
