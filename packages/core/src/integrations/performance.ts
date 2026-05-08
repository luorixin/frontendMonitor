import { state } from "../core/context"
import { initPerformanceCapture } from "../capture/performance"
import type { MonitorIntegration } from "../core/types"

export class PerformanceIntegration implements MonitorIntegration {
  name = "performance"

  setup(): void {
    if (state.options?.capture.performance) {
      initPerformanceCapture()
    }
  }
}
