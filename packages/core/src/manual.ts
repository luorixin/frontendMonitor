import { state } from "./context"
import {
  registerAfterSend,
  registerBeforePushEvent,
  registerBeforeSend
} from "./hooks"
import { sendLocal as sendLocalizedPayloads } from "./localization"
import { enqueueEvent, flushQueue } from "./queue"
import type {
  AfterSendHandler,
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

export function sendLocal(): Promise<void> {
  return sendLocalizedPayloads()
}

export function getOptions(): Readonly<ResolvedMonitorOptions> | null {
  if (!state.options) return null

  return {
    ...state.options,
    capture: { ...state.options.capture },
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
}
