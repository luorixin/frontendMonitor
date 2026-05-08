import { addCleanup, state } from "../core/context"
import { enqueueEvent } from "../pipeline/queue"
import type {
  MonitorIntegration,
  MonitorIntegrationCleanup,
  MonitorIntegrationContext
} from "../core/types"

export function dedupeIntegrations(
  integrations: MonitorIntegration[]
): MonitorIntegration[] {
  const deduped = new Map<string, MonitorIntegration>()

  for (const integration of integrations) {
    deduped.set(integration.name, integration)
  }

  return Array.from(deduped.values())
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
