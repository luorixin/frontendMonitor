import { state } from "../core/context"
import { scheduleOfflineReplay } from "../storage/offline"
import { debugLog } from "../pipeline/queue"
import { flushReplayQueue } from "../pipeline/replay"

export function initNetworkStatusCapture(): void {
  const onOnline = () => {
    state.networkStatus = "online"
    debugLog("network status: online")
    scheduleOfflineReplay()
    void flushReplayQueue()
  }

  const onOffline = () => {
    state.networkStatus = "offline"
    debugLog("network status: offline")
  }

  window.addEventListener("online", onOnline)
  window.addEventListener("offline", onOffline)

  state.cleanups.push(() => {
    window.removeEventListener("online", onOnline)
    window.removeEventListener("offline", onOffline)
  })
}
