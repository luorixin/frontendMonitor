import axios from "axios"
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { unwrapApi, unwrapTable } from "./helpers"
import type { ApiEnvelope, TableEnvelope } from "../types/api"

let accessToken = ""
let unauthorizedHandler: (() => void) | null = null

export function setAccessToken(token?: string | null) {
  accessToken = token || ""
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function extractErrorMessage(error: AxiosError<{ error?: string; message?: string }>) {
  if (error.code === "ERR_NETWORK") {
    return "网络连接失败，请检查服务是否可用"
  }

  const payload = error.response?.data
  return payload?.message || payload?.error || error.message || "请求失败"
}

function normalizeError(error: AxiosError<{ error?: string; message?: string }>) {
  if (error.response?.status === 401) {
    unauthorizedHandler?.()
  }

  return Promise.reject(new Error(extractErrorMessage(error)))
}

export const client = axios.create({
  baseURL: "/api/v1"
})

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

client.interceptors.response.use(response => response, normalizeError)

export async function getApi<T>(url: string, config?: AxiosRequestConfig) {
  const response = await client.get<ApiEnvelope<T>>(url, config)
  return unwrapApi(response.data)
}

export async function getTable<T>(url: string, config?: AxiosRequestConfig) {
  const response = await client.get<TableEnvelope<T>>(url, config)
  return unwrapTable(response.data)
}

export async function postApi<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  const response = await client.post<ApiEnvelope<T>>(url, data, config)
  return unwrapApi(response.data)
}

export async function postVoid(url: string, data?: unknown, config?: AxiosRequestConfig) {
  await client.post(url, data, config)
}

export async function putApi<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  const response = await client.put<ApiEnvelope<T>>(url, data, config)
  return unwrapApi(response.data)
}
