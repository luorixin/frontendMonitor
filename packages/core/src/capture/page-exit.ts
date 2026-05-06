import { addCleanup, state } from "../context"
import { enqueueEvent, flushQueueOnExit } from "../queue"
import { flushReplayQueue } from "../replay"
import { createPageDwellEvent } from "./navigation"

export function initPageExitCapture(): void {
  const onPageHide = () => {
    enqueueDwellEvent()
    void flushQueueOnExit()
    void flushReplayQueue(true)
  }

  const onBeforeUnload = () => {
    enqueueDwellEvent()
    void flushQueueOnExit()
    void flushReplayQueue(true)
  }

  window.addEventListener("pagehide", onPageHide)
  window.addEventListener("beforeunload", onBeforeUnload)
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      enqueueDwellEvent()
      void flushQueueOnExit()
      void flushReplayQueue(true)
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
