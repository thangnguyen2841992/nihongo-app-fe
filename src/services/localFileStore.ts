/**
 * Remembers study files (PDF, audio) in this browser's IndexedDB so the learner does not have to pick them again on
 * every visit. Nothing is uploaded. Every function degrades to "nothing remembered" when IndexedDB is unavailable.
 */
export interface StoredFile {
  name: string
  blob: Blob
}

const DB_NAME = 'nihongo-local-files'
const STORE = 'files'
let database: Promise<IDBDatabase | null> | null = null

export const localFilesSupported = () => typeof indexedDB !== 'undefined'

function open(): Promise<IDBDatabase | null> {
  if (!localFilesSupported()) return Promise.resolve(null)
  database ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  }).then((db) => {
    if (!db) database = null
    return db
  })
  return database
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        if (!db) return resolve(undefined)
        const transaction = db.transaction(STORE, mode)
        const request = work(transaction.objectStore(STORE))
        transaction.oncomplete = () => resolve(request ? request.result : undefined)
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB error'))
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB aborted'))
      }),
  )
}

export async function rememberFiles(key: string, files: StoredFile[]): Promise<void> {
  await run('readwrite', (store) => store.put(files.map(({ name, blob }) => ({ name, blob })), key))
}

export async function recallFiles(key: string): Promise<StoredFile[]> {
  const value = await run<unknown>('readonly', (store) => store.get(key))
  return Array.isArray(value)
    ? value.filter((item): item is StoredFile => Boolean(item) && typeof item.name === 'string' && item.blob instanceof Blob)
    : []
}

/** Removes every remembered file whose key starts with the prefix (e.g. one account's files). */
export async function forgetFiles(prefix: string): Promise<void> {
  await run('readwrite', (store) => {
    const range = IDBKeyRange.bound(prefix, `${prefix}￿`)
    store.delete(range)
  })
}
