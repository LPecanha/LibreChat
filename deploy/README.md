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

---

## Beta em paralelo (`beta.navvia.com.br`)

Rodar uma segunda instância do app na mesma máquina, compartilhando Mongo + uploads + Meili + RAG do stack principal. Útil pra testar uma nova UI (branch `dev`) sem isolar dados.

### Compatibilidade

| Recurso | Compartilhado entre `app.*` e `beta.*` |
|---|---|
| MongoDB (conversas, agentes, usuários, créditos) | ✅ Sim — schema é idêntico, sem migrations divergentes |
| JWT (SSO entre os dois domínios) | ✅ Sim — basta usar o **mesmo `JWT_SECRET` + `JWT_REFRESH_SECRET`** |
| Uploads de arquivos | ✅ Sim — bind-mount do mesmo path do host |
| Meilisearch index | ✅ Sim — beta conecta no `meilisearch` do stack principal |
| Vector store / RAG | ✅ Sim — beta conecta no `vectordb` / `rag_api` do stack principal |
| Credit scheduler (cron) | ❌ **Roda só no app** — beta tem `CREDIT_SCHEDULER_CRON=` vazio |

### Pré-requisitos

- Stack principal já rodando em `/opt/navvia` (rede `navvia_internal` existe).
- Segundo clone do repo em `/opt/navvia-beta`, no branch `dev`.

### Bootstrap da beta

```bash
git clone <repo> /opt/navvia-beta
cd /opt/navvia-beta
git checkout dev

cp deploy/.env.beta.example deploy/.env
$EDITOR deploy/.env
#   - JWT_SECRET / JWT_REFRESH_SECRET / MONGO_URI / MEILI_MASTER_KEY:
#     COPIE os MESMOS valores do .env do stack principal (SSO + DB compartilhada)
#   - APP_UPLOADS_DIR / APP_IMAGES_DIR: paths absolutos no host onde o
#     stack principal armazena uploads (default /opt/navvia/deploy/data/{uploads,images})
#   - BETA_PORT: 3093 por default (reverse proxy aponta beta.navvia.com.br → 3093)

./deploy/navvia.sh update --beta
```

### Upgrade da beta

```bash
cd /opt/navvia-beta
./deploy/navvia.sh update --beta
```

### Comandos beta

Acrescente `--beta` a qualquer comando do `navvia.sh`:

```bash
./deploy/navvia.sh up --beta
./deploy/navvia.sh logs api --beta
./deploy/navvia.sh restart api --beta
./deploy/navvia.sh down --beta
./deploy/navvia.sh status --beta
```

### O que a beta NÃO sobe

- ❌ `admin-ext` — o do stack principal já cuida (evita scheduler dobrado)
- ❌ `admin-panel` — fica acessível só em `admin.navvia.com.br` (apontando pro admin-ext do principal)
- ❌ `meilisearch` / `vectordb` / `rag_api` — beta usa os do principal via rede `navvia_internal`

### Reverse proxy

```
app.navvia.com.br      → http://localhost:3090   (LibreChat principal)
beta.navvia.com.br     → http://localhost:3093   (LibreChat beta)
admin.navvia.com.br    → http://localhost:3091   (admin-panel)
admin-api.navvia.com.br → http://localhost:3092  (admin-ext)
```

JWT é o mesmo entre `app.*` e `beta.*` — usuário logado num lado é reconhecido no outro automaticamente.
