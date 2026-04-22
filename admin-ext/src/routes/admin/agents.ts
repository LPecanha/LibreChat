import { Router } from 'express';
import mongoose from 'mongoose';
import { tenantContext } from '../../lib/tenantContext';
import { requireAdminJwt } from '../../middleware/auth';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
router.use(requireAdminJwt);

interface AgentDoc {
  _id: mongoose.Types.ObjectId;
  id: string;
  name?: string;
  description?: string;
  model: string;
  author: mongoose.Types.ObjectId;
  authorName?: string;
  access_level?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AclDoc {
  _id: mongoose.Types.ObjectId;
  principalType: string;
  principalModel?: string;
  principalId: mongoose.Types.ObjectId | string;
  resourceType: string;
  resourceId: mongoose.Types.ObjectId;
  permBits: number;
  grantedBy?: mongoose.Types.ObjectId;
  grantedAt?: Date;
}

interface NameDoc { _id: mongoose.Types.ObjectId; name?: string; email?: string; }

function getNameModel(collection: string, modelName: string): mongoose.Model<NameDoc> {
  const db = tenantContext.getDb();
  if (db.models[modelName]) return db.models[modelName] as mongoose.Model<NameDoc>;
  const schema = new mongoose.Schema<NameDoc>({ name: String, email: String }, { collection, strict: false });
  return db.model<NameDoc>(modelName, schema);
}

function getAgentModel(): mongoose.Model<AgentDoc> {
  const db = tenantContext.getDb();
  if (db.models['Agent']) return db.models['Agent'] as mongoose.Model<AgentDoc>;
  const schema = new mongoose.Schema<AgentDoc>(
    { id: String, name: String, description: String, model: String, author: mongoose.Schema.Types.ObjectId, authorName: String, access_level: Number },
    { collection: 'agents', strict: false, timestamps: true },
  );
  return db.model<AgentDoc>('Agent', schema);
}

function getAclModel(): mongoose.Model<AclDoc> {
  const db = tenantContext.getDb();
  if (db.models['AclEntry']) return db.models['AclEntry'] as mongoose.Model<AclDoc>;
  const schema = new mongoose.Schema<AclDoc>(
    {
      principalType: String,
      principalModel: String,
      principalId: mongoose.Schema.Types.Mixed,
      resourceType: String,
      resourceId: mongoose.Schema.Types.ObjectId,
      permBits: Number,
      grantedBy: mongoose.Schema.Types.ObjectId,
      grantedAt: { type: Date, default: Date.now },
    },
    { collection: 'aclentries', strict: false, timestamps: true },
  );
  return db.model<AclDoc>('AclEntry', schema);
}

router.get('/', async (_req: AuthenticatedRequest, res) => {
  try {
    const Agent = getAgentModel();
    const AclEntry = getAclModel();

    const agents = await Agent.find({}).select('id name description model author authorName access_level createdAt').lean();

    const agentOids = agents.map((a) => a._id);
    const acls = await AclEntry.find({ resourceType: 'agent', resourceId: { $in: agentOids } }).lean();

    const userPrincipalIds: mongoose.Types.ObjectId[] = [];
    const groupPrincipalIds: mongoose.Types.ObjectId[] = [];
    for (const acl of acls) {
      try {
        const oid = new mongoose.Types.ObjectId(acl.principalId as string);
        if (acl.principalType === 'group') groupPrincipalIds.push(oid);
        else userPrincipalIds.push(oid);
      } catch { /* invalid id — skip */ }
    }

    const [userDocs, groupDocs] = await Promise.all([
      userPrincipalIds.length > 0
        ? getNameModel('users', 'UserAcl').find({ _id: { $in: userPrincipalIds } }).select('name email').lean()
        : [],
      groupPrincipalIds.length > 0
        ? getNameModel('groups', 'GroupAcl').find({ _id: { $in: groupPrincipalIds } }).select('name').lean()
        : [],
    ]);

    const nameById = new Map<string, string>();
    for (const u of userDocs) nameById.set(u._id.toString(), u.name ?? u.email ?? u._id.toString());
    for (const g of groupDocs) nameById.set(g._id.toString(), g.name ?? g._id.toString());

    const aclsByAgent = new Map<string, AclDoc[]>();
    for (const acl of acls) {
      const key = acl.resourceId.toString();
      if (!aclsByAgent.has(key)) aclsByAgent.set(key, []);
      aclsByAgent.get(key)!.push(acl);
    }

    res.json(agents.map((a) => ({
      _id: a._id,
      id: a.id,
      name: a.name ?? 'Sem nome',
      description: a.description,
      model: a.model,
      author: a.author,
      authorName: a.authorName,
      access_level: a.access_level,
      createdAt: a.createdAt,
      acl: (aclsByAgent.get(a._id.toString()) ?? []).map((e) => ({
        _id: e._id,
        principalType: e.principalType,
        principalId: e.principalId,
        principalName: nameById.get(e.principalId?.toString() ?? '') ?? e.principalId?.toString(),
        permBits: e.permBits,
        grantedAt: e.grantedAt,
      })),
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

router.post('/:agentId/acl', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const { principalType, principalId, permBits = 1 } = req.body as {
      principalType: 'user' | 'group';
      principalId: string;
      permBits?: number;
    };

    if (!principalType || !principalId) {
      res.status(400).json({ error: 'principalType and principalId required' });
      return;
    }

    const Agent = getAgentModel();
    const AclEntry = getAclModel();

    const agent = await Agent.findOne({ id: agentId }).lean();
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const principalOid = new mongoose.Types.ObjectId(principalId);
    const principalModel = principalType === 'group' ? 'Group' : 'User';

    await AclEntry.findOneAndUpdate(
      { resourceType: 'agent', resourceId: agent._id, principalType, principalId: principalOid },
      {
        $set: {
          principalModel,
          permBits,
          grantedBy: req.adminUser?.id ? new mongoose.Types.ObjectId(req.adminUser.id) : undefined,
          grantedAt: new Date(),
        },
      },
      { upsert: true },
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

router.delete('/:agentId/acl/:aclId', async (req: AuthenticatedRequest, res) => {
  try {
    const { aclId } = req.params as { aclId: string };
    const AclEntry = getAclModel();
    await AclEntry.findByIdAndDelete(new mongoose.Types.ObjectId(aclId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

router.patch('/:agentId', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const { name, description, access_level } = req.body as {
      name?: string;
      description?: string;
      access_level?: number;
    };

    const update: Record<string, string | number> = {};
    if (name?.trim()) update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (access_level !== undefined) update.access_level = access_level;

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const Agent = getAgentModel();
    const updated = await Agent.findOneAndUpdate({ id: agentId }, { $set: update }, { new: true }).lean();
    if (!updated) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({ id: updated.id, name: updated.name, access_level: updated.access_level });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

router.delete('/:agentId', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const Agent = getAgentModel();
    const AclEntry = getAclModel();

    const agent = await Agent.findOne({ id: agentId }).lean();
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    await Promise.all([
      Agent.findByIdAndDelete(agent._id),
      AclEntry.deleteMany({ resourceType: 'agent', resourceId: agent._id }),
    ]);

    logger.info('[admin/agents] deleted agent', { agentId, adminId: req.adminUser?.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export default router;
