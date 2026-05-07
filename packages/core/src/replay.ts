import { encodeJSONRequestBody } from "./compression"
import { record } from "rrweb"
import { SDK_VERSION } from "./config"
import { addCleanup, clearTimer, state } from "./context"
import type { ReplayChunkPayload, TransportResult } from "./types"
import { now, safeStringify, uuid } from "./utils"

const REPLAY_BEACON_LIMIT = 128 * 1024

export function initSessionReplay(): void {
  const options = state.options?.sessionReplay

  if (!state.options || !options?.enabled) return
  if (options.sampleRate <= 0 || Math.random() > options.sampleRate) return
  if (state.replayStop) return

  state.replayId = uuid()
  state.replayQueue = []
  state.replaySequence = 0
  state.replayStartedAt = 0

  const stopHandler = record({
    emit(event) {
      enqueueReplayEvent(event)
    },
    maskAllInputs: options.maskAllInputs
  })
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
}

export function scheduleReplayFlush(): void {
  if (!state.options?.sessionReplay.enabled) return
  state.replayFlushTimer = clearTimer(state.replayFlushTimer)
  state.replayFlushTimer = setTimeout(() => {
    void flushReplayQueue()
  }, state.options.sessionReplay.flushInterval)
}

export function enqueueReplayEvent(event: unknown): void {
  if (!state.options?.sessionReplay.enabled || !state.replayId) return

  const eventTimestamp = readReplayEventTimestamp(event)
  if (state.replayStartedAt === 0) {
    state.replayStartedAt = eventTimestamp
  }

  state.replayQueue.push(event)

  if (state.replayQueue.length >= state.options.sessionReplay.maxEvents) {
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
