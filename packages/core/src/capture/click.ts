import { state, addCleanup } from "../context"
import { enqueueEvent } from "../queue"
import type { ClickEventPayload } from "../types"
import { now, textPreview, toSelector } from "../utils"

const CLICK_THROTTLE = 100

export function initClickCapture(): void {
  if (!state.options?.capture.click) return

  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const tagName = target.tagName.toLowerCase()
    if (tagName === "html" || tagName === "body") return

    const currentTime = now()
    if (currentTime - state.lastClickAt < CLICK_THROTTLE) return
    state.lastClickAt = currentTime

    enqueueEvent(createClickEvent(target, tagName, currentTime))
  }

  document.addEventListener("click", onClick, true)
  addCleanup(() => {
    document.removeEventListener("click", onClick, true)
  })
}

function createClickEvent(
  target: Element,
  tagName: string,
  timestamp: number
): ClickEventPayload {
  return {
    selector: toSelector(target),
    tagName,
    textPreview: textPreview(target.textContent ?? ""),
    timestamp,
    type: "click",
    url: window.location.href
  }
}
