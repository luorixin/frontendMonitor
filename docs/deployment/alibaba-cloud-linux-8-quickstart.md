# Alibaba Cloud Linux 8 / Alibaba Cloud Linux 3 快速初始化

这份文档适合你给出的这类环境：

- 内核版本：`Linux 5.10.134-19.2.al8.x86_64`
- 系统架构：`x86_64`
- 发行版：`Alibaba Cloud Linux 8`
- 架构类型：`x86_64 GNU/Linux`

基于 Alibaba Cloud 官方文档，这类系统应按 `Alibaba Cloud Linux 3` 路线处理：

- Alibaba Cloud 文档说明，`Alibaba Cloud Linux 3` 使用 `DNF` 包管理器 [来源](https://www.alibabacloud.com/help/en/oos/getting-started/how-a-patch-manager-works)
- Docker 安装步骤里，官方要求额外安装 `dnf-plugin-releasever-adapter --repo alinux3-plus` [来源](https://www.alibabacloud.com/help/en/ecs/user-guide/install-and-use-docker)

对应脚本：

- [deploy/server/bootstrap-alibaba-cloud-linux-8.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-alibaba-cloud-linux-8.sh)

## 1. 登录服务器

```bash
ssh root@your-server-ip
```

如果你用普通用户：

```bash
ssh ecs-user@your-server-ip
sudo -i
```

## 2. 上传项目

推荐目录：

```bash
/srv/frontend-monitor
```

如果服务器还没有 `git`，也可以先手动安装：

```bash
dnf -y install git
```

拉项目：

```bash
git clone <your-repo-url> /srv/frontend-monitor
cd /srv/frontend-monitor
```

## 3. 执行初始化脚本

```bash
sudo bash deploy/server/bootstrap-alibaba-cloud-linux-8.sh
```

它会做这些事情：

- 安装 Docker
- 安装 Docker Compose Plugin
- 安装 Nginx
- 安装 Certbot
- 安装 firewalld
- 打开系统防火墙的 `ssh/http/https`
- 创建 `/srv/frontend-monitor`

## 4. 打开 ECS 安全组端口

除了系统防火墙，你还需要在 Alibaba Cloud ECS 安全组里放行：

- `80/tcp`
- `443/tcp`

Alibaba Cloud 的证书安装文档也明确提到，`443` 需要同时在安全组和系统防火墙中开放 [来源](https://www.alibabacloud.com/help/en/ssl-certificate/install-ssl-certificates-on-nginx-servers-or-tengine-servers)。

## 5. 准备环境变量

```bash
cd /srv/frontend-monitor
cp .env.example .env
```

至少改掉：

- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`

如果你打算让宿主机 Nginx 对外暴露服务，建议保持：

```bash
BACKEND_BIND_HOST=127.0.0.1
REPORT_BIND_HOST=127.0.0.1
```

## 6. 启动服务

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. 配置域名反代

复制示例：

```bash
sudo cp deploy/nginx/frontend-monitor.conf.example /etc/nginx/conf.d/frontend-monitor.conf
```

修改：

```nginx
server_name monitor.example.com;
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. 申请 HTTPS

```bash
sudo certbot --nginx -d monitor.example.com
```

## 9. 检查结果

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f report
curl http://127.0.0.1:8080/api/v1/monitor/health
```

也可以直接跑自检脚本：

```bash
cd /srv/frontend-monitor
DOMAIN=monitor.example.com bash deploy/server/verify-deployment.sh
```

浏览器访问：

```text
https://monitor.example.com
```
