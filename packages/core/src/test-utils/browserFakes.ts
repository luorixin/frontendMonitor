import { vi } from "vitest"

export type SentPayload = {
  base: Record<string, unknown>
  events: Array<Record<string, unknown>>
}

let activeSentPayloads: SentPayload[] = []

export const imageRequests: string[] = []
export const replayBodies: Array<Record<string, unknown>> = []
export const replayRequestHeaders: Array<Record<string, string>> = []
export const xhrRequestHeaders: Array<Record<string, string>> = []
export const xhrPayloadBodies: string[] = []
export const intersectionObservers: FakeIntersectionObserver[] = []
export const performanceObservers: FakePerformanceObserver[] = []

export function setActiveSentPayloads(payloads: SentPayload[]): void {
  activeSentPayloads = payloads
}

export async function readBodyAsText(body: unknown): Promise<string | null> {
  if (typeof body === "string") {
    return body
  }

  if (
    body &&
    typeof body === "object" &&
    "arrayBuffer" in body &&
    typeof (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer ===
      "function"
  ) {
    const buffer = await (
      body as { arrayBuffer: () => Promise<ArrayBuffer> }
    ).arrayBuffer()
    return new TextDecoder().decode(buffer)
  }

  return null
}

export class FakeXMLHttpRequest extends EventTarget {
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

    if (this.url === "http://localhost:4318/collect-gzip-unsupported") {
      xhrRequestHeaders.push({ ...this.requestHeaders })

      if (this.requestHeaders["content-encoding"] === "gzip") {
        this.status = 400
        this.emitTerminalEvent("loadend")
        return
      }

      this.resolveBody(body, parsedBody => {
        activeSentPayloads.push(parsedBody)
        xhrPayloadBodies.push(JSON.stringify(parsedBody))
      })
      return
    }

    if (this.url === "http://localhost:4318/collect") {
      xhrRequestHeaders.push({ ...this.requestHeaders })
      this.resolveBody(body, parsedBody => {
        activeSentPayloads.push(parsedBody)
        xhrPayloadBodies.push(JSON.stringify(parsedBody))
      })
      return
    }

    if (this.url === "http://localhost:4318/replays") {
      replayRequestHeaders.push({ ...this.requestHeaders })
      this.resolveBody(body, parsedBody => {
        replayBodies.push(parsedBody)
      })
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

  private resolveBody(
    body: Document | XMLHttpRequestBodyInit | null | undefined,
    onResolved: (parsedBody: Record<string, unknown>) => void
  ): void {
    void readBodyAsText(body).then(text => {
      if (text) {
        onResolved(JSON.parse(text))
        this.status = 200
        this.emitTerminalEvent("loadend")
        return
      }

      this.status = 200
      this.emitTerminalEvent("loadend")
    })
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

export class FakeImage {
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

export class FakeIntersectionObserver {
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

export class FakePerformanceObserver {
  static supportedEntryTypes = [
    "resource",
    "largest-contentful-paint",
    "layout-shift",
    "event"
  ]

  disconnect = vi.fn(() => undefined)
  observedType?: string

  constructor(private readonly callback: PerformanceObserverCallback) {
    performanceObservers.push(this)
  }

  observe(options: PerformanceObserverInit): void {
    this.observedType = options.type ?? options.entryTypes?.[0]
  }

  trigger(entries: PerformanceEntry[]): void {
    this.callback(
      {
        getEntries: () => entries,
        getEntriesByName: () => entries,
        getEntriesByType: () => entries
      } as PerformanceObserverEntryList,
      this as unknown as PerformanceObserver
    )
  }
}

export class FakeCompressionStream {
  static __frontendMonitorPassthrough = true
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>

  constructor(_format: string) {
    const stream = new TransformStream<unknown, Uint8Array>({
      async transform(chunk, controller) {
        if (chunk instanceof Uint8Array) {
          controller.enqueue(chunk)
          return
        }

        if (typeof chunk === "string") {
          controller.enqueue(new TextEncoder().encode(chunk))
          return
        }

        if (chunk instanceof Blob) {
          controller.enqueue(new Uint8Array(await chunk.arrayBuffer()))
          return
        }

        controller.enqueue(new TextEncoder().encode(String(chunk)))
      }
    })
    this.readable = stream.readable
    this.writable = stream.writable
  }
}
