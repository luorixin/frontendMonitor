import { defineConfig } from "tsup"
import { readFileSync } from "node:fs"

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string }

export default defineConfig({
  clean: true,
  define: {
    __FRONTEND_MONITOR_SDK_VERSION__: JSON.stringify(packageJson.version)
  },
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  sourcemap: true,
  minify: true,
  target: "es2022"
})
