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
| `ext_payment_txns` | Payment transactions (Stripe/Pagar.me) |
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
POST /ext/payment/stripe/checkout
POST /ext/payment/stripe/webhook              # Stripe webhook (raw body required)
GET  /ext/payment/stripe/history

POST /ext/payment/pagarme/pix                 # body: { planId, entityType, entityId, customer }
GET  /ext/payment/pagarme/order/:orderId/status
POST /ext/payment/pagarme/webhook             # Pagar.me webhook (HMAC-SHA1 verified)
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Same secret as LibreChat |
| `EXT_PORT` | No | Port (default 3092) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `STRIPE_SECRET_KEY` | For Stripe | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For Stripe | Webhook signing secret |
| `PAGARME_API_KEY` | For Pagar.me | Pagar.me API key |
| `PAGARME_WEBHOOK_SECRET` | For Pagar.me | HMAC-SHA1 webhook secret |
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

Deployed via `docker-compose.override.yml`. The service connects to the `mongodb` service in the default Docker network.
