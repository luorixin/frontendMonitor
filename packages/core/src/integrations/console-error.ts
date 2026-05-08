import { initConsoleErrorCapture } from "../capture/console-error"
import type { MonitorIntegration, MonitorIntegrationCleanup } from "../core/types"

export class ConsoleErrorIntegration implements MonitorIntegration {
  name = "console-error"

  setup(): MonitorIntegrationCleanup[] {
    return initConsoleErrorCapture()
  }
}
