import { loadData, saveData } from '../local/localStorageData'
import { photoStore } from '../local/photoStore'
import type { CantinhoRepository } from './types'

/** Modo local: textos no localStorage e fotos no IndexedDB deste navegador. */
export function createLocalRepository(): CantinhoRepository {
  return {
    mode: 'local',

    load: async () => loadData(),
    persistSnapshot: saveData,
    getPhotoUrl: (photo) => photoStore.getUrl(photo.id),

    async saveMemory(memory, uploads, previous) {
      const stored: string[] = []
      try {
        for (const upload of uploads) {
          await photoStore.put(upload.id, upload.blob)
          stored.push(upload.id)
        }
      } catch (error) {
        await photoStore.remove(stored).catch(() => undefined)
        throw error
      }
      const kept = new Set(memory.photos.map((p) => p.id))
      const removed = (previous?.photos ?? []).filter((p) => !kept.has(p.id)).map((p) => p.id)
      photoStore.remove(removed).catch(() => undefined)
      return memory
    },

    async deleteMemory(memory) {
      await photoStore.remove(memory.photos.map((p) => p.id)).catch(() => undefined)
    },

    // Textos são gravados de uma vez por `persistSnapshot`.
    saveWish: async (wish) => wish,
    deleteWish: async () => undefined,
    saveFeedback: async (feedback) => feedback,
    deleteFeedback: async () => undefined,

    async cleanup(data) {
      const referenced = new Set(data.memories.flatMap((m) => m.photos.map((p) => p.id)))
      await photoStore.removeOrphans(referenced).catch(() => undefined)
    },
  }
}
