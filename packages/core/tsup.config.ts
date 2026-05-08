import { defineConfig } from "tsup"
import { readdirSync, readFileSync } from "node:fs"

const INTEGRATIONS_DIR = new URL("./src/integrations", import.meta.url)

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string }

const integrationEntries = Object.fromEntries(
  readdirSync(INTEGRATIONS_DIR)
    .filter(file => file.endsWith(".ts"))
    .map(file => [
      `integrations/${file.replace(/\.ts$/, "")}`,
      `src/integrations/${file}`
    ])
)

export default defineConfig({
  clean: true,
  define: {
    __FRONTEND_MONITOR_SDK_VERSION__: JSON.stringify(packageJson.version)
  },
  dts: true,
  entry: {
    index: "src/index.ts",
    lite: "src/lite.ts",
    ...integrationEntries
  },
  format: ["esm"],
  sourcemap: true,
  minify: true,
  target: "es2022"
})
