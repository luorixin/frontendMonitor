import { createApp } from "vue"
import WebTracingPlugin from "frontend-monitor-vue3"
import App from "./App.vue"
import "./style.css"

const app = createApp(App)

app.use(WebTracingPlugin, {
  appName: "frontend-monitor-vue3-example",
  appVersion: "0.1.0",
  capture: {
    performance: true
  },
  captureVueErrors: true,
  debug: true,
  dsn: "/monitor-api/collect"
})

app.mount("#app")
