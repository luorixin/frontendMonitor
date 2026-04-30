# @frontend-monitor/react

React 适配层，提供 `WebTracingProvider`、`WebTracingErrorBoundary` 和 `useWebTracing()`。

## Install

```bash
pnpm add @frontend-monitor/react @frontend-monitor/core
```

## Usage

```tsx
import {
  WebTracingErrorBoundary,
  WebTracingProvider
} from "@frontend-monitor/react"

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
import { useWebTracing } from "@frontend-monitor/react"

function Button() {
  const tracing = useWebTracing()
  return <button onClick={() => tracing.track("cta_click")}>Track</button>
}
```

完整接入示例见：

- https://github.com/luorixin/frontendMonitor/tree/master/apps/examples-react
