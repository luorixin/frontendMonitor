import { initClickCapture } from "../capture/click"
import type { MonitorIntegration } from "../core/types"

export class ClickIntegration implements MonitorIntegration {
  name = "click"

  setup(): void {
    initClickCapture()
  }
}
