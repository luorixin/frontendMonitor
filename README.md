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

- 手动 API：`init`、`destroy`、`track`、`captureError`、`setUser`、`beforeSend`、`flush`
- 自动采集：全局错误、Promise reject、`fetch` 失败、PV、路由变化、点击事件
- 上报链路：内存队列、批量发送、采样、忽略上报地址、`sendBeacon`/`fetch`

当前版本不包含：

- XHR 重写
- 录屏
- 曝光采集
- 本地离线缓存
- 框架适配层
