# frontend-monitor-core

## Unreleased

### Minor Changes

- Add configurable payload sanitization, custom transport, and trace context propagation options.
- Add explicit `compression` options, including `algorithm: "gzip"`, with replay gzip enabled by default and standard event payload compression disabled by default.
- Add a pluggable integration registry with built-in capture integrations plus `integrations` / `addIntegration()` extension points.
- Retry failed session replay chunks on manual flush, page exit, and network recovery.
- Share localStorage queue handling across localization and offline retry paths.

### Patch Changes

- Clean up the page-exit `visibilitychange` listener on `destroy()`.
- Use the package version as the emitted SDK version.
- Pass arrays returned by `beforePushEvent` through all subsequent hooks.

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
