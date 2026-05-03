import { state } from "./context"
import type { Breadcrumb } from "./types"
import { now } from "./utils"

export function recordBreadcrumb(
  breadcrumb: Omit<Breadcrumb, "timestamp"> & { timestamp?: number }
): void {
  if (!state.options) return

  state.breadcrumbs.push({
    ...breadcrumb,
    level: breadcrumb.level ?? "info",
    timestamp: breadcrumb.timestamp ?? now(),
    type: breadcrumb.type ?? "manual"
  })

  if (state.breadcrumbs.length > state.options.maxBreadcrumbs) {
    state.breadcrumbs.splice(
      0,
      state.breadcrumbs.length - state.options.maxBreadcrumbs
    )
  }
}
