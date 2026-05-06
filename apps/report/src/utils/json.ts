export function safeParseJson<T>(value?: string) {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
