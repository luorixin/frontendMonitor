import { beforeEach, describe, expect, it, vi } from "vitest"

const destroyMock = vi.fn()
const initMock = vi.fn()
const captureErrorMock = vi.fn()
const useEffectMock = vi.fn()

vi.mock("frontend-monitor-core/lite", () => ({
  captureError: captureErrorMock,
  destroy: destroyMock,
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

vi.mock("react", () => {
  class FakeComponent<P = unknown, S = unknown> {
    props: Readonly<P>
    state!: Readonly<S>

    constructor(props: P) {
      this.props = props
    }

    setState(nextState: Partial<S>) {
      this.state = {
        ...(this.state as object),
        ...(nextState as object)
      } as Readonly<S>
    }
  }

  return {
    Component: FakeComponent,
    useEffect: useEffectMock
  }
})

describe("frontend-monitor-react/lite", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("provider initializes the lite core entry", async () => {
    useEffectMock.mockImplementation(effect => {
      effect()
    })

    const { WebTracingProvider } = await import("./lite")
    const result = WebTracingProvider({
      children: "demo-child",
      options: {
        appName: "react-app",
        dsn: "/collect",
        integrations: []
      }
    })

    expect(result).toBe("demo-child")
    expect(initMock).toHaveBeenCalledWith({
      appName: "react-app",
      dsn: "/collect",
      integrations: []
    })
  })
})
