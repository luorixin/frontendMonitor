# frontend-monitor-core SDK 对标分析与优化建议

分析日期：2026-05-11

## 1. 分析范围

本文聚焦 `packages/core`，目标是判断当前浏览器监控 SDK 与主流开源/开放生态方案相比，哪些能力已经具备，哪些能力还需要补齐，以及后续优化扩展的优先级。

对标对象：

- Sentry JavaScript SDK：错误监控、上下文、Source Map、Tracing、Session Replay 的成熟产品化参照。
- OpenTelemetry JavaScript Browser：链路追踪、Span、传播协议、跨服务可观测性的标准化参照。
- GoogleChrome `web-vitals`：真实用户 Web Vitals 采集准确性和 attribution 诊断信息参照。
- rrweb：Session Replay 录制与隐私控制的底层能力参照。

外部资料：

- [Sentry JavaScript Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Sentry JavaScript Options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry JavaScript Tracing](https://docs.sentry.io/platforms/javascript/tracing/)
- [Sentry JavaScript Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [OpenTelemetry JavaScript Browser](https://opentelemetry.io/docs/languages/js/getting-started/browser/)
- [OpenTelemetry JavaScript Overview](https://opentelemetry.io/docs/languages/js/)
- [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals)
- [rrweb guide](https://github.com/rrweb-io/rrweb/blob/master/guide.md)

## 2. 结论摘要

当前 `frontend-monitor-core` 已经从“基础错误 SDK”演进到“轻量 RUM + 错误诊断 + Replay 雏形”的阶段。它具备几个很有价值的基础：模块化 integrations、`lite` 入口、离线重试、本地化缓存、统一 hook、自动 breadcrumb、Web Vitals、请求性能、error-linked Replay、脱敏和 Trace Context 预留。

与 Sentry 这类成熟 SDK 相比，主要差距不在“有没有采集点”，而在诊断协议的精细度、隐私与动态治理、追踪模型、Source Map/release 闭环、Replay 成本控制和真实浏览器验证。换句话说，采集覆盖已经不弱，但还需要把“能上报”升级成“可解释、可控、可长期运营”。

优先级最高的改进建议：

1. 先做隐私与数据治理增强：请求体、URL、breadcrumb、Replay 都要有更明确的默认保护、白名单/黑名单和体积控制。
2. 增强错误事件模型：结构化 stack frame、exception mechanism、handled/unhandled、cause chain、component stack、fingerprint hint。
3. 补齐追踪模型：从单个 `traceId/spanId` 升级为 transaction/span 树，并增加传播目标白名单。
4. Web Vitals 接入 attribution 诊断：保留当前无依赖实现，同时提供可选 `web-vitals/attribution` 集成。
5. 建立 Source Map/release 闭环：SDK 侧保证 `release/dist/debugId` 等元数据，配套构建上传与后端解析。
6. 建立浏览器 E2E 与性能预算：仅靠 jsdom/fake tests 不足以验证 Replay、PerformanceObserver、bfcache、页面退出发送等真实浏览器行为。

## 3. 当前能力盘点

### 3.1 包形态与可扩展性

证据：

- `packages/core/package.json` 将包定义为 ESM，导出根入口、`./lite` 和 `./integrations/*` 子路径，并声明 `sideEffects: false`。
- `packages/core/src/index.ts` 根入口会调用 `resolveIntegrations(options)` 自动注册默认 integrations。
- `packages/core/src/lite.ts` 使用 `dedupeIntegrations(options.integrations ?? [])`，不自动注册内置采集模块。
- `packages/core/src/api/default-integrations.ts` 默认包含 ConsoleError、JSError、Fetch、XHR、Navigation、PageExit、NetworkStatus、SessionReplay、Performance、Click。

判断：

- 这是一个比较健康的 SDK 架构方向。根入口保证开箱即用，`lite` 入口支持按需打包，integration 注册机制也方便后续扩展。
- 对标 Sentry 的 integration 体系，当前已经具备插件化基础，但缺少更稳定的 integration 生命周期协议，例如 `setupOnce`、全局 client/scope 隔离、metadata/version 标识、能力声明和冲突检测。

建议：

- 给 `MonitorIntegration` 增加可选 metadata：`version`、`category`、`defaultEnabled`、`requires`、`capabilities`。
- `addIntegration()` 运行时追加时返回 cleanup 或注册结果，便于上层判断是否重复、是否成功启用。
- 给默认 integrations 增加独立配置项，例如 `integrations: { fetch: { ... }, replay: { ... } }`，避免未来所有选项继续堆在 `MonitorOptions` 根部。

### 3.2 采集覆盖面

证据：

- `DEFAULT_CAPTURE` 默认开启 js error、promise rejection、console error、resource error、fetch/xhr error、request performance、page view、route change、click、exposure、performance。
- `fetch.ts` 和 `xhr.ts` 能采集失败请求、成功请求耗时，并在 trace 开启后注入 `traceparent`。
- `navigation.ts` 能采集初始 PV、hash/history/popstate 路由变化，并触发 soft navigation Web Vitals。
- `performance.ts` 采集 navigation、resource、Web Vitals。
- `performance-web-vitals.ts` 已采集 LCP、CLS、INP，并区分 soft navigation。

判断：

- 覆盖面已经接近一个小型 RUM SDK。它不仅采错误，还覆盖路由、请求耗时、资源性能、用户行为和 Web Vitals。
- 与 Sentry 相比，当前缺少更深入的框架级错误语义、页面事务模型、span 关联和问题归因字段。

建议：

- 事件协议增加 `schemaVersion` 和 `eventId`，减少后端演进时的兼容成本。
- 每个事件增加 `level`、`platform`、`sdk.name`、`sdk.version`、`mechanism`、`handled` 等诊断字段。
- 请求性能事件增加 `requestId`，失败请求和 request performance 可关联同一次请求，后续也能关联 replay timeline。
- resource performance 建议增加可配置白名单/黑名单、按资源类型采样，以及字体/图片/CSS/JS 默认降噪策略。

### 3.3 队列、发送与离线可靠性

证据：

- `queue.ts` 实现内存队列、批量发送、`beforePushEvent`、`beforeSend`、`afterSend`、离线持久化和超大 payload 拒绝。
- `transport.ts` 按小 payload 图片上报、sendBeacon、XHR 顺序发送，支持自定义 transport 和 gzip。
- `offline.ts` 支持 IndexedDB/localStorage 队列、最大条数、重试次数、指数退避。
- `queueStore.ts` 优先使用 IndexedDB，失败后回退 localStorage。

判断：

- 离线与失败重试能力已经明显强于很多简单自研 SDK。
- 目前仍然是“单 tab 本地队列”模型，缺少跨 tab 锁、后台刷新、quota 感知、payload 分片和动态流控。

风险：

- `queue.ts` 在内存队列超过 `maxQueueLength` 时直接 `shift()` 丢弃最老事件，当前只有 debug log，没有可观测的丢弃统计。
- `transport.ts` 先检查 JSON 字符串长度而不是 UTF-8 byte length，中文或 emoji 等多字节字符可能低估体积。
- payload 超过 `maxPayloadBytes` 后直接失败并且不会落离线队列，这是合理保护，但缺少拆批降级机制。

建议：

- `maxPayloadBytes` 计算改为 `Blob.size` 或 `TextEncoder().encode(body).byteLength`。
- flush 时如果 payload 超限，按事件二分拆批发送，而不是整批丢弃。
- 增加 SDK 内部 health counter：`droppedBySampling`、`droppedByQueueOverflow`、`droppedByPayloadSize`、`offlineQueued`、`retrySucceeded`、`retryExhausted`。
- 增加跨 tab 发送锁，可用 `BroadcastChannel` 或 localStorage lease 避免多 tab 同时重放离线队列。
- 对服务端 429/413/5xx 做区别处理：429 使用服务端 Retry-After，413 不再重试，5xx 退避重试。

### 3.4 隐私与脱敏

证据：

- `hooks.ts` 在 `beforeSend` 前调用 `sanitizePayload()`。
- `sanitize.ts` 内置 token、password、phone、id card、Bearer token、URL query 参数脱敏。
- `request-body.ts` 会读取 JSON、FormData、URLSearchParams、Blob 文本，并把失败请求 body 放进 request error 事件。
- `replay.ts` 透传 rrweb 的 `maskAllInputs`、`blockClass`、`ignoreClass`。

对标：

- Sentry Replay 默认强调 DOM 文本、媒体和输入脱敏，并将请求/响应 body 设计为 opt-in。
- rrweb 支持 `blockClass`、`ignoreClass`、`maskTextClass`、`maskAllInputs`、`maskInputOptions` 等隐私控制。

判断：

- 当前 SDK 已经有脱敏意识，并且默认开启 sanitize，这是优点。
- 但请求体采集默认跟随失败请求采集，缺少显式的 `captureRequestBody` 配置。对业务系统来说，这是最需要优先治理的隐私风险。

建议：

- 新增请求体采集配置，默认关闭或至少仅对 allowlist URL 开启：
  - `requestBody.enabled`
  - `requestBody.allowUrls`
  - `requestBody.denyUrls`
  - `requestBody.maxBytes`
  - `requestBody.contentTypes`
  - `requestBody.captureHeaders`
- Replay 隐私配置补齐 rrweb 常用能力：
  - `maskTextClass`
  - `maskTextSelector`
  - `blockSelector`
  - `ignoreSelector`
  - `maskInputOptions`
  - `slimDOMOptions`
- 文档明确 `beforeSend` 收到的是脱敏后的 payload；如需原始 payload 必须显式 `sanitize.enabled=false`，并标记为高风险。
- 增加隐私回归测试样例：手机号、身份证、token、Authorization header、URL query、FormData 文件、JSON 深层对象、breadcrumb data、Replay input。

### 3.5 错误诊断模型

证据：

- `error.ts` 能捕获 `window.error`、resource error 和 `unhandledrejection`。
- `createErrorEvent()` 目前上报 `message`、`stack`、`source`、`params`、`scopeCount`。
- `scopeError` 使用 5 秒窗口按 `type/message/source/stack首行/url` 合并重复错误。

对标：

- Sentry 的事件模型围绕 exception、stack frames、mechanism、release/environment、breadcrumbs、tags/context、source maps 展开；其配置也支持 `beforeSend`、`ignoreErrors`、`denyUrls/allowUrls` 等错误过滤。

判断：

- 当前错误事件已经能满足“看到错误文本和原始 stack”的最低排障需求。
- 与成熟 SDK 的差距在于错误不是结构化 exception，后端很难稳定聚合、反混淆、识别 handled/unhandled、定位第三方脚本噪音。

建议：

- 增加结构化错误字段：
  - `exception.type`
  - `exception.value`
  - `exception.stacktrace.frames[]`
  - `mechanism.type`
  - `mechanism.handled`
  - `culprit`
  - `fingerprint`
  - `componentStack`
  - `causeChain`
- 捕获 `Error.cause`、`AggregateError.errors`。
- 增加 `ignoreErrors`、`allowUrls`、`denyUrls`，区分“错误发生的脚本 URL”和“当前页面 URL”。
- 增加跨浏览器 stack parser。可以先实现无依赖 parser，后续再评估是否引入成熟库。
- framework wrapper 应补充 React component stack、Vue/Nuxt error info，并写入 `mechanism`。

### 3.6 Breadcrumb 与上下文

证据：

- `BasePayload` 支持 `tags`、`contexts`、`breadcrumbs`、`release`、`environment`、`dist`、`replayId`、`traceId`、`spanId`。
- `manual.ts` 提供 `setTag`、`setContext`、`clearContext`、`addBreadcrumb`、`setRelease`、`setEnvironment`。
- `breadcrumb.ts` 维护最大 breadcrumb 数量，默认 50。
- `navigation.ts`、`fetch.ts`、`xhr.ts` 会自动记录路由和失败请求 breadcrumb。

判断：

- 这部分已经完成了 Phase 2 的核心骨架。
- 需要进一步解决的是 breadcrumb 分类规范、大小限制、字段脱敏、与 replay/trace 的关联。

建议：

- 给 breadcrumb 增加 `id`、`source`、`spanId`、`replayOffset`。
- 对 `breadcrumb.data` 单条体积和总量做限制，超限时保留摘要。
- 自动 breadcrumb 增加 console warn/log 可选采集、DOM submit/change 可选采集、request start/success 可选采集。
- `clearContext()` 当前同时清空 tags 和 contexts，建议拆成 `clearTags()`、`clearContexts()`，保留 `clearContext()` 作为兼容别名。

### 3.7 Web Vitals 与性能分析

证据：

- `performance-navigation.ts` 采集 DNS、TCP、TTFB、response、DOM、load、FP/FCP。
- `performance-resource.ts` 采集 resource entry，并排除 fetch/xhr。
- `performance-web-vitals.ts` 采集 LCP、CLS、INP，且记录 `navigationType`、`routeFrom`、`routeTo`、`softNavigation`。
- `types.ts` 中 Web Vital 类型目前只包含 `CLS | FCP | INP | LCP | TTFB`，但实现侧当前只在 Web Vital observer 中发送 LCP/CLS/INP，FCP/TTFB 在 navigation metrics 中体现。

对标：

- `web-vitals` 官方库强调与 Chrome/CrUX/PageSpeed 等口径一致，并提供 attribution build 帮助定位指标变差的原因。
- 该库也说明有些指标不会立即或一定上报，例如 INP 需要用户交互，后台加载页面可能没有 CLS/FCP/LCP。

判断：

- 自研 Web Vitals 已有基础，但准确性和诊断信息仍弱于官方 `web-vitals`。
- soft navigation 指标目前是启发式实现：用路由切换后的 PerformanceObserver entry 时间做归属。它能形成趋势，但不能等同浏览器标准的完整 SPA Web Vitals 语义。

建议：

- 保留当前无依赖实现作为默认 lightweight 模式。
- 增加可选 attribution integration，允许业务显式安装/启用 `web-vitals/attribution`：
  - LCP attribution：元素、URL、loadState。
  - CLS attribution：largestShiftTarget、largestShiftTime、loadState。
  - INP attribution：eventTarget、eventType、interactionTarget、inputDelay、processingDuration、presentationDelay。
- 将 FCP、TTFB 也统一成 `performanceType: "web_vital"` 事件，避免后端趋势统计需要从 navigation metrics 里二次拆解。
- 增加 bfcache restore 识别和新 metric id，避免前进/后退缓存恢复污染首屏指标。
- 对 resource performance 增加 Top N 或采样控制，避免图片密集页面造成高事件量。

### 3.8 Trace / OTel 兼容

证据：

- `trace.ts` 在 trace 开启且采样命中时生成 32 位 `traceId` 和 16 位 `spanId`。
- `fetch.ts` 和 `xhr.ts` 在 `propagateTraceparent` 开启时注入 W3C `traceparent`。
- `BasePayload` 带 `traceId`、`spanId`。

对标：

- Sentry tracing 使用 transactions/spans，支持 `tracesSampleRate`/`tracesSampler`、`tracePropagationTargets`，并可与 Replay 互相链接。
- OpenTelemetry Browser 通过 `WebTracerProvider`、`DocumentLoadInstrumentation`、`XMLHttpRequestInstrumentation`、`UserInteractionInstrumentation` 等构造标准 Span。
- Sentry 文档也提示浏览器里 trace propagation 需要控制目标 URL，并处理 CORS header。

判断：

- 当前 trace 是“上下文 ID 预留 + header 传播”，还不是完整 tracing。
- 最大风险是 `propagateTraceparent` 一旦开启，会对所有未 ignore 的 fetch/xhr 注入 header，容易触发跨域 CORS 问题，也可能把 trace 传播给第三方域名。

建议：

- 增加 `trace.propagationTargets: Array<string | RegExp>`，默认仅 same-origin 或空数组。
- 增加 transaction/span 模型：
  - pageload transaction
  - navigation transaction
  - request span
  - resource span
  - user interaction span
  - manual `startSpan()` / `startTransaction()` API
- 增加 `traceSampler(context)`，支持按路由、环境、用户、请求目标动态采样。
- 输出兼容 OTel 的语义字段，例如 `span.kind`、`http.method`、`http.status_code`、`url.full`、`user_agent.original`。
- 后端若未来要接 OTel Collector，SDK 可以先提供 OTLP JSON exporter 作为可选 transport，而不是立即替换现有协议。

### 3.9 Session Replay

证据：

- `package.json` 只引入 `rrweb` 依赖。
- `replay.ts` 使用 `rrweb.record`，支持 full 和 error-linked 两种模式。
- error-linked 默认保留错误前 15 秒、错误后 15 秒，单会话最多 3 次触发。
- Replay 发送支持 chunk、gzip、sendBeacon、失败内存队列。
- `BasePayload` 和 Replay chunk 都带 `replayId`，普通错误可关联回放。

对标：

- Sentry Replay 支持 session sample 和 on-error sample，并强调 error replay 会保留错误前一段缓冲。
- Sentry Replay 默认有更强隐私保护，并在 Replay UI 中关联点击、滚动、网络请求、console 和 traces。
- rrweb 本身支持更多录制配置，包括 text mask、block selector、ignore selector、slimDOM、checkout、sampling 等。

判断：

- 当前 error-linked Replay 方向是正确的，成本比全量录制可控。
- 还缺少产品化 replay 的关键闭环：隐私审计、事件时间线标记、网络/console/custom event 注入、chunk 持久化重试、播放器侧数据兼容策略。

建议：

- 引入 rrweb `record.addCustomEvent` 或等价机制，把 SDK 事件写入 replay timeline：错误、请求失败、路由、用户点击、console error。
- Replay chunk 失败队列从内存扩展到 IndexedDB，避免页面刷新后丢失。
- 增加 replay 体积治理：mousemove/scroll/input sampling、slimDOM、checkoutEveryNms、checkoutEveryNth。
- 增加 consent API：`startReplay()`、`pauseReplay()`、`resumeReplay()`、`stopReplay({ flush })`。
- 增加 Replay 隐私测试夹具，用真实 DOM 页面验证输入、文本、媒体、敏感区域是否被 mask/block。

### 3.10 Source Map 与 release 闭环

证据：

- `MonitorOptions` 和 `BasePayload` 已支持 `release`、`dist`。
- `tsup.config.ts` 会把 SDK 自身版本注入 `__FRONTEND_MONITOR_SDK_VERSION__`。
- 当前 core 没有 debug id、artifact bundle、source map 上传、stack frame 结构化解析相关代码。

对标：

- Sentry Source Map 文档强调生产构建生成并上传 source map，并默认通过 Debug IDs 关联构建产物。

判断：

- SDK 侧已经有 release/dist 字段，但还没有可用的 Source Map 闭环。
- 后端已经有 Source Map 页面与接口时，core 需要保证每条错误事件能携带足够的产物定位信息。

建议：

- 错误事件增加：
  - `release`
  - `dist`
  - `debugId`
  - `absPath`
  - `filename`
  - `lineno`
  - `colno`
  - `frames[].filename/lineno/colno/function/in_app`
- 提供构建插件或 CLI：
  - Vite/Rollup/Webpack 构建后注入 debug id。
  - 上传 sourcemap 和 artifact metadata。
  - 校验 release 与上传产物一致。
- 后端解析前，前端 report 页面仍应展示 raw stack 和 source map 状态，便于确认是否匹配失败。

### 3.11 测试与质量

证据：

- `packages/core/src/__tests__/index.test.ts` 覆盖 replay、error-linked 触发、privacy controls、队列发送、离线重试、payload size、breadcrumbs、request capture、navigation performance、Web Vitals、custom transport、traceparent 等。
- `queueStore.test.ts` 和 `storageQueue.test.ts` 覆盖 IndexedDB/localStorage 队列行为。
- `lite.test.ts` 和 `integrations.test.ts` 覆盖 lite 入口和自定义 integration。

判断：

- 单元测试覆盖已经相当丰富，这是当前 core 的明显优势。
- 但浏览器 API 很多依赖 fake；Replay、PerformanceObserver、sendBeacon、pagehide、bfcache、CORS、CompressionStream 在真实浏览器里的行为仍需要 E2E。

建议：

- 增加 Playwright 测试矩阵：
  - Chrome / Firefox / WebKit。
  - 页面 load、SPA route、bfcache restore。
  - fetch/xhr trace header 与 CORS 预检。
  - Replay mask/block 行为截图或 DOM event 断言。
  - pagehide/sendBeacon 退出上报。
- 增加 bundle size CI：
  - root 入口 gzip/brotli 大小。
  - lite + 单 integration 大小。
  - session replay 入口大小。
- 增加性能预算：
  - init 耗时。
  - 每 100 次 fetch/xhr hook overhead。
  - 每 1000 个 DOM mutation replay overhead。

## 4. 对标差距矩阵

| 能力 | 当前 core | Sentry / OTel / web-vitals / rrweb 参照 | 差距判断 | 优先级 |
| --- | --- | --- | --- | --- |
| 错误采集 | 有 js error、promise、resource、console error | Sentry 有结构化 exception、mechanism、过滤、source map | 能采到，但诊断结构弱 | P0 |
| 上下文 | 有 release/env/tags/contexts/breadcrumbs | Sentry scope/context 成熟 | 基础已具备，规范不足 | P1 |
| 请求监控 | 有 fetch/xhr error + performance | Sentry/OTel 可建 span 并关联 trace | 缺 span 和传播目标治理 | P0 |
| Web Vitals | 有 LCP/CLS/INP 和 soft navigation | web-vitals 口径更稳且有 attribution | 趋势可用，根因不足 | P1 |
| Replay | rrweb error-linked/full chunk | Sentry on-error replay、隐私默认、timeline 联动 | 方向正确，运营能力不足 | P1 |
| Source Map | 有 release/dist 字段 | Sentry 构建上传 + Debug IDs | 闭环缺失 | P0 |
| 离线可靠性 | IndexedDB/localStorage + 重试 | 成熟 SDK 有更细流控与丢弃可观测 | 基础强，治理弱 | P1 |
| 隐私 | sanitize + rrweb input mask | Sentry 请求体 opt-in、Replay 默认强保护 | 请求体风险较高 | P0 |
| 插件化 | integrations + lite | Sentry integrations 更完整 | 基础好，协议要稳定 | P2 |
| 标准兼容 | traceparent 预留 | OTel 标准 spans/exporters | 仅 ID 级兼容 | P2 |

## 5. 分阶段路线图

### Phase 1：隐私、安全与协议稳定

目标：降低 SDK 接入业务系统时的隐私风险，并让后端协议可持续演进。

建议任务：

1. 新增 `schemaVersion`、`eventId`、`sdk.name`、`sdk.version`。
2. 请求体采集改为显式配置，默认只采摘要或关闭。
3. 增加 `requestBody.allowUrls/denyUrls/maxBytes/contentTypes`。
4. 增加 `trace.propagationTargets`，避免 trace header 打到第三方域名。
5. payload size 改为真实 byte length，并支持超限拆批。
6. 增加 SDK health counters 和 debug diagnostics API。
7. privacy 单测扩展到 request body、breadcrumb、URL、FormData、Replay 配置。

验收：

- 默认配置不会采集请求体明文。
- 开启 trace propagation 不会默认污染所有跨域请求。
- 超大批次不会整批静默丢弃。
- 每类丢弃原因都有可观测统计。

### Phase 2：错误诊断与 Source Map 闭环

目标：让错误从“看到字符串 stack”升级到“可聚合、可反混淆、可定位 release”。

建议任务：

1. 增加结构化 exception/stack frame。
2. 捕获 `Error.cause`、`AggregateError`。
3. 增加 `mechanism.handled`、`mechanism.type`。
4. 增加 `ignoreErrors/allowUrls/denyUrls`。
5. SDK 错误事件增加 `debugId`/artifact 定位字段。
6. 提供 Vite 插件或 CLI，把 release/dist/debugId 注入构建产物并上传 sourcemap。
7. report 页面展示 source map 命中状态、raw stack、resolved stack。

验收：

- 同一错误跨版本、跨压缩产物能稳定聚合。
- source map 上传后能看到反混淆 frames。
- 第三方脚本噪音可通过配置过滤。

### Phase 3：性能、Tracing 与 Web Vitals Attribution

目标：从“页面性能指标”升级为“用户操作到请求到后端”的性能链路。

建议任务：

1. 增加 pageload/navigation transaction。
2. fetch/xhr/resource/user interaction 生成 child spans。
3. 增加 `startSpan()`、`startTransaction()`、`withSpan()` API。
4. 增加 `traceSampler(context)`。
5. 可选接入 `web-vitals/attribution`，输出 attribution 字段。
6. 统一 FCP/TTFB/LCP/CLS/INP 为 Web Vital 事件。
7. Replay timeline 关联 span/request/error。

验收：

- 首页加载、SPA 路由、表单提交能形成连续 trace。
- Web Vitals poor case 能看到 attribution root cause。
- Replay 能跳转到关联请求或 trace。

### Phase 4：Replay 产品化与动态治理

目标：把 Replay 从“能录片段”升级为“可安全运营和排障”。

建议任务：

1. Replay chunk 失败持久化到 IndexedDB。
2. 增加 replay consent、pause/resume、manual snapshot。
3. 支持 rrweb `sampling`、`slimDOMOptions`、`checkoutEveryNms/Nth`。
4. 增加 replay timeline custom event。
5. 支持远程动态配置：采样率、禁用规则、隐私规则、trace propagation targets。
6. 增加真实浏览器 replay 隐私验证。

验收：

- 用户可以按 consent 控制录制。
- Replay 在刷新/短时断网后仍尽可能保留可用片段。
- 高流量站点可以通过动态配置降低采样和采集量。

## 6. 建议新增配置草案

```ts
type MonitorOptions = {
  schemaVersion?: string
  requestBody?: {
    enabled?: boolean
    allowUrls?: Array<string | RegExp>
    denyUrls?: Array<string | RegExp>
    contentTypes?: string[]
    maxBytes?: number
    captureHeaders?: boolean
  }
  trace?: {
    enabled?: boolean
    propagateTraceparent?: boolean
    propagationTargets?: Array<string | RegExp>
    sampleRate?: number
    tracesSampler?: (context: TraceSamplingContext) => number | boolean
  }
  replay?: {
    consentRequired?: boolean
    sampling?: {
      mousemove?: number | false
      scroll?: number | false
      input?: "all" | "last" | false
    }
    privacy?: {
      blockClass?: string | RegExp
      blockSelector?: string
      ignoreClass?: string | RegExp
      ignoreSelector?: string
      maskTextClass?: string | RegExp
      maskTextSelector?: string
      maskAllInputs?: boolean
      maskInputOptions?: Record<string, boolean>
    }
  }
}
```

## 7. 建议新增 API 草案

```ts
startTransaction(name: string, options?: TransactionOptions): Transaction
startSpan(name: string, options?: SpanOptions): Span
withSpan<T>(span: Span, callback: () => T): T
getTraceContext(): { traceId: string; spanId?: string } | null

startReplay(): void
pauseReplay(): void
resumeReplay(): void
stopReplay(options?: { flush?: boolean }): Promise<void>
addReplayEvent(tag: string, payload?: Record<string, unknown>): void

getDiagnostics(): {
  droppedBySampling: number
  droppedByQueueOverflow: number
  droppedByPayloadSize: number
  offlineQueued: number
  retrySucceeded: number
  retryExhausted: number
}
```

## 8. 推荐测试补强

单元测试：

- 请求体默认不采集。
- 请求体 allowlist/denylist/contentType/maxBytes。
- trace propagation targets。
- payload byte length 和拆批。
- structured exception parser。
- Error.cause 和 AggregateError。
- Web Vitals FCP/TTFB 事件统一输出。
- Replay privacy selector/options 透传。

浏览器 E2E：

- Chrome/Firefox/WebKit 下初始化、错误、请求、路由、Web Vitals。
- fetch/xhr 注入 traceparent 后的 CORS 预检行为。
- pagehide/sendBeacon 退出上报。
- bfcache restore 后 Web Vitals 新 visit。
- Replay 输入脱敏、敏感区域 block、canvas opt-in。

CI 质量门禁：

- `pnpm --filter frontend-monitor-core test`
- `pnpm --filter frontend-monitor-core build`
- bundle size check：root、lite、replay integration。
- 浏览器 smoke test：至少 Chromium。

## 9. 风险与取舍

- 不建议马上把 core 全面改成 OpenTelemetry SDK。OTel Browser 文档仍标注 browser client instrumentation 实验性较强，直接迁移会增加包体和协议复杂度。更稳妥的路径是先把当前协议补齐 span/transaction，再提供可选 OTLP exporter。
- 不建议默认开启完整 Session Replay。Replay 的隐私、体积、存储成本都较高，当前 error-linked 默认方向更适合自研平台早期。
- 不建议为了 Source Map 立刻引入复杂解析依赖。应先完成 release/debugId/artifact 上传和 stack frame 结构化，再评估解析库。
- 不建议继续把所有新能力塞入 `MonitorOptions` 根部。配置需要按 request、trace、replay、privacy、performance 分组，避免后续维护成本继续上升。

## 10. 最小下一步

如果只选一个最小可执行迭代，建议做 Phase 1 的前四项：

1. 请求体采集默认关闭，并提供 allowlist。
2. trace propagation targets。
3. payload byte length + 超限拆批。
4. SDK diagnostics counters。

这四项能直接降低线上接入风险，也为后续 Source Map、Tracing、Replay 增强打稳协议和治理基础。
