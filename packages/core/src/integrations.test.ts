import { beforeEach, describe, expect, it, vi } from "vitest"
import { addIntegration, destroy, flush, init } from "./index"
import {
  FakeImage,
  FakeIntersectionObserver,
  FakePerformanceObserver,
  FakeXMLHttpRequest,
  setActiveSentPayloads,
  type SentPayload
} from "./test-utils/browserFakes"
import type { MonitorIntegration } from "./types"

describe("integrations", () => {
  let sentPayloads: SentPayload[]
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    destroy()
    vi.restoreAllMocks()

    sentPayloads = []
    setActiveSentPayloads(sentPayloads)
    window.localStorage.clear()

    fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        sentPayloads.push(JSON.parse(init.body))
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal(
      "XMLHttpRequest",
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest
    )
    vi.stubGlobal(
      "IntersectionObserver",
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    )
    vi.stubGlobal(
      "PerformanceObserver",
      FakePerformanceObserver as unknown as typeof PerformanceObserver
    )
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image)
    window.fetch = fetchMock as typeof window.fetch
    window.XMLHttpRequest =
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest
    window.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    window.PerformanceObserver =
      FakePerformanceObserver as unknown as typeof PerformanceObserver
    window.Image = FakeImage as unknown as typeof Image
  })

  it("registers custom integrations from init options", async () => {
    const customIntegration: MonitorIntegration = {
      name: "custom-event",
      setup(context) {
        const onCustom = () => {
          context.emit(
            {
              eventName: "from-custom-integration",
              timestamp: Date.now(),
              type: "custom",
              url: window.location.href
            },
            true
          )
        }

        window.addEventListener("custom-integration", onCustom)
        return () => window.removeEventListener("custom-integration", onCustom)
      }
    }

    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: false,
        promiseRejection: false,
        requestPerformance: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect",
      integrations: [customIntegration]
    })

    window.dispatchEvent(new Event("custom-integration"))
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.eventName).toBe(
      "from-custom-integration"
    )

    destroy()
    window.dispatchEvent(new Event("custom-integration"))
    await flush()

    expect(sentPayloads).toHaveLength(1)
  })

  it("supports addIntegration after init and ignores duplicate names", async () => {
    const setupSpy = vi.fn()
    const runtimeIntegration: MonitorIntegration = {
      name: "runtime-custom",
      setup(context) {
        setupSpy()
        context.emit(
          {
            eventName: "runtime-added",
            timestamp: Date.now(),
            type: "custom",
            url: window.location.href
          },
          true
        )
      }
    }

    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: false,
        promiseRejection: false,
        requestPerformance: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    addIntegration(runtimeIntegration)
    addIntegration(runtimeIntegration)
    await flush()

    expect(setupSpy).toHaveBeenCalledTimes(1)
    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.eventName).toBe("runtime-added")
  })
})
