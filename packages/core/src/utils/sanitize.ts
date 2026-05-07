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
].map(key => key.toLowerCase())

const PHONE_PATTERN = /(?<!\d)(1[3-9]\d{9})(?!\d)/g
const ID_CARD_PATTERN =
  /(?<![0-9A-Za-z])((?:\d{17}[\dXx])|(?:\d{15}))(?![0-9A-Za-z])/g
const BEARER_PATTERN = /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi

export type SanitizeConfig = {
  redactValue?: string
  sensitiveKeys?: string[]
  textPatterns?: RegExp[]
}

export function sanitizeValue(
  value: unknown,
  parentKey?: string,
  config: SanitizeConfig = {}
): unknown {
  if (isSensitiveKey(parentKey, config)) {
    return redactScalar(value, config)
  }

  if (typeof value === "string") {
    return redactSensitiveText(value, config)
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, undefined, config))
  }

  if (!value || typeof value !== "object") {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, currentValue] of Object.entries(value)) {
    sanitized[key] = sanitizeValue(currentValue, key, config)
  }

  return sanitized
}

export function redactSensitiveText(
  input: string,
  config: SanitizeConfig = {}
): string {
  const redactValue = config.redactValue ?? REDACTED
  let sanitized = sanitizeUrlLikeString(input, config)
  sanitized = sanitized.replace(BEARER_PATTERN, `$1${redactValue}`)
  for (const pattern of config.textPatterns ?? []) {
    sanitized = sanitized.replace(pattern, redactValue)
  }
  sanitized = sanitized.replace(PHONE_PATTERN, (_match, phone: string) => {
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  })
  sanitized = sanitized.replace(ID_CARD_PATTERN, (idCard: string) => {
    if (idCard.length <= 8) return redactValue
    return `${idCard.slice(0, 3)}********${idCard.slice(-4)}`
  })

  return sanitized
}

export function getRedactedInputText(): string {
  return REDACTED_INPUT
}

function sanitizeUrlLikeString(input: string, config: SanitizeConfig): string {
  if (!looksLikeUrl(input)) {
    return input
  }

  try {
    const url = new URL(input, "http://frontend-monitor.local")

    for (const key of Array.from(url.searchParams.keys())) {
      if (isSensitiveKey(key, config)) {
        url.searchParams.set(key, config.redactValue ?? REDACTED)
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

function isSensitiveKey(key?: string, config: SanitizeConfig = {}): boolean {
  if (!key) return false
  const normalizedKey = key.toLowerCase()
  return [...SENSITIVE_KEYS, ...(config.sensitiveKeys ?? []).map(item => item.toLowerCase())]
    .some(candidate => candidate === normalizedKey)
}

function redactScalar(value: unknown, config: SanitizeConfig): unknown {
  const redactValue = config.redactValue ?? REDACTED
  if (typeof value === "string") return redactValue
  if (typeof value === "number") return redactValue
  if (typeof value === "boolean") return redactValue
  if (value == null) return value
  return redactValue
}
