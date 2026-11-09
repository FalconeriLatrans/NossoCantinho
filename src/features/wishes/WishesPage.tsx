import { MapPin, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigation } from '../../app/navigation'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { WISH_STATUS_LABEL } from '../../constants'
import { useCantinho } from '../../context/CantinhoContext'
import type { WishStatus } from '../../types'
import { matchesQuery } from '../../utils/text'
import { UpcomingDates } from './UpcomingDates'
import { WishCard } from './WishCard'
import { getPlanned, sortWishes } from './wishSelectors'
import './wishes.css'

type StatusFilter = WishStatus | 'all'
const FILTERS: StatusFilter[] = ['all', 'wish', 'planned', 'done']

export function WishesPage({ query }: { query: string }) {
  const { data } = useCantinho()
  const nav = useNavigation()
  const [filter, setFilter] = useState<StatusFilter>('all')

  const planned = useMemo(() => getPlanned(data.wishes), [data.wishes])
  const wishes = useMemo(
    () =>
      sortWishes(data.wishes).filter(
        (w) =>
          (filter === 'all' || w.status === filter) &&
          matchesQuery(query, w.title, w.category, w.description, w.location),
      ),
    [data.wishes, filter, query],
  )

  return (
    <>
      <SectionHeading
        title="Tudo o que ainda queremos viver."
        subtitle="Dos planos mais simples às próximas aventuras."
        action={
          <button type="button" className="btn btn--primary" onClick={() => nav.openEditor({ kind: 'wish' })}>
            <Plus aria-hidden /> Novo desejo
          </button>
        }
      />

      <UpcomingDates planned={planned} />

      {data.wishes.length > 0 && (
        <div className="chips" role="group" aria-label="Filtrar por status">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip ${filter === f ? 'is-active' : ''}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : WISH_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      {wishes.length > 0 ? (
        <div className="card-grid">
          {wishes.map((wish) => (
            <WishCard key={wish.id} wish={wish} onOpen={() => nav.openDetail({ kind: 'wish', id: wish.id })} />
          ))}
        </div>
      ) : data.wishes.length > 0 ? (
        <EmptyState icon={<MapPin />} title="Nenhum desejo encontrado com esses filtros." />
      ) : (
        <EmptyState
          icon={<MapPin />}
          title="Nossa lista de desejos está vazia."
          description="Salve aquele restaurante, viagem ou passeio que vocês querem fazer juntos."
        />
      )}
    </>
  )
}
