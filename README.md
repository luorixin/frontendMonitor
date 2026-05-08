# frontend-monitor

一个面向浏览器端监控的 monorepo，包含：

- 可发布的 SDK 包：`core`、`react`、`vue3`、`nuxt3`
- 本地接入示例和 demo
- mock 接收端
- 后端落库、查询与回放接口
- 报表与管理台

## Packages

- `packages/core`: 浏览器端监控核心 SDK，提供自动采集、手动埋点、队列发送、脱敏、离线重试、session replay、trace context、自定义 transport 和插件化 integrations。
- `packages/react`: React 适配层，提供 `WebTracingProvider`、`WebTracingErrorBoundary` 和 `useWebTracing()`。
- `packages/vue3`: Vue 3 适配层，提供插件安装、依赖注入和 `app.config.errorHandler` 错误桥接。
- `packages/nuxt3`: Nuxt 3 模块层，自动注入 client-only plugin，并复用 Vue 3 适配层。

## Apps

- `apps/demo`: 本地演示页面。
- `apps/examples-vue3`: Vue 3 真实接入示例。
- `apps/examples-react`: React 真实接入示例，默认连本地 backend，方便验证 session replay 和 source map。
- `apps/examples-nuxt3`: Nuxt 3 真实接入示例。
- `apps/mock-server`: 轻量本地接收端。
- `apps/backend`: 后端服务，负责事件、replay、source map 等接口与存储。
- `apps/report`: 报表与管理台。

## Current Capabilities

当前仓库里的 SDK 能力已经覆盖：

- 手动 API：`init`、`destroy`、`track`、`captureError`、`flush`、`sendLocal`
- 自动采集：JS error、Promise rejection、`fetch/xhr` 异常、PV、路由变化、点击、曝光、页面停留、性能事件
- 性能与诊断：Web Vitals、resource/navigation performance、breadcrumbs、`release/environment/tags/contexts`
- 可靠性：批量发送、采样、离线重试、本地缓存、payload 大小限制、页面退出 flush
- 数据治理：默认脱敏、自定义 sanitize 规则、`beforeSend` / `beforePushEvent` / `afterSend`
- 扩展能力：可插拔 integrations、自定义 transport、trace context / `traceparent`
- 高体积场景：session replay、显式 `compression` 配置、replay gzip 默认开启
- 后端联动：source map 上传与还原、replay 查询与详情查看

## Tree-shaking Friendly Usage

根入口继续保留默认 built-in integrations，方便直接接入；如果业务方希望按需打包，改用各包的 `lite` 入口。

### Core

```ts
import { init } from "frontend-monitor-core/lite"
import { JSErrorIntegration } from "frontend-monitor-core/integrations/js-error"
import { PerformanceIntegration } from "frontend-monitor-core/integrations/performance"

init({
  dsn: "/api/v1/monitor/collect/demo-project-key",
  appName: "demo",
  integrations: [new JSErrorIntegration(), new PerformanceIntegration()]
})
```

### React

```tsx
import { WebTracingProvider } from "frontend-monitor-react/lite"
import { JSErrorIntegration } from "frontend-monitor-react/integrations/js-error"

export function Root() {
  return (
    <WebTracingProvider
      options={{
        dsn: "/api/v1/monitor/collect/demo-project-key",
        appName: "react-app",
        integrations: [new JSErrorIntegration()]
      }}
    >
      <App />
    </WebTracingProvider>
  )
}
```

### Vue 3

```ts
import { createApp } from "vue"
import App from "./App.vue"
import WebTracingPlugin from "frontend-monitor-vue3/lite"
import { PerformanceIntegration } from "frontend-monitor-vue3/integrations/performance"

const app = createApp(App)

app.use(WebTracingPlugin, {
  dsn: "/api/v1/monitor/collect/demo-project-key",
  appName: "vue3-app",
  integrations: [new PerformanceIntegration()]
})
```

### Nuxt 3

```ts
import { JSErrorIntegration } from "frontend-monitor-nuxt3/integrations/js-error"

export default defineNuxtConfig({
  modules: ["frontend-monitor-nuxt3/lite"],
  frontendMonitor: {
    dsn: "/api/v1/monitor/collect/demo-project-key",
    appName: "nuxt3-app",
    integrations: [new JSErrorIntegration()]
  }
})
```

## Source Layout

`packages/core/src` 现在按职责拆分为：

- `api/`: 对外 API、integration 注册和默认装配
- `core/`: 配置、types、状态、hooks、生命周期
- `pipeline/`: 队列、发送、压缩、replay、payload 处理
- `storage/`: localization、offline retry、异步存储
- `capture/`: 具体采集实现
- `integrations/`: 可插拔 integration 类
- `__tests__/`: 单元测试和浏览器 fake
- `utils/`: 通用工具

## Commands

```bash
pnpm install
pnpm dev
pnpm dev:example:vue3
pnpm dev:example:react
pnpm dev:example:nuxt3
pnpm test
pnpm build
pnpm changeset
pnpm release
pnpm release:local
```

## Example Apps

- `pnpm dev:example:vue3`: 启动 mock server + Vue 3 示例，演示插件安装、`useWebTracing()` 和 Vue 错误桥接。
- `pnpm dev:example:react`: 启动 backend + React 示例，演示 replay 关联错误、source map 还原和 provider / boundary 接入。
- `pnpm dev:example:nuxt3`: 启动 mock server + Nuxt 3 示例，演示 module 配置和 client plugin 自动接入。

## Docs

- [packages/core/README.md](./packages/core/README.md)
- [packages/react/README.md](./packages/react/README.md)
- [packages/vue3/README.md](./packages/vue3/README.md)
- [packages/nuxt3/README.md](./packages/nuxt3/README.md)
- [apps/backend/README.md](./apps/backend/README.md)
- [docs/release.md](./docs/release.md)
- [docs/web-tracing-analysis.md](./docs/web-tracing-analysis.md)

## Release

- 版本管理使用 Changesets，配置见 `.changeset/config.json`
- CI 校验见 `.github/workflows/ci.yml`
- 自动发版见 `.github/workflows/release.yml`
- `pnpm release` 只做本地版本准备，不会直接推 npm
- 需要本地手动发包时使用 `pnpm release:local`，并先完成 `npm login`
