import { initPageExitCapture } from "../capture/page-exit"
import type { MonitorIntegration } from "../core/types"

export class PageExitIntegration implements MonitorIntegration {
  name = "page-exit"

  setup(): void {
    initPageExitCapture()
  }
}
