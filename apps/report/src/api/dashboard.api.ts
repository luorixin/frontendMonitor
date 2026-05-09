import { getApi } from "./client"
import type {
  DashboardOverview,
  DwellDistributionBucket,
  EventTypeCount,
  EventRecord,
  HotspotRow,
  HotspotTrendPoint,
  Issue,
  PageAnalyticsRow,
  PageTrendPoint,
  PageStats,
  RequestPerformanceTrendPoint,
  SlowRequest,
  TraceDetail,
  TraceOverview,
  TraceSummary,
  TrendPoint,
  WebVitalTrendPoint
} from "../types/models"

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

export async function getWebVitalTrend(params: URLSearchParams) {
  return getApi<WebVitalTrendPoint[]>(`/monitor/dashboard/web-vitals-trend?${params.toString()}`)
}

export async function getRequestPerformanceTrend(params: URLSearchParams) {
  return getApi<RequestPerformanceTrendPoint[]>(`/monitor/dashboard/request-performance-trend?${params.toString()}`)
}

export async function getSlowRequests(params: URLSearchParams) {
  return getApi<SlowRequest[]>(`/monitor/dashboard/slow-requests?${params.toString()}`)
}

export async function getTraceOverview(params: URLSearchParams) {
  return getApi<TraceOverview>(`/monitor/dashboard/trace-overview?${params.toString()}`)
}

export async function getTraceTrend(params: URLSearchParams) {
  return getApi<TrendPoint[]>(`/monitor/dashboard/trace-trend?${params.toString()}`)
}

export async function getTraces(params: URLSearchParams) {
  return getApi<TraceSummary[]>(`/monitor/dashboard/traces?${params.toString()}`)
}

export async function getTraceDetail(traceId: string, params: URLSearchParams) {
  return getApi<TraceDetail>(`/monitor/dashboard/traces/${traceId}?${params.toString()}`)
}

export async function getPageAnalytics(params: URLSearchParams) {
  return getApi<PageAnalyticsRow[]>(`/monitor/dashboard/page-analytics?${params.toString()}`)
}

export async function getPageAnalyticsTrend(params: URLSearchParams) {
  return getApi<PageTrendPoint[]>(`/monitor/dashboard/page-analytics/trend?${params.toString()}`)
}

export async function getPageDwellDistribution(params: URLSearchParams) {
  return getApi<DwellDistributionBucket[]>(`/monitor/dashboard/page-analytics/dwell-distribution?${params.toString()}`)
}

export async function getHotspots(params: URLSearchParams) {
  return getApi<HotspotRow[]>(`/monitor/dashboard/hotspots?${params.toString()}`)
}

export async function getHotspotTrend(params: URLSearchParams) {
  return getApi<HotspotTrendPoint[]>(`/monitor/dashboard/hotspots/trend?${params.toString()}`)
}

export async function getHotspotSamples(params: URLSearchParams) {
  return getApi<EventRecord[]>(`/monitor/dashboard/hotspots/samples?${params.toString()}`)
}
