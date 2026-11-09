/**
 * Armazena as fotos (Blobs) no IndexedDB do navegador.
 *
 * Por que não no localStorage? O localStorage aceita só ~5 MB de texto; poucas
 * fotos já estouram o limite. O IndexedDB guarda arquivos binários e tem cota
 * bem maior. Os metadados (id, capa) continuam junto da memória.
 */
const DB_NAME = 'nosso-cantinho'
const DB_VERSION = 1
const STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null
/** Cache de object URLs para não recriá-los a cada renderização. */
const urlCache = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir o IndexedDB.'))
  }).catch((error: unknown) => {
    dbPromise = null // permite nova tentativa depois
    throw error
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = () => reject(tx.error ?? request.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada.'))
  })
}

export const photoStore = {
  async put(id: string, blob: Blob): Promise<void> {
    await run('readwrite', (store) => store.put(blob, id))
  },

  async getUrl(id: string): Promise<string | null> {
    const cached = urlCache.get(id)
    if (cached) return cached
    const blob = await run<Blob | undefined>('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    urlCache.set(id, url)
    return url
  },

  async remove(ids: string[]): Promise<void> {
    if (!ids.length) return
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      ids.forEach((id) => store.delete(id))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    ids.forEach((id) => {
      const url = urlCache.get(id)
      if (url) URL.revokeObjectURL(url)
      urlCache.delete(id)
    })
  },

  async keys(): Promise<string[]> {
    const keys = await run<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    return keys.map(String)
  },

  /** Remove fotos que não pertencem a nenhuma memória (ex.: salvamento interrompido). */
  async removeOrphans(referencedIds: Set<string>): Promise<void> {
    const keys = await photoStore.keys()
    await photoStore.remove(keys.filter((key) => !referencedIds.has(key)))
  },
}
