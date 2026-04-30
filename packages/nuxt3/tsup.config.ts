import { defineConfig } from "tsup"

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts", "src/runtime/plugin.client.ts"],
  external: [
    "nuxt",
    "@nuxt/kit",
    "#app",
    "@frontend-monitor/core",
    "@frontend-monitor/vue3"
  ],
  format: ["esm"],
  sourcemap: true,
  target: "es2022"
})
