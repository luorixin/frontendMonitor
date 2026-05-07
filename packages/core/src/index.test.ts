import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  beforeSend,
  beforePushEvent,
  addBreadcrumb,
  captureError,
  clearContext,
  destroy,
  flush,
  flushSessionReplay,
  getReplayId,
  getOptions,
  init,
  intersectionObserver,
  intersectionUnobserve,
  sendLocal,
  setContext,
  setDist,
  setEnvironment,
  setRelease,
  setTag,
  setUser,
  track
} from "./index"
import {
  FakeCompressionStream,
  FakeImage,
  FakeIndexedDB,
  FakeIntersectionObserver,
  FakePerformanceObserver,
  FakeXMLHttpRequest,
  imageRequests,
  intersectionObservers,
  performanceObservers,
  readBodyAsText,
  replayBodies,
  replayRequestHeaders,
  resetFakeIndexedDB,
  setActiveSentPayloads,
  type SentPayload,
  xhrRequestHeaders,
  xhrPayloadBodies
} from "./test-utils/browserFakes"
import { readAsyncQueue } from "./queueStore"

const { rrwebRecordMock } = vi.hoisted(() => ({
  rrwebRecordMock: vi.fn()
}))

vi.mock("rrweb", () => ({
  record: rrwebRecordMock
}))

let rrwebEmit: ((event: unknown) => void) | null = null

describe("frontend-monitor-core", () => {
  let sentPayloads: SentPayload[]
  let fetchMock: ReturnType<typeof vi.fn>
  let sendBeaconSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    destroy()
    vi.restoreAllMocks()
    vi.useFakeTimers()

    sentPayloads = []
    setActiveSentPayloads(sentPayloads)
    imageRequests.splice(0, imageRequests.length)
    xhrPayloadBodies.splice(0, xhrPayloadBodies.length)
    xhrRequestHeaders.splice(0, xhrRequestHeaders.length)
    replayBodies.splice(0, replayBodies.length)
    replayRequestHeaders.splice(0, replayRequestHeaders.length)
    resetFakeIndexedDB()
    window.localStorage.clear()
    sendBeaconSpy = vi.fn(() => false)
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === "http://localhost:4318/collect") {
        if (init?.body) {
          const rawBody = await readBodyAsText(init.body)
          if (rawBody) {
            sentPayloads.push(JSON.parse(rawBody))
          }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      if (url === "http://localhost:4318/replays") {
        if (init?.body) {
          const rawBody = await readBodyAsText(init.body)
          if (rawBody) {
            replayBodies.push(JSON.parse(rawBody))
          }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      if (url === "http://localhost:4318/replays-gzip-unsupported") {
        const headers = new Headers(init?.headers)
        if (headers.get("content-encoding") === "gzip") {
          return new Response(
            JSON.stringify({
              message: "common.errors.malformedRequest",
              success: false
            }),
            { status: 400 }
          )
        }

        if (init?.body) {
          const rawBody = await readBodyAsText(init.body)
          if (rawBody) {
            replayBodies.push(JSON.parse(rawBody))
          }
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
    vi.stubGlobal(
      "PerformanceObserver",
      FakePerformanceObserver as unknown as typeof PerformanceObserver
    )
    vi.stubGlobal("indexedDB", FakeIndexedDB as unknown as IDBFactory)
    vi.stubGlobal("CompressionStream", undefined)
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image)
    window.fetch = fetchMock as typeof window.fetch
    window.XMLHttpRequest =
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest
    window.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    window.PerformanceObserver =
      FakePerformanceObserver as unknown as typeof PerformanceObserver
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: FakeIndexedDB
    })
    Object.defineProperty(window, "CompressionStream", {
      configurable: true,
      value: undefined
    })
    window.Image = FakeImage as unknown as typeof Image
    intersectionObservers.splice(0, intersectionObservers.length)
    performanceObservers.splice(0, performanceObservers.length)
    rrwebEmit = null
    rrwebRecordMock.mockReset()
    rrwebRecordMock.mockImplementation(
      ({ emit }: { emit: (event: unknown) => void }) => {
        rrwebEmit = emit
        return vi.fn()
      }
    )
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

  it("captures session replay chunks and exposes replay id", async () => {
    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect",
      sessionReplay: {
        enabled: true,
        endpoint: "http://localhost:4318/replays",
        flushInterval: 100,
        maxEvents: 2,
        sampleRate: 1
      }
    })

    expect(getReplayId()).toBeTruthy()

    rrwebEmit?.({ type: 4, timestamp: 1000, data: { href: "/a" } })
    rrwebEmit?.({ type: 3, timestamp: 1200, data: { source: 1 } })

    await flushSessionReplay()

    expect(replayBodies).toHaveLength(1)
    expect(replayBodies[0]?.replayId).toBe(getReplayId())
    expect(replayBodies[0]?.sessionId).toBeTruthy()
    expect(replayBodies[0]?.events).toHaveLength(2)
  })

  it("adds replay id to error payload base when session replay is enabled", async () => {
    init({
      appName: "demo",
      batchSize: 1,
      capture: {
        pageView: false
      },
      dsn: "http://localhost:4318/collect",
      sessionReplay: {
        enabled: true,
        endpoint: "http://localhost:4318/replays",
        sampleRate: 1
      }
    })

    captureError(new Error("with replay"))
    await flush()

    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]?.base.replayId).toBe(getReplayId())
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
    expect(xhrRequestHeaders[0]?.["content-encoding"]).toBeUndefined()
  })

  it("compresses xhr payloads when CompressionStream is available", async () => {
    vi.stubGlobal(
      "CompressionStream",
      FakeCompressionStream as unknown as typeof CompressionStream
    )
    Object.defineProperty(window, "CompressionStream", {
      configurable: true,
      value: FakeCompressionStream
    })

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
      compression: {
        algorithm: "gzip",
        eventPayloads: true
      },
      dsn: "http://localhost:4318/collect"
    })

    track("compressed-xhr", { blob: "x".repeat(5000) }, true)
    await flush()

    expect(xhrRequestHeaders).toHaveLength(1)
    expect(xhrRequestHeaders[0]?.["content-encoding"]).toBe("gzip")
  })

  it("retries xhr payloads without compression when the server rejects gzip", async () => {
    vi.stubGlobal(
      "CompressionStream",
      FakeCompressionStream as unknown as typeof CompressionStream
    )
    Object.defineProperty(window, "CompressionStream", {
      configurable: true,
      value: FakeCompressionStream
    })

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
      compression: {
        algorithm: "gzip",
        eventPayloads: true
      },
      dsn: "http://localhost:4318/collect-gzip-unsupported"
    })

    track("fallback-xhr", { blob: "x".repeat(5000) }, true)
    await flush()

    expect(xhrRequestHeaders).toHaveLength(2)
    expect(xhrRequestHeaders[0]?.["content-encoding"]).toBe("gzip")
    expect(xhrRequestHeaders[1]?.["content-encoding"]).toBeUndefined()
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

  it("captures soft navigation web vitals after route changes", async () => {
    vi.spyOn(window.performance, "now").mockReturnValue(0)

    init({
      appName: "demo",
      batchSize: 20,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: true,
        promiseRejection: false,
        routeChange: true,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    history.pushState({}, "", "/products")

    performanceObservers.find(observer => observer.observedType === "largest-contentful-paint")
      ?.trigger([{ entryType: "largest-contentful-paint", name: "", startTime: 50 } as PerformanceEntry])
    performanceObservers.find(observer => observer.observedType === "layout-shift")
      ?.trigger([{ entryType: "layout-shift", name: "", startTime: 60, value: 0.06, hadRecentInput: false } as PerformanceEntry & { value: number; hadRecentInput: boolean }])
    performanceObservers.find(observer => observer.observedType === "event")
      ?.trigger([{ entryType: "event", name: "click", startTime: 70, duration: 160, interactionId: 1 } as PerformanceEntry & { duration: number; interactionId: number }])

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    })
    document.dispatchEvent(new Event("visibilitychange"))
    await flush()

    const softNavVitals = sentPayloads.flatMap(payload => payload.events)
      .filter(event =>
        event.type === "performance" &&
        event.performanceType === "web_vital" &&
        event.softNavigation === true
      )

    expect(softNavVitals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricName: "LCP",
          navigationType: "soft-pushState",
          routeFrom: "/",
          routeTo: "/products",
          softNavigation: true,
          value: 50
        })
      ])
    )
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
    await vi.waitFor(async () => {
      expect(
        await readAsyncQueue({
          key: "__test_localized_payloads__"
        })
      ).toHaveLength(1)
    })
    expect(window.localStorage.getItem("__test_localized_payloads__")).toBeNull()

    await sendLocal()

    expect(sentPayloads).toHaveLength(1)
    expect(
      await readAsyncQueue({
        key: "__test_localized_payloads__"
      })
    ).toHaveLength(0)
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

  it("persists offline events and retries them when the browser comes online", async () => {
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
      offlineQueueKey: "__test_offline_payloads__",
      offlineRetry: true,
      retryBaseDelay: 10
    })

    window.dispatchEvent(new Event("offline"))
    track("offline-event", { step: "cached" }, true)
    await flush()

    expect(sentPayloads).toHaveLength(0)
    await vi.waitFor(async () => {
      expect(
        await readAsyncQueue({
          key: "__test_offline_payloads__"
        })
      ).toHaveLength(1)
    })
    expect(window.localStorage.getItem("__test_offline_payloads__")).toBeNull()

    window.dispatchEvent(new Event("online"))
    await vi.advanceTimersByTimeAsync(10)

    expect(sentPayloads).toHaveLength(1)
    expect(
      await readAsyncQueue({
        key: "__test_offline_payloads__"
      })
    ).toHaveLength(0)
  })

  it("drops payloads that exceed maxPayloadBytes before transport", async () => {
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
      maxPayloadBytes: 120
    })

    track("large-blocked", { blob: "x".repeat(500) }, true)
    await flush()

    expect(imageRequests).toHaveLength(0)
    expect(xhrPayloadBodies).toHaveLength(0)
    expect(sentPayloads).toHaveLength(0)
  })

  it("adds release dist environment tags contexts and bounded breadcrumbs to payload base", async () => {
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
      maxBreadcrumbs: 2
    })

    setRelease("1.2.3")
    setDist("web-42")
    setEnvironment("production")
    setTag("region", "us")
    setContext("device", { memory: "8g" })
    addBreadcrumb({ message: "first" })
    addBreadcrumb({ message: "second" })
    addBreadcrumb({ message: "third" })
    track("context-event", undefined, true)
    await flush()

    const base = sentPayloads[0]?.base
    expect(base?.release).toBe("1.2.3")
    expect(base?.dist).toBe("web-42")
    expect(base?.environment).toBe("production")
    expect(base?.tags).toEqual({ region: "us" })
    expect(base?.contexts).toEqual({ device: { memory: "8g" } })
    expect(base?.breadcrumbs).toMatchObject([
      { message: "second" },
      { message: "third" }
    ])

    clearContext()
    track("context-cleared", undefined, true)
    await flush()
    expect(sentPayloads[1]?.base.tags).toBeUndefined()
    expect(sentPayloads[1]?.base.contexts).toBeUndefined()
  })

  it("records automatic breadcrumbs for clicks and failed requests", async () => {
    document.body.innerHTML = `<button id="checkout">Checkout</button>`
    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: true,
        fetchError: true,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        routeChange: false
      },
      dsn: "http://localhost:4318/collect"
    })

    document.querySelector("#checkout")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    )
    await window.fetch("http://localhost:3000/bad-request")
    captureError(new Error("checkout failed"), undefined, true)
    await flush()

    const errorPayload = sentPayloads.find(payload =>
      payload.events.some(event => event.type === "js_error")
    )
    expect(errorPayload?.base.breadcrumbs).toMatchObject([
      { message: "Click button#checkout", type: "click" },
      { message: "GET http://localhost:3000/bad-request failed with 404", type: "request" }
    ])
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
        requestPerformance: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    window.dispatchEvent(new Event("load"))
    await vi.advanceTimersByTimeAsync(0)
    await flush()

    const performanceEvents = sentPayloads
      .flatMap(payload => payload.events)
      .filter(event => event.type === "performance" && event.performanceType === "navigation")

    expect(performanceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metrics: expect.objectContaining({
            firstContentfulPaint: 55,
            ttfb: 30
          }),
          type: "performance"
        })
      ])
    )
  })

  it("captures web vital performance entries when enabled", async () => {
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
        return [] as PerformanceEntryList
      }
    )

    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        performance: true,
        promiseRejection: false,
        requestPerformance: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    performanceObservers.find(observer => observer.observedType === "largest-contentful-paint")
      ?.trigger([{ entryType: "largest-contentful-paint", name: "", startTime: 2400 } as PerformanceEntry])
    performanceObservers.find(observer => observer.observedType === "layout-shift")
      ?.trigger([{ entryType: "layout-shift", name: "", startTime: 0, value: 0.08, hadRecentInput: false } as PerformanceEntry & { value: number; hadRecentInput: boolean }])
    performanceObservers.find(observer => observer.observedType === "event")
      ?.trigger([{ entryType: "event", name: "click", startTime: 0, duration: 180, interactionId: 1 } as PerformanceEntry & { duration: number; interactionId: number }])

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    })
    document.dispatchEvent(new Event("visibilitychange"))
    await flush()

    const performanceEvents = sentPayloads.flatMap(payload => payload.events)
      .filter(event => event.type === "performance" && event.performanceType === "web_vital")

    expect(performanceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricName: "LCP", rating: "good", value: 2400 })
      ])
    )
  })

  it("destroy removes visibilitychange exit listener", async () => {
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

    track("visibility-destroy")
    destroy()

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    })
    window.dispatchEvent(new Event("visibilitychange"))
    await Promise.resolve()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(sentPayloads).toHaveLength(0)
  })

  it("uses package version in payload base", async () => {
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

    track("version-check", undefined, true)
    await flush()

    expect(sentPayloads[0]?.base.sdkVersion).toBe("2.1.0")
  })

  it("keeps failed replay chunks and retries them on manual flush", async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error("replay unavailable")
    })

    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect",
      sessionReplay: {
        enabled: true,
        endpoint: "http://localhost:4318/replays",
        flushInterval: 100,
        maxEvents: 2,
        sampleRate: 1
      }
    })

    rrwebEmit?.({ type: 3, timestamp: 1000, data: { source: 1 } })

    await expect(flushSessionReplay()).resolves.toBeUndefined()
    expect(replayBodies).toHaveLength(0)

    await flushSessionReplay()

    expect(replayBodies).toHaveLength(1)
    expect(replayBodies[0]?.events).toHaveLength(1)
  })

  it("compresses replay fetch payloads when CompressionStream is available", async () => {
    vi.stubGlobal(
      "CompressionStream",
      FakeCompressionStream as unknown as typeof CompressionStream
    )
    Object.defineProperty(window, "CompressionStream", {
      configurable: true,
      value: FakeCompressionStream
    })

    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect",
      sessionReplay: {
        enabled: true,
        endpoint: "http://localhost:4318/replays",
        flushInterval: 100,
        maxEvents: 2,
        sampleRate: 1
      }
    })

    rrwebEmit?.({ type: 3, timestamp: 1000, data: { source: 1 } })
    await flushSessionReplay()

    expect(
      fetchMock.mock.calls.some(
        ([input]) => String(input) === "http://localhost:4318/replays"
      )
    ).toBe(true)
    const replayHeaders = new Headers(
      (fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined)?.headers
    )
    expect(replayHeaders.get("content-encoding")).toBe("gzip")
  })

  it("retries replay payloads without compression when the server rejects gzip", async () => {
    vi.stubGlobal(
      "CompressionStream",
      FakeCompressionStream as unknown as typeof CompressionStream
    )
    Object.defineProperty(window, "CompressionStream", {
      configurable: true,
      value: FakeCompressionStream
    })

    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect",
      sessionReplay: {
        enabled: true,
        endpoint: "http://localhost:4318/replays-gzip-unsupported",
        flushInterval: 100,
        maxEvents: 2,
        sampleRate: 1
      }
    })

    rrwebEmit?.({ type: 3, timestamp: 1000, data: { source: 1 } })
    await flushSessionReplay()

    const replayCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "http://localhost:4318/replays-gzip-unsupported"
    )

    expect(replayCalls).toHaveLength(2)
    expect(new Headers(replayCalls[0]?.[1]?.headers).get("content-encoding")).toBe(
      "gzip"
    )
    expect(new Headers(replayCalls[1]?.[1]?.headers).get("content-encoding")).toBeNull()
    expect(replayBodies).toHaveLength(1)
  })

  it("allows disabling replay compression explicitly", async () => {
    vi.stubGlobal(
      "CompressionStream",
      FakeCompressionStream as unknown as typeof CompressionStream
    )
    Object.defineProperty(window, "CompressionStream", {
      configurable: true,
      value: FakeCompressionStream
    })

    init({
      appName: "demo",
      compression: {
        sessionReplay: false
      },
      dsn: "http://localhost:4318/collect",
      sessionReplay: {
        enabled: true,
        endpoint: "http://localhost:4318/replays",
        flushInterval: 100,
        maxEvents: 2,
        sampleRate: 1
      }
    })

    rrwebEmit?.({ type: 3, timestamp: 1000, data: { source: 1 } })
    await flushSessionReplay()

    const replayHeaders = new Headers(
      (fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined)?.headers
    )
    expect(replayHeaders.get("content-encoding")).toBeNull()
  })

  it("defaults compression algorithm to gzip", () => {
    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect"
    })

    expect(getOptions()?.compression.algorithm).toBe("gzip")
  })

  it("passes event arrays through all beforePushEvent hooks", async () => {
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

    beforePushEvent(event => [
      event,
      {
        ...event,
        eventName: "derived",
        type: "custom"
      }
    ])
    beforePushEvent(event => {
      if (event.type === "custom" && event.eventName === "derived") {
        return [
          {
            ...event,
            eventName: "derived-a"
          },
          false
        ] as any
      }

      return event
    })

    track("source", undefined, true)
    await flush()

    expect(sentPayloads[0]?.events.map(event => event.eventName)).toEqual([
      "source",
      "derived-a"
    ])
  })

  it("supports custom sanitize keys patterns and disabling automatic sanitization", async () => {
    let sanitizedPayload: SentPayload | null = null
    let rawPayload: SentPayload | null = null

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
      sanitize: {
        redactValue: "[MASKED]",
        sensitiveKeys: ["secretCode"],
        textPatterns: [/order_[0-9]+/g]
      }
    })

    beforeSend(payload => {
      sanitizedPayload = payload as unknown as SentPayload
      return payload
    })

    track(
      "custom-sanitize",
      {
        note: "order_123 belongs to 13800138000",
        secretCode: "abc"
      },
      true
    )
    await flush()

    expect(sanitizedPayload?.events[0]?.params).toMatchObject({
      note: "[MASKED] belongs to 138****8000",
      secretCode: "[MASKED]"
    })

    destroy()
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
      sanitize: {
        enabled: false
      }
    })

    beforeSend(payload => {
      rawPayload = payload as unknown as SentPayload
      return payload
    })

    track("raw-sanitize", { token: "secret-token" }, true)
    await flush()

    expect(rawPayload?.events[0]?.params).toMatchObject({
      token: "secret-token"
    })
  })

  it("uses a custom transport and persists failed custom transport payloads offline", async () => {
    const customSend = vi.fn(async () => ({
      reason: "network_error" as const,
      success: false,
      transport: "xhr" as const
    }))

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
      offlineQueueKey: "__test_custom_transport_offline__",
      transport: {
        send: customSend
      }
    })

    track("custom-transport", undefined, true)
    await flush()

    expect(customSend).toHaveBeenCalledTimes(1)
    expect(sentPayloads).toHaveLength(0)
    expect(
      await readAsyncQueue({
        key: "__test_custom_transport_offline__"
      })
    ).toHaveLength(1)
    expect(window.localStorage.getItem("__test_custom_transport_offline__")).toBeNull()
  })

  it("does not propagate trace headers by default and does when enabled", async () => {
    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        requestPerformance: false,
        routeChange: false,
        xhrError: false
      },
      dsn: "http://localhost:4318/collect"
    })

    await window.fetch("http://localhost:3000/default-trace")
    expect((fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined)?.headers)
      .toBeUndefined()

    destroy()
    init({
      appName: "demo",
      batchSize: 10,
      capture: {
        click: false,
        fetchError: false,
        jsError: false,
        pageView: false,
        promiseRejection: false,
        requestPerformance: false,
        routeChange: false,
        xhrError: true
      },
      dsn: "http://localhost:4318/collect",
      trace: {
        enabled: true,
        propagateTraceparent: true,
        sampleRate: 1
      }
    })

    track("trace-base", undefined, true)
    await flush()

    await window.fetch("http://localhost:3000/traced-fetch")
    const tracedFetchInit = fetchMock.mock.calls.at(-1)?.[1] as
      | RequestInit
      | undefined
    const traceparent = new Headers(tracedFetchInit?.headers).get("traceparent")
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
    expect(sentPayloads.at(-1)?.base.traceId).toMatch(/^[0-9a-f]{32}$/)
    expect(sentPayloads.at(-1)?.base.spanId).toMatch(/^[0-9a-f]{16}$/)

    const xhr = new XMLHttpRequest() as FakeXMLHttpRequest
    xhr.open("GET", "http://localhost:3000/traced-xhr")
    xhr.send()

    expect(xhr.requestHeaders.traceparent).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/
    )
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
