import type {
  MonitorOptions,
  ResolvedMonitorOptions,
  SessionReplayOptions
} from "./types"

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

const DEFAULT_SESSION_REPLAY = {
  enabled: false,
  endpoint: "",
  flushInterval: 5000,
  maskAllInputs: true,
  maxEvents: 20,
  maxPayloadBytes: 128 * 1024,
  sampleRate: 0
} as const satisfies Required<SessionReplayOptions>

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
	  maxBreadcrumbs: 50,
	  maxOfflinePayloads: 50,
	  maxPayloadBytes: 64 * 1024,
	  offlineQueueKey: "__frontend_monitor_offline__",
	  offlineRetry: true,
	  retryBaseDelay: 1000,
	  retryMaxAttempts: 3,
	  sampleRate: 1,
	  scopeError: false,
	  contexts: {},
	  environment: undefined,
	  release: undefined,
	  sessionReplay: { ...DEFAULT_SESSION_REPLAY },
	  tags: {},
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
	  const maxPayloadBytes = Math.max(
	    0,
	    options.maxPayloadBytes ?? DEFAULT_OPTIONS.maxPayloadBytes
	  )
  const sessionReplay = normalizeSessionReplayOptions(options)

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
	    contexts: { ...(options.contexts ?? DEFAULT_OPTIONS.contexts) },
	    environment: options.environment ?? DEFAULT_OPTIONS.environment,
	    maxBreadcrumbs: Math.max(
	      0,
	      options.maxBreadcrumbs ?? DEFAULT_OPTIONS.maxBreadcrumbs
	    ),
	    maxOfflinePayloads: Math.max(
	      0,
	      options.maxOfflinePayloads ?? DEFAULT_OPTIONS.maxOfflinePayloads
	    ),
	    maxPayloadBytes,
	    maxQueueLength,
	    offlineQueueKey: options.offlineQueueKey ?? DEFAULT_OPTIONS.offlineQueueKey,
	    offlineRetry: options.offlineRetry ?? DEFAULT_OPTIONS.offlineRetry,
	    release: options.release ?? DEFAULT_OPTIONS.release,
	    retryBaseDelay: Math.max(
	      0,
	      options.retryBaseDelay ?? DEFAULT_OPTIONS.retryBaseDelay
	    ),
	    retryMaxAttempts: Math.max(
	      0,
	      options.retryMaxAttempts ?? DEFAULT_OPTIONS.retryMaxAttempts
	    ),
	    sampleRate,
	    sessionReplay,
	    scopeError: options.scopeError ?? DEFAULT_OPTIONS.scopeError,
	    tags: { ...(options.tags ?? DEFAULT_OPTIONS.tags) },
	    timeout,
	    userId: options.userId
	  }
}

function normalizeSessionReplayOptions(
  options: MonitorOptions
): ResolvedMonitorOptions["sessionReplay"] {
  const raw =
    typeof options.sessionReplay === "boolean"
      ? { enabled: options.sessionReplay }
      : (options.sessionReplay ?? {})

  return {
    enabled: raw.enabled ?? false,
    endpoint: raw.endpoint ?? deriveReplayEndpoint(options.dsn),
    flushInterval: Math.max(
      0,
      raw.flushInterval ?? DEFAULT_SESSION_REPLAY.flushInterval
    ),
    maskAllInputs: raw.maskAllInputs ?? DEFAULT_SESSION_REPLAY.maskAllInputs,
    maxEvents: Math.max(1, raw.maxEvents ?? DEFAULT_SESSION_REPLAY.maxEvents),
    maxPayloadBytes: Math.max(
      1024,
      raw.maxPayloadBytes ?? DEFAULT_SESSION_REPLAY.maxPayloadBytes
    ),
    sampleRate: clampSampleRate(
      raw.sampleRate ?? DEFAULT_SESSION_REPLAY.sampleRate
    )
  }
}

function deriveReplayEndpoint(dsn: string): string {
  return dsn.replace("/collect/", "/replays/")
}

function clampSampleRate(value: number): number {
  if (Number.isNaN(value)) return 1
  return Math.min(1, Math.max(0, value))
}
