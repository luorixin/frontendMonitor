import { getApi, getTable } from "./client"
import type { ReplaySession } from "../types/models"

export async function listReplays(params: URLSearchParams) {
  return getTable<ReplaySession>(`/monitor/replays?${params.toString()}`)
}

export async function getReplay(replayId: string) {
  return getApi<ReplaySession>(`/monitor/replays/${replayId}`)
}
