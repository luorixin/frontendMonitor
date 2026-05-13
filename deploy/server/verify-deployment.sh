#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${1:-/srv/frontend-monitor}"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
DOMAIN="${DOMAIN:-}"
REPORT_PORT="${REPORT_PORT:-4176}"
BACKEND_PORT="${BACKEND_PORT:-8080}"

if [[ ! -d "${PROJECT_DIR}" ]]; then
  echo "Project directory not found: ${PROJECT_DIR}"
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

echo "== docker compose ps =="
docker compose -f "${COMPOSE_FILE}" ps

echo
echo "== backend health =="
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/v1/monitor/health"
echo

echo
echo "== report local check =="
curl -I -fsS "http://127.0.0.1:${REPORT_PORT}/"
echo

if [[ -n "${DOMAIN}" ]]; then
  echo
  echo "== public domain check =="
  curl -I -fsS "https://${DOMAIN}/"
  echo
fi

echo
echo "Verification completed."
