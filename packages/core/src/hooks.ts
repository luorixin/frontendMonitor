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
  let currentEvents: MonitorEvent[] = [event]

  for (const hook of state.beforePushEventHooks) {
    const nextEvents: MonitorEvent[] = []

    for (const currentEvent of currentEvents) {
      const result = hook(currentEvent)
      if (result === false) continue

      if (Array.isArray(result)) {
        nextEvents.push(...result.filter(isMonitorEvent))
      } else {
        nextEvents.push(result)
      }
    }

    if (nextEvents.length === 0) return false
    currentEvents = nextEvents
  }

  return currentEvents.length === 1 ? currentEvents[0] : currentEvents
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
  if (state.options?.sanitize.enabled === false) return payload
  return sanitizeValue(payload, undefined, state.options?.sanitize) as MonitorPayload
}

function isMonitorEvent(value: unknown): value is MonitorEvent {
  return typeof value === "object" && value !== null && "type" in value
}
