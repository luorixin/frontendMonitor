# frontend-monitor-core

## 2.2.0

### Minor Changes

- Add configurable payload sanitization, custom transport, and trace context propagation options.
- Add explicit `compression` options, including `algorithm: "gzip"`, with replay gzip enabled by default and standard event payload compression disabled by default.
- Add a pluggable integration registry with built-in capture integrations plus `integrations` / `addIntegration()` extension points.
- Add a tree-shaking-friendly `frontend-monitor-core/lite` entry plus per-integration subpath exports for modular bundling.
- Add `sessionReplay.mode`, split replay sampling controls, rrweb privacy passthrough, and error-linked replay windows that upload only around matched errors.
- Add request-error replay trigger filters so error-linked replay defaults to 5xx / timeout / network failures instead of all request errors.
- Add console-error and resource-error replay trigger filters so error-linked replay can focus on high-value failures instead of noisy browser warnings or non-critical assets.
- Add `errorLinked.pageMatcher` plus structured `resourceUrl` filtering so replay rules can target critical pages and assets more precisely.
- Retry failed session replay chunks on manual flush, page exit, and network recovery.
- Share localStorage queue handling across localization and offline retry paths.

### Patch Changes

- Clean up the page-exit `visibilitychange` listener on `destroy()`.
- Use the package version as the emitted SDK version.
- Pass arrays returned by `beforePushEvent` through all subsequent hooks.
- Reorganize the core source tree into `api`, `core`, `pipeline`, `storage`, and `__tests__` directories without changing public behavior.

## 2.1.0

### Minor Changes

- 69ada60: source map

## 2.0.0

### Major Changes

- add web vitals

## 1.0.0

### Major Changes

- eee8ee8: add session replay sourcemap

## 0.2.0

### Minor Changes

- 8a27c35: minify
