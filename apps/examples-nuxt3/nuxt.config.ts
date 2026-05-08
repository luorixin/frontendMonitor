import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: {
    enabled: false
  },
  modules: ["frontend-monitor-nuxt3"],
  frontendMonitor: {
    appName: "frontend-monitor-nuxt3-example",
    appVersion: "0.1.0",
    capture: {
      performance: true,
      requestPerformance: true
    },
    captureVueErrors: true,
    debug: true,
    dsn: "/monitor-api/collect"
  },
  nitro: {
    devProxy: {
      "/monitor-api": {
        changeOrigin: true,
        target: "http://localhost:4318"
      }
    }
  }
})
