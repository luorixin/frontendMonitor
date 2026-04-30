# web-tracing 参考项目分析与使用说明

> 参考仓库：[M-cheng-web/web-tracing](https://github.com/M-cheng-web/web-tracing)
>
> 核验范围：`README.md`、`CHANGELOG.md`、`packages/core/index.ts`、`packages/core/src/lib/*`、`packages/*/index.ts`、`docs/guide/use/options.md`、`docs/guide/functions/exports.md`。

## 1. 项目概览

`web-tracing` 是一个前端监控 SDK，目标是在浏览器侧采集并上报前端运行时数据。它覆盖的能力包括：

- 页面访问与路由跳转：PV、页面停留时长、hash/history 路由变化。
- 用户行为：点击事件、元素路径、触发页面信息。
- 异常监控：JS 运行错误、资源加载错误、Promise 未处理异常、`console.error`、框架错误。
- 请求监控：`fetch`、`XMLHttpRequest` 成功/失败请求。
- 性能监控：首屏、静态资源、接口请求耗时、Performance API 指标。
- 曝光监控：基于 `IntersectionObserver` 统计元素进入/离开视口。
- 错误录屏：基于 `rrweb` 记录错误发生前后的页面操作片段。
- 数据上报控制：批量队列、采样、过滤、hooks、本地化缓存、失败重试。

从代码形态看，它更像一个“采集端 SDK”，并不包含完整服务端分析平台。README 提到可搭配第三方分析平台 [WebTracingAnalysis](https://github.com/boychina/web-tracing-analysis) 使用。

## 2. 包结构与职责

项目采用 pnpm monorepo，工作区包含 `packages/*` 和 `examples/*`。

| 包 | 职责 |
| --- | --- |
| `@web-tracing/core` | 核心 SDK，包含初始化、全局监听/重写、事件队列、上报、采集模块和公开 API。 |
| `@web-tracing/vue2` | Vue2 插件层，安装时接入 `Vue.config.errorHandler` 并调用 core 初始化。 |
| `@web-tracing/vue3` | Vue3 插件层，主要调用 core 初始化并 re-export core API。 |
| `@web-tracing/react` | React 适配层，提供 `init`、`WebTracingProvider`、`useWebTracing`，并 re-export core API。 |
| `@web-tracing/nuxt` | Nuxt module，生成 client plugin，在客户端调用 core `init`。 |

核心入口在 [`packages/core/index.ts`](https://github.com/M-cheng-web/web-tracing/blob/main/packages/core/index.ts)。初始化流程大致为：

1. 校验并创建响应式 `options`。
2. 注册全局重写/监听：error、click、fetch、XHR、history、hash、online/offline 等。
3. 初始化基础信息、发送队列、网络状态。
4. 初始化错误、行为、请求、性能、PV、曝光等模块。
5. 如果 `recordScreen` 开启，则初始化 rrweb 录屏。
6. 设置 `__webTracingInit__`，防止重复初始化。

## 3. 快速接入

### 3.1 Core / 原生 JS

```bash
pnpm add @web-tracing/core
```

```ts
import { init } from '@web-tracing/core'

init({
  dsn: 'https://example.com/monitor/report',
  appName: 'frontend-app',
  appCode: 'frontend-app',
  appVersion: '1.0.0',
  userUuid: 'optional-user-id',
  pv: true,
  performance: true,
  error: true,
  event: true,
  recordScreen: true,
  tracesSampleRate: 1,
  cacheMaxLength: 5,
  cacheWatingTime: 5000,
  timeout: 5000
})
```

### 3.2 Vue2

```bash
pnpm add @web-tracing/vue2
```

```ts
import Vue from 'vue'
import WebTracing from '@web-tracing/vue2'

Vue.use(WebTracing, {
  dsn: 'https://example.com/monitor/report',
  appName: 'vue2-app',
  error: true,
  pv: true,
  performance: true,
  event: true
})
```

Vue2 包会包装 `Vue.config.errorHandler`，把 Vue 组件错误转换为 `traceError` 上报，再继续调用原有 error handler。

### 3.3 Vue3

```bash
pnpm add @web-tracing/vue3
```

```ts
import { createApp } from 'vue'
import WebTracing from '@web-tracing/vue3'
import App from './App.vue'

const app = createApp(App)

app.use(WebTracing, {
  dsn: 'https://example.com/monitor/report',
  appName: 'vue3-app',
  error: true,
  pv: true,
  performance: true,
  event: true
})

app.mount('#app')
```

Vue3 包主要是薄封装：安装时调用 core `init(options)`，并导出 core 的公开 API。

### 3.4 React

```bash
pnpm add @web-tracing/react
```

直接初始化：

```ts
import { init } from '@web-tracing/react'

init({
  dsn: 'https://example.com/monitor/report',
  appName: 'react-app',
  error: true,
  pv: true,
  performance: true,
  event: true
})
```

或使用 Provider：

```tsx
import { WebTracingProvider } from '@web-tracing/react'

export function Root() {
  return (
    <WebTracingProvider
      options={{
        dsn: 'https://example.com/monitor/report',
        appName: 'react-app',
        error: true,
        pv: true,
        performance: true,
        event: true
      }}
    >
      <App />
    </WebTracingProvider>
  )
}
```

### 3.5 Nuxt

```bash
pnpm add @web-tracing/nuxt
```

```ts
export default defineNuxtConfig({
  modules: ['@web-tracing/nuxt'],
  webTracing: {
    dsn: 'https://example.com/monitor/report',
    appName: 'nuxt-app',
    error: true,
    pv: true,
    performance: true,
    event: true
  }
})
```

Nuxt 包通过 `defineNuxtModule` 生成 `web-tracing.client.ts`，只在客户端调用 `init(options)`。

## 4. 初始化配置说明

### 4.1 必填配置

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `dsn` | `string` | 监控数据上报地址，SDK 会自动加入请求忽略列表，避免采集自身上报请求。 |
| `appName` | `string` | 应用名称，会进入 `baseInfo`。 |

### 4.2 应用与用户标识

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `appCode` | `string` | `''` | 应用 code。 |
| `appVersion` | `string` | `''` | 应用版本。 |
| `userUuid` | `string` | `''` | 业务用户 ID，可初始化传入，也可运行时修改。 |
| `ext` | `object` | `{}` | 全局扩展字段，会进入 `baseInfo.ext`。 |

SDK 内部还会生成：

- `sdkUserUuid`：通过内置 fingerprintjs 获取的设备/浏览器指纹。
- `deviceId`：写入 cookie 的 `_webtracing_device_id`。
- `sessionId`：写入会话存储的 `_webtracing_session_id`，默认存活 30 分钟。
- `pageId`：当前页面生命周期内的 ID，SPA 路由变化不会改变。

### 4.3 采集开关

这些配置既可以传布尔值，也可以传对象。传布尔值时会展开为该模块所有子开关。

| 参数 | 子项 | 说明 |
| --- | --- | --- |
| `pv` | `core` | 是否采集页面访问、路由跳转、页面停留数据。 |
| `performance` | `core` | 是否采集静态资源、接口等性能数据。 |
| `performance` | `firstResource` | 是否采集首次进入页面的性能数据。 |
| `performance` | `server` | 是否采集成功接口请求性能。 |
| `error` | `core` | 是否采集 JS 错误、资源错误、Promise 错误、`console.error`。 |
| `error` | `server` | 是否采集失败接口请求错误。 |
| `event` | `core` | 是否采集点击事件。 |

示例：

```ts
init({
  dsn: 'https://example.com/monitor/report',
  appName: 'frontend-app',
  pv: { core: true },
  performance: { core: true, firstResource: true, server: true },
  error: { core: true, server: true },
  event: { core: true }
})
```

### 4.4 上报控制

| 参数 | 类型 | 源码默认值 | 说明 |
| --- | --- | --- | --- |
| `debug` | `boolean` | `false` | 是否输出 SDK 调试日志。 |
| `tracesSampleRate` | `number` | `1` | 采样率，范围应按 `0-1` 使用。 |
| `cacheMaxLength` | `number` | `5` | 队列达到该数量后立即上报。 |
| `cacheWatingTime` | `number` | `5000` | 队列最大等待时间，单位 ms。注意原项目拼写是 `Wating`。 |
| `sendTypeByXmlBody` | `boolean` | `false` | 强制使用 XHR body 方式上报。 |
| `timeout` | `number` | `5000` | XHR 上报超时时间，单位 ms。 |
| `maxQueueLength` | `number` | `200` | 上报接口不可用时，本地内存队列最大长度。 |
| `checkRecoverInterval` | `number` | `1` | 上报接口失败后的恢复检测间隔，单位分钟；源码中 `-1` 表示不检测。 |

注意：官方文档的 `options.md` 对 `checkRecoverInterval` 仍写了默认 `-1`，但 v2.1.2 源码 [`Options`](https://github.com/M-cheng-web/web-tracing/blob/main/packages/core/src/lib/options.ts) 中默认是 `1`。如接入 v2.1.2，应以源码为准。

### 4.5 过滤与聚合

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ignoreErrors` | `Array<string | RegExp>` | `[]` | 错误事件过滤。 |
| `ignoreRequest` | `Array<string | RegExp>` | `[]` | 请求事件过滤；初始化时 SDK 会自动把 `dsn` 加入忽略列表。 |
| `scopeError` | `boolean` | `false` | 是否开启范围错误聚合，用于抑制短时间大量重复错误。 |

### 4.6 hooks

| 参数 | 触发时机 | 返回值 |
| --- | --- | --- |
| `beforePushEventList` | 事件进入队列前 | 返回新事件对象/数组，或返回 `false` 阻止入队。 |
| `beforeSendData` | 上报前 | 返回新上报体，或返回 `false` 阻止发送。 |
| `afterSendData` | 上报后 | 无返回值要求。 |

这些 hook 支持初始化传入，也支持运行时通过公开 API 追加。SDK 会按加入顺序链式执行。

### 4.7 本地化与录屏

| 参数 | 类型 | 源码默认值 | 说明 |
| --- | --- | --- | --- |
| `localization` | `boolean` | `false` | 开启后不主动上报，数据写入 localStorage，由业务手动调用 `sendLocal`。 |
| `localizationOverFlow` | `function` | 空函数 | localStorage 写入失败后的回调。 |
| `recordScreen` | `boolean` | `true` | 是否开启错误录屏。只有错误采集相关场景会使用。 |

注意：官方文档表格里 `recordScreen` 默认值写过 `false`，但源码默认值是 `true`。如果担心隐私或体积，应显式配置 `recordScreen: false`。

## 5. 公开 API 使用说明

公开 API 主要从 `@web-tracing/core` 导出，框架包大多 re-export 这些 API。

### 5.1 生命周期

```ts
import { init, destroyTracing } from '@web-tracing/core'

init({
  dsn: 'https://example.com/monitor/report',
  appName: 'frontend-app'
})

destroyTracing()
```

- `init(options)`：初始化 SDK，重复调用会被 `__webTracingInit__` 拦截。
- `destroyTracing()`：移除 SDK 添加的监听器、恢复被重写的全局方法、清空发送队列，并允许重新初始化。

### 5.2 手动上报

```ts
import {
  traceError,
  tracePerformance,
  traceCustomEvent,
  tracePageView
} from '@web-tracing/core'

traceError(
  {
    eventId: 'manual-error',
    errMessage: '业务主动捕获异常',
    params: { scene: 'checkout' }
  },
  true
)

tracePerformance(
  {
    eventId: 'manual-performance',
    title: '关键接口耗时',
    initiatorType: 'manual',
    requestUrl: location.href,
    duration: 1234
  },
  true
)

traceCustomEvent(
  {
    eventId: 'button-submit',
    title: '提交按钮点击',
    params: { source: 'form' }
  },
  false
)

tracePageView(
  {
    title: document.title,
    action: 'manual'
  },
  true
)
```

第二个参数 `flush` 表示是否立即发送。`flush = true` 时会跳过采样控制并触发发送逻辑。

### 5.3 曝光采集

```ts
import {
  intersectionObserver,
  intersectionUnobserve,
  intersectionDisconnect
} from '@web-tracing/core'

const banner = document.querySelector('#home-banner')

if (banner) {
  intersectionObserver({
    target: banner,
    threshold: 0.5,
    params: {
      module: 'home-banner'
    }
  })
}

// 取消单个/多个元素监听
intersectionUnobserve(banner!)

// 取消全部曝光监听
intersectionDisconnect()
```

曝光事件由 `IntersectionObserver` 驱动，浏览器不支持时该能力不可用。

### 5.4 hooks 运行时追加

```ts
import {
  beforePushEventList,
  beforeSendData,
  afterSendData
} from '@web-tracing/core'

beforePushEventList(events => {
  return events.map((event: any) => ({
    ...event,
    params: {
      ...event.params,
      fromHook: true
    }
  }))
})

beforeSendData(payload => {
  // 推荐在这里做脱敏、字段裁剪、租户信息补充。
  delete payload.baseInfo?.ip
  return payload
})

afterSendData(result => {
  console.log('monitor sent', result.sendType, result.success)
})
```

### 5.5 用户、基础信息与动态配置

源码公开了 `setUserUuid`、`getUserUuid`、`getSDKUserUuid`、`getBaseInfo`、`getFirstScreen`、`getIPs`、`getOptions` 等方法。部分框架包并未显式逐个再导出全部方法，但由于 `export * from '@web-tracing/core'`，通常仍可从框架包访问。

```ts
import {
  options,
  getOptions,
  setUserUuid,
  getUserUuid
} from '@web-tracing/core'

setUserUuid('user-001')
console.log(getUserUuid())

options.value.ext.tenantId = 'tenant-a'
options.value.tracesSampleRate = 0.5

console.log(getOptions())
```

`options` 是 SDK 内部实现的响应式对象，动态修改会被采集与发送逻辑读取到。实际业务中不建议随意修改所有配置，尤其是 `dsn`、采集开关和 hooks。

### 5.6 本地化发送

```ts
import {
  sendLocal,
  setLocalizationOverFlow
} from '@web-tracing/core'

setLocalizationOverFlow(data => {
  console.warn('monitor local storage overflow', data)
})

// 在业务认为合适的时机发送 localStorage 中缓存的数据。
sendLocal()
```

当 `localization: true` 时，SDK 不会自动请求 `dsn`，而是把数据写入 localStorage key `_webtracing_localization_key`。

### 5.7 录屏解压

```ts
import { unzipRecordscreen } from '@web-tracing/core'

const events = unzipRecordscreen(recordscreen)
```

错误事件里的 `recordscreen` 字段是压缩数据，服务端或后台展示端需要解压后再喂给 rrweb player。

## 6. 核心实现分析

### 6.1 `options`：响应式配置中心

`packages/core/src/lib/options.ts` 定义了 `Options` 类和 `initOptions`。它负责：

- 必填校验：`dsn`、`appName`。
- 类型校验：布尔、对象、数组、函数等。
- 布尔开关展开：如 `performance: true` 会展开为 `{ core: true, firstResource: true, server: true }`。
- 默认值合并：使用 `deepAssign` 合并用户配置。
- hooks 转数组：初始化传入的单个 hook 会变为数组，方便后续追加。
- 响应式封装：`options = ref(new Options(initOptions))`。

这套设计的优点是所有模块读取 `options.value`，运行时修改能即时生效。风险是没有限制可变字段，业务误改关键配置会影响全局采集。

### 6.2 `replace`：统一重写与监听中心

`packages/core/src/lib/replace.ts` 负责把浏览器原生事件和 API 转成内部事件：

- 监听：`error`、`unhandledrejection`、`click`、`load`、`beforeunload`、`hashchange`、`popstate`、`offline`、`online`。
- 重写：`console.error`、`XMLHttpRequest.open`、`XMLHttpRequest.send`、`fetch`、`history.pushState`、`history.replaceState`。
- 销毁：保存原始方法，在 `destroyReplace` 中恢复，移除监听。

这是 SDK 的“采集入口层”。它只负责捕获原始信号并丢给 `eventBus`，具体是否上报由业务模块判断。

实现细节里有一个值得注意的问题：`listenOnline` 内部实际注册的仍是 `offline` 事件，并把 handler 存到 `eventListeners.offline`，这看起来像一个 bug。借鉴时应避免照搬。

### 6.3 `eventBus`：采集信号分发

`eventBus` 是事件分发中心。`replace` 捕获到浏览器事件后调用 `eventBus.runEvent(type, ...)`，各业务模块根据 `EVENTTYPES` 订阅并处理：

- 错误模块订阅错误相关事件。
- 请求模块订阅 fetch / XHR 相关事件。
- PV 模块订阅路由与生命周期事件。
- 点击模块订阅 click。
- 性能模块订阅 load / PerformanceObserver 相关数据。

这种模式把“原始采集”和“业务格式化”分开，扩展新模块时比较清晰。

### 6.4 `sendData`：队列、采样与上报降级

`packages/core/src/lib/sendData.ts` 是上报链路核心：

1. `emit(e, flush)` 接收事件。
2. 离线时直接不采集。
3. 非 `flush` 时按 `tracesSampleRate` 抽样。
4. 执行 `beforePushEventList`。
5. 放入内存队列。
6. 如果队列长度达到 `cacheMaxLength` 或 `flush = true`，立即发送；否则等待 `cacheWatingTime`。
7. 发送前组装 `{ baseInfo, eventInfo }`，执行 `beforeSendData`。
8. 根据数据大小选择 `sendBeacon`、图片 GET 或 XHR。
9. 成功后执行 `afterSendData`。
10. 失败时暂停上报，按 `checkRecoverInterval` 做探活恢复。

发送方式选择：

- 优先 `sendBeacon`，但数据超过约 60 KB 时切到 XHR。
- 非 navigator 环境下尝试图片上报，但超过约 2 KB 切到 XHR。
- `sendTypeByXmlBody = true` 时强制 XHR body。

这套机制很适合前端监控：默认批量减少请求数，页面关闭前可用 beacon，超大数据可降级 XHR。

### 6.5 `base`：基础信息

`packages/core/src/lib/base.ts` 负责收集基础信息：

- 屏幕尺寸、视口尺寸、颜色深度、浏览器厂商、平台。
- cookie 中的设备 ID。
- fingerprintjs 生成的 `sdkUserUuid`。
- session ID。
- 应用信息：`appName`、`appCode`、`sdkVersion`。
- 业务用户：`userUuid`。
- 扩展字段：`ext`。
- 公网 IP：通过内置第三方方法异步获取，不保证成功。

基础信息初始化是异步的，`sendData.emit([])` 会在 `_initSuccess` 后触发一次队列发送，避免基础信息未准备好就上报。

### 6.6 `err` 与 `err-batch`：错误采集与聚合

错误模块处理：

- JS 运行时 `ErrorEvent`。
- Promise `unhandledrejection`。
- 资源加载错误。
- `console.error`。
- 手动 `traceError`。
- Vue2 errorHandler 包装后的组件错误。
- 请求失败错误。

开启 `scopeError` 后，会将短时间内重复或大量错误聚合，避免无限错误刷爆服务端。错误事件还可携带 `recordscreen`，用于还原异常前的用户操作路径。

### 6.7 `http`：请求采集

请求模块依赖 `replace` 对 `fetch` 和 XHR 的重写。它通常会关注：

- 请求 URL。
- 请求方法。
- 请求开始和结束时间。
- 响应状态。
- 请求耗时。
- 是否命中 `ignoreRequest`。

成功请求可以作为 performance/server 数据，失败请求可以作为 error/server 数据。SDK 会把自身 `dsn` 加入 `ignoreRequest`，避免上报请求被自身采集造成递归。

### 6.8 `performance`：性能与资源采集

性能模块主要围绕浏览器 Performance API：

- 首次进入页面的 timing 数据。
- 静态资源加载数据。
- 异步加载资源。
- 接口请求性能数据。

原项目文档说明：支持 `PerformanceObserver` 时优先用它；不支持时使用 `MutationObserver` 做部分兼容。资源失败可能在错误模块和资源模块都出现，需要服务端去重或分类展示。

### 6.9 `pv`：路由与停留时长

PV 模块捕获：

- 首次页面加载。
- `hashchange`。
- `history.pushState`。
- `history.replaceState`。
- `popstate`。
- `beforeunload` 页面离开。

事件类型包含：

- `pv`：页面访问/路由变化。
- `pv-duration`：页面停留时长。

SPA 中要特别关注 pageId 与 route 的关系：源码里的 `pageId` 是页面生命周期 ID，不是每个路由一个 ID。

### 6.10 `event` 与 `event-dwell`：行为采集

行为模块主要处理点击事件：

- 通过捕获阶段监听 document click。
- 使用 throttle 限流。
- 从目标元素提取标签、文本、路径等信息。
- 生成 `eventType: click` 的事件。

这类数据量可能很大，生产环境建议配合采样、白名单或 `beforePushEventList` 过滤。

### 6.11 `intersectionObserver`：曝光采集

曝光模块向外暴露：

- `intersectionObserver({ target, threshold, params })`
- `intersectionUnobserve(target)`
- `intersectionDisconnect()`

它适合业务在具体页面手动注册关键模块曝光。阈值 `threshold` 可理解为元素可见比例，例如 `0.5` 表示进入/离开半屏可见边界时触发。

### 6.12 `recordscreen`：错误录屏

录屏模块使用 `rrweb`，并配合 `pako`、`js-base64` 做压缩与编码。错误事件可带上压缩后的录屏片段，后台需要通过 `unzipRecordscreen` 解压后播放。

优势是排查复杂用户路径非常直观；风险是数据体积、隐私合规、敏感输入脱敏都必须额外治理。

## 7. 上报数据模型

SDK 上报体大体如下：

```ts
type MonitorPayload = {
  baseInfo: {
    appName: string
    appCode: string
    appVersion?: string
    userUuid: string
    sdkUserUuid: string
    deviceId: string
    sessionId: string
    pageId: string
    sdkVersion: string
    ip?: string
    ext?: Record<string, unknown>
    sendTime: number
    [key: string]: unknown
  }
  eventInfo: Array<{
    eventType: string
    eventId?: string
    triggerPageUrl?: string
    triggerTime?: number
    sendTime?: number
    params?: Record<string, unknown>
    [key: string]: unknown
  }>
}
```

常见事件类型来自 `SEDNEVENTTYPES`：

| eventType | 含义 |
| --- | --- |
| `pv` | 页面访问/路由跳转。 |
| `pv-duration` | 页面停留时长。 |
| `error` | 错误事件。 |
| `performance` | 性能/资源/接口性能事件。 |
| `click` | 点击事件。 |
| `dwell` | 页面卸载/停留相关事件。 |
| `custom` | 手动自定义事件。 |
| `intersection` | 曝光事件。 |

常见 `eventId` 来自 `SENDID`：

| eventId | 含义 |
| --- | --- |
| `page` | 页面事件。 |
| `resource` | 资源事件。 |
| `server` | 接口请求事件。 |
| `code` | JS 代码错误。 |
| `reject` | Promise reject。 |
| `console.error` | 控制台错误。 |

服务端需要能接收批量事件数组，而不是只接收单条事件。建议按 `appName/appCode + eventType + eventId + triggerTime + userUuid/sdkUserUuid + sessionId` 建索引，便于查询和聚合。

## 8. 优点与可借鉴点

- 批量队列：`cacheMaxLength` + `cacheWatingTime` 能显著减少监控请求数。
- 采样策略：`tracesSampleRate` 可在流量过大时快速降采集成本。
- hook 链路：`beforePushEventList` 和 `beforeSendData` 给业务留了脱敏、过滤、补字段入口。
- 发送降级：`sendBeacon`、图片、XHR 三种方式覆盖页面关闭、小数据、大数据场景。
- 本地化模式：`localization` 允许业务控制发送时机，适合离线、低优先级或弱网场景。
- 错误聚合：`scopeError` 能缓解循环报错、重复报错对服务端的冲击。
- 薄适配层：框架包基本不重复核心逻辑，易维护。
- 可销毁：`destroyTracing` 恢复全局 patch，方便微前端或多应用场景重新初始化。

## 9. 风险与改造建议

- 隐私合规：录屏、IP、设备指纹、点击文本、DOM 路径都可能包含敏感信息；生产使用前必须脱敏并明确用户授权。
- 体积控制：rrweb、fingerprintjs、pako 会增加 SDK 体积；如果只需要基础错误/请求监控，应考虑模块化裁剪。
- 上报体限制：`sendBeacon` 通常不适合大体积数据；录屏数据应强制 XHR 或拆包。
- CORS：XHR body 上报需要服务端正确配置跨域。
- 全局 patch 冲突：重写 `fetch`、XHR、history、console 可能和其他监控 SDK 冲突；接入前要确认顺序与恢复机制。
- 请求递归：必须忽略监控上报地址，原项目已经自动把 `dsn` 加入 `ignoreRequest`。
- 错误重复：资源加载失败可能同时被 error 模块和 performance/resource 模块捕获，服务端需要分类或去重。
- 配置可变性：`options.value` 允许运行时修改所有字段，灵活但危险；自研时建议只开放少数 setter。
- Nuxt SSR：Nuxt 包做了部分 global/window/requestAnimationFrame polyfill，但真正采集仍应只在 client 侧运行。
- 源码小缺陷：`replace.ts` 的 online 监听疑似写成 offline；借鉴设计时应重新实现并测试。

## 10. 如果当前项目要借鉴，建议的最小闭环

不要一开始照搬全量能力。建议按以下顺序落地：

1. 初始化配置：`init({ dsn, appName, appVersion, userId, beforeSend })`。
2. 基础信息：应用信息、用户 ID、session ID、页面 URL、UA、时间戳。
3. 错误采集：`error`、`unhandledrejection`、手动 `captureError`。
4. 请求采集：先支持 `fetch`，再支持 XHR；必须忽略上报地址。
5. 队列上报：内存队列、批量发送、页面关闭时 beacon。
6. 脱敏 hook：在发送前统一处理 token、手机号、身份证、输入框内容。
7. 销毁能力：恢复 patch，移除监听，清空 timer。
8. 再逐步增加性能、PV、点击、曝光、录屏。

推荐自研最小 API：

```ts
type MonitorOptions = {
  dsn: string
  appName: string
  appVersion?: string
  userId?: string
  sampleRate?: number
  beforeSend?: (payload: unknown) => unknown | false
}

init(options: MonitorOptions): void
destroy(): void
track(eventName: string, params?: Record<string, unknown>): void
captureError(error: unknown, params?: Record<string, unknown>): void
setUser(userId: string): void
beforeSend(handler: MonitorOptions['beforeSend']): void
```

这个 API 面比 web-tracing 小，但能覆盖第一阶段的监控闭环。等服务端查询、告警、聚合能力稳定后，再增加录屏、曝光和复杂性能指标。

## 11. 结论

`web-tracing` 的核心价值不是某一个采集点，而是把前端监控 SDK 的关键链路串起来了：全局采集入口、模块化事件处理、批量队列、发送降级、hooks、过滤、错误聚合、录屏和框架适配。它非常适合作为“前端监控 SDK 如何设计”的参考项目。

如果要直接引入，需要重点评估隐私合规、包体积、全局 patch 冲突、服务端接收模型和文档/源码默认值不一致的问题。如果是自研，建议借鉴它的架构分层和上报链路，但用更小的公开 API 和更强的隐私保护策略起步。
