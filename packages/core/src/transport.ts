import type {
  MonitorPayload,
  SendPayloadOptions,
  TransportResult
} from "./types"
import { safeStringify } from "./utils"

const BEACON_LIMIT = 60 * 1024
const IMAGE_LIMIT = 1800

export async function sendPayload(
  dsn: string,
  payload: MonitorPayload,
  options: SendPayloadOptions = {}
): Promise<TransportResult> {
  const body = safeStringify(payload)

  if (options.maxPayloadBytes !== undefined && body.length > options.maxPayloadBytes) {
    return {
      reason: "payload_too_large",
      success: false,
      transport: "xhr"
    }
  }

  if (options.preferBeacon) {
    const beaconResult = trySendBeacon(dsn, body)
    if (beaconResult.success) {
      return beaconResult
    }
  }

  if (body.length <= IMAGE_LIMIT) {
    const imageResult = await trySendImage(dsn, body)
    if (imageResult.success) {
      return imageResult
    }
  }

  if (!options.preferBeacon && body.length <= BEACON_LIMIT) {
    const beaconResult = trySendBeacon(dsn, body)
    if (beaconResult.success) {
      return beaconResult
    }
  }

  return sendByXHR(dsn, body, options.timeout)
}

function trySendBeacon(dsn: string, body: string): TransportResult {
  if (typeof navigator.sendBeacon !== "function") {
    return {
      success: false,
      transport: "beacon"
    }
  }

  const sent = navigator.sendBeacon(
    dsn,
    new Blob([body], { type: "application/json" })
  )

  return {
    success: sent,
    transport: "beacon"
  }
}

function trySendImage(dsn: string, body: string): Promise<TransportResult> {
  if (typeof Image !== "function") {
    return Promise.resolve({
      success: false,
      transport: "image"
    })
  }

  return new Promise(resolve => {
    const image = new Image()
    const finalize = (success: boolean) => {
      image.onload = null
      image.onerror = null
      resolve({
        success,
        transport: "image"
      })
    }

    image.onload = () => finalize(true)
    image.onerror = () => finalize(false)
    image.src = buildImageRequestUrl(dsn, body)
  })
}

function sendByXHR(
  dsn: string,
  body: string,
  timeout?: number
): Promise<TransportResult> {
  if (typeof XMLHttpRequest !== "function") {
    return Promise.resolve({
      success: false,
      transport: "xhr"
    })
  }

  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()

    xhr.open("POST", dsn, true)
    xhr.setRequestHeader("content-type", "application/json")
    if (timeout && timeout > 0) {
      xhr.timeout = timeout
    }
    xhr.onloadend = () => {
      resolve({
        status: xhr.status,
        success: xhr.status >= 200 && xhr.status < 300,
        transport: "xhr"
      })
    }
    xhr.onerror = () => {
      resolve({
        success: false,
        transport: "xhr",
        reason: "network_error"
      })
    }
    xhr.ontimeout = () => {
      resolve({
        success: false,
        transport: "xhr",
        reason: "network_error"
      })
    }
    xhr.send(body)
  })
}

function buildImageRequestUrl(dsn: string, body: string): string {
  const url = new URL(dsn, window.location.href)
  url.searchParams.set("data", body)
  return url.toString()
}
