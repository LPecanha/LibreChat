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

/**
 * [SEC] Falha FECHADA em modo multi-tenant.
 *
 * Antes, uma origem nao reconhecida seguia com `next()` SEM contexto de tenant.
 * A partir dai `getSecret()` caia para process.env.JWT_SECRET e `getDb()` para a
 * conexao mongoose padrao — validando token e lendo dados no banco errado, em
 * silencio. Com varios tenants isso e vazamento entre clientes.
 */
export function tenantFromOrigin(req: Request, res: Response, next: NextFunction): void {
  if (!isMultiTenant()) { next(); return; }

  const origin = req.headers.origin as string | undefined;
  const tenant = origin ? getTenantByOrigin(origin) : null;

  if (!tenant) {
    res.status(400).json({
      error: origin
        ? `Unknown origin: ${origin}`
        : 'Origin header is required in multi-tenant mode',
    });
    return;
  }

  tenantContext.run(tenant, next);
}
