# frontend-monitor

第一阶段目标是实现一个可验证的浏览器端监控 SDK MVP，并提供本地 demo 和 mock 接收端。

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Apps

- `apps/demo`: 本地演示页面，默认运行在 Vite 开发服务器。
- `apps/mock-server`: 本地接收端，默认运行在 `http://localhost:4318`。
- `packages/core`: 浏览器端监控 SDK。

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
- 框架适配层
