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

export type SanitizeOptions = {
  enabled?: boolean
  redactValue?: string
  sensitiveKeys?: string[]
  textPatterns?: RegExp[]
}

export type TraceOptions = {
  enabled?: boolean
  propagateTraceparent?: boolean
  propagationTargets?: Array<string | RegExp>
  sampleRate?: number
  tracesSampler?: (context: TraceSamplingContext) => number | boolean
}

export type TraceSamplingContext = {
  appName: string
  route: string
  url: string
}

export type TraceSpanOptions = {
  data?: Record<string, unknown>
  op?: string
  parentSpanId?: string
}

export type TraceSpan = {
  data?: Record<string, unknown>
  endTime?: number
  finish: () => void
  name: string
  op?: string
  parentSpanId?: string
  spanId: string
  startChild: (name: string, options?: Omit<TraceSpanOptions, "parentSpanId">) => TraceSpan
  startTime: number
  traceId: string
}

export type RequestBodyOptions = {
  allowUrls?: Array<string | RegExp>
  captureHeaders?: boolean
  contentTypes?: string[]
  denyUrls?: Array<string | RegExp>
  enabled?: boolean
  maxBytes?: number
}

export type StackFrame = {
  colno?: number
  filename?: string
  function?: string
  lineno?: number
}

export type ExceptionInfo = {
  stacktrace?: {
    frames: StackFrame[]
  }
  type: string
  value: string
}

export type ErrorMechanism = {
  handled: boolean
  type: "manual" | "onerror" | "unhandledrejection"
}

export type CauseInfo = {
  message: string
  stack?: string
  type: string
}

export type DiagnosticsSnapshot = {
  droppedByPayloadSize: number
  droppedByQueueOverflow: number
  droppedBySampling: number
  offlineQueued: number
  retryExhausted: number
  retrySucceeded: number
}

export type CompressionAlgorithm = "gzip"

export type CompressionOptions = {
  algorithm?: CompressionAlgorithm
  eventPayloads?: boolean
  sessionReplay?: boolean
}

export type TransportOptions = {
  send?: (
    dsn: string,
    payload: MonitorPayload,
    options: SendPayloadOptions
  ) => Promise<TransportResult> | TransportResult
}

export type MonitorIntegrationCleanup = () => void

export type MonitorIntegrationContext = {
  addCleanup: (cleanup: MonitorIntegrationCleanup) => void
  emit: (event: MonitorEvent, flush?: boolean) => void
  options: Readonly<ResolvedMonitorOptions>
}

export type MonitorIntegration = {
  name: string
  setup: (
    context: MonitorIntegrationContext
  ) =>
    | void
    | MonitorIntegrationCleanup
    | MonitorIntegrationCleanup[]
}

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
  mode?: "full" | "error-linked"
  sample?: {
    fullSessionRate?: number
    errorSessionRate?: number
  }
  errorLinked?: {
    preTriggerMs?: number
    postTriggerMs?: number
    maxTriggersPerSession?: number
    pageMatcher?: Array<string | RegExp>
    triggerOn?: MonitorEvent["type"][]
    consoleError?: {
      includePatterns?: Array<string | RegExp>
      excludePatterns?: Array<string | RegExp>
    }
    requestError?: {
      statusCodes?: number[]
      statusRanges?: Array<"4xx" | "5xx">
      includeAborts?: boolean
      includeNetworkErrors?: boolean
      includeTimeouts?: boolean
    }
    resourceError?: {
      resourceTypes?: string[]
      urlPatterns?: Array<string | RegExp>
    }
  }
  privacy?: {
    maskAllInputs?: boolean
    blockClass?: string
    blockSelector?: string
    ignoreClass?: string
    ignoreSelector?: string
    maskInputOptions?: Record<string, boolean>
    maskTextClass?: string
    maskTextSelector?: string
    slimDOMOptions?: Record<string, boolean>
  }
  canvas?: {
    enabled?: boolean
    recordCanvas?: boolean
    samplingInterval?: number
  }
  sampleRate?: number
  maskAllInputs?: boolean
}

export type MonitorOptions = {
  dsn: string
  appName: string
  appVersion?: string
  userId?: string
  dist?: string
  debugId?: string
  sampleRate?: number
  batchSize?: number
  flushInterval?: number
  maxQueueLength?: number
  timeout?: number
  debug?: boolean
  ignoreUrls?: Array<string | RegExp>
  allowUrls?: Array<string | RegExp>
  denyUrls?: Array<string | RegExp>
  ignoreErrors?: Array<string | RegExp>
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
  sanitize?: SanitizeOptions
  scopeError?: boolean
  trace?: TraceOptions
  requestBody?: RequestBodyOptions
  compression?: boolean | CompressionOptions
  transport?: TransportOptions
  integrations?: MonitorIntegration[]
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
  debugId?: string
  sampleRate: number
  batchSize: number
  flushInterval: number
  maxQueueLength: number
  timeout: number
  debug: boolean
  ignoreUrls: Array<string | RegExp>
  allowUrls: Array<string | RegExp>
  denyUrls: Array<string | RegExp>
  ignoreErrors: Array<string | RegExp>
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
    canvas: {
      enabled: boolean
      recordCanvas: boolean
      samplingInterval: number
    }
    errorLinked: {
      consoleError: {
        excludePatterns: Array<string | RegExp>
        includePatterns: Array<string | RegExp>
      }
      maxTriggersPerSession: number
      pageMatcher: Array<string | RegExp>
      postTriggerMs: number
      preTriggerMs: number
      requestError: {
        includeAborts: boolean
        includeNetworkErrors: boolean
        includeTimeouts: boolean
        statusCodes: number[]
        statusRanges: Array<"4xx" | "5xx">
      }
      resourceError: {
        resourceTypes: string[]
        urlPatterns: Array<string | RegExp>
      }
      triggerOn: MonitorEvent["type"][]
    }
    mode: "full" | "error-linked"
	    privacy: {
	      blockClass: string
	      blockSelector: string
	      ignoreClass: string
	      ignoreSelector: string
	      maskAllInputs: boolean
	      maskInputOptions: Record<string, boolean>
	      maskTextClass: string
	      maskTextSelector: string
	      slimDOMOptions: Record<string, boolean>
	    }
    sample: {
      errorSessionRate: number
      fullSessionRate: number
    }
  }
  sanitize: Required<SanitizeOptions>
  scopeError: boolean
  trace: Required<Omit<TraceOptions, "tracesSampler">> & {
    tracesSampler?: TraceOptions["tracesSampler"]
  }
  requestBody: Required<RequestBodyOptions>
  compression: Required<CompressionOptions>
  transport?: TransportOptions
  integrations: MonitorIntegration[]
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
  debugId?: string
  sessionId: string
  pageId: string
  url: string
  title: string
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  schemaVersion?: string
  sdk?: {
    name: string
    version: string
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
  parentSpanId?: string
  timestamp: number
}

export type BaseEvent = {
  eventId?: string
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
  causeChain?: CauseInfo[]
  componentStack?: string
  debugId?: string
  dist?: string
  exception?: ExceptionInfo
  fingerprint?: string
  frames?: StackFrame[]
  mechanism?: ErrorMechanism
  message: string
  release?: string
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
  requestHeaders?: Record<string, string>
  requestBody?: unknown
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
  resourceUrl?: string
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
  compressionAlgorithm?: CompressionAlgorithm
  compression?: boolean
  maxPayloadBytes?: number
  preferBeacon?: boolean
  timeout?: number
  transport?: TransportOptions
}
