import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigation } from '../../app/navigation'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useCantinho } from '../../context/CantinhoContext'
import { formatMonthYear, todayISO } from '../../utils/date'
import { buildMonth, feedbackFallsOn, memoryFallsOn, WEEKDAYS, wishFallsOn } from './calendarUtils'
import './calendar.css'

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

export function CalendarPage() {
  const { data } = useCantinho()
  const nav = useNavigation()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const { leadingBlanks, days } = useMemo(() => buildMonth(month), [month])
  const today = todayISO()
  const isCurrentMonth = startOfMonth(new Date()).getTime() === month.getTime()

  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <>
      <SectionHeading title="Nossa história, dia após dia." subtitle="Memórias, comemorações, planos e feedbacks." />

      <div className="calendar">
        <div className="calendar__head">
          <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft aria-hidden />
          </button>
          <h2 className="calendar__title" aria-live="polite">
            {formatMonthYear(month)}
          </h2>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
            <ChevronRight aria-hidden />
          </button>
        </div>
        {!isCurrentMonth && (
          <button type="button" className="calendar__today chip" onClick={() => setMonth(startOfMonth(new Date()))}>
            Voltar para hoje
          </button>
        )}

        <div className="calendar__grid">
          {WEEKDAYS.map((d) => (
            <b key={d} className="calendar__weekday">
              {d}
            </b>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} className="calendar__day is-blank" />
          ))}
          {days.map(({ date, day }) => {
            const memories = data.memories.filter((m) => memoryFallsOn(m, date))
            const wishes = data.wishes.filter((w) => wishFallsOn(w, date))
            const feedbacks = data.feedbacks.filter((f) => feedbackFallsOn(f, date))
            return (
              <div key={date} className={`calendar__day ${date === today ? 'is-today' : ''}`}>
                <b className="calendar__number">{day}</b>
                {memories.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="calendar__event theme-memory"
                    onClick={() => nav.openDetail({ kind: 'memory', id: m.id })}
                    title={m.title}
                  >
                    ♥ {m.title}
                  </button>
                ))}
                {wishes.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="calendar__event theme-wish"
                    onClick={() => nav.openDetail({ kind: 'wish', id: w.id })}
                    title={w.title}
                  >
                    ● {w.title}
                  </button>
                ))}
                {feedbacks.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="calendar__event theme-feedback"
                    onClick={() => nav.openDetail({ kind: 'feedback', id: f.id })}
                    title="Feedback do casal"
                  >
                    ✎ Feedback
                  </button>
                ))}
              </div>
            )
          })}
        </div>
        <ul className="calendar__legend">
          <li className="theme-memory">
            <span className="legend-dot" aria-hidden />
            Memórias e comemorações
          </li>
          <li className="theme-wish">
            <span className="legend-dot" aria-hidden />
            Desejos planejados
          </li>
          <li className="theme-feedback">
            <span className="legend-dot" aria-hidden />
            Feedbacks
          </li>
        </ul>
      </div>
    </>
  )
}
