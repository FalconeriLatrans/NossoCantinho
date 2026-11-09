// Ordem dos estilos: globais → de cada funcionalidade (importados pelos componentes) → temas.
import './styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import { ConfirmProvider } from './context/ConfirmContext'
import { ToastProvider } from './context/ToastContext'
// Por último: as cores de cada seção (memória/desejo/feedback) sobrepõem as demais.
import './styles/themes.css'

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado no index.html.')

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <Root />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
