import { buildPayload } from "./base"
import { state, clearTimer } from "./context"
import { runAfterSendHooks } from "./hooks"
import { debugLog } from "./queue"
import {
  appendStorageQueue,
  clearStorageQueue,
  readStorageQueue,
  writeStorageQueue
} from "./storageQueue"
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

  return appendStorageQueue(
    { attempts: 0, payload },
    {
      key: state.options.offlineQueueKey,
      maxEntries: state.options.maxOfflinePayloads,
      onWriteError: error => debugLog("persist offline payload failed", error),
      validate: isOfflineEntry
    }
  )
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
      compressionAlgorithm: state.options.compression.algorithm,
      compression: state.options.compression.eventPayloads,
      maxPayloadBytes: state.options.maxPayloadBytes,
      timeout: state.options.timeout,
      transport: state.options.transport
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
  if (!state.options) return
  clearStorageQueue(state.options.offlineQueueKey)
}

function readOfflineEntries(): OfflineEntry[] {
  if (!state.options) return []
  return readStorageQueue({
    key: state.options.offlineQueueKey,
    validate: isOfflineEntry
  })
}

function writeOfflineEntries(entries: OfflineEntry[]): boolean {
  if (!state.options) return false
  return writeStorageQueue(entries, {
    key: state.options.offlineQueueKey,
    onWriteError: error => debugLog("persist offline payload failed", error),
    validate: isOfflineEntry
  })
}

function isOfflineEntry(value: unknown): value is OfflineEntry {
  if (typeof value !== "object" || value === null) return false
  const entry = value as { attempts?: unknown; payload?: unknown }
  return (
    typeof entry.attempts === "number" &&
    typeof entry.payload === "object" &&
    entry.payload !== null &&
    "base" in entry.payload &&
    "events" in entry.payload
  )
}
