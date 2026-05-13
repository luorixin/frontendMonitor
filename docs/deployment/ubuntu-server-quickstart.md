# Ubuntu 服务器快速初始化

这份文档适合一台全新的 Ubuntu 22.04 / 24.04 服务器，目标是把下面几样一次装好：

- Docker Engine
- Docker Compose Plugin
- Nginx
- Certbot
- UFW 基础规则

对应脚本：

- [deploy/server/bootstrap-ubuntu.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-ubuntu.sh)

## 1. 登录服务器

```bash
ssh root@your-server-ip
```

如果你用的是普通用户，也可以：

```bash
ssh ubuntu@your-server-ip
sudo -i
```

## 2. 上传项目

推荐目录：

```bash
/srv/frontend-monitor
```

可以直接 `git clone`：

```bash
git clone <your-repo-url> /srv/frontend-monitor
cd /srv/frontend-monitor
```

## 3. 执行初始化脚本

```bash
sudo bash deploy/server/bootstrap-ubuntu.sh
```

它会做这些事情：

- 安装 Docker
- 安装 Docker Compose Plugin
- 安装 Nginx
- 安装 Certbot
- 打开 `22/80/443`
- 创建 `/srv/frontend-monitor`

## 4. 准备环境变量

```bash
cd /srv/frontend-monitor
cp .env.example .env
```

至少改掉：

- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`

如果你准备让宿主机 Nginx 对外暴露服务，建议保持：

```bash
BACKEND_BIND_HOST=127.0.0.1
REPORT_BIND_HOST=127.0.0.1
```

## 5. 启动服务

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 6. 配置域名反代

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

## 7. 申请 HTTPS

```bash
sudo certbot --nginx -d monitor.example.com
```

## 8. 检查结果

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f report
curl http://127.0.0.1:8080/api/v1/monitor/health
```

浏览器访问：

```text
https://monitor.example.com
```
