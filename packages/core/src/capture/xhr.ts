import { state } from "../context"
import { enqueueEvent } from "../queue"
import { matchesIgnoreRule, now } from "../utils"
import { createRequestErrorEvent } from "./request-event"
import type { RequestPerformanceEventPayload } from "../types"

type XHRMeta = {
  method: string
  url: string
}

const META_KEY = "__frontendMonitorXhrMeta__"

type InstrumentedXHR = XMLHttpRequest & {
  [META_KEY]?: XHRMeta
}

export function initXHRCapture(): void {
  if (!state.options?.capture.xhrError && !state.options?.capture.requestPerformance) return
  if (typeof XMLHttpRequest === "undefined") return
  if (state.originalXHROpen || state.originalXHRSend) return

  state.originalXHROpen = XMLHttpRequest.prototype.open
  state.originalXHRSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...args: unknown[]
  ): void {
    const xhr = this as InstrumentedXHR
    xhr[META_KEY] = {
      method: method.toUpperCase(),
      url: String(url)
    }

    state.originalXHROpen!.call(this, method, url, ...(args as []))
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

    const onError = () => {
      terminalErrorMessage = "XMLHttpRequest network error"
    }

    const onTimeout = () => {
      terminalErrorMessage = "XMLHttpRequest timeout"
    }

    const onAbort = () => {
      terminalErrorMessage = "XMLHttpRequest aborted"
    }

    const onLoadEnd = () => {
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
        enqueueEvent(
          createRequestErrorEvent({
            duration,
            errorMessage: terminalErrorMessage,
            method: meta.method,
            status,
            transport: "xhr",
            url: meta.url
          })
        )
      } else if (state.options?.capture.requestPerformance && status !== undefined) {
        const perfEvent: RequestPerformanceEventPayload = {
          duration,
          method: meta.method,
          status,
          timestamp: now(),
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
}
