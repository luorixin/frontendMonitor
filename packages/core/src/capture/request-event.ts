import type { RequestEventPayload } from "../types"
import { now } from "../utils"

export function createRequestErrorEvent(input: {
  duration: number
  errorMessage?: string
  method: string
  status?: number
  transport: "fetch" | "xhr"
  url: string
}): RequestEventPayload {
  return {
    duration: input.duration,
    errorMessage: input.errorMessage,
    method: input.method,
    status: input.status,
    timestamp: now(),
    transport: input.transport,
    type: "request_error",
    url: input.url
  }
}
