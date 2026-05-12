import { state } from "../core/context"
import { recordBreadcrumb } from "../pipeline/breadcrumb"
import { registerIntegration } from "./integration-registry"
import {
  registerAfterSend,
  registerBeforePushEvent,
  registerBeforeSend
} from "../core/hooks"
import { sendLocal as sendLocalizedPayloads } from "../storage/localization"
import { enqueueEvent, flushQueue } from "../pipeline/queue"
import {
  addReplayEvent as addReplayTimelineEvent,
  flushReplayQueue,
  getReplayId as getActiveReplayId,
  pauseSessionReplay,
  resumeSessionReplay,
  startSessionReplay,
  stopSessionReplay
} from "../pipeline/replay"
import {
  getTraceContext as getActiveTraceContext,
  startSpan as startTraceSpan,
  startTransaction as startTraceTransaction,
  withSpan as runWithTraceSpan
} from "../core/trace"
import type {
  AfterSendHandler,
  Breadcrumb,
  BeforePushEventHandler,
  BeforeSendHandler,
  MonitorIntegration,
  MonitorOptions,
  ResolvedMonitorOptions,
  TraceSpan,
  TraceSpanOptions
} from "../core/types"
import { createErrorEvent, enqueueScopedError } from "../capture/error"
import { now } from "../utils"

export function track(
  eventName: string,
  params?: Record<string, unknown>,
  flush = false
): void {
  if (!state.initialized) return

  enqueueEvent(
    {
      eventName,
      params,
      timestamp: now(),
      type: "custom",
      url: window.location.href
    },
    flush
  )
}

export function captureError(
  error: unknown,
  params?: Record<string, unknown>,
  flush = false
): void {
  if (!state.initialized) return

  enqueueScopedError(createErrorEvent("js_error", error, { params }), flush)
}

export function setUser(userId: string): void {
  if (!state.options) return
  state.options.userId = userId
}

export function setRelease(release: string): void {
  if (!state.options) return
  state.options.release = release
}

export function setDist(dist: string): void {
  if (!state.options) return
  state.options.dist = dist
}

export function setEnvironment(environment: string): void {
  if (!state.options) return
  state.options.environment = environment
}

export function setTag(key: string, value: string): void {
  if (!key) return
  state.tags[key] = value
}

export function setContext(key: string, value: unknown): void {
  if (!key) return
  state.contexts[key] = value
}

export function clearContext(): void {
  state.tags = {}
  state.contexts = {}
}

export function addBreadcrumb(
  breadcrumb: Omit<Breadcrumb, "timestamp"> & { timestamp?: number }
): void {
  recordBreadcrumb(breadcrumb)
}

export function beforeSend(handler: BeforeSendHandler): void {
  registerBeforeSend(handler)
}

export function beforePushEvent(handler: BeforePushEventHandler): void {
  registerBeforePushEvent(handler)
}

export function afterSend(handler: AfterSendHandler): void {
  registerAfterSend(handler)
}

export function flush(): Promise<void> {
  return flushQueue()
}

export function flushSessionReplay(): Promise<void> {
  return flushReplayQueue()
}

export function getReplayId(): string | null {
  return getActiveReplayId()
}

export async function stopReplay(options?: { flush?: boolean }): Promise<void> {
  if (options?.flush) {
    await flushReplayQueue()
  }
  stopSessionReplay()
}

export function startReplay(): void {
  startSessionReplay()
}

export function pauseReplay(): void {
  pauseSessionReplay()
}

export function resumeReplay(): void {
  resumeSessionReplay()
}

export function addReplayEvent(
  tag: string,
  payload?: Record<string, unknown>
): void {
  addReplayTimelineEvent(tag, payload)
}

export function sendLocal(): Promise<void> {
  return sendLocalizedPayloads()
}

export function addIntegration(integration: MonitorIntegration): void {
  registerIntegration(integration)
}

export function getOptions(): Readonly<ResolvedMonitorOptions> | null {
  if (!state.options) return null

	  return {
	    ...state.options,
	    capture: { ...state.options.capture },
	    contexts: { ...state.options.contexts },
	    tags: { ...state.options.tags },
	    ignoreUrls: [...state.options.ignoreUrls],
      integrations: [...state.options.integrations]
	  }
}

export function getDiagnostics() {
  return { ...state.diagnostics }
}

export function getTraceContext(): { traceId: string; spanId: string | null } | null {
  return getActiveTraceContext()
}

export function startTransaction(
  name: string,
  options?: TraceSpanOptions
): TraceSpan {
  return startTraceTransaction(name, options)
}

export function startSpan(name: string, options?: TraceSpanOptions): TraceSpan {
  return startTraceSpan(name, options)
}

export function withSpan<T>(
  span: TraceSpan,
  callback: () => T | Promise<T>
): Promise<T> {
  return runWithTraceSpan(span, callback)
}

export function seedInitHooks(options: MonitorOptions): void {
  if (options.beforeSend) {
    registerBeforeSend(options.beforeSend)
  }
  if (options.beforePushEvent) {
    registerBeforePushEvent(options.beforePushEvent)
  }
	  if (options.afterSend) {
	    registerAfterSend(options.afterSend)
	  }
	  state.tags = { ...(state.options?.tags ?? {}) }
	  state.contexts = { ...(state.options?.contexts ?? {}) }
	}
