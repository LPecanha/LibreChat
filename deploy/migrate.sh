#!/bin/bash
# Migration script — backs up databases and moves stacks to the new structure.
#
# Current layout:
#   /root/Navvia/IXLab/   → Navvia (container: LibreChat-IXLab, port 3090, db: IXLab)
#   /root/Navvia/4Leads/  → Fibbo  (container: LibreChat,       port 3080, db: LibreChat)
#
# Target layout:
#   /root/navvia/          → new Navvia stack directory
#   /root/fibbo/           → new Fibbo stack directory
#
# Usage (run from the repo root on the server):
#   bash deploy/migrate.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_NAVVIA="/root/Navvia/IXLab"
SRC_FIBBO="/root/Navvia/4Leads"
DST_NAVVIA="/root/navvia"
DST_FIBBO="/root/fibbo"
BACKUP_DIR="/root/backups/pre-migration-$(date +%Y%m%d_%H%M%S)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}==> $*${NC}"; }
ok()    { echo -e "${GREEN}    ✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}    ⚠ $*${NC}"; }
abort() { echo -e "${RED}    ✗ $*${NC}"; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
step "Pre-flight checks"

[ -d "$SRC_NAVVIA" ] || abort "Source not found: $SRC_NAVVIA"
[ -d "$SRC_FIBBO"  ] || abort "Source not found: $SRC_FIBBO"
[ -f "$REPO_DIR/deploy/navvia/docker-compose.yml" ] || abort "Repo not found at $REPO_DIR"
ok "Diretórios de origem encontrados"

for name in "LibreChat-IXLab" "LibreChat"; do
    if docker ps --format '{{.Names}}' | grep -q "^${name}$" 2>/dev/null; then
        abort "Container '$name' ainda está rodando. Derrube as stacks antes:\n    cd $SRC_NAVVIA && docker compose down\n    cd $SRC_FIBBO  && docker compose down"
    fi
done
ok "Nenhum container conflitante em execução"

if ! docker network inspect 4leads_network &>/dev/null; then
    abort "Rede '4leads_network' não encontrada — o Nginx Proxy Manager precisa estar rodando"
fi
ok "Rede '4leads_network' existe"

MONGO_CONTAINER=$(docker ps -q -f name=mongodb_mongodb 2>/dev/null | head -1)
[ -n "$MONGO_CONTAINER" ] || abort "Container do MongoDB (mongodb_mongodb) não encontrado ou não está rodando"
ok "MongoDB encontrado: $MONGO_CONTAINER"

# Credenciais do MongoDB autenticado (preencha antes de rodar)
MONGO_USER="${MONGO_USER:-}"
MONGO_PASS="${MONGO_PASS:-}"

_mongo_auth_args() {
    if [ -n "$MONGO_USER" ] && [ -n "$MONGO_PASS" ]; then
        echo "--username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin"
    fi
}

# ── Backup MongoDB ────────────────────────────────────────────────────────────
step "Backup dos bancos de dados → $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

echo "    Fazendo dump do banco 'IXLab' (Navvia)..."
# shellcheck disable=SC2046
docker exec "$MONGO_CONTAINER" mongodump \
    $(_mongo_auth_args) \
    --db IXLab \
    --out /tmp/mongo-backup \
    --quiet
docker cp "$MONGO_CONTAINER:/tmp/mongo-backup/IXLab" "$BACKUP_DIR/IXLab"
ok "Backup concluído: $BACKUP_DIR/IXLab"

echo "    Fazendo dump do banco 'LibreChat' (Fibbo)..."
# shellcheck disable=SC2046
docker exec "$MONGO_CONTAINER" mongodump \
    $(_mongo_auth_args) \
    --db LibreChat \
    --out /tmp/mongo-backup \
    --quiet
docker cp "$MONGO_CONTAINER:/tmp/mongo-backup/LibreChat" "$BACKUP_DIR/LibreChat"
ok "Backup concluído: $BACKUP_DIR/LibreChat"

# Limpa temp dentro do container
docker exec "$MONGO_CONTAINER" rm -rf /tmp/mongo-backup

BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
ok "Backup total: $BACKUP_SIZE em $BACKUP_DIR"

# ── Create target directories ─────────────────────────────────────────────────
step "Criando diretórios de destino"

mkdir -p "$DST_NAVVIA" "$DST_FIBBO"
ok "Criados: $DST_NAVVIA e $DST_FIBBO"

# ── Move volumes (sem data-node — MongoDB é centralizado) ─────────────────────
step "Movendo volumes Navvia ($SRC_NAVVIA → $DST_NAVVIA)"

for dir in uploads images logs meili_data_v1.35.1; do
    src="$SRC_NAVVIA/$dir"
    dst="$DST_NAVVIA/$dir"
    if [ -d "$src" ]; then
        if [ -d "$dst" ]; then
            warn "$dir já existe em destino — pulando"
        else
            mv "$src" "$dst"
            ok "Movido: $dir"
        fi
    else
        warn "$dir não encontrado em $SRC_NAVVIA — pulando"
    fi
done

step "Movendo volumes Fibbo ($SRC_FIBBO → $DST_FIBBO)"

for dir in uploads images logs meili_data_v1.35.1; do
    src="$SRC_FIBBO/$dir"
    dst="$DST_FIBBO/$dir"
    if [ -d "$src" ]; then
        if [ -d "$dst" ]; then
            warn "$dir já existe em destino — pulando"
        else
            mv "$src" "$dst"
            ok "Movido: $dir"
        fi
    else
        warn "$dir não encontrado em $SRC_FIBBO — pulando"
    fi
done

# ── Copy compose files and librechat.yaml ─────────────────────────────────────
step "Copiando docker-compose.yml e librechat.yaml"

cp "$REPO_DIR/deploy/navvia/docker-compose.yml" "$DST_NAVVIA/docker-compose.yml"
cp "$REPO_DIR/deploy/navvia/librechat.yaml"     "$DST_NAVVIA/librechat.yaml"
ok "Navvia: docker-compose.yml + librechat.yaml"

cp "$REPO_DIR/deploy/fibbo/docker-compose.yml"  "$DST_FIBBO/docker-compose.yml"
cp "$REPO_DIR/deploy/fibbo/librechat.yaml"      "$DST_FIBBO/librechat.yaml"
ok "Fibbo: docker-compose.yml + librechat.yaml"

# ── .env files ────────────────────────────────────────────────────────────────
step "Preparando arquivos .env"

if [ -f "$SRC_NAVVIA/.env" ] && [ ! -f "$DST_NAVVIA/.env" ]; then
    cp "$SRC_NAVVIA/.env" "$DST_NAVVIA/.env"
    # Atualiza apenas o host/db; preserva user:pass se já estiver na URI original
    sed -i 's|MONGO_URI=mongodb://\([^@]*@\)\{0,1\}[^/]*/[^ ]*|MONGO_URI=mongodb://\1mongodb_mongodb:27017/IXLab?authSource=admin|' "$DST_NAVVIA/.env"
    ok "Copiado .env Navvia — MONGO_URI atualizado para mongodb_mongodb"
elif [ ! -f "$DST_NAVVIA/.env" ]; then
    cp "$REPO_DIR/deploy/navvia/.env.example" "$DST_NAVVIA/.env"
    warn ".env Navvia criado a partir do template — preencha os secrets antes de subir"
fi

if [ -f "$SRC_FIBBO/.env" ] && [ ! -f "$DST_FIBBO/.env" ]; then
    cp "$SRC_FIBBO/.env" "$DST_FIBBO/.env"
    # Atualiza apenas o host/db; preserva user:pass se já estiver na URI original
    sed -i 's|MONGO_URI=mongodb://\([^@]*@\)\{0,1\}[^/]*/[^ ]*|MONGO_URI=mongodb://\1mongodb_mongodb:27017/LibreChat?authSource=admin|' "$DST_FIBBO/.env"
    ok "Copiado .env Fibbo — MONGO_URI atualizado para mongodb_mongodb"
elif [ ! -f "$DST_FIBBO/.env" ]; then
    cp "$REPO_DIR/deploy/fibbo/.env.example" "$DST_FIBBO/.env"
    warn ".env Fibbo criado a partir do template — preencha os secrets antes de subir"
fi

# ── Build images ──────────────────────────────────────────────────────────────
step "Buildando imagens whitelabel (~5 min cada)"

cd "$REPO_DIR"
docker build -f Dockerfile.overlay --build-arg WHITELABEL_CLIENT=navvia -t librechat-navvia:latest .
ok "Imagem pronta: librechat-navvia:latest"

docker build -f Dockerfile.overlay --build-arg WHITELABEL_CLIENT=fibbo -t librechat-fibbo:latest .
ok "Imagem pronta: librechat-fibbo:latest"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migração concluída!                                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Backups salvos em: $BACKUP_DIR"
echo ""
echo "Próximos passos:"
echo ""
echo "  1. Revise os .env gerados (JWT secrets, API keys, etc.):"
echo "       $DST_NAVVIA/.env"
echo "       $DST_FIBBO/.env"
echo ""
echo "  2. Suba as stacks:"
echo "       cd $DST_NAVVIA && docker compose up -d"
echo "       cd $DST_FIBBO  && docker compose up -d"
echo ""
echo "  3. Suba o admin (preencha o .env antes):"
echo "       cd $REPO_DIR/deploy/admin"
echo "       cp .env.example .env && vi .env"
echo "       docker compose --env-file .env up -d"
echo ""
echo "  4. No Nginx Proxy Manager, aponte:"
echo "       Navvia → librechat-navvia:3090  (rede: 4leads_network)"
echo "       Fibbo  → librechat-fibbo:3080   (rede: 4leads_network)"
echo ""
