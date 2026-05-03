import { getCurrentRoute } from "./base"
import { normalizeOptions } from "./config"
import { initClickCapture } from "./capture/click"
import { initConsoleErrorCapture } from "./capture/console-error"
import { initErrorCapture } from "./capture/error"
import {
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
  restoreExposureCapture
} from "./capture/exposure"
import { initFetchCapture, restoreFetchCapture } from "./capture/fetch"
import { initDeviceId, resolveSessionId } from "./capture/identity"
import { initNetworkStatusCapture } from "./capture/network-status"
import { initPageExitCapture } from "./capture/page-exit"
import { initPerformanceCapture } from "./capture/performance"
import { initXHRCapture, restoreXHRCapture } from "./capture/xhr"
import {
  initNavigationCapture,
  restoreNavigationCapture
} from "./capture/navigation"
import { clearCleanups, resetState, state } from "./context"
import {
	  afterSend,
	  addBreadcrumb,
	  beforePushEvent,
	  beforeSend,
	  captureError,
	  clearContext,
  flush,
  getOptions,
  seedInitHooks,
	  sendLocal,
	  setContext,
	  setEnvironment,
	  setRelease,
	  setTag,
	  setUser,
  track
} from "./manual"
import { clearQueue } from "./queue"
import { uuid } from "./utils"
import type { MonitorOptions } from "./types"

export type {
	  AfterSendHandler,
	  BasePayload,
	  Breadcrumb,
  BeforePushEventHandler,
  BeforeSendHandler,
  CaptureOptions,
  ClickEventPayload,
  ConsoleErrorEventPayload,
  CustomEventPayload,
  ErrorEventPayload,
  ExposureEventPayload,
  ExposureObserverOptions,
  LocalizationOverflowHandler,
  MonitorEvent,
  MonitorOptions,
  MonitorPayload,
  NetworkStatus,
  PageViewEventPayload,
  PerformanceEventPayload,
  RequestEventPayload,
  RequestPerformanceEventPayload,
  ResolvedMonitorOptions,
  ResourceErrorEventPayload,
  RouteChangeEventPayload,
  TransportResult
} from "./types"

export function init(options: MonitorOptions): void {
  if (state.initialized) return
  if (typeof window === "undefined" || typeof document === "undefined") return

  state.options = normalizeOptions(options)
  state.deviceId = initDeviceId()
  state.sessionId = resolveSessionId()
  state.pageId = uuid()
  state.pageStartTime = Date.now()
  state.currentRoute = getCurrentRoute()
  state.initialized = true

  seedInitHooks(options)

  for (const cleanup of initConsoleErrorCapture()) {
    state.cleanups.push(cleanup)
  }

  for (const cleanup of initErrorCapture()) {
    state.cleanups.push(cleanup)
  }

  initFetchCapture()
  initXHRCapture()
  initNavigationCapture()
  initPageExitCapture()
  initNetworkStatusCapture()
  if (state.options.capture.performance) {
    initPerformanceCapture()
  }
  initClickCapture()
}

export function destroy(): void {
  clearQueue()
  clearCleanups()
  restoreExposureCapture()
  restoreFetchCapture()
  restoreXHRCapture()
  restoreNavigationCapture()
  resetState()
}

export {
	  afterSend,
	  addBreadcrumb,
	  beforePushEvent,
	  beforeSend,
	  captureError,
	  clearContext,
  flush,
  getOptions,
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
	  sendLocal,
	  setContext,
	  setEnvironment,
	  setRelease,
	  setTag,
	  setUser,
  track
}
