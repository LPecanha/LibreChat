#!/bin/sh
# Applies whitelabel customizations for a given client during Docker build.
# Usage: sh whitelabel/apply.sh <client-id>
# Must be run from the repository root (where client/ is a subdirectory).

set -e

CLIENT="${1:-${WHITELABEL_CLIENT}}"

if [ -z "$CLIENT" ]; then
  echo "Error: client id required (e.g. sh whitelabel/apply.sh navvia)" >&2
  exit 1
fi

CLIENT_DIR="whitelabel/clients/${CLIENT}"

if [ ! -d "$CLIENT_DIR" ]; then
  echo "Error: client directory not found: ${CLIENT_DIR}" >&2
  exit 1
fi

# Load brand config
# shellcheck source=/dev/null
. "${CLIENT_DIR}/brand.env"

if [ -z "$BRAND_NAME" ] || [ -z "$BRAND_COLOR" ]; then
  echo "Error: BRAND_NAME and BRAND_COLOR must be set in ${CLIENT_DIR}/brand.env" >&2
  exit 1
fi

BRAND_DESCRIPTION="${BRAND_DESCRIPTION:-${BRAND_NAME} - A Plataforma Multi IA}"

echo "==> Applying whitelabel: client=${CLIENT}, brand=${BRAND_NAME}, color=${BRAND_COLOR}"

# ── Step 1: Copy assets ──────────────────────────────────────────────────────
ASSETS_SRC="${CLIENT_DIR}/assets"
ASSETS_DST="client/public/assets"

if [ -d "$ASSETS_SRC" ]; then
  echo "==> Copying assets to ${ASSETS_DST}"
  cp -r "${ASSETS_SRC}/." "${ASSETS_DST}/"
fi

# ── Step 2: Apply color palette and update meta files ────────────────────────
# Updates: style.css (CSS vars), tailwind.config.cjs (green palette),
#          index.html (title/theme-color/description), Startup.tsx (document.title),
#          vite.config.ts (PWA manifest name/theme_color)
echo "==> Generating color palette and updating meta files"
python3 whitelabel_color_generator.py "$BRAND_COLOR" "$BRAND_NAME" "$BRAND_DESCRIPTION"

# ── Step 3: Replace brand name in translation files ──────────────────────────
echo "==> Replacing brand name in translation files"
find client/src/locales -name "translation.json" -type f | while IFS= read -r file; do
  sed -i "s/LibreChat/${BRAND_NAME}/g" "$file"
done

# ── Step 4: Replace brand name in TSX/TS source files ───────────────────────
# Covers hardcoded strings in: Marketplace.tsx (page title), Footer.tsx (default footer),
# AuthLayout.tsx (logo alt text), and any other user-visible string literals.
# Comment-only references have no UI impact but are harmless to replace.
echo "==> Replacing brand name in source files"
find client/src -name "*.tsx" -o -name "*.ts" | while IFS= read -r file; do
  sed -i "s/LibreChat/${BRAND_NAME}/g" "$file"
done

# ── Step 5: Replace hardcoded brand color in source files ───────────────────
# files.ts has fill: '#10A37F' (LibreChat default green) hardcoded in an SVG icon.
# Replace all occurrences of the default LibreChat green with the brand color.
# Use both cases since hex literals appear in mixed case across the codebase.
LIBRECHAT_GREEN_LOWER="10a37f"
LIBRECHAT_GREEN_UPPER="10A37F"
BRAND_COLOR_UPPER=$(echo "$BRAND_COLOR" | tr '[:lower:]' '[:upper:]' | tr -d '#')
BRAND_COLOR_LOWER=$(echo "$BRAND_COLOR" | tr '[:upper:]' '[:lower:]' | tr -d '#')

echo "==> Replacing hardcoded LibreChat green (#10A37F) with brand color (${BRAND_COLOR})"
find client/src -name "*.tsx" -o -name "*.ts" -o -name "*.css" | while IFS= read -r file; do
  sed -i "s/#${LIBRECHAT_GREEN_UPPER}/#${BRAND_COLOR_UPPER}/g; s/#${LIBRECHAT_GREEN_LOWER}/#${BRAND_COLOR_LOWER}/g" "$file"
done

echo "==> Whitelabel applied successfully."
