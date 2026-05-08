import {
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve
} from "./capture/exposure"
import { dedupeIntegrations } from "./api/integration-registry"
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
  getOptions,
  getReplayId,
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
  initializeMonitor(options, dedupeIntegrations(options.integrations ?? []))
}

export function destroy(): void {
  destroyMonitor()
}

export {
  addIntegration,
  addBreadcrumb,
  afterSend,
  beforePushEvent,
  beforeSend,
  captureError,
  clearContext,
  flush,
  flushSessionReplay,
  getOptions,
  getReplayId,
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
