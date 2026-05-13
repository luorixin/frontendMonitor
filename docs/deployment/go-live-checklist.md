# 上线检查清单

这份清单适合在服务首次上线前后逐项核对。

相关文件：

- [docker-compose.prod.yml](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/docker-compose.prod.yml)
- [.env.example](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/.env.example)
- [deploy/server/bootstrap-ubuntu.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/bootstrap-ubuntu.sh)
- [deploy/server/verify-deployment.sh](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/server/verify-deployment.sh)
- [deploy/nginx/frontend-monitor.conf.example](/Users/fridafeng/Documents/sunxin/work/frontend-monitor/deploy/nginx/frontend-monitor.conf.example)

## 1. 服务器基础

- 已安装 Docker Engine
- 已安装 Docker Compose Plugin
- 已安装 Nginx
- 已安装 Certbot
- 已开放 `22/80/443`
- 磁盘空间充足，至少保留 `10GB`

## 2. 代码和配置

- 项目已上传到 `/srv/frontend-monitor`
- 已复制 `.env.example` 为 `.env`
- `MYSQL_ROOT_PASSWORD` 已替换
- `JWT_SECRET` 已替换
- `BACKEND_BIND_HOST=127.0.0.1`
- `REPORT_BIND_HOST=127.0.0.1`
- `REPORT_PORT` 与 Nginx 反代端口一致

## 3. 容器启动前

- 域名已解析到服务器公网 IP
- MySQL 数据卷准备就绪
- Redis 数据卷准备就绪
- 服务器时间和时区正确

## 4. 首次启动

执行：

```bash
cd /srv/frontend-monitor
docker compose -f docker-compose.prod.yml up -d --build
```

确认：

- `docker compose -f docker-compose.prod.yml ps` 中 4 个服务都正常
- `backend` 没有反复重启
- `mysql` 和 `redis` 健康检查通过

## 5. Nginx 与 HTTPS

- Nginx 配置已复制到 `/etc/nginx/conf.d/frontend-monitor.conf`
- `server_name` 已改成真实域名
- `sudo nginx -t` 通过
- `sudo systemctl reload nginx` 成功
- `sudo certbot --nginx -d your-domain` 已执行
- 浏览器访问时证书无报错

## 6. 服务健康检查

本机检查：

```bash
curl http://127.0.0.1:8080/api/v1/monitor/health
curl -I http://127.0.0.1:4176/
```

公网检查：

```bash
curl -I https://your-domain
```

也可以直接用脚本：

```bash
cd /srv/frontend-monitor
DOMAIN=your-domain bash deploy/server/verify-deployment.sh
```

## 7. 业务功能检查

- 能打开登录页
- 能使用 `admin / admin123456` 登录
- 登录后页面接口无 401 / 502 / 网络错误
- 项目列表能正常加载
- Dashboard 能正常显示

## 8. 安全项

- 默认管理员密码已经修改
- `JWT_SECRET` 不再使用默认值
- MySQL 没有直接暴露公网
- Redis 没有直接暴露公网
- `backend` 没有直接暴露公网
- 服务器已开启防火墙

## 9. 日志检查

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 backend
docker compose -f docker-compose.prod.yml logs --tail=200 report
docker compose -f docker-compose.prod.yml logs --tail=200 mysql
docker compose -f docker-compose.prod.yml logs --tail=200 redis
```

重点关注：

- Flyway 迁移失败
- MySQL 连接失败
- Redis 连接失败
- Nginx 502
- JWT / 401 错误

## 10. 升级前后

升级前：

- 备份 MySQL
- 记录当前镜像版本或 git commit

升级：

```bash
cd /srv/frontend-monitor
docker compose -f docker-compose.prod.yml up -d --build
```

升级后：

- 再跑一遍 `verify-deployment.sh`
- 再登录后台核对核心页面
