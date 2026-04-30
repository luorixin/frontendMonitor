import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4174,
    proxy: {
      "/monitor-api": {
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor-api/, ""),
        target: "http://localhost:4318"
      }
    }
  }
})
