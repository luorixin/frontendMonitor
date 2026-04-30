# frontend-monitor

第一阶段目标是实现一个可验证的浏览器端监控 SDK MVP，并提供本地 demo 和 mock 接收端。

## Commands

```bash
pnpm install
pnpm changeset
pnpm dev
pnpm dev:example:vue3
pnpm dev:example:react
pnpm dev:example:nuxt3
pnpm test
pnpm build
pnpm release
```

## Apps

- `apps/demo`: 本地演示页面，默认运行在 Vite 开发服务器。
- `apps/examples-vue3`: Vue 3 真实接入示例，默认端口 `4174`。
- `apps/examples-react`: React 真实接入示例，默认端口 `4175`。
- `apps/examples-nuxt3`: Nuxt 3 真实接入示例，默认端口 `3001`。
- `apps/mock-server`: 本地接收端，默认运行在 `http://localhost:4318`。
- `packages/core`: 浏览器端监控 SDK。
- `packages/vue3`: Vue 3 插件层，桥接 `app.config.errorHandler`。
- `packages/react`: React 适配层，提供 `WebTracingProvider` 和 `WebTracingErrorBoundary`。
- `packages/nuxt3`: Nuxt 3 模块层，注入 client-only plugin。

## Phase 1

当前版本包含：

- 手动 API：`init`、`destroy`、`track`、`captureError`、`setUser`、`beforeSend`、`flush`、`sendLocal`
- 自动采集：全局错误、Promise reject、`fetch` 失败、`XMLHttpRequest` 失败、PV、路由变化、点击事件、导航性能
- 曝光能力：`intersectionObserver`、`intersectionUnobserve`、`intersectionDisconnect`
- 基础性能采集：页面导航性能事件
- 上报链路：内存队列、批量发送、采样、忽略上报地址、`sendBeacon`/`image`/`xhr` 三段降级、页面关闭时 `beacon` flush
- 本地化模式：`localization: true` 时先写入 `localStorage`，业务可手动调用 `sendLocal()`
- 错误聚合：`scopeError: true` 时短时间重复错误会聚合到首条错误事件的 `scopeCount`
- 发送前处理：内置脱敏 hook，会统一处理 `token`、手机号、身份证号、输入框内容

当前版本不包含：

- 录屏
- 自动离线重试

## Framework Adapters

### Vue 3

```ts
import { createApp } from "vue"
import WebTracingPlugin from "@frontend-monitor/vue3"

const app = createApp(App)

app.use(WebTracingPlugin, {
  dsn: "/monitor-api/collect",
  appName: "vue3-app",
  captureVueErrors: true
})
```

### React

```tsx
import {
  WebTracingErrorBoundary,
  WebTracingProvider
} from "@frontend-monitor/react"

export function Root() {
  return (
    <WebTracingProvider
      options={{
        dsn: "/monitor-api/collect",
        appName: "react-app"
      }}
    >
      <WebTracingErrorBoundary>
        <App />
      </WebTracingErrorBoundary>
    </WebTracingProvider>
  )
}
```

### Nuxt 3

```ts
export default defineNuxtConfig({
  modules: ["@frontend-monitor/nuxt3"],
  frontendMonitor: {
    dsn: "/monitor-api/collect",
    appName: "nuxt3-app",
    captureVueErrors: true
  }
})
```

## Example Apps

- `pnpm dev:example:vue3`
  启动 mock server + Vue 3 示例，演示插件安装、`useWebTracing()` 和 Vue 错误桥接。
- `pnpm dev:example:react`
  启动 mock server + React 示例，演示 `WebTracingProvider`、`WebTracingErrorBoundary` 和 hook 用法。
- `pnpm dev:example:nuxt3`
  启动 mock server + Nuxt 3 示例，演示 module 配置和 client plugin 自动接入。

## Release

- 版本管理使用 Changesets，配置见 `.changeset/config.json`
- CI 校验见 `.github/workflows/ci.yml`
- 自动发版见 `.github/workflows/release.yml`
- 维护说明见 [docs/release.md](./docs/release.md)
