import { state } from "../core/context"
import { recordBreadcrumb } from "../pipeline/breadcrumb"
import { enqueueEvent } from "../pipeline/queue"
import { matchesIgnoreRule, now } from "../utils"
import { createRequestErrorEvent } from "./request-event"
import type { RequestPerformanceEventPayload } from "../core/types"
import { createRequestSpan, getTraceparent } from "../core/trace"
import {
  createMemoizedRequestBodyReader,
  normalizeCapturedRequestBody,
  readRequestBodySafely
} from "./request-body"

type XHRMeta = {
  headers: Record<string, string>
  method: string
  requestBodyReader?: () => Promise<unknown | undefined>
  url: string
}

const META_KEY = "__frontendMonitorXhrMeta__"

type InstrumentedXHR = XMLHttpRequest & {
  [META_KEY]?: XHRMeta
}

export function initXHRCapture(): void {
  if (
    !state.options?.capture.xhrError &&
    !state.options?.capture.requestPerformance &&
    !state.options?.trace.propagateTraceparent
  ) return
  if (typeof XMLHttpRequest === "undefined") return
  if (
    state.originalXHROpen ||
    state.originalXHRSend ||
    state.originalXHRSetRequestHeader
  ) return

  state.originalXHROpen = XMLHttpRequest.prototype.open
  state.originalXHRSend = XMLHttpRequest.prototype.send
  state.originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...args: unknown[]
  ): void {
    const xhr = this as InstrumentedXHR
    xhr[META_KEY] = {
      headers: {},
      method: method.toUpperCase(),
      url: String(url)
    }

    state.originalXHROpen!.call(this, method, url, ...args)
  }

  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string
  ): void {
    const xhr = this as InstrumentedXHR
    xhr[META_KEY] ??= {
      headers: {},
      method: "GET",
      url: ""
    }
    xhr[META_KEY]!.headers[name.toLowerCase()] = value
    state.originalXHRSetRequestHeader!.call(this, name, value)
  }

  XMLHttpRequest.prototype.send = function (...args: unknown[]): void {
    const xhr = this as InstrumentedXHR
    const meta = xhr[META_KEY]

    if (!meta || matchesIgnoreRule(meta.url, state.options?.ignoreUrls ?? [])) {
      state.originalXHRSend!.call(this, ...(args as []))
      return
    }

    const startedAt = now()
    let terminalErrorMessage: string | undefined
    const requestSpan = createRequestSpan(`${meta.method} ${meta.url}`, {
      op: "http.client"
    })
    meta.requestBodyReader = createMemoizedRequestBodyReader(() =>
      normalizeCapturedRequestBody(args[0], meta.headers["content-type"])
    )

    const onError = () => {
      terminalErrorMessage = "XMLHttpRequest network error"
    }

    const onTimeout = () => {
      terminalErrorMessage = "XMLHttpRequest timeout"
    }

    const onAbort = () => {
      terminalErrorMessage = "XMLHttpRequest aborted"
    }

    const onLoadEnd = async () => {
      xhr.removeEventListener("error", onError)
      xhr.removeEventListener("timeout", onTimeout)
      xhr.removeEventListener("abort", onAbort)
      xhr.removeEventListener("loadend", onLoadEnd)

      const duration = now() - startedAt
      const status = typeof xhr.status === "number" ? xhr.status : undefined
      const isError =
        terminalErrorMessage !== undefined ||
        status === 0 ||
        (status !== undefined && status >= 400)

      if (isError) {
        recordBreadcrumb({
          data: {
            method: meta.method,
            status,
            url: meta.url
          },
          level: "error",
          message: `${meta.method} ${meta.url} failed${status ? ` with ${status}` : ""}`,
          type: "request"
        })
        enqueueEvent(
	          createRequestErrorEvent({
	            duration,
	            errorMessage: terminalErrorMessage,
	            method: meta.method,
	            parentSpanId: requestSpan?.parentSpanId,
	            requestBody: await readRequestBodySafely(
	              meta.requestBodyReader,
	              meta.url,
	              meta.headers["content-type"]
	            ),
	            status,
	            spanId: requestSpan?.spanId,
	            traceId: requestSpan?.traceId,
	            transport: "xhr",
            url: meta.url
          })
        )
      } else if (state.options?.capture.requestPerformance && status !== undefined) {
        const perfEvent: RequestPerformanceEventPayload = {
          duration,
          method: meta.method,
          parentSpanId: requestSpan?.parentSpanId,
          spanId: requestSpan?.spanId,
          status,
          timestamp: now(),
          traceId: requestSpan?.traceId,
          transport: "xhr",
          type: "request_performance",
          url: meta.url
        }
        enqueueEvent(perfEvent)
      }
    }

    xhr.addEventListener("error", onError)
    xhr.addEventListener("timeout", onTimeout)
    xhr.addEventListener("abort", onAbort)
    xhr.addEventListener("loadend", onLoadEnd)

    const traceparent = getTraceparent(meta.url, requestSpan?.spanId)
    if (traceparent) {
      xhr.setRequestHeader("traceparent", traceparent)
    }

    state.originalXHRSend!.call(this, ...(args as []))
  }
}

export function restoreXHRCapture(): void {
  if (typeof XMLHttpRequest === "undefined") return

  if (state.originalXHROpen) {
    XMLHttpRequest.prototype.open = state.originalXHROpen
    state.originalXHROpen = null
  }

  if (state.originalXHRSend) {
    XMLHttpRequest.prototype.send = state.originalXHRSend
    state.originalXHRSend = null
  }

  if (state.originalXHRSetRequestHeader) {
    XMLHttpRequest.prototype.setRequestHeader = state.originalXHRSetRequestHeader
    state.originalXHRSetRequestHeader = null
  }
}
