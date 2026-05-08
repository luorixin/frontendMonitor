import { initErrorCapture } from "../capture/error"
import type { MonitorIntegration, MonitorIntegrationCleanup } from "../core/types"

export class JSErrorIntegration implements MonitorIntegration {
  name = "js-error"

  setup(): MonitorIntegrationCleanup[] {
    return initErrorCapture()
  }
}
