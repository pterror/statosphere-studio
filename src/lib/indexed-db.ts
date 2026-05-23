/**
 * Minimal IndexedDB wrapper for statosphere-studio history persistence.
 *
 * Database: statosphere-studio, version 1
 * Object stores:
 *   history-nodes  — keyPath: id — { id, parentId?, patch, inversePatch, timestamp, label? }
 *   history-meta   — keyPath: key — { key, value }
 */

const DB_NAME = 'statosphere-studio'
const DB_VERSION = 1
const STORE_NODES = 'history-nodes'
const STORE_META = 'history-meta'

let _db: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NODES)) {
        db.createObjectStore(STORE_NODES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' })
      }
    }
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readonly')
  return wrap<T[]>(tx.objectStore(storeName).getAll())
}

export async function put<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  await wrap(tx.objectStore(storeName).put(value))
}

export async function deleteRecord(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  await wrap(tx.objectStore(storeName).delete(key))
}

export async function clear(storeName: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  await wrap(tx.objectStore(storeName).clear())
}

export async function getMeta(key: string): Promise<unknown> {
  const db = await openDB()
  const tx = db.transaction(STORE_META, 'readonly')
  const row = await wrap<{ key: string; value: unknown } | undefined>(
    tx.objectStore(STORE_META).get(key),
  )
  return row?.value
}

export async function putMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_META, 'readwrite')
  await wrap(tx.objectStore(STORE_META).put({ key, value }))
}

export { STORE_NODES, STORE_META }
