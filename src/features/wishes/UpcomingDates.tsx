import { CircleCheck, MapPin } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import type { Experience } from '../../types'
import { formatDateTime, isPastDateTime } from '../../utils/date'
import { useCompleteWish } from './useCompleteWish'

/** Lista de "Próximos encontros" (desejos planejados ainda não realizados). */
export function UpcomingDates({ planned }: { planned: Experience[] }) {
  const nav = useNavigation()
  const { completeWish } = useCompleteWish()

  if (!planned.length) return null

  return (
    <section className="upcoming" aria-labelledby="upcoming-title">
      <h3 id="upcoming-title" className="subheading">
        Próximos encontros
      </h3>
      <ul className="upcoming__list">
        {planned.map((wish) => {
          const past = isPastDateTime(wish.planned_at)
          return (
            <li key={wish.id} className={`upcoming__item ${past ? 'is-past' : ''}`}>
              <button
                type="button"
                className="upcoming__main"
                onClick={() => nav.openDetail({ kind: 'wish', id: wish.id })}
              >
                <span className="card__date">
                  {formatDateTime(wish.planned_at)}
                  {past && ' · já passou, foi realizado?'}
                </span>
                <b>{wish.title}</b>
                <span className="upcoming__location">
                  <MapPin aria-hidden /> {wish.location}
                </span>
              </button>
              <button type="button" className="btn btn--soft" onClick={() => completeWish(wish)}>
                <CircleCheck aria-hidden /> Realizado
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
