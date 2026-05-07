import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import {
  WebTracingErrorBoundary,
  WebTracingProvider,
  captureError,
  useWebTracing
} from "frontend-monitor-react"
import {
  DEFAULT_DIST,
  DEFAULT_ENVIRONMENT,
  DEFAULT_RELEASE,
  DEFAULT_SOURCEMAP_ARTIFACT,
  LOCAL_REPORT_URL,
  SAMPLE_SOURCE_MAP_DOWNLOAD_PATH,
  createLocalBackendOptions,
  createSourceMapValidationError
} from "./demo-config"
import "./style.css"

function Dashboard() {
  const tracing = useWebTracing()
  const [count, setCount] = useState(0)
  const [lastAction, setLastAction] = useState("waiting")
  const [lastReplayFlushAt, setLastReplayFlushAt] = useState("not flushed")
  const [runtimeJson, setRuntimeJson] = useState("{}")

  function refreshRuntimeState() {
    setRuntimeJson(
      JSON.stringify({
        activeReplayId: tracing.getReplayId(),
        options: tracing.getOptions()
      }, null, 2)
    )
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshRuntimeState()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  async function flushReplayNow() {
    await tracing.flushSessionReplay()
    setLastReplayFlushAt(new Date().toLocaleTimeString())
    setLastAction("flushed replay chunks to the backend")
    refreshRuntimeState()
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">React Adapter</p>
        <h1>frontend-monitor React example</h1>
        <p className="lede">
          这个示例默认接到本地 report backend，专门用于验证 session replay 上报和
          source map 还原，不再只连接 mock server。
        </p>
      </section>

      <section className="grid summary-grid">
        <article className="panel">
          <h2>Local Targets</h2>
          <div className="meta-list">
            <span>Release</span>
            <code>{DEFAULT_RELEASE}</code>
            <span>Environment</span>
            <code>{DEFAULT_ENVIRONMENT}</code>
            <span>Dist</span>
            <code>{DEFAULT_DIST}</code>
            <span>Artifact</span>
            <code>{DEFAULT_SOURCEMAP_ARTIFACT}</code>
          </div>
        </article>
        <article className="panel">
          <h2>Validation Steps</h2>
          <ol className="steps">
            <li>先启动 `pnpm dev:report-stack`。</li>
            <li>
              打开 <a href={LOCAL_REPORT_URL} rel="noreferrer" target="_blank">report 管理台</a>，
              使用 `admin / admin123456` 登录。
            </li>
            <li>先在本页做几次点击，再发送 replay 关联错误或 sourcemap 验证错误。</li>
            <li>
              到 report 的 Replay 页面确认 session 和 chunk，必要时点本页的
              `Flush replay now`。
            </li>
            <li>
              到 Source Map 页面上传
              <a href={SAMPLE_SOURCE_MAP_DOWNLOAD_PATH} download>
                示例 map 文件
              </a>
              ，`Release` 填 <code>{DEFAULT_RELEASE}</code>，`Dist` 填 <code>{DEFAULT_DIST}</code>，
              `Artifact` 填 <code>{DEFAULT_SOURCEMAP_ARTIFACT}</code>。
            </li>
            <li>回到事件详情页查看 `Resolved Stack` 是否出现 `src/app.ts:1:1`。</li>
          </ol>
        </article>
      </section>

      <section className="panel controls">
        <button
          onClick={() => {
            tracing.track("react.example.custom", { count }, true)
            setLastAction("sent custom track event")
            refreshRuntimeState()
          }}
        >
          Track custom event
        </button>
        <button
          onClick={() => {
            captureError(new Error("React replay-linked error"), {
              source: "button",
              verification: "replay"
            }, true)
            setLastAction("sent replay-linked error")
            refreshRuntimeState()
          }}
        >
          Capture replay-linked error
        </button>
        <button
          onClick={() => {
            captureError(createSourceMapValidationError(), {
              artifact: DEFAULT_SOURCEMAP_ARTIFACT,
              verification: "source-map"
            }, true)
            setLastAction("sent source-map validation error")
            refreshRuntimeState()
          }}
        >
          Capture sourcemap error
        </button>
        <button
          onClick={() => {
            const next = count + 1
            setCount(next)
            tracing.setUser(`react-user-${next}`)
            setLastAction(`set user react-user-${next}`)
            refreshRuntimeState()
          }}
        >
          Mutate UI and set user
        </button>
        <button
          onClick={() => {
            void flushReplayNow()
          }}
        >
          Flush replay now
        </button>
        <button
          onClick={() => {
            refreshRuntimeState()
            setLastAction("refreshed runtime snapshot")
          }}
        >
          Refresh runtime snapshot
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
          <pre>{runtimeJson}</pre>
        </article>
        <article className="panel">
          <h2>UI state</h2>
          <pre>{JSON.stringify({
            count,
            lastAction,
            lastReplayFlushAt
          }, null, 2)}</pre>
        </article>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <WebTracingProvider
      options={createLocalBackendOptions()}
    >
      <WebTracingErrorBoundary fallback={<div className="fallback">React error captured.</div>}>
        <Dashboard />
      </WebTracingErrorBoundary>
    </WebTracingProvider>
  </React.StrictMode>
)
