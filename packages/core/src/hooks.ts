import { state } from "./context"
import type { BeforeSendHandler, MonitorPayload } from "./types"

export function registerBeforeSend(handler: BeforeSendHandler): void {
  state.hooks.push(handler)
}

export function runBeforeSendHooks(
  payload: MonitorPayload
): MonitorPayload | false {
  let currentPayload: MonitorPayload | false = payload

  for (const hook of state.hooks) {
    if (currentPayload === false) return false
    currentPayload = hook(currentPayload)
  }

  return currentPayload
}
