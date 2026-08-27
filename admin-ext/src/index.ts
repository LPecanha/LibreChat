import 'dotenv/config';
import { connectDb } from './db/connection';
import { createApp } from './app';
import { startCreditScheduler } from './scheduler/creditDistribution';
import logger from './lib/logger';

const PORT = parseInt(process.env.EXT_PORT ?? '3092', 10);

/**
 * [SEC] Segredos obrigatorios sao validados no boot. Um segredo ausente deve
 * derrubar o servico, nunca degradar silenciosamente uma verificacao.
 */
function assertRequiredSecrets(): void {
  if (process.env.ASAAS_API_KEY && !process.env.ASAAS_WEBHOOK_TOKEN) {
    throw new Error(
      'ASAAS_API_KEY esta definido mas ASAAS_WEBHOOK_TOKEN nao. O webhook de pagamento ' +
      'ficaria sem autenticacao — defina ASAAS_WEBHOOK_TOKEN (o mesmo valor cadastrado ' +
      'no painel ASAAS) ou remova ASAAS_API_KEY.',
    );
  }
}

async function start() {
  assertRequiredSecrets();
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
