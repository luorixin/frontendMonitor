import { addCleanup, state } from "../context"
import { debugLog, enqueueEvent } from "../queue"
import { createNavigationPerformanceEvent } from "./performance-navigation"
import { initResourceObserver } from "./performance-resource"
import {
  flushSoftNavigationVitals,
  initWebVitalObservers,
  startSoftNavigationCapture
} from "./performance-web-vitals"

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

export {
  createNavigationPerformanceEvent,
  flushSoftNavigationVitals,
  startSoftNavigationCapture
}
