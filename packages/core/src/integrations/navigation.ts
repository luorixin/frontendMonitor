import {
  initNavigationCapture,
  restoreNavigationCapture
} from "../capture/navigation"
import type { MonitorIntegration, MonitorIntegrationCleanup } from "../core/types"

export class NavigationIntegration implements MonitorIntegration {
  name = "navigation"

  setup(): MonitorIntegrationCleanup {
    initNavigationCapture()
    return restoreNavigationCapture
  }
}
