import { initSessionReplay } from "../pipeline/replay"
import type { MonitorIntegration } from "../core/types"

export class SessionReplayIntegration implements MonitorIntegration {
  name = "session-replay"

  setup(): void {
    initSessionReplay()
  }
}
