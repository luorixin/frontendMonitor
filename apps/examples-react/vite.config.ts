import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4175,
    proxy: {
      "/monitor-api": {
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor-api/, ""),
        target: "http://localhost:4318"
      }
    }
  }
})
