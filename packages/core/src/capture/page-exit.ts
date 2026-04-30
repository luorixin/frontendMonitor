import { addCleanup, state } from "../context"
import { enqueueEvent, flushQueueOnExit } from "../queue"
import { createPageDwellEvent } from "./navigation"

export function initPageExitCapture(): void {
  const onPageHide = () => {
    enqueueDwellEvent()
    void flushQueueOnExit()
  }

  const onBeforeUnload = () => {
    enqueueDwellEvent()
    void flushQueueOnExit()
  }

  window.addEventListener("pagehide", onPageHide)
  window.addEventListener("beforeunload", onBeforeUnload)
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      enqueueDwellEvent()
      void flushQueueOnExit()
    }
  })

  addCleanup(() => {
    window.removeEventListener("pagehide", onPageHide)
    window.removeEventListener("beforeunload", onBeforeUnload)
  })
}

function enqueueDwellEvent(): void {
  const dwellEvent = createPageDwellEvent()
  if (dwellEvent) {
    enqueueEvent(dwellEvent, true)
    state.pageStartTime = 0
  }
}
