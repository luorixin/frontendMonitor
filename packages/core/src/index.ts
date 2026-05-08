import {
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve
} from "./capture/exposure"
import { ClickIntegration } from "./integrations/click"
import { ConsoleErrorIntegration } from "./integrations/console-error"
import { FetchIntegration } from "./integrations/fetch"
import { JSErrorIntegration } from "./integrations/js-error"
import { NavigationIntegration } from "./integrations/navigation"
import { NetworkStatusIntegration } from "./integrations/network-status"
import { PageExitIntegration } from "./integrations/page-exit"
import { PerformanceIntegration } from "./integrations/performance"
import { SessionReplayIntegration } from "./integrations/session-replay"
import { XHRIntegration } from "./integrations/xhr"
import {
  addIntegration,
  addBreadcrumb,
  afterSend,
  beforePushEvent,
  beforeSend,
  captureError,
  clearContext,
  flush,
  flushSessionReplay,
  getReplayId,
  getOptions,
  sendLocal,
  setContext,
  setDist,
  setEnvironment,
  setRelease,
  setTag,
  setUser,
  stopReplay,
  track
} from "./api/manual"
import { resolveIntegrations } from "./api/default-integrations"
import { destroyMonitor, initializeMonitor } from "./core/runtime"
import type { MonitorOptions } from "./core/types"

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
} from "./core/types"

export function init(options: MonitorOptions): void {
  initializeMonitor(options, resolveIntegrations(options))
}

export function destroy(): void {
  destroyMonitor()
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
  addBreadcrumb,
  afterSend,
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
