// [EXT] Proxies /ext/* to the admin-ext service server-side, avoiding CORS.
const http = require('http');

const target = new URL(process.env.EXT_INTERNAL_URL || 'http://librechat-admin-ext:3092');

module.exports = function extProxy(req, res) {
  // express.json() already consumed the stream — serialize the parsed body back to JSON.
  const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null;

  const headers = { ...req.headers, host: target.host };
  if (body) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = Buffer.byteLength(body);
  } else {
    delete headers['content-length'];
  }

  const options = {
    hostname: target.hostname,
    port: target.port || 80,
    path: req.originalUrl,
    method: req.method,
    headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', () => res.status(502).json({ error: 'Admin service unavailable' }));

  if (body) proxy.write(body);
  proxy.end();
};
