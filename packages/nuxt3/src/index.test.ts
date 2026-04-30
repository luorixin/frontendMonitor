import { beforeEach, describe, expect, it, vi } from "vitest"

const addPluginMock = vi.fn()
const addTemplateMock = vi.fn()
const createResolverMock = vi.fn(() => ({
  resolve: (...segments: string[]) => segments.join("/")
}))

vi.mock("frontend-monitor-core", () => ({}))

vi.mock("@nuxt/kit", () => ({
  addPlugin: addPluginMock,
  addTemplate: addTemplateMock,
  createResolver: createResolverMock,
  defineNuxtModule: (definition: unknown) => definition
}))

describe("frontend-monitor-nuxt3", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("registers a client plugin and injects runtime config", async () => {
    const moduleDefinition = (await import("./index")).default as {
      setup: (
        options: Record<string, unknown>,
        nuxt: {
          options: {
            runtimeConfig: {
              public: Record<string, unknown>
            }
          }
        }
      ) => void
    }

    const nuxt = {
      options: {
        runtimeConfig: {
          public: {}
        }
      }
    }

    moduleDefinition.setup(
      {
        appName: "nuxt3-app",
        captureVueErrors: true,
        dsn: "/collect"
      },
      nuxt
    )

    expect(nuxt.options.runtimeConfig.public.frontendMonitor).toEqual({
      appName: "nuxt3-app",
      captureVueErrors: true,
      dsn: "/collect"
    })
    expect(addTemplateMock).toHaveBeenCalledTimes(1)
    expect(addPluginMock).toHaveBeenCalledWith({
      mode: "client",
      src: "./runtime/plugin.client"
    })
  })
})
