import { addCleanup, state } from "../core/context"
import { enqueueEvent, flushQueueOnExit } from "../pipeline/queue"
import { flushReplayQueue } from "../pipeline/replay"
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

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      enqueueDwellEvent()
      void flushQueueOnExit()
      void flushReplayQueue(true)
    }
  }

  window.addEventListener("pagehide", onPageHide)
  window.addEventListener("beforeunload", onBeforeUnload)
  window.addEventListener("visibilitychange", onVisibilityChange)

  addCleanup(() => {
    window.removeEventListener("pagehide", onPageHide)
    window.removeEventListener("beforeunload", onBeforeUnload)
    window.removeEventListener("visibilitychange", onVisibilityChange)
  })
}

function enqueueDwellEvent(): void {
  const dwellEvent = createPageDwellEvent()
  if (dwellEvent) {
    enqueueEvent(dwellEvent, true)
    state.pageStartTime = 0
  }
}
