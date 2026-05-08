import { beforeEach, describe, expect, it, vi } from "vitest"
import { destroy, getOptions, init } from "../lite"
import { JSErrorIntegration } from "../integrations/js-error"
import {
  FakeImage,
  FakeIntersectionObserver,
  FakePerformanceObserver,
  FakeXMLHttpRequest
} from "./test-utils/browserFakes"

describe("lite entry", () => {
  beforeEach(() => {
    destroy()
    vi.restoreAllMocks()
    window.localStorage.clear()

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
    window.XMLHttpRequest =
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest
    window.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    window.PerformanceObserver =
      FakePerformanceObserver as unknown as typeof PerformanceObserver
    window.Image = FakeImage as unknown as typeof Image
  })

  it("does not register built-in integrations by default", () => {
    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect"
    })

    expect(getOptions()?.integrations).toEqual([])
  })

  it("registers only explicitly provided integrations", () => {
    init({
      appName: "demo",
      dsn: "http://localhost:4318/collect",
      integrations: [new JSErrorIntegration()]
    })

    expect(getOptions()?.integrations.map(integration => integration.name)).toEqual(
      ["js-error"]
    )
  })
})
