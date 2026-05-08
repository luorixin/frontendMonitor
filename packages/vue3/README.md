# frontend-monitor-vue3

Vue 3 适配层，基于 `frontend-monitor-core` 提供插件安装、依赖注入和 `app.config.errorHandler` 错误桥接。

## Install

```bash
pnpm add frontend-monitor-vue3 frontend-monitor-core
```

## Usage

```ts
import { createApp } from "vue"
import App from "./App.vue"
import WebTracingPlugin from "frontend-monitor-vue3"

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
import { useWebTracing } from "frontend-monitor-vue3"

const tracing = useWebTracing()
tracing.track("cta_click")
```

## Tree-shaking Friendly Usage

`frontend-monitor-vue3` 根入口会继续保留默认 built-in integrations。想按需打包时，改用 `frontend-monitor-vue3/lite`，并从 `frontend-monitor-vue3/integrations/*` 选择要挂载的采集模块：

```ts
import { createApp } from "vue"
import App from "./App.vue"
import WebTracingPlugin from "frontend-monitor-vue3/lite"
import { JSErrorIntegration } from "frontend-monitor-vue3/integrations/js-error"
import { PerformanceIntegration } from "frontend-monitor-vue3/integrations/performance"

const app = createApp(App)

app.use(WebTracingPlugin, {
  dsn: "https://your-domain.example/collect",
  appName: "my-vue3-app",
  integrations: [new JSErrorIntegration(), new PerformanceIntegration()]
})
```

完整接入示例见：

- https://github.com/luorixin/frontendMonitor/tree/master/apps/examples-vue3
