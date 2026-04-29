import https from 'https';
import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import {
  getPaymentTxnModel,
  getOrgBalanceModel,
  getSubscriptionModel,
  getCreditPlanModel,
} from '../../db/models';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import { requireAdminJwt, requireUserJwt } from '../../middleware/auth';
import { CREDIT_PLANS, getPlanById } from './plans';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

const ASAAS_BASE = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://api-sandbox.asaas.com'
  : 'https://api.asaas.com';

// ---------- HTTP helper ----------

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

async function asaasRequest<T>(
  method: string,
  path: string,
  body?: { [k: string]: JsonValue },
): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error('ASAAS_API_KEY not configured');

  const bodyStr = body ? JSON.stringify(body) : undefined;
  const url = new URL(`${ASAAS_BASE}${path}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'LibreChat/1.0',
        ...(bodyStr ? { 'Content-Length': String(Buffer.byteLength(bodyStr)) } : {}),
      },
    };

    const req = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk: string) => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data) as T & { errors?: Array<{ code: string; description: string }> };
          if ((proxyRes.statusCode ?? 200) >= 400) {
            const desc = parsed.errors?.[0]?.description ?? `ASAAS error ${proxyRes.statusCode}`;
            reject(new Error(desc));
            return;
          }
          resolve(parsed);
        } catch {
          reject(new Error(`Failed to parse ASAAS response (${proxyRes.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------- Customer ----------

interface AsaasCustomer { id: string }
interface AsaasCustomerList { data: AsaasCustomer[] }

async function getOrCreateCustomer(
  userId: string,
  name: string,
  email: string,
  cpfCnpj: string,
): Promise<string> {
  const list = await asaasRequest<AsaasCustomerList>(
    'GET',
    `/v3/customers?externalReference=${encodeURIComponent(userId)}&limit=1`,
  );
  if (list.data.length > 0) return list.data[0].id;

  const customer = await asaasRequest<AsaasCustomer>('POST', '/v3/customers', {
    name,
    email,
    cpfCnpj: cpfCnpj.replace(/\D/g, ''),
    externalReference: userId,
  });
  return customer.id;
}

// ---------- Balance ----------

interface BalanceDoc { user: mongoose.Types.ObjectId; tokenCredits: number }

function getBalanceModel(): Model<BalanceDoc> {
  const db = tenantContext.getDb();
  if (db.models['Balance']) return db.models['Balance'] as Model<BalanceDoc>;
  const schema = new mongoose.Schema<BalanceDoc>(
    { user: mongoose.Schema.Types.ObjectId, tokenCredits: Number },
    { collection: 'balances', strict: false },
  );
  return db.model<BalanceDoc>('Balance', schema);
}

async function grantCredits(entityType: 'user' | 'group', entityId: string, amount: number) {
  const oid = new mongoose.Types.ObjectId(entityId);
  if (entityType === 'group') {
    await getOrgBalanceModel().findOneAndUpdate(
      { groupId: oid },
      { $inc: { poolCredits: amount, totalPurchased: amount } },
      { upsert: true },
    );
  } else {
    await getBalanceModel().findOneAndUpdate(
      { user: oid },
      { $inc: { tokenCredits: amount } },
      { upsert: true },
    );
  }
}

async function upsertSubscription(
  entityType: 'user' | 'group',
  entityId: string,
  planId: string,
  creditsPerCycle: number,
  externalSubId: string,
) {
  const oid = new mongoose.Types.ObjectId(entityId);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await getSubscriptionModel().findOneAndUpdate(
    { entityType, entityId: oid, status: 'active' },
    {
      $set: {
        plan: planId,
        creditsPerCycle,
        cycleIntervalDays: 30,
        paymentProvider: 'asaas',
        externalSubId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextRefillAt: periodEnd,
      },
      $setOnInsert: { entityType, entityId: oid, status: 'active' },
    },
    { upsert: true },
  );
}

function getRemoteIp(req: AuthenticatedRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? '0.0.0.0'
  );
}

// ---------- Plans ----------

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

// ---------- One-time PIX ----------

router.post('/checkout/pix', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, entityType = 'user', entityId: bodyEntityId, customerName, customerCpf } =
      req.body as {
        planId: string;
        entityType?: 'user' | 'group';
        entityId?: string;
        customerName: string;
        customerCpf: string;
      };

    const plan = getPlanById(planId);
    if (!plan) { res.status(400).json({ error: `Plano inválido: ${planId}` }); return; }

    const entityId = bodyEntityId ?? req.user?.id ?? '';
    if (!entityId) { res.status(400).json({ error: 'entityId required' }); return; }

    const userEmail = req.user?.email ?? '';
    const idempotencyKey = `asaas-pix-${entityId}-${planId}-${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const customerId = await getOrCreateCustomer(entityId, customerName, userEmail, customerCpf);

    interface AsaasPaymentResp { id: string }
    const payment = await asaasRequest<AsaasPaymentResp>('POST', '/v3/payments', {
      customer: customerId,
      billingType: 'PIX',
      value: plan.pricesBRL / 100,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `LibreChat ${plan.name} — ${plan.credits.toLocaleString('pt-BR')} créditos`,
      externalReference: idempotencyKey,
    });

    interface AsaasPixQr { encodedImage: string; payload: string; expirationDate: string }
    const qr = await asaasRequest<AsaasPixQr>('GET', `/v3/payments/${payment.id}/pixQrCode`);

    await getPaymentTxnModel().create({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
      amount: plan.pricesBRL,
      currency: 'BRL',
      provider: 'asaas',
      status: 'pending',
      idempotencyKey,
      creditsGranted: 0,
      externalTxnId: payment.id,
      metadata: { planId, method: 'pix', credits: String(plan.credits), entityType },
    });

    res.json({
      paymentId: payment.id,
      qrCode: qr.payload,
      qrCodeImage: qr.encodedImage,
      expiresAt: qr.expirationDate,
    });
  } catch (err) {
    logger.error('[asaas/pix]', { err });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Falha ao criar cobrança PIX' });
  }
});

// ---------- One-time card ----------

router.post('/checkout/card', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      planId, entityType = 'user', entityId: bodyEntityId,
      customerName, customerCpf, customerPhone,
      customerPostalCode, customerAddressNumber,
      cardHolderName, cardNumber, cardExpiryMonth, cardExpiryYear, cardCvv,
    } = req.body as {
      planId: string;
      entityType?: 'user' | 'group';
      entityId?: string;
      customerName: string;
      customerCpf: string;
      customerPhone: string;
      customerPostalCode: string;
      customerAddressNumber: string;
      cardHolderName: string;
      cardNumber: string;
      cardExpiryMonth: string;
      cardExpiryYear: string;
      cardCvv: string;
    };

    const plan = getPlanById(planId);
    if (!plan) { res.status(400).json({ error: `Plano inválido: ${planId}` }); return; }

    const entityId = bodyEntityId ?? req.user?.id ?? '';
    if (!entityId) { res.status(400).json({ error: 'entityId required' }); return; }

    const userEmail = req.user?.email ?? '';
    const idempotencyKey = `asaas-card-${entityId}-${planId}-${Date.now()}`;

    const customerId = await getOrCreateCustomer(entityId, customerName, userEmail, customerCpf);

    interface AsaasCardResp { id: string; status: string }
    const payment = await asaasRequest<AsaasCardResp>('POST', '/v3/payments', {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: plan.pricesBRL / 100,
      dueDate: new Date().toISOString().split('T')[0],
      description: `LibreChat ${plan.name} — ${plan.credits.toLocaleString('pt-BR')} créditos`,
      externalReference: idempotencyKey,
      remoteIp: getRemoteIp(req),
      creditCard: {
        holderName: cardHolderName,
        number: cardNumber.replace(/\s/g, ''),
        expiryMonth: cardExpiryMonth,
        expiryYear: cardExpiryYear,
        ccv: cardCvv,
      },
      creditCardHolderInfo: {
        name: customerName,
        email: userEmail,
        cpfCnpj: customerCpf.replace(/\D/g, ''),
        postalCode: customerPostalCode.replace(/\D/g, ''),
        addressNumber: customerAddressNumber,
        phone: customerPhone.replace(/\D/g, ''),
      },
    });

    const creditAmount = plan.credits;
    const entityObjectId = new mongoose.Types.ObjectId(entityId);

    await getPaymentTxnModel().create({
      entityType,
      entityId: entityObjectId,
      amount: plan.pricesBRL,
      currency: 'BRL',
      provider: 'asaas',
      status: 'completed',
      idempotencyKey,
      creditsGranted: creditAmount,
      externalTxnId: payment.id,
      metadata: { planId, method: 'card', credits: String(creditAmount), entityType },
    });

    await grantCredits(entityType, entityId, creditAmount);

    if (plan.type === 'subscription') {
      await upsertSubscription(entityType, entityId, planId, creditAmount, payment.id);
    }

    logger.info('[asaas/card] credits granted', { creditAmount, planId, entityId });
    res.json({ success: true, creditsGranted: creditAmount, paymentId: payment.id });
  } catch (err) {
    logger.error('[asaas/card]', { err });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Falha ao processar pagamento' });
  }
});

// ---------- Subscription (PIX or card — ASAAS manages recurrence) ----------

router.post('/subscription', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      planId, billingType, entityType = 'user', entityId: bodyEntityId,
      customerName, customerCpf, customerPhone,
      customerPostalCode, customerAddressNumber,
      cardHolderName, cardNumber, cardExpiryMonth, cardExpiryYear, cardCvv,
    } = req.body as {
      planId: string;
      billingType: 'PIX' | 'CREDIT_CARD';
      entityType?: 'user' | 'group';
      entityId?: string;
      customerName: string;
      customerCpf: string;
      customerPhone?: string;
      customerPostalCode?: string;
      customerAddressNumber?: string;
      cardHolderName?: string;
      cardNumber?: string;
      cardExpiryMonth?: string;
      cardExpiryYear?: string;
      cardCvv?: string;
    };

    const plan = getPlanById(planId);
    if (!plan || plan.type !== 'subscription') {
      res.status(400).json({ error: 'Plano de assinatura inválido' });
      return;
    }

    const entityId = bodyEntityId ?? req.user?.id ?? '';
    if (!entityId) { res.status(400).json({ error: 'entityId required' }); return; }

    const userEmail = req.user?.email ?? '';
    const customerId = await getOrCreateCustomer(entityId, customerName, userEmail, customerCpf);

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const subBody: { [k: string]: JsonValue } = {
      customer: customerId,
      billingType,
      value: plan.pricesBRL / 100,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: `LibreChat ${plan.name} — ${plan.credits.toLocaleString('pt-BR')} créditos/mês`,
      externalReference: `${entityType}:${entityId}:${planId}`,
    };

    if (billingType === 'CREDIT_CARD') {
      subBody['remoteIp'] = getRemoteIp(req);
      subBody['creditCard'] = {
        holderName: cardHolderName ?? '',
        number: (cardNumber ?? '').replace(/\s/g, ''),
        expiryMonth: cardExpiryMonth ?? '',
        expiryYear: cardExpiryYear ?? '',
        ccv: cardCvv ?? '',
      };
      subBody['creditCardHolderInfo'] = {
        name: customerName,
        email: userEmail,
        cpfCnpj: customerCpf.replace(/\D/g, ''),
        postalCode: (customerPostalCode ?? '').replace(/\D/g, ''),
        addressNumber: customerAddressNumber ?? '',
        phone: (customerPhone ?? '').replace(/\D/g, ''),
      };
    }

    interface AsaasSubResp { id: string }
    const sub = await asaasRequest<AsaasSubResp>('POST', '/v3/subscriptions', subBody);

    await upsertSubscription(entityType, entityId, planId, plan.credits, sub.id);

    // For PIX: retrieve first pending payment and return QR code
    if (billingType === 'PIX') {
      interface AsaasSubPayments { data: Array<{ id: string; status: string }> }
      const payments = await asaasRequest<AsaasSubPayments>('GET', `/v3/subscriptions/${sub.id}/payments`);
      const firstPayment = payments.data[0];

      if (firstPayment) {
        interface AsaasPixQr { encodedImage: string; payload: string; expirationDate: string }
        const qr = await asaasRequest<AsaasPixQr>('GET', `/v3/payments/${firstPayment.id}/pixQrCode`);

        return res.json({
          subscriptionId: sub.id,
          paymentId: firstPayment.id,
          qrCode: qr.payload,
          qrCodeImage: qr.encodedImage,
          expiresAt: qr.expirationDate,
        });
      }
    }

    logger.info('[asaas/subscription] created', { planId, entityId, billingType, subId: sub.id });
    res.json({ subscriptionId: sub.id, success: true });
  } catch (err) {
    logger.error('[asaas/subscription]', { err });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Falha ao criar assinatura' });
  }
});

// ---------- Payment status (poll by paymentId) ----------

router.get('/payment/:paymentId/status', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { paymentId } = req.params as { paymentId: string };
    const txn = await getPaymentTxnModel()
      .findOne({ externalTxnId: paymentId })
      .select('status creditsGranted')
      .lean();
    if (!txn) { res.status(404).json({ error: 'Pagamento não encontrado' }); return; }
    res.json({ status: txn.status, creditsGranted: txn.creditsGranted });
  } catch {
    res.status(500).json({ error: 'Falha ao consultar status' });
  }
});

// ---------- Webhook ----------

router.post('/webhook', async (req, res) => {
  // Security: validate asaas-access-token header
  const token = req.headers['asaas-access-token'] as string | undefined;
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected && token !== expected) {
    logger.warn('[asaas/webhook] Invalid access token');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = req.body as {
    event?: string;
    payment?: {
      id: string;
      status: string;
      billingType?: string;
      externalReference?: string;
      subscription?: string;
      value?: number;
    };
  };

  const { event, payment } = payload;

  // Grant credits on PAYMENT_RECEIVED (PIX) or PAYMENT_CONFIRMED (card)
  const isCard = payment?.billingType === 'CREDIT_CARD';
  const shouldProcess =
    (isCard && event === 'PAYMENT_CONFIRMED') ||
    (!isCard && event === 'PAYMENT_RECEIVED');

  if (!shouldProcess || !payment?.id) {
    res.json({ received: true });
    return;
  }

  // Respond immediately — process async
  res.json({ received: true });

  try {
    if (payment.subscription) {
      // Recurring subscription payment
      const sub = await getSubscriptionModel().findOne({ externalSubId: payment.subscription });
      if (!sub) {
        logger.warn('[asaas/webhook] Subscription not found', { externalSubId: payment.subscription });
        return;
      }

      // Idempotency: skip if already recorded
      const existing = await getPaymentTxnModel().findOne({ externalTxnId: payment.id }).lean();
      if (existing?.status === 'completed') return;

      const entityId = sub.entityId.toString();
      await grantCredits(sub.entityType, entityId, sub.creditsPerCycle);

      const now = new Date();
      const nextEnd = new Date(now);
      nextEnd.setDate(nextEnd.getDate() + sub.cycleIntervalDays);
      await getSubscriptionModel().updateOne(
        { _id: sub._id },
        { $set: { currentPeriodStart: now, currentPeriodEnd: nextEnd, nextRefillAt: nextEnd } },
      );

      await getPaymentTxnModel().create({
        entityType: sub.entityType,
        entityId: sub.entityId,
        amount: Math.round((payment.value ?? 0) * 100),
        currency: 'BRL',
        provider: 'asaas',
        status: 'completed',
        idempotencyKey: `asaas-webhook-${payment.id}`,
        creditsGranted: sub.creditsPerCycle,
        externalTxnId: payment.id,
        subscriptionId: sub._id,
        metadata: { method: 'webhook-sub', event: event ?? '' },
      });

      logger.info('[asaas/webhook] subscription credits granted', {
        entityId,
        credits: sub.creditsPerCycle,
        paymentId: payment.id,
      });
      return;
    }

    // One-time payment — look up txn by idempotencyKey stored in externalReference
    const idempotencyKey = payment.externalReference;
    if (!idempotencyKey) return;

    const PaymentTxn = getPaymentTxnModel();
    const txn = await PaymentTxn.findOne({ idempotencyKey }).lean();
    if (!txn || txn.status === 'completed') return;

    const meta = txn.metadata as unknown as Record<string, string> | undefined;
    const credits = parseInt(meta?.credits ?? '0', 10);
    const entityId = txn.entityId.toString();

    await grantCredits(txn.entityType, entityId, credits);
    await PaymentTxn.updateOne({ _id: txn._id }, { $set: { status: 'completed', creditsGranted: credits } });

    logger.info('[asaas/webhook] one-time credits granted', { credits, entityId, paymentId: payment.id });
  } catch (err) {
    logger.error('[asaas/webhook] processing error', { err });
  }
});

// ---------- Admin history ----------

router.get('/history', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityId, limit = '20', offset = '0' } = req.query as {
      entityId?: string;
      limit?: string;
      offset?: string;
    };

    const filter: { provider: string; entityId?: mongoose.Types.ObjectId } = { provider: 'asaas' };
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
    logger.error('[asaas/history]', { err });
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router;
