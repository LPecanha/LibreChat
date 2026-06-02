import { Router } from 'express';
import { getConfig } from '../../config';
import logger from '../../lib/logger';

/**
 * [EXT] Phase J.19 Navvia: proxy de login para o LibreChat (Navvia único).
 * Antes lia `x-tenant-id` header e selecionava entre múltiplos tenants —
 * agora aponta direto pra `LIBRECHAT_INTERNAL_URL` (ou `LIBRECHAT_URL`).
 */
const router = Router();

router.post('/', async (req, res) => {
  const { internalLibrechatUrl } = getConfig();

  try {
    const upstream = await fetch(`${internalLibrechatUrl}/api/admin/login/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json().catch(() => ({})) as Record<string, string>;

    if (!upstream.ok) {
      // Normalize 404 to 401 — upstream may return 404 when user not found or
      // requireAdminAccess fires before password validation.
      const status = upstream.status === 404 ? 401 : upstream.status;
      const error = status === 401
        ? 'E-mail ou senha incorretos.'
        : (data.message ?? data.error ?? `HTTP ${upstream.status}`);
      res.status(status).json({ error });
      return;
    }

    res.status(upstream.status).json(data);
  } catch (err) {
    logger.error('[admin/login] proxy error', { err });
    res.status(502).json({ error: 'Failed to reach LibreChat instance' });
  }
});

export default router;
