import { beforeEach, describe, expect, it, vi } from "vitest"

const injectMock = vi.fn()
const initMock = vi.fn()
const captureErrorMock = vi.fn()

vi.mock("frontend-monitor-core/lite", () => ({
  addBreadcrumb: vi.fn(),
  captureError: captureErrorMock,
  clearContext: vi.fn(),
  flush: vi.fn(),
  flushSessionReplay: vi.fn(),
  getReplayId: vi.fn(),
  getOptions: vi.fn(),
  init: initMock,
  intersectionDisconnect: vi.fn(),
  intersectionObserver: vi.fn(),
  intersectionUnobserve: vi.fn(),
  sendLocal: vi.fn(),
  setContext: vi.fn(),
  setEnvironment: vi.fn(),
  setRelease: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  stopReplay: vi.fn(),
  track: vi.fn()
}))

vi.mock("vue", () => ({
  inject: injectMock
}))

describe("frontend-monitor-vue3/lite", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("installs the plugin with the lite core entry", async () => {
    const { default: WebTracingPlugin } = await import("./lite")
    const provide = vi.fn()
    const app = {
      config: {
        errorHandler: vi.fn()
      },
      provide
    }

    WebTracingPlugin.install(app, {
      appName: "vue3-app",
      captureVueErrors: true,
      dsn: "/collect",
      integrations: []
    })

    expect(initMock).toHaveBeenCalledWith({
      appName: "vue3-app",
      captureVueErrors: true,
      dsn: "/collect",
      integrations: []
    })
    expect(provide).toHaveBeenCalledTimes(1)
  })
})
