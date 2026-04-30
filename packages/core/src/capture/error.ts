import { state } from "../context"
import { debugLog, enqueueEvent } from "../queue"
import type { ErrorEventPayload, ResourceErrorEventPayload } from "../types"
import { now, toSelector } from "../utils"

const ERROR_SCOPE_WINDOW = 5000

export function initErrorCapture(): Array<() => void> {
  const removeHandlers: Array<() => void> = []

  const onError = (event: ErrorEvent) => {
    const target = event.target as Node | null

    if (target && (target as Element).tagName && (target as Node) !== (window as unknown as Node)) {
      if (state.options?.capture.resourceError) {
        captureResourceError(event)
      }
      return
    }

    if (state.options?.capture.jsError) {
      enqueueScopedError(
        createErrorEvent("js_error", event.error ?? event.message, {
          source: event.filename
        })
      )
    }
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!state.options?.capture.promiseRejection) return
    enqueueScopedError(
      createErrorEvent("promise_rejection", event.reason, {
        source: "unhandledrejection"
      })
    )
  }

  window.addEventListener("error", onError, true)
  window.addEventListener("unhandledrejection", onUnhandledRejection)

  removeHandlers.push(() => {
    window.removeEventListener("error", onError, true)
    window.removeEventListener("unhandledrejection", onUnhandledRejection)
  })

  return removeHandlers
}

function captureResourceError(event: ErrorEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const tagName = target.tagName?.toLowerCase() ?? "unknown"
  const resourceType = resolveResourceType(tagName, target)

  const resourceEvent: ResourceErrorEventPayload = {
    message: `Failed to load ${resourceType}: ${resolveResourceUrl(target)}`,
    resourceType,
    selector: toSelector(target),
    timestamp: now(),
    type: "resource_error",
    url: window.location.href
  }

  enqueueEvent(resourceEvent)

  if (state.options?.debug) {
    debugLog("capture resource error", resourceEvent)
  }
}

function resolveResourceType(tagName: string, element: HTMLElement): string {
  if (tagName === "link") return "link"
  if (tagName === "script") return "script"
  if (tagName === "img") return "img"
  if (tagName === "video") return "video"
  if (tagName === "audio") return "audio"
  if (tagName === "source") return "source"

  return element instanceof HTMLImageElement
    ? "img"
    : element instanceof HTMLScriptElement
      ? "script"
      : element instanceof HTMLLinkElement
        ? "link"
        : tagName
}

function resolveResourceUrl(element: HTMLElement): string {
  if (element instanceof HTMLImageElement) return element.src
  if (element instanceof HTMLScriptElement) return element.src
  if (element instanceof HTMLLinkElement) return element.href
  if (element instanceof HTMLVideoElement) return element.src
  if (element instanceof HTMLAudioElement) return element.src
  if (element instanceof HTMLSourceElement) return element.src

  return element.getAttribute("src") ?? element.getAttribute("href") ?? ""
}

export function createErrorEvent(
  type: ErrorEventPayload["type"],
  value: unknown,
  extra?: {
    params?: Record<string, unknown>
    source?: string
  }
): ErrorEventPayload {
  const errorInfo = normalizeUnknownError(value)

  return {
    message: errorInfo.message,
    params: extra?.params,
    scopeCount: 1,
    source: extra?.source ?? errorInfo.source,
    stack: errorInfo.stack,
    timestamp: now(),
    type,
    url: window.location.href
  }
}

export function enqueueScopedError(event: ErrorEventPayload, flush = false): void {
  if (!shouldEmitScopedError(event)) return
  enqueueEvent(event, flush)
}

function normalizeUnknownError(value: unknown): {
  message: string
  source?: string
  stack?: string
} {
  if (value instanceof Error) {
    return {
      message: value.message || value.name || "Unknown error",
      source: value.name,
      stack: value.stack
    }
  }

  if (typeof value === "string") {
    return {
      message: value
    }
  }

  if (typeof value === "object" && value !== null) {
    const maybeError = value as { message?: unknown; stack?: unknown; name?: unknown }
    return {
      message:
        typeof maybeError.message === "string"
          ? maybeError.message
          : "Unknown error",
      source: typeof maybeError.name === "string" ? maybeError.name : undefined,
      stack: typeof maybeError.stack === "string" ? maybeError.stack : undefined
    }
  }

  return {
    message: String(value)
  }
}

function shouldEmitScopedError(event: ErrorEventPayload): boolean {
  if (!state.options?.scopeError) return true

  const signature = createErrorSignature(event)
  const currentTime = now()
  const scopedEntry = state.errorScope.get(signature)

  if (!scopedEntry || currentTime - scopedEntry.lastSeenAt > ERROR_SCOPE_WINDOW) {
    state.errorScope.set(signature, {
      count: 1,
      event,
      lastSeenAt: currentTime
    })
    event.scopeCount = 1
    return true
  }

  scopedEntry.count += 1
  scopedEntry.lastSeenAt = currentTime

  if (scopedEntry.event && "scopeCount" in scopedEntry.event) {
    const scopedEvent = scopedEntry.event as ErrorEventPayload
    scopedEvent.scopeCount = scopedEntry.count
  }

  return false
}

function createErrorSignature(event: ErrorEventPayload): string {
  return [
    event.type,
    event.message,
    event.source ?? "",
    event.stack?.split("\n")[0] ?? "",
    event.url
  ].join("|")
}
