export type AuthUser = {
  email: string
}

export type Session = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type Project = {
  id: number
  projectName: string
  projectKey: string
  appName: string
  appVersion?: string
  status: number
  description?: string
  allowedOrigins?: string[]
  dsn?: string
  createTime?: string
  updateTime?: string
}

export type DashboardOverview = {
  totalEvents: number
  errorEvents: number
  errorRate: number
  pageViews: number
  uniqueSessions: number
  uniqueUsers: number
  uniqueDevices: number
}

export type TrendPoint = {
  bucket: string
  totalCount: number
  errorCount?: number
  pageViewCount?: number
}

export type WebVitalTrendPoint = {
  bucket: string
  metricName: "CLS" | "FCP" | "INP" | "LCP" | "TTFB"
  navigationMode: "hard" | "soft"
  avgValue: number
  p75Value: number
  sampleCount: number
  goodCount: number
  needsImprovementCount: number
  poorCount: number
}

export type RequestPerformanceTrendPoint = {
  bucket: string
  avgDuration: number
  p75Duration: number
  maxDuration: number
  sampleCount: number
  errorCount: number
}

export type SlowRequest = {
  url: string
  method: string
  transport: string
  avgDuration: number
  p75Duration: number
  maxDuration: number
  sampleCount: number
  errorCount: number
}

export type EventTypeCount = {
  eventType: string
  totalCount: number
}

export type PageStats = {
  url: string
  eventCount: number
  errorCount: number
}

export type EventRecord = {
  id: number
  projectId: number
  issueId?: number
  eventId: string
  issueType?: string
  fingerprint?: string
  eventType: string
  occurredAt: string
  appName: string
  appVersion?: string
  environment?: string
  release?: string
  userId?: string
  deviceId?: string
  sessionId?: string
  pageId?: string
  replayId?: string
  url?: string
  title?: string
  requestMethod?: string
  requestStatus?: number
  duration?: number
  message?: string
  selector?: string
  resourceType?: string
  transport?: string
  eventName?: string
  tagsJson?: string
  contextsJson?: string
  breadcrumbsJson?: string
  traceId?: string
  spanId?: string
  payloadJson?: string
  baseJson?: string
}

export type EventRaw = {
  eventId: string
  payloadJson: string
  baseJson: string
}

export type SourceMapFrame = {
  functionName?: string
  fileName?: string
  lineNumber?: number
  columnNumber?: number
  resolved?: boolean
}

export type ResolvedEvent = {
  eventId: number
  eventType: string
  release?: string
  applied: boolean
  status: string
  originalStack?: string
  resolvedStack?: string
  frames: SourceMapFrame[]
}

export type Issue = {
  id: number
  projectId: number
  issueType: string
  fingerprint: string
  title: string
  firstSeenAt: string
  lastSeenAt: string
  occurrenceCount: number
  latestEventId?: string
  status: string
  assignee?: string
  priority?: string
  commentCount?: number
}

export type AlertRule = {
  id: number
  projectId: number
  name: string
  eventType?: string
  thresholdCount: number
  windowMinutes: number
  enabled: boolean
}

export type AlertRecord = {
  id: number
  ruleId: number
  projectId: number
  eventType?: string
  windowStart: string
  windowEnd: string
  actualCount: number
  thresholdCount: number
  message?: string
  triggeredAt: string
}

export type AlertEvaluation = {
  ruleId: number
  triggered: boolean
  actualCount: number
  thresholdCount: number
  windowStart: string
  windowEnd: string
  message?: string
}

export type SourceMapArtifact = {
  id: number
  projectId: number
  release: string
  artifact: string
  fileName: string
  fileSize: number
  createTime?: string
  updateTime?: string
}

export type ReplayChunk = {
  id: number
  sequenceNo: number
  eventCount: number
  payloadJson: string
  createTime?: string
}

export type ReplaySession = {
  id: number
  projectId: number
  replayId: string
  sessionId?: string
  pageId?: string
  appName?: string
  appVersion?: string
  release?: string
  environment?: string
  userId?: string
  deviceId?: string
  initialUrl?: string
  title?: string
  startedAt?: string
  lastSeenAt?: string
  chunkCount?: number
  eventCount?: number
  chunks?: ReplayChunk[]
}
