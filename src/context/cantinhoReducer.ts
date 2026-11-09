import type { CantinhoData, Experience, Feedback, Memory } from '../types'

export type CantinhoAction =
  | { type: 'memory/upsert'; memory: Memory }
  | { type: 'memory/delete'; id: string }
  | { type: 'wish/upsert'; wish: Experience }
  | { type: 'wish/delete'; id: string }
  | { type: 'wish/markDone'; id: string }
  | { type: 'feedback/upsert'; feedback: Feedback }
  | { type: 'feedback/delete'; id: string }

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

/**
 * Reducer puro com todas as regras de integridade:
 * excluir um registro também remove os vínculos que apontavam para ele.
 */
export function cantinhoReducer(state: CantinhoData, action: CantinhoAction): CantinhoData {
  switch (action.type) {
    case 'memory/upsert':
      return { ...state, memories: upsert(state.memories, action.memory) }

    case 'memory/delete':
      return {
        ...state,
        memories: state.memories.filter((m) => m.id !== action.id),
        feedbacks: state.feedbacks.map((f) =>
          f.memory_ids.includes(action.id) ? { ...f, memory_ids: f.memory_ids.filter((id) => id !== action.id) } : f,
        ),
      }

    case 'wish/upsert':
      return { ...state, wishes: upsert(state.wishes, action.wish) }

    case 'wish/delete':
      return {
        ...state,
        wishes: state.wishes.filter((w) => w.id !== action.id),
        memories: state.memories.map((m) => (m.experience_id === action.id ? { ...m, experience_id: null } : m)),
        feedbacks: state.feedbacks.map((f) =>
          f.experience_ids.includes(action.id)
            ? { ...f, experience_ids: f.experience_ids.filter((id) => id !== action.id) }
            : f,
        ),
      }

    case 'wish/markDone':
      return {
        ...state,
        wishes: state.wishes.map((w) => (w.id === action.id ? { ...w, status: 'done' } : w)),
      }

    case 'feedback/upsert':
      return { ...state, feedbacks: upsert(state.feedbacks, action.feedback) }

    case 'feedback/delete':
      return { ...state, feedbacks: state.feedbacks.filter((f) => f.id !== action.id) }

    default:
      return state
  }
}
