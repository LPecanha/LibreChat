import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { getTenants, getTenantByOrigin, isMultiTenant } from './config/tenants';
import logger from './lib/logger';

/**
 * [SEC] Chave de rate limit derivada de um JWT **verificado**.
 *
 * A versao anterior fazia `atob` no payload sem checar a assinatura, entao
 * qualquer um forjava o campo `id`: dava para evadir o limite (um id novo por
 * requisicao) ou envenenar o balde de um admin real. Aqui a assinatura e
 * validada com o segredo do tenant; se nao validar, cai no IP.
 */
function rateLimitKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    const origin = req.headers.origin as string | undefined;
    const tenant = origin ? getTenantByOrigin(origin) : null;
    const secrets = tenant?.jwtSecret
      ? [tenant.jwtSecret]
      : [...getTenants().map((t) => t.jwtSecret), process.env.JWT_SECRET].filter(
          (v): v is string => !!v,
        );
    for (const secret of secrets) {
      try {
        const payload = jwt.verify(token, secret) as { id?: string };
        if (payload.id) return `u:${payload.id}`;
      } catch {
        /* tenta o proximo segredo */
      }
    }
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

export function createApp() {
  const app = express();

  /**
   * [SEC] Sem isto `req.ip` e o IP do peer TCP. Como todo o trafego /ext que
   * passa pelo extProxy do LibreChat chega do mesmo container, TODOS os
   * usuarios dividiam um unico balde de rate limit e se derrubavam entre si.
   */
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  const configuredOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3091')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const tenantOrigins = getTenants().map((t) => t.origin);
  const allowedOrigins = Array.from(new Set([...configuredOrigins, ...tenantOrigins]));

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        // Recusa sem lancar: um throw aqui virava 500 em vez de resposta sem CORS.
        cb(null, false);
      },
      credentials: true,
    }),
  );

  /**
   * Limite global generoso — funciona como rede de seguranca, nao como o limite
   * efetivo. Precisa ficar ACIMA do limite por rota, senao o mais restritivo
   * vence e o limite da rota vira letra morta (era o caso: 120 global anulava
   * os 300 do /ext/admin).
   */
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 600),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: rateLimitKey,
      validate: { keyGeneratorIpFallback: false },
    }),
  );

  app.use(
    '/ext/admin',
    rateLimit({
      windowMs: 60_000,
      max: Number(process.env.RATE_LIMIT_ADMIN_MAX ?? 300),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: rateLimitKey,
      validate: { keyGeneratorIpFallback: false },
    }),
  );

  /** Login nao autenticado: limite estreito e por IP, contra forca bruta. */
  app.use(
    '/ext/admin/login',
    rateLimit({
      windowMs: 15 * 60_000,
      max: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 10),
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    }),
  );

  // [F-13] Log de acesso em debug — info registrava metodo/caminho/IP de TODA
  // requisicao, com implicacao de retencao sob LGPD e pouco valor operacional.
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path });
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.use('/ext', routes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  /**
   * [SEC] Handler de erro proprio. Sem ele o handler padrao do Express inclui
   * stack trace na resposta sempre que NODE_ENV nao e 'production'.
   */
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('[unhandled]', { err, path: req.path, method: req.method });
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error' });
  });

  if (isMultiTenant()) {
    logger.info(`Multi-tenant ativo: ${getTenants().map((t) => t.id).join(', ')}`);
  }

  return app;
}
