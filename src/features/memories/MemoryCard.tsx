import { Camera } from 'lucide-react'
import { ClickableCard } from '../../components/ui/ClickableCard'
import { PhotoImage } from '../../components/ui/PhotoImage'
import type { Memory } from '../../types'
import { formatLongDate } from '../../utils/date'
import { pluralize } from '../../utils/text'
import { getCover } from './memorySelectors'

interface MemoryCardProps {
  memory: Memory
  onOpen: () => void
}

export function MemoryCard({ memory, onOpen }: MemoryCardProps) {
  const cover = getCover(memory)

  return (
    <ClickableCard theme="memory" onOpen={onOpen} label={`Abrir memória: ${memory.title}`}>
      <div className="card__cover">
        <PhotoImage photo={cover} alt="" />
        {memory.is_anniversary && <span className="badge badge--floating">♥ Anual</span>}
      </div>
      <div className="card__body">
        <p className="card__date">{formatLongDate(memory.memory_date)}</p>
        <h3 className="card__title">{memory.title}</h3>
        {memory.description && <p className="card__text">{memory.description}</p>}
        {memory.photos.length > 0 && (
          <p className="card__meta">
            <Camera aria-hidden /> {pluralize(memory.photos.length, 'foto', 'fotos')}
          </p>
        )}
      </div>
    </ClickableCard>
  )
}
