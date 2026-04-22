# LibreChat Overlay

This repository adds a billing/admin overlay on top of the upstream LibreChat codebase.
The overlay is intentionally kept as small as possible to survive upstream rebases with minimal conflicts.

---

## Architecture

```
upstream/main  ──●──●──●──●──  (LibreChat original — never commit here)
                          ↑ rebase
overlay/main   ──────────●──   (our 5 touch points + admin-ext/ + admin-panel/)
```

**New directories (no upstream conflicts):**
- `admin-ext/` — Express billing service (Docker, port 3092)
- `admin-panel/` — React admin SPA (Docker, port 3091)
- `api/server/routes/extConfig.js` — runtime config injection endpoint
- `Dockerfile.overlay` — local build without ghcr.io/astral-sh/uv (no auth needed); WORKDIR stays `/app` so dotenv resolves `/app/.env` from the bind mount

**Core files touched (rebase surface):**

| File | What changed | Marker |
|---|---|---|
| `api/server/index.js` | 1 line: mount `/api/ext-config.js` route | `// [EXT]` |
| `client/index.html` | 1 line: load ext-config script | `<!-- [EXT] -->` |
| `client/src/routes/Root.tsx` | 2 lines: import + mount `<PaymentToast />` | `// [EXT]` |
| `client/src/components/Nav/AccountSettings.tsx` | 1 import + 1 JSX: `<ExtBalanceDisplay />` | `// [EXT]` |
| `client/src/components/Nav/SettingsTabs/Balance/Balance.tsx` | replace body: `<ExtBalancePanel />` | `// [EXT]` |
| `client/src/locales/en/translation.json` | add-only: `com_nav_buy_credits*` keys | (no marker needed — add-only) |

All core touches are marked `// [EXT]` or `<!-- [EXT] -->` so they are instantly visible in diffs.

---

## Keeping in sync with upstream

```bash
# 1. Add upstream remote (first time only)
git remote add upstream https://github.com/danny-avila/LibreChat.git

# 2. Fetch latest upstream changes
git fetch upstream

# 3. Rebase our overlay branch on top of upstream main
git rebase upstream/main

# 4. If conflicts occur, they will only be in the 5 files above.
#    Search for [EXT] to locate our additions and re-apply them.
git status          # see conflicted files
git diff            # inspect conflicts
# resolve, then:
git add <file>
git rebase --continue
```

### Conflict resolution cheatsheet

Each `[EXT]` marker corresponds to an exact pattern. If a conflict occurs, re-apply:

**`api/server/index.js`** — after the `/api/config` route line, add:
```js
app.use('/api/ext-config.js', require('./routes/extConfig')); // [EXT] runtime config injection
```

**`client/index.html`** — before `<script defer type="module" src="/src/main.jsx">`, add:
```html
<script src="/api/ext-config.js"></script> <!-- [EXT] runtime config injection -->
```

**`client/src/routes/Root.tsx`** — add import at top:
```tsx
import { PaymentToast } from '~/components/Nav/BuyCredits'; // [EXT]
```
And before `</SetConvoProvider>`:
```tsx
<PaymentToast /> {/* [EXT] */}
```

**`client/src/components/Nav/AccountSettings.tsx`** — add import:
```tsx
import { ExtBalanceDisplay } from './BuyCredits'; // [EXT]
```
And replace the balance display block with:
```tsx
{/* [EXT] balance display with buy-credits button */}
<ExtBalanceDisplay tokenCredits={balanceQuery.data.tokenCredits} />
```

**`client/src/locales/en/translation.json`** — add the `com_nav_buy_credits*` keys (see git log for the exact keys).

---

## Credit system

**Internal unit:** `tokenCredits` — 1 credit = $0.000001 USD (1 micro-dollar).

```
1,000,000 tokenCredits = $1.00 USD
```

This matches the upstream pricing table in `packages/data-schemas/src/methods/tx.ts`
where rates are expressed as USD per 1M tokens — no conversion factor needed.

**Display:** always use `formatUsd(tokenCredits)` from `admin-panel/src/lib/utils.ts`
or `formatUsdBalance(tokenCredits)` from `client/src/components/Nav/BuyCredits/ExtBalanceDisplay.tsx`.
Never display raw `tokenCredits` to end users.

---

## Whitelabel

Client-specific assets and brand config live under `whitelabel/clients/<client-id>/`:

```
whitelabel/
  apply.sh                         # runs inside Docker build; called by Dockerfile.overlay
  clients/
    navvia/
      brand.env                    # BRAND_NAME, BRAND_COLOR, BRAND_DESCRIPTION
      assets/                      # replaces client/public/assets/ at build time
    fibbo/
      brand.env
      assets/
```

**Building for a specific client:**

```bash
docker build -f Dockerfile.overlay \
  --build-arg WHITELABEL_CLIENT=navvia \
  -t librechat-navvia .

docker build -f Dockerfile.overlay \
  --build-arg WHITELABEL_CLIENT=fibbo \
  -t librechat-fibbo .
```

Without `WHITELABEL_CLIENT`, the image builds as vanilla LibreChat (no brand applied).

**What `apply.sh` does (in order):**
1. Sources `brand.env` → `BRAND_NAME`, `BRAND_COLOR`, `BRAND_DESCRIPTION`
2. Copies `assets/` over `client/public/assets/` (logos, favicons, icons)
3. Runs `whitelabel_color_generator.py` → updates `style.css`, `tailwind.config.cjs`, `index.html`, `Startup.tsx`, `vite.config.ts` (including `rgba(16, 163, 127, …)` in `.btn-primary`)
4. Replaces `LibreChat` → `$BRAND_NAME` in all `client/src/locales/*/translation.json`
5. Replaces `LibreChat` → `$BRAND_NAME` and `#10A37F`/`#10a37f` → `$BRAND_COLOR` in all `client/src/**/*.tsx` and `*.ts`

**Adding a new client:**
1. Create `whitelabel/clients/<id>/brand.env` with `BRAND_NAME`, `BRAND_COLOR`, `BRAND_DESCRIPTION`
2. Create `whitelabel/clients/<id>/assets/` and copy brand assets there
3. Build with `--build-arg WHITELABEL_CLIENT=<id>`

---

## Adding new overlay features

1. **Prefer `admin-ext/` and `admin-panel/`** — zero rebase risk.
2. If a client-side hook point is needed, add **one import + one JSX line** in an existing core file, marked `// [EXT]`.
3. Never modify existing logic in core files — only add isolated extension points.
4. Add the new touch point to the table above.
