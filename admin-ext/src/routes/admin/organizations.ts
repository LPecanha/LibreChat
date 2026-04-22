import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { getOrgProfileModel, getOrgBalanceModel } from '../../db/models';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

interface GroupDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  email?: string;
  memberIds: string[];
  source?: string;
  createdAt: Date;
}

function getGroupModel(): Model<GroupDoc> {
  const db = tenantContext.getDb();
  if (db.models['Group']) return db.models['Group'] as Model<GroupDoc>;
  const schema = new mongoose.Schema<GroupDoc>(
    {
      name: String,
      description: String,
      email: String,
      memberIds: [String],
      source: String,
      createdAt: Date,
    },
    { collection: 'groups', strict: false },
  );
  return db.model<GroupDoc>('Group', schema);
}

function buildOrgResponse(
  g: GroupDoc,
  profileMap: Map<string, { type?: string; creditPoolEnabled?: boolean; creditLimitPerUser?: number; billingEmail?: string; taxId?: string }>,
  balanceMap: Map<string, { poolCredits?: number; totalPurchased?: number; totalDistributed?: number }>,
) {
  const id = g._id.toString();
  const profile = profileMap.get(id);
  const balance = balanceMap.get(id);
  return {
    id,
    name: g.name,
    description: g.description,
    email: g.email,
    memberCount: g.memberIds?.length ?? 0,
    type: profile?.type ?? 'team',
    creditPoolEnabled: profile?.creditPoolEnabled ?? false,
    creditLimitPerUser: profile?.creditLimitPerUser,
    billingEmail: profile?.billingEmail,
    poolCredits: balance?.poolCredits ?? 0,
    totalPurchased: balance?.totalPurchased ?? 0,
    createdAt: g.createdAt,
  };
}

router.get('/', async (_req: AuthenticatedRequest, res) => {
  try {
    const Group = getGroupModel();
    const [groups, profiles, balances] = await Promise.all([
      Group.find({}, '_id name description email memberIds createdAt').lean(),
      getOrgProfileModel().find({}).lean(),
      getOrgBalanceModel().find({}).lean(),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.groupId.toString(), p]));
    const balanceMap = new Map(balances.map((b) => [b.groupId.toString(), b]));

    const orgs = groups.map((g) => buildOrgResponse(g, profileMap, balanceMap));
    res.json({ organizations: orgs, total: orgs.length });
  } catch (err) {
    logger.error('[orgs/list]', { err });
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, email, type = 'team' } = req.body as {
      name?: string;
      description?: string;
      email?: string;
      type?: 'company' | 'team';
    };

    if (!name?.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const Group = getGroupModel();
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim(),
      email: email?.trim(),
      memberIds: [],
      source: 'admin',
      createdAt: new Date(),
    });

    await getOrgProfileModel().create({ groupId: group._id, type, creditPoolEnabled: false });

    res.status(201).json({
      id: group._id,
      name: group.name,
      description: group.description,
      email: group.email,
      memberCount: 0,
      type,
      creditPoolEnabled: false,
      poolCredits: 0,
      totalPurchased: 0,
      createdAt: group.createdAt,
    });
  } catch (err) {
    logger.error('[orgs/create]', { err });
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const Group = getGroupModel();

    const [group, profile, balance] = await Promise.all([
      Group.findById(id, '_id name description email memberIds createdAt').lean(),
      getOrgProfileModel().findOne({ groupId: id }).lean(),
      getOrgBalanceModel().findOne({ groupId: id }).lean(),
    ]);

    if (!group) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({
      id,
      name: group.name,
      description: group.description,
      email: group.email,
      memberIds: group.memberIds,
      memberCount: group.memberIds?.length ?? 0,
      type: profile?.type ?? 'team',
      creditPoolEnabled: profile?.creditPoolEnabled ?? false,
      creditLimitPerUser: profile?.creditLimitPerUser,
      billingEmail: profile?.billingEmail,
      taxId: profile?.taxId,
      poolCredits: balance?.poolCredits ?? 0,
      totalPurchased: balance?.totalPurchased ?? 0,
      totalDistributed: balance?.totalDistributed ?? 0,
    });
  } catch (err) {
    logger.error('[orgs/get]', { err });
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const { name, description, email } = req.body as {
      name?: string;
      description?: string;
      email?: string;
    };

    const update: Record<string, string | undefined> = {};
    if (name?.trim()) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (email !== undefined) update.email = email.trim();

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const Group = getGroupModel();
    const updated = await Group.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();

    if (!updated) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ id, name: updated.name, description: updated.description, email: updated.email });
  } catch (err) {
    logger.error('[orgs/patch]', { err });
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const Group = getGroupModel();

    const deleted = await Group.findByIdAndDelete(id).lean();
    if (!deleted) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    await Promise.all([
      getOrgProfileModel().deleteOne({ groupId: id }),
      getOrgBalanceModel().deleteOne({ groupId: id }),
    ]);

    logger.info('[orgs/delete]', { orgId: id, adminId: (req as AuthenticatedRequest).adminUser?.id });
    res.json({ ok: true });
  } catch (err) {
    logger.error('[orgs/delete]', { err });
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

router.put('/:id/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const { type, billingEmail, taxId, creditLimitPerUser, creditPoolEnabled } = req.body as {
      type?: 'company' | 'team';
      billingEmail?: string;
      taxId?: string;
      creditLimitPerUser?: number;
      creditPoolEnabled?: boolean;
    };

    const profile = await getOrgProfileModel().findOneAndUpdate(
      { groupId: id },
      { $set: { type, billingEmail, taxId, creditLimitPerUser, creditPoolEnabled } },
      { upsert: true, new: true, runValidators: true },
    );

    res.json(profile);
  } catch (err) {
    logger.error('[orgs/update-profile]', { err });
    res.status(500).json({ error: 'Failed to update organization profile' });
  }
});

router.post('/:id/members', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'] as string;
    const { userId } = req.body as { userId?: string };

    if (!userId?.trim()) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const Group = getGroupModel();
    const updated = await Group.findByIdAndUpdate(
      id,
      { $addToSet: { memberIds: userId } },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ memberCount: updated.memberIds?.length ?? 0 });
  } catch (err) {
    logger.error('[orgs/add-member]', { err });
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:id/members/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const { id, userId } = req.params as { id: string; userId: string };

    const Group = getGroupModel();
    const updated = await Group.findByIdAndUpdate(
      id,
      { $pull: { memberIds: userId } },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ memberCount: updated.memberIds?.length ?? 0 });
  } catch (err) {
    logger.error('[orgs/remove-member]', { err });
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
