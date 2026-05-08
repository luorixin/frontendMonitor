import { beforeEach, describe, expect, it, vi } from "vitest"

const defineNuxtPluginMock = vi.fn((plugin: unknown) => plugin)
const useMock = vi.fn()

vi.mock("#app", () => ({
  defineNuxtPlugin: defineNuxtPluginMock
}))

vi.mock("frontend-monitor-vue3/lite", () => ({
  default: "WebTracingLitePlugin"
}))

describe("frontend-monitor-nuxt3 lite runtime plugin", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("installs the lite vue3 plugin when public config includes dsn", async () => {
    const plugin = (await import("./plugin.lite")).default as (
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
            dsn: "/collect",
            integrations: []
          }
        }
      },
      vueApp: {
        use: useMock
      }
    })

    expect(useMock).toHaveBeenCalledWith("WebTracingLitePlugin", {
      appName: "nuxt3-app",
      dsn: "/collect",
      integrations: []
    })
  })
})
