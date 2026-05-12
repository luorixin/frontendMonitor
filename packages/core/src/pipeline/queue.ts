import { buildPayload } from "../core/base"
import { DEFAULT_OPTIONS } from "../core/config"
import { state, clearTimer } from "../core/context"
import { runAfterSendHooks, runBeforePushEventHooks, runBeforeSendHooks } from "../core/hooks"
import { persistLocalizedPayload } from "../storage/localization"
import { persistOfflineEvents, persistOfflinePayload } from "../storage/offline"
import { triggerReplayCapture } from "./replay"
import { sendPayload } from "./transport"
import { byteLength, safeStringify, uuid } from "../utils"
import type { MonitorEvent } from "../core/types"

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

  triggerReplayCapture(event)

  if (!flush && shouldDropBySampling()) {
    state.diagnostics.droppedBySampling += 1
    debugLog("drop event by sampling", event)
    return
  }

  if (state.networkStatus === "offline") {
    void persistOfflineEvents([ensureEventId(event)])
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
      state.diagnostics.droppedByQueueOverflow += 1
    }
    state.queue.push(ensureEventId(ev))
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
    const persisted = await persistLocalizedPayload(processedPayload)
    debugLog(persisted ? "persist localized payload" : "persist localized failed")
    return
  }

  await sendProcessedPayload(processedPayload, {
    compressionAlgorithm: state.options.compression.algorithm,
    compression: state.options.compression.eventPayloads,
    maxPayloadBytes: state.options.maxPayloadBytes,
    preferBeacon: options?.preferBeacon,
    timeout: state.options.timeout,
    transport: state.options.transport
  })
}

async function sendProcessedPayload(
  payload: ReturnType<typeof buildPayload>,
  options: Parameters<typeof sendPayload>[2]
): Promise<void> {
  if (!state.options) return

  const maxPayloadBytes = state.options.maxPayloadBytes
  if (byteLength(safeStringify(payload)) > maxPayloadBytes) {
    if (payload.events.length <= 1) {
      state.diagnostics.droppedByPayloadSize += payload.events.length
      debugLog("drop payload: payload too large")
      return
    }

    const midpoint = Math.ceil(payload.events.length / 2)
    await sendProcessedPayload(
      { base: payload.base, events: payload.events.slice(0, midpoint) },
      options
    )
    await sendProcessedPayload(
      { base: payload.base, events: payload.events.slice(midpoint) },
      options
    )
    return
  }

  const result = await sendPayload(state.options.dsn, payload, options)

  runAfterSendHooks(result, payload)

  if (!result.success) {
    if (result.reason !== "payload_too_large") {
      await persistOfflinePayload(payload)
    } else {
      state.diagnostics.droppedByPayloadSize += payload.events.length
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

function ensureEventId(event: MonitorEvent): MonitorEvent {
  event.eventId ??= uuid()
  event.traceId ??= state.traceId ?? undefined
  event.spanId ??= state.activeSpanId ?? state.spanId ?? undefined
  return event
}
