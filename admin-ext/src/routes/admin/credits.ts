import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { getOrgBalanceModel, getCreditAllocationModel, getCreditAuditModel } from '../../db/models';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import { requireAdminJwt } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

interface BalanceDoc {
  user: mongoose.Types.ObjectId;
  tokenCredits: number;
  autoRefillEnabled: boolean;
}

function getBalanceModel(): Model<BalanceDoc> {
  const db = tenantContext.getDb();
  if (db.models['Balance']) return db.models['Balance'] as Model<BalanceDoc>;
  const schema = new mongoose.Schema<BalanceDoc>(
    { user: mongoose.Schema.Types.ObjectId, tokenCredits: Number, autoRefillEnabled: Boolean },
    { collection: 'balances', strict: false },
  );
  return db.model<BalanceDoc>('Balance', schema);
}

router.get('/user/:userId', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.params['userId'] as string;
    const Balance = getBalanceModel();
    const balance = await Balance.findOne({ user: new mongoose.Types.ObjectId(userId) }).lean();

    res.json({
      userId,
      tokenCredits: balance?.tokenCredits ?? 0,
      autoRefillEnabled: balance?.autoRefillEnabled ?? false,
    });
  } catch (err) {
    logger.error('[credits/user]', { err });
    res.status(500).json({ error: 'Failed to fetch user balance' });
  }
});

router.post('/user/:userId/adjust', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.params['userId'] as string;
    const { amount, reason } = req.body as { amount: number; reason?: string };

    if (typeof amount !== 'number' || isNaN(amount)) {
      res.status(400).json({ error: 'amount must be a number' });
      return;
    }

    const Balance = getBalanceModel();
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const before = await Balance.findOne({ user: userObjectId }).lean();
    const balanceBefore = before?.tokenCredits ?? 0;

    const updated = await Balance.findOneAndUpdate(
      { user: userObjectId },
      { $inc: { tokenCredits: amount } },
      { upsert: true, new: true },
    );

    const balanceAfter = updated?.tokenCredits ?? 0;
    const adminId = new mongoose.Types.ObjectId(req.adminUser?.id);

    await getCreditAuditModel().create({
      entityType: 'user',
      entityId: userObjectId,
      adminId,
      amount,
      reason: reason ?? 'manual',
      balanceBefore,
      balanceAfter,
    });

    logger.info('[credits/adjust] user credits adjusted', {
      userId,
      amount,
      reason: reason ?? 'manual',
      adminId: req.adminUser?.id,
    });

    res.json({ userId, tokenCredits: balanceAfter, adjusted: amount });
  } catch (err) {
    logger.error('[credits/adjust-user]', { err });
    res.status(500).json({ error: 'Failed to adjust user credits' });
  }
});

router.get('/org/:groupId', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = req.params['groupId'] as string;
    const balance = await getOrgBalanceModel().findOne({ groupId: new mongoose.Types.ObjectId(groupId) }).lean();

    res.json({
      groupId,
      poolCredits: balance?.poolCredits ?? 0,
      totalPurchased: balance?.totalPurchased ?? 0,
      totalDistributed: balance?.totalDistributed ?? 0,
    });
  } catch (err) {
    logger.error('[credits/org]', { err });
    res.status(500).json({ error: 'Failed to fetch org balance' });
  }
});

router.post('/org/:groupId/adjust', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = req.params['groupId'] as string;
    const { amount, reason } = req.body as { amount: number; reason?: string };

    if (typeof amount !== 'number' || isNaN(amount)) {
      res.status(400).json({ error: 'amount must be a number' });
      return;
    }

    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const OrgBalance = getOrgBalanceModel();
    const before = await OrgBalance.findOne({ groupId: groupObjectId }).lean();
    const balanceBefore = before?.poolCredits ?? 0;

    const inc: Record<string, number> = { poolCredits: amount };
    if (amount > 0) inc.totalPurchased = amount;

    const updated = await OrgBalance.findOneAndUpdate(
      { groupId: groupObjectId },
      { $inc: inc },
      { upsert: true, new: true },
    );

    const balanceAfter = updated?.poolCredits ?? 0;
    const adminId = new mongoose.Types.ObjectId(req.adminUser?.id);

    await getCreditAuditModel().create({
      entityType: 'group',
      entityId: groupObjectId,
      adminId,
      amount,
      reason: reason ?? 'manual',
      balanceBefore,
      balanceAfter,
    });

    logger.info('[credits/org-adjust] org credits adjusted', {
      groupId,
      amount,
      reason: reason ?? 'manual',
      adminId: req.adminUser?.id,
    });

    res.json({ groupId, poolCredits: balanceAfter, adjusted: amount });
  } catch (err) {
    logger.error('[credits/adjust-org]', { err });
    res.status(500).json({ error: 'Failed to adjust org credits' });
  }
});

router.post('/org/:groupId/distribute', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = req.params['groupId'] as string;
    const { userId, amount, period } = req.body as { userId: string; amount: number; period: string };

    if (!userId || typeof amount !== 'number' || !period) {
      res.status(400).json({ error: 'userId, amount, and period are required' });
      return;
    }

    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const OrgBalance = getOrgBalanceModel();

    const orgBalance = await OrgBalance.findOne({ groupId: groupObjectId });
    if (!orgBalance || orgBalance.poolCredits < amount) {
      res.status(400).json({ error: 'Insufficient pool credits' });
      return;
    }

    const Balance = getBalanceModel();
    const before = await Balance.findOne({ user: userObjectId }).lean();
    const balanceBefore = before?.tokenCredits ?? 0;

    const [allocation] = await Promise.all([
      getCreditAllocationModel().findOneAndUpdate(
        { orgId: groupObjectId, userId: userObjectId, period },
        { $inc: { allocatedAmount: amount }, $setOnInsert: { allocatedAt: new Date() } },
        { upsert: true, new: true },
      ),
      OrgBalance.findOneAndUpdate(
        { groupId: groupObjectId },
        { $inc: { poolCredits: -amount, totalDistributed: amount } },
      ),
      Balance.findOneAndUpdate(
        { user: userObjectId },
        { $inc: { tokenCredits: amount } },
        { upsert: true },
      ),
    ]);

    await getCreditAuditModel().create({
      entityType: 'user',
      entityId: userObjectId,
      adminId: new mongoose.Types.ObjectId(req.adminUser?.id),
      amount,
      reason: `distributed from org ${groupId} period ${period}`,
      balanceBefore,
      balanceAfter: balanceBefore + amount,
    });

    res.json({ allocation, distributed: amount });
  } catch (err) {
    logger.error('[credits/distribute]', { err });
    res.status(500).json({ error: 'Failed to distribute credits' });
  }
});

router.get('/audit', requireAdminJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityId, entityType, limit = '50', offset = '0' } = req.query as {
      entityId?: string;
      entityType?: string;
      limit?: string;
      offset?: string;
    };

    const filter: { entityId?: mongoose.Types.ObjectId; entityType?: string } = {};
    if (entityId) filter.entityId = new mongoose.Types.ObjectId(entityId);
    if (entityType) filter.entityType = entityType;

    const CreditAudit = getCreditAuditModel();
    const [entries, total] = await Promise.all([
      CreditAudit.find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      CreditAudit.countDocuments(filter),
    ]);

    res.json({ entries, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (err) {
    logger.error('[credits/audit]', { err });
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
