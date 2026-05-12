import { state } from "./context"
import type { TraceSamplingContext, TraceSpan, TraceSpanOptions } from "./types"
import { matchesIgnoreRule, now } from "../utils"

export function initTraceContext(): void {
  const options = state.options?.trace
  if (!state.options || !options?.enabled || !isTraceSampled({
    appName: state.options.appName,
    route: state.currentRoute,
    url: window.location.href
  })) {
    state.traceId = null
    state.spanId = null
    state.activeSpanId = null
    return
  }

  state.traceId = randomHex(32)
  state.spanId = randomHex(16)
  state.activeSpanId = state.spanId
}

export function getTraceparent(requestUrl?: string, spanId?: string): string | null {
  if (
    !state.options?.trace.enabled ||
    !state.options.trace.propagateTraceparent ||
    !state.traceId ||
    !(spanId ?? state.activeSpanId ?? state.spanId)
  ) {
    return null
  }

  if (requestUrl && !shouldPropagateTraceparent(requestUrl)) {
    return null
  }

  return `00-${state.traceId}-${spanId ?? state.activeSpanId ?? state.spanId}-01`
}

export function getTraceContext(): { traceId: string; spanId: string | null } | null {
  if (!state.traceId) return null
  return {
    spanId: state.activeSpanId ?? state.spanId,
    traceId: state.traceId
  }
}

export function startTransaction(
  name: string,
  options: TraceSpanOptions = {}
): TraceSpan {
  if (!state.traceId) {
    state.traceId = randomHex(32)
  }

  const span = createSpan(name, {
    ...options,
    parentSpanId: options.parentSpanId
  })
  state.spanId = span.spanId
  state.activeSpanId = span.spanId
  return span
}

export function startSpan(name: string, options: TraceSpanOptions = {}): TraceSpan {
  const parentSpanId = options.parentSpanId ?? state.activeSpanId ?? state.spanId ?? undefined
  const span = createSpan(name, {
    ...options,
    parentSpanId
  })
  state.activeSpanId = span.spanId
  return span
}

export function createRequestSpan(
  name: string,
  options: TraceSpanOptions = {}
): TraceSpan | null {
  if (!state.traceId) return null
  return createSpan(name, {
    ...options,
    parentSpanId: options.parentSpanId ?? state.activeSpanId ?? state.spanId ?? undefined
  })
}

export async function withSpan<T>(
  span: TraceSpan,
  callback: () => T | Promise<T>
): Promise<T> {
  const previousSpanId = state.activeSpanId
  state.activeSpanId = span.spanId
  try {
    return await callback()
  } finally {
    state.activeSpanId = previousSpanId
  }
}

function createSpan(name: string, options: TraceSpanOptions): TraceSpan {
  if (!state.traceId) {
    state.traceId = randomHex(32)
  }

  const span: TraceSpan = {
    data: options.data,
    finish() {
      span.endTime = now()
      if (state.activeSpanId === span.spanId) {
        state.activeSpanId = span.parentSpanId ?? state.spanId
      }
    },
    name,
    op: options.op,
    parentSpanId: options.parentSpanId,
    spanId: randomHex(16),
    startChild(childName, childOptions = {}) {
      return createSpan(childName, {
        ...childOptions,
        parentSpanId: span.spanId
      })
    },
    startTime: now(),
    traceId: state.traceId
  }
  return span
}

function isTraceSampled(context: TraceSamplingContext): boolean {
  const options = state.options?.trace
  if (!options) return false
  const samplerResult = options.tracesSampler?.(context)
  if (typeof samplerResult === "boolean") return samplerResult
  if (typeof samplerResult === "number") {
    const sampleRate = Math.min(1, Math.max(0, samplerResult))
    return sampleRate > 0 && Math.random() <= sampleRate
  }

  return options.sampleRate > 0 && Math.random() <= options.sampleRate
}

function shouldPropagateTraceparent(requestUrl: string): boolean {
  if (isSameOrigin(requestUrl)) return true
  return matchesIgnoreRule(requestUrl, state.options?.trace.propagationTargets ?? [])
}

function isSameOrigin(requestUrl: string): boolean {
  try {
    return new URL(requestUrl, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2))

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length)
}
