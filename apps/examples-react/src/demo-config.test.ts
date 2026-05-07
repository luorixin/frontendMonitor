import { describe, expect, it } from "vitest"
import {
  DEFAULT_DIST,
  DEFAULT_ENVIRONMENT,
  DEFAULT_RELEASE,
  DEFAULT_SOURCEMAP_ARTIFACT,
  DEFAULT_SOURCEMAP_STACK,
  createLocalBackendOptions
} from "./demo-config"

describe("createLocalBackendOptions", () => {
  it("targets the local backend collect endpoint and enables session replay", () => {
    expect(createLocalBackendOptions()).toMatchObject({
      appName: "frontend-monitor-react-example",
      appVersion: "0.1.0",
      debug: true,
      dsn: "http://localhost:8080/api/v1/monitor/collect/demo-project-key",
      dist: DEFAULT_DIST,
      environment: DEFAULT_ENVIRONMENT,
      release: DEFAULT_RELEASE,
      sessionReplay: {
        enabled: true,
        sampleRate: 1
      }
    })
  })
})

describe("DEFAULT_SOURCEMAP_STACK", () => {
  it("matches the artifact path expected by the backend source map lookup", () => {
    expect(DEFAULT_SOURCEMAP_ARTIFACT).toBe("/assets/app.min.js")
    expect(DEFAULT_SOURCEMAP_STACK).toContain(
      "http://localhost:4175/assets/app.min.js:1:1"
    )
  })
})
