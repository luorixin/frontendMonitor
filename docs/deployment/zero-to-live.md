# 从 0 到上线命令手册

这份文档按“新服务器第一次上线”的真实顺序组织，适合直接照着执行。

配套文件：

- [docs/deployment/backend-report.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/backend-report.md)
- [docs/deployment/ubuntu-server-quickstart.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/ubuntu-server-quickstart.md)
- [docs/deployment/go-live-checklist.md](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docs/deployment/go-live-checklist.md)
- [deploy/server/bootstrap-ubuntu.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-ubuntu.sh)
- [deploy/server/verify-deployment.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/verify-deployment.sh)

## 场景假设

- 服务器系统：Ubuntu 22.04 / 24.04
- 域名：`monitor.example.com`
- 项目目录：`/srv/frontend-monitor`
- 你已经有仓库访问权限

## 1. SSH 登录服务器

```bash
ssh root@your-server-ip
```

如果你用普通用户：

```bash
ssh ubuntu@your-server-ip
sudo -i
```

## 2. 安装 git

如果服务器还没有 `git`：

```bash
apt-get update
apt-get install -y git
```

## 3. 拉取项目

```bash
git clone <your-repo-url> /srv/frontend-monitor
cd /srv/frontend-monitor
```

## 4. 初始化服务器环境

执行初始化脚本：

```bash
sudo bash deploy/server/bootstrap-ubuntu.sh
```

这一步会安装：

- Docker
- Docker Compose Plugin
- Nginx
- Certbot
- UFW 基础规则

## 5. 准备环境变量

复制配置模板：

```bash
cd /srv/frontend-monitor
cp .env.example .env
```

编辑配置：

```bash
nano .env
```

至少改这些值：

```dotenv
MYSQL_ROOT_PASSWORD=改成强密码
JWT_SECRET=改成至少32位随机字符串
BACKEND_BIND_HOST=127.0.0.1
REPORT_BIND_HOST=127.0.0.1
REPORT_PORT=4176
```

## 6. 首次启动容器

```bash
cd /srv/frontend-monitor
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. 看容器状态

```bash
docker compose -f docker-compose.prod.yml ps
```

正常情况下应该看到：

- `monitor-mysql`
- `monitor-redis`
- `monitor-backend`
- `monitor-report`

## 8. 看关键日志

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 backend
docker compose -f docker-compose.prod.yml logs --tail=200 report
```

如果是第一次启动，重点确认：

- Flyway 迁移成功
- backend 没有循环重启
- report 正常启动

## 9. 先做本机健康检查

```bash
curl http://127.0.0.1:8080/api/v1/monitor/health
curl -I http://127.0.0.1:4176/
```

## 10. 配置域名反代

复制示例配置：

```bash
sudo cp deploy/nginx/frontend-monitor.conf.example /etc/nginx/conf.d/frontend-monitor.conf
```

编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/conf.d/frontend-monitor.conf
```

把：

```nginx
server_name monitor.example.com;
```

改成你自己的域名。

## 11. 检查并加载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 12. 申请 HTTPS 证书

```bash
sudo certbot --nginx -d monitor.example.com
```

如果有多个域名：

```bash
sudo certbot --nginx -d monitor.example.com -d www.monitor.example.com
```

## 13. 验证公网访问

```bash
curl -I https://monitor.example.com
```

## 14. 跑部署自检脚本

```bash
cd /srv/frontend-monitor
DOMAIN=monitor.example.com bash deploy/server/verify-deployment.sh
```

## 15. 浏览器手工检查

浏览器打开：

```text
https://monitor.example.com
```

默认登录：

- 用户名：`admin`
- 密码：`admin123456`

登录后至少确认：

- 登录成功
- 项目列表能加载
- Dashboard 页面正常
- 浏览器控制台没有明显接口报错

## 16. 上线后建议立刻做的事

### 修改默认管理员密码

当前默认账号是：

- `admin / admin123456`

生产环境建议第一时间改掉。

### 记录当前版本

```bash
git rev-parse HEAD
docker compose -f docker-compose.prod.yml ps
```

### 备份数据库策略

至少确认你后续有：

- MySQL 定期备份
- 服务器磁盘监控
- 证书续期检查

## 17. 后续升级

```bash
cd /srv/frontend-monitor
git pull
docker compose -f docker-compose.prod.yml up -d --build
DOMAIN=monitor.example.com bash deploy/server/verify-deployment.sh
```

## 18. 常用排错命令

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f report
docker compose -f docker-compose.prod.yml logs -f mysql
docker compose -f docker-compose.prod.yml logs -f redis
sudo nginx -t
sudo systemctl status nginx
curl http://127.0.0.1:8080/api/v1/monitor/health
curl -I http://127.0.0.1:4176/
curl -I https://monitor.example.com
```
