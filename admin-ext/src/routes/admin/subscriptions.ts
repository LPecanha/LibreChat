import { Router } from 'express';
import mongoose from 'mongoose';
import { getSubscriptionModel } from '../../db/models';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';
import type { SubscriptionStatus, PaymentProvider, EntityType } from '../../db/models';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { entityType, entityId, status, limit = '50', offset = '0' } = req.query as {
      entityType?: EntityType;
      entityId?: string;
      status?: SubscriptionStatus;
      limit?: string;
      offset?: string;
    };

    const filter: {
      entityType?: EntityType;
      entityId?: mongoose.Types.ObjectId;
      status?: SubscriptionStatus;
    } = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = new mongoose.Types.ObjectId(entityId);
    if (status) filter.status = status;

    const [subs, total] = await Promise.all([
      getSubscriptionModel().find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      getSubscriptionModel().countDocuments(filter),
    ]);

    res.json({ subscriptions: subs, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (err) {
    logger.error('[subscriptions/list]', { err });
    res.status(500).json({ error: 'Failed to list subscriptions' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      entityType,
      entityId,
      plan,
      creditsPerCycle,
      cycleIntervalDays = 30,
      paymentProvider = 'manual',
      externalSubId,
    } = req.body as {
      entityType: EntityType;
      entityId: string;
      plan: string;
      creditsPerCycle: number;
      cycleIntervalDays?: number;
      paymentProvider?: PaymentProvider;
      externalSubId?: string;
    };

    if (!entityType || !entityId || !plan || !creditsPerCycle) {
      res.status(400).json({ error: 'entityType, entityId, plan, creditsPerCycle required' });
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + cycleIntervalDays);

    const sub = await getSubscriptionModel().create({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
      plan,
      creditsPerCycle,
      cycleIntervalDays,
      paymentProvider,
      externalSubId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextRefillAt: periodEnd,
    });

    res.status(201).json(sub);
  } catch (err) {
    logger.error('[subscriptions/create]', { err });
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const { status, creditsPerCycle, cycleIntervalDays } = req.body as {
      status?: SubscriptionStatus;
      creditsPerCycle?: number;
      cycleIntervalDays?: number;
    };

    const update: {
      status?: SubscriptionStatus;
      cancelledAt?: Date;
      creditsPerCycle?: number;
      cycleIntervalDays?: number;
    } = {};
    if (status) {
      update.status = status;
      if (status === 'cancelled') update.cancelledAt = new Date();
    }
    if (creditsPerCycle) update.creditsPerCycle = creditsPerCycle;
    if (cycleIntervalDays) update.cycleIntervalDays = cycleIntervalDays;

    const sub = await getSubscriptionModel().findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!sub) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json(sub);
  } catch (err) {
    logger.error('[subscriptions/update]', { err });
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const sub = await getSubscriptionModel().findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { new: true },
    );

    if (!sub) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json({ message: 'Subscription cancelled', subscription: sub });
  } catch (err) {
    logger.error('[subscriptions/cancel]', { err });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
