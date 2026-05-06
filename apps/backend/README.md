# Monitor Backend

基于 Spring Boot 3 的多模块后端，负责前端监控 SDK 的采集接入、项目管理、事件查询、问题聚合和基础统计分析。

当前项目采用：

- Java 21
- Spring Boot 3.3.5
- Spring Security + JWT
- MyBatis + PageHelper
- MySQL
- Redis
- Maven 多模块

## 项目结构

```text
apps/backend/
  pom.xml                  # 父 POM，统一管理版本与模块
  monitor-common/          # 通用层
  monitor-system/          # 业务层
  monitor-framework/       # 基础设施层
  monitor-admin/           # 启动与 Web 接口层
```

模块依赖关系：

```text
monitor-admin -> monitor-framework -> monitor-system -> monitor-common
```

这条依赖链是当前项目的基本边界，不要反向引用。

## 模块职责

### `monitor-common`

通用基础模块，放不依赖具体业务的公共内容。

主要包括：

- 统一响应对象：`ApiResponse`、`TableDataInfo`
- 基础实体：`BaseEntity`
- 常量
- 异常：`ServiceException`
- 工具类

### `monitor-system`

业务核心模块，放领域对象、Mapper、Service 接口和实现。

当前已经包含：

- 监控项目：`MonitorProject`
- 原始事件：`MonitorEvent`
- 问题聚合：`MonitorIssue`
- DTO / Query / VO
- 监控相关 MyBatis Mapper 与 XML
- 监控 Service 实现

### `monitor-framework`

基础设施与运行时能力模块。

主要包括：

- Spring Security 配置
- JWT 认证过滤器
- Token 管理
- 登录用户模型
- Redis 配置
- MyBatis 配置
- CORS 配置
- 全局异常处理

### `monitor-admin`

应用入口和 HTTP API 暴露层。

主要包括：

- 启动类：`MonitorApplication`
- 公共健康检查：`HealthController`
- 登录接口：`AuthController`
- 监控接口：
  - `MonitorCollectController`
  - `MonitorProjectController`
  - `MonitorDashboardController`
  - `MonitorEventController`
  - `MonitorIssueController`
- 运行配置：
  - `application.yml`
  - `db/migration/`

## 当前能力

这套后端已经支持两类接口。

### 1. 匿名采集接口

用于给浏览器 SDK 上报事件。

- `POST /api/v1/monitor/collect/{projectKey}`
- `GET /api/v1/monitor/collect/{projectKey}?data=...`
- `GET /api/v1/monitor/health`

采集行为：

- 通过 `projectKey` 识别监控项目
- 项目停用或不存在时拒绝采集
- 原始事件同步落库
- 按指纹更新 `monitor_issue`
- 同步更新小时 / 天聚合表
- 校验项目 `allowedOrigins`
- 限制单批事件数、payload 大小和图片打点数据长度
- 按项目做分钟级采集限流
- 图片打点接口始终返回 `1x1 gif`

### 2. 管理后台接口

用于监控项目配置与后台查询，默认都要求 JWT 登录态。

项目管理：

- `GET /api/v1/monitor/projects`
- `GET /api/v1/monitor/projects/{id}`
- `POST /api/v1/monitor/projects`
- `PUT /api/v1/monitor/projects/{id}`
- `POST /api/v1/monitor/projects/{id}/rotate-key`
- `POST /api/v1/monitor/projects/{id}/status`

仪表盘：

- `GET /api/v1/monitor/dashboard/overview`
- `GET /api/v1/monitor/dashboard/trend`
- `GET /api/v1/monitor/dashboard/distribution`
- `GET /api/v1/monitor/dashboard/top-pages`
- `GET /api/v1/monitor/dashboard/top-issues`

事件明细：

- `GET /api/v1/monitor/events`
- `GET /api/v1/monitor/events/{id}`
- `GET /api/v1/monitor/events/{id}/raw`
- `GET /api/v1/monitor/events/{id}/resolved`

问题聚合：

- `GET /api/v1/monitor/issues`
- `GET /api/v1/monitor/issues/{id}`
- `GET /api/v1/monitor/issues/{id}/events`
- `GET /api/v1/monitor/issues/{id}/trend`
- `POST /api/v1/monitor/issues/{id}/status`
- `POST /api/v1/monitor/issues/{id}/assignment`

告警：

- `GET /api/v1/monitor/alerts/rules`
- `GET /api/v1/monitor/alerts/rules/{id}`
- `POST /api/v1/monitor/alerts/rules`
- `PUT /api/v1/monitor/alerts/rules/{id}`
- `POST /api/v1/monitor/alerts/rules/{id}/status`
- `POST /api/v1/monitor/alerts/rules/{id}/test`
- `GET /api/v1/monitor/alerts/records`

Source Map：

- `GET /api/v1/monitor/source-maps`
- `POST /api/v1/monitor/source-maps`

Session Replay：

- `POST /api/v1/monitor/replays/{projectKey}`
- `GET /api/v1/monitor/replays`
- `GET /api/v1/monitor/replays/{replayId}`

## 数据模型

数据库迁移脚本位于：

- [monitor-admin/src/main/resources/db/migration/V1__init_schema.sql](./monitor-admin/src/main/resources/db/migration/V1__init_schema.sql)
- [monitor-admin/src/main/resources/db/migration/V2__seed_demo_data.sql](./monitor-admin/src/main/resources/db/migration/V2__seed_demo_data.sql)
- [monitor-admin/src/main/resources/db/migration/V3__add_source_map_artifacts.sql](./monitor-admin/src/main/resources/db/migration/V3__add_source_map_artifacts.sql)
- [monitor-admin/src/main/resources/db/migration/V4__add_session_replay.sql](./monitor-admin/src/main/resources/db/migration/V4__add_session_replay.sql)

当前包括：

- `sys_user`
- `monitor_project`
- `monitor_event`
- `monitor_issue`
- `monitor_event_agg_hour`
- `monitor_event_agg_day`
- `monitor_alert_rule`
- `monitor_alert_record`
- `monitor_source_map_artifact`
- `monitor_replay_session`
- `monitor_replay_chunk`

其中：

- `monitor_event` 保存原始事件明细和原始 JSON
- `monitor_issue` 按指纹聚合同类问题
- 小时 / 天聚合表用于 dashboard 趋势统计
- 告警规则和触发记录用于基础运营闭环
- `monitor_source_map_artifact` 按 `project + release + artifact` 保存 Source Map 文件
- `monitor_replay_session` 和 `monitor_replay_chunk` 保存回放元数据与分片内容

当前默认会插入一个示例项目：

- `projectName`: `Demo Project`
- `projectKey`: `demo-project-key`
- 推荐采集地址：`/api/v1/monitor/collect/demo-project-key`

## 运行配置

主配置文件位于：

- [monitor-admin/src/main/resources/application.yml](./monitor-admin/src/main/resources/application.yml)

默认配置：

- HTTP 端口：`8080`
- MySQL：`monitor`
- Redis：`127.0.0.1:6379`
- JWT secret、issuer、TTL 都支持环境变量覆盖

主要环境变量：

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=luorixin

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=monitor-backend-secret-key-min-32-bytes!
JWT_ISSUER=monitor-backend
JWT_ACCESS_TTL=30
JWT_REFRESH_TTL=720
MONITOR_COLLECT_MAX_EVENTS=100
MONITOR_COLLECT_MAX_PAYLOAD_BYTES=262144
MONITOR_COLLECT_MAX_IMAGE_DATA_BYTES=4096
MONITOR_COLLECT_RATE_LIMIT_PER_MINUTE=6000
MONITOR_SOURCE_MAP_MAX_FILE_BYTES=2097152
MONITOR_REPLAY_MAX_PAYLOAD_BYTES=262144
MONITOR_RETENTION_EVENT_DAYS=30
MONITOR_RETENTION_AGGREGATE_DAYS=180
```

默认情况下，应用启动会自动执行 Flyway 迁移。新库会按版本顺序执行 `V1`、`V2`，已有旧库会在首次启动时写入 baseline 版本记录，然后继续执行后续迁移。

当前 Source Map 闭环：

- 按 `projectId + release + artifact` 上传 `.map`
- 通过 `GET /api/v1/monitor/events/{id}/resolved` 尝试把压缩栈还原为源码栈
- 返回 `resolvedStack` 和逐帧 `frames`，便于后续前端管理台直接展示

当前 Session Replay 闭环：

- SDK 或前端可以按 `projectKey` 匿名上报 replay chunk
- 后端按 `replayId` 聚合为单个 replay session，并保留 chunk 顺序
- 错误事件可写入 `replayId`，便于从 event 明细跳转回放

如果你需要调整兼容旧库的基线行为，可以覆盖：

```bash
SPRING_FLYWAY_BASELINE_ON_MIGRATE=true
SPRING_FLYWAY_BASELINE_VERSION=2
```

## 本地启动

在仓库根目录执行：

```bash
mvn -f apps/backend/pom.xml spring-boot:run -pl monitor-admin -am
```

如果希望指定本地 Maven 仓库目录：

```bash
mvn -Dmaven.repo.local=.m2/repository -f apps/backend/pom.xml spring-boot:run -pl monitor-admin -am
```

启动后默认地址：

- 服务端口：`http://localhost:8080`
- 健康检查：`http://localhost:8080/api/v1/monitor/health`

## 测试

运行全部测试：

```bash
mvn -f apps/backend/pom.xml test
```

当前已包含监控模块的集成测试，覆盖：

- 匿名采集成功
- 非法 `projectKey` 拒绝
- 图片打点返回 gif
- 管理接口鉴权
- 项目列表查询

测试使用：

- H2 内存数据库
- 测试 profile：`application-test.yml`
- 测试专用 Mockito subclass mock maker，避免某些 JDK 环境下 inline agent 初始化失败

相关文件：

- [monitor-admin/src/test/resources/application-test.yml](./monitor-admin/src/test/resources/application-test.yml)
- [monitor-admin/src/test/java/com/monitor/web/controller/monitor/MonitorModuleIntegrationTest.java](./monitor-admin/src/test/java/com/monitor/web/controller/monitor/MonitorModuleIntegrationTest.java)

## 与前端 SDK 对接

前端 SDK 不应该再使用裸 `/collect`，而是应该指向正式采集地址：

```text
/api/v1/monitor/collect/{projectKey}
```

例如：

```text
/api/v1/monitor/collect/demo-project-key
```

如果前端通过浏览器直接上报，当前后端已经单独放开了采集接口的 CORS：

- 允许跨域
- 不允许 credentials
- 允许 `GET / POST / OPTIONS`

管理后台接口仍然走受控鉴权和受控 CORS。

## 开发约定

- Controller 放在 `monitor-admin`
- Domain / DTO / Query / VO / Mapper / Service 放在 `monitor-system`
- 安全、认证、CORS、异常处理放在 `monitor-framework`
- 分页查询统一返回 `TableDataInfo`
- 业务错误统一抛 `ServiceException`
- MyBatis 查询与统计使用 XML，不引入 JPA

## 已知边界

这版后端聚焦“监控数据采集、查询、Issue 和基础告警闭环”，当前不包含：

- 录屏文件存储与回放
- 告警外部通知
- RBAC 精细权限
- MQ 异步链路
- ES / OpenSearch 检索
- 按项目动态来源校验的更细粒度跨域控制

## 建议联调顺序

1. 启动 MySQL、Redis 和后端服务
2. 确认 Flyway 迁移已执行，并且库里存在 `flyway_schema_history`
3. 用 `demo-project-key` 配置前端 SDK 的 `dsn`
4. 先打通 `POST /api/v1/monitor/collect/demo-project-key`
5. 再登录后台，验证项目、事件、issue、dashboard 查询链路
