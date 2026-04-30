import { getCurrentRoute } from "../base"
import { addCleanup, state } from "../context"
import { enqueueEvent } from "../queue"
import type { PageViewEventPayload, RouteChangeEventPayload } from "../types"
import { now } from "../utils"

export function initNavigationCapture(): void {
  const currentRoute = getCurrentRoute()
  state.currentRoute = currentRoute

  if (state.options?.capture.pageView) {
    enqueueEvent(createPageViewEvent(currentRoute), true)
  }

  if (!state.options?.capture.routeChange) return

  const onHashChange = () => emitRouteChange("hashchange")
  const onPopState = () => emitRouteChange("popstate")

  window.addEventListener("hashchange", onHashChange)
  window.addEventListener("popstate", onPopState)

  addCleanup(() => {
    window.removeEventListener("hashchange", onHashChange)
    window.removeEventListener("popstate", onPopState)
  })

  patchHistoryMethod("pushState")
  patchHistoryMethod("replaceState")
}

export function restoreNavigationCapture(): void {
  if (state.originalPushState) {
    history.pushState = state.originalPushState
    state.originalPushState = null
  }

  if (state.originalReplaceState) {
    history.replaceState = state.originalReplaceState
    state.originalReplaceState = null
  }
}

function patchHistoryMethod(
  methodName: "pushState" | "replaceState"
): void {
  const originalMethod =
    methodName === "pushState"
      ? history.pushState
      : history.replaceState

  if (methodName === "pushState" && !state.originalPushState) {
    state.originalPushState = originalMethod
  }

  if (methodName === "replaceState" && !state.originalReplaceState) {
    state.originalReplaceState = originalMethod
  }

  history[methodName] = ((...args: Parameters<History["pushState"]>) => {
    originalMethod.apply(history, args)
    emitRouteChange(methodName)
  }) as History["pushState"]
}

function emitRouteChange(
  trigger: RouteChangeEventPayload["trigger"]
): void {
  const nextRoute = getCurrentRoute()
  const previousRoute = state.currentRoute

  if (!previousRoute || previousRoute === nextRoute) return

  enqueueEvent({
    from: previousRoute,
    timestamp: now(),
    to: nextRoute,
    trigger,
    type: "route_change",
    url: window.location.href
  })

  state.currentRoute = nextRoute
}

function createPageViewEvent(currentRoute: string): PageViewEventPayload {
  return {
    from: null,
    timestamp: now(),
    to: currentRoute,
    trigger: "load",
    type: "page_view",
    url: window.location.href
  }
}
