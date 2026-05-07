export type BeforeSendHandler = (
  payload: MonitorPayload
) => MonitorPayload | false

export type BeforePushEventHandler = (
  event: MonitorEvent
) => MonitorEvent | MonitorEvent[] | false

export type AfterSendHandler = (
  result: TransportResult,
  payload: MonitorPayload
) => void

export type LocalizationOverflowHandler = (error: Error) => void

export type NetworkStatus = "online" | "offline"

export type Breadcrumb = {
  category?: string
  data?: Record<string, unknown>
  level?: "debug" | "info" | "warning" | "error"
  message: string
  timestamp: number
  type?: "click" | "console" | "manual" | "navigation" | "request"
}

export type CaptureOptions = {
  jsError?: boolean
  promiseRejection?: boolean
  consoleError?: boolean
  resourceError?: boolean
  fetchError?: boolean
  xhrError?: boolean
  performance?: boolean
  requestPerformance?: boolean
  pageView?: boolean
  routeChange?: boolean
  click?: boolean
  exposure?: boolean
}

export type SessionReplayOptions = {
  enabled?: boolean
  endpoint?: string
  flushInterval?: number
  maxEvents?: number
  maxPayloadBytes?: number
  sampleRate?: number
  maskAllInputs?: boolean
}

export type MonitorOptions = {
  dsn: string
  appName: string
  appVersion?: string
  userId?: string
  dist?: string
  sampleRate?: number
  batchSize?: number
  flushInterval?: number
  maxQueueLength?: number
  timeout?: number
  debug?: boolean
  ignoreUrls?: Array<string | RegExp>
  capture?: CaptureOptions
  localization?: boolean
  localizationKey?: string
  localizationOverflow?: LocalizationOverflowHandler
  offlineRetry?: boolean
  offlineQueueKey?: string
  retryMaxAttempts?: number
  retryBaseDelay?: number
  maxPayloadBytes?: number
  maxOfflinePayloads?: number
  maxBreadcrumbs?: number
  environment?: string
  release?: string
  tags?: Record<string, string>
  contexts?: Record<string, unknown>
  sessionReplay?: boolean | SessionReplayOptions
  scopeError?: boolean
  beforeSend?: BeforeSendHandler
  beforePushEvent?: BeforePushEventHandler
  afterSend?: AfterSendHandler
}

export type ResolvedMonitorOptions = {
  dsn: string
  appName: string
  appVersion?: string
  userId?: string
  dist?: string
  sampleRate: number
  batchSize: number
  flushInterval: number
  maxQueueLength: number
  timeout: number
  debug: boolean
  ignoreUrls: Array<string | RegExp>
  capture: Required<CaptureOptions>
  localization: boolean
  localizationKey: string
  localizationOverflow?: LocalizationOverflowHandler
  offlineRetry: boolean
  offlineQueueKey: string
  retryMaxAttempts: number
  retryBaseDelay: number
  maxPayloadBytes: number
  maxOfflinePayloads: number
  maxBreadcrumbs: number
  environment?: string
  release?: string
  tags: Record<string, string>
  contexts: Record<string, unknown>
  sessionReplay: Required<SessionReplayOptions> & {
    enabled: boolean
  }
  scopeError: boolean
  beforeSend?: BeforeSendHandler
  beforePushEvent?: BeforePushEventHandler
  afterSend?: AfterSendHandler
}

export type BasePayload = {
  appName: string
  appVersion?: string
  deviceId: string
  userId?: string
  dist?: string
  sessionId: string
  pageId: string
  url: string
  title: string
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  sdkVersion: string
  environment?: string
  release?: string
  tags?: Record<string, string>
  contexts?: Record<string, unknown>
  breadcrumbs?: Breadcrumb[]
  replayId?: string
  traceId?: string
  spanId?: string
  timestamp: number
}

export type BaseEvent = {
  replayId?: string
  timestamp: number
  url: string
}

export type CustomEventPayload = BaseEvent & {
  type: "custom"
  eventName: string
  params?: Record<string, unknown>
}

export type ErrorEventPayload = BaseEvent & {
  type: "js_error" | "promise_rejection"
  message: string
  stack?: string
  source?: string
  scopeCount?: number
  params?: Record<string, unknown>
}

export type RequestEventPayload = BaseEvent & {
  type: "request_error"
  method: string
  status?: number
  duration: number
  errorMessage?: string
  transport: "fetch" | "xhr"
  url: string
}

export type RequestPerformanceEventPayload = BaseEvent & {
  type: "request_performance"
  method: string
  url: string
  status: number
  duration: number
  transport: "fetch" | "xhr"
}

export type ConsoleErrorEventPayload = BaseEvent & {
  type: "console_error"
  args: string[]
}

export type ResourceErrorEventPayload = BaseEvent & {
  type: "resource_error"
  message: string
  resourceType: string
  selector: string
}

export type PerformanceEventPayload =
  | BaseEvent & {
      type: "performance"
      performanceType: "navigation"
      navigationType?: string
      metrics: {
        dnsLookup: number
        tcpConnect: number
        ttfb: number
        response: number
        domInteractive: number
        domContentLoaded: number
        loadEvent: number
        redirect: number
        firstPaint?: number
        firstContentfulPaint?: number
      }
    }
  | BaseEvent & {
      type: "performance"
      performanceType: "resource"
      name: string
      resourceType: string
      duration: number
      startTime: number
      transferSize?: number
    }
  | BaseEvent & {
      type: "performance"
      performanceType: "request"
      method: string
      url: string
      status: number
      duration: number
      transport: "fetch" | "xhr"
    }
  | BaseEvent & {
      type: "performance"
      performanceType: "web_vital"
      metricName: "CLS" | "FCP" | "INP" | "LCP" | "TTFB"
      navigationType?: string
      routeFrom?: string
      routeTo?: string
      rating?: "good" | "needs-improvement" | "poor"
      softNavigation?: boolean
      value: number
    }

export type PageViewEventPayload = BaseEvent & {
  type: "page_view"
  from: string | null
  to: string
  trigger: "load"
}

export type PageDwellEventPayload = BaseEvent & {
  type: "page_dwell"
  pageId: string
  duration: number
}

export type RouteChangeEventPayload = BaseEvent & {
  type: "route_change"
  from: string
  to: string
  trigger: "hashchange" | "pushState" | "replaceState" | "popstate"
}

export type ClickEventPayload = BaseEvent & {
  type: "click"
  tagName: string
  textPreview: string
  selector: string
}

export type ExposureEventPayload = BaseEvent & {
  type: "exposure"
  action: "enter" | "leave"
  tagName: string
  textPreview: string
  selector: string
  ratio: number
  threshold: number
  params?: Record<string, unknown>
}

export type ExposureObserverOptions = {
  target: Element
  threshold?: number
  params?: Record<string, unknown>
}

export type MonitorEvent =
  | CustomEventPayload
  | ErrorEventPayload
  | RequestEventPayload
  | RequestPerformanceEventPayload
  | ConsoleErrorEventPayload
  | ResourceErrorEventPayload
  | PerformanceEventPayload
  | PageDwellEventPayload
  | PageViewEventPayload
  | RouteChangeEventPayload
  | ClickEventPayload
  | ExposureEventPayload

export type MonitorPayload = {
  base: BasePayload
  events: MonitorEvent[]
}

export type ReplayChunkPayload = {
  appName: string
  appVersion?: string
  deviceId: string
  userId?: string
  sessionId: string
  pageId: string
  url: string
  title: string
  userAgent: string
  sdkVersion: string
  environment?: string
  release?: string
  replayId: string
  sequence: number
  startedAt: number
  endedAt: number
  events: unknown[]
}

export type TransportResult = {
  success: boolean
  transport: "beacon" | "image" | "xhr"
  status?: number
  reason?: "beacon_failed" | "image_failed" | "xhr_failed" | "network_error" | "payload_too_large" | "unknown"
}

export type SendPayloadOptions = {
  maxPayloadBytes?: number
  preferBeacon?: boolean
  timeout?: number
}
