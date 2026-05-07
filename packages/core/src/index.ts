import { getCurrentRoute } from "./base"
import { normalizeOptions } from "./config"
import {
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
  restoreExposureCapture
} from "./capture/exposure"
import { initDeviceId, resolveSessionId } from "./capture/identity"
import { clearCleanups, resetState, state } from "./context"
import {
  ClickIntegration,
  ConsoleErrorIntegration,
  FetchIntegration,
  JSErrorIntegration,
  NavigationIntegration,
  NetworkStatusIntegration,
  PageExitIntegration,
  PerformanceIntegration,
  registerIntegration,
  resolveIntegrations,
  SessionReplayIntegration,
  XHRIntegration
} from "./integrations"
import {
  addIntegration,
	  afterSend,
	  addBreadcrumb,
	  beforePushEvent,
	  beforeSend,
	  captureError,
	  clearContext,
  flush,
  flushSessionReplay,
  getReplayId,
  getOptions,
  seedInitHooks,
	  sendLocal,
	  setContext,
	  setDist,
	  setEnvironment,
	  setRelease,
	  setTag,
	  setUser,
  stopReplay,
  track
} from "./manual"
import { clearQueue } from "./queue"
import { initTraceContext } from "./trace"
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
  MonitorIntegration,
  MonitorIntegrationContext,
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
  SessionReplayOptions,
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
  initTraceContext()

  seedInitHooks(options)
  state.options.integrations = resolveIntegrations(options)
  for (const integration of state.options.integrations) {
    registerIntegration(integration)
  }
}

export function destroy(): void {
  clearQueue()
  clearCleanups()
  restoreExposureCapture()
  resetState()
}

export {
  ClickIntegration,
  ConsoleErrorIntegration,
  FetchIntegration,
  JSErrorIntegration,
  NavigationIntegration,
  NetworkStatusIntegration,
  PageExitIntegration,
  PerformanceIntegration,
  SessionReplayIntegration,
  XHRIntegration,
  addIntegration,
	  afterSend,
	  addBreadcrumb,
	  beforePushEvent,
	  beforeSend,
	  captureError,
	  clearContext,
  flush,
  flushSessionReplay,
  getReplayId,
  getOptions,
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
	  sendLocal,
	  setContext,
	  setDist,
	  setEnvironment,
	  setRelease,
	  setTag,
	  setUser,
  stopReplay,
  track
}
