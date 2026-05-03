import { buildPayload } from "./base"
import { state, clearTimer } from "./context"
import { runAfterSendHooks } from "./hooks"
import { debugLog } from "./queue"
import { sendPayload } from "./transport"
import type { MonitorEvent, MonitorPayload } from "./types"

type OfflineEntry = {
  attempts: number
  payload: MonitorPayload
}

export function persistOfflineEvents(events: MonitorEvent[]): boolean {
  if (!state.options?.offlineRetry || state.options.maxOfflinePayloads === 0) {
    return false
  }

  return persistOfflinePayload(buildPayload(events))
}

export function persistOfflinePayload(payload: MonitorPayload): boolean {
  if (!state.options?.offlineRetry || state.options.maxOfflinePayloads === 0) {
    return false
  }

  const entries = readOfflineEntries()
  entries.push({ attempts: 0, payload })
  const maxEntries = state.options.maxOfflinePayloads
  const trimmed = maxEntries > 0 ? entries.slice(-maxEntries) : []
  return writeOfflineEntries(trimmed)
}

export function scheduleOfflineReplay(delay?: number): void {
  if (!state.options?.offlineRetry || state.networkStatus === "offline") return

  state.retryTimer = clearTimer(state.retryTimer)
  state.retryTimer = setTimeout(() => {
    void replayOfflinePayloads()
  }, delay ?? state.options.retryBaseDelay)
}

export async function replayOfflinePayloads(): Promise<void> {
  if (!state.options?.offlineRetry || state.networkStatus === "offline") return

  const entries = readOfflineEntries()
  if (entries.length === 0) return

  const remaining: OfflineEntry[] = []
  let shouldRetryLater = false

  for (const entry of entries) {
    const result = await sendPayload(state.options.dsn, entry.payload, {
      maxPayloadBytes: state.options.maxPayloadBytes,
      timeout: state.options.timeout
    })

    runAfterSendHooks(result, entry.payload)

    if (!result.success) {
      const attempts = entry.attempts + 1
      if (attempts < state.options.retryMaxAttempts) {
        remaining.push({ attempts, payload: entry.payload })
        shouldRetryLater = true
      }
    }
  }

  writeOfflineEntries(remaining)

  if (shouldRetryLater && state.options.retryMaxAttempts > 0) {
    const nextAttempt = Math.max(...remaining.map(entry => entry.attempts), 1)
    scheduleOfflineReplay(state.options.retryBaseDelay * 2 ** (nextAttempt - 1))
  }
}

export function clearOfflinePayloads(): void {
  const storage = getLocalStorage()
  if (!storage || !state.options) return
  storage.removeItem(state.options.offlineQueueKey)
}

function readOfflineEntries(): OfflineEntry[] {
  const storage = getLocalStorage()
  if (!storage || !state.options) return []

  const raw = storage.getItem(state.options.offlineQueueKey)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as OfflineEntry[]) : []
  } catch {
    return []
  }
}

function writeOfflineEntries(entries: OfflineEntry[]): boolean {
  const storage = getLocalStorage()
  if (!storage || !state.options) return false

  try {
    if (entries.length === 0) {
      storage.removeItem(state.options.offlineQueueKey)
      return true
    }

    storage.setItem(state.options.offlineQueueKey, JSON.stringify(entries))
    return true
  } catch (error) {
    debugLog("persist offline payload failed", error)
    return false
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
