import { defineConfig } from "tsup"
import { readdirSync } from "node:fs"

const integrationEntries = Object.fromEntries(
  readdirSync(new URL("./src/integrations", import.meta.url))
    .filter(file => file.endsWith(".ts"))
    .map(file => [
      `integrations/${file.replace(/\.ts$/, "")}`,
      `src/integrations/${file}`
    ])
)

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
    lite: "src/lite.ts",
    ...integrationEntries
  },
  external: ["vue", "frontend-monitor-core", "frontend-monitor-core/lite"],
  format: ["esm"],
  sourcemap: true,
  minify: true,
  target: "es2022"
})
