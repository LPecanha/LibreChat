import cron from 'node-cron';
import mongoose, { type Model } from 'mongoose';
import { getSubscriptionModel, getOrgBalanceModel } from '../db/models';
import { getTenants } from '../config/tenants';
import { tenantContext } from '../lib/tenantContext';
import type { ISubscription } from '../db/models';
import logger from '../lib/logger';

interface BalanceDoc {
  user: mongoose.Types.ObjectId;
  tokenCredits: number;
}

function getBalanceModel(): Model<BalanceDoc> {
  const db = tenantContext.getDb();
  if (db.models['Balance']) return db.models['Balance'] as Model<BalanceDoc>;
  const schema = new mongoose.Schema<BalanceDoc>(
    { user: mongoose.Schema.Types.ObjectId, tokenCredits: Number },
    { collection: 'balances', strict: false },
  );
  return db.model<BalanceDoc>('Balance', schema);
}

/**
 * Reivindica o ciclo ANTES de creditar.
 *
 * A ordem anterior era: creditar -> avancar nextRefillAt, em duas escritas
 * separadas. Uma queda entre elas fazia a proxima execucao creditar de novo, e
 * sem lock entre instancias uma segunda replica creditaria em paralelo. Avancar
 * a data primeiro, condicionado ao valor que lemos, faz o MongoDB eleger um
 * unico vencedor por ciclo.
 */
async function processSubscription(sub: ISubscription): Promise<void> {
  const { entityType, entityId, creditsPerCycle, cycleIntervalDays } = sub;

  const nextRefillAt = new Date();
  nextRefillAt.setDate(nextRefillAt.getDate() + cycleIntervalDays);

  const claimed = await getSubscriptionModel().findOneAndUpdate(
    { _id: sub._id, status: 'active', nextRefillAt: sub.nextRefillAt },
    {
      $set: {
        nextRefillAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextRefillAt,
      },
    },
    { new: false },
  );

  // Outra instancia (ou outra rodada) ja levou este ciclo.
  if (!claimed) {
    logger.debug('Subscription cycle already claimed elsewhere', { id: sub._id.toString() });
    return;
  }

  try {
    if (entityType === 'group') {
      await getOrgBalanceModel().findOneAndUpdate(
        { groupId: entityId },
        { $inc: { poolCredits: creditsPerCycle, totalPurchased: creditsPerCycle } },
        { upsert: true },
      );
    } else {
      await getBalanceModel().findOneAndUpdate(
        { user: entityId },
        { $inc: { tokenCredits: creditsPerCycle } },
        { upsert: true },
      );
    }
  } catch (err) {
    // Credito falhou apos a reivindicacao — devolve o ciclo para a proxima rodada.
    await getSubscriptionModel().updateOne(
      { _id: sub._id },
      { $set: { nextRefillAt: sub.nextRefillAt } },
    );
    throw err;
  }

  logger.info('Subscription refilled', {
    entityType,
    entityId: entityId.toString(),
    credits: creditsPerCycle,
    nextRefillAt: nextRefillAt.toISOString(),
  });
}

async function runDistributionForTenant(): Promise<void> {
  const now = new Date();

  // ASAAS-managed subscriptions are refilled via webhook — skip them here
  const dueSubs = await getSubscriptionModel().find({
    status: 'active',
    paymentProvider: { $ne: 'asaas' },
    nextRefillAt: { $lte: now },
  }).lean();

  if (dueSubs.length === 0) return;

  logger.info(`Processing ${dueSubs.length} due subscriptions`);

  const results = await Promise.allSettled(dueSubs.map(processSubscription));

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.error(`${failed.length} subscriptions failed to process`);
    failed.forEach((r) => {
      if (r.status === 'rejected') logger.error('Subscription processing error', { reason: r.reason });
    });
  }
}

async function runDistribution(): Promise<void> {
  const tenants = getTenants();

  if (tenants.length === 0) {
    await runDistributionForTenant();
    return;
  }

  await Promise.allSettled(
    tenants.map((tenant) =>
      tenantContext.run(tenant, () =>
        runDistributionForTenant().catch((err) => {
          logger.error(`Scheduler error for tenant ${tenant.id}`, { err });
        }),
      ),
    ),
  );
}

export function startCreditScheduler(): void {
  const schedule = process.env.CREDIT_SCHEDULER_CRON ?? '0 * * * *';

  cron.schedule(schedule, () => {
    runDistribution().catch((err) => {
      logger.error('Scheduler unexpected error', { err });
    });
  });

  logger.info(`Credit distribution scheduler started`, { schedule });

  runDistribution().catch((err) => {
    logger.error('Scheduler initial run error', { err });
  });
}
