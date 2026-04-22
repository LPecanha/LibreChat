import crypto from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import https from 'https';
import mongoose, { type Model } from 'mongoose';
import { getPaymentTxnModel, getOrgBalanceModel } from '../../db/models';
import { tenantContext } from '../../lib/tenantContext';
import { requireUserJwt } from '../../middleware/auth';
import { getPlanById } from './plans';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

function verifyPagarmeSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  if (!secret) {
    next();
    return;
  }

  const signature = req.headers['x-hub-signature'] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: 'Raw body not available' });
    return;
  }

  const expected = `sha1=${crypto.createHmac('sha1', secret).update(rawBody).digest('hex')}`;
  const safe = Buffer.from(expected);
  const provided = Buffer.from(signature);

  if (safe.length !== provided.length || !crypto.timingSafeEqual(safe, provided)) {
    logger.warn('Pagar.me webhook signature mismatch');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  next();
}

interface BalanceDoc {
  user: mongoose.Types.ObjectId;
  tokenCredits: number;
}

const PAGARME_API_URL = 'https://api.pagar.me/core/v5';

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

async function pagarmeRequest<T>(
  method: string,
  path: string,
  body?: { [k: string]: JsonValue },
): Promise<T> {
  const apiKey = process.env.PAGARME_API_KEY;
  if (!apiKey) throw new Error('PAGARME_API_KEY not configured');

  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const bodyStr = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const url = new URL(`${PAGARME_API_URL}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as T;
          resolve(parsed);
        } catch {
          reject(new Error(`Failed to parse Pagar.me response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
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

router.post('/checkout/pix', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, entityType = 'user', entityId, customerName, customerEmail, customerDocument } =
      req.body as {
        planId: string;
        entityType?: 'user' | 'group';
        entityId?: string;
        customerName: string;
        customerEmail: string;
        customerDocument: string;
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

    const idempotencyKey = `pagarme-pix-${resolvedEntityId}-${planId}-${Date.now()}`;

    type PagarmeOrderResponse = {
      id: string;
      charges?: Array<{ last_transaction?: { qr_code?: string; qr_code_url?: string; expires_at?: string } }>;
    };

    const order = await pagarmeRequest<PagarmeOrderResponse>('POST', '/orders', {
      items: [
        {
          amount: plan.pricesBRL,
          description: `LibreChat ${plan.name} — ${plan.credits.toLocaleString('pt-BR')} créditos`,
          quantity: 1,
          code: plan.id,
        },
      ],
      customer: {
        name: customerName,
        email: customerEmail,
        document: customerDocument,
        type: 'individual',
      },
      payments: [
        {
          payment_method: 'pix',
          pix: { expires_in: 3600 },
          amount: plan.pricesBRL,
        },
      ],
      metadata: {
        planId,
        entityType,
        entityId: resolvedEntityId,
        credits: String(plan.credits),
        idempotencyKey,
      },
    });

    await getPaymentTxnModel().create({
      entityType,
      entityId: new mongoose.Types.ObjectId(resolvedEntityId),
      amount: plan.pricesBRL,
      currency: 'BRL',
      provider: 'pagarme',
      status: 'pending',
      idempotencyKey,
      creditsGranted: 0,
      externalTxnId: order.id,
      metadata: { planId, method: 'pix' },
    });

    const pix = order.charges?.[0]?.last_transaction;
    res.json({
      orderId: order.id,
      qrCode: pix?.qr_code,
      qrCodeUrl: pix?.qr_code_url,
      expiresAt: pix?.expires_at,
    });
  } catch (err) {
    logger.error('[pagarme/pix]', { err });
    res.status(500).json({ error: 'Failed to create PIX charge' });
  }
});

router.post('/webhook', verifyPagarmeSignature, async (req, res) => {
  try {
    type WebhookPayload = {
      type?: string;
      data?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
        charges?: Array<{ amount?: number }>;
      };
    };

    const payload = req.body as WebhookPayload;

    if (payload.type !== 'order.paid' && payload.data?.status !== 'paid') {
      res.json({ received: true });
      return;
    }

    const meta = payload.data?.metadata;
    if (!meta) {
      res.json({ received: true });
      return;
    }

    const { planId, entityType, entityId, credits, idempotencyKey } = meta;

    if (!idempotencyKey || !entityId || !credits) {
      logger.error('[pagarme/webhook] Missing metadata', { meta });
      res.json({ received: true });
      return;
    }

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
      { $set: { status: 'completed', creditsGranted: creditAmount } },
    );

    logger.info('[pagarme/webhook] Credits granted', { creditAmount, entityType, entityId, planId });
    res.json({ received: true });
  } catch (err) {
    logger.error('[pagarme/webhook] Error', { err });
    res.status(500).end();
  }
});

router.get('/order/:orderId/status', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params as { orderId: string };
    const txn = await getPaymentTxnModel().findOne({ externalTxnId: orderId }).select('status creditsGranted').lean();
    if (!txn) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ status: txn.status, creditsGranted: txn.creditsGranted });
  } catch {
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

export default router;
