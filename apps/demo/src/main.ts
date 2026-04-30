import {
  captureError,
  destroy,
  getOptions,
  init,
  track
} from "@frontend-monitor/core"
import "./style.css"

const apiBase = "/monitor-api"
const dsn = `${apiBase}/collect`

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app container")
}

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">frontend-monitor</p>
      <h1>Browser Monitor MVP Demo</h1>
      <p class="lede">
        这个页面会验证初始化、手动上报、自动错误采集、fetch 失败采集、
        路由变化和点击事件。
      </p>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Control</h2>
        <div class="controls">
          <button data-action="init">Init SDK</button>
          <button data-action="destroy">Destroy SDK</button>
          <button data-action="track">Track Custom</button>
          <button data-action="captureError">Capture Error</button>
          <button data-action="promiseReject">Promise Reject</button>
          <button data-action="fetch404">Fetch 404</button>
          <button data-action="fetchNetwork">Fetch Network Error</button>
          <button data-action="routePush">Push Route</button>
          <button data-action="routeHash">Hash Route</button>
        </div>
      </div>

      <div class="panel">
        <h2>Click Zone</h2>
        <div class="click-zone">
          <button class="accent">Primary Action</button>
          <button class="muted">Secondary Action</button>
          <a href="javascript:void(0)" class="linkish">Focusable text link</a>
          <p>
            点这里附近的元素可以触发自动 click 采集，文案会被截断到 80 个字符。
          </p>
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Local State</h2>
        <pre id="state-panel">Waiting for init...</pre>
      </div>
      <div class="panel">
        <h2>Last Received Payloads</h2>
        <pre id="events-panel">Polling mock server...</pre>
      </div>
    </section>
  </main>
`

const statePanel = document.querySelector<HTMLPreElement>("#state-panel")
const eventsPanel = document.querySelector<HTMLPreElement>("#events-panel")

let initialized = false
let routeIndex = 0

const demoOptions = {
  appName: "frontend-monitor-demo",
  appVersion: "0.1.0",
  batchSize: 2,
  debug: true,
  dsn,
  flushInterval: 1500
}

function renderState() {
  if (!statePanel) return

  const options = getOptions()
  statePanel.textContent = JSON.stringify(
    {
      initialized,
      options
    },
    null,
    2
  )
}

async function refreshEventsPanel() {
  if (!eventsPanel) return

  try {
    const response = await fetch(`${apiBase}/events`)
    const payload = await response.json()
    eventsPanel.textContent = JSON.stringify(payload, null, 2)
  } catch (error) {
    eventsPanel.textContent = JSON.stringify(
      {
        error: error instanceof Error ? error.message : "Failed to load events"
      },
      null,
      2
    )
  }
}

function ensureInit() {
  if (initialized) return

  init(demoOptions)
  initialized = true
  renderState()
}

function wireButtons() {
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action

      if (action === "init") {
        ensureInit()
        await refreshEventsPanel()
        return
      }

      if (action === "destroy") {
        destroy()
        initialized = false
        renderState()
        return
      }

      ensureInit()

      switch (action) {
        case "track":
          track("demo.custom.click", {
            routeIndex,
            scene: "button"
          }, true)
          break
        case "captureError":
          captureError(new Error("Manual demo error"), { scene: "manual" }, true)
          break
        case "promiseReject":
          Promise.reject(new Error("Demo promise rejection"))
          break
        case "fetch404":
          await fetch(`${apiBase}/bad-request`)
          break
        case "fetchNetwork":
          try {
            await fetch("http://localhost:4319/network-error")
          } catch {
            // The SDK should capture this failed request automatically.
          }
          break
        case "routePush":
          routeIndex += 1
          history.pushState({}, "", `/screen/${routeIndex}`)
          break
        case "routeHash":
          routeIndex += 1
          window.location.hash = `step-${routeIndex}`
          break
        default:
          break
      }

      renderState()
      await new Promise(resolve => setTimeout(resolve, 400))
      await refreshEventsPanel()
    })
  })
}

wireButtons()
renderState()
void refreshEventsPanel()
window.setInterval(() => {
  void refreshEventsPanel()
}, 2000)
