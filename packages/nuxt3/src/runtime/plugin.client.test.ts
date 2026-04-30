import { beforeEach, describe, expect, it, vi } from "vitest"

const defineNuxtPluginMock = vi.fn((plugin: unknown) => plugin)
const useMock = vi.fn()

vi.mock("#app", () => ({
  defineNuxtPlugin: defineNuxtPluginMock
}))

vi.mock("frontend-monitor-vue3", () => ({
  default: "WebTracingPlugin"
}))

describe("frontend-monitor-nuxt3 runtime plugin", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("installs the vue3 plugin when public config includes dsn", async () => {
    const plugin = (await import("./plugin.client")).default as (
      nuxtApp: {
        $config?: {
          public?: Record<string, unknown>
        }
        vueApp: {
          use: typeof useMock
        }
      }
    ) => void

    plugin({
      $config: {
        public: {
          frontendMonitor: {
            appName: "nuxt3-app",
            dsn: "/collect"
          }
        }
      },
      vueApp: {
        use: useMock
      }
    })

    expect(useMock).toHaveBeenCalledWith("WebTracingPlugin", {
      appName: "nuxt3-app",
      dsn: "/collect"
    })
  })

  it("skips installation when dsn is missing", async () => {
    const plugin = (await import("./plugin.client")).default as (
      nuxtApp: {
        $config?: {
          public?: Record<string, unknown>
        }
        vueApp: {
          use: typeof useMock
        }
      }
    ) => void

    plugin({
      $config: {
        public: {
          frontendMonitor: {
            appName: "nuxt3-app"
          }
        }
      },
      vueApp: {
        use: useMock
      }
    })

    expect(useMock).not.toHaveBeenCalled()
  })
})
