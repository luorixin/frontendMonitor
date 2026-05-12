import { enqueueEvent } from "../pipeline/queue"
import { state } from "../core/context"
import { recordBreadcrumb } from "../pipeline/breadcrumb"
import { matchesIgnoreRule, now } from "../utils"
import { createRequestErrorEvent } from "./request-event"
import type { RequestPerformanceEventPayload } from "../core/types"
import { createRequestSpan, getTraceparent } from "../core/trace"
import {
  createMemoizedRequestBodyReader,
  normalizeCapturedRequestBody,
  normalizeRequestTextBody,
  readRequestBodySafely,
  resolveContentType
} from "./request-body"

export function initFetchCapture(): void {
  if (
    !state.options?.capture.fetchError &&
    !state.options?.capture.requestPerformance &&
    !state.options?.trace.propagateTraceparent
  ) return
  if (state.originalFetch) return

  const originalFetch = window.fetch
  state.originalFetch = originalFetch

  window.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
	      const requestUrl = resolveRequestUrl(input)
	      const method = resolveMethod(input, init)
	      const requestContentType = resolveRequestContentType(input, init)
	      const readRequestBody = createRequestBodyReader(input, init)
	      const requestSpan = createRequestSpan(`${method} ${requestUrl}`, {
	        op: "http.client"
	      })
	      const tracedRequest = applyTraceparent(input, init, requestSpan?.spanId)

      if (matchesIgnoreRule(requestUrl, state.options?.ignoreUrls ?? [])) {
        return originalFetch.call(window, tracedRequest.input, tracedRequest.init)
      }

    const start = now()

    try {
      const response = await originalFetch.call(
        window,
        tracedRequest.input,
        tracedRequest.init
      )
      const duration = now() - start

      if (response.ok) {
        if (state.options?.capture.requestPerformance) {
          enqueueEvent(createRequestPerformanceEvent({
            duration,
            method,
            parentSpanId: requestSpan?.parentSpanId,
            spanId: requestSpan?.spanId,
            status: response.status,
            traceId: requestSpan?.traceId,
            transport: "fetch",
            url: requestUrl
          }))
        }
	      } else {
	        if (state.options?.capture.fetchError) {
	          recordBreadcrumb({
	            data: {
	              method,
	              status: response.status,
	              url: requestUrl
	            },
	            level: "error",
	            message: `${method} ${requestUrl} failed with ${response.status}`,
	            type: "request"
	          })
	          enqueueEvent(
            createRequestErrorEvent({
              duration,
              method,
              parentSpanId: requestSpan?.parentSpanId,
	              requestBody: await readRequestBodySafely(
	                readRequestBody,
	                requestUrl,
	                requestContentType
              ),
              status: response.status,
              spanId: requestSpan?.spanId,
              traceId: requestSpan?.traceId,
              transport: "fetch",
              url: requestUrl
            })
          )
        }
      }

      return response
	    } catch (error) {
	      if (state.options?.capture.fetchError) {
	        recordBreadcrumb({
	          data: {
	            method,
	            url: requestUrl
	          },
	          level: "error",
	          message: `${method} ${requestUrl} failed`,
	          type: "request"
	        })
	        enqueueEvent(
          createRequestErrorEvent({
            duration: now() - start,
            errorMessage:
              error instanceof Error ? error.message : "Network request failed",
            method,
            parentSpanId: requestSpan?.parentSpanId,
	            requestBody: await readRequestBodySafely(
	              readRequestBody,
	              requestUrl,
	              requestContentType
            ),
            spanId: requestSpan?.spanId,
            traceId: requestSpan?.traceId,
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
  parentSpanId?: string
  spanId?: string
  status: number
  traceId?: string
  transport: "fetch" | "xhr"
  url: string
}): RequestPerformanceEventPayload {
  return {
    duration: params.duration,
    method: params.method,
    parentSpanId: params.parentSpanId,
    spanId: params.spanId,
    status: params.status,
    timestamp: now(),
    traceId: params.traceId,
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

function applyTraceparent(
  input: RequestInfo | URL,
  init?: RequestInit,
  spanId?: string
): {
  input: RequestInfo | URL
  init?: RequestInit
} {
  const requestUrl = resolveRequestUrl(input)
  const traceparent = getTraceparent(requestUrl, spanId)
  if (!traceparent) return { input, init }

  const headers = new Headers(
    init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined)
  )
  headers.set("traceparent", traceparent)

  if (typeof Request !== "undefined" && input instanceof Request && !init) {
    return {
      input: new Request(input, { headers }),
      init: undefined
    }
  }

  return {
    input,
    init: {
      ...(init ?? {}),
      headers
    }
  }
}

function resolveRequestContentType(
  input: RequestInfo | URL,
  init?: RequestInit
): string | undefined {
  const initContentType = resolveContentType(init?.headers)
  if (initContentType) return initContentType
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.headers.get("content-type") ?? undefined
  }
  return undefined
}

function createRequestBodyReader(
  input: RequestInfo | URL,
  init?: RequestInit
): (() => Promise<unknown | undefined>) | undefined {
  if (init?.body !== undefined) {
    return createMemoizedRequestBodyReader(() =>
      normalizeCapturedRequestBody(init.body, resolveContentType(init.headers))
    )
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    if (input.body === null || input.bodyUsed) return undefined

    const clonedRequest = input.clone()
    return createMemoizedRequestBodyReader(() =>
      normalizeRequestTextBody(
        clonedRequest.text(),
        clonedRequest.headers.get("content-type")
      )
    )
  }

  return undefined
}
