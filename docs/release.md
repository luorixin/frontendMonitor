# 发布流程

本文档描述 `@frontend-monitor/core`、`@frontend-monitor/vue3`、`@frontend-monitor/react`、`@frontend-monitor/nuxt3` 的版本管理与自动发布流程。

## 1. 本地开发时添加 changeset

当修改会影响外部使用者时，运行：

```bash
pnpm changeset
```

按提示选择要发布的包和版本级别：

- `patch`: 向后兼容的小修复
- `minor`: 向后兼容的新功能
- `major`: 非兼容变更

因为四个包处于固定版本组，最终会保持同一个版本号。

## 2. 提交代码并合并到 `master`

CI 工作流会在 PR 和 `master` push 时执行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

对应工作流文件：

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

## 3. Changesets 自动创建 Release PR

当 `master` 上存在未发布的 changeset 时，`release.yml` 会自动创建或更新一个 release PR：

- 汇总所有未发布的 changeset
- 修改四个包的版本号
- 更新 changelog

合并这个 release PR 后，工作流会再次触发并执行真正的 npm 发布。

## 4. npm Trusted Publishing 配置

发布工作流使用 GitHub Actions 的 trusted publishing，不依赖长期存在的 `NPM_TOKEN`。

需要在 npm 后台为每个包配置 trusted publisher，仓库信息应与当前仓库保持一致：

- Owner: `luorixin`
- Repository: `frontendMonitor`
- Workflow: `release.yml`
- Branch: `master`

如果后续改成 `main` 分支，记得同步修改：

- `.changeset/config.json`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- npm trusted publisher 配置

## 5. 首次发布前检查

首次发包前建议确认：

1. npm scope/包名归属已经准备好，当前账号具备发布权限。
2. GitHub 仓库默认分支与 workflow 触发分支一致。
3. `pnpm build`、`pnpm test` 在本地都通过。
4. 每个包的 `package.json` 都已经指向 `dist/*`，并带有 README。

## 6. 常用维护命令

```bash
pnpm changeset
pnpm version-packages
pnpm publish-packages
pnpm release
```

说明：

- `pnpm version-packages`：本地应用 changeset，更新版本与 changelog。
- `pnpm publish-packages`：执行 `changeset publish`。
- `pnpm release`：本地完整发布命令，会先 build/test 再 publish。
