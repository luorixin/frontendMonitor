import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  beforeSend,
  captureError,
  destroy,
  flush,
  getOptions,
  init,
  intersectionObserver,
  intersectionUnobserve,
  sendLocal,
  setUser,
  track
} from "./index"

type SentPayload = {
  base: Record<string, unknown>
  events: Array<Record<string, unknown>>
}

let activeSentPayloads: SentPayload[] = []
const imageRequests: string[] = []
const xhrPayloadBodies: string[] = []

class FakeXMLHttpRequest extends EventTarget {
  method = "GET"
  onerror: ((this: XMLHttpRequest, event: Event) => void) | null = null
  onloadend: ((this: XMLHttpRequest, event: Event) => void) | null = null
  requestBody?: Document | XMLHttpRequestBodyInit | null
  requestHeaders: Record<string, string> = {}
  status = 0
  url = ""

  open(method: string, url: string | URL): void {
    this.method = method
    this.url = String(url)
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name.toLowerCase()] = value
  }

  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    this.requestBody = body

    if (this.url === "http://localhost:4318/collect") {
      if (typeof body === "string") {
        activeSentPayloads.push(JSON.parse(body))
        xhrPayloadBodies.push(body)
      }

      this.status = 200
      this.emitTerminalEvent("loadend")
      return
    }

    if (this.url.includes("xhr-network-error")) {
      this.status = 0
      this.emitTerminalEvent("error")
      this.emitTerminalEvent("loadend")
      return
    }

    if (this.url.includes("xhr-bad-request")) {
      this.status = 404
      this.emitTerminalEvent("loadend")
      return
    }

    this.status = 200
    this.emitTerminalEvent("loadend")
  }

  private emitTerminalEvent(type: "error" | "loadend"): void {
    const event = new Event(type)
    if (type === "error") {
      this.onerror?.call(this as unknown as XMLHttpRequest, event)
    }

    if (type === "loadend") {
      this.onloadend?.call(this as unknown as XMLHttpRequest, event)
    }

    this.dispatchEvent(event)
  }
}

class FakeImage {
  onerror: ((event: Event | string) => void) | null = null
  onload: ((event: Event | string) => void) | null = null

  set src(value: string) {
    imageRequests.push(value)

    if (value.includes("image-fail")) {
      this.onerror?.(new Event("error"))
      return
    }

    const url = new URL(value)
    const raw = url.searchParams.get("data")
    if (raw) {
      activeSentPayloads.push(JSON.parse(raw))
    }

    this.onload?.(new Event("load"))
  }
}

const intersectionObservers: FakeIntersectionObserver[] = []

class FakeIntersectionObserver {
  disconnect = vi.fn(() => undefined)
  observe = vi.fn((_target: Element) => undefined)
  unobserve = vi.fn((_target: Element) => undefined)

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit
  ) {
    intersectionObservers.push(this)
  }

  trigger(
    target: Element,
    init: Partial<IntersectionObserverEntry> = {}
  ): void {
    this.callback(
      [
        {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 0,
          intersectionRect: {} as DOMRectReadOnly,
          isIntersecting: false,
          rootBounds: null,
          target,
          time: Date.now(),
          ...init
        }
      ] as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver
    )
  }
}

describe("frontend-monitor-core", () => {
  let sentPayloads: SentPayload[]
  let fetchMock: ReturnType<typeof vi.fn>
  let sendBeaconSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    destroy()
    vi.restoreAllMocks()
    vi.useFakeTimers()

    sentPayloads = []
    activeSentPayloads = sentPayloads
    imageRequests.splice(0, imageRequests.length)
    xhrPayloadBodies.splice(0, xhrPayloadBodies.length)
    window.localStorage.clear()
    sendBeaconSpy = vi.fn(() => false)
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === "http://localhost:4318/collect") {
        if (init?.body && typeof init.body === "string") {
          sentPayloads.push(JSON.parse(init.body))
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      if (url.includes("network-error")) {
        throw new Error("boom")
      }

      if (url.includes("bad-request")) {
        return new Response(JSON.stringify({ ok: false }), { status: 404 })
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconSpy
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
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image)
    window.fetch = fetchMock as typeof window.fetch
    window.XMLHttpRequest =
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest
    window.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    window.Image = FakeImage as unknown as typeof Image
    intersectionObservers.splice(0, intersectionObservers.length)
    document.body.innerHTML = `<button id="target">Hello monitor</button>`
    window.history.replaceState({}, "", "/")
  })

  it("init duplicate does not reinitialize listeners or duplicate page view", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      dsn: "http://localhost:4318/collect"
    })
    init({
      appName: "demo-duplicate",
      batchSize: 1,
      dsn: "http://localhost:4318/collect"
    })

    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("page_view")
    expect(getOptions()?.appName).toBe("demo")
  })

  it("destroy restores fetch/history and clears queue", () => {
    const originalFetch = window.fetch
    const originalPushState = history.pushState
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect"
    })

    expect(window.fetch).not.toBe(originalFetch)
    expect(history.pushState).not.toBe(originalPushState)
    expect(XMLHttpRequest.prototype.open).not.toBe(originalXHROpen)
    expect(XMLHttpRequest.prototype.send).not.toBe(originalXHRSend)

    destroy()

    expect(window.fetch).toBe(originalFetch)
    expect(history.pushState).toBe(originalPushState)
    expect(XMLHttpRequest.prototype.open).toBe(originalXHROpen)
    expect(XMLHttpRequest.prototype.send).toBe(originalXHRSend)
    expect(getOptions()).toBeNull()
  })

  it("track sends immediately when batch size is reached", async () => {
    init({
      appName: "demo",
      batchSize: 2,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    track("alpha")
    track("beta")
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events).toHaveLength(2)
  })

  it("track sends after flush interval", async () => {
    init({
      appName: "demo",
      batchSize: 5,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect",
      flushInterval: 1000
    })

    track("delayed")
    await vi.advanceTimersByTimeAsync(1000)
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.eventName).toBe("delayed")
  })

  it("beforeSend returning false blocks the payload", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    beforeSend(() => false)
    track("blocked")
    await flush()

    expect(sentPayloads).toHaveLength(0)
  })

  it("sanitizes payload fields before running beforeSend hooks", async () => {
    let observedPayload: SentPayload | null = null

    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    beforeSend(payload => {
      observedPayload = payload as unknown as SentPayload
      return payload
    })

    track(
      "sanitize-check",
      {
        mobile: "13800138000",
        note: "phone=13800138000,id=11010519491231002X",
        profile: {
          idCard: "11010519491231002X"
        },
        requestUrl: "/api/orders?token=secret-token",
        token: "secret-token"
      },
      true
    )
    await flush()

    const params = observedPayload?.events[0]?.params as
      | Record<string, unknown>
      | undefined

    expect(params?.token).toBe("[REDACTED]")
    expect(params?.mobile).toBe("[REDACTED]")
    expect(params?.requestUrl).toBe("/api/orders?token=%5BREDACTED%5D")
    expect(params?.note).toBe("phone=138****8000,id=110********002X")
    expect((params?.profile as Record<string, unknown> | undefined)?.idCard).toBe(
      "[REDACTED]"
    )
  })

  it("sampleRate 0 drops non-flush events", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect",
      sampleRate: 0
    })

    track("dropped")
    await flush()

    expect(sentPayloads).toHaveLength(0)
  })

  it("captureError formats string and Error consistently", async () => {
    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    captureError("plain string")
    captureError(new Error("typed error"))
    await flush()

    const [payload] = sentPayloads
    expect(payload?.events[0]?.type).toBe("js_error")
    expect(payload?.events[0]?.message).toBe("plain string")
    expect(payload?.events[1]?.message).toBe("typed error")
  })

  it("flushes queued events with beacon on pagehide", async () => {
    sendBeaconSpy.mockImplementation(() => true)

    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    track("pending-exit-event")
    window.dispatchEvent(new Event("pagehide"))
    await Promise.resolve()

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1)

    const [dsn, body] = sendBeaconSpy.mock.calls[0] as [string, unknown]

    expect(dsn).toBe("http://localhost:4318/collect")
    expect(Object.prototype.toString.call(body)).toBe("[object Blob]")
    expect(sentPayloads).toHaveLength(0)
  })

  it("uses image transport for small payloads", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    track("small-payload", { kind: "tiny" }, true)
    await flush()

    expect(imageRequests).toHaveLength(1)
    expect(xhrPayloadBodies).toHaveLength(0)
    expect(sentPayloads).toHaveLength(1)
  })

  it("uses xhr transport for large payloads", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    track(
      "large-payload",
      {
        blob: "x".repeat(5000)
      },
      true
    )
    await flush()

    expect(xhrPayloadBodies).toHaveLength(1)
    expect(sentPayloads).toHaveLength(1)
  })

  it("ignores requests that match the configured dsn", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: true,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    await window.fetch("http://localhost:4318/collect", { method: "POST" })
    await flush()

    expect(sentPayloads).toHaveLength(0)
  })

  it("captures route change events across history and hash transitions", async () => {
    init({
      appName: "demo",
      batchSize: 20,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: true
      },
      dsn: "http://localhost:4318/collect"
    })

    history.pushState({}, "", "/next")
    history.replaceState({}, "", "/replace")
    window.location.hash = "#hash"
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    window.dispatchEvent(new PopStateEvent("popstate"))
    await flush()

    const types = sentPayloads.flatMap(payload =>
      payload.events.map(event => event.type)
    )

    expect(types).toContain("route_change")
  })

  it("stores payloads locally when localization is enabled and sends them on demand", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect",
      localization: true,
      localizationKey: "__test_localized_payloads__"
    })

    track("localized-event", { scene: "offline" }, true)
    await flush()

    expect(sentPayloads).toHaveLength(0)
    expect(
      JSON.parse(
        window.localStorage.getItem("__test_localized_payloads__") ?? "[]"
      )
    ).toHaveLength(1)

    await sendLocal()

    expect(sentPayloads).toHaveLength(1)
    expect(
      window.localStorage.getItem("__test_localized_payloads__")
    ).toBeNull()
  })

  it("captures failed fetch requests", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: true,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    await window.fetch("http://localhost:3000/bad-request")
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("request_error")
    expect(sentPayloads[0]?.events[0]?.transport).toBe("fetch")
  })

  it("aggregates scoped duplicate errors into a single queued event", async () => {
    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect",
      scopeError: true
    })

    captureError(new Error("duplicate-scope"))
    captureError(new Error("duplicate-scope"))
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("js_error")
    expect(sentPayloads[0]?.events[0]?.scopeCount).toBe(2)
  })

  it("redacts input content in click events", async () => {
    document.body.innerHTML = `<input id="secret" value="13800138000" />`

    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: true,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    const input = document.querySelector("#secret")
    input?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("click")
    expect(sentPayloads[0]?.events[0]?.textPreview).toBe("[REDACTED_INPUT]")
  })

  it("captures exposure when an observed element crosses the threshold", async () => {
    document.body.innerHTML = `<section id="exposure">Exposure hero module content</section>`

    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        exposure: true,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: false,
        promiseRejection: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    const target = document.querySelector("#exposure")
    expect(target).not.toBeNull()

    intersectionObserver({
      params: {
        slot: "hero-banner"
      },
      target: target as Element,
      threshold: 0.5
    })

    expect(intersectionObservers).toHaveLength(1)
    intersectionObservers[0]?.trigger(target as Element, {
      intersectionRatio: 0.76,
      isIntersecting: true
    })
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("exposure")
    expect(sentPayloads[0]?.events[0]?.ratio).toBe(0.76)
    expect(sentPayloads[0]?.events[0]?.threshold).toBe(0.5)
    expect(sentPayloads[0]?.events[0]?.params?.slot).toBe("hero-banner")
  })

  it("unobserves exposure targets and disconnects them on destroy", () => {
    document.body.innerHTML = `<section id="exposure">Exposure card</section>`

    init({
      appName: "demo",
      batchSize: 5,
      capture: {
        click: false,
        exposure: true,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: false,
        promiseRejection: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    const target = document.querySelector("#exposure") as Element

    intersectionObserver({ target, threshold: 0.25 })
    const firstObserver = intersectionObservers[0]
    intersectionUnobserve(target)

    expect(firstObserver?.unobserve).toHaveBeenCalledWith(target)
    expect(firstObserver?.disconnect).toHaveBeenCalledTimes(1)

    intersectionObserver({ target, threshold: 0.25 })
    const secondObserver = intersectionObservers[1]
    destroy()

    expect(secondObserver?.disconnect).toHaveBeenCalledTimes(1)
  })

  it("setUser updates the payload base", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    setUser("user-001")
    track("user-change", undefined, true)
    await flush()

    expect(sentPayloads[0]?.base.userId).toBe("user-001")
  })

  it("captures failed xhr requests", async () => {
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
        routeChange: false,
        xhrError: true
      },
      dsn: "http://localhost:4318/collect"
    })

    const xhr = new XMLHttpRequest()
    xhr.open("GET", "http://localhost:3000/xhr-bad-request")
    xhr.send()
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("request_error")
    expect(sentPayloads[0]?.events[0]?.transport).toBe("xhr")
    expect(sentPayloads[0]?.events[0]?.status).toBe(404)
  })

  it("captures navigation performance when enabled", async () => {
    vi.spyOn(window.performance, "getEntriesByType").mockImplementation(
      (entryType: string) => {
        if (entryType === "navigation") {
          return [
            {
              connectEnd: 25,
              connectStart: 10,
              domContentLoadedEventEnd: 140,
              domInteractive: 120,
              domainLookupEnd: 9,
              domainLookupStart: 4,
              loadEventEnd: 210,
              redirectEnd: 0,
              redirectStart: 0,
              requestStart: 30,
              responseEnd: 90,
              responseStart: 60,
              startTime: 0,
              type: "navigate"
            }
          ] as PerformanceEntryList
        }

        if (entryType === "paint") {
          return [
            {
              entryType: "paint",
              name: "first-paint",
              startTime: 40
            },
            {
              entryType: "paint",
              name: "first-contentful-paint",
              startTime: 55
            }
          ] as PerformanceEntryList
        }

        return [] as PerformanceEntryList
      }
    )

    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: true,
        promiseRejection: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    window.dispatchEvent(new Event("load"))
    await vi.advanceTimersByTimeAsync(0)
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.events[0]?.type).toBe("performance")
    expect(sentPayloads[0]?.events[0]?.metrics.ttfb).toBe(30)
    expect(sentPayloads[0]?.events[0]?.metrics.firstContentfulPaint).toBe(55)
  })

  it("destroy removes exit listeners and clears pending flush timers", async () => {
    sendBeaconSpy.mockImplementation(() => true)

    init({
      appName: "demo",
      batchSize: 5,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect",
      flushInterval: 1000
    })

    track("destroy-me")
    destroy()

    await vi.advanceTimersByTimeAsync(1000)
    window.dispatchEvent(new Event("pagehide"))
    await Promise.resolve()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(sentPayloads).toHaveLength(0)
  })
})
