export type BeforeSendHandler = (
  payload: MonitorPayload
) => MonitorPayload | false

export type CaptureOptions = {
  jsError?: boolean
  promiseRejection?: boolean
  fetchError?: boolean
  pageView?: boolean
  routeChange?: boolean
  click?: boolean
}

export type MonitorOptions = {
  dsn: string
  appName: string
  appVersion?: string
  userId?: string
  sampleRate?: number
  batchSize?: number
  flushInterval?: number
  debug?: boolean
  ignoreUrls?: Array<string | RegExp>
  capture?: CaptureOptions
  beforeSend?: BeforeSendHandler
}

export type ResolvedMonitorOptions = {
  dsn: string
  appName: string
  appVersion?: string
  userId?: string
  sampleRate: number
  batchSize: number
  flushInterval: number
  debug: boolean
  ignoreUrls: Array<string | RegExp>
  capture: Required<CaptureOptions>
  beforeSend?: BeforeSendHandler
}

export type BasePayload = {
  appName: string
  appVersion?: string
  userId?: string
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
  timestamp: number
}

export type BaseEvent = {
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
  params?: Record<string, unknown>
}

export type RequestEventPayload = BaseEvent & {
  type: "request_error"
  method: string
  status?: number
  duration: number
  errorMessage?: string
}

export type PageViewEventPayload = BaseEvent & {
  type: "page_view"
  from: string | null
  to: string
  trigger: "load"
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

export type MonitorEvent =
  | CustomEventPayload
  | ErrorEventPayload
  | RequestEventPayload
  | PageViewEventPayload
  | RouteChangeEventPayload
  | ClickEventPayload

export type MonitorPayload = {
  base: BasePayload
  events: MonitorEvent[]
}

export type TransportResult = {
  success: boolean
  transport: "beacon" | "fetch"
  status?: number
}
