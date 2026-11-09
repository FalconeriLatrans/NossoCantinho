import { useCallback, useEffect, useState } from 'react'
import { TAB_HASH, TAB_ORDER } from '../constants'
import type { Tab } from '../types'

function tabFromHash(): Tab {
  const slug = window.location.hash.replace('#', '')
  return TAB_ORDER.find((tab) => TAB_HASH[tab] === slug) ?? 'memories'
}

/** Aba ativa sincronizada com a URL (#memorias, #desejos…): sobrevive ao F5 e ao botão Voltar. */
export function useHashTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTabState] = useState<Tab>(tabFromHash)

  useEffect(() => {
    const onHashChange = () => setTabState(tabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setTab = useCallback((next: Tab) => {
    const hash = `#${TAB_HASH[next]}`
    if (window.location.hash !== hash) window.location.hash = hash
    setTabState(next)
  }, [])

  return [tab, setTab]
}
