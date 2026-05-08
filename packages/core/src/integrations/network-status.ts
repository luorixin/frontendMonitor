import { initNetworkStatusCapture } from "../capture/network-status"
import type { MonitorIntegration } from "../core/types"

export class NetworkStatusIntegration implements MonitorIntegration {
  name = "network-status"

  setup(): void {
    initNetworkStatusCapture()
  }
}
