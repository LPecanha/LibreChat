import type { Request, Response, NextFunction } from 'express';
import { getTenantById, getTenantByOrigin, isMultiTenant } from '../config/tenants';
import { tenantContext } from '../lib/tenantContext';

export function tenantFromHeader(req: Request, res: Response, next: NextFunction): void {
  if (!isMultiTenant()) { next(); return; }

  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  if (!tenantId) {
    res.status(400).json({ error: 'X-Tenant-ID header is required' });
    return;
  }

  const tenant = getTenantById(tenantId);
  if (!tenant) {
    res.status(400).json({ error: `Unknown tenant: ${tenantId}` });
    return;
  }

  tenantContext.run(tenant, next);
}

export function tenantFromOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (!isMultiTenant()) { next(); return; }

  const origin = req.headers.origin as string | undefined;
  if (origin) {
    const tenant = getTenantByOrigin(origin);
    if (tenant) {
      tenantContext.run(tenant, next);
      return;
    }
  }
  next();
}
