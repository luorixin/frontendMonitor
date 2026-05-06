import { postApi, postVoid } from "./client"
import type { Session } from "../types/models"

export async function login(params: { password: string; username: string }) {
  return postApi<Session>("/auth/login", params)
}

export async function refresh(refreshToken: string) {
  return postApi<Session>("/auth/refresh", { refreshToken })
}

export async function logout() {
  await postVoid("/auth/logout")
}
