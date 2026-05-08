import { initFetchCapture, restoreFetchCapture } from "../capture/fetch"
import type { MonitorIntegration, MonitorIntegrationCleanup } from "../core/types"

export class FetchIntegration implements MonitorIntegration {
  name = "fetch"

  setup(): MonitorIntegrationCleanup {
    initFetchCapture()
    return restoreFetchCapture
  }
}
