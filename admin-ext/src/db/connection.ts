import mongoose from 'mongoose';
import { getConfig } from '../config';
import logger from '../lib/logger';

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;

  const { mongoUri } = getConfig();
  await mongoose.connect(mongoUri);
  logger.info('MongoDB connected');

  connected = true;
}
