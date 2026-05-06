# 发布流程

本文档描述 `frontend-monitor-core`、`frontend-monitor-vue3`、`frontend-monitor-react`、`frontend-monitor-nuxt3` 的版本管理与自动发布流程。

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

当前 workflow 采用“两段式”：

1. `changesets/action` 只负责创建或更新 release PR
2. 真正的 npm 发布由独立的 GitHub Actions step 执行，底层显式调用 `npm publish`

这样做是为了避免 publish 行为被 action 或第三方封装内部的 npm 认证处理影响，更容易直接观察 trusted publishing / OIDC 是否命中。

这里有一个重要边界：

- GitHub Actions 里的 `release.yml` 可以直接发布，不需要你额外执行 `npm login`
- 本地机器上的 `changeset publish` 仍然属于普通 npm publish，依然需要 `npm login` 或 `NPM_TOKEN`

如果你在本地执行发布命令看到 `npm error code E401`，通常就是因为当前终端没有 npm 发布凭据；这不是 Changesets 配置错误，而是 trusted publishing 只对 GitHub Actions 生效。

官方要求里还有两个容易忽略的前提：

- trusted publishing 依赖 OIDC，只支持 GitHub-hosted runners，不支持 self-hosted runners。
- npm 官方文档要求 npm CLI `11.5.1+` 和 Node `22.14.0+`。

参考：

- npm Trusted Publishers: https://docs.npmjs.com/trusted-publishers/
- Changesets Action: https://github.com/changesets/action

需要在 npm 后台为每个包配置 trusted publisher，仓库信息应与当前仓库保持一致：

- Owner: `luorixin`
- Repository: `frontendMonitor`
- Workflow: `release.yml`

### 4.1 后台逐项填写说明

需要对下面 4 个包分别配置一次：

- `frontend-monitor-core`
- `frontend-monitor-vue3`
- `frontend-monitor-react`
- `frontend-monitor-nuxt3`

每个包在 npm 后台的配置路径是：

`npmjs.com -> Packages -> 对应包 -> Settings -> Trusted publishing`

选择 `GitHub Actions` 后，字段这样填：

- `Organization or user`: `luorixin`
- `Repository`: `frontendMonitor`
- `Workflow filename`: `release.yml`
  只填文件名，不要填 `.github/workflows/release.yml`
- `Environment name`: 留空
  只有你真的在 GitHub Actions 里启用了 environment protection 时才需要填

### 4.2 配好之后怎么验证

建议按这个顺序验证：

1. 在任意一个包页面确认 Trusted publisher 已保存成功。
2. 确认仓库中的 workflow 文件名确实是 `.github/workflows/release.yml`。
3. 确认 workflow 已包含 `permissions.id-token: write`。
4. 提交一个 changeset 并合并到 `master`。
5. 观察 `release.yml`：
   第一次通常会创建或更新 release PR。
6. 合并 release PR 后再次观察 `release.yml`：
   这一次才会进入真正的 publish 分支，并先打印 publish preflight diagnostics。
7. 发布成功后，到 npm 包页面确认新版本已经出现。

### 4.3 推荐的安全收口

npm 官方建议在 trusted publisher 验证通过后，进入每个包的：

`Settings -> Publishing access`

启用：

- `Require two-factor authentication and disallow tokens`

这样可以阻止传统 token 继续发布，但不会影响 trusted publishing。

如果后续改成 `main` 分支，记得同步修改：

- `.changeset/config.json`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

## 5. 首次发布前检查

首次发包前建议确认：

1. npm scope/包名归属已经准备好，当前账号具备发布权限。
2. GitHub 仓库默认分支与 workflow 触发分支一致。
3. `release.yml` 运行在 GitHub-hosted runner，而不是 self-hosted runner。
4. `pnpm build`、`pnpm test` 在本地都通过。
5. 每个包的 `package.json` 都已经指向 `dist/*`，并带有 README。
6. 4 个包都已经分别在 npm 后台配置 trusted publisher。

## 6. 常用维护命令

```bash
pnpm changeset
pnpm version-packages
pnpm release
pnpm publish-packages:local
pnpm release:local
```

说明：

- `pnpm version-packages`：本地应用 changeset，更新版本与 changelog。
- `pnpm release`：本地准备 release 变更，会先 build/test，再执行 `changeset version`；适合生成版本号和 changelog。
- `pnpm publish-packages:local`：按固定顺序调用 `npm publish` 发布 4 个包，需要先完成 npm 登录或满足 trusted publishing。本地环境不会附带 `--provenance`，只有 GitHub Actions OIDC 环境才会自动开启 provenance。
- `pnpm release:local`：本地完整发布命令，会先 build/test 再 publish；同样需要 npm 凭据。

## 7. 推荐操作方式

如果你使用当前仓库的 CI 自动发布，推荐日常流程是：

1. 开发完成后执行 `pnpm changeset`
2. 提交并合并到 `master`
3. 等待 Changesets action 创建 release PR
4. 合并 release PR，由 GitHub Actions 自动发布

只有在你明确要绕过 CI 手动发包时，才使用 `pnpm publish-packages:local` 或 `pnpm release:local`。

## 8. 常见问题

### `npm error code E401`

最常见原因有两个：

1. 你是在本地终端执行了 `pnpm release:local` 或 `pnpm publish-packages:local`，但没有 `npm login`。
2. 你以为 GitHub Actions 在走 trusted publishing，但实际上 workflow 没有命中正确的 trusted publisher 配置。

排查顺序建议：

1. 如果是本地命令报错：
   直接判断为“缺少本地 npm 凭据”。
2. 如果是 GitHub Actions 报错：
   检查 4 个包是否都已经在 npm 后台单独配置 trusted publisher。
3. 检查 `Workflow filename` 是否填成了 `release.yml`。
4. 检查仓库/用户名是否分别是 `frontendMonitor` / `luorixin`。
5. 检查 workflow 是否具有 `id-token: write`。
6. 检查是否误用了 self-hosted runner。

### `E403 403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages`

这个报错比 `E401` 更具体，npm 的意思是：

- 当前这次 publish 没有走 trusted publishing 的 OIDC 通道
- 同时也没有提供一个满足 npm 2FA 要求的本地认证方式

根据 npm 官方文档，发布 npm 包需要满足以下任一条件：

- 账号启用了 2FA，并用交互式方式完成发布
- 使用带 `bypass 2FA` 能力的 granular access token
- 使用 GitHub Actions trusted publishing

参考：

- https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
- https://docs.npmjs.com/about-access-tokens

#### 场景 1：你是在本地执行 `pnpm release:local`

这是最常见原因。处理方式二选一：

1. 推荐：不要本地 publish，改走 CI trusted publishing
2. 如果必须本地发：
   - 先执行 `npm login`
   - 确认当前 npm 账号已开启 2FA
   - 或者创建一个带 `bypass 2FA` 的 granular token 再发布

说明：

- 仅仅“登录成功”不一定够，如果账号和 token 不满足包的 2FA 规则，仍然会报这个 `E403`
- 如果包设置成 `Require two-factor authentication and disallow tokens`，那么 token 也不能发，只能交互式发布

#### 场景 2：你是在 GitHub Actions 里看到这个错误

这通常说明 workflow 没真正命中 trusted publishing。按这个顺序排查：

1. 4 个包是否都已经分别在 npm 后台配置了 trusted publisher
   不是只配一个 scope，也不是只配一个包
2. 每个包的 trusted publisher 是否都指向：
   - owner: `luorixin`
   - repository: `frontendMonitor`
   - workflow filename: `release.yml`
3. workflow 是否运行在 GitHub-hosted runner
4. `.github/workflows/release.yml` 是否包含：
   - `permissions.id-token: write`
5. 仓库 secrets 里是否误设置了 `NPM_TOKEN` / `NODE_AUTH_TOKEN`
   如果设置了，发布流程可能会优先走 token 认证，而不是 trusted publishing
6. 当前 npm 包页面的 Publishing access 是否要求 2FA
   如果要求，而 trusted publisher 又没匹配成功，就会直接报这个 `E403`

#### 我建议你现在怎么做

如果你的目标是走我们这套 CI 自动发版，最稳的处理方式是：

1. 不再本地执行 `pnpm release:local`
2. 只执行：
   - `pnpm changeset`
   - 提交并合并到 `master`
3. 到 npm 后台给这 4 个包逐个配 trusted publisher
4. 检查 GitHub 仓库 secrets 里不要残留旧的 `NPM_TOKEN`
5. 再让 `release.yml` 跑一次

### `E404 Not Found - PUT https://registry.npmjs.org/frontend-monitor-nuxt3`

如果报错像这样：

```text
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/frontend-monitor-nuxt3 - Not found
npm error 404 'frontend-monitor-nuxt3@0.2.0' is not in this registry
```

先区分两种情况：

#### 情况 1：这个包从未发布过

这种情况下要先确认：

1. 包名本身在 npm 上没有被占用
2. 当前账号具备首次发布该无 scope 包名的权限
3. trusted publishing 已经为这个包配置完成

#### 情况 2：这个包已经存在，但新版本 publish 返回 `E404`

这是更容易误判的一种情况。  
当包已经存在时，这个 `E404` 往往不是“registry 里没有这个包”，而是 npm 没把当前这次发布识别成这个包的合法发布者。

最常见原因：

1. `frontend-monitor-nuxt3` 这个包没有单独配置 trusted publisher
   注意：4 个包必须逐个配置，不能只配其中 3 个。
2. `frontend-monitor-nuxt3` 的 trusted publisher 配置和其他包不一致
   例如 repo 名、workflow filename 填错。
3. 之前是手动/token 发布的，但这个包当前没有把 GitHub Actions OIDC principal 正确绑定进去
4. workflow 实际跑的不是你在 npm 后台登记的那个 workflow 文件

排查建议：

1. 先打开 `frontend-monitor-nuxt3` 的 npm 包页面
2. 进入 `Settings -> Trusted publishing`
3. 确认它单独存在一条 GitHub Actions 记录
4. 字段应为：
   - `Organization or user`: `luorixin`
   - `Repository`: `frontendMonitor`
   - `Workflow filename`: `release.yml`
   - `Environment name`: 留空
5. 检查另外 3 个包页面，确认 `nuxt3` 不是唯一漏配或配错的那个
6. 确认 GitHub Actions 触发的确实是 `.github/workflows/release.yml`

如果这 4 个包里只有 `frontend-monitor-nuxt3` 失败，而其他几个已经能正常发版，几乎可以直接判断为：

- `frontend-monitor-nuxt3` 的 npm 包级 trusted publisher 配置没有命中

而不是：

- 包名不存在
- 版本号 `0.2.0` 有问题
- Changesets 版本策略有问题

### workflow 日志里看什么

如果 publish 前诊断 step 已经打开，优先看这几行：

- `ACTIONS_ID_TOKEN_REQUEST_URL set: yes`
- `ACTIONS_ID_TOKEN_REQUEST_TOKEN set: yes`
- `NODE_AUTH_TOKEN set:`
- `NPM_TOKEN set:`

期望状态通常是：

- 两个 `ACTIONS_ID_TOKEN_*` 都是 `yes`
- `NODE_AUTH_TOKEN` / `NPM_TOKEN` 都为空

如果 OIDC 变量缺失，说明 trusted publishing 根本没有可用身份。
如果 token 变量存在，说明 job 可能被传统 token 认证污染。

如果你已经在 workflow 的 publish step 里显式把 `NODE_AUTH_TOKEN` / `NPM_TOKEN` 置空，但诊断输出仍显示它们存在，说明污染来自更上层的 GitHub 配置：

- repository secrets
- environment secrets
- organization secrets
- reusable workflow 或调用方传入的 env / secrets

这种情况下应该删除对应 token，而不是继续修改 npm 包页面里的 trusted publisher 或 publishing access。

### release PR 已创建，但没有真正发布

这是正常现象。Changesets action 分两阶段：

1. 先创建或更新 release PR。
2. release PR 合并后，下一次 workflow 才执行真正 publish。

### 我到底该执行哪个命令

- 日常开发：`pnpm changeset`
- 本地生成版本和 changelog：`pnpm release`
- 走 CI 自动发版：合并到 `master`
- 本地强制手动发版：`pnpm release:local`
