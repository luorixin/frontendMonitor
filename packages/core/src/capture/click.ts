import { state, addCleanup } from "../context"
import { enqueueEvent, debugLog } from "../queue"
import type { ClickEventPayload } from "../types"
import {
  getRedactedInputText,
  now,
  textPreview,
  toSelector
} from "../utils"

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

    const clickEvent = createClickEvent(target, tagName, currentTime)
    enqueueEvent(clickEvent)

    if (state.options?.debug) {
      debugLog("capture click", clickEvent)
    }
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
    textPreview: resolveClickText(target),
    timestamp,
    type: "click",
    url: window.location.href
  }
}

function resolveClickText(target: Element): string {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.getAttribute("contenteditable") === "true"
  ) {
    return getRedactedInputText()
  }

  return textPreview(target.textContent ?? "")
}
