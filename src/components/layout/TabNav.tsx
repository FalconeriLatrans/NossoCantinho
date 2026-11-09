import { BookHeart, CalendarDays, MapPin, MessageCircleHeart, type LucideIcon } from 'lucide-react'
import { TAB_LABEL, TAB_ORDER } from '../../constants'
import type { Tab } from '../../types'

const TAB_ICON: Record<Tab, LucideIcon> = {
  memories: BookHeart,
  wishes: MapPin,
  feedbacks: MessageCircleHeart,
  calendar: CalendarDays,
}

interface TabNavProps {
  active: Tab
  counts: Partial<Record<Tab, number>>
  onChange: (tab: Tab) => void
}

export function TabNav({ active, counts, onChange }: TabNavProps) {
  return (
    <nav className="tabs" aria-label="Seções">
      {TAB_ORDER.map((tab) => {
        const Icon = TAB_ICON[tab]
        const count = counts[tab]
        return (
          <button
            key={tab}
            type="button"
            className={`tabs__item ${tab === active ? 'is-active' : ''}`}
            aria-current={tab === active ? 'page' : undefined}
            onClick={() => onChange(tab)}
          >
            <Icon aria-hidden />
            {TAB_LABEL[tab]}
            {count !== undefined && <small className="tabs__count">{count}</small>}
          </button>
        )
      })}
    </nav>
  )
}
