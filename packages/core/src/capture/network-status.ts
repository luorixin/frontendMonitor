import { state } from "../context"
import { scheduleOfflineReplay } from "../offline"
import { debugLog } from "../queue"

export function initNetworkStatusCapture(): void {
  const onOnline = () => {
    state.networkStatus = "online"
    debugLog("network status: online")
    scheduleOfflineReplay()
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
