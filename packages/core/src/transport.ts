import { state } from "./context"
import type { MonitorPayload, TransportResult } from "./types"
import { safeStringify } from "./utils"

const BEACON_LIMIT = 60 * 1024

export async function sendPayload(
  dsn: string,
  payload: MonitorPayload
): Promise<TransportResult> {
  const body = safeStringify(payload)

  if (
    typeof navigator.sendBeacon === "function" &&
    body.length <= BEACON_LIMIT
  ) {
    const sent = navigator.sendBeacon(
      dsn,
      new Blob([body], { type: "application/json" })
    )

    if (sent) {
      return {
        success: true,
        transport: "beacon"
      }
    }
  }

  const fetchImpl = state.originalFetch ?? window.fetch.bind(window)

  try {
    const response = await fetchImpl(dsn, {
      body,
      headers: {
        "content-type": "application/json"
      },
      keepalive: true,
      method: "POST"
    })

    return {
      status: response.status,
      success: response.ok,
      transport: "fetch"
    }
  } catch {
    return {
      success: false,
      transport: "fetch"
    }
  }
}
