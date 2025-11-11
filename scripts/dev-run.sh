#!/usr/bin/env bash
set -euo pipefail

WEB_MODE=${DEV_WEB:-true}
MOBILE_MODE=${DEV_MOBILE:-true}
WEB_DIR=${WEB_DIR:-apps/web}
MOBILE_DIR=${MOBILE_DIR:-apps/mobile}
WEB_PORT=${WEB_PORT:-3000}

PIDS=()

log() {
  printf '%s\n' "$1"
}

find_free_port() {
  local port=${1:-8081}
  while lsof -i tcp:"$port" >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

start_web() {
  log "🌐 [CMD] npm run dev (web) ⇒ http://localhost:${WEB_PORT}"
  (
    cd "${WEB_DIR}" && npm run dev
  ) 2>&1 | sed -e 's/^/[WEB] /' &
  PIDS+=($!)
}

start_mobile() {
  local metro_port
  metro_port=$(find_free_port 8081)
  log "📱 [CMD] npm run start (Expo) ⇒ ws://localhost:19000 (Metro port ${metro_port})"
  (
    export EXPO_NO_INTERACTIVE=1
    cd "${MOBILE_DIR}" && npm run start -- --port ${metro_port}
  ) 2>&1 | sed -e 's/^/[MOBILE] /' &
  PIDS+=($!)

  log "📱 [CMD] npm run ios (launch simulator)"
  (
    cd "${MOBILE_DIR}" && npm run ios
  ) 2>&1 | sed -e 's/^/[MOBILE_IOS] /' &
  PIDS+=($!)
}

cleanup_called=false
trap 'cleanup; exit 0' INT TERM

cleanup() {
  $cleanup_called && return
  cleanup_called=true
  printf '\n🧹 Shutting down dev stack...\n'
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  if [ ${#PIDS[@]} -gt 0 ]; then
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
  docker compose down >/dev/null 2>&1 || true
  printf '✅ Dev stack stopped.\n'
}

if [ "$WEB_MODE" = "true" ]; then
  start_web
else
  echo "🌐 Skipping Web dev server"
fi

if [ "$MOBILE_MODE" = "true" ]; then
  start_mobile
else
  echo "📱 Skipping Expo Metro"
fi

if [ ${#PIDS[@]} -eq 0 ]; then
  log "No local dev servers selected. API is running via Docker."
  trap - INT TERM
  exit 0
fi

wait "${PIDS[@]}"
cleanup
exit 0
