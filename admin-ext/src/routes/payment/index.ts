import { Router } from 'express';
import asaasRouter from './asaas';
import { CREDIT_PLANS } from './plans';
import { getCreditPlanModel } from '../../db/models';

const router = Router();

router.use('/asaas', asaasRouter);

// Legacy /plans endpoint — kept for any external consumers
router.get('/plans', async (_req, res) => {
  try {
    const dbPlans = await getCreditPlanModel().find({ active: true }).sort({ type: 1, credits: 1 }).lean();
    if (dbPlans.length > 0) {
      res.json(dbPlans.map((p) => ({
        id: p.planId, name: p.name, type: p.type ?? 'one_time',
        credits: p.credits, pricesBRL: p.pricesBRL, pricesUSD: p.pricesUSD,
        popular: p.popular, discountPct: p.discountPct ?? 0,
      })));
    } else {
      res.json(CREDIT_PLANS);
    }
  } catch {
    res.json(CREDIT_PLANS);
  }
});

export default router;
