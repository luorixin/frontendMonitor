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

type QueueMetaRecord = {
  count: number
  key: string
  nextSeq: number
}

type QueueItemRecord<T> = {
  id: string
  queueKey: string
  seq: number
  value: T
}

const DB_NAME = "__frontend_monitor__"
const ITEM_STORE_NAME = "queue_items"
const META_STORE_NAME = "queue_meta"

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
      const transaction = database.transaction(
        [ITEM_STORE_NAME, META_STORE_NAME],
        "readonly"
      )
      const meta = (await requestToPromise(
        transaction.objectStore(META_STORE_NAME).get(options.key)
      )) as QueueMetaRecord | undefined

      if (!meta || meta.count <= 0) return []

      const startSeq = meta.nextSeq - meta.count
      const items: T[] = []

      for (let seq = startSeq; seq < meta.nextSeq; seq += 1) {
        const record = (await requestToPromise(
          transaction.objectStore(ITEM_STORE_NAME).get(buildItemId(options.key, seq))
        )) as QueueItemRecord<T> | undefined

        if (record) {
          items.push(record.value)
        }
      }

      if (!options.validate) return items
      return items.filter(options.validate)
    } finally {
      database.close()
    }
  } catch {
    return readStorageQueue(options)
  }
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
      const transaction = database.transaction(
        [ITEM_STORE_NAME, META_STORE_NAME],
        "readwrite"
      )
      const metaStore = transaction.objectStore(META_STORE_NAME)
      const itemStore = transaction.objectStore(ITEM_STORE_NAME)
      const existingMeta = (await requestToPromise(
        metaStore.get(options.key)
      )) as QueueMetaRecord | undefined

      if (existingMeta) {
        const startSeq = existingMeta.nextSeq - existingMeta.count
        for (let seq = startSeq; seq < existingMeta.nextSeq; seq += 1) {
          await requestToPromise(itemStore.delete(buildItemId(options.key, seq)))
        }
      }

      if (trimmed.length === 0) {
        await requestToPromise(metaStore.delete(options.key))
        return true
      }

      for (let seq = 0; seq < trimmed.length; seq += 1) {
        await requestToPromise(
          itemStore.put({
            id: buildItemId(options.key, seq),
            queueKey: options.key,
            seq,
            value: trimmed[seq]
          } satisfies QueueItemRecord<T>)
        )
      }

      await requestToPromise(
        metaStore.put({
          count: trimmed.length,
          key: options.key,
          nextSeq: trimmed.length
        } satisfies QueueMetaRecord)
      )
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
      const transaction = database.transaction(
        [ITEM_STORE_NAME, META_STORE_NAME],
        "readwrite"
      )
      const metaStore = transaction.objectStore(META_STORE_NAME)
      const itemStore = transaction.objectStore(ITEM_STORE_NAME)
      const meta = (await requestToPromise(
        metaStore.get(key)
      )) as QueueMetaRecord | undefined

      if (meta) {
        const startSeq = meta.nextSeq - meta.count
        for (let seq = startSeq; seq < meta.nextSeq; seq += 1) {
          await requestToPromise(itemStore.delete(buildItemId(key, seq)))
        }
      }

      await requestToPromise(metaStore.delete(key))
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
    const request = indexedDb.open(DB_NAME, 2)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(ITEM_STORE_NAME)) {
        database.createObjectStore(ITEM_STORE_NAME, {
          keyPath: "id"
        })
      }
      if (!database.objectStoreNames.contains(META_STORE_NAME)) {
        database.createObjectStore(META_STORE_NAME, {
          keyPath: "key"
        })
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

function buildItemId(queueKey: string, seq: number): string {
  return `${queueKey}:${seq}`
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

export async function appendAsyncQueue<T>(
  item: T,
  options: QueueStoreOptions<T>
): Promise<boolean> {
  const indexedDb = getIndexedDb()
  if (!indexedDb) {
    return appendStorageQueue(item, options)
  }

  try {
    const database = await openQueueDatabase(indexedDb)
    try {
      const transaction = database.transaction(
        [ITEM_STORE_NAME, META_STORE_NAME],
        "readwrite"
      )
      const metaStore = transaction.objectStore(META_STORE_NAME)
      const itemStore = transaction.objectStore(ITEM_STORE_NAME)
      const meta = (await requestToPromise(
        metaStore.get(options.key)
      )) as QueueMetaRecord | undefined

      const nextSeq = meta?.nextSeq ?? 0
      const currentCount = meta?.count ?? 0

      await requestToPromise(
        itemStore.put({
          id: buildItemId(options.key, nextSeq),
          queueKey: options.key,
          seq: nextSeq,
          value: item
        } satisfies QueueItemRecord<T>)
      )

      let nextCount = currentCount + 1
      const maxEntries = options.maxEntries

      if (maxEntries !== undefined && maxEntries >= 0 && nextCount > maxEntries) {
        const trimmedCount = nextCount - maxEntries
        const oldestSeq = nextSeq - currentCount
        for (let seq = oldestSeq; seq < oldestSeq + trimmedCount; seq += 1) {
          await requestToPromise(itemStore.delete(buildItemId(options.key, seq)))
        }
        nextCount = maxEntries
      }

      if (nextCount === 0) {
        await requestToPromise(metaStore.delete(options.key))
        return true
      }

      await requestToPromise(
        metaStore.put({
          count: nextCount,
          key: options.key,
          nextSeq: nextSeq + 1
        } satisfies QueueMetaRecord)
      )
      return true
    } finally {
      database.close()
    }
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error("Failed to append async queue")
    options.onWriteError?.(normalizedError)
    return appendStorageQueue(item, options)
  }
}
