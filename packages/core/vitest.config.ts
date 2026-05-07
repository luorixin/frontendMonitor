import { defineConfig } from "vitest/config"
import { readFileSync } from "node:fs"

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string }

export default defineConfig({
  define: {
    __FRONTEND_MONITOR_SDK_VERSION__: JSON.stringify(packageJson.version)
  },
  test: {
    environment: "jsdom",
    globals: true
  }
})
