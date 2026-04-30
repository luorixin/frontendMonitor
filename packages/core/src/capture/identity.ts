import { state } from "../context"
import { uuid } from "../utils"

const DEVICE_COOKIE_KEY = "_frontend_monitor_device_id"
const SESSION_STORAGE_KEY = "_frontend_monitor_session_id"
const SESSION_TTL = 30 * 60 * 1000

export function initDeviceId(): string {
  const existing = getCookie(DEVICE_COOKIE_KEY)
  if (existing) return existing

  const deviceId = uuid()
  setCookie(DEVICE_COOKIE_KEY, deviceId, 365)
  return deviceId
}

export function getDeviceId(): string | null {
  return getCookie(DEVICE_COOKIE_KEY) || null
}

export function resolveSessionId(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as {
        sessionId: string
        expiresAt: number
      }
      if (Date.now() < parsed.expiresAt) {
        return parsed.sessionId
      }
    }
  } catch {
    // sessionStorage unavailable, use ephemeral session
  }

  const sessionId = uuid()
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        expiresAt: Date.now() + SESSION_TTL,
        sessionId
      })
    )
  } catch {
    // quota exceeded, still use the generated id
  }

  return sessionId
}

export function refreshSessionTTL(): void {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as {
        sessionId: string
        expiresAt: number
      }
      parsed.expiresAt = Date.now() + SESSION_TTL
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch {
    // ignore
  }
}

function getCookie(key: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${encodeURIComponent(key)}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(key: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 86400000).toUTCString()
  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}
