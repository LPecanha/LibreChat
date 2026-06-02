/**
 * [EXT] Phase J.19 Navvia: tenant helpers single-tenant.
 *
 * Antes esse modulo parseava `VITE_TENANTS` (JSON array), guardava o tenant
 * ativo em localStorage e oferecia `isMultiTenant()` pra UI condicional.
 * Agora roda Navvia-only: a TenantInfo vem direto das env vars do build
 * (`VITE_LIBRECHAT_URL`, `VITE_BRAND_NAME`).
 *
 * Mantemos a interface `TenantInfo` + `getActiveTenant()` por compat —
 * callers em `api.ts` e `models.ts` precisam de `librechatUrl`.
 */

export interface TenantInfo {
  id: string;
  name: string;
  librechatUrl: string;
}

const NAVVIA_TENANT: TenantInfo = {
  id: 'navvia',
  name: (import.meta.env.VITE_BRAND_NAME as string | undefined) ?? 'Navvia',
  librechatUrl: (import.meta.env.VITE_LIBRECHAT_URL as string | undefined) ?? '',
};

export function getActiveTenant(): TenantInfo {
  return NAVVIA_TENANT;
}
