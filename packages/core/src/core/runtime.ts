import { getCurrentRoute } from "./base"
import { normalizeOptions } from "./config"
import { restoreExposureCapture } from "../capture/exposure"
import { initDeviceId, resolveSessionId } from "../capture/identity"
import { clearCleanups, resetState, state } from "./context"
import { registerIntegration } from "../api/integration-registry"
import { seedInitHooks } from "../api/manual"
import { clearQueue } from "../pipeline/queue"
import { initTraceContext } from "./trace"
import type { MonitorIntegration, MonitorOptions } from "./types"
import { uuid } from "../utils"

export function initializeMonitor(
  options: MonitorOptions,
  integrations: MonitorIntegration[]
): void {
  if (state.initialized) return
  if (typeof window === "undefined" || typeof document === "undefined") return

  state.options = normalizeOptions(options)
  state.deviceId = initDeviceId()
  state.sessionId = resolveSessionId()
  state.pageId = uuid()
  state.pageStartTime = Date.now()
  state.currentRoute = getCurrentRoute()
  state.initialized = true
  initTraceContext()

  seedInitHooks(options)
  state.options.integrations = integrations
  for (const integration of integrations) {
    registerIntegration(integration)
  }
}

export function destroyMonitor(): void {
  clearQueue()
  clearCleanups()
  restoreExposureCapture()
  resetState()
}
