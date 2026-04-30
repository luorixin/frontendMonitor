# @frontend-monitor/core

浏览器端监控 SDK 核心包，提供初始化、事件采集、队列上报、脱敏、本地化缓存和页面退出发送能力。

## Install

```bash
pnpm add @frontend-monitor/core
```

## Usage

```ts
import { init, track, captureError } from "@frontend-monitor/core"

init({
  dsn: "https://your-domain.example/collect",
  appName: "my-app"
})

track("button_click", { area: "hero" })
captureError(new Error("manual error"))
```

## Main APIs

- `init`
- `destroy`
- `track`
- `captureError`
- `setUser`
- `beforeSend`
- `flush`
- `sendLocal`
- `intersectionObserver`

更多说明见仓库根文档和发布说明：

- https://github.com/luorixin/frontendMonitor#readme
- https://github.com/luorixin/frontendMonitor/blob/master/docs/release.md
