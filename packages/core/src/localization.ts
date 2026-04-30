import { state } from "./context"
import { sendPayload } from "./transport"
import type { MonitorPayload } from "./types"

export async function sendLocal(): Promise<void> {
  if (!state.options) return

  const localizedPayloads = readLocalizedPayloads()
  if (localizedPayloads.length === 0) return

  const remainingPayloads: MonitorPayload[] = []

  for (const payload of localizedPayloads) {
    const result = await sendPayload(state.options.dsn, payload)
    if (!result.success) {
      remainingPayloads.push(payload)
    }
  }

  writeLocalizedPayloads(remainingPayloads)
}

export function persistLocalizedPayload(payload: MonitorPayload): boolean {
  const localizedPayloads = readLocalizedPayloads()
  localizedPayloads.push(payload)
  return writeLocalizedPayloads(localizedPayloads)
}

export function clearLocalizedPayloads(): void {
  const storage = getLocalStorage()
  if (!storage || !state.options) return
  storage.removeItem(state.options.localizationKey)
}

function readLocalizedPayloads(): MonitorPayload[] {
  const storage = getLocalStorage()
  if (!storage || !state.options) return []

  const raw = storage.getItem(state.options.localizationKey)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as MonitorPayload[]) : []
  } catch {
    return []
  }
}

function writeLocalizedPayloads(payloads: MonitorPayload[]): boolean {
  const storage = getLocalStorage()
  if (!storage || !state.options) return false

  try {
    if (payloads.length === 0) {
      storage.removeItem(state.options.localizationKey)
      return true
    }

    storage.setItem(state.options.localizationKey, JSON.stringify(payloads))
    return true
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error("Failed to write localization")
    state.options.localizationOverflow?.(normalizedError)
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
