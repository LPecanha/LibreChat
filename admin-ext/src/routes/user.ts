import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { getSubscriptionModel, getCreditAuditModel } from '../db/models';
import { checkOrgMembership } from '../lib/billingTarget';
import { tenantContext } from '../lib/tenantContext';
import logger from '../lib/logger';
import { requireUserJwt } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

interface BalanceDoc { user: mongoose.Types.ObjectId; tokenCredits: number; }
interface CouponUsage { userId: string; userName: string; userEmail: string; usedAt: Date; creditsGranted: number; }
interface CouponDoc { code: string; credits: number; expiresAt?: Date; maxUses?: number; isActive: boolean; usages: CouponUsage[]; }

function getBalanceModel(): Model<BalanceDoc> {
  const db = tenantContext.getDb();
  if (db.models['UserBalance']) return db.models['UserBalance'] as Model<BalanceDoc>;
  const schema = new mongoose.Schema<BalanceDoc>(
    { user: mongoose.Schema.Types.ObjectId, tokenCredits: Number },
    { collection: 'balances', strict: false },
  );
  return db.model<BalanceDoc>('UserBalance', schema);
}

function getCouponModel(): Model<CouponDoc> {
  const db = tenantContext.getDb();
  if (db.models['UserCoupon']) return db.models['UserCoupon'] as Model<CouponDoc>;
  const schema = new mongoose.Schema<CouponDoc>(
    {
      code: String,
      credits: Number,
      expiresAt: Date,
      maxUses: Number,
      isActive: { type: Boolean, default: true },
      usages: [{ userId: String, userName: String, userEmail: String, usedAt: Date, creditsGranted: Number }],
    },
    { collection: 'coupons', strict: false },
  );
  return db.model<CouponDoc>('UserCoupon', schema);
}

const router = Router();

router.get('/subscription', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sub = await getSubscriptionModel().findOne({
      entityType: 'user',
      entityId: new mongoose.Types.ObjectId(userId),
      status: 'active',
    })
      .select('plan creditsPerCycle cycleIntervalDays status currentPeriodEnd nextRefillAt')
      .lean();

    res.json({ subscription: sub ?? null });
  } catch (err) {
    logger.error('[user/subscription]', { err });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.get('/profile', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [sub, orgInfo] = await Promise.all([
      getSubscriptionModel().findOne({
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(userId),
        status: 'active',
      })
        .select('plan creditsPerCycle cycleIntervalDays status currentPeriodEnd nextRefillAt')
        .lean(),
      checkOrgMembership(userId),
    ]);

    res.json({ subscription: sub ?? null, ...orgInfo });
  } catch (err) {
    logger.error('[user/profile]', { err });
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/coupon/redeem', requireUserJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email ?? '';
    const userName = (req.user as { name?: string })?.name ?? userEmail;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ error: 'code is required' });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    const Coupon = getCouponModel();
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // [SEC] Reivindicacao ATOMICA. As condicoes vivem na query, entao o MongoDB
    // decide o vencedor entre requisicoes concorrentes. O padrao anterior lia as
    // validacoes em memoria e escrevia depois — N requisicoes paralelas com o
    // mesmo codigo passavam todas pelas checagens e creditavam N vezes.
    const now = new Date();
    const claim = await Coupon.findOneAndUpdate(
      {
        code: normalizedCode,
        isActive: true,
        'usages.userId': { $ne: userId },
        $and: [
          { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
          {
            $or: [
              { maxUses: { $exists: false } },
              { maxUses: null },
              { $expr: { $lt: [{ $size: '$usages' }, '$maxUses'] } },
            ],
          },
        ],
      },
      {
        $push: {
          usages: { userId, userName, userEmail, usedAt: now, creditsGranted: 0 },
        },
      },
      { new: false },
    );

    if (!claim) {
      // Nao casou. Le o cupom so para dizer POR QUE — sem efeito colateral.
      const existing = await Coupon.findOne({ code: normalizedCode }).lean();
      if (!existing) {
        res.status(404).json({ error: 'Cupom inválido ou não encontrado.' });
      } else if (!existing.isActive) {
        res.status(400).json({ error: 'Este cupom não está mais ativo.' });
      } else if (existing.expiresAt && existing.expiresAt < now) {
        res.status(400).json({ error: 'Este cupom expirou.' });
      } else if (existing.usages.some((u) => u.userId === userId)) {
        res.status(400).json({ error: 'Você já utilizou este cupom.' });
      } else {
        res.status(400).json({ error: 'Este cupom atingiu o limite de usos.' });
      }
      return;
    }

    // A partir daqui o uso ja esta registrado e e exclusivo deste usuario.
    const creditsGranted = claim.credits;
    const Balance = getBalanceModel();

    const before = await Balance.findOne({ user: userObjectId }).lean();
    const balanceBefore = before?.tokenCredits ?? 0;

    let updated;
    try {
      updated = await Balance.findOneAndUpdate(
        { user: userObjectId },
        { $inc: { tokenCredits: creditsGranted } },
        { upsert: true, new: true },
      );
    } catch (err) {
      // Credito falhou apos a reivindicacao — devolve o uso para nao queimar o cupom.
      await Coupon.updateOne({ code: normalizedCode }, { $pull: { usages: { userId } } });
      throw err;
    }

    await Coupon.updateOne(
      { code: normalizedCode, 'usages.userId': userId },
      { $set: { 'usages.$.creditsGranted': creditsGranted } },
    );

    await getCreditAuditModel().create({
      entityType: 'user',
      entityId: userObjectId,
      adminId: userObjectId,
      amount: creditsGranted,
      reason: `coupon:${normalizedCode}`,
      balanceBefore,
      balanceAfter: updated?.tokenCredits ?? balanceBefore + creditsGranted,
    });

    logger.info('[user/coupon] coupon redeemed', { userId, code: normalizedCode, creditsGranted });
    res.json({ creditsGranted });
  } catch (err) {
    logger.error('[user/coupon/redeem]', { err });
    res.status(500).json({ error: 'Failed to redeem coupon' });
  }
});

export default router;
