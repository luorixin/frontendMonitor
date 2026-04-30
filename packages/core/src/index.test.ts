import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  beforeSend,
  captureError,
  destroy,
  flush,
  getOptions,
  init,
  setUser,
  track
} from "./index"

type SentPayload = {
  base: Record<string, unknown>
  events: Array<Record<string, unknown>>
}

describe("@frontend-monitor/core", () => {
  let sentPayloads: SentPayload[]
  let fetchMock: ReturnType<typeof vi.fn>
  let sendBeaconSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    destroy()
    vi.restoreAllMocks()
    vi.useFakeTimers()

    sentPayloads = []
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
    window.fetch = fetchMock as typeof window.fetch
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

    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect"
    })

    expect(window.fetch).not.toBe(originalFetch)
    expect(history.pushState).not.toBe(originalPushState)

    destroy()

    expect(window.fetch).toBe(originalFetch)
    expect(history.pushState).toBe(originalPushState)
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
})
