import { dedupeIntegrations } from "./integration-registry"
import { ClickIntegration } from "../integrations/click"
import { ConsoleErrorIntegration } from "../integrations/console-error"
import { FetchIntegration } from "../integrations/fetch"
import { JSErrorIntegration } from "../integrations/js-error"
import { NavigationIntegration } from "../integrations/navigation"
import { NetworkStatusIntegration } from "../integrations/network-status"
import { PageExitIntegration } from "../integrations/page-exit"
import { PerformanceIntegration } from "../integrations/performance"
import { SessionReplayIntegration } from "../integrations/session-replay"
import { XHRIntegration } from "../integrations/xhr"
import type { MonitorIntegration, MonitorOptions } from "../core/types"

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

export function resolveIntegrations(
  options: MonitorOptions
): MonitorIntegration[] {
  return dedupeIntegrations([
    ...getDefaultIntegrations(),
    ...(options.integrations ?? [])
  ])
}
