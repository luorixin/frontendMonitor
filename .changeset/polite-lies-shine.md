---
"frontend-monitor-nuxt3": minor
"frontend-monitor-react": minor
"frontend-monitor-core": minor
"frontend-monitor-vue3": minor
---

- Add configurable payload sanitization, custom transport, and trace context propagation options.
- Add explicit `compression` options, including `algorithm: "gzip"`, with replay gzip enabled by default and standard event payload compression disabled by default.
- Add a pluggable integration registry with built-in capture integrations plus `integrations` / `addIntegration()` extension points.
- Add a tree-shaking-friendly `frontend-monitor-core/lite` entry plus per-integration subpath exports for modular bundling.
- Retry failed session replay chunks on manual flush, page exit, and network recovery.
- Share localStorage queue handling across localization and offline retry paths.
- Clean up the page-exit `visibilitychange` listener on `destroy()`.
- Use the package version as the emitted SDK version.
- Pass arrays returned by `beforePushEvent` through all subsequent hooks.
- Reorganize the core source tree into `api`, `core`, `pipeline`, `storage`, and `__tests__` directories without changing public behavior.