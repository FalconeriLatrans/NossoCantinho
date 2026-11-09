import { createContext, useContext } from 'react'
import type { EntityRef, MemoryFormValues, Tab } from '../types'

export type EditorState =
  | { kind: 'memory'; id?: string; prefill?: Partial<MemoryFormValues> }
  | { kind: 'wish'; id?: string }
  | { kind: 'feedback'; id?: string }

export interface Navigation {
  goToTab: (tab: Tab) => void
  openDetail: (ref: EntityRef) => void
  closeDetail: () => void
  openEditor: (state: EditorState) => void
}

export const NavigationContext = createContext<Navigation | null>(null)

export function useNavigation(): Navigation {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation precisa estar dentro de NavigationContext.Provider.')
  return ctx
}
