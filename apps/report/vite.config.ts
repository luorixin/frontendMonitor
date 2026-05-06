import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/react-router/") || id.includes("/react-router-dom/")) {
              return "router-vendor"
            }

            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
              return "react-vendor"
            }

            if (
              id.includes("/antd/") ||
              id.includes("/@ant-design/") ||
              id.includes("/rc-") ||
              id.includes("/@rc-component/")
            ) {
              return "antd-vendor"
            }
          }

          if (
            id.includes("/apps/report/src/components/") ||
            id.includes("/apps/report/src/app/layout/") ||
            id.includes("/apps/report/src/app/project.tsx") ||
            id.includes("/apps/report/src/app/session.tsx") ||
            id.includes("/apps/report/src/api/") ||
            id.includes("/apps/report/src/utils/") ||
            id.includes("/apps/report/src/types/")
          ) {
            return "report-shared"
          }

          return undefined
        }
      }
    }
  },
  plugins: [react()],
  server: {
    port: 4176,
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "http://localhost:8080"
      }
    }
  }
})
