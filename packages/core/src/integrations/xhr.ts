import { initXHRCapture, restoreXHRCapture } from "../capture/xhr"
import type { MonitorIntegration, MonitorIntegrationCleanup } from "../core/types"

export class XHRIntegration implements MonitorIntegration {
  name = "xhr"

  setup(): MonitorIntegrationCleanup {
    initXHRCapture()
    return restoreXHRCapture
  }
}
