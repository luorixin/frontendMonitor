import { getApi } from "./client"
import type { DashboardOverview, EventTypeCount, Issue, PageStats, TrendPoint } from "../types/models"

export async function getOverview(params: URLSearchParams) {
  return getApi<DashboardOverview>(`/monitor/dashboard/overview?${params.toString()}`)
}

export async function getTrend(params: URLSearchParams) {
  return getApi<TrendPoint[]>(`/monitor/dashboard/trend?${params.toString()}`)
}

export async function getDistribution(params: URLSearchParams) {
  return getApi<EventTypeCount[]>(`/monitor/dashboard/distribution?${params.toString()}`)
}

export async function getTopPages(params: URLSearchParams) {
  return getApi<PageStats[]>(`/monitor/dashboard/top-pages?${params.toString()}`)
}

export async function getTopIssues(params: URLSearchParams) {
  return getApi<Issue[]>(`/monitor/dashboard/top-issues?${params.toString()}`)
}
