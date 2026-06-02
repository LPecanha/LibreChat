#!/usr/bin/env bash
# =============================================================================
# Navvia deploy script (single-tenant)
# =============================================================================
# Único entrypoint pra todo o ciclo de vida do stack Navvia em produção.
#
# Layout esperado (clone uma vez no servidor):
#
#   /opt/navvia/                       ← repo clonado
#     deploy/
#       docker-compose.yml             ← stack inteiro
#       .env                           ← criado do .env.example
#       librechat.yaml                 ← config LibreChat
#       navvia.sh                      ← este script
#       data/                          ← volumes runtime (uploads, logs, meili)
#
# Uso:
#   ./deploy/navvia.sh update          # git pull --ff-only + build + up -d
#   ./deploy/navvia.sh deploy          # alias de `update`
#   ./deploy/navvia.sh pull            # só git pull
#   ./deploy/navvia.sh build [svc...]  # rebuild imagens (default: all)
#   ./deploy/navvia.sh up              # docker compose up -d (sem rebuild)
#   ./deploy/navvia.sh down            # docker compose down (preserva volumes)
#   ./deploy/navvia.sh restart [svc]   # docker compose restart
#   ./deploy/navvia.sh logs [svc]      # docker compose logs -f
#   ./deploy/navvia.sh status          # docker compose ps
#   ./deploy/navvia.sh shell <svc>     # exec sh num container rodando
#   ./deploy/navvia.sh help            # esta mensagem
#
# Modo BETA (segundo stack rodando em paralelo, sharing infra do principal):
#   Acrescente --beta a QUALQUER comando para usar docker-compose.beta.yml
#   e .env (mesmo arquivo, mas com APP_UPLOADS_DIR / BETA_PORT setados).
#
#   ./deploy/navvia.sh update --beta   # sobe só o api da beta na porta 3093
#   ./deploy/navvia.sh logs api --beta
#   ./deploy/navvia.sh down --beta
# =============================================================================
set -euo pipefail

# ── Bootstrap paths ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Detecta flag --beta em qualquer posição da call e remove dos args.
# Setado o flag, troca o compose file pra docker-compose.beta.yml.
MODE="app"
NEW_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --beta)  MODE="beta" ;;
    *)       NEW_ARGS+=("$arg") ;;
  esac
done
set -- "${NEW_ARGS[@]+"${NEW_ARGS[@]}"}"

if [[ "$MODE" == "beta" ]]; then
  COMPOSE_FILE="$SCRIPT_DIR/docker-compose.beta.yml"
else
  COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
fi

# Compose invocation — sempre referencia o env explícito (-e) e o file (-f).
DC="docker compose --env-file $ENV_FILE -f $COMPOSE_FILE"

# ── Pretty output ────────────────────────────────────────────────────────────
log()  { printf '\033[1;34m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m⚠\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
die()  { err "$*"; exit 1; }

# ── Pre-flight checks ────────────────────────────────────────────────────────
preflight() {
  [[ -d "$REPO_ROOT/.git" ]] || die "Não é um repo git: $REPO_ROOT"
  [[ -f "$COMPOSE_FILE" ]]   || die "Compose file não encontrado: $COMPOSE_FILE"
  local example_env=".env.example"
  [[ "$MODE" == "beta" ]] && example_env=".env.beta.example"
  [[ -f "$ENV_FILE" ]]       || die "Env file não encontrado: $ENV_FILE — copie de $example_env"
  command -v docker >/dev/null || die "docker não está instalado"
  docker compose version >/dev/null 2>&1 || die "docker compose v2 não está disponível"

  if [[ "$MODE" == "beta" ]]; then
    docker network inspect navvia_internal >/dev/null 2>&1 || \
      die "rede navvia_internal não existe — suba o stack principal primeiro (./deploy/navvia.sh up)"
  fi
}

current_commit() {
  git -C "$REPO_ROOT" log -1 --oneline 2>/dev/null || echo "unknown"
}

# ── Commands ────────────────────────────────────────────────────────────────

cmd_pull() {
  log "Buscando atualizações do repositório…"
  git -C "$REPO_ROOT" fetch --tags --prune
  local before after
  before="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  git -C "$REPO_ROOT" pull --ff-only || die "Não consegui dar pull com fast-forward — resolva conflitos locais primeiro"
  after="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  if [[ "$before" == "$after" ]]; then
    ok "Já estava no commit mais recente: $(current_commit)"
  else
    ok "Atualizado: $(current_commit)"
  fi
}

cmd_build() {
  local svcs=("$@")
  log "Construindo imagens… (${svcs[*]:-todos os serviços})"
  $DC build --pull "${svcs[@]}"
  ok "Build concluído"
}

cmd_up() {
  log "Subindo serviços (sem rebuild)…"
  $DC up -d --remove-orphans
  ok "Stack rodando — $(current_commit)"
}

cmd_down() {
  log "Parando stack (volumes preservados)…"
  $DC down
  ok "Stack parado"
}

cmd_restart() {
  if [[ $# -gt 0 ]]; then
    log "Reiniciando $*…"
    $DC restart "$@"
  else
    log "Reiniciando todos os serviços…"
    $DC restart
  fi
  ok "Restart concluído"
}

cmd_logs() {
  if [[ $# -gt 0 ]]; then
    $DC logs -f --tail=200 "$@"
  else
    $DC logs -f --tail=200
  fi
}

cmd_status() {
  $DC ps
}

cmd_shell() {
  [[ $# -ge 1 ]] || die "Uso: navvia.sh shell <service>"
  $DC exec "$1" sh
}

cmd_update() {
  log "═══ Update Navvia [$MODE] — $(date '+%F %T') ═══"
  cmd_pull
  cmd_build
  log "Recriando containers que mudaram…"
  $DC up -d --remove-orphans
  ok "Deploy completo — $(current_commit)"
  printf '\n'
  cmd_status
}

cmd_help() {
  sed -n '4,36p' "$0"
}

# ── Dispatch ────────────────────────────────────────────────────────────────
cmd="${1:-help}"
shift || true

# `help` não precisa de preflight (pode ser chamado antes de criar o .env).
if [[ "$cmd" != "help" && "$cmd" != "-h" && "$cmd" != "--help" ]]; then
  preflight
fi

case "$cmd" in
  update|deploy)  cmd_update "$@" ;;
  pull)           cmd_pull "$@" ;;
  build)          cmd_build "$@" ;;
  up)             cmd_up "$@" ;;
  down)           cmd_down "$@" ;;
  restart)        cmd_restart "$@" ;;
  logs)           cmd_logs "$@" ;;
  status|ps)      cmd_status "$@" ;;
  shell|exec)     cmd_shell "$@" ;;
  help|-h|--help) cmd_help ;;
  *)              err "Comando desconhecido: $cmd"; cmd_help; exit 1 ;;
esac
