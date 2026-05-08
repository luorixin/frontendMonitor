# frontend-monitor-nuxt3

Nuxt 3 模块适配层，运行时会在 client 端自动把 `frontend-monitor-vue3` 安装到 `nuxtApp.vueApp`。

## Install

```bash
pnpm add frontend-monitor-nuxt3 frontend-monitor-core frontend-monitor-vue3
```

## Usage

```ts
export default defineNuxtConfig({
  modules: ["frontend-monitor-nuxt3"],
  frontendMonitor: {
    dsn: "https://your-domain.example/collect",
    appName: "my-nuxt3-app",
    captureVueErrors: true
  }
})
```

## Notes

- 该模块只在 client 端注入监控插件。
- 业务侧常规手动埋点 API 继续从 `frontend-monitor-core` 引入。

## Tree-shaking Friendly Usage

`frontend-monitor-nuxt3` 根入口仍然走默认 built-in integrations。想按需打包时，改用 `frontend-monitor-nuxt3/lite`，并通过 `frontend-monitor-nuxt3/integrations/*` 传入显式 integrations：

```ts
import { JSErrorIntegration } from "frontend-monitor-nuxt3/integrations/js-error"
import { PerformanceIntegration } from "frontend-monitor-nuxt3/integrations/performance"

export default defineNuxtConfig({
  modules: ["frontend-monitor-nuxt3/lite"],
  frontendMonitor: {
    dsn: "https://your-domain.example/collect",
    appName: "my-nuxt3-app",
    integrations: [new JSErrorIntegration(), new PerformanceIntegration()]
  }
})
```

完整接入示例见：

- https://github.com/luorixin/frontendMonitor/tree/master/apps/examples-nuxt3
