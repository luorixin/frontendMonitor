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
    "runtime/plugin.client": "src/runtime/plugin.client.ts",
    "runtime/plugin.lite": "src/runtime/plugin.lite.ts",
    ...integrationEntries
  },
  external: [
    "nuxt",
    "@nuxt/kit",
    "#app",
    "frontend-monitor-core",
    "frontend-monitor-core/lite",
    "frontend-monitor-vue3",
    "frontend-monitor-vue3/lite"
  ],
  format: ["esm"],
  sourcemap: true,
  minify: true,
  target: "es2022"
})
