import { enqueueEvent } from "../queue"
import type { ErrorEventPayload } from "../types"
import { now } from "../utils"

export function initErrorCapture(): Array<() => void> {
  const removeHandlers: Array<() => void> = []

  const onError = (event: ErrorEvent) => {
    enqueueEvent(
      createErrorEvent("js_error", event.error ?? event.message, {
        source: event.filename
      })
    )
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    enqueueEvent(
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
    source: extra?.source ?? errorInfo.source,
    stack: errorInfo.stack,
    timestamp: now(),
    type,
    url: window.location.href
  }
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
