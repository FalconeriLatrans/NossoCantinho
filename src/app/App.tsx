import { useMemo, useState } from 'react'
import { Header } from '../components/layout/Header'
import { Hero } from '../components/layout/Hero'
import { TabNav } from '../components/layout/TabNav'
import { SearchBar } from '../components/ui/SearchBar'
import { useCantinho } from '../context/CantinhoContext'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { FeedbacksPage } from '../features/feedbacks/FeedbacksPage'
import { MemoriesPage } from '../features/memories/MemoriesPage'
import { WishesPage } from '../features/wishes/WishesPage'
import { useHashTab } from '../hooks/useHashTab'
import { TAB_THEME, themeClass } from '../constants'
import type { EntityRef, Tab } from '../types'
import { ImportBanner, InviteBanner } from './Banners'
import { DetailModal } from './DetailModal'
import { EditorModal } from './EditorModal'
import { NavigationContext, type EditorState, type Navigation } from './navigation'

const SEARCH_PLACEHOLDER: Partial<Record<Tab, string>> = {
  memories: 'Buscar memórias…',
  wishes: 'Buscar desejos, categorias, locais…',
  feedbacks: 'Buscar nos feedbacks…',
}

export function App() {
  const { data, status, loadError, reload } = useCantinho()
  const [tab, setTab] = useHashTab()
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<EntityRef | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const navigation = useMemo<Navigation>(
    () => ({
      goToTab: (next) => {
        setTab(next)
        setQuery('')
      },
      openDetail: setDetail,
      closeDetail: () => setDetail(null),
      openEditor: setEditor,
    }),
    [setTab],
  )

  return (
    <NavigationContext.Provider value={navigation}>
      <div className="app-shell">
        <Header onHome={() => navigation.goToTab('memories')} />

        <main className="content">
          <Hero />
          <TabNav
            active={tab}
            counts={{ memories: data.memories.length, wishes: data.wishes.length, feedbacks: data.feedbacks.length }}
            onChange={navigation.goToTab}
          />

          <InviteBanner />
          <ImportBanner />

          {status === 'loading' && (
            <p className="loading" role="status">
              <span className="loading__dot" aria-hidden /> Carregando nossas coisas…
            </p>
          )}

          {status === 'error' && (
            <div className="empty-state">
              <p className="empty-state__title">Não foi possível carregar os dados.</p>
              {loadError && <p className="empty-state__description">{loadError.message}</p>}
              {loadError?.detail && (
                <p className="error-detail">
                  Detalhe técnico: <code>{loadError.detail}</code>
                </p>
              )}
              <button type="button" className="btn btn--primary" onClick={() => reload().catch(() => undefined)}>
                Tentar de novo
              </button>
            </div>
          )}

          {status === 'ready' && (
            <div className={`page ${themeClass(TAB_THEME[tab])}`}>
              {tab !== 'calendar' && (
                <div className="toolbar">
                  <SearchBar value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER[tab]} />
                </div>
              )}

              {tab === 'memories' && <MemoriesPage query={query} />}
              {tab === 'wishes' && <WishesPage query={query} />}
              {tab === 'feedbacks' && <FeedbacksPage query={query} />}
              {tab === 'calendar' && <CalendarPage />}
            </div>
          )}
        </main>
      </div>

      {detail && <DetailModal key={`${detail.kind}-${detail.id}`} entity={detail} />}
      {editor && (
        <EditorModal
          key={`${editor.kind}-${editor.id ?? 'new'}`}
          editor={editor}
          onClose={() => setEditor(null)}
        />
      )}
    </NavigationContext.Provider>
  )
}
