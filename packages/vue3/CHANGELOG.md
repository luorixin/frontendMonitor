# frontend-monitor-vue3

## 2.3.0

### Minor Changes

- 9ddba8e: 结构化错误，web vital 事件扩展，replay 隐私扩展

### Patch Changes

- Updated dependencies [9ddba8e]
  - frontend-monitor-core@2.3.0

## 2.2.0

### Minor Changes

- 3c1a990: - Add configurable payload sanitization, custom transport, and trace context propagation options.
  - Add explicit `compression` options, including `algorithm: "gzip"`, with replay gzip enabled by default and standard event payload compression disabled by default.
  - Add a pluggable integration registry with built-in capture integrations plus `integrations` / `addIntegration()` extension points.
  - Add a tree-shaking-friendly `frontend-monitor-core/lite` entry plus per-integration subpath exports for modular bundling.
  - Retry failed session replay chunks on manual flush, page exit, and network recovery.
  - Share localStorage queue handling across localization and offline retry paths.
  - Clean up the page-exit `visibilitychange` listener on `destroy()`.
  - Use the package version as the emitted SDK version.
  - Pass arrays returned by `beforePushEvent` through all subsequent hooks.
  - Reorganize the core source tree into `api`, `core`, `pipeline`, `storage`, and `__tests__` directories without changing public behavior.

### Patch Changes

- Updated dependencies [3c1a990]
  - frontend-monitor-core@2.2.0

## Unreleased

### Minor Changes

- Add `frontend-monitor-vue3/lite` plus `frontend-monitor-vue3/integrations/*` subpath exports for tree-shaking-friendly adapter usage.

## 2.1.0

### Minor Changes

- 69ada60: source map

### Patch Changes

- Updated dependencies [69ada60]
  - frontend-monitor-core@2.1.0

## 2.0.0

### Major Changes

- add web vitals

### Patch Changes

- Updated dependencies
  - frontend-monitor-core@2.0.0

## 1.0.0

### Major Changes

- eee8ee8: add session replay sourcemap

### Patch Changes

- Updated dependencies [eee8ee8]
  - frontend-monitor-core@1.0.0

## 0.2.0

### Minor Changes

- 8a27c35: minify

### Patch Changes

- Updated dependencies [8a27c35]
  - frontend-monitor-core@0.2.0
