# frontend-monitor-react

React 适配层，提供 `WebTracingProvider`、`WebTracingErrorBoundary` 和 `useWebTracing()`。

## Install

```bash
pnpm add frontend-monitor-react frontend-monitor-core
```

## Usage

```tsx
import {
  WebTracingErrorBoundary,
  WebTracingProvider
} from "frontend-monitor-react"

export function Root() {
  return (
    <WebTracingProvider
      options={{
        dsn: "https://your-domain.example/collect",
        appName: "my-react-app"
      }}
    >
      <WebTracingErrorBoundary fallback={<div>Something went wrong</div>}>
        <App />
      </WebTracingErrorBoundary>
    </WebTracingProvider>
  )
}
```

## Hook

```tsx
import { useWebTracing } from "frontend-monitor-react"

function Button() {
  const tracing = useWebTracing()
  return <button onClick={() => tracing.track("cta_click")}>Track</button>
}
```

## Tree-shaking Friendly Usage

`frontend-monitor-react` 根入口会沿用 `frontend-monitor-core` 的默认 built-in integrations。想按需打包时，改用 `frontend-monitor-react/lite`，并从 `frontend-monitor-react/integrations/*` 引入需要的采集模块：

```tsx
import {
  WebTracingProvider,
  WebTracingErrorBoundary
} from "frontend-monitor-react/lite"
import { JSErrorIntegration } from "frontend-monitor-react/integrations/js-error"
import { PerformanceIntegration } from "frontend-monitor-react/integrations/performance"

export function Root() {
  return (
    <WebTracingProvider
      options={{
        dsn: "https://your-domain.example/collect",
        appName: "my-react-app",
        integrations: [new JSErrorIntegration(), new PerformanceIntegration()]
      }}
    >
      <WebTracingErrorBoundary fallback={<div>Something went wrong</div>}>
        <App />
      </WebTracingErrorBoundary>
    </WebTracingProvider>
  )
}
```

完整接入示例见：

- https://github.com/luorixin/frontendMonitor/tree/master/apps/examples-react
