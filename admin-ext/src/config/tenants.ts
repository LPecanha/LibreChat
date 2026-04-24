export interface TenantConfig {
  id: string;
  name: string;
  mongoUri: string;
  db: string;
  jwtSecret: string;
  origin: string;
  librechatUrl: string;
  /** Internal Docker service URL for server-to-server calls (e.g. http://librechat-fibbo:3080). Falls back to librechatUrl if omitted. */
  internalLibrechatUrl?: string;
  /** LibreChat's JWT_SECRET — used to sign system tokens for server-to-server API calls. */
  librechatJwtSecret?: string;
}

let _tenants: TenantConfig[] | null = null;

export function getTenants(): TenantConfig[] {
  if (_tenants) return _tenants;

  const raw = process.env.TENANTS_CONFIG;
  if (!raw) {
    _tenants = [];
    return _tenants;
  }

  try {
    const parsed = JSON.parse(raw) as TenantConfig[];
    if (!Array.isArray(parsed)) throw new Error('TENANTS_CONFIG must be a JSON array');
    for (const t of parsed) {
      if (!t.id || !t.name || !t.mongoUri || !t.db || !t.jwtSecret || !t.origin || !t.librechatUrl) {
        throw new Error(`Tenant "${t.id}" missing required fields (id, name, mongoUri, db, jwtSecret, origin, librechatUrl)`);
      }
    }
    _tenants = parsed;
  } catch (err) {
    throw new Error(`Invalid TENANTS_CONFIG: ${(err as Error).message}`);
  }

  return _tenants;
}

export function getTenantById(id: string): TenantConfig | null {
  return getTenants().find((t) => t.id === id) ?? null;
}

export function getTenantByOrigin(origin: string): TenantConfig | null {
  return getTenants().find((t) => t.origin === origin) ?? null;
}

export function isMultiTenant(): boolean {
  return getTenants().length > 0;
}
