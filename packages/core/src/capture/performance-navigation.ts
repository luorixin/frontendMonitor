import type { PerformanceEventPayload } from "../types"
import { now } from "../utils"

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

export function getNavigationEntry(): NavigationLike | null {
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

export function clampMetric(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}
