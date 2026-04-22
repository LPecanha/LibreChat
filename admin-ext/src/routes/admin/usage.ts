import { Router } from 'express';
import mongoose from 'mongoose';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

function getTransactionModel() {
  const db = tenantContext.getDb();
  if (db.models['Transaction']) return db.models['Transaction'];
  const schema = new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      model: String,
      tokenType: String,
      rawAmount: Number,
      tokenValue: Number,
      rate: Number,
      conversationId: String,
      createdAt: Date,
    },
    { collection: 'transactions', strict: false },
  );
  return db.model('Transaction', schema);
}

function getBalanceModel() {
  const db = tenantContext.getDb();
  if (db.models['Balance']) return db.models['Balance'];
  const schema = new mongoose.Schema(
    { user: mongoose.Schema.Types.ObjectId, tokenCredits: Number },
    { collection: 'balances', strict: false },
  );
  return db.model('Balance', schema);
}

// In LibreChat, usage transactions have tokenValue < 0 (debits from balance).
// We filter for only those and negate to get positive consumption values.
const NEGATE_TV = { $multiply: ['$tokenValue', -1] };

function buildDateMatch(from?: string, to?: string, days?: string): Record<string, unknown> {
  if (from) {
    const since = new Date(from);
    const until = to ? new Date(to) : new Date();
    return { createdAt: { $gte: since, $lte: until } };
  }
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days ?? '30', 10));
  return { createdAt: { $gte: since } };
}

// Resolve agent_* model strings to the agent's actual underlying model.
// Transactions store model as "agent_<id>" when routed through an agent.
async function resolveAgentModels(
  raw: Array<{ _id: string | null; tokenValue: number; transactions: number }>,
): Promise<Array<{ model: string; tokenValue: number; transactions: number }>> {
  const agentPrefixed = raw.filter((d) => d._id?.startsWith('agent_'));
  const agentIds = agentPrefixed.map((d) => d._id!.slice(6));

  const agentModelMap = new Map<string, string>();
  if (agentIds.length > 0) {
    const db = tenantContext.getDb();
    const agents = await db
      .collection('agents')
      .find({ id: { $in: agentIds } }, { projection: { id: 1, model: 1 } })
      .toArray() as Array<{ id: string; model?: string }>;
    for (const a of agents) {
      if (a.id && a.model) agentModelMap.set(`agent_${a.id}`, a.model);
    }
  }

  const merged = new Map<string, { tokenValue: number; transactions: number }>();
  for (const d of raw) {
    const model = (d._id && agentModelMap.get(d._id)) ?? d._id ?? null;
    if (!model) continue;
    const existing = merged.get(model) ?? { tokenValue: 0, transactions: 0 };
    existing.tokenValue += d.tokenValue;
    existing.transactions += d.transactions;
    merged.set(model, existing);
  }

  return [...merged.entries()]
    .map(([model, s]) => ({ model, tokenValue: s.tokenValue, transactions: s.transactions }))
    .sort((a, b) => b.tokenValue - a.tokenValue);
}

// ── /summary ──────────────────────────────────────────────────────────────────

router.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { from, to } = req.query as { from?: string; to?: string };
    const dateFilter = from ? buildDateMatch(from, to) : {};
    const match = { tokenValue: { $lt: 0 }, ...dateFilter };

    const [totals, Balance] = await Promise.all([
      Tx.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTokenValue: { $sum: NEGATE_TV },
            totalTransactions: { $sum: 1 },
            uniqueUsers: { $addToSet: '$user' },
          },
        },
      ]),
      getBalanceModel().aggregate([
        { $group: { _id: null, totalCreditsRemaining: { $sum: '$tokenCredits' } } },
      ]),
    ]);

    const summary = totals[0] ?? { totalTokenValue: 0, totalTransactions: 0, uniqueUsers: [] };
    const balanceSummary = Balance[0] ?? { totalCreditsRemaining: 0 };

    res.json({
      totalTokenValue: summary.totalTokenValue,
      totalTransactions: summary.totalTransactions,
      uniqueActiveUsers: summary.uniqueUsers.length,
      totalCreditsRemaining: balanceSummary.totalCreditsRemaining,
    });
  } catch (err) {
    logger.error('[usage/summary]', { err });
    res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

// ── /over-time ────────────────────────────────────────────────────────────────

router.get('/over-time', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { period, days = '30', from, to } = req.query as {
      period?: string; days?: string; from?: string; to?: string;
    };

    let since: Date;
    let until: Date | undefined;
    if (from) {
      since = new Date(from);
      until = to ? new Date(to) : new Date();
    } else {
      since = new Date();
      since.setDate(since.getDate() - parseInt(days, 10));
    }

    const rangeDays = Math.ceil(((until ?? new Date()).getTime() - since.getTime()) / 86_400_000);
    const resolvedPeriod = period ?? (rangeDays > 90 ? 'month' : 'day');

    const dateFormats: Record<string, object> = {
      day: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
      week: { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
      month: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
    };

    const groupBy = dateFormats[resolvedPeriod] ?? dateFormats.day;
    const dateMatch: Record<string, Date> = { $gte: since };
    if (until) dateMatch.$lte = until;

    const data = await Tx.aggregate([
      { $match: { createdAt: dateMatch, tokenValue: { $lt: 0 } } },
      {
        $group: {
          _id: groupBy,
          tokenValue: { $sum: NEGATE_TV },
          transactions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json(data.map((d) => ({ ...d._id, tokenValue: d.tokenValue, transactions: d.transactions, users: d.uniqueUsers.length })));
  } catch (err) {
    logger.error('[usage/over-time]', { err });
    res.status(500).json({ error: 'Failed to fetch usage over time' });
  }
});

// ── /by-user ──────────────────────────────────────────────────────────────────

router.get('/by-user', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { limit = '20', from, to } = req.query as { limit?: string; from?: string; to?: string };
    const dateMatch = from ? buildDateMatch(from, to) : {};
    const match = { tokenValue: { $lt: 0 }, ...dateMatch };

    const data = await Tx.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$user',
          tokenValue: { $sum: NEGATE_TV },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { tokenValue: -1 } },
      { $limit: parseInt(limit, 10) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);

    res.json(data.map((d) => ({
      userId: d._id,
      name: d.user?.name ?? 'Unknown',
      email: d.user?.email ?? '',
      avatar: d.user?.avatar,
      tokenValue: d.tokenValue,
      transactions: d.transactions,
    })));
  } catch (err) {
    logger.error('[usage/by-user]', { err });
    res.status(500).json({ error: 'Failed to fetch usage by user' });
  }
});

// ── /by-model ─────────────────────────────────────────────────────────────────

router.get('/by-model', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { from, to } = req.query as { from?: string; to?: string };
    const dateMatch = from ? buildDateMatch(from, to) : {};
    const match = { tokenValue: { $lt: 0 }, ...dateMatch };

    const raw: Array<{ _id: string | null; tokenValue: number; transactions: number }> =
      await Tx.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$model',
            tokenValue: { $sum: NEGATE_TV },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { tokenValue: -1 } },
        { $limit: 40 },
      ]);

    const resolved = await resolveAgentModels(raw);
    res.json(resolved.slice(0, 20));
  } catch (err) {
    logger.error('[usage/by-model]', { err });
    res.status(500).json({ error: 'Failed to fetch usage by model' });
  }
});

// ── /by-group ─────────────────────────────────────────────────────────────────

router.get('/by-group', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { from, to } = req.query as { from?: string; to?: string };
    const dateMatch = from ? buildDateMatch(from, to) : {};
    const match = { tokenValue: { $lt: 0 }, ...dateMatch };

    const data = await Tx.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'groups',
          let: { userId: '$user' },
          pipeline: [
            { $match: { $expr: { $in: [{ $toString: '$$userId' }, '$memberIds'] } } },
            { $project: { name: 1 } },
          ],
          as: 'groups',
        },
      },
      { $unwind: { path: '$groups', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$groups._id',
          groupName: { $first: '$groups.name' },
          tokenValue: { $sum: NEGATE_TV },
          transactions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
        },
      },
      { $sort: { tokenValue: -1 } },
    ]);

    res.json(data.map((d) => ({
      groupId: d._id,
      groupName: d.groupName,
      tokenValue: d.tokenValue,
      transactions: d.transactions,
      uniqueUsers: d.uniqueUsers.length,
    })));
  } catch (err) {
    logger.error('[usage/by-group]', { err });
    res.status(500).json({ error: 'Failed to fetch usage by group' });
  }
});

// ── /by-agent ─────────────────────────────────────────────────────────────────

router.get('/by-agent', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { limit = '20', from, to } = req.query as { limit?: string; from?: string; to?: string };
    const dateMatch = from ? buildDateMatch(from, to) : {};
    const match = { tokenValue: { $lt: 0 }, ...dateMatch };

    const data = await Tx.aggregate([
      { $match: { ...match, conversationId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$conversationId',
          tokenValue: { $sum: NEGATE_TV },
          transactions: { $sum: 1 },
          users: { $addToSet: '$user' },
        },
      },
      {
        $lookup: {
          from: 'conversations',
          localField: '_id',
          foreignField: 'conversationId',
          as: 'conv',
          pipeline: [{ $project: { agent_id: 1 } }],
        },
      },
      { $unwind: { path: '$conv', preserveNullAndEmptyArrays: false } },
      { $match: { 'conv.agent_id': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$conv.agent_id',
          tokenValue: { $sum: '$tokenValue' },
          transactions: { $sum: '$transactions' },
          uniqueUsers: { $addToSet: { $arrayElemAt: ['$users', 0] } },
          conversationCount: { $sum: 1 },
        },
      },
      { $sort: { tokenValue: -1 } },
      { $limit: parseInt(limit, 10) },
      {
        $lookup: {
          from: 'agents',
          localField: '_id',
          foreignField: 'id',
          as: 'agent',
          pipeline: [{ $project: { name: 1, model: 1 } }],
        },
      },
      { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
    ]);

    res.json(data.map((d) => ({
      agentId: d._id,
      name: d.agent?.name ?? d._id ?? 'Unknown Agent',
      model: d.agent?.model,
      tokenValue: d.tokenValue,
      transactions: d.transactions,
      conversationCount: d.conversationCount,
      uniqueUsers: d.uniqueUsers.filter(Boolean).length,
    })));
  } catch (err) {
    logger.error('[usage/by-agent]', { err });
    res.status(500).json({ error: 'Failed to fetch usage by agent' });
  }
});

// ── /by-conversation ──────────────────────────────────────────────────────────

router.get('/by-conversation', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { limit = '20', from, to } = req.query as { limit?: string; from?: string; to?: string };
    const dateMatch = from ? buildDateMatch(from, to) : {};
    const match = { tokenValue: { $lt: 0 }, ...dateMatch };

    const data = await Tx.aggregate([
      { $match: { ...match, conversationId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$conversationId',
          tokenValue: { $sum: NEGATE_TV },
          transactions: { $sum: 1 },
          userId: { $first: '$user' },
        },
      },
      { $sort: { tokenValue: -1 } },
      { $limit: parseInt(limit, 10) },
      {
        $lookup: {
          from: 'conversations',
          localField: '_id',
          foreignField: 'conversationId',
          as: 'conv',
          pipeline: [{ $project: { title: 1, model: 1, agent_id: 1 } }],
        },
      },
      { $unwind: { path: '$conv', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);

    res.json(data.map((d) => ({
      conversationId: d._id,
      title: d.conv?.title ?? 'Conversa sem título',
      model: d.conv?.model,
      agentId: d.conv?.agent_id,
      userName: d.user?.name ?? 'Unknown',
      userEmail: d.user?.email ?? '',
      tokenValue: d.tokenValue,
      transactions: d.transactions,
    })));
  } catch (err) {
    logger.error('[usage/by-conversation]', { err });
    res.status(500).json({ error: 'Failed to fetch usage by conversation' });
  }
});

// ── /user/:userId ─────────────────────────────────────────────────────────────

router.get('/user/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { userId } = req.params as { userId: string };
    const { days = '30' } = req.query as { days?: string };

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));
    const userOid = new mongoose.Types.ObjectId(userId);
    const recentMatch = { user: userOid, createdAt: { $gte: since }, tokenValue: { $lt: 0 } };

    const [totals, byModelRaw, byConversation] = await Promise.all([
      Tx.aggregate([
        { $match: { user: userOid, tokenValue: { $lt: 0 } } },
        { $group: { _id: null, tokenValue: { $sum: NEGATE_TV }, transactions: { $sum: 1 } } },
      ]),
      Tx.aggregate([
        { $match: recentMatch },
        { $group: { _id: '$model', tokenValue: { $sum: NEGATE_TV }, transactions: { $sum: 1 } } },
        { $sort: { tokenValue: -1 } },
        { $limit: 20 },
      ]),
      Tx.aggregate([
        { $match: { ...recentMatch, conversationId: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$conversationId',
            tokenValue: { $sum: NEGATE_TV },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { tokenValue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'conversations',
            localField: '_id',
            foreignField: 'conversationId',
            as: 'conv',
            pipeline: [{ $project: { title: 1, model: 1, agent_id: 1 } }],
          },
        },
        { $unwind: { path: '$conv', preserveNullAndEmptyArrays: true } },
      ]),
    ]);

    const byModel = await resolveAgentModels(byModelRaw);

    res.json({
      total: { tokenValue: totals[0]?.tokenValue ?? 0, transactions: totals[0]?.transactions ?? 0 },
      byModel,
      byConversation: byConversation.map((d) => ({
        conversationId: d._id,
        title: d.conv?.title ?? 'Conversa sem título',
        model: d.conv?.model,
        agentId: d.conv?.agent_id,
        tokenValue: d.tokenValue,
        transactions: d.transactions,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user usage' });
  }
});

// ── /group/:groupId ───────────────────────────────────────────────────────────

router.get('/group/:groupId', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { groupId } = req.params as { groupId: string };
    const { days = '30' } = req.query as { days?: string };

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const db = tenantContext.getDb();
    const [groupDoc] = await db.collection('groups').find(
      { _id: new mongoose.Types.ObjectId(groupId) },
      { projection: { name: 1, memberIds: 1 } },
    ).toArray();

    if (!groupDoc) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const memberIds: mongoose.Types.ObjectId[] = (groupDoc.memberIds ?? []).map((id: string) => {
      try { return new mongoose.Types.ObjectId(id); } catch { return null; }
    }).filter(Boolean);

    const memberMatch = { user: { $in: memberIds }, tokenValue: { $lt: 0 } };
    const recentMemberMatch = { ...memberMatch, createdAt: { $gte: since } };

    const [totals, overTime, byMember, byModelRaw] = await Promise.all([
      Tx.aggregate([
        { $match: memberMatch },
        { $group: { _id: null, tokenValue: { $sum: NEGATE_TV }, transactions: { $sum: 1 } } },
      ]),
      Tx.aggregate([
        { $match: recentMemberMatch },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            tokenValue: { $sum: NEGATE_TV },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Tx.aggregate([
        { $match: recentMemberMatch },
        { $group: { _id: '$user', tokenValue: { $sum: NEGATE_TV }, transactions: { $sum: 1 } } },
        { $sort: { tokenValue: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ]),
      Tx.aggregate([
        { $match: recentMemberMatch },
        { $group: { _id: '$model', tokenValue: { $sum: NEGATE_TV }, transactions: { $sum: 1 } } },
        { $sort: { tokenValue: -1 } },
        { $limit: 20 },
      ]),
    ]);

    const byModel = await resolveAgentModels(byModelRaw);

    res.json({
      groupId,
      groupName: groupDoc.name,
      memberCount: memberIds.length,
      total: { tokenValue: totals[0]?.tokenValue ?? 0, transactions: totals[0]?.transactions ?? 0 },
      overTime: overTime.map((d) => ({ ...d._id, tokenValue: d.tokenValue, transactions: d.transactions })),
      byMember: byMember.map((d) => ({
        userId: d._id,
        name: d.user?.name ?? 'Unknown',
        email: d.user?.email ?? '',
        avatar: d.user?.avatar,
        tokenValue: d.tokenValue,
        transactions: d.transactions,
      })),
      byModel,
    });
  } catch (err) {
    logger.error('[usage/group]', { err });
    res.status(500).json({ error: 'Failed to fetch group usage' });
  }
});

export default router;
