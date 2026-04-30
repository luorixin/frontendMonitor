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
  }
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
