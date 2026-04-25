import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { getSubscriptionModel, getOrgProfileModel, getCreditAuditModel } from '../db/models';
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

interface GroupDoc {
  _id: mongoose.Types.ObjectId;
  memberIds: string[];
}

function getGroupModel(): Model<GroupDoc> {
  const db = tenantContext.getDb();
  if (db.models['Group']) return db.models['Group'] as Model<GroupDoc>;
  const schema = new mongoose.Schema<GroupDoc>(
    { memberIds: [String] },
    { collection: 'groups', strict: false },
  );
  return db.model<GroupDoc>('Group', schema);
}

async function checkOrgMembership(userId: string): Promise<{ isOrgMember: boolean; orgId?: string }> {
  try {
    const companyProfiles = await getOrgProfileModel().find({ type: 'company' }).select('groupId').lean();
    if (!companyProfiles.length) return { isOrgMember: false };
    const companyGroupIds = companyProfiles.map((p) => p.groupId);
    const Group = getGroupModel();
    const group = await Group.findOne({ _id: { $in: companyGroupIds }, memberIds: userId })
      .select('_id')
      .lean();
    if (!group) return { isOrgMember: false };
    return { isOrgMember: true, orgId: group._id.toString() };
  } catch {
    return { isOrgMember: false };
  }
}

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
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
      res.status(404).json({ error: 'Cupom inválido ou não encontrado.' });
      return;
    }
    if (!coupon.isActive) {
      res.status(400).json({ error: 'Este cupom não está mais ativo.' });
      return;
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      res.status(400).json({ error: 'Este cupom expirou.' });
      return;
    }
    if (coupon.maxUses != null && coupon.usages.length >= coupon.maxUses) {
      res.status(400).json({ error: 'Este cupom atingiu o limite de usos.' });
      return;
    }
    if (coupon.usages.some((u) => u.userId === userId)) {
      res.status(400).json({ error: 'Você já utilizou este cupom.' });
      return;
    }

    const creditsGranted = coupon.credits;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const Balance = getBalanceModel();

    const before = await Balance.findOne({ user: userObjectId }).lean();
    const balanceBefore = before?.tokenCredits ?? 0;

    const updated = await Balance.findOneAndUpdate(
      { user: userObjectId },
      { $inc: { tokenCredits: creditsGranted } },
      { upsert: true, new: true },
    );

    await Promise.all([
      getCreditAuditModel().create({
        entityType: 'user',
        entityId: userObjectId,
        amount: creditsGranted,
        reason: `coupon:${normalizedCode}`,
        balanceBefore,
        balanceAfter: updated?.tokenCredits ?? balanceBefore + creditsGranted,
      }),
      Coupon.updateOne(
        { code: normalizedCode },
        { $push: { usages: { userId, userName, userEmail, usedAt: new Date(), creditsGranted } } },
      ),
    ]);

    logger.info('[user/coupon] coupon redeemed', { userId, code: normalizedCode, creditsGranted });
    res.json({ creditsGranted });
  } catch (err) {
    logger.error('[user/coupon/redeem]', { err });
    res.status(500).json({ error: 'Failed to redeem coupon' });
  }
});

export default router;
