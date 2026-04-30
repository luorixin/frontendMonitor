import { state } from "./context"
import type {
  AfterSendHandler,
  BeforePushEventHandler,
  BeforeSendHandler,
  MonitorEvent,
  MonitorPayload,
  TransportResult
} from "./types"
import { sanitizeValue } from "./utils"

export function registerBeforePushEvent(
  handler: BeforePushEventHandler
): void {
  state.beforePushEventHooks.push(handler)
}

export function registerBeforeSend(handler: BeforeSendHandler): void {
  state.beforeSendHooks.push(handler)
}

export function registerAfterSend(handler: AfterSendHandler): void {
  state.afterSendHooks.push(handler)
}

export function runBeforePushEventHooks(
  event: MonitorEvent
): MonitorEvent | MonitorEvent[] | false {
  let current: MonitorEvent | MonitorEvent[] | false = event

  for (const hook of state.beforePushEventHooks) {
    if (current === false) return false
    current = hook(current as MonitorEvent)
  }

  return current
}

export function runBeforeSendHooks(
  payload: MonitorPayload
): MonitorPayload | false {
  let currentPayload: MonitorPayload | false = sanitizePayload(payload)

  for (const hook of state.beforeSendHooks) {
    if (currentPayload === false) return false
    currentPayload = hook(currentPayload)
  }

  return currentPayload
}

export function runAfterSendHooks(
  result: TransportResult,
  payload: MonitorPayload
): void {
  for (const hook of state.afterSendHooks) {
    hook(result, payload)
  }
}

function sanitizePayload(payload: MonitorPayload): MonitorPayload {
  return sanitizeValue(payload) as MonitorPayload
}
