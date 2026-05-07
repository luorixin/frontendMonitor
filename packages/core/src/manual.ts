import { state } from "./context"
import { recordBreadcrumb } from "./breadcrumb"
import {
  registerAfterSend,
  registerBeforePushEvent,
  registerBeforeSend
} from "./hooks"
import { sendLocal as sendLocalizedPayloads } from "./localization"
import { enqueueEvent, flushQueue } from "./queue"
import {
  flushReplayQueue,
  getReplayId as getActiveReplayId,
  stopSessionReplay
} from "./replay"
import type {
  AfterSendHandler,
  Breadcrumb,
  BeforePushEventHandler,
  BeforeSendHandler,
  MonitorOptions,
  ResolvedMonitorOptions
} from "./types"
import { createErrorEvent, enqueueScopedError } from "./capture/error"
import { now } from "./utils"

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

export function stopReplay(): void {
  stopSessionReplay()
}

export function sendLocal(): Promise<void> {
  return sendLocalizedPayloads()
}

export function getOptions(): Readonly<ResolvedMonitorOptions> | null {
  if (!state.options) return null

	  return {
	    ...state.options,
	    capture: { ...state.options.capture },
	    contexts: { ...state.options.contexts },
	    tags: { ...state.options.tags },
	    ignoreUrls: [...state.options.ignoreUrls]
	  }
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
