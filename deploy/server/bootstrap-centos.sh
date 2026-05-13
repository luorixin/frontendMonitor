#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script as root: sudo bash deploy/server/bootstrap-centos.sh"
  exit 1
fi

if [[ ! -f /etc/os-release ]]; then
  echo "Unsupported system: /etc/os-release not found"
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release

case "${ID:-}" in
  centos|rhel|rocky|almalinux)
    ;;
  *)
    echo "This bootstrap script supports CentOS Stream / RHEL / Rocky / AlmaLinux only"
    exit 1
    ;;
esac

if ! command -v dnf >/dev/null 2>&1; then
  echo "dnf is required on this system"
  exit 1
fi

dnf -y install dnf-plugins-core epel-release

if dnf repolist all | grep -qE '(^| )crb/|(^| )crb '; then
  dnf config-manager --set-enabled crb || true
fi

if dnf repolist all | grep -qE '(^| )powertools/|(^| )powertools '; then
  dnf config-manager --set-enabled powertools || true
fi

dnf -y install ca-certificates curl gnupg2 nginx firewalld certbot python3-certbot-nginx git

dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
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
