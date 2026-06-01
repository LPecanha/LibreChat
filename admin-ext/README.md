# admin-ext

Separate Express server (TypeScript, port 3092) that adds billing and admin API features to LibreChat without modifying its schema. Connects to the same MongoDB instance using `ext_*` collections for all new data.

## Architecture

- Zero schema modification — new data lives in `ext_*` collections
- Reads existing LibreChat collections (`users`, `groups`, `balances`, `transactions`, `agents`, `aclentries`) with `strict: false`
- JWT authentication: verifies LibreChat JWTs then checks `role === 'ADMIN'` in MongoDB
- Structured logging via Winston (JSON format)
- Rate limiting: 120 req/min per IP (global) + 300 req/min per user on `/ext/admin`

## Collections

| Collection | Purpose |
|---|---|
| `ext_org_profiles` | Organization metadata |
| `ext_org_balances` | Organization credit pools |
| `ext_subscriptions` | Subscription plans per entity |
| `ext_payment_txns` | Payment transactions (ASAAS) |
| `ext_credit_allocations` | Per-user/per-period credit distributions |
| `ext_credit_audits` | Audit trail for all manual credit adjustments |
| `ext_user_profiles` | Extended user metadata |

## API Routes

```
GET  /health

POST /ext/auth/login          # Admin JWT login (proxies to LibreChat)
GET  /ext/auth/me

GET  /ext/admin/usage/summary
GET  /ext/admin/usage/chart
GET  /ext/admin/usage/users
GET  /ext/admin/usage/user/:userId

GET  /ext/admin/credits/user/:userId
POST /ext/admin/credits/user/:userId/adjust    # body: { amount, reason }
GET  /ext/admin/credits/org/:groupId
POST /ext/admin/credits/org/:groupId/adjust
POST /ext/admin/credits/org/:groupId/distribute
GET  /ext/admin/credits/audit                  # query: entityId, entityType

GET  /ext/admin/organizations
GET  /ext/admin/organizations/:groupId
POST /ext/admin/organizations/:groupId/members

GET  /ext/admin/subscriptions
POST /ext/admin/subscriptions
PATCH /ext/admin/subscriptions/:id
DELETE /ext/admin/subscriptions/:id

GET  /ext/admin/agents
POST /ext/admin/agents/:agentId/acl
DELETE /ext/admin/agents/:agentId/acl/:aclId

GET  /ext/payment/plans
GET  /ext/payment/asaas/plans
POST /ext/payment/asaas/checkout/pix          # one-time PIX — returns QR code
POST /ext/payment/asaas/checkout/card         # one-time credit card — credits synchronously
POST /ext/payment/asaas/subscription          # recurring PIX or card (ASAAS manages cycle)
GET  /ext/payment/asaas/payment/:paymentId/status
POST /ext/payment/asaas/webhook               # ASAAS webhook (asaas-access-token verified, tenant resolved from payload)
GET  /ext/payment/asaas/history               # admin
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Same secret as LibreChat |
| `EXT_PORT` | No | Port (default 3092) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `ASAAS_API_KEY` | For payments | ASAAS API key (single account, shared by all tenants) |
| `ASAAS_SANDBOX` | No | `true` → sandbox API; anything else → production (default production) |
| `ASAAS_WEBHOOK_TOKEN` | For webhook | Token checked (timing-safe) against the `asaas-access-token` header |
| `CREDIT_SCHEDULER_CRON` | No | Cron for auto-refill (default `0 * * * *`) |
| `LOG_LEVEL` | No | Winston log level (default `info`) |

## Development

```bash
npm install
npm run dev      # ts-node with watch
npm run build    # compile to dist/
npm start        # run compiled dist/
```

## Docker

Deployed via `deploy/admin/docker-compose.yml` (service `librechat-admin-ext`, joined to the external `4leads_network`). See `deploy/admin/.env.example` for the required variables.
