import { addCleanup, state } from "../context"
import { debugLog, enqueueEvent } from "../queue"
import type { PerformanceEventPayload } from "../types"
import { now } from "../utils"

export function initPerformanceCapture(): void {
  if (!window.performance) return

  const collectNavigation = () => {
    const event = createNavigationPerformanceEvent()
    if (event) {
      enqueueEvent(event, true)
      if (state.options?.debug) {
        debugLog("capture navigation performance", event)
      }
    }
  }

  if (document.readyState === "complete") {
    setTimeout(collectNavigation, 0)
  } else {
    const onLoad = () => {
      setTimeout(collectNavigation, 0)
    }
    window.addEventListener("load", onLoad, { once: true })
    addCleanup(() => {
      window.removeEventListener("load", onLoad)
    })
  }

  if (window.PerformanceObserver) {
    initResourceObserver()
    initWebVitalObservers()
  }
}

export function startSoftNavigationCapture(input: {
  from: string
  to: string
  trigger: string
}): void {
  state.softNavigation = {
    active: true,
    clsValue: 0,
    fromRoute: input.from,
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

function initWebVitalObservers(): void {
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

  window.addEventListener("pagehide", flushVitals, { once: true })
  document.addEventListener("visibilitychange", onVisibilityChange)
  addCleanup(() => {
    window.removeEventListener("pagehide", flushVitals)
    document.removeEventListener("visibilitychange", onVisibilityChange)
  })
}

function initResourceObserver(): void {
  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (!isValidResourceEntry(entry)) continue

        const event = createResourcePerformanceEvent(entry)
        if (event) {
          enqueueEvent(event)
        }
      }
    })

    observer.observe({ type: "resource", buffered: true })
    addCleanup(() => observer.disconnect())
  } catch {
    // PerformanceObserver not supported for resource type
  }
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

function isValidResourceEntry(entry: PerformanceResourceTiming): boolean {
  if (entry.initiatorType === "xmlhttprequest" || entry.initiatorType === "fetch") {
    return false
  }

  if (matchesIgnoreRule(entry.name)) return false
  return entry.duration > 0
}

function matchesIgnoreRule(url: string): boolean {
  return state.options?.ignoreUrls?.some(rule => {
    if (typeof rule === "string") return url.includes(rule)
    return rule instanceof RegExp && rule.test(url)
  }) ?? false
}

function createResourcePerformanceEvent(
  entry: PerformanceResourceTiming
): PerformanceEventPayload | null {
  return {
    duration: Math.round(entry.duration),
    name: entry.name,
    performanceType: "resource",
    resourceType: entry.initiatorType || "other",
    startTime: Math.round(entry.startTime),
    timestamp: now(),
    transferSize: entry.transferSize > 0 ? entry.transferSize : undefined,
    type: "performance",
    url: window.location.href
  }
}

export function createNavigationPerformanceEvent():
  | PerformanceEventPayload
  | null {
  const navigationEntry = getNavigationEntry()
  if (!navigationEntry) return null

  const paintEntries = getPaintEntries()

  return {
    metrics: {
      dnsLookup: clampMetric(
        navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart
      ),
      domContentLoaded: clampMetric(
        navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime
      ),
      domInteractive: clampMetric(
        navigationEntry.domInteractive - navigationEntry.startTime
      ),
      firstContentfulPaint: paintEntries.firstContentfulPaint,
      firstPaint: paintEntries.firstPaint,
      loadEvent: clampMetric(
        navigationEntry.loadEventEnd - navigationEntry.startTime
      ),
      redirect: clampMetric(
        navigationEntry.redirectEnd - navigationEntry.redirectStart
      ),
      response: clampMetric(
        navigationEntry.responseEnd - navigationEntry.responseStart
      ),
      tcpConnect: clampMetric(
        navigationEntry.connectEnd - navigationEntry.connectStart
      ),
      ttfb: clampMetric(
        navigationEntry.responseStart - navigationEntry.requestStart
      )
    },
    navigationType: navigationEntry.type,
    performanceType: "navigation",
    timestamp: now(),
    type: "performance",
    url: window.location.href
  }
}

type NavigationLike = {
  connectEnd: number
  connectStart: number
  domContentLoadedEventEnd: number
  domInteractive: number
  domainLookupEnd: number
  domainLookupStart: number
  loadEventEnd: number
  redirectEnd: number
  redirectStart: number
  requestStart: number
  responseEnd: number
  responseStart: number
  startTime: number
  type?: string
}

function getNavigationEntry(): NavigationLike | null {
  const navigationEntries = performance.getEntriesByType?.("navigation") ?? []
  const entry = navigationEntries[0] as PerformanceNavigationTiming | undefined

  if (entry) {
    return {
      connectEnd: entry.connectEnd,
      connectStart: entry.connectStart,
      domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
      domInteractive: entry.domInteractive,
      domainLookupEnd: entry.domainLookupEnd,
      domainLookupStart: entry.domainLookupStart,
      loadEventEnd: entry.loadEventEnd,
      redirectEnd: entry.redirectEnd,
      redirectStart: entry.redirectStart,
      requestStart: entry.requestStart,
      responseEnd: entry.responseEnd,
      responseStart: entry.responseStart,
      startTime: entry.startTime,
      type: entry.type
    }
  }

  const legacyTiming = performance.timing
  if (!legacyTiming) return null

  const navigationStart = legacyTiming.navigationStart

  return {
    connectEnd: legacyTiming.connectEnd - navigationStart,
    connectStart: legacyTiming.connectStart - navigationStart,
    domContentLoadedEventEnd:
      legacyTiming.domContentLoadedEventEnd - navigationStart,
    domInteractive: legacyTiming.domInteractive - navigationStart,
    domainLookupEnd: legacyTiming.domainLookupEnd - navigationStart,
    domainLookupStart: legacyTiming.domainLookupStart - navigationStart,
    loadEventEnd: legacyTiming.loadEventEnd - navigationStart,
    redirectEnd: legacyTiming.redirectEnd - navigationStart,
    redirectStart: legacyTiming.redirectStart - navigationStart,
    requestStart: legacyTiming.requestStart - navigationStart,
    responseEnd: legacyTiming.responseEnd - navigationStart,
    responseStart: legacyTiming.responseStart - navigationStart,
    startTime: 0,
    type: "navigate"
  }
}

function getPaintEntries(): {
  firstContentfulPaint?: number
  firstPaint?: number
} {
  const result: {
    firstContentfulPaint?: number
    firstPaint?: number
  } = {}

  const entries = performance.getEntriesByType?.("paint") ?? []
  for (const entry of entries as PerformanceEntry[]) {
    if (entry.name === "first-paint") {
      result.firstPaint = clampMetric(entry.startTime)
    }

    if (entry.name === "first-contentful-paint") {
      result.firstContentfulPaint = clampMetric(entry.startTime)
    }
  }

  return result
}

function clampMetric(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}
