import { beforeEach, describe, expect, it, vi } from "vitest"

const addPluginMock = vi.fn()
const addTemplateMock = vi.fn()
const createResolverMock = vi.fn(() => ({
  resolve: (...segments: string[]) => segments.join("/")
}))

vi.mock("frontend-monitor-core/lite", () => ({}))

vi.mock("@nuxt/kit", () => ({
  addPlugin: addPluginMock,
  addTemplate: addTemplateMock,
  createResolver: createResolverMock,
  defineNuxtModule: (definition: unknown) => definition
}))

describe("frontend-monitor-nuxt3/lite", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("registers the lite runtime plugin", async () => {
    const moduleDefinition = (await import("./lite")).default as {
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
        dsn: "/collect",
        integrations: []
      },
      nuxt
    )

    expect(addPluginMock).toHaveBeenCalledWith({
      mode: "client",
      src: "./runtime/plugin.lite"
    })
  })
})
