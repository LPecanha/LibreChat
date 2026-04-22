import { Router } from 'express';
import { getTenants, getTenantById } from '../../config/tenants';
import logger from '../../lib/logger';

const router = Router();

router.post('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const tenants = getTenants();

  const tenant = (tenantId ? getTenantById(tenantId) : null) ?? tenants[0] ?? null;
  if (!tenant) {
    res.status(400).json({ error: 'No tenant configured' });
    return;
  }

  try {
    const upstream = await fetch(`${tenant.librechatUrl}/api/admin/login/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json().catch(() => ({})) as Record<string, string>;

    if (!upstream.ok) {
      // Normalize 404 to 401 — the upstream may return 404 when the user is not
      // found or when requireAdminAccess fires before password validation.
      const status = upstream.status === 404 ? 401 : upstream.status;
      const error = status === 401
        ? 'E-mail ou senha incorretos.'
        : (data.message ?? data.error ?? `HTTP ${upstream.status}`);
      res.status(status).json({ error });
      return;
    }

    res.status(upstream.status).json(data);
  } catch (err) {
    logger.error('[admin/login] proxy error', { err, tenantId: tenant.id });
    res.status(502).json({ error: 'Failed to reach LibreChat instance' });
  }
});

export default router;
