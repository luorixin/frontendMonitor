import { state } from "../context"
import { recordBreadcrumb } from "../breadcrumb"
import { enqueueEvent } from "../queue"
import { debugLog } from "../queue"
import type { ConsoleErrorEventPayload } from "../types"
import { now, safeStringify } from "../utils"

export function initConsoleErrorCapture(): Array<() => void> {
  if (!state.options?.capture.consoleError) return []

  const original = console.error
  state.consoleErrorOriginal = original

  console.error = (...args: unknown[]) => {
    original.apply(console, args)

    if (!state.initialized) return

    const stringified = args.map(arg =>
      typeof arg === "string" ? arg : safeStringify(arg)
    )

    recordBreadcrumb({
      data: {
        args: stringified
      },
      level: "error",
      message: stringified.join(" | "),
      type: "console"
    })

    enqueueEvent({
      args: stringified,
      timestamp: now(),
      type: "console_error",
      url: window.location.href
    })

    if (state.options?.debug) {
      debugLog("capture console.error", { args: stringified })
    }
  }

  return [
    () => {
      if (state.consoleErrorOriginal) {
        console.error = state.consoleErrorOriginal
        state.consoleErrorOriginal = null
      }
    }
  ]
}
