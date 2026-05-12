import { encodeJSONRequestBody } from "./compression"
import { record } from "rrweb"
import { SDK_VERSION } from "../core/config"
import { addCleanup, clearTimer, state } from "../core/context"
import { appendAsyncQueue, clearAsyncQueue, readAsyncQueue } from "../storage/queueStore"
import type {
  ConsoleErrorEventPayload,
  MonitorEvent,
  ReplayChunkPayload,
  RequestEventPayload,
  ResourceErrorEventPayload,
  TransportResult
} from "../core/types"
import { matchesIgnoreRule, now, safeStringify, uuid } from "../utils"

const REPLAY_BEACON_LIMIT = 128 * 1024
const REPLAY_FAILED_QUEUE_KEY = "__frontend_monitor_replay_failed__"

export function initSessionReplay(): void {
  const options = state.options?.sessionReplay

  if (!state.options || !options?.enabled) return
  const sampleRate =
    options.mode === "full"
      ? options.sample.fullSessionRate
      : options.sample.errorSessionRate
  if (sampleRate <= 0 || Math.random() > sampleRate) return
  if (state.replayStop) return

  state.replayId = uuid()
  state.replayCaptureUntil = 0
  state.replayRingBuffer = []
  state.replayQueue = []
  state.replaySequence = 0
  state.replayStartedAt = 0
  state.replayTriggerCount = 0

  const stopHandler = record({
    blockClass: options.privacy.blockClass || undefined,
    blockSelector: options.privacy.blockSelector || undefined,
    emit(event) {
      enqueueReplayEvent(event)
    },
    ignoreClass: options.privacy.ignoreClass || undefined,
    ignoreSelector: options.privacy.ignoreSelector || undefined,
    maskAllInputs: options.privacy.maskAllInputs,
    maskInputOptions:
      Object.keys(options.privacy.maskInputOptions).length > 0
        ? options.privacy.maskInputOptions
        : undefined,
    maskTextClass: options.privacy.maskTextClass || undefined,
    maskTextSelector: options.privacy.maskTextSelector || undefined,
    recordCanvas: options.canvas.enabled && options.canvas.recordCanvas,
    sampling:
      options.canvas.enabled && options.canvas.recordCanvas
        ? { canvas: options.canvas.samplingInterval }
        : undefined,
    slimDOMOptions:
      Object.keys(options.privacy.slimDOMOptions).length > 0
        ? options.privacy.slimDOMOptions
        : undefined
  } as Parameters<typeof record>[0])
  state.replayStop = stopHandler || null

  addCleanup(() => {
    stopSessionReplay()
  })
}

export function getReplayId(): string | null {
  return state.replayId
}

export function stopSessionReplay(): void {
  state.replayStop?.()
  state.replayStop = null
  state.replayFlushTimer = clearTimer(state.replayFlushTimer)
  state.replayCaptureUntil = 0
  state.replayId = null
  state.replayRingBuffer = []
  state.replayQueue = []
}

export function startSessionReplay(): void {
  if (!state.options) return
  state.options.sessionReplay.enabled = true
  initSessionReplay()
}

export function pauseSessionReplay(): void {
  state.replayStop?.()
  state.replayStop = null
}

export function resumeSessionReplay(): void {
  if (!state.options?.sessionReplay.enabled || state.replayStop) return
  const replayId = state.replayId
  initSessionReplay()
  if (replayId) {
    state.replayId = replayId
  }
}

export function addReplayEvent(
  tag: string,
  payload?: Record<string, unknown>
): void {
  enqueueReplayEvent({
    data: {
      payload,
      tag
    },
    timestamp: now(),
    type: 5
  })
}

export function recordReplayMonitorEvent(event: MonitorEvent): void {
  addReplayEvent("monitor.event", {
    message: "message" in event ? event.message : undefined,
    type: event.type,
    url: event.url
  })
}

export function scheduleReplayFlush(): void {
  if (!state.options?.sessionReplay.enabled) return
  state.replayFlushTimer = clearTimer(state.replayFlushTimer)
  state.replayFlushTimer = setTimeout(() => {
    void flushReplayQueue()
  }, resolveReplayFlushDelay())
}

export function enqueueReplayEvent(event: unknown): void {
  if (!state.options?.sessionReplay.enabled || !state.replayId) return

  const options = state.options.sessionReplay
  const eventTimestamp = readReplayEventTimestamp(event)
  if (state.replayStartedAt === 0) {
    state.replayStartedAt = eventTimestamp
  }

  if (options.mode === "error-linked") {
    pushReplayRingBuffer(event, eventTimestamp)

    if (!isReplayCaptureActive(eventTimestamp)) {
      return
    }
  }

  state.replayQueue.push(event)

  if (options.mode === "error-linked") {
    return
  }

  if (state.replayQueue.length >= options.maxEvents) {
    void flushReplayQueue()
    return
  }

  scheduleReplayFlush()
}

export function flushReplayQueue(forceBeacon = false): Promise<void> {
  if (state.replayFlushPromise) return state.replayFlushPromise

  state.replayFlushPromise = flushReplayQueueInternal(forceBeacon).finally(() => {
    state.replayFlushPromise = null
  })

  return state.replayFlushPromise
}

async function flushReplayQueueInternal(forceBeacon: boolean): Promise<void> {
  if (!state.options?.sessionReplay.enabled || !state.replayId) return

  state.replayFlushTimer = clearTimer(state.replayFlushTimer)
  await hydrateReplayTransportQueue()
  await flushReplayTransportQueue(forceBeacon)

  if (state.replayQueue.length === 0) return

  const queued = state.replayQueue.splice(0, state.replayQueue.length)
  const payload = buildReplayChunkPayload(queued, state.replaySequence)
  const body = safeStringify(payload)

  if (body.length > state.options.sessionReplay.maxPayloadBytes) {
    while (queued.length > 1 && safeStringify(buildReplayChunkPayload(queued, state.replaySequence)).length > state.options.sessionReplay.maxPayloadBytes) {
      const tail = queued.splice(Math.max(1, Math.floor(queued.length / 2)))
      state.replayQueue.unshift(...tail)
    }
  }

  const finalPayload = buildReplayChunkPayload(queued, state.replaySequence++)
  const result = await sendReplayChunk(finalPayload, forceBeacon)
  if (!result.success) {
    state.replayTransportQueue.push(finalPayload)
    await persistReplayChunk(finalPayload)
  }

  if (state.options.sessionReplay.mode === "error-linked") {
    state.replayCaptureUntil = 0
  }
}

async function flushReplayTransportQueue(forceBeacon: boolean): Promise<void> {
  if (state.replayTransportQueue.length === 0) return

  const queued = state.replayTransportQueue.splice(
    0,
    state.replayTransportQueue.length
  )
  const remaining: ReplayChunkPayload[] = []

  for (const payload of queued) {
    const result = await sendReplayChunk(payload, forceBeacon)
    if (!result.success) {
      remaining.push(payload)
    }
  }

  state.replayTransportQueue.unshift(...remaining)
  if (remaining.length === 0) {
    await clearAsyncQueue(REPLAY_FAILED_QUEUE_KEY)
  }
}

async function hydrateReplayTransportQueue(): Promise<void> {
  if (state.replayTransportQueue.length > 0) return
  const persisted = await readAsyncQueue({
    key: REPLAY_FAILED_QUEUE_KEY,
    validate: isReplayChunkPayload
  })
  if (persisted.length > 0) {
    state.replayTransportQueue.unshift(...persisted)
  }
}

function persistReplayChunk(payload: ReplayChunkPayload): Promise<boolean> {
  return appendAsyncQueue(payload, {
    key: REPLAY_FAILED_QUEUE_KEY,
    maxEntries: 50,
    validate: isReplayChunkPayload
  })
}

function isReplayChunkPayload(value: unknown): value is ReplayChunkPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "replayId" in value &&
    "events" in value &&
    Array.isArray((value as { events?: unknown }).events)
  )
}

function buildReplayChunkPayload(
  events: unknown[],
  sequence: number
): ReplayChunkPayload {
  if (!state.options || !state.replayId) {
    throw new Error("frontend-monitor replay is not initialized")
  }

  const timestamps = events
    .map(readReplayEventTimestamp)
    .filter(value => Number.isFinite(value))

  const startedAt =
    timestamps.length > 0 ? Math.min(...timestamps) : state.replayStartedAt || now()
  const endedAt = timestamps.length > 0 ? Math.max(...timestamps) : startedAt

  const payload: ReplayChunkPayload = {
    appName: state.options.appName,
    appVersion: state.options.appVersion,
    deviceId: state.deviceId,
    endedAt,
    environment: state.options.environment,
    events,
    pageId: state.pageId,
    release: state.options.release,
    replayId: state.replayId,
    sdkVersion: SDK_VERSION,
    sequence,
    sessionId: state.sessionId,
    startedAt,
    title: document.title,
    url: window.location.href,
    userAgent: window.navigator.userAgent,
    userId: state.options.userId
  }

  return payload
}

export function triggerReplayCapture(event: MonitorEvent): void {
  const options = state.options?.sessionReplay
  if (!options?.enabled || !state.replayId) return
  if (options.mode !== "error-linked") return
  if (!shouldTriggerReplayForEvent(event)) return

  const triggerTimestamp = event.timestamp || now()

  if (state.replayCaptureUntil > 0) {
    state.replayCaptureUntil = Math.max(
      state.replayCaptureUntil,
      triggerTimestamp + options.errorLinked.postTriggerMs
    )
    scheduleReplayFlush()
    return
  }

  if (state.replayTriggerCount >= options.errorLinked.maxTriggersPerSession) {
    return
  }

  state.replayTriggerCount += 1
  state.replayCaptureUntil =
    triggerTimestamp + options.errorLinked.postTriggerMs
  state.replayQueue = [...state.replayRingBuffer]
  scheduleReplayFlush()
}

async function sendReplayChunk(
  payload: ReplayChunkPayload,
  forceBeacon: boolean
): Promise<TransportResult> {
  const endpoint = state.options?.sessionReplay.endpoint
  if (!endpoint) {
    return {
      success: false,
      transport: "xhr"
    }
  }

  const body = safeStringify(payload)
  if (
    forceBeacon &&
    typeof navigator.sendBeacon === "function" &&
    body.length <= REPLAY_BEACON_LIMIT
  ) {
    return {
      success: navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" })
      ),
      transport: "beacon"
    }
  }

  try {
    if (!state.options?.compression.sessionReplay) {
      const response = await fetch(endpoint, {
        body,
        headers: {
          "content-type": "application/json"
        },
        keepalive: forceBeacon,
        method: "POST"
      })

      return {
        status: response.status,
        success: response.ok,
        transport: "xhr"
      }
    }

    const encodedBody = await encodeJSONRequestBody(
      body,
      state.options.compression.algorithm
    )
    const response = await fetch(endpoint, {
      body: encodedBody.body,
      headers: {
        ...(encodedBody.contentEncoding
          ? { "content-encoding": encodedBody.contentEncoding }
          : {}),
        "content-type": "application/json"
      },
      keepalive: forceBeacon,
      method: "POST"
    })

    if (response.ok || !encodedBody.contentEncoding) {
      return {
        status: response.status,
        success: response.ok,
        transport: "xhr"
      }
    }

    const retryResponse = await fetch(endpoint, {
      body,
      headers: {
        "content-type": "application/json"
      },
      keepalive: forceBeacon,
      method: "POST"
    })

    return {
      status: retryResponse.status,
      success: retryResponse.ok,
      transport: "xhr"
    }
  } catch {
    return {
      reason: "network_error",
      success: false,
      transport: "xhr"
    }
  }
}

function readReplayEventTimestamp(event: unknown): number {
  if (
    typeof event === "object" &&
    event !== null &&
    "timestamp" in event &&
    typeof (event as { timestamp?: unknown }).timestamp === "number"
  ) {
    return (event as { timestamp: number }).timestamp
  }

  return now()
}

function pushReplayRingBuffer(event: unknown, eventTimestamp: number): void {
  const options = state.options?.sessionReplay
  if (!options || options.mode !== "error-linked") return

  state.replayRingBuffer.push(event)
  const minTimestamp = eventTimestamp - options.errorLinked.preTriggerMs
  while (state.replayRingBuffer.length > 0) {
    const oldestTimestamp = readReplayEventTimestamp(state.replayRingBuffer[0])
    if (oldestTimestamp >= minTimestamp) {
      break
    }
    state.replayRingBuffer.shift()
  }
}

function isReplayCaptureActive(eventTimestamp: number): boolean {
  return state.replayCaptureUntil > 0 && eventTimestamp <= state.replayCaptureUntil
}

function resolveReplayFlushDelay(): number {
  const options = state.options?.sessionReplay
  if (!options) return 0
  if (options.mode !== "error-linked" || state.replayCaptureUntil <= 0) {
    return options.flushInterval
  }

  return Math.max(0, state.replayCaptureUntil - now())
}

function shouldTriggerReplayForEvent(event: MonitorEvent): boolean {
  const options = state.options?.sessionReplay
  if (!options) return false
  if (!options.errorLinked.triggerOn.includes(event.type)) return false
  if (
    options.errorLinked.pageMatcher.length > 0 &&
    !matchesIgnoreRule(event.url, options.errorLinked.pageMatcher)
  ) {
    return false
  }

  switch (event.type) {
    case "request_error":
      return shouldTriggerReplayForRequestError(
        event,
        options.errorLinked.requestError
      )
    case "console_error":
      return shouldTriggerReplayForConsoleError(
        event,
        options.errorLinked.consoleError
      )
    case "resource_error":
      return shouldTriggerReplayForResourceError(
        event,
        options.errorLinked.resourceError
      )
    default:
      return true
  }
}

function shouldTriggerReplayForRequestError(
  event: RequestEventPayload,
  requestErrorOptions: NonNullable<
    NonNullable<
      NonNullable<typeof state.options>["sessionReplay"]["errorLinked"]
    >["requestError"]
  >
): boolean {
  const errorMessage = event.errorMessage?.toLowerCase() ?? ""

  if (errorMessage.includes("timeout")) {
    return requestErrorOptions.includeTimeouts
  }

  if (errorMessage.includes("abort")) {
    return requestErrorOptions.includeAborts
  }

  if (typeof event.status === "number") {
    if (requestErrorOptions.statusCodes.includes(event.status)) {
      return true
    }

    if (
      event.status >= 400 &&
      event.status < 500 &&
      requestErrorOptions.statusRanges.includes("4xx")
    ) {
      return true
    }

    if (
      event.status >= 500 &&
      event.status < 600 &&
      requestErrorOptions.statusRanges.includes("5xx")
    ) {
      return true
    }

    if (event.status === 0) {
      return requestErrorOptions.includeNetworkErrors
    }
  }

  if (event.status == null) {
    return requestErrorOptions.includeNetworkErrors
  }

  return false
}

function shouldTriggerReplayForConsoleError(
  event: ConsoleErrorEventPayload,
  consoleErrorOptions: NonNullable<
    NonNullable<
      NonNullable<typeof state.options>["sessionReplay"]["errorLinked"]
    >["consoleError"]
  >
): boolean {
  const message = event.args.join(" | ")

  if (
    consoleErrorOptions.excludePatterns.length > 0 &&
    matchesIgnoreRule(message, consoleErrorOptions.excludePatterns)
  ) {
    return false
  }

  if (consoleErrorOptions.includePatterns.length === 0) {
    return true
  }

  return matchesIgnoreRule(message, consoleErrorOptions.includePatterns)
}

function shouldTriggerReplayForResourceError(
  event: ResourceErrorEventPayload,
  resourceErrorOptions: NonNullable<
    NonNullable<
      NonNullable<typeof state.options>["sessionReplay"]["errorLinked"]
    >["resourceError"]
  >
): boolean {
  if (
    resourceErrorOptions.resourceTypes.length > 0 &&
    !resourceErrorOptions.resourceTypes.includes(event.resourceType)
  ) {
    return false
  }

  if (resourceErrorOptions.urlPatterns.length === 0) {
    return true
  }

  return matchesIgnoreRule(
    event.resourceUrl ?? event.message,
    resourceErrorOptions.urlPatterns
  )
}
