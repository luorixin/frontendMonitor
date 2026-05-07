import {
  appendStorageQueue,
  clearStorageQueue,
  readStorageQueue,
  writeStorageQueue
} from "./storageQueue"

export type QueueStoreOptions<T> = {
  key: string
  maxEntries?: number
  onWriteError?: (error: Error) => void
  validate?: (value: unknown) => value is T
}

const DB_NAME = "__frontend_monitor__"
const STORE_NAME = "queues"

export async function readAsyncQueue<T>(
  options: QueueStoreOptions<T>
): Promise<T[]> {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    return readStorageQueue(options)
  }

  try {
    const database = await openQueueDatabase(indexedDb)
    try {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(options.key)

      const parsed = await requestToPromise<unknown>(request)
      if (!Array.isArray(parsed)) return []
      if (!options.validate) return parsed as T[]
      return parsed.filter(options.validate)
    } finally {
      database.close()
    }
  } catch {
    return readStorageQueue(options)
  }
}

export async function appendAsyncQueue<T>(
  item: T,
  options: QueueStoreOptions<T>
): Promise<boolean> {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    return appendStorageQueue(item, options)
  }

  const entries = await readAsyncQueue(options)
  entries.push(item)
  return writeAsyncQueue(entries, options)
}

export async function writeAsyncQueue<T>(
  entries: T[],
  options: QueueStoreOptions<T>
): Promise<boolean> {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    return writeStorageQueue(entries, options)
  }

  const trimmed =
    options.maxEntries !== undefined && options.maxEntries >= 0
      ? entries.slice(-options.maxEntries)
      : entries

  try {
    const database = await openQueueDatabase(indexedDb)
    try {
      const store = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME)

      if (trimmed.length === 0) {
        await requestToPromise(store.delete(options.key))
        return true
      }

      await requestToPromise(store.put(trimmed, options.key))
      return true
    } finally {
      database.close()
    }
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error("Failed to write async queue")
    options.onWriteError?.(normalizedError)
    return writeStorageQueue(entries, options)
  }
}

export async function clearAsyncQueue(key: string): Promise<void> {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    clearStorageQueue(key)
    return
  }

  try {
    const database = await openQueueDatabase(indexedDb)
    try {
      await requestToPromise(
        database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key)
      )
    } finally {
      database.close()
    }
  } catch {
    clearStorageQueue(key)
  }
}

function getIndexedDb(): IDBFactory | null {
  try {
    return typeof indexedDB === "object" && indexedDB !== null ? indexedDB : null
  } catch {
    return null
  }
}

function openQueueDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open async queue database"))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(request.error ?? new Error("Async queue request failed"))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}
