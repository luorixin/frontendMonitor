import { beforeEach, describe, expect, it, vi } from "vitest"

const destroyMock = vi.fn()
const initMock = vi.fn()
const captureErrorMock = vi.fn()
const useEffectMock = vi.fn()

vi.mock("@frontend-monitor/core", () => ({
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

describe("@frontend-monitor/react", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("provider initializes core and runs destroy on cleanup when requested", async () => {
    let cleanup: (() => void) | undefined
    useEffectMock.mockImplementation(effect => {
      cleanup = effect()
    })

    const { WebTracingProvider } = await import("./index")
    const result = WebTracingProvider({
      children: "demo-child",
      destroyOnUnmount: true,
      options: {
        appName: "react-app",
        dsn: "/collect"
      }
    })

    expect(result).toBe("demo-child")
    expect(initMock).toHaveBeenCalledWith({
      appName: "react-app",
      dsn: "/collect"
    })

    cleanup?.()
    expect(destroyMock).toHaveBeenCalledTimes(1)
  })

  it("error boundary reports component errors and renders fallback afterwards", async () => {
    const { WebTracingErrorBoundary } = await import("./index")
    const boundary = new WebTracingErrorBoundary({
      children: "children",
      fallback: "fallback"
    })

    expect(boundary.render()).toBe("children")

    boundary.componentDidCatch(new Error("react boom"), {
      componentStack: "at Demo"
    })

    expect(captureErrorMock).toHaveBeenCalledWith(new Error("react boom"), {
      componentStack: "at Demo",
      framework: "react"
    })
    expect(boundary.render()).toBe("fallback")
  })
})
