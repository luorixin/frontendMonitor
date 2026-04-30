# Changesets Workflow

本仓库使用 Changesets 管理 `frontend-monitor-*` 包的版本、变更记录和 npm 发布。

## 常用命令

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

## 维护约定

- 每次修改会影响外部消费者的行为、API、类型、文档或依赖时，都应补一个 changeset。
- 四个发布包使用固定版本组，会始终保持相同版本号。
- `master` 是默认发布分支；如果仓库切换到 `main`，记得同步更新 `.changeset/config.json` 和 `.github/workflows/release.yml`。
