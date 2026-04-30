import { state } from "../context"
import { enqueueEvent } from "../queue"
import type {
  ExposureEventPayload,
  ExposureObserverOptions
} from "../types"
import {
  getRedactedInputText,
  now,
  textPreview,
  toSelector
} from "../utils"

type ExposureTargetState = {
  observer: IntersectionObserver
  params?: Record<string, unknown>
  threshold: number
  visible: boolean
}

const exposureTargets = new Map<Element, ExposureTargetState>()

export function intersectionObserver(
  options: ExposureObserverOptions
): void {
  if (!state.initialized || !state.options?.capture.exposure) return
  if (typeof window.IntersectionObserver !== "function") return
  if (!(options.target instanceof Element)) return

  const target = options.target
  const threshold = normalizeThreshold(options.threshold)

  intersectionUnobserve(target)

  const targetState: ExposureTargetState = {
    observer: null as unknown as IntersectionObserver,
    params: options.params,
    threshold,
    visible: false
  }

  const observer = new window.IntersectionObserver(entries => {
    const entry = entries.find(item => item.target === target)
    if (!entry) return

    const isVisible =
      entry.isIntersecting && entry.intersectionRatio >= targetState.threshold

    if (isVisible && !targetState.visible) {
      enqueueEvent(
        createExposureEvent(
          target,
          entry.intersectionRatio,
          targetState.threshold,
          targetState.params,
          "enter"
        )
      )
    }

    if (!isVisible && targetState.visible) {
      enqueueEvent(
        createExposureEvent(
          target,
          entry.intersectionRatio,
          targetState.threshold,
          targetState.params,
          "leave"
        )
      )
    }

    targetState.visible = isVisible
  }, {
    threshold: [0, threshold]
  })

  targetState.observer = observer
  exposureTargets.set(target, targetState)
  observer.observe(target)
}

export function intersectionUnobserve(target: Element): void {
  const targetState = exposureTargets.get(target)
  if (!targetState) return

  targetState.observer.unobserve(target)
  targetState.observer.disconnect()
  exposureTargets.delete(target)
}

export function intersectionDisconnect(): void {
  for (const [target, targetState] of exposureTargets.entries()) {
    targetState.observer.unobserve(target)
    targetState.observer.disconnect()
  }

  exposureTargets.clear()
}

export function restoreExposureCapture(): void {
  intersectionDisconnect()
}

function createExposureEvent(
  target: Element,
  ratio: number,
  threshold: number,
  params?: Record<string, unknown>,
  action: "enter" | "leave" = "enter"
): ExposureEventPayload {
  return {
    action,
    params,
    ratio: clampRatio(ratio),
    selector: toSelector(target),
    tagName: target.tagName.toLowerCase(),
    textPreview: resolveExposureText(target),
    threshold,
    timestamp: now(),
    type: "exposure",
    url: window.location.href
  }
}

function resolveExposureText(target: Element): string {
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

function normalizeThreshold(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.min(1, Number(value.toFixed(3)))
}
