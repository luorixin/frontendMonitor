import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { login as loginApi, logout as logoutApi, refresh as refreshApi } from "../api/auth.api"
import { setAccessToken, setUnauthorizedHandler } from "../api/client"
import type { Session } from "../types/models"

type SessionContextValue = {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  session: Session | null
}

const STORAGE_KEY = "frontend-monitor-report.session"

const SessionContext = createContext<SessionContextValue | null>(null)

function readStoredSession() {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function writeStoredSession(session: Session | null) {
  if (typeof window === "undefined") return
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function SessionProvider(props: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readStoredSession())

  useEffect(() => {
    setAccessToken(session?.accessToken)
    writeStoredSession(session)
  }, [session])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null)
    })

    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      isAuthenticated: Boolean(session?.accessToken),
      login: async (username, password) => {
        const nextSession = await loginApi({ password, username })
        setSession(nextSession)
      },
      logout: async () => {
        try {
          await logoutApi()
        } finally {
          setSession(null)
        }
      },
      refresh: async () => {
        if (!session?.refreshToken) return
        const nextSession = await refreshApi(session.refreshToken)
        setSession(nextSession)
      },
      session
    }),
    [session]
  )

  return <SessionContext.Provider value={value}>{props.children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error("SessionProvider is missing")
  return value
}
