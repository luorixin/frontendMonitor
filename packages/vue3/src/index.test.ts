import { beforeEach, describe, expect, it, vi } from "vitest"

const injectMock = vi.fn()
const initMock = vi.fn()
const captureErrorMock = vi.fn()

vi.mock("frontend-monitor-core", () => ({
  captureError: captureErrorMock,
  flush: vi.fn(),
  getOptions: vi.fn(),
  init: initMock,
  intersectionDisconnect: vi.fn(),
  intersectionObserver: vi.fn(),
  intersectionUnobserve: vi.fn(),
  sendLocal: vi.fn(),
  setUser: vi.fn(),
  track: vi.fn()
}))

vi.mock("vue", () => ({
  inject: injectMock
}))

describe("frontend-monitor-vue3", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("installs the plugin, initializes core, and bridges vue errors", async () => {
    const { default: WebTracingPlugin } = await import("./index")
    const originalErrorHandler = vi.fn()
    const provide = vi.fn()
    const app = {
      config: {
        errorHandler: originalErrorHandler
      },
      provide
    }

    WebTracingPlugin.install(app, {
      appName: "vue3-app",
      captureVueErrors: true,
      dsn: "/collect"
    })

    expect(initMock).toHaveBeenCalledWith({
      appName: "vue3-app",
      captureVueErrors: true,
      dsn: "/collect"
    })
    expect(provide).toHaveBeenCalledTimes(1)

    app.config.errorHandler?.(new Error("vue boom"), {}, "render")
    expect(captureErrorMock).toHaveBeenCalledWith(new Error("vue boom"), {
      framework: "vue3",
      info: "render"
    })
    expect(originalErrorHandler).toHaveBeenCalledTimes(1)
  })

  it("useWebTracing falls back to the exported tracing api", async () => {
    injectMock.mockImplementation((_key, fallback) => fallback)
    const { useWebTracing } = await import("./index")

    const api = useWebTracing()

    expect(api.captureError).toBe(captureErrorMock)
    expect(typeof api.track).toBe("function")
  })
})
