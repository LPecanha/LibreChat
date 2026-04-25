// [EXT] Proxies /ext/* to the admin-ext service server-side, avoiding CORS.
const http = require('http');

const target = new URL(process.env.EXT_INTERNAL_URL || 'http://librechat-admin-ext:3092');

module.exports = function extProxy(req, res) {
  const options = {
    hostname: target.hostname,
    port: target.port || 80,
    path: req.originalUrl,
    method: req.method,
    headers: { ...req.headers, host: target.host },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', () => res.status(502).json({ error: 'Admin service unavailable' }));
  req.pipe(proxy, { end: true });
};
