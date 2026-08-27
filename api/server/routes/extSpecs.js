// [EXT] Internal, secret-guarded endpoint that hands admin-ext the model spec
// catalogue it needs to manage per-user model access.
//
// This exists so `modelSpecs` no longer has to ride along in the *unauthenticated*
// `/api/config` payload. That older approach leaked the full spec list — and, before
// it was sanitized, the presets' `instructions` / `system` prompts — to every
// anonymous visitor, and it contradicted upstream's own tests asserting that
// `/api/config` carries no `modelSpecs` before login.
//
// Only `name` and `label` are returned: that is all admin-ext reads.
const crypto = require('crypto');
const express = require('express');
const { logger, getTenantId } = require('@librechat/data-schemas');
const { getAppConfig } = require('~/server/services/Config/app');

const router = express.Router();

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/** Fails closed: no configured secret means the endpoint is unavailable, not open. */
function requireSharedSecret(req, res, next) {
  const expected = process.env.EXT_SHARED_SECRET ?? '';
  if (!expected) {
    logger.warn('[extSpecs] EXT_SHARED_SECRET is not set — refusing request');
    return res.status(503).json({ error: 'Not configured' });
  }
  const provided = req.get('x-ext-secret') ?? '';
  if (!timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

router.get('/', requireSharedSecret, async (req, res) => {
  try {
    const tenantId = getTenantId();
    const appConfig = await getAppConfig(tenantId ? { tenantId } : { baseOnly: true });
    const list = (appConfig?.modelSpecs?.list ?? []).map((spec) => ({
      name: spec.name,
      label: spec.label ?? spec.name,
    }));
    res.json({ modelSpecs: { list } });
  } catch (err) {
    logger.error('[extSpecs] failed to resolve model specs', err);
    res.status(500).json({ error: 'Failed to resolve model specs' });
  }
});

module.exports = router;
