const REDACTED = "[REDACTED]"
const REDACTED_INPUT = "[REDACTED_INPUT]"

const SENSITIVE_KEYS = [
  "access_token",
  "accessToken",
  "auth",
  "authorization",
  "idCard",
  "idNo",
  "id_number",
  "identity",
  "mobile",
  "passwd",
  "password",
  "phone",
  "phoneNumber",
  "pwd",
  "refresh_token",
  "refreshToken",
  "token"
]

const PHONE_PATTERN = /(?<!\d)(1[3-9]\d{9})(?!\d)/g
const ID_CARD_PATTERN =
  /(?<![0-9A-Za-z])((?:\d{17}[\dXx])|(?:\d{15}))(?![0-9A-Za-z])/g
const BEARER_PATTERN = /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi

export function sanitizeValue(value: unknown, parentKey?: string): unknown {
  if (isSensitiveKey(parentKey)) {
    return redactScalar(value)
  }

  if (typeof value === "string") {
    return redactSensitiveText(value)
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item))
  }

  if (!value || typeof value !== "object") {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, currentValue] of Object.entries(value)) {
    sanitized[key] = sanitizeValue(currentValue, key)
  }

  return sanitized
}

export function redactSensitiveText(input: string): string {
  let sanitized = sanitizeUrlLikeString(input)
  sanitized = sanitized.replace(BEARER_PATTERN, `$1${REDACTED}`)
  sanitized = sanitized.replace(PHONE_PATTERN, (_match, phone: string) => {
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  })
  sanitized = sanitized.replace(ID_CARD_PATTERN, (idCard: string) => {
    if (idCard.length <= 8) return REDACTED
    return `${idCard.slice(0, 3)}********${idCard.slice(-4)}`
  })

  return sanitized
}

export function getRedactedInputText(): string {
  return REDACTED_INPUT
}

function sanitizeUrlLikeString(input: string): string {
  if (!looksLikeUrl(input)) {
    return input
  }

  try {
    const url = new URL(input, "http://frontend-monitor.local")

    for (const key of Array.from(url.searchParams.keys())) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, REDACTED)
      }
    }

    if (input.startsWith("http://") || input.startsWith("https://")) {
      return url.toString()
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return input
  }
}

function looksLikeUrl(input: string): boolean {
  return (
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.startsWith("/") ||
    input.startsWith("./") ||
    input.startsWith("../") ||
    (input.includes("?") && (input.includes("/") || input.startsWith("?")))
  )
}

function isSensitiveKey(key?: string): boolean {
  if (!key) return false
  return SENSITIVE_KEYS.some(candidate => candidate === key)
}

function redactScalar(value: unknown): unknown {
  if (typeof value === "string") return REDACTED
  if (typeof value === "number") return REDACTED
  if (typeof value === "boolean") return REDACTED
  if (value == null) return value
  return REDACTED
}
