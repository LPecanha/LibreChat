import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { getSubscriptionModel, getOrgProfileModel } from '../db/models';
import { tenantContext } from '../lib/tenantContext';
import logger from '../lib/logger';
import { requireUserJwt } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

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

export default router;
