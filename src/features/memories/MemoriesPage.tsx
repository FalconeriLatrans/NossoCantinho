import { BookHeart, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigation } from '../../app/navigation'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useCantinho } from '../../context/CantinhoContext'
import { matchesQuery } from '../../utils/text'
import { MemoryCard } from './MemoryCard'
import { sortMemories } from './memorySelectors'
import './memories.css'

export function MemoriesPage({ query }: { query: string }) {
  const { data } = useCantinho()
  const nav = useNavigation()

  const memories = useMemo(
    () => sortMemories(data.memories).filter((m) => matchesQuery(query, m.title, m.description)),
    [data.memories, query],
  )

  const createButton = (
    <button type="button" className="btn btn--primary" onClick={() => nav.openEditor({ kind: 'memory' })}>
      <Plus aria-hidden /> Nova memória
    </button>
  )

  return (
    <>
      <SectionHeading
        title="Pequenos momentos, grandes lembranças."
        subtitle="O que merece continuar pertinho da gente."
        action={createButton}
      />

      {memories.length > 0 ? (
        <div className="card-grid">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onOpen={() => nav.openDetail({ kind: 'memory', id: memory.id })}
            />
          ))}
        </div>
      ) : data.memories.length > 0 ? (
        <EmptyState icon={<BookHeart />} title="Nenhuma memória encontrada para essa busca." />
      ) : (
        <EmptyState
          icon={<BookHeart />}
          title="Ainda não guardamos nenhuma memória."
          description="Que tal começar pelo dia em que tudo começou?"
        />
      )}
    </>
  )
}
