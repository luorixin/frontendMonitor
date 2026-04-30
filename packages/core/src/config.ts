import type { MonitorOptions, ResolvedMonitorOptions } from "./types"

const DEFAULT_CAPTURE = {
  click: true,
  consoleError: true,
  exposure: true,
  fetchError: true,
  jsError: true,
  pageView: true,
  performance: false,
  promiseRejection: true,
  requestPerformance: false,
  resourceError: true,
  routeChange: true,
  xhrError: true
} as const satisfies Record<keyof Required<import("./types").CaptureOptions>, boolean>

export const DEFAULT_OPTIONS: Omit<
  ResolvedMonitorOptions,
  "dsn" | "appName" | "appVersion" | "userId"
> = {
  afterSend: undefined,
  batchSize: 5,
  beforePushEvent: undefined,
  beforeSend: undefined,
  capture: { ...DEFAULT_CAPTURE },
  debug: false,
  flushInterval: 5000,
  ignoreUrls: [],
  localization: false,
  localizationKey: "__frontend_monitor_local__",
  maxQueueLength: 200,
  sampleRate: 1,
  scopeError: false,
  timeout: 5000
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
  const maxQueueLength = Math.max(
    1,
    options.maxQueueLength ?? DEFAULT_OPTIONS.maxQueueLength
  )
  const timeout = Math.max(
    0,
    options.timeout ?? DEFAULT_OPTIONS.timeout
  )

  return {
    afterSend: options.afterSend ?? DEFAULT_OPTIONS.afterSend,
    appName: options.appName,
    appVersion: options.appVersion,
    batchSize: Math.max(1, options.batchSize ?? DEFAULT_OPTIONS.batchSize),
    beforePushEvent: options.beforePushEvent ?? DEFAULT_OPTIONS.beforePushEvent,
    beforeSend: options.beforeSend ?? DEFAULT_OPTIONS.beforeSend,
    capture,
    debug: options.debug ?? DEFAULT_OPTIONS.debug,
    dsn: options.dsn,
    flushInterval: Math.max(
      0,
      options.flushInterval ?? DEFAULT_OPTIONS.flushInterval
    ),
    ignoreUrls,
    localization: options.localization ?? DEFAULT_OPTIONS.localization,
    localizationKey:
      options.localizationKey ?? DEFAULT_OPTIONS.localizationKey,
    localizationOverflow: options.localizationOverflow ?? DEFAULT_OPTIONS.localizationOverflow,
    maxQueueLength,
    sampleRate,
    scopeError: options.scopeError ?? DEFAULT_OPTIONS.scopeError,
    timeout,
    userId: options.userId
  }
}

function clampSampleRate(value: number): number {
  if (Number.isNaN(value)) return 1
  return Math.min(1, Math.max(0, value))
}
