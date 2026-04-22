import Stripe from 'stripe';
import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { getPaymentTxnModel, getOrgBalanceModel, getSubscriptionModel, getCreditPlanModel } from '../../db/models';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import { requireAdminJwt, requireUserJwt } from '../../middleware/auth';
import { CREDIT_PLANS, getPlanById } from './plans';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

interface BalanceDoc {
  user: mongoose.Types.ObjectId;
  tokenCredits: number;
}

interface StripeWebhookEvent {
  type: string;
  data: { object: { id: string; metadata?: Record<string, string>; payment_intent?: string | { id: string } | null } };
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
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

router.post('/checkout', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = getStripe();
    const { planId, entityType = 'user', entityId, successUrl, cancelUrl } = req.body as {
      planId: string;
      entityType?: 'user' | 'group';
      entityId?: string;
      successUrl: string;
      cancelUrl: string;
    };

    const plan = getPlanById(planId);
    if (!plan) {
      res.status(400).json({ error: `Unknown plan: ${planId}` });
      return;
    }

    const resolvedEntityId = entityId ?? req.user?.id;
    if (!resolvedEntityId) {
      res.status(400).json({ error: 'entityId required' });
      return;
    }

    const idempotencyKey = `stripe-checkout-${resolvedEntityId}-${planId}-${Date.now()}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: plan.pricesBRL,
            product_data: {
              name: `LibreChat ${plan.name}`,
              description: `${plan.credits.toLocaleString('pt-BR')} créditos`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        planId,
        planType: plan.type,
        entityType,
        entityId: resolvedEntityId,
        credits: String(plan.credits),
        idempotencyKey,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await getPaymentTxnModel().create({
      entityType,
      entityId: new mongoose.Types.ObjectId(resolvedEntityId),
      amount: plan.pricesBRL,
      currency: 'BRL',
      provider: 'stripe',
      status: 'pending',
      idempotencyKey,
      creditsGranted: 0,
      externalTxnId: session.id,
      metadata: { planId, sessionId: session.id },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error('[stripe/checkout]', { err });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set');
    res.status(500).end();
    return;
  }

  let event: StripeWebhookEvent;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret) as StripeWebhookEvent;
  } catch (err) {
    logger.error('[stripe/webhook] Signature verification failed', { err });
    res.status(400).end();
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    res.json({ received: true });
    return;
  }

  const session = event.data.object;
  const meta = (session.metadata ?? {}) as Record<string, string>;
  const { planId, planType, entityType, entityId, credits, idempotencyKey } = meta;

  if (!planId || !entityId || !credits || !idempotencyKey) {
    logger.error('[stripe/webhook] Missing metadata on session', { sessionId: session.id });
    res.status(400).end();
    return;
  }

  try {
    const PaymentTxn = getPaymentTxnModel();
    const existing = await PaymentTxn.findOne({ idempotencyKey });
    if (existing?.status === 'completed') {
      res.json({ received: true });
      return;
    }

    const creditAmount = parseInt(credits, 10);
    const entityObjectId = new mongoose.Types.ObjectId(entityId);

    if (entityType === 'group') {
      await getOrgBalanceModel().findOneAndUpdate(
        { groupId: entityObjectId },
        { $inc: { poolCredits: creditAmount, totalPurchased: creditAmount } },
        { upsert: true },
      );
    } else {
      const Balance = getBalanceModel();
      await Balance.findOneAndUpdate(
        { user: entityObjectId },
        { $inc: { tokenCredits: creditAmount } },
        { upsert: true },
      );
    }

    await PaymentTxn.findOneAndUpdate(
      { idempotencyKey },
      {
        $set: {
          status: 'completed',
          creditsGranted: creditAmount,
          externalTxnId: typeof session.payment_intent === 'string' ? session.payment_intent
            : typeof session.payment_intent === 'object' && session.payment_intent !== null
              ? (session.payment_intent as { id: string }).id
              : undefined,
        },
      },
    );

    if (planType === 'subscription' && entityType === 'user') {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);
      await getSubscriptionModel().findOneAndUpdate(
        { entityType: 'user', entityId: entityObjectId, status: 'active' },
        {
          $setOnInsert: {
            entityType: 'user', entityId: entityObjectId, plan: planId,
            creditsPerCycle: creditAmount, cycleIntervalDays: 30,
            paymentProvider: 'stripe', status: 'active',
            currentPeriodStart: now, currentPeriodEnd: periodEnd, nextRefillAt: periodEnd,
          },
        },
        { upsert: true },
      );
    }

    logger.info('[stripe/webhook] Credits granted', { creditAmount, planType, entityType, entityId });
    res.json({ received: true });
  } catch (err) {
    logger.error('[stripe/webhook] Credit processing error', { err });
    res.status(500).end();
  }
});

router.get('/history', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityId, limit = '20', offset = '0' } = req.query as {
      entityId?: string;
      limit?: string;
      offset?: string;
    };

    const filter: { provider: string; entityId?: mongoose.Types.ObjectId } = { provider: 'stripe' };
    if (entityId) filter.entityId = new mongoose.Types.ObjectId(entityId);

    const PaymentTxn = getPaymentTxnModel();
    const [txns, total] = await Promise.all([
      PaymentTxn.find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      PaymentTxn.countDocuments(filter),
    ]);

    res.json({ transactions: txns, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (err) {
    logger.error('[stripe/history]', { err });
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router;
