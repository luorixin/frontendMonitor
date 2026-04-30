import type { MonitorOptions, ResolvedMonitorOptions } from "./types"

const DEFAULT_CAPTURE = {
  jsError: true,
  promiseRejection: true,
  fetchError: true,
  pageView: true,
  routeChange: true,
  click: true
} as const

export const DEFAULT_OPTIONS: Omit<
  ResolvedMonitorOptions,
  "dsn" | "appName" | "appVersion" | "userId"
> = {
  batchSize: 5,
  capture: { ...DEFAULT_CAPTURE },
  debug: false,
  flushInterval: 5000,
  ignoreUrls: [],
  sampleRate: 1
}

export const SDK_VERSION = "0.1.0"

export function normalizeOptions(
  options: MonitorOptions
): ResolvedMonitorOptions {
  const capture = {
    ...DEFAULT_CAPTURE,
    ...(options.capture ?? {})
  }

  const sampleRate = clampSampleRate(options.sampleRate ?? 1)
  const ignoreUrls = [...(options.ignoreUrls ?? []), options.dsn]

  return {
    appName: options.appName,
    appVersion: options.appVersion,
    batchSize: Math.max(1, options.batchSize ?? DEFAULT_OPTIONS.batchSize),
    beforeSend: options.beforeSend,
    capture,
    debug: options.debug ?? DEFAULT_OPTIONS.debug,
    dsn: options.dsn,
    flushInterval: Math.max(
      0,
      options.flushInterval ?? DEFAULT_OPTIONS.flushInterval
    ),
    ignoreUrls,
    sampleRate,
    userId: options.userId
  }
}

function clampSampleRate(value: number): number {
  if (Number.isNaN(value)) return 1
  return Math.min(1, Math.max(0, value))
}
