import type {
  CompressionOptions,
  MonitorOptions,
  ResolvedMonitorOptions,
  SanitizeOptions,
  SessionReplayOptions
} from "./types"

declare const __FRONTEND_MONITOR_SDK_VERSION__: string | undefined

const DEFAULT_CAPTURE = {
  click: true,
  consoleError: true,
  exposure: true,
  fetchError: true,
  jsError: true,
  pageView: true,
  performance: true,
  promiseRejection: true,
  requestPerformance: true,
  resourceError: true,
  routeChange: true,
  xhrError: true
} as const satisfies Record<keyof Required<import("./types").CaptureOptions>, boolean>

const DEFAULT_SESSION_REPLAY = {
  canvas: {
    enabled: false,
    recordCanvas: false,
    samplingInterval: 100
  },
  enabled: false,
  endpoint: "",
  errorLinked: {
    consoleError: {
      excludePatterns: [],
      includePatterns: []
    },
    maxTriggersPerSession: 3,
    pageMatcher: [],
    postTriggerMs: 15_000,
    preTriggerMs: 15_000,
    requestError: {
      includeAborts: false,
      includeNetworkErrors: true,
      includeTimeouts: true,
      statusCodes: [],
      statusRanges: ["5xx"]
    },
    resourceError: {
      resourceTypes: [],
      urlPatterns: []
    },
    triggerOn: [
      "js_error",
      "promise_rejection",
      "console_error",
      "request_error"
    ]
  },
  flushInterval: 5000,
  maskAllInputs: true,
  maxEvents: 20,
  maxPayloadBytes: 128 * 1024,
  mode: "error-linked",
  privacy: {
    blockClass: "",
    ignoreClass: "",
    maskAllInputs: true
  },
  sample: {
    errorSessionRate: 1,
    fullSessionRate: 0
  },
  sampleRate: 0
} as const satisfies Required<SessionReplayOptions>

const DEFAULT_SANITIZE = {
  enabled: true,
  redactValue: "[REDACTED]",
  sensitiveKeys: [],
  textPatterns: []
} as const satisfies Required<SanitizeOptions>

const DEFAULT_TRACE = {
  enabled: false,
  propagateTraceparent: false,
  sampleRate: 1
} as const

const DEFAULT_COMPRESSION = {
  algorithm: "gzip",
  eventPayloads: false,
  sessionReplay: true
} as const satisfies Required<CompressionOptions>

export const DEFAULT_OPTIONS: Omit<
  ResolvedMonitorOptions,
	  "dsn" | "appName" | "appVersion" | "userId"
	> = {
	  afterSend: undefined,
  batchSize: 5,
  beforePushEvent: undefined,
  beforeSend: undefined,
  capture: { ...DEFAULT_CAPTURE },
  compression: { ...DEFAULT_COMPRESSION },
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
	  dist: undefined,
	  environment: undefined,
	  release: undefined,
	  sessionReplay: { ...DEFAULT_SESSION_REPLAY },
  sanitize: { ...DEFAULT_SANITIZE },
  tags: {},
  trace: { ...DEFAULT_TRACE },
  transport: undefined,
  integrations: [],
  timeout: 5000
	}

export const SDK_VERSION =
  typeof __FRONTEND_MONITOR_SDK_VERSION__ === "string"
    ? __FRONTEND_MONITOR_SDK_VERSION__
    : "0.0.0"

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
  const sanitize = normalizeSanitizeOptions(options)
  const trace = normalizeTraceOptions(options)
  const compression = normalizeCompressionOptions(options)

	  return {
	    afterSend: options.afterSend ?? DEFAULT_OPTIONS.afterSend,
    appName: options.appName,
    appVersion: options.appVersion,
    batchSize: Math.max(1, options.batchSize ?? DEFAULT_OPTIONS.batchSize),
    beforePushEvent: options.beforePushEvent ?? DEFAULT_OPTIONS.beforePushEvent,
    beforeSend: options.beforeSend ?? DEFAULT_OPTIONS.beforeSend,
    capture,
    compression,
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
	    dist: options.dist ?? DEFAULT_OPTIONS.dist,
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
	    sanitize,
	    scopeError: options.scopeError ?? DEFAULT_OPTIONS.scopeError,
	    tags: { ...(options.tags ?? DEFAULT_OPTIONS.tags) },
	    trace,
	    transport: options.transport ?? DEFAULT_OPTIONS.transport,
	    integrations: [...(options.integrations ?? DEFAULT_OPTIONS.integrations)],
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
    canvas: {
      enabled:
        raw.canvas?.enabled ?? DEFAULT_SESSION_REPLAY.canvas.enabled,
      recordCanvas:
        raw.canvas?.recordCanvas ?? DEFAULT_SESSION_REPLAY.canvas.recordCanvas,
      samplingInterval: Math.max(
        0,
        raw.canvas?.samplingInterval ??
          DEFAULT_SESSION_REPLAY.canvas.samplingInterval
      )
    },
    enabled: raw.enabled ?? false,
    endpoint: raw.endpoint ?? deriveReplayEndpoint(options.dsn),
    errorLinked: {
      consoleError: {
        excludePatterns: [
          ...(raw.errorLinked?.consoleError?.excludePatterns ??
            DEFAULT_SESSION_REPLAY.errorLinked.consoleError.excludePatterns)
        ],
        includePatterns: [
          ...(raw.errorLinked?.consoleError?.includePatterns ??
            DEFAULT_SESSION_REPLAY.errorLinked.consoleError.includePatterns)
        ]
      },
      maxTriggersPerSession: Math.max(
        1,
        raw.errorLinked?.maxTriggersPerSession ??
          DEFAULT_SESSION_REPLAY.errorLinked.maxTriggersPerSession
      ),
      pageMatcher: [
        ...(raw.errorLinked?.pageMatcher ??
          DEFAULT_SESSION_REPLAY.errorLinked.pageMatcher)
      ],
      postTriggerMs: Math.max(
        0,
        raw.errorLinked?.postTriggerMs ??
          DEFAULT_SESSION_REPLAY.errorLinked.postTriggerMs
      ),
      preTriggerMs: Math.max(
        0,
        raw.errorLinked?.preTriggerMs ??
          DEFAULT_SESSION_REPLAY.errorLinked.preTriggerMs
      ),
      requestError: {
        includeAborts:
          raw.errorLinked?.requestError?.includeAborts ??
          DEFAULT_SESSION_REPLAY.errorLinked.requestError.includeAborts,
        includeNetworkErrors:
          raw.errorLinked?.requestError?.includeNetworkErrors ??
          DEFAULT_SESSION_REPLAY.errorLinked.requestError.includeNetworkErrors,
        includeTimeouts:
          raw.errorLinked?.requestError?.includeTimeouts ??
          DEFAULT_SESSION_REPLAY.errorLinked.requestError.includeTimeouts,
        statusCodes: [
          ...(raw.errorLinked?.requestError?.statusCodes ??
            DEFAULT_SESSION_REPLAY.errorLinked.requestError.statusCodes)
        ],
        statusRanges: [
          ...(raw.errorLinked?.requestError?.statusRanges ??
            DEFAULT_SESSION_REPLAY.errorLinked.requestError.statusRanges)
        ]
      },
      resourceError: {
        resourceTypes: [
          ...(raw.errorLinked?.resourceError?.resourceTypes ??
            DEFAULT_SESSION_REPLAY.errorLinked.resourceError.resourceTypes)
        ],
        urlPatterns: [
          ...(raw.errorLinked?.resourceError?.urlPatterns ??
            DEFAULT_SESSION_REPLAY.errorLinked.resourceError.urlPatterns)
        ]
      },
      triggerOn:
        raw.errorLinked?.triggerOn?.length
          ? [...raw.errorLinked.triggerOn]
          : [...DEFAULT_SESSION_REPLAY.errorLinked.triggerOn]
    },
    flushInterval: Math.max(
      0,
      raw.flushInterval ?? DEFAULT_SESSION_REPLAY.flushInterval
    ),
    maskAllInputs:
      raw.privacy?.maskAllInputs ??
      raw.maskAllInputs ??
      DEFAULT_SESSION_REPLAY.maskAllInputs,
    maxEvents: Math.max(1, raw.maxEvents ?? DEFAULT_SESSION_REPLAY.maxEvents),
    maxPayloadBytes: Math.max(
      1024,
      raw.maxPayloadBytes ?? DEFAULT_SESSION_REPLAY.maxPayloadBytes
    ),
    mode:
      raw.mode ??
      (raw.sampleRate !== undefined || raw.maskAllInputs !== undefined
        ? "full"
        : DEFAULT_SESSION_REPLAY.mode),
    privacy: {
      blockClass:
        raw.privacy?.blockClass ?? DEFAULT_SESSION_REPLAY.privacy.blockClass,
      ignoreClass:
        raw.privacy?.ignoreClass ?? DEFAULT_SESSION_REPLAY.privacy.ignoreClass,
      maskAllInputs:
        raw.privacy?.maskAllInputs ??
        raw.maskAllInputs ??
        DEFAULT_SESSION_REPLAY.privacy.maskAllInputs
    },
    sample: {
      errorSessionRate: clampSampleRate(
        raw.sample?.errorSessionRate ??
          raw.sampleRate ??
          DEFAULT_SESSION_REPLAY.sample.errorSessionRate
      ),
      fullSessionRate: clampSampleRate(
        raw.sample?.fullSessionRate ??
          raw.sampleRate ??
          DEFAULT_SESSION_REPLAY.sample.fullSessionRate
      )
    },
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

function normalizeSanitizeOptions(
  options: MonitorOptions
): ResolvedMonitorOptions["sanitize"] {
  return {
    enabled: options.sanitize?.enabled ?? DEFAULT_SANITIZE.enabled,
    redactValue: options.sanitize?.redactValue ?? DEFAULT_SANITIZE.redactValue,
    sensitiveKeys: [...(options.sanitize?.sensitiveKeys ?? [])],
    textPatterns: [...(options.sanitize?.textPatterns ?? [])]
  }
}

function normalizeTraceOptions(
  options: MonitorOptions
): ResolvedMonitorOptions["trace"] {
  return {
    enabled: options.trace?.enabled ?? DEFAULT_TRACE.enabled,
    propagateTraceparent:
      options.trace?.propagateTraceparent ?? DEFAULT_TRACE.propagateTraceparent,
    sampleRate: clampSampleRate(options.trace?.sampleRate ?? DEFAULT_TRACE.sampleRate)
  }
}

function normalizeCompressionOptions(
  options: MonitorOptions
): ResolvedMonitorOptions["compression"] {
  if (typeof options.compression === "boolean") {
    return {
      algorithm: DEFAULT_COMPRESSION.algorithm,
      eventPayloads: options.compression,
      sessionReplay: options.compression
    }
  }

  return {
    algorithm: options.compression?.algorithm ?? DEFAULT_COMPRESSION.algorithm,
    eventPayloads:
      options.compression?.eventPayloads ?? DEFAULT_COMPRESSION.eventPayloads,
    sessionReplay:
      options.compression?.sessionReplay ?? DEFAULT_COMPRESSION.sessionReplay
  }
}
