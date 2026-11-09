import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { CantinhoProvider } from './context/CantinhoContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { ToastProvider } from './context/ToastContext'
import './styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado no index.html.')

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <CantinhoProvider>
          <App />
        </CantinhoProvider>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
