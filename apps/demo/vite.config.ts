import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: 4173,
    proxy: {
      "/monitor-api": {
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor-api/, ""),
        target: "http://localhost:4318"
      }
    }
  }
})
