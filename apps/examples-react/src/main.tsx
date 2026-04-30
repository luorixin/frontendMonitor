import React, { useState } from "react"
import ReactDOM from "react-dom/client"
import {
  WebTracingErrorBoundary,
  WebTracingProvider,
  captureError,
  getOptions,
  track,
  useWebTracing
} from "@frontend-monitor/react"
import "./style.css"

function Dashboard() {
  const tracing = useWebTracing()
  const [count, setCount] = useState(0)
  const [lastAction, setLastAction] = useState("waiting")

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">React Adapter</p>
        <h1>frontend-monitor React example</h1>
        <p className="lede">
          这个示例演示 `WebTracingProvider`、`WebTracingErrorBoundary` 和 `useWebTracing()`
          的配合方式。
        </p>
      </section>

      <section className="panel controls">
        <button
          onClick={() => {
            track("react.example.custom", { count }, true)
            setLastAction("sent custom track event")
          }}
        >
          Track custom event
        </button>
        <button
          onClick={() => {
            captureError(new Error("React manual error"), { source: "button" }, true)
            setLastAction("sent manual error")
          }}
        >
          Capture manual error
        </button>
        <button
          onClick={() => {
            const next = count + 1
            setCount(next)
            tracing.setUser(`react-user-${next}`)
            setLastAction(`set user react-user-${next}`)
          }}
        >
          Set user via hook
        </button>
        <button
          onClick={() => {
            throw new Error("React render handler error")
          }}
        >
          Throw React error
        </button>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Runtime state</h2>
          <pre>{JSON.stringify(getOptions(), null, 2)}</pre>
        </article>
        <article className="panel">
          <h2>UI state</h2>
          <pre>{JSON.stringify({ count, lastAction }, null, 2)}</pre>
        </article>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <WebTracingProvider
      options={{
        appName: "frontend-monitor-react-example",
        appVersion: "0.1.0",
        capture: {
          performance: true
        },
        debug: true,
        dsn: "/monitor-api/collect"
      }}
    >
      <WebTracingErrorBoundary fallback={<div className="fallback">React error captured.</div>}>
        <Dashboard />
      </WebTracingErrorBoundary>
    </WebTracingProvider>
  </React.StrictMode>
)
