type StorageQueueOptions<T> = {
  key: string
  maxEntries?: number
  onWriteError?: (error: Error) => void
  validate?: (value: unknown) => value is T
}

export function readStorageQueue<T>(options: StorageQueueOptions<T>): T[] {
  const storage = getLocalStorage()
  if (!storage) return []

  const raw = storage.getItem(options.key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    if (!options.validate) return parsed as T[]
    return parsed.filter(options.validate)
  } catch {
    return []
  }
}

export function appendStorageQueue<T>(
  item: T,
  options: StorageQueueOptions<T>
): boolean {
  const entries = readStorageQueue(options)
  entries.push(item)
  return writeStorageQueue(entries, options)
}

export function writeStorageQueue<T>(
  entries: T[],
  options: StorageQueueOptions<T>
): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  const trimmed =
    options.maxEntries !== undefined && options.maxEntries >= 0
      ? entries.slice(-options.maxEntries)
      : entries

  try {
    if (trimmed.length === 0) {
      storage.removeItem(options.key)
      return true
    }

    storage.setItem(options.key, JSON.stringify(trimmed))
    return true
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error("Failed to write storage queue")
    options.onWriteError?.(normalizedError)
    return false
  }
}

export function clearStorageQueue(key: string): void {
  const storage = getLocalStorage()
  if (!storage) return
  storage.removeItem(key)
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
