import { enqueueEvent, debugLog } from "../queue"
import { state } from "../context"
import { matchesIgnoreRule, now } from "../utils"
import { createRequestErrorEvent } from "./request-event"
import type { RequestPerformanceEventPayload } from "../types"

export function initFetchCapture(): void {
  if (!state.options?.capture.fetchError && !state.options?.capture.requestPerformance) return
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
      const duration = now() - start

      if (response.ok) {
        if (state.options?.capture.requestPerformance) {
          enqueueEvent(createRequestPerformanceEvent({
            duration,
            method,
            status: response.status,
            transport: "fetch",
            url: requestUrl
          }))
        }
      } else {
        if (state.options?.capture.fetchError) {
          enqueueEvent(
            createRequestErrorEvent({
              duration,
              method,
              status: response.status,
              transport: "fetch",
              url: requestUrl
            })
          )
        }
      }

      return response
    } catch (error) {
      if (state.options?.capture.fetchError) {
        enqueueEvent(
          createRequestErrorEvent({
            duration: now() - start,
            errorMessage:
              error instanceof Error ? error.message : "Network request failed",
            method,
            transport: "fetch",
            url: requestUrl
          })
        )
      }
      throw error
    }
  }) as typeof window.fetch
}

function createRequestPerformanceEvent(params: {
  duration: number
  method: string
  status: number
  transport: "fetch" | "xhr"
  url: string
}): RequestPerformanceEventPayload {
  return {
    duration: params.duration,
    method: params.method,
    status: params.status,
    timestamp: now(),
    transport: params.transport,
    type: "request_performance",
    url: params.url
  }
}

export function restoreFetchCapture(): void {
  if (!state.originalFetch) return
  window.fetch = state.originalFetch
  state.originalFetch = null
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
