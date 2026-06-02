# Deploy — Navvia

Single-tenant deploy do stack Navvia. Um compose, um `.env`, um script.

## Layout

```
deploy/
  docker-compose.yml   stack inteiro (api + admin-ext + admin-panel + meili + vectordb + rag)
  .env.example         template — copie pra .env e preencha
  .env                 (gitignored) secrets + config
  librechat.yaml       config runtime LibreChat (Navvia tuning)
  navvia.sh            entrypoint único pra todo o ciclo de vida
  data/                volumes runtime (uploads, logs, meili) — criado on-demand
```

## Bootstrap (servidor novo)

```bash
git clone <repo> /opt/navvia
cd /opt/navvia
cp deploy/.env.example deploy/.env
$EDITOR deploy/.env                  # preencha secrets, URLs, providers

# garante que a rede externa do Mongo existe
docker network create 4leads_network 2>/dev/null || true

./deploy/navvia.sh update            # pull + build + up -d
```

## Upgrade (servidor que já roda)

```bash
cd /opt/navvia
./deploy/navvia.sh update
```

Faz `git pull --ff-only`, rebuilda as imagens que mudaram, sobe os containers afetados.

## Comandos

| Comando | O que faz |
|---|---|
| `./deploy/navvia.sh update` | Fluxo completo: pull → build → up -d |
| `./deploy/navvia.sh pull` | Só `git pull --ff-only` |
| `./deploy/navvia.sh build [svc...]` | Rebuild imagens (default: todos) |
| `./deploy/navvia.sh up` | `docker compose up -d` sem rebuild |
| `./deploy/navvia.sh down` | Para o stack (preserva volumes) |
| `./deploy/navvia.sh restart [svc]` | Restart sem rebuild |
| `./deploy/navvia.sh logs [svc]` | `logs -f --tail=200` |
| `./deploy/navvia.sh status` | `compose ps` |
| `./deploy/navvia.sh shell <svc>` | `exec sh` num container |

## Pré-requisitos do servidor

- Docker + Docker Compose v2
- MongoDB rodando em outra stack, ligado à rede `4leads_network` (externa ao compose)
- Acesso ao GitHub via SSH (pra `git pull`)
- Domínios apontados (LIBRECHAT_URL, ADMIN_PANEL_URL) com reverse proxy resolvendo as portas:
  - `3090` → LibreChat
  - `3091` → Admin Panel
  - `3092` → Admin Backend

## Whitelabel

Aplicado em **build time** via `Dockerfile.overlay` com `--build-arg WHITELABEL_CLIENT=navvia`. O script já passa isso automaticamente. Brand config em `whitelabel/clients/navvia/brand.env`. Não há etapa manual.
