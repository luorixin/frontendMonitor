# Backend + Report 部署文档

这份文档覆盖两个服务：

- `apps/backend`：Spring Boot 后端，默认监听 `8080`
- `apps/report`：React + Vite 报表前端，容器内由 Nginx 托管，默认监听 `80`

推荐从仓库根目录执行本文中的命令。

如果你希望直接拿到服务器上启动，优先使用这两份文件：

- [docker-compose.prod.yml](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docker-compose.prod.yml)
- [.env.example](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/.env.example)
- [deploy/nginx/frontend-monitor.conf.example](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/nginx/frontend-monitor.conf.example)
- [docs/deployment/ubuntu-server-quickstart.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/ubuntu-server-quickstart.md)
- [deploy/server/bootstrap-ubuntu.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-ubuntu.sh)
- [docs/deployment/centos-server-quickstart.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/centos-server-quickstart.md)
- [deploy/server/bootstrap-centos.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-centos.sh)
- [docs/deployment/go-live-checklist.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/go-live-checklist.md)
- [deploy/server/verify-deployment.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/verify-deployment.sh)
- [docs/deployment/zero-to-live.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/zero-to-live.md)

## 1. 部署拓扑建议

推荐使用下面这套最省事的拓扑：

- `report` 对外提供页面访问
- `report` 容器内的 Nginx 将 `/api/*` 反向代理到 `backend`
- `backend` 只需要暴露给 `report` 或内网网关
- `backend` 依赖独立的 MySQL 和 Redis

这样做有两个好处：

- 前端代码里 API 基址保持 `/api/v1`，不用额外改构建配置
- 避免前后端分域带来的 CORS 配置复杂度

## 2. 前置依赖

### 服务器需要准备什么

- 一台 Linux 服务器，建议至少 `2C4G`
- Docker Engine
- Docker Compose Plugin
- Nginx
- 一个可解析到服务器的域名
- 80 / 443 端口
- 至少 `10GB` 可用磁盘空间给镜像、MySQL 和日志

如果你准备直接把 `report` 暴露到公网，推荐再准备：

- HTTPS 证书
- 一层公网反向代理，比如 Nginx、Caddy 或云负载均衡

### Backend 依赖

- MySQL 8+，数据库名建议为 `monitor`
- Redis 6+
- Java 21 仅在非容器方式运行时需要

### Report 依赖

- 无额外服务依赖
- 只要能访问 `backend` 即可

## 3. Backend Docker 镜像

Docker 文件位置：

- [apps/backend/Dockerfile](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/apps/backend/Dockerfile)

### 构建镜像

```bash
docker build -f apps/backend/Dockerfile -t frontend-monitor-backend .
```

### 运行镜像

```bash
docker network create monitor-net

docker run -d \
  --name monitor-backend \
  --network monitor-net \
  -p 8080:8080 \
  -e MYSQL_HOST=mysql \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=root \
  -e MYSQL_PASSWORD=your-password \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET='replace-with-at-least-32-bytes' \
  frontend-monitor-backend
```

### Backend 关键环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MYSQL_HOST` | `127.0.0.1` | MySQL 主机 |
| `MYSQL_PORT` | `3306` | MySQL 端口 |
| `MYSQL_USER` | `root` | MySQL 用户 |
| `MYSQL_PASSWORD` | `luorixin` | MySQL 密码 |
| `REDIS_HOST` | `127.0.0.1` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | 空 | Redis 密码 |
| `JWT_SECRET` | 内置默认值 | JWT 密钥，生产必须替换 |
| `JWT_ISSUER` | `monitor-backend` | JWT 签发者 |
| `JWT_ACCESS_TTL` | `30` | Access Token 分钟数 |
| `JWT_REFRESH_TTL` | `720` | Refresh Token 分钟数 |
| `SPRING_FLYWAY_ENABLED` | `true` | 是否启用 Flyway |
| `SPRING_FLYWAY_BASELINE_ON_MIGRATE` | `true` | 是否启用 baseline |
| `SPRING_FLYWAY_BASELINE_VERSION` | `2` | baseline 版本 |
| `MONITOR_RETENTION_EVENT_DAYS` | `30` | 事件保留天数 |
| `MONITOR_RETENTION_AGGREGATE_DAYS` | `180` | 聚合数据保留天数 |
| `JAVA_OPTS` | 空 | 额外 JVM 参数 |

### Backend 启动后检查

健康检查：

```bash
curl http://127.0.0.1:8080/api/v1/monitor/health
```

如果你使用的是新数据库，Flyway 会自动执行迁移。

## 4. Report Docker 镜像

Docker 文件位置：

- [apps/report/Dockerfile](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/apps/report/Dockerfile)

Nginx 模板位置：

- [apps/report/nginx/default.conf.template](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/apps/report/nginx/default.conf.template)

### 构建镜像

```bash
docker build -f apps/report/Dockerfile -t frontend-monitor-report .
```

### 运行镜像

```bash
docker run -d \
  --name monitor-report \
  --network monitor-net \
  -p 4176:80 \
  -e BACKEND_UPSTREAM=http://monitor-backend:8080 \
  frontend-monitor-report
```

### Report 关键环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BACKEND_UPSTREAM` | `http://backend:8080` | Nginx 反向代理目标地址 |

### Report 访问地址

启动后访问：

```text
http://127.0.0.1:4176
```

默认登录账号：

- 用户名：`admin`
- 密码：`admin123456`

## 5. 推荐启动顺序

1. 先启动 MySQL 和 Redis
2. 再启动 `backend`
3. 最后启动 `report`

## 6. 使用 docker-compose 部署到自己的服务器

### 第一步：上传代码

你可以用 `git clone`，也可以把项目打包上传到服务器。下面假设你已经进入项目根目录：

```bash
cd /srv/frontend-monitor
```

### 第二步：准备环境变量

复制示例文件：

```bash
cp .env.example .env
```

至少改这几个值：

- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `REPORT_PORT`
- `BACKEND_BIND_HOST`
- `REPORT_BIND_HOST`

如果你的 `backend` 不希望被公网直接访问，保持：

```bash
BACKEND_BIND_HOST=127.0.0.1
REPORT_BIND_HOST=127.0.0.1
```

### 第三步：启动服务

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 第四步：检查状态

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f report
```

### 第五步：访问系统

- 报表前端：`http://你的服务器IP:4176`
- 后端健康检查：`http://127.0.0.1:8080/api/v1/monitor/health`

默认登录账号：

- 用户名：`admin`
- 密码：`admin123456`

### 第六步：升级

拉新代码后执行：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 第七步：停止

```bash
docker compose -f docker-compose.prod.yml down
```

如果你不想删除数据库和 Redis 数据，不要加 `-v`。

## 7. 给域名和 HTTPS

推荐做法是：

1. `docker-compose.prod.yml` 里的 `report` 继续监听 `127.0.0.1:4176`
2. 宿主机 Nginx 监听 `80/443`
3. Nginx 把域名流量转发到 `http://127.0.0.1:4176`

示例配置文件：

- [deploy/nginx/frontend-monitor.conf.example](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/nginx/frontend-monitor.conf.example)

### Nginx 配置步骤

把示例文件复制到服务器：

```bash
sudo cp deploy/nginx/frontend-monitor.conf.example /etc/nginx/conf.d/frontend-monitor.conf
```

把里面的域名：

```nginx
server_name monitor.example.com;
```

改成你自己的域名。

### 检查并重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 申请 HTTPS 证书

如果服务器上已经装了 `certbot`，可以直接申请：

```bash
sudo certbot --nginx -d monitor.example.com
```

证书签发后，`certbot` 通常会自动把 443 配置补进去；如果没有自动写入，也可以参考示例文件里注释掉的 HTTPS 段。

### 上线后的访问方式

- 前端页面：`https://monitor.example.com`
- 前端内部请求：`https://monitor.example.com/api/v1/*`
- 后端容器：仍然只监听本机 `127.0.0.1:8080`

## 8. 如果前后端分开域名部署

当前项目更适合同域部署。如果你一定要把前后端拆成两个域名：

1. `report` 侧可以继续使用当前 Docker 方案，但把 `BACKEND_UPSTREAM` 指向外部后端地址
2. `backend` 侧需要确认 `app.cors.allowed-origin-patterns` 包含前端域名

如果你走 Spring Boot 环境变量方式，可以尝试使用类似下面的配置：

```bash
-e APP_CORS_ALLOWED_ORIGIN_PATTERNS_0=https://report.example.com
```

如果环境变量绑定不符合你的部署平台约定，建议改为挂载外部 `application.yml`。

## 9. 常见问题

### 1. Flyway 启动失败

优先检查：

- MySQL 是否可连通
- `flyway_schema_history` 是否有失败记录
- 当前镜像是否使用了最新代码构建

### 2. Report 页面能打开但接口全是网络错误

优先检查：

- `BACKEND_UPSTREAM` 是否正确
- `backend` 容器名和网络是否一致
- `backend` 是否真的监听在 `8080`
- 宿主机 Nginx 是否正确转发到了 `127.0.0.1:4176`

如果你是按 `docker-compose.prod.yml` 启动的，`report` 默认会走容器内的 `http://backend:8080`，通常不需要手工改。

### 3. 登录后 401

优先检查：

- `JWT_SECRET` 是否在多实例之间一致
- 浏览器访问的 `report` 是否反代到了正确的 `backend`

### 4. 域名能打开但页面 502

优先检查：

- `docker compose -f docker-compose.prod.yml ps`
- `docker compose -f docker-compose.prod.yml logs -f report`
- `sudo nginx -t`
- `sudo systemctl status nginx`

## 10. 一套最小可跑的容器命令

```bash
docker network create monitor-net

docker run -d --name mysql --network monitor-net \
  -e MYSQL_ROOT_PASSWORD=your-password \
  -e MYSQL_DATABASE=monitor \
  mysql:8.4

docker run -d --name redis --network monitor-net redis:7-alpine

docker build -f apps/backend/Dockerfile -t frontend-monitor-backend .
docker build -f apps/report/Dockerfile -t frontend-monitor-report .

docker run -d \
  --name monitor-backend \
  --network monitor-net \
  -p 8080:8080 \
  -e MYSQL_HOST=mysql \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=root \
  -e MYSQL_PASSWORD=your-password \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET='replace-with-at-least-32-bytes' \
  frontend-monitor-backend

docker run -d \
  --name monitor-report \
  --network monitor-net \
  -p 4176:80 \
  -e BACKEND_UPSTREAM=http://monitor-backend:8080 \
  frontend-monitor-report
```
