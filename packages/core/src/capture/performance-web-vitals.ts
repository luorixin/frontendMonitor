import { addCleanup, state } from "../context"
import { enqueueEvent } from "../queue"
import type { PerformanceEventPayload } from "../types"
import { now } from "../utils"
import { clampMetric, getNavigationEntry } from "./performance-navigation"

const WEB_VITAL_FLUSH_DELAY = 10_000

export function startSoftNavigationCapture(input: {
  from: string
  to: string
  trigger: string
}): void {
  if (state.softNavigation.flushTimer) {
    clearTimeout(state.softNavigation.flushTimer)
  }

  state.softNavigation = {
    active: true,
    clsValue: 0,
    fromRoute: input.from,
    flushTimer: setTimeout(() => {
      flushSoftNavigationVitals()
    }, WEB_VITAL_FLUSH_DELAY),
    hasClsSample: false,
    latestLcp: 0,
    maxInp: 0,
    startedAt: window.performance?.now?.() ?? 0,
    toRoute: input.to,
    trigger: input.trigger
  }
}

export function flushSoftNavigationVitals(): void {
  if (!state.softNavigation.active) {
    return
  }

  if (state.softNavigation.flushTimer) {
    clearTimeout(state.softNavigation.flushTimer)
  }

  const navigationType = `soft-${state.softNavigation.trigger}`
  if (state.softNavigation.latestLcp > 0) {
    enqueueEvent(
      createWebVitalEvent("LCP", state.softNavigation.latestLcp, navigationType, {
        routeFrom: state.softNavigation.fromRoute,
        routeTo: state.softNavigation.toRoute,
        softNavigation: true
      }),
      true
    )
  }
  if (state.softNavigation.hasClsSample) {
    enqueueEvent(
      createWebVitalEvent("CLS", Number(state.softNavigation.clsValue.toFixed(3)), navigationType, {
        routeFrom: state.softNavigation.fromRoute,
        routeTo: state.softNavigation.toRoute,
        softNavigation: true
      }),
      true
    )
  }
  if (state.softNavigation.maxInp > 0) {
    enqueueEvent(
      createWebVitalEvent("INP", state.softNavigation.maxInp, navigationType, {
        routeFrom: state.softNavigation.fromRoute,
        routeTo: state.softNavigation.toRoute,
        softNavigation: true
      }),
      true
    )
  }

  state.softNavigation = {
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
  }
}

type WebVitalRating = "good" | "needs-improvement" | "poor"
type WebVitalMetricName = "CLS" | "INP" | "LCP"

export function initWebVitalObservers(): void {
  const supportedEntryTypes = window.PerformanceObserver?.supportedEntryTypes ?? []
  let latestLcp = 0
  let clsValue = 0
  let maxInp = 0
  let hasClsSample = false
  let lcpSent = false
  let clsSent = false
  let inpSent = false
  const navigationType = getNavigationEntry()?.type

  if (supportedEntryTypes.includes("largest-contentful-paint")) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const entryStartTime = clampMetric(entry.startTime)
          latestLcp = Math.max(latestLcp, entryStartTime)
          if (state.softNavigation.active && entry.startTime >= state.softNavigation.startedAt) {
            state.softNavigation.latestLcp = Math.max(state.softNavigation.latestLcp, entryStartTime)
          }
        }
      })
      observer.observe({ type: "largest-contentful-paint", buffered: true })
      addCleanup(() => observer.disconnect())
    } catch {
      // largest-contentful-paint not supported
    }
  }

  if (supportedEntryTypes.includes("layout-shift")) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (entry.hadRecentInput) {
            continue
          }
          const delta = Number(entry.value ?? 0)
          clsValue += delta
          hasClsSample = true
          if (state.softNavigation.active && entry.startTime >= state.softNavigation.startedAt) {
            state.softNavigation.clsValue += delta
            state.softNavigation.hasClsSample = true
          }
        }
      })
      observer.observe({ type: "layout-shift", buffered: true })
      addCleanup(() => observer.disconnect())
    } catch {
      // layout-shift not supported
    }
  }

  if (supportedEntryTypes.includes("event")) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { interactionId?: number; duration?: number }>) {
          if (Number(entry.interactionId ?? 0) <= 0) {
            continue
          }
          const duration = clampMetric(Number(entry.duration ?? 0))
          maxInp = Math.max(maxInp, duration)
          if (state.softNavigation.active && entry.startTime >= state.softNavigation.startedAt) {
            state.softNavigation.maxInp = Math.max(state.softNavigation.maxInp, duration)
          }
        }
      })
      observer.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit)
      addCleanup(() => observer.disconnect())
    } catch {
      // event timing not supported
    }
  }

  const flushVitals = () => {
    flushSoftNavigationVitals()
    if (latestLcp > 0 && !lcpSent) {
      lcpSent = true
      enqueueEvent(createWebVitalEvent("LCP", latestLcp, navigationType), true)
    }
    if (hasClsSample && !clsSent) {
      clsSent = true
      enqueueEvent(createWebVitalEvent("CLS", Number(clsValue.toFixed(3)), navigationType), true)
    }
    if (maxInp > 0 && !inpSent) {
      inpSent = true
      enqueueEvent(createWebVitalEvent("INP", maxInp, navigationType), true)
    }
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      flushVitals()
    }
  }

  const delayedFlushTimer = window.setTimeout(() => {
    flushVitals()
  }, WEB_VITAL_FLUSH_DELAY)

  window.addEventListener("pagehide", flushVitals, { once: true })
  document.addEventListener("visibilitychange", onVisibilityChange)
  addCleanup(() => {
    window.clearTimeout(delayedFlushTimer)
    window.removeEventListener("pagehide", flushVitals)
    document.removeEventListener("visibilitychange", onVisibilityChange)
  })
}

function createWebVitalEvent(
  metricName: WebVitalMetricName,
  value: number,
  navigationType?: string,
  extra?: {
    routeFrom?: string
    routeTo?: string
    softNavigation?: boolean
  }
): PerformanceEventPayload {
  return {
    metricName,
    navigationType,
    performanceType: "web_vital",
    rating: resolveWebVitalRating(metricName, value),
    routeFrom: extra?.routeFrom,
    routeTo: extra?.routeTo,
    softNavigation: extra?.softNavigation,
    timestamp: now(),
    type: "performance",
    url: window.location.href,
    value
  }
}

function resolveWebVitalRating(
  metricName: WebVitalMetricName,
  value: number
): WebVitalRating {
  const thresholds = {
    CLS: [0.1, 0.25],
    INP: [200, 500],
    LCP: [2500, 4000]
  } satisfies Record<WebVitalMetricName, [number, number]>

  const [goodThreshold, poorThreshold] = thresholds[metricName]
  if (value <= goodThreshold) {
    return "good"
  }
  if (value <= poorThreshold) {
    return "needs-improvement"
  }
  return "poor"
}
