import 'dotenv/config';
import { connectDb } from './db/connection';
import { createApp } from './app';
import { startCreditScheduler } from './scheduler/creditDistribution';
import logger from './lib/logger';

const PORT = parseInt(process.env.EXT_PORT ?? '3092', 10);

async function start() {
  await connectDb();
  startCreditScheduler();

  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
