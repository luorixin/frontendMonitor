import type { ReplaySession } from "../../../types/models"

export type ReplayPlayerData = {
  replayId: string
  startedAt?: string
  initialUrl?: string
  events: unknown[]
}

type ReplayChunkPayload = {
  events?: unknown[]
}

function extractChunkEvents(payloadJson: string): unknown[] {
  const parsed = JSON.parse(payloadJson) as ReplayChunkPayload | unknown[]

  if (Array.isArray(parsed)) {
    return parsed
  }

  if (parsed && Array.isArray(parsed.events)) {
    return parsed.events
  }

  throw new Error("Replay chunk payload does not contain playable events")
}

export function adaptReplaySession(session: ReplaySession): ReplayPlayerData {
  const chunks = [...(session.chunks || [])].sort((left, right) => left.sequenceNo - right.sequenceNo)
  const events: unknown[] = []

  for (const chunk of chunks) {
    if (!chunk.payloadJson || !chunk.payloadJson.trim()) {
      continue
    }

    events.push(...extractChunkEvents(chunk.payloadJson))
  }

  if (events.length === 0) {
    throw new Error("Replay session does not contain playable events")
  }

  return {
    replayId: session.replayId,
    startedAt: session.startedAt,
    initialUrl: session.initialUrl,
    events
  }
}
