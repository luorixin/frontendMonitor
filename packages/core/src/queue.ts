import { buildPayload } from "./base"
import { DEFAULT_OPTIONS } from "./config"
import { state, clearTimer } from "./context"
import { runAfterSendHooks, runBeforePushEventHooks, runBeforeSendHooks } from "./hooks"
import { persistLocalizedPayload } from "./localization"
import { persistOfflineEvents, persistOfflinePayload } from "./offline"
import { sendPayload } from "./transport"
import type { MonitorEvent } from "./types"

export function debugLog(message: string, payload?: unknown): void {
  if (!state.options?.debug) return
  if (payload === undefined) {
    console.info(`[frontend-monitor] ${message}`)
    return
  }

  console.info(`[frontend-monitor] ${message}`, payload)
}

export function enqueueEvent(event: MonitorEvent, flush = false): void {
  if (!state.initialized || !state.options) return

  if (!flush && shouldDropBySampling()) {
    debugLog("drop event by sampling", event)
    return
  }

  if (state.networkStatus === "offline") {
    persistOfflineEvents([event])
    debugLog("drop event: offline")
    return
  }

  const hookResult = runBeforePushEventHooks(event)
  if (hookResult === false) {
    debugLog("drop event from beforePushEvent hook")
    return
  }

  const events = Array.isArray(hookResult) ? hookResult : [hookResult]

  for (const ev of events) {
    if (state.queue.length >= state.options.maxQueueLength) {
      state.queue.shift()
    }
    state.queue.push(ev)
  }

  if (state.queue.length >= state.options.batchSize || flush) {
    void flushQueue()
    return
  }

  scheduleFlush()
}

export function scheduleFlush(): void {
  if (!state.options) return

  state.flushTimer = clearTimer(state.flushTimer)
  state.flushTimer = setTimeout(() => {
    void flushQueue()
  }, state.options.flushInterval)
}

export function flushQueue(): Promise<void> {
  return flushQueueWithOptions()
}

export function flushQueueOnExit(): Promise<void> {
  return flushQueueWithOptions({ preferBeacon: true })
}

function flushQueueWithOptions(options?: {
  preferBeacon?: boolean
}): Promise<void> {
  if (state.flushPromise) return state.flushPromise

  state.flushPromise = flushQueueInternal(options).finally(() => {
    state.flushPromise = null
  })

  return state.flushPromise
}

async function flushQueueInternal(options?: {
  preferBeacon?: boolean
}): Promise<void> {
  if (!state.initialized || !state.options || state.queue.length === 0) return

  state.flushTimer = clearTimer(state.flushTimer)

  const events = state.queue.splice(0, state.queue.length)
  const payload = buildPayload(events)
  const processedPayload = runBeforeSendHooks(payload)

  if (processedPayload === false) {
    debugLog("drop payload from beforeSend")
    return
  }

  if (state.options.localization) {
    const persisted = persistLocalizedPayload(processedPayload)
    debugLog(persisted ? "persist localized payload" : "persist localized failed")
    return
  }

  const result = await sendPayload(state.options.dsn, processedPayload, {
    maxPayloadBytes: state.options.maxPayloadBytes,
    preferBeacon: options?.preferBeacon,
    timeout: state.options.timeout
  })

  runAfterSendHooks(result, processedPayload)

  if (!result.success) {
    if (result.reason !== "payload_too_large") {
      persistOfflinePayload(processedPayload)
    }
    debugLog("send failed", result)
    return
  }

  debugLog("send success", result)
}

export function clearQueue(): void {
  state.queue = []
  state.flushTimer = clearTimer(state.flushTimer)
}

function shouldDropBySampling(): boolean {
  const sampleRate = state.options?.sampleRate ?? DEFAULT_OPTIONS.sampleRate
  return sampleRate <= 0 || Math.random() > sampleRate
}
