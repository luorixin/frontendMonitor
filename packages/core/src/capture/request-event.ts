import type { RequestEventPayload } from "../core/types"
import { now } from "../utils"

export function createRequestErrorEvent(input: {
  duration: number
  errorMessage?: string
  method: string
  parentSpanId?: string
  requestBody?: unknown
  status?: number
  spanId?: string
  transport: "fetch" | "xhr"
  traceId?: string
  url: string
}): RequestEventPayload {
  return {
    duration: input.duration,
    errorMessage: input.errorMessage,
    method: input.method,
    parentSpanId: input.parentSpanId,
    requestBody: input.requestBody,
    spanId: input.spanId,
    status: input.status,
    timestamp: now(),
    traceId: input.traceId,
    transport: input.transport,
    type: "request_error",
    url: input.url
  }
}
