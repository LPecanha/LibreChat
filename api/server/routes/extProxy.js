// [EXT] Proxies /ext/* to the admin-ext service server-side, avoiding CORS.
const http = require('http');
const { logger } = require('@librechat/data-schemas');

const target = new URL(process.env.EXT_INTERNAL_URL || 'http://librechat-admin-ext:3092');
const TIMEOUT_MS = Number(process.env.EXT_PROXY_TIMEOUT_MS || 15000);

/**
 * Streams the request through untouched.
 *
 * This router is mounted BEFORE express.json(), so `req` is still an unread
 * stream and can simply be piped. The previous version re-serialized `req.body`,
 * which silently dropped any body express.json() had not parsed (multipart
 * uploads arrived empty upstream) and could not stream large payloads.
 */
module.exports = function extProxy(req, res) {
  const headers = { ...req.headers, host: target.host };

  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: req.originalUrl,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
      proxyRes.on('error', () => res.destroy());
    },
  );

  /**
   * Without an explicit timeout a hung admin-ext holds the socket forever:
   * 'error' only fires on connection failure, never when the upstream accepts
   * the connection and then goes quiet.
   */
  proxyReq.setTimeout(TIMEOUT_MS, () => {
    logger.warn(`[extProxy] upstream timeout after ${TIMEOUT_MS}ms: ${req.method} ${req.originalUrl}`);
    proxyReq.destroy(new Error('ETIMEDOUT'));
  });

  proxyReq.on('error', (err) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const timedOut = err.message === 'ETIMEDOUT' || err.code === 'ETIMEDOUT';
    res
      .status(timedOut ? 504 : 502)
      .json({ error: timedOut ? 'Admin service timed out' : 'Admin service unavailable' });
  });

  // Client hung up — stop work upstream instead of leaking the socket.
  res.on('close', () => proxyReq.destroy());

  req.pipe(proxyReq, { end: true });
};
