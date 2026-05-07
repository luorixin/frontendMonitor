import { addCleanup, state } from "./context"
import { initClickCapture } from "./capture/click"
import { initConsoleErrorCapture } from "./capture/console-error"
import { initErrorCapture } from "./capture/error"
import { initFetchCapture, restoreFetchCapture } from "./capture/fetch"
import { initNetworkStatusCapture } from "./capture/network-status"
import { initPageExitCapture } from "./capture/page-exit"
import { initPerformanceCapture } from "./capture/performance"
import {
  initNavigationCapture,
  restoreNavigationCapture
} from "./capture/navigation"
import { initXHRCapture, restoreXHRCapture } from "./capture/xhr"
import { enqueueEvent } from "./queue"
import { initSessionReplay } from "./replay"
import type {
  MonitorIntegration,
  MonitorIntegrationCleanup,
  MonitorIntegrationContext,
  MonitorOptions
} from "./types"

export class ConsoleErrorIntegration implements MonitorIntegration {
  name = "console-error"

  setup(): MonitorIntegrationCleanup[] {
    return initConsoleErrorCapture()
  }
}

export class JSErrorIntegration implements MonitorIntegration {
  name = "js-error"

  setup(): MonitorIntegrationCleanup[] {
    return initErrorCapture()
  }
}

export class FetchIntegration implements MonitorIntegration {
  name = "fetch"

  setup(): MonitorIntegrationCleanup {
    initFetchCapture()
    return restoreFetchCapture
  }
}

export class XHRIntegration implements MonitorIntegration {
  name = "xhr"

  setup(): MonitorIntegrationCleanup {
    initXHRCapture()
    return restoreXHRCapture
  }
}

export class NavigationIntegration implements MonitorIntegration {
  name = "navigation"

  setup(): MonitorIntegrationCleanup {
    initNavigationCapture()
    return restoreNavigationCapture
  }
}

export class PageExitIntegration implements MonitorIntegration {
  name = "page-exit"

  setup(): void {
    initPageExitCapture()
  }
}

export class NetworkStatusIntegration implements MonitorIntegration {
  name = "network-status"

  setup(): void {
    initNetworkStatusCapture()
  }
}

export class SessionReplayIntegration implements MonitorIntegration {
  name = "session-replay"

  setup(): void {
    initSessionReplay()
  }
}

export class PerformanceIntegration implements MonitorIntegration {
  name = "performance"

  setup(): void {
    if (state.options?.capture.performance) {
      initPerformanceCapture()
    }
  }
}

export class ClickIntegration implements MonitorIntegration {
  name = "click"

  setup(): void {
    initClickCapture()
  }
}

export function getDefaultIntegrations(): MonitorIntegration[] {
  return [
    new ConsoleErrorIntegration(),
    new JSErrorIntegration(),
    new FetchIntegration(),
    new XHRIntegration(),
    new NavigationIntegration(),
    new PageExitIntegration(),
    new NetworkStatusIntegration(),
    new SessionReplayIntegration(),
    new PerformanceIntegration(),
    new ClickIntegration()
  ]
}

export function registerIntegration(integration: MonitorIntegration): void {
  if (!state.initialized || !state.options) return
  if (state.integrations.some(item => item.name === integration.name)) return

  if (!state.options.integrations.some(item => item.name === integration.name)) {
    state.options.integrations = [...state.options.integrations, integration]
  }
  state.integrations.push(integration)
  const context = createIntegrationContext()
  const cleanup = integration.setup(context)
  for (const handler of normalizeIntegrationCleanup(cleanup)) {
    addCleanup(handler)
  }
}

export function resolveIntegrations(
  options: MonitorOptions
): MonitorIntegration[] {
  const resolved = [...getDefaultIntegrations(), ...(options.integrations ?? [])]
  const deduped = new Map<string, MonitorIntegration>()

  for (const integration of resolved) {
    deduped.set(integration.name, integration)
  }

  return Array.from(deduped.values())
}

function createIntegrationContext(): MonitorIntegrationContext {
  if (!state.options) {
    throw new Error("frontend-monitor has not been initialized")
  }

  return {
    addCleanup,
    emit: enqueueEvent,
    options: state.options
  }
}

function normalizeIntegrationCleanup(
  cleanup:
    | void
    | MonitorIntegrationCleanup
    | MonitorIntegrationCleanup[]
): MonitorIntegrationCleanup[] {
  if (!cleanup) return []
  return Array.isArray(cleanup) ? cleanup : [cleanup]
}
