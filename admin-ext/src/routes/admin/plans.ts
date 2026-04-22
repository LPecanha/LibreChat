import { Router } from 'express';
import { getCreditPlanModel } from '../../db/models';
import { CREDIT_PLANS } from '../payment/plans';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

async function ensureSeedPlans() {
  const hasSubscriptionPlan = await getCreditPlanModel().exists({ type: 'subscription' });
  if (hasSubscriptionPlan) return;
  // Clear stale plans (no subscription type) and re-seed with full set
  await getCreditPlanModel().deleteMany({});
  await getCreditPlanModel().insertMany(
    CREDIT_PLANS.map((p) => ({
      planId: p.id, name: p.name, type: p.type, credits: p.credits,
      pricesBRL: p.pricesBRL, pricesUSD: p.pricesUSD, popular: p.popular ?? false,
      active: true, discountPct: p.discountPct ?? 0,
    })),
  );
}

function planToDto(p: { _id: unknown; planId: string; name: string; type?: string; credits: number; pricesBRL: number; pricesUSD: number; popular: boolean; active: boolean; discountPct?: number }) {
  return { id: p._id, planId: p.planId, name: p.name, type: p.type ?? 'one_time', credits: p.credits, pricesBRL: p.pricesBRL, pricesUSD: p.pricesUSD, popular: p.popular, active: p.active, discountPct: p.discountPct ?? 0 };
}

router.get('/', async (_req: AuthenticatedRequest, res) => {
  try {
    await ensureSeedPlans();
    const plans = await getCreditPlanModel().find({}).sort({ type: 1, credits: 1 }).lean();
    res.json(plans.map(planToDto));
  } catch (err) {
    logger.error('[admin/plans] list error', { err });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, name, type = 'one_time', credits, pricesBRL, pricesUSD, popular = false, discountPct = 0 } = req.body as {
      planId?: string; name?: string; type?: 'subscription' | 'one_time'; credits?: number;
      pricesBRL?: number; pricesUSD?: number; popular?: boolean; discountPct?: number;
    };

    if (!planId?.trim() || !name?.trim() || !credits || !pricesBRL || !pricesUSD) {
      res.status(400).json({ error: 'planId, name, credits, pricesBRL and pricesUSD are required' });
      return;
    }

    const plan = await getCreditPlanModel().create({ planId: planId.trim(), name: name.trim(), type, credits, pricesBRL, pricesUSD, popular, active: true, discountPct });
    res.status(201).json(planToDto(plan.toObject()));
  } catch (err) {
    logger.error('[admin/plans] create error', { err });
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, credits, pricesBRL, pricesUSD, popular, active, discountPct } = req.body as {
      name?: string; credits?: number; pricesBRL?: number; pricesUSD?: number;
      popular?: boolean; active?: boolean; discountPct?: number;
    };

    const update: Record<string, string | number | boolean> = {};
    if (name?.trim()) update.name = name.trim();
    if (credits !== undefined) update.credits = credits;
    if (pricesBRL !== undefined) update.pricesBRL = pricesBRL;
    if (pricesUSD !== undefined) update.pricesUSD = pricesUSD;
    if (popular !== undefined) update.popular = popular;
    if (active !== undefined) update.active = active;
    if (discountPct !== undefined) update.discountPct = discountPct;

    const plan = await getCreditPlanModel().findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    res.json(planToDto(plan));
  } catch (err) {
    logger.error('[admin/plans] update error', { err });
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as { id: string };
    const deleted = await getCreditPlanModel().findByIdAndDelete(id).lean();
    if (!deleted) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error('[admin/plans] delete error', { err });
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;
