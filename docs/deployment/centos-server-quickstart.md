# CentOS / RHEL 系服务器快速初始化

这份文档适合下面这类系统：

- CentOS Stream 9+
- Rocky Linux 9+
- AlmaLinux 9+
- RHEL 9+

对应脚本：

- [deploy/server/bootstrap-centos.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-centos.sh)

说明一件事：传统 `CentOS Linux 7` 已经在 **2024 年 6 月 30 日** 结束支持，这份脚本不以它为目标，默认按更新的 RHEL 系发行版来写。

## 1. 登录服务器

```bash
ssh root@your-server-ip
```

如果你用普通用户：

```bash
ssh centos@your-server-ip
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
sudo bash deploy/server/bootstrap-centos.sh
```

它会做这些事情：

- 安装 Docker
- 安装 Docker Compose Plugin
- 安装 Nginx
- 安装 Certbot
- 安装 firewalld
- 打开 `ssh/http/https`
- 创建 `/srv/frontend-monitor`

## 4. 准备环境变量

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
