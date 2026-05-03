# frontend-monitor-core

浏览器端监控 SDK 核心包，负责初始化、自动采集、手动埋点、队列上报、脱敏 hook、本地化缓存和页面退出发送。

## Install

```bash
pnpm add frontend-monitor-core
```

## Quick Start

```ts
import { init, track, captureError } from "frontend-monitor-core"

init({
  dsn: "/api/v1/monitor/collect/demo-project-key",
  appName: "my-app"
})

track("button_click", { area: "hero" })
captureError(new Error("manual error"))
```

## Main APIs

- `init(options)`
- `destroy()`
- `track(eventName, params?, flush?)`
- `captureError(error, params?, flush?)`
- `setUser(userId)`
- `beforeSend(handler)`
- `beforePushEvent(handler)`
- `afterSend(handler)`
- `flush()`
- `sendLocal()`
- `getOptions()`
- `intersectionObserver()`
- `intersectionUnobserve()`
- `intersectionDisconnect()`

## MonitorOptions

`init()` 的参数类型来自 `MonitorOptions`。下面按字段整理实际含义、默认值和使用建议。

### 必填字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `dsn` | `string` | 是 | 数据上报地址。SDK 会把它自动加入 `ignoreUrls`，避免监控请求递归采集。 |
| `appName` | `string` | 是 | 应用名称，会进入每次上报的 `base.appName`。 |

### 基础信息

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `appVersion` | `string` | 无 | 应用版本号，适合做版本维度筛选。 |
| `userId` | `string` | 无 | 当前用户标识，会写入 `base.userId`。也可以在初始化后通过 `setUser()` 动态设置。 |
| `debug` | `boolean` | `false` | 开启后会在控制台打印采样丢弃、发送成功/失败、离线丢弃等调试日志。 |

### 队列与发送

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `sampleRate` | `number` | `1` | 采样率，范围会被钳制到 `0 ~ 1`。只影响普通入队事件，不影响显式 `flush = true` 的事件。 |
| `batchSize` | `number` | `5` | 队列达到该数量后立即触发发送。最小为 `1`。 |
| `flushInterval` | `number` | `5000` | 定时批量发送间隔，单位毫秒。最小为 `0`。 |
| `maxQueueLength` | `number` | `200` | 内存队列最大长度。超出后会丢弃最早的事件，保留最新事件。 |
| `timeout` | `number` | `5000` | 网络发送超时时间，单位毫秒。主要用于 `xhr/fetch` 发送链路。 |
| `ignoreUrls` | `Array<string \\| RegExp>` | `[] + dsn` | 需要忽略的请求地址。匹配到的 `fetch/xhr` 请求不会进入监控事件。SDK 会自动追加当前 `dsn`。 |
| `offlineRetry` | `boolean` | `true` | 离线或发送失败时把 payload 写入本地队列，在线后自动重试。 |
| `offlineQueueKey` | `string` | `__frontend_monitor_offline__` | 自动离线重试队列的 `localStorage` key。 |
| `retryMaxAttempts` | `number` | `3` | 自动重试最大次数。 |
| `retryBaseDelay` | `number` | `1000` | 自动重试基础退避时间，单位毫秒。 |
| `maxPayloadBytes` | `number` | `65536` | 单次 payload 最大字节数，超出后不再尝试传输。 |
| `maxOfflinePayloads` | `number` | `50` | 自动离线重试队列最多保留的 payload 数。 |
| `maxBreadcrumbs` | `number` | `50` | payload 中最多携带的 breadcrumb 数。 |

### 采集开关

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `capture` | `CaptureOptions` | 见下表 | 控制自动采集模块是否启用。未传时使用默认配置。 |

`capture` 的子字段如下：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `jsError` | `true` | 采集运行时脚本错误。 |
| `promiseRejection` | `true` | 采集未处理的 Promise rejection。 |
| `consoleError` | `true` | 采集 `console.error(...)`。 |
| `resourceError` | `true` | 采集脚本、样式、图片等资源加载失败。 |
| `fetchError` | `true` | 采集失败的 `fetch` 请求。 |
| `xhrError` | `true` | 采集失败的 `XMLHttpRequest` 请求。 |
| `performance` | `false` | 采集页面性能事件。当前默认关闭。 |
| `requestPerformance` | `false` | 采集成功请求的性能事件。当前默认关闭。 |
| `pageView` | `true` | 初始化时自动发送一次 PV。 |
| `routeChange` | `true` | 采集 `hashchange / pushState / replaceState / popstate`。 |
| `click` | `true` | 采集点击事件。输入类元素内容会被脱敏。 |
| `exposure` | `true` | 允许曝光采集能力；需要你主动调用 `intersectionObserver()` 注册目标元素。 |

### 本地化缓存

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `localization` | `boolean` | `false` | 开启后，发送前的 payload 不会立刻上报，而是写入 `localStorage`。适合手动控制发送时机。 |
| `localizationKey` | `string` | `__frontend_monitor_local__` | 本地化缓存使用的 `localStorage` key。 |
| `localizationOverflow` | `(error: Error) => void` | 无 | 当 `localStorage` 写入失败时触发，常见原因是容量超限或浏览器限制。 |

本地化模式的运行语义：

- `localization = true` 时，`flush()` 触发的是“写入本地”，不是“立即联网发送”。
- 真正发送本地缓存需要手动调用 `sendLocal()`。
- `sendLocal()` 会逐条发送；失败的数据会保留，成功的数据会被移除。

### 诊断上下文

初始化时可传入 `release`、`environment`、`tags`、`contexts`，运行时也可通过：

- `setRelease(release)`
- `setEnvironment(environment)`
- `setTag(key, value)`
- `setContext(key, value)`
- `addBreadcrumb(breadcrumb)`
- `clearContext()`

SDK 会自动把路由、点击、失败请求和 `console.error` 写入 breadcrumbs，随下一次 payload 上报。

### 错误聚合

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `scopeError` | `boolean` | `false` | 开启后，会对部分重复错误做短窗口聚合，减少循环报错对上报量的冲击。 |

### Hook

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `beforePushEvent` | `(event) => event \\| event[] \\| false` | 无 | 在事件进入队列前执行。可修改、拆分或丢弃单个事件。 |
| `beforeSend` | `(payload) => payload \\| false` | 无 | 在 payload 真正发送前执行。可统一脱敏、改写字段或阻止本批次发送。 |
| `afterSend` | `(result, payload) => void` | 无 | 在一次发送结束后执行，可用于记录发送回执、埋点调试或失败告警。 |

Hook 执行顺序：

1. 事件生成
2. `beforePushEvent`
3. 入内存队列
4. 组装批量 `payload`
5. `beforeSend`
6. 发送或本地化缓存
7. `afterSend`

## 行为说明

### 1. `sampleRate` 只影响普通事件

`track(..., true)` 或 `captureError(..., true)` 这种显式 `flush = true` 的调用不会经过普通采样丢弃逻辑，适合关键事件。

### 2. 离线时当前实现不会自动排队

检测到浏览器处于 `offline` 状态时，事件会直接丢弃，不会自动缓存到内存队列。  
如果你需要弱网或离线场景保留数据，建议配合 `localization: true` 和 `sendLocal()` 使用。

### 3. `ignoreUrls` 会自动包含 `dsn`

即使你不手动传 `ignoreUrls`，SDK 也会自动忽略上报接口自身，避免 `request_error` 递归采集。

### 4. `exposure` 开关只控制能力，不会自动扫描 DOM

开启 `capture.exposure` 后，仍然需要手动调用 `intersectionObserver()` 注册目标节点：

```ts
import { init, intersectionObserver } from "frontend-monitor-core"

init({
  dsn: "/api/v1/monitor/collect/demo-project-key",
  appName: "demo",
  capture: {
    exposure: true
  }
})

intersectionObserver({
  target: document.querySelector("#hero-banner")!,
  threshold: 0.5,
  params: { slot: "hero-banner" }
})
```

## Example

下面是一份更完整的初始化示例：

```ts
import {
  afterSend,
  beforePushEvent,
  beforeSend,
  init,
  sendLocal
} from "frontend-monitor-core"

init({
  dsn: "/api/v1/monitor/collect/demo-project-key",
  appName: "us-site-web",
  appVersion: "1.2.3",
  sampleRate: 1,
  batchSize: 10,
  flushInterval: 3000,
  maxQueueLength: 300,
  timeout: 4000,
  debug: true,
  ignoreUrls: [/\\/health$/, "/api/internal/no-track"],
  localization: false,
  scopeError: true,
  capture: {
    performance: true,
    requestPerformance: true,
    exposure: true
  }
})

beforePushEvent((event) => {
  if (event.type === "click" && event.selector.includes(".ignore-track")) {
    return false
  }
  return event
})

beforeSend((payload) => {
  return {
    ...payload,
    base: {
      ...payload.base,
      appVersion: payload.base.appVersion ?? "unknown"
    }
  }
})

afterSend((result, payload) => {
  console.log("monitor send result", result, payload.events.length)
})

void sendLocal()
```

## Type Source

如果你要核对配置的真实类型定义，源码以这里为准：

- [src/types.ts](./src/types.ts)
- [src/config.ts](./src/config.ts)

更多仓库级说明见：

- https://github.com/luorixin/frontendMonitor#readme
- https://github.com/luorixin/frontendMonitor/blob/master/docs/release.md
