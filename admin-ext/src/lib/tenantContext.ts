import { AsyncLocalStorage } from 'node:async_hooks';
import mongoose from 'mongoose';
import type { TenantConfig } from '../config/tenants';
import logger from './logger';

const storage = new AsyncLocalStorage<TenantConfig>();

// One persistent connection per tenant, keyed by tenant id
const connectionCache = new Map<string, mongoose.Connection>();

function getTenantConnection(tenant: TenantConfig): mongoose.Connection {
  const cached = connectionCache.get(tenant.id);
  if (cached) return cached;

  const conn = mongoose.createConnection(tenant.mongoUri);

  conn.on('connected', () => logger.info(`[tenant:${tenant.id}] MongoDB connected`));
  conn.on('error', (err) => logger.error(`[tenant:${tenant.id}] MongoDB error`, { err }));
  conn.on('disconnected', () => logger.warn(`[tenant:${tenant.id}] MongoDB disconnected`));

  connectionCache.set(tenant.id, conn);
  return conn;
}

export const tenantContext = {
  run<T>(tenant: TenantConfig, fn: () => T): T {
    return storage.run(tenant, fn);
  },

  get(): TenantConfig | null {
    return storage.getStore() ?? null;
  },

  getDb(): mongoose.Connection {
    const t = storage.getStore();
    if (!t) return mongoose.connection;
    return getTenantConnection(t);
  },
};

export async function connectAllTenants(tenants: TenantConfig[]): Promise<void> {
  await Promise.all(
    tenants.map((t) =>
      getTenantConnection(t).asPromise().catch((err) => {
        logger.error(`[tenant:${t.id}] Initial connection failed`, { err });
      }),
    ),
  );
}
