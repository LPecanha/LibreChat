const TENANT_KEY = 'lc_admin_tenant';

export interface TenantInfo {
  id: string;
  name: string;
  librechatUrl: string;
}

export function getAvailableTenants(): TenantInfo[] {
  try {
    const raw = (import.meta.env.VITE_TENANTS as string | undefined) ?? '[]';
    return JSON.parse(raw) as TenantInfo[];
  } catch {
    return [];
  }
}

export function getActiveTenant(): TenantInfo | null {
  const raw = localStorage.getItem(TENANT_KEY);
  if (!raw) {
    const tenants = getAvailableTenants();
    if (tenants.length === 1) return tenants[0] ?? null;
    return null;
  }
  try {
    return JSON.parse(raw) as TenantInfo;
  } catch {
    return null;
  }
}

export function setActiveTenant(tenant: TenantInfo): void {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
}

export function clearTenant(): void {
  localStorage.removeItem(TENANT_KEY);
}

export function isMultiTenant(): boolean {
  return getAvailableTenants().length > 1;
}
