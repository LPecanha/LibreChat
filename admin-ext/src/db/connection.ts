import mongoose from 'mongoose';
import { getTenants } from '../config/tenants';
import { connectAllTenants } from '../lib/tenantContext';
import logger from '../lib/logger';

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;

  const tenants = getTenants();

  if (tenants.length > 0) {
    await connectAllTenants(tenants);
    logger.info(`Connected to ${tenants.length} tenant database(s)`);
  } else {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI required (no TENANTS_CONFIG defined)');
    await mongoose.connect(uri);
    logger.info('MongoDB connected (single-tenant)');
  }

  connected = true;
}
