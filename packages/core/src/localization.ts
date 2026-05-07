import { state } from "./context"
import {
  appendAsyncQueue,
  clearAsyncQueue,
  readAsyncQueue,
  writeAsyncQueue
} from "./queueStore"
import { sendPayload } from "./transport"
import type { MonitorPayload } from "./types"

export async function sendLocal(): Promise<void> {
  if (!state.options) return

  await runLocalizationStoreOperation(async () => {
    const localizedPayloads = await readLocalizedPayloads()
    if (localizedPayloads.length === 0) return

    const remainingPayloads: MonitorPayload[] = []

    for (const payload of localizedPayloads) {
      const result = await sendPayload(state.options!.dsn, payload, {
        compressionAlgorithm: state.options!.compression.algorithm,
        compression: state.options!.compression.eventPayloads,
        maxPayloadBytes: state.options!.maxPayloadBytes,
        timeout: state.options!.timeout,
        transport: state.options!.transport
      })
      if (!result.success) {
        remainingPayloads.push(payload)
      }
    }

    await writeLocalizedPayloads(remainingPayloads)
  })
}

export function persistLocalizedPayload(
  payload: MonitorPayload
): Promise<boolean> {
  if (!state.options) return Promise.resolve(false)
  return runLocalizationStoreOperation(() =>
    appendAsyncQueue(payload, {
      key: state.options!.localizationKey,
      onWriteError: normalizeLocalizationError,
      validate: isMonitorPayload
    })
  )
}

export function clearLocalizedPayloads(): void {
  if (!state.options) return
  void runLocalizationStoreOperation(() =>
    clearAsyncQueue(state.options!.localizationKey)
  )
}

function readLocalizedPayloads(): Promise<MonitorPayload[]> {
  if (!state.options) return Promise.resolve([])
  return readAsyncQueue({
    key: state.options.localizationKey,
    validate: isMonitorPayload
  })
}

function writeLocalizedPayloads(payloads: MonitorPayload[]): Promise<boolean> {
  if (!state.options) return Promise.resolve(false)
  return writeAsyncQueue(payloads, {
    key: state.options.localizationKey,
    onWriteError: normalizeLocalizationError,
    validate: isMonitorPayload
  })
}

function runLocalizationStoreOperation<T>(operation: () => Promise<T>): Promise<T> {
  const previous = state.localizationStorePromise ?? Promise.resolve()
  const result = previous.catch(() => undefined).then(operation)
  state.localizationStorePromise = result.then(
    () => undefined,
    () => undefined
  )
  return result
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
