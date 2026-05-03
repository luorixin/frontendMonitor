import type {
  AfterSendHandler,
  Breadcrumb,
  BeforePushEventHandler,
  BeforeSendHandler,
  MonitorEvent,
  NetworkStatus,
  ResolvedMonitorOptions
} from "./types"

type CleanupFn = () => void

export type MonitorState = {
  cleanups: CleanupFn[]
  consoleErrorOriginal: typeof console.error | null
  currentRoute: string
  deviceId: string
  errorScope: Map<
    string,
    {
      count: number
      event: MonitorEvent | null
      lastSeenAt: number
    }
  >
  flushPromise: Promise<void> | null
  flushTimer: ReturnType<typeof setTimeout> | null
  afterSendHooks: AfterSendHandler[]
  beforePushEventHooks: BeforePushEventHandler[]
  beforeSendHooks: BeforeSendHandler[]
  breadcrumbs: Breadcrumb[]
  contexts: Record<string, unknown>
  initialized: boolean
  lastClickAt: number
  networkStatus: NetworkStatus
  options: ResolvedMonitorOptions | null
  originalFetch: typeof window.fetch | null
  originalPushState: History["pushState"] | null
  originalReplaceState: History["replaceState"] | null
  originalXHROpen: typeof XMLHttpRequest.prototype.open | null
  originalXHRSend: typeof XMLHttpRequest.prototype.send | null
  pageId: string
  pageStartTime: number
  queue: MonitorEvent[]
  retryTimer: ReturnType<typeof setTimeout> | null
  sessionId: string
  tags: Record<string, string>
}

export const state: MonitorState = {
  afterSendHooks: [],
  beforePushEventHooks: [],
  beforeSendHooks: [],
  breadcrumbs: [],
  cleanups: [],
  contexts: {},
  consoleErrorOriginal: null,
  currentRoute: "",
  deviceId: "",
  errorScope: new Map(),
  flushPromise: null,
  flushTimer: null,
  initialized: false,
  lastClickAt: 0,
  networkStatus: "online",
  options: null,
  originalFetch: null,
  originalPushState: null,
  originalReplaceState: null,
  originalXHROpen: null,
  originalXHRSend: null,
  pageId: "",
  pageStartTime: 0,
  queue: [],
  retryTimer: null,
  sessionId: "",
  tags: {}
}

export function addCleanup(cleanup: CleanupFn): void {
  state.cleanups.push(cleanup)
}

export function clearCleanups(): void {
  for (const cleanup of state.cleanups.splice(0)) {
    cleanup()
  }
}

export function clearTimer(timer: ReturnType<typeof setTimeout> | null): null {
  if (timer) clearTimeout(timer)
  return null
}

export function resetState(): void {
  state.afterSendHooks = []
  state.beforePushEventHooks = []
  state.beforeSendHooks = []
  state.breadcrumbs = []
  state.contexts = {}
  state.currentRoute = ""
  state.deviceId = ""
  state.errorScope.clear()
  state.flushPromise = null
  state.flushTimer = clearTimer(state.flushTimer)
  state.initialized = false
  state.lastClickAt = 0
  state.networkStatus = "online"
  state.options = null
  state.originalFetch = null
  state.originalPushState = null
  state.originalReplaceState = null
  state.originalXHROpen = null
  state.originalXHRSend = null
  state.pageId = ""
  state.pageStartTime = 0
  state.queue = []
  state.retryTimer = clearTimer(state.retryTimer)
  state.sessionId = ""
  state.tags = {}
}
