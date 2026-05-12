import { state } from "../core/context"
import { debugLog, enqueueEvent } from "../pipeline/queue"
import type { CauseInfo, ErrorEventPayload, ResourceErrorEventPayload } from "../core/types"
import { matchesIgnoreRule, now, toSelector } from "../utils"
import { parseStackFrames } from "./stack"

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
          mechanism: "onerror",
          source: event.filename
        })
      )
    }
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!state.options?.capture.promiseRejection) return
    enqueueScopedError(
      createErrorEvent("promise_rejection", event.reason, {
        mechanism: "unhandledrejection",
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
  const resourceUrl = resolveResourceUrl(target)

  const resourceEvent: ResourceErrorEventPayload = {
    message: `Failed to load ${resourceType}: ${resourceUrl}`,
    resourceType,
    resourceUrl,
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
    mechanism?: NonNullable<ErrorEventPayload["mechanism"]>["type"]
    params?: Record<string, unknown>
    source?: string
  }
): ErrorEventPayload {
  const errorInfo = normalizeUnknownError(value)
  const frames = parseStackFrames(errorInfo.stack)
  const source = extra?.source ?? frames[0]?.filename ?? errorInfo.source

  return {
    causeChain: buildCauseChain(value),
    debugId: state.options?.debugId,
    dist: state.options?.dist,
    exception: {
      stacktrace: frames.length > 0 ? { frames } : undefined,
      type: errorInfo.type,
      value: errorInfo.message
    },
    frames: frames.length > 0 ? frames : undefined,
    mechanism: {
      handled: extra?.mechanism ? extra.mechanism === "manual" : true,
      type: extra?.mechanism ?? "manual"
    },
    message: errorInfo.message,
    params: extra?.params,
    release: state.options?.release,
    scopeCount: 1,
    source,
    stack: errorInfo.stack,
    timestamp: now(),
    type,
    url: window.location.href
  }
}

export function enqueueScopedError(event: ErrorEventPayload, flush = false): void {
  if (shouldDropError(event)) return
  if (!shouldEmitScopedError(event)) return
  enqueueEvent(event, flush)
}

function normalizeUnknownError(value: unknown): {
  message: string
  source?: string
  stack?: string
  type: string
} {
  if (value instanceof Error) {
    return {
      message: value.message || value.name || "Unknown error",
      source: value.name,
      stack: value.stack,
      type: value.name || "Error"
    }
  }

  if (typeof value === "string") {
    return {
      message: value,
      type: "Error"
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
      stack: typeof maybeError.stack === "string" ? maybeError.stack : undefined,
      type: typeof maybeError.name === "string" ? maybeError.name : "Error"
    }
  }

  return {
    message: String(value),
    type: "Error"
  }
}

function buildCauseChain(value: unknown): CauseInfo[] | undefined {
  const causes: CauseInfo[] = []
  if (
    typeof value === "object" &&
    value !== null &&
    "errors" in value &&
    Array.isArray((value as { errors?: unknown }).errors)
  ) {
    for (const item of (value as { errors: unknown[] }).errors) {
      const normalized = normalizeUnknownError(item)
      causes.push({
        message: normalized.message,
        stack: normalized.stack,
        type: normalized.type
      })
    }
  }

  let current = readCause(value)
  const visited = new Set<unknown>()

  while (current !== undefined && current !== null && !visited.has(current)) {
    visited.add(current)
    const normalized = normalizeUnknownError(current)
    causes.unshift({
      message: normalized.message,
      stack: normalized.stack,
      type: normalized.type
    })
    current = readCause(current)
  }

  return causes.length > 0 ? causes : undefined
}

function readCause(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("cause" in value)) {
    return undefined
  }
  return (value as { cause?: unknown }).cause
}

function shouldDropError(event: ErrorEventPayload): boolean {
  const options = state.options
  if (!options) return false

  if (matchesIgnoreRule(event.message, options.ignoreErrors)) {
    return true
  }

  const sourceTarget = event.source ?? event.url
  if (matchesIgnoreRule(sourceTarget, options.denyUrls)) {
    return true
  }

  if (options.allowUrls.length > 0 && !matchesIgnoreRule(sourceTarget, options.allowUrls)) {
    return true
  }

  return false
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
