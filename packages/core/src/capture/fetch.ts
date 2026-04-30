import { enqueueEvent } from "../queue"
import { state } from "../context"
import type { RequestEventPayload } from "../types"
import { matchesIgnoreRule, now } from "../utils"

export function initFetchCapture(): void {
  if (!state.options?.capture.fetchError) return
  if (state.originalFetch) return

  const originalFetch = window.fetch
  state.originalFetch = originalFetch

  window.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const requestUrl = resolveRequestUrl(input)

    if (matchesIgnoreRule(requestUrl, state.options?.ignoreUrls ?? [])) {
      return originalFetch.call(window, input, init)
    }

    const method = resolveMethod(input, init)
    const start = now()

    try {
      const response = await originalFetch.call(window, input, init)

      if (!response.ok) {
        enqueueEvent(
          createRequestErrorEvent({
            duration: now() - start,
            method,
            status: response.status,
            url: requestUrl
          })
        )
      }

      return response
    } catch (error) {
      enqueueEvent(
        createRequestErrorEvent({
          duration: now() - start,
          errorMessage:
            error instanceof Error ? error.message : "Network request failed",
          method,
          url: requestUrl
        })
      )
      throw error
    }
  }) as typeof window.fetch
}

export function restoreFetchCapture(): void {
  if (!state.originalFetch) return
  window.fetch = state.originalFetch
  state.originalFetch = null
}

function createRequestErrorEvent(input: {
  duration: number
  errorMessage?: string
  method: string
  status?: number
  url: string
}): RequestEventPayload {
  return {
    duration: input.duration,
    errorMessage: input.errorMessage,
    method: input.method,
    status: input.status,
    timestamp: now(),
    type: "request_error",
    url: input.url
  }
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase()
  }

  return "GET"
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url
  }

  return String(input)
}
