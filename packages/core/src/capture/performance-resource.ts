import { addCleanup, state } from "../context"
import { enqueueEvent } from "../queue"
import type { PerformanceEventPayload } from "../types"
import { now } from "../utils"

export function initResourceObserver(): void {
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
