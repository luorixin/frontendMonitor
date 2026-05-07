import type { MonitorOptions } from "frontend-monitor-react"

export const LOCAL_BACKEND_DSN =
  "http://localhost:8080/api/v1/monitor/collect/demo-project-key"
export const LOCAL_REPORT_URL = "http://localhost:4176"
export const DEFAULT_RELEASE = "react-example-local-sourcemap"
export const DEFAULT_DIST = "react-example-web"
export const DEFAULT_ENVIRONMENT = "local-report-stack"
export const DEFAULT_SOURCEMAP_ARTIFACT = "/assets/app.min.js"
export const SAMPLE_SOURCE_MAP_DOWNLOAD_PATH = "/app.min.js.map"
export const DEFAULT_SOURCEMAP_STACK = [
  "Error: minified boom",
  `    at boom (http://localhost:4175${DEFAULT_SOURCEMAP_ARTIFACT}:1:1)`
].join("\n")

export function createLocalBackendOptions(): MonitorOptions {
  return {
    appName: "frontend-monitor-react-example",
    appVersion: "0.1.0",
    capture: {
      performance: true,
      requestPerformance: true
    },
    debug: true,
    dsn: LOCAL_BACKEND_DSN,
    dist: DEFAULT_DIST,
    environment: DEFAULT_ENVIRONMENT,
    release: DEFAULT_RELEASE,
    sessionReplay: {
      enabled: true,
      flushInterval: 2000,
      maxEvents: 10,
      sampleRate: 1
    }
  }
}

export function createSourceMapValidationError(): Error {
  const error = new Error("minified boom")
  error.name = "SourceMapValidationError"
  error.stack = DEFAULT_SOURCEMAP_STACK
  return error
}
