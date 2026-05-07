import { state } from "./context"
import { sendPayload } from "./transport"
import type { MonitorPayload } from "./types"
import {
  appendStorageQueue,
  clearStorageQueue,
  readStorageQueue,
  writeStorageQueue
} from "./storageQueue"

export async function sendLocal(): Promise<void> {
  if (!state.options) return

  const localizedPayloads = readLocalizedPayloads()
  if (localizedPayloads.length === 0) return

  const remainingPayloads: MonitorPayload[] = []

  for (const payload of localizedPayloads) {
    const result = await sendPayload(state.options.dsn, payload, {
      compressionAlgorithm: state.options.compression.algorithm,
      compression: state.options.compression.eventPayloads,
      maxPayloadBytes: state.options.maxPayloadBytes,
      timeout: state.options.timeout,
      transport: state.options.transport
    })
    if (!result.success) {
      remainingPayloads.push(payload)
    }
  }

  writeLocalizedPayloads(remainingPayloads)
}

export function persistLocalizedPayload(payload: MonitorPayload): boolean {
  if (!state.options) return false
  return appendStorageQueue(payload, {
    key: state.options.localizationKey,
    onWriteError: normalizeLocalizationError,
    validate: isMonitorPayload
  })
}

export function clearLocalizedPayloads(): void {
  if (!state.options) return
  clearStorageQueue(state.options.localizationKey)
}

function readLocalizedPayloads(): MonitorPayload[] {
  if (!state.options) return []
  return readStorageQueue({
    key: state.options.localizationKey,
    validate: isMonitorPayload
  })
}

function writeLocalizedPayloads(payloads: MonitorPayload[]): boolean {
  if (!state.options) return false
  return writeStorageQueue(payloads, {
    key: state.options.localizationKey,
    onWriteError: normalizeLocalizationError,
    validate: isMonitorPayload
  })
}

function normalizeLocalizationError(error: Error): void {
  state.options?.localizationOverflow?.(error)
}

function isMonitorPayload(value: unknown): value is MonitorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "base" in value &&
    "events" in value
  )
}
