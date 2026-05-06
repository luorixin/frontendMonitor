import {
  addBreadcrumb,
  captureError,
  clearContext,
  flush,
  flushSessionReplay,
  getReplayId,
  getOptions,
  init,
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
  sendLocal,
  setContext,
  setEnvironment,
  setRelease,
  setTag,
  setUser,
  stopReplay,
  track
} from "frontend-monitor-core"
import type { MonitorOptions } from "frontend-monitor-core"
import { inject } from "vue"
import type { App, Plugin } from "vue"

const WEB_TRACING_KEY = Symbol("frontend-monitor-vue3")

export type Vue3TracingPluginOptions = MonitorOptions & {
  captureVueErrors?: boolean
}

type WebTracingApi = {
  captureError: typeof captureError
  addBreadcrumb: typeof addBreadcrumb
  clearContext: typeof clearContext
  flush: typeof flush
  flushSessionReplay: typeof flushSessionReplay
  getReplayId: typeof getReplayId
  getOptions: typeof getOptions
  init: typeof init
  intersectionDisconnect: typeof intersectionDisconnect
  intersectionObserver: typeof intersectionObserver
  intersectionUnobserve: typeof intersectionUnobserve
  sendLocal: typeof sendLocal
  setContext: typeof setContext
  setEnvironment: typeof setEnvironment
  setRelease: typeof setRelease
  setTag: typeof setTag
  setUser: typeof setUser
  stopReplay: typeof stopReplay
  track: typeof track
}

const tracingApi: WebTracingApi = {
  captureError,
  addBreadcrumb,
  clearContext,
  flush,
  flushSessionReplay,
  getReplayId,
  getOptions,
  init,
  intersectionDisconnect,
  intersectionObserver,
  intersectionUnobserve,
  sendLocal,
  setContext,
  setEnvironment,
  setRelease,
  setTag,
  setUser,
  stopReplay,
  track
}

export function createWebTracingPlugin(
  options: Vue3TracingPluginOptions
): Plugin<Vue3TracingPluginOptions> {
  return {
    install(app: App): void {
      init(options)
      app.provide(WEB_TRACING_KEY, tracingApi)

      if (options.captureVueErrors === false) return

      const originalErrorHandler = app.config.errorHandler

      app.config.errorHandler = (error, instance, info) => {
        captureError(error, {
          framework: "vue3",
          info
        })

        originalErrorHandler?.(error, instance, info)
      }
    }
  }
}

const WebTracingPlugin: Plugin<Vue3TracingPluginOptions> = {
  install(app: App, options?: Vue3TracingPluginOptions): void {
    if (!options) {
      throw new Error("frontend-monitor vue3 plugin requires options")
    }

    createWebTracingPlugin(options).install(app)
  }
}

export function useWebTracing(): WebTracingApi {
  return inject(WEB_TRACING_KEY, tracingApi)
}

export default WebTracingPlugin

export * from "frontend-monitor-core"
