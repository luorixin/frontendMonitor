import { state } from "./context"
import { registerBeforeSend } from "./hooks"
import { enqueueEvent, flushQueue } from "./queue"
import type { BeforeSendHandler, MonitorOptions, ResolvedMonitorOptions } from "./types"
import { createErrorEvent } from "./capture/error"
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

  enqueueEvent(createErrorEvent("js_error", error, { params }), flush)
}

export function setUser(userId: string): void {
  if (!state.options) return
  state.options.userId = userId
}

export function beforeSend(handler: BeforeSendHandler): void {
  registerBeforeSend(handler)
}

export function flush(): Promise<void> {
  return flushQueue()
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
}
