#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTANCES=("navvia" "fibbo")
ADMIN_DIR="/root/LibreChat/deploy/admin"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

build_instance() {
  local name="$1"
  local dir="/root/${name}"

  log "=== $name: pulling latest ==="
  git -C "$REPO_ROOT" pull origin main

  log "=== $name: building image ==="
  docker build --no-cache -f "$REPO_ROOT/Dockerfile.overlay" \
    -t "librechat-${name}" "$REPO_ROOT" \
    || die "docker build failed for $name"

  log "=== $name: restarting container ==="
  docker compose -f "${dir}/docker-compose.yml" up -d --force-recreate api \
    || die "docker compose failed for $name"

  log "=== $name: done ==="
}

deploy_admin() {
  log "=== admin: building and restarting ==="
  docker compose -f "${ADMIN_DIR}/docker-compose.yml" up -d --build \
    || die "admin deploy failed"
  log "=== admin: done ==="
}

TARGETS=("${@:-${INSTANCES[@]}}")

for target in "${TARGETS[@]}"; do
  case "$target" in
    navvia|fibbo) build_instance "$target" ;;
    admin)        deploy_admin ;;
    all)
      for inst in "${INSTANCES[@]}"; do build_instance "$inst"; done
      deploy_admin
      ;;
    *) die "Unknown target: $target. Use: navvia, fibbo, admin, all" ;;
  esac
done

log "Deploy complete."
