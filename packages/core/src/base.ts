import { SDK_VERSION } from "./config"
import { state } from "./context"
import type { BasePayload, MonitorEvent, MonitorPayload } from "./types"
import { now } from "./utils"

export function buildBasePayload(): BasePayload {
  const options = state.options

  if (!options) {
    throw new Error("frontend-monitor has not been initialized")
  }

  return {
    appName: options.appName,
    appVersion: options.appVersion,
    breadcrumbs: state.breadcrumbs.length > 0 ? [...state.breadcrumbs] : undefined,
    contexts: Object.keys(state.contexts).length > 0 ? { ...state.contexts } : undefined,
    deviceId: state.deviceId,
    environment: options.environment,
    pageId: state.pageId,
    replayId: state.replayId ?? undefined,
    release: options.release,
    sdkVersion: SDK_VERSION,
    sessionId: state.sessionId,
    tags: Object.keys(state.tags).length > 0 ? { ...state.tags } : undefined,
    timestamp: now(),
    title: document.title,
    url: window.location.href,
    userAgent: window.navigator.userAgent,
    userId: options.userId,
    viewport: {
      height: window.innerHeight,
      width: window.innerWidth
    }
  }
}

export function buildPayload(events: MonitorEvent[]): MonitorPayload {
  return {
    base: buildBasePayload(),
    events
  }
}

export function getCurrentRoute(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}
