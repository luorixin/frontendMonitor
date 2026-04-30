import { getCurrentRoute } from "./base"
import { normalizeOptions } from "./config"
import { initClickCapture } from "./capture/click"
import { initErrorCapture } from "./capture/error"
import { initFetchCapture, restoreFetchCapture } from "./capture/fetch"
import {
  initNavigationCapture,
  restoreNavigationCapture
} from "./capture/navigation"
import { clearCleanups, resetState, state } from "./context"
import {
  beforeSend,
  captureError,
  flush,
  getOptions,
  seedInitHooks,
  setUser,
  track
} from "./manual"
import { clearQueue } from "./queue"
import { uuid } from "./utils"
import type { MonitorOptions } from "./types"

export type {
  BasePayload,
  BeforeSendHandler,
  CaptureOptions,
  ClickEventPayload,
  CustomEventPayload,
  ErrorEventPayload,
  MonitorEvent,
  MonitorOptions,
  MonitorPayload,
  PageViewEventPayload,
  RequestEventPayload,
  ResolvedMonitorOptions,
  RouteChangeEventPayload
} from "./types"

export function init(options: MonitorOptions): void {
  if (state.initialized) return
  if (typeof window === "undefined" || typeof document === "undefined") return

  state.options = normalizeOptions(options)
  state.sessionId = uuid()
  state.pageId = uuid()
  state.currentRoute = getCurrentRoute()
  state.initialized = true

  seedInitHooks(options)

  for (const cleanup of initErrorCapture()) {
    state.cleanups.push(cleanup)
  }

  initFetchCapture()
  initNavigationCapture()
  initClickCapture()
}

export function destroy(): void {
  clearQueue()
  clearCleanups()
  restoreFetchCapture()
  restoreNavigationCapture()
  resetState()
}

export { beforeSend, captureError, flush, getOptions, setUser, track }
