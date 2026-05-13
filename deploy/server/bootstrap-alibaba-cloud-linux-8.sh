#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script as root: sudo bash deploy/server/bootstrap-alibaba-cloud-linux-8.sh"
  exit 1
fi

if [[ ! -f /etc/os-release ]]; then
  echo "Unsupported system: /etc/os-release not found"
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release

PRETTY="${PRETTY_NAME:-}"
ID_LIKE_VALUE="${ID_LIKE:-}"
if [[ "${ID:-}" != "alinux" && "${PRETTY}" != *"Alibaba Cloud Linux"* && "${ID_LIKE_VALUE}" != *"alinux"* ]]; then
  echo "This bootstrap script supports Alibaba Cloud Linux only"
  exit 1
fi

if ! command -v dnf >/dev/null 2>&1; then
  echo "dnf is required on this system"
  exit 1
fi

dnf -y install dnf-plugins-core epel-release
dnf -y install ca-certificates curl gnupg2 wget nginx firewalld certbot python3-certbot-nginx git

rm -f /etc/yum.repos.d/docker*.repo
wget -O /etc/yum.repos.d/docker-ce.repo http://mirrors.cloud.aliyuncs.com/docker-ce/linux/centos/docker-ce.repo
sed -i 's|https://mirrors.aliyun.com|http://mirrors.cloud.aliyuncs.com|g' /etc/yum.repos.d/docker-ce.repo
dnf -y install dnf-plugin-releasever-adapter --repo alinux3-plus
dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl restart docker
systemctl enable nginx
systemctl restart nginx
systemctl enable firewalld
systemctl restart firewalld

firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

install -d -m 0755 /srv/frontend-monitor

echo
echo "Bootstrap completed."
echo
echo "Installed:"
echo "- Docker Engine"
echo "- Docker Compose Plugin"
echo "- Nginx"
echo "- Certbot"
echo "- firewalld rules for ssh, http, https"
echo "- git"
echo
echo "Recommended next steps:"
echo "1. Upload the project into /srv/frontend-monitor"
echo "2. cp /srv/frontend-monitor/.env.example /srv/frontend-monitor/.env"
echo "3. Edit /srv/frontend-monitor/.env"
echo "4. docker compose -f /srv/frontend-monitor/docker-compose.prod.yml up -d --build"
echo "5. Copy deploy/nginx/frontend-monitor.conf.example to /etc/nginx/conf.d/"
echo "6. Open ports 80 and 443 in the Alibaba Cloud ECS security group"
