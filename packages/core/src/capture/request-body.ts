import { debugLog } from "../pipeline/queue"
import { textPreview } from "../utils"

export function createMemoizedRequestBodyReader<T>(
  reader: () => Promise<T>
): () => Promise<T> {
  let promise: Promise<T> | undefined
  return () => {
    promise ??= reader()
    return promise
  }
}

export async function readRequestBodySafely(
  reader: (() => Promise<unknown | undefined>) | undefined,
  requestUrl: string
): Promise<unknown | undefined> {
  if (!reader) return undefined

  try {
    return await reader()
  } catch (error) {
    debugLog("capture request body failed", {
      error,
      url: requestUrl
    })
    return undefined
  }
}

export async function normalizeCapturedRequestBody(
  body: unknown,
  contentType?: string
): Promise<unknown | undefined> {
  if (body == null) return undefined

  if (typeof body === "string") {
    return normalizeBodyText(body, contentType)
  }

  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return formDataToObject(body)
  }

  if (body instanceof Blob) {
    return normalizeBodyText(await body.text(), body.type || contentType)
  }

  if (body instanceof ArrayBuffer) {
    return `[binary body: ${body.byteLength} bytes]`
  }

  if (ArrayBuffer.isView(body)) {
    return `[binary body: ${body.byteLength} bytes]`
  }

  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
    return "[stream body]"
  }

  if (typeof Document !== "undefined" && body instanceof Document) {
    return "[document body]"
  }

  return undefined
}

export async function normalizeRequestTextBody(
  reader: Promise<string>,
  contentType: string | null
): Promise<unknown | undefined> {
  return normalizeBodyText(await reader, contentType ?? undefined)
}

export function resolveContentType(headers?: HeadersInit): string | undefined {
  if (!headers) return undefined
  return new Headers(headers).get("content-type") ?? undefined
}

function normalizeBodyText(
  bodyText: string,
  contentType?: string
): unknown | undefined {
  const trimmed = bodyText.trim()
  if (!trimmed) return undefined

  if (shouldParseJson(trimmed, contentType)) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return textPreview(trimmed, 512)
    }
  }

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(trimmed).entries())
  }

  return textPreview(trimmed, 512)
}

function shouldParseJson(bodyText: string, contentType?: string): boolean {
  if (contentType?.toLowerCase().includes("application/json")) return true
  return (
    (bodyText.startsWith("{") && bodyText.endsWith("}")) ||
    (bodyText.startsWith("[") && bodyText.endsWith("]"))
  )
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    const normalizedValue =
      typeof value === "string"
        ? value
        : {
            name: value.name,
            size: value.size,
            type: value.type
          }

    const existingValue = result[key]
    if (existingValue === undefined) {
      result[key] = normalizedValue
      continue
    }

    result[key] = Array.isArray(existingValue)
      ? [...existingValue, normalizedValue]
      : [existingValue, normalizedValue]
  }

  return result
}
