import { buildPayload } from "./base"
import { DEFAULT_OPTIONS } from "./config"
import { state, clearTimer } from "./context"
import { runBeforeSendHooks } from "./hooks"
import { sendPayload } from "./transport"
import type { MonitorEvent } from "./types"

function debugLog(message: string, payload?: unknown): void {
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

  state.queue.push(event)

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
  if (state.flushPromise) return state.flushPromise

  state.flushPromise = flushQueueInternal().finally(() => {
    state.flushPromise = null
  })

  return state.flushPromise
}

async function flushQueueInternal(): Promise<void> {
  if (!state.initialized || !state.options || state.queue.length === 0) return

  state.flushTimer = clearTimer(state.flushTimer)

  const events = state.queue.splice(0, state.queue.length)
  const payload = buildPayload(events)
  const processedPayload = runBeforeSendHooks(payload)

  if (processedPayload === false) {
    debugLog("drop payload from beforeSend")
    return
  }

  const result = await sendPayload(state.options.dsn, processedPayload)

  if (!result.success) {
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
