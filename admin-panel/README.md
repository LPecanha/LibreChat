# admin-panel

React admin SPA (Vite, TypeScript, port 3091) for managing LibreChat billing, users, organizations, and agent permissions. Talks to `admin-ext` (port 3092) and the LibreChat API (port 3080).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI (same primitives as LibreChat client)
- React Query v4 for all data fetching and mutations
- React Router v6

## Pages

| Route | Page | Description |
|---|---|---|
| `/login` | Login | Admin password login via LibreChat |
| `/` | Dashboard | Usage summary + chart |
| `/users` | Users | User list with search/pagination; click for detail |
| `/users/:id` | UserDetail | Balance, spend, model usage breakdown |
| `/organizations` | Organizations | Org list; detail with member credits distribution |
| `/billing` | Billing | Subscriptions + payment history (Stripe/Pagar.me) |
| `/credits` | Credits | Manual credit adjustment for users/orgs |
| `/agents` | Agents | Agent list with ACL entries; grant/revoke access |
| `/settings` | Settings | Credit plans info, webhook URLs, env reference |

## Auth Flow

1. Login POSTs to `/api/admin/auth/login/local` on LibreChat
2. Token stored in `localStorage` as `lc_admin_token`
3. All `admin-ext` requests include `Authorization: Bearer <token>`
4. Client-side JWT expiry check before each request; 401 responses redirect to `/login`

## Development

Requires `admin-ext` running on port 3092 and LibreChat on port 3080.

```bash
npm install
npm run dev    # Vite dev server on port 3091
npm run build  # Build to dist/
```

### Proxy

`vite.config.ts` proxies:
- `/api` → `http://localhost:3080` (LibreChat)
- `/ext` → `http://localhost:3092` (admin-ext)

## Environment

No `.env` needed for development — the Vite proxy handles routing. In production (Docker), the nginx config routes `/api` and `/ext` to the correct services.

## Toast System

`src/hooks/useToast.ts` exports a module-level `toast(options)` function that can be called from anywhere. Mount `<Toaster />` once in the layout.

```ts
import { toast } from '../hooks/useToast';
toast({ title: 'Saved', variant: 'success' });
toast({ title: 'Error', description: err.message, variant: 'destructive' });
```
