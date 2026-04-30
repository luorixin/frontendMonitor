import type { BeforeSendHandler, MonitorEvent, ResolvedMonitorOptions } from "./types"

type CleanupFn = () => void

export type MonitorState = {
  cleanups: CleanupFn[]
  currentRoute: string
  flushPromise: Promise<void> | null
  flushTimer: ReturnType<typeof setTimeout> | null
  hooks: BeforeSendHandler[]
  initialized: boolean
  lastClickAt: number
  options: ResolvedMonitorOptions | null
  originalFetch: typeof window.fetch | null
  originalPushState: History["pushState"] | null
  originalReplaceState: History["replaceState"] | null
  pageId: string
  queue: MonitorEvent[]
  sessionId: string
}

export const state: MonitorState = {
  cleanups: [],
  currentRoute: "",
  flushPromise: null,
  flushTimer: null,
  hooks: [],
  initialized: false,
  lastClickAt: 0,
  options: null,
  originalFetch: null,
  originalPushState: null,
  originalReplaceState: null,
  pageId: "",
  queue: [],
  sessionId: ""
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
  state.currentRoute = ""
  state.flushPromise = null
  state.flushTimer = clearTimer(state.flushTimer)
  state.hooks = []
  state.initialized = false
  state.lastClickAt = 0
  state.options = null
  state.originalFetch = null
  state.originalPushState = null
  state.originalReplaceState = null
  state.pageId = ""
  state.queue = []
  state.sessionId = ""
}
