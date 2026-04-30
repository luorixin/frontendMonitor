import { addPlugin, addTemplate, createResolver, defineNuxtModule } from "@nuxt/kit"
import type { MonitorOptions } from "@frontend-monitor/core"

export type Nuxt3TracingModuleOptions = MonitorOptions & {
  captureVueErrors?: boolean
}

export default defineNuxtModule<Nuxt3TracingModuleOptions>({
  defaults: {
    captureVueErrors: true
  } as Nuxt3TracingModuleOptions,
  meta: {
    configKey: "frontendMonitor",
    name: "@frontend-monitor/nuxt3"
  },
  setup(moduleOptions, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.frontendMonitor = {
      ...(nuxt.options.runtimeConfig.public.frontendMonitor as Record<string, unknown> | undefined),
      ...moduleOptions
    }

    addTemplate({
      filename: "frontend-monitor.options.mjs",
      getContents: () => `export default ${JSON.stringify(moduleOptions, null, 2)}`
    })

    addPlugin({
      mode: "client",
      src: resolver.resolve("./runtime/plugin.client")
    })
  }
})

export * from "@frontend-monitor/core"
