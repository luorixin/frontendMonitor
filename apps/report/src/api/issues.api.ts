import { getApi, getTable, postVoid } from "./client"
import type { EventRecord, Issue, TrendPoint } from "../types/models"

export async function listIssues(params: URLSearchParams) {
  return getTable<Issue>(`/monitor/issues?${params.toString()}`)
}

export async function getIssue(id: number) {
  return getApi<Issue>(`/monitor/issues/${id}`)
}

export async function getIssueEvents(id: number, params: URLSearchParams) {
  return getTable<EventRecord>(`/monitor/issues/${id}/events?${params.toString()}`)
}

export async function getIssueTrend(id: number, params: URLSearchParams) {
  return getApi<TrendPoint[]>(`/monitor/issues/${id}/trend?${params.toString()}`)
}

export async function updateIssueStatus(id: number, status: string) {
  await postVoid(`/monitor/issues/${id}/status`, { status })
}

export async function updateIssueAssignment(id: number, assignee: string, priority: string) {
  await postVoid(`/monitor/issues/${id}/assignment`, { assignee, priority })
}
