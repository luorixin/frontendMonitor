import WebTracingPlugin from "@frontend-monitor/vue3"
import { defineNuxtPlugin } from "#app"

export default defineNuxtPlugin(nuxtApp => {
  const options =
    (nuxtApp.$config?.public?.frontendMonitor as Record<string, unknown>) ?? null

  if (!options || typeof options !== "object" || !("dsn" in options)) {
    return
  }

  nuxtApp.vueApp.use(WebTracingPlugin, options)
})
