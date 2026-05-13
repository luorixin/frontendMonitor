#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script as root: sudo bash deploy/server/bootstrap-ubuntu.sh"
  exit 1
fi

if [[ ! -f /etc/os-release ]]; then
  echo "Unsupported system: /etc/os-release not found"
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release

if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "This bootstrap script currently supports Ubuntu only"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release ufw nginx certbot python3-certbot-nginx

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

ARCH="$(dpkg --print-architecture)"
CODENAME="${VERSION_CODENAME}"

cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl restart docker
systemctl enable nginx
systemctl restart nginx

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

install -d -m 0755 /srv/frontend-monitor

echo
echo "Bootstrap completed."
echo
echo "Installed:"
echo "- Docker Engine"
echo "- Docker Compose Plugin"
echo "- Nginx"
echo "- Certbot"
echo "- UFW rules for 22, 80, 443"
echo
echo "Recommended next steps:"
echo "1. Upload the project into /srv/frontend-monitor"
echo "2. cp /srv/frontend-monitor/.env.example /srv/frontend-monitor/.env"
echo "3. Edit /srv/frontend-monitor/.env"
echo "4. docker compose -f /srv/frontend-monitor/docker-compose.prod.yml up -d --build"
echo "5. Copy deploy/nginx/frontend-monitor.conf.example to /etc/nginx/conf.d/"
