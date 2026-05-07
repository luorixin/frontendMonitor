import { state } from "./context"

export function initTraceContext(): void {
  const options = state.options?.trace
  if (!options?.enabled || options.sampleRate <= 0 || Math.random() > options.sampleRate) {
    state.traceId = null
    state.spanId = null
    return
  }

  state.traceId = randomHex(32)
  state.spanId = randomHex(16)
}

export function getTraceparent(): string | null {
  if (
    !state.options?.trace.enabled ||
    !state.options.trace.propagateTraceparent ||
    !state.traceId ||
    !state.spanId
  ) {
    return null
  }

  return `00-${state.traceId}-${state.spanId}-01`
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2))

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length)
}
