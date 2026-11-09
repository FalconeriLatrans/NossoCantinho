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
import type { EntityRef, Tab } from '../types'
import { DetailModal } from './DetailModal'
import { EditorModal } from './EditorModal'
import { NavigationContext, type EditorState, type Navigation } from './navigation'

const SEARCH_PLACEHOLDER: Partial<Record<Tab, string>> = {
  memories: 'Buscar memórias…',
  wishes: 'Buscar desejos, categorias, locais…',
  feedbacks: 'Buscar nos feedbacks…',
}

export function App() {
  const { data } = useCantinho()
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

          {tab !== 'calendar' && (
            <div className="toolbar">
              <SearchBar value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER[tab]} />
            </div>
          )}

          {tab === 'memories' && <MemoriesPage query={query} />}
          {tab === 'wishes' && <WishesPage query={query} />}
          {tab === 'feedbacks' && <FeedbacksPage query={query} />}
          {tab === 'calendar' && <CalendarPage />}
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
