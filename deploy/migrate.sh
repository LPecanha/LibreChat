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
#   NAVVIA_MONGO_USER=user NAVVIA_MONGO_PASS=pass \
#   FIBBO_MONGO_USER=user  FIBBO_MONGO_PASS=pass  \
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

# Credenciais por banco — cada banco tem seu próprio usuário
# Passe via variável de ambiente antes de rodar:
#   NAVVIA_MONGO_USER=... NAVVIA_MONGO_PASS=... FIBBO_MONGO_USER=... FIBBO_MONGO_PASS=... bash deploy/migrate.sh
NAVVIA_MONGO_USER="${NAVVIA_MONGO_USER:-}"
NAVVIA_MONGO_PASS="${NAVVIA_MONGO_PASS:-}"
FIBBO_MONGO_USER="${FIBBO_MONGO_USER:-}"
FIBBO_MONGO_PASS="${FIBBO_MONGO_PASS:-}"

_dump_db() {
    local db="$1" user="$2" pass="$3"
    local auth_args=""
    if [ -n "$user" ] && [ -n "$pass" ]; then
        auth_args="--username $user --password $pass --authenticationDatabase $db"
    fi
    # shellcheck disable=SC2086
    docker exec "$MONGO_CONTAINER" mongodump \
        $auth_args \
        --db "$db" \
        --out /tmp/mongo-backup \
        --quiet
}

# ── Backup MongoDB ────────────────────────────────────────────────────────────
step "Backup dos bancos de dados → $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

echo "    Fazendo dump do banco 'IXLab' (Navvia)..."
_dump_db "IXLab" "$NAVVIA_MONGO_USER" "$NAVVIA_MONGO_PASS"
docker cp "$MONGO_CONTAINER:/tmp/mongo-backup/IXLab" "$BACKUP_DIR/IXLab"
ok "Backup concluído: $BACKUP_DIR/IXLab"

echo "    Fazendo dump do banco 'LibreChat' (Fibbo)..."
_dump_db "LibreChat" "$FIBBO_MONGO_USER" "$FIBBO_MONGO_PASS"
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
    if [ -n "$NAVVIA_MONGO_USER" ] && [ -n "$NAVVIA_MONGO_PASS" ]; then
        sed -i "s|MONGO_URI=.*|MONGO_URI=mongodb://${NAVVIA_MONGO_USER}:${NAVVIA_MONGO_PASS}@mongodb_mongodb:27017/IXLab?authSource=IXLab|" "$DST_NAVVIA/.env"
    else
        sed -i 's|MONGO_URI=mongodb://\([^@]*@\)\{0,1\}[^/]*/[^ ]*|MONGO_URI=mongodb://mongodb_mongodb:27017/IXLab|' "$DST_NAVVIA/.env"
        warn "MONGO_URI Navvia sem credenciais — preencha manualmente em $DST_NAVVIA/.env"
    fi
    ok "Copiado .env Navvia — MONGO_URI atualizado"
elif [ ! -f "$DST_NAVVIA/.env" ]; then
    cp "$REPO_DIR/deploy/navvia/.env.example" "$DST_NAVVIA/.env"
    warn ".env Navvia criado a partir do template — preencha os secrets antes de subir"
fi

if [ -f "$SRC_FIBBO/.env" ] && [ ! -f "$DST_FIBBO/.env" ]; then
    cp "$SRC_FIBBO/.env" "$DST_FIBBO/.env"
    if [ -n "$FIBBO_MONGO_USER" ] && [ -n "$FIBBO_MONGO_PASS" ]; then
        sed -i "s|MONGO_URI=.*|MONGO_URI=mongodb://${FIBBO_MONGO_USER}:${FIBBO_MONGO_PASS}@mongodb_mongodb:27017/LibreChat?authSource=LibreChat|" "$DST_FIBBO/.env"
    else
        sed -i 's|MONGO_URI=mongodb://\([^@]*@\)\{0,1\}[^/]*/[^ ]*|MONGO_URI=mongodb://mongodb_mongodb:27017/LibreChat|' "$DST_FIBBO/.env"
        warn "MONGO_URI Fibbo sem credenciais — preencha manualmente em $DST_FIBBO/.env"
    fi
    ok "Copiado .env Fibbo — MONGO_URI atualizado"
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
