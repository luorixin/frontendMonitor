import type {
  AfterSendHandler,
  Breadcrumb,
  BeforePushEventHandler,
  BeforeSendHandler,
  DiagnosticsSnapshot,
  MonitorIntegration,
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
  diagnostics: DiagnosticsSnapshot
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
  activeSpanId: string | null
  beforePushEventHooks: BeforePushEventHandler[]
  beforeSendHooks: BeforeSendHandler[]
  breadcrumbs: Breadcrumb[]
  contexts: Record<string, unknown>
  initialized: boolean
  integrations: MonitorIntegration[]
  lastClickAt: number
  localizationStorePromise: Promise<void> | null
  networkStatus: NetworkStatus
  offlineStorePromise: Promise<void> | null
  options: ResolvedMonitorOptions | null
  originalFetch: typeof window.fetch | null
  originalPushState: History["pushState"] | null
  originalReplaceState: History["replaceState"] | null
  originalXHROpen: typeof XMLHttpRequest.prototype.open | null
  originalXHRSend: typeof XMLHttpRequest.prototype.send | null
  originalXHRSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader | null
  pageId: string
  pageStartTime: number
  queue: MonitorEvent[]
  replayFlushPromise: Promise<void> | null
  replayFlushTimer: ReturnType<typeof setTimeout> | null
  replayCaptureUntil: number
  replayId: string | null
  replayRingBuffer: unknown[]
  replayQueue: unknown[]
  replaySequence: number
  replayStartedAt: number
  replayStop: (() => void) | null
  replayTriggerCount: number
  replayTransportQueue: ReplayChunkPayload[]
  retryTimer: ReturnType<typeof setTimeout> | null
  sessionId: string
  softNavigation: SoftNavigationState
  spanId: string | null
  tags: Record<string, string>
  traceId: string | null
}

export const state: MonitorState = {
  afterSendHooks: [],
  activeSpanId: null,
  beforePushEventHooks: [],
  beforeSendHooks: [],
  breadcrumbs: [],
  cleanups: [],
  contexts: {},
  consoleErrorOriginal: null,
  currentRoute: "",
  deviceId: "",
  diagnostics: {
    droppedByPayloadSize: 0,
    droppedByQueueOverflow: 0,
    droppedBySampling: 0,
    offlineQueued: 0,
    retryExhausted: 0,
    retrySucceeded: 0
  },
  errorScope: new Map(),
  flushPromise: null,
  flushTimer: null,
  initialized: false,
  integrations: [],
  lastClickAt: 0,
  localizationStorePromise: null,
  networkStatus: "online",
  offlineStorePromise: null,
  options: null,
  originalFetch: null,
  originalPushState: null,
  originalReplaceState: null,
  originalXHROpen: null,
  originalXHRSend: null,
  originalXHRSetRequestHeader: null,
  pageId: "",
  pageStartTime: 0,
  queue: [],
  replayFlushPromise: null,
  replayFlushTimer: null,
  replayCaptureUntil: 0,
  replayId: null,
  replayRingBuffer: [],
  replayQueue: [],
  replaySequence: 0,
  replayStartedAt: 0,
  replayStop: null,
  replayTriggerCount: 0,
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
  spanId: null,
  tags: {},
  traceId: null
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
  state.activeSpanId = null
  state.beforePushEventHooks = []
  state.beforeSendHooks = []
  state.breadcrumbs = []
  state.contexts = {}
  state.currentRoute = ""
  state.deviceId = ""
  state.diagnostics = {
    droppedByPayloadSize: 0,
    droppedByQueueOverflow: 0,
    droppedBySampling: 0,
    offlineQueued: 0,
    retryExhausted: 0,
    retrySucceeded: 0
  }
  state.errorScope.clear()
  state.flushPromise = null
  state.flushTimer = clearTimer(state.flushTimer)
  state.initialized = false
  state.integrations = []
  state.lastClickAt = 0
  state.localizationStorePromise = null
  state.networkStatus = "online"
  state.offlineStorePromise = null
  state.options = null
  state.originalFetch = null
  state.originalPushState = null
  state.originalReplaceState = null
  state.originalXHROpen = null
  state.originalXHRSend = null
  state.originalXHRSetRequestHeader = null
  state.pageId = ""
  state.pageStartTime = 0
  state.queue = []
  state.replayFlushPromise = null
  state.replayFlushTimer = clearTimer(state.replayFlushTimer)
  state.replayCaptureUntil = 0
  state.replayId = null
  state.replayRingBuffer = []
  state.replayQueue = []
  state.replaySequence = 0
  state.replayStartedAt = 0
  state.replayStop = null
  state.replayTriggerCount = 0
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
  state.spanId = null
  state.tags = {}
  state.traceId = null
}
