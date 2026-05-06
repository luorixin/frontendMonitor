import { getTable, postApi, postVoid } from "./client"
import type { AlertEvaluation, AlertRecord, AlertRule } from "../types/models"

export async function listAlertRules(params: URLSearchParams) {
  return getTable<AlertRule>(`/monitor/alerts/rules?${params.toString()}`)
}

export async function listAlertRecords(params: URLSearchParams) {
  return getTable<AlertRecord>(`/monitor/alerts/records?${params.toString()}`)
}

export async function createAlertRule(body: {
  enabled: boolean
  eventType?: string
  name: string
  projectId: number
  thresholdCount: number
  windowMinutes: number
}) {
  return postApi<AlertRule>("/monitor/alerts/rules", body)
}

export async function updateAlertRuleStatus(id: number, enabled: boolean) {
  await postVoid(`/monitor/alerts/rules/${id}/status`, { enabled })
}

export async function testAlertRule(id: number) {
  return postApi<AlertEvaluation>(`/monitor/alerts/rules/${id}/test`)
}
