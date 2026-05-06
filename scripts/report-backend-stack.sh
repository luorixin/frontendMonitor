#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime/report-backend-stack"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
REPORT_PID_FILE="$RUNTIME_DIR/report.pid"
BACKEND_LOG_FILE="$RUNTIME_DIR/backend.log"
REPORT_LOG_FILE="$RUNTIME_DIR/report.log"
MAVEN_REPO_DIR="$ROOT_DIR/.m2/repository"
BACKEND_PORT="${BACKEND_PORT:-8080}"
REPORT_PORT="${REPORT_PORT:-4176}"

mkdir -p "$RUNTIME_DIR"

usage() {
  cat <<'EOF'
Usage: ./scripts/report-backend-stack.sh <start|stop|restart|status|logs>

Commands:
  start    Start backend and report apps in the background
  stop     Stop backend and report apps started by this script
  restart  Restart both apps
  status   Show current process and log locations
  logs     Tail both log files
EOF
}

read_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    tr -d '[:space:]' < "$pid_file"
  fi
}

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

cleanup_pid_file() {
  local pid_file="$1"
  local pid
  pid="$(read_pid "$pid_file")"
  if [[ -n "$pid" ]] && ! is_running "$pid"; then
    rm -f "$pid_file"
  fi
}

wait_for_exit() {
  local pid="$1"
  local attempts=30
  while is_running "$pid" && (( attempts > 0 )); do
    sleep 1
    attempts=$((attempts - 1))
  done
  ! is_running "$pid"
}

start_backend() {
  cleanup_pid_file "$BACKEND_PID_FILE"
  local pid
  pid="$(read_pid "$BACKEND_PID_FILE")"
  if is_running "$pid"; then
    echo "backend already running (pid=$pid, port=$BACKEND_PORT)"
    return
  fi

  echo "starting backend on port $BACKEND_PORT"
  echo "preparing backend module dependencies"
  mvn -Dmaven.repo.local="$MAVEN_REPO_DIR" \
    -f "$ROOT_DIR/apps/backend/pom.xml" \
    -pl monitor-admin \
    -am \
    -DskipTests \
    install >>"$BACKEND_LOG_FILE" 2>&1

  nohup mvn -Dmaven.repo.local="$MAVEN_REPO_DIR" \
    -f "$ROOT_DIR/apps/backend/monitor-admin/pom.xml" \
    spring-boot:run >"$BACKEND_LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" > "$BACKEND_PID_FILE"
  sleep 2

  if is_running "$pid"; then
    echo "backend started (pid=$pid, log=$BACKEND_LOG_FILE)"
  else
    echo "backend failed to start; check $BACKEND_LOG_FILE" >&2
    rm -f "$BACKEND_PID_FILE"
    return 1
  fi
}

start_report() {
  cleanup_pid_file "$REPORT_PID_FILE"
  local pid
  pid="$(read_pid "$REPORT_PID_FILE")"
  if is_running "$pid"; then
    echo "report already running (pid=$pid, port=$REPORT_PORT)"
    return
  fi

  echo "starting report on port $REPORT_PORT"
  nohup pnpm --dir "$ROOT_DIR/apps/report" exec vite --host 127.0.0.1 --port "$REPORT_PORT" \
    >"$REPORT_LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" > "$REPORT_PID_FILE"
  sleep 2

  if is_running "$pid"; then
    echo "report started (pid=$pid, log=$REPORT_LOG_FILE)"
  else
    echo "report failed to start; check $REPORT_LOG_FILE" >&2
    rm -f "$REPORT_PID_FILE"
    return 1
  fi
}

stop_service() {
  local name="$1"
  local pid_file="$2"

  cleanup_pid_file "$pid_file"
  local pid
  pid="$(read_pid "$pid_file")"

  if ! is_running "$pid"; then
    echo "$name is not running"
    rm -f "$pid_file"
    return
  fi

  echo "stopping $name (pid=$pid)"
  kill "$pid" 2>/dev/null || true

  if wait_for_exit "$pid"; then
    rm -f "$pid_file"
    echo "$name stopped"
    return
  fi

  echo "$name did not stop in time; sending SIGKILL"
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}

show_status() {
  cleanup_pid_file "$BACKEND_PID_FILE"
  cleanup_pid_file "$REPORT_PID_FILE"

  local backend_pid report_pid
  backend_pid="$(read_pid "$BACKEND_PID_FILE")"
  report_pid="$(read_pid "$REPORT_PID_FILE")"

  if is_running "$backend_pid"; then
    echo "backend: running (pid=$backend_pid, port=$BACKEND_PORT)"
  else
    echo "backend: stopped"
  fi

  if is_running "$report_pid"; then
    echo "report:  running (pid=$report_pid, port=$REPORT_PORT)"
  else
    echo "report:  stopped"
  fi

  echo "backend log: $BACKEND_LOG_FILE"
  echo "report log:  $REPORT_LOG_FILE"
}

tail_logs() {
  touch "$BACKEND_LOG_FILE" "$REPORT_LOG_FILE"
  tail -n 80 -f "$BACKEND_LOG_FILE" "$REPORT_LOG_FILE"
}

main() {
  local command="${1:-status}"
  case "$command" in
    start)
      start_backend
      start_report
      show_status
      ;;
    stop)
      stop_report_first=1
      if [[ "$stop_report_first" -eq 1 ]]; then
        stop_service "report" "$REPORT_PID_FILE"
        stop_service "backend" "$BACKEND_PID_FILE"
      fi
      ;;
    restart)
      "$0" stop
      "$0" start
      ;;
    status)
      show_status
      ;;
    logs)
      tail_logs
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
