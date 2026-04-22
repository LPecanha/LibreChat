import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { getTenants } from './config/tenants';
import logger from './lib/logger';

function extractUserId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(atob(authHeader.slice(7).split('.')[1])) as { id?: string };
    return payload.id ?? null;
  } catch {
    return null;
  }
}

export function createApp() {
  const app = express();

  const configuredOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3091').split(',').map((s) => s.trim());
  const tenantOrigins = getTenants().map((t) => t.origin);
  const allowedOrigins = Array.from(new Set([...configuredOrigins, ...tenantOrigins]));

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  app.use(rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/ext/admin', rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => extractUserId(req.headers.authorization) ?? req.ip ?? 'unknown',
  }));

  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path, ip: req.ip });
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.use('/ext', routes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
