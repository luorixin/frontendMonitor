# @frontend-monitor/vue3

Vue 3 适配层，基于 `@frontend-monitor/core` 提供插件安装、依赖注入和 `app.config.errorHandler` 错误桥接。

## Install

```bash
pnpm add @frontend-monitor/vue3 @frontend-monitor/core
```

## Usage

```ts
import { createApp } from "vue"
import App from "./App.vue"
import WebTracingPlugin from "@frontend-monitor/vue3"

const app = createApp(App)

app.use(WebTracingPlugin, {
  dsn: "https://your-domain.example/collect",
  appName: "my-vue3-app",
  captureVueErrors: true
})

app.mount("#app")
```

## Composable

```ts
import { useWebTracing } from "@frontend-monitor/vue3"

const tracing = useWebTracing()
tracing.track("cta_click")
```

完整接入示例见：

- https://github.com/luorixin/frontendMonitor/tree/master/apps/examples-vue3
