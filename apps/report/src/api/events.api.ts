import { getApi, getTable } from "./client"
import type { EventRaw, EventRecord, ResolvedEvent } from "../types/models"

export async function listEvents(params: URLSearchParams) {
  return getTable<EventRecord>(`/monitor/events?${params.toString()}`)
}

export async function getEvent(id: number) {
  return getApi<EventRecord>(`/monitor/events/${id}`)
}

export async function getEventRaw(id: number) {
  return getApi<EventRaw>(`/monitor/events/${id}/raw`)
}

export async function getResolvedEvent(id: number) {
  return getApi<ResolvedEvent>(`/monitor/events/${id}/resolved`)
}
