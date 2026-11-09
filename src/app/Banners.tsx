import { CloudUpload, Copy, HeartHandshake } from 'lucide-react'
import { useState } from 'react'
import { useCantinho } from '../context/CantinhoContext'
import { useConfirm } from '../context/ConfirmContext'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { loadDataForImport, markImportHandled } from '../services/local/localStorageData'
import { copyToClipboard } from '../utils/clipboard'
import { errorMessage } from '../utils/errors'
import { pluralize } from '../utils/text'

/** Enquanto só uma pessoa entrou no cantinho, mostra o código de convite. */
export function InviteBanner() {
  const session = useSession()
  const toast = useToast()
  if (!session || session.couple.memberCount >= 2) return null
  const code = session.couple.inviteCode

  return (
    <div className="banner">
      <HeartHandshake aria-hidden className="banner__icon" />
      <div className="banner__text">
        <b>Falta seu amor entrar!</b>
        <span>
          Peça para entrar no app com o próprio e-mail e usar o código <code>{code}</code>.
        </span>
      </div>
      <div className="banner__actions">
        <button
          type="button"
          className="btn btn--soft"
          onClick={async () => toast((await copyToClipboard(code)) ? 'Código copiado.' : 'Não foi possível copiar.')}
        >
          <Copy aria-hidden /> Copiar
        </button>
        <button type="button" className="btn btn--soft" onClick={() => session.refreshCouple()}>
          Já entrou
        </button>
      </div>
    </div>
  )
}

/** Oferece enviar para o Supabase o que foi cadastrado antes, só neste navegador. */
export function ImportBanner() {
  const { mode, status, importData } = useCantinho()
  const confirm = useConfirm()
  const toast = useToast()
  const [pending, setPending] = useState(() => (mode === 'supabase' ? loadDataForImport() : null))
  const [progress, setProgress] = useState<string | null>(null)

  if (!pending || status !== 'ready') return null

  const parts = [
    pending.memories.length && pluralize(pending.memories.length, 'memória', 'memórias'),
    pending.wishes.length && pluralize(pending.wishes.length, 'desejo', 'desejos'),
    pending.feedbacks.length && pluralize(pending.feedbacks.length, 'feedback', 'feedbacks'),
  ].filter(Boolean)

  const handleImport = async () => {
    setProgress('Enviando…')
    try {
      await importData(pending, (done, total) => setProgress(`Enviando ${done} de ${total}…`))
      markImportHandled()
      setPending(null)
      toast('Pronto! Os dados deste aparelho agora estão no cantinho compartilhado.')
    } catch (error) {
      toast(errorMessage(error, 'Não foi possível enviar tudo. Tente de novo.'), 'error')
      setProgress(null)
    }
  }

  const handleDismiss = async () => {
    const ok = await confirm({
      title: 'Ignorar os dados deste aparelho?',
      message: 'Eles continuam guardados neste navegador, mas não vão aparecer no cantinho compartilhado.',
      confirmLabel: 'Ignorar',
    })
    if (!ok) return
    markImportHandled()
    setPending(null)
  }

  return (
    <div className="banner">
      <CloudUpload aria-hidden className="banner__icon" />
      <div className="banner__text">
        <b>Encontramos registros salvos só neste aparelho</b>
        <span>{parts.join(', ')}. Quer enviá-los para o cantinho compartilhado?</span>
      </div>
      <div className="banner__actions">
        {progress ? (
          <span className="banner__progress" role="status">
            {progress}
          </span>
        ) : (
          <>
            <button type="button" className="btn btn--soft" onClick={handleDismiss}>
              Ignorar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleImport}>
              Enviar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
