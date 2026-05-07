import type {
  AfterSendHandler,
  Breadcrumb,
  BeforePushEventHandler,
  BeforeSendHandler,
  MonitorEvent,
  NetworkStatus,
  ReplayChunkPayload,
  ResolvedMonitorOptions
} from "./types"

type CleanupFn = () => void

type SoftNavigationState = {
  active: boolean
  clsValue: number
  fromRoute: string
  flushTimer: ReturnType<typeof setTimeout> | null
  hasClsSample: boolean
  latestLcp: number
  maxInp: number
  startedAt: number
  toRoute: string
  trigger: string
}

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
  replayFlushPromise: Promise<void> | null
  replayFlushTimer: ReturnType<typeof setTimeout> | null
  replayId: string | null
  replayQueue: unknown[]
  replaySequence: number
  replayStartedAt: number
  replayStop: (() => void) | null
  replayTransportQueue: ReplayChunkPayload[]
  retryTimer: ReturnType<typeof setTimeout> | null
  sessionId: string
  softNavigation: SoftNavigationState
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
  replayFlushPromise: null,
  replayFlushTimer: null,
  replayId: null,
  replayQueue: [],
  replaySequence: 0,
  replayStartedAt: 0,
  replayStop: null,
  replayTransportQueue: [],
  retryTimer: null,
  sessionId: "",
  softNavigation: {
    active: false,
    clsValue: 0,
    fromRoute: "",
    flushTimer: null,
    hasClsSample: false,
    latestLcp: 0,
    maxInp: 0,
    startedAt: 0,
    toRoute: "",
    trigger: ""
  },
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
  state.replayFlushPromise = null
  state.replayFlushTimer = clearTimer(state.replayFlushTimer)
  state.replayId = null
  state.replayQueue = []
  state.replaySequence = 0
  state.replayStartedAt = 0
  state.replayStop = null
  state.replayTransportQueue = []
  state.retryTimer = clearTimer(state.retryTimer)
  state.sessionId = ""
  state.softNavigation = {
    active: false,
    clsValue: 0,
    fromRoute: "",
    flushTimer: clearTimer(state.softNavigation.flushTimer),
    hasClsSample: false,
    latestLcp: 0,
    maxInp: 0,
    startedAt: 0,
    toRoute: "",
    trigger: ""
  }
  state.tags = {}
}
