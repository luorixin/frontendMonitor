import {
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve
} from "./capture/exposure"
import { dedupeIntegrations } from "./api/integration-registry"
import {
  addIntegration,
  addBreadcrumb,
  addReplayEvent,
  afterSend,
  beforePushEvent,
  beforeSend,
  captureError,
  clearContext,
  flush,
  flushSessionReplay,
  getDiagnostics,
  getOptions,
  getReplayId,
  getTraceContext,
  sendLocal,
  setContext,
  setDist,
  setEnvironment,
  setRelease,
  setTag,
  setUser,
  pauseReplay,
  resumeReplay,
  startSpan,
  startReplay,
  startTransaction,
  stopReplay,
  track,
  withSpan
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
  CauseInfo,
  ClickEventPayload,
  ConsoleErrorEventPayload,
  CustomEventPayload,
  DiagnosticsSnapshot,
  ErrorMechanism,
  ErrorEventPayload,
  ExceptionInfo,
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
  RequestBodyOptions,
  RequestPerformanceEventPayload,
  ResolvedMonitorOptions,
  ResourceErrorEventPayload,
  RouteChangeEventPayload,
  SessionReplayOptions,
  StackFrame,
  TraceOptions,
  TraceSamplingContext,
  TraceSpan,
  TraceSpanOptions,
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
  addReplayEvent,
  afterSend,
  beforePushEvent,
  beforeSend,
  captureError,
  clearContext,
  flush,
  flushSessionReplay,
  getDiagnostics,
  getOptions,
  getReplayId,
  getTraceContext,
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
  pauseReplay,
  resumeReplay,
  startSpan,
  startReplay,
  startTransaction,
  stopReplay,
  track,
  withSpan
}
