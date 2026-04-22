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

router.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { from, to } = req.query as { from?: string; to?: string };

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const [totals, Balance] = await Promise.all([
      Tx.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTokenValue: { $sum: '$tokenValue' },
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

router.get('/over-time', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { period, days = '30', from, to } = req.query as { period?: string; days?: string; from?: string; to?: string };

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
      { $match: { createdAt: dateMatch } },
      {
        $group: {
          _id: groupBy,
          tokenValue: { $sum: '$tokenValue' },
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

router.get('/by-user', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { limit = '20', from, to } = req.query as { limit?: string; from?: string; to?: string };

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const data = await Tx.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$user',
          tokenValue: { $sum: '$tokenValue' },
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

router.get('/by-model', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { from, to } = req.query as { from?: string; to?: string };

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const data = await Tx.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$model',
          tokenValue: { $sum: '$tokenValue' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { tokenValue: -1 } },
      { $limit: 20 },
    ]);

    res.json(data.map((d) => ({ model: d._id ?? 'unknown', tokenValue: d.tokenValue, transactions: d.transactions })));
  } catch (err) {
    logger.error('[usage/by-model]', { err });
    res.status(500).json({ error: 'Failed to fetch usage by model' });
  }
});

router.get('/by-group', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { from, to } = req.query as { from?: string; to?: string };

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

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
          tokenValue: { $sum: '$tokenValue' },
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

router.get('/by-agent', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { limit = '20', from, to } = req.query as { limit?: string; from?: string; to?: string };

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const matchBase = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const data = await Tx.aggregate([
      { $match: { ...matchBase, conversationId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$conversationId',
          tokenValue: { $sum: '$tokenValue' },
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
          transactions: { $sum: 1 },
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

router.get('/by-conversation', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { limit = '20', from, to } = req.query as { limit?: string; from?: string; to?: string };

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const matchBase = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const data = await Tx.aggregate([
      { $match: { ...matchBase, conversationId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$conversationId',
          tokenValue: { $sum: '$tokenValue' },
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

router.get('/user/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const Tx = getTransactionModel();
    const { userId } = req.params as { userId: string };
    const { days = '30' } = req.query as { days?: string };

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));
    const userOid = new mongoose.Types.ObjectId(userId);

    const [totals, byModel, byConversation] = await Promise.all([
      Tx.aggregate([
        { $match: { user: userOid } },
        { $group: { _id: null, tokenValue: { $sum: '$tokenValue' }, transactions: { $sum: 1 } } },
      ]),
      Tx.aggregate([
        { $match: { user: userOid, createdAt: { $gte: since } } },
        { $group: { _id: '$model', tokenValue: { $sum: '$tokenValue' }, transactions: { $sum: 1 } } },
        { $sort: { tokenValue: -1 } },
        { $limit: 10 },
      ]),
      Tx.aggregate([
        { $match: { user: userOid, createdAt: { $gte: since }, conversationId: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$conversationId',
            tokenValue: { $sum: '$tokenValue' },
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

    res.json({
      total: { tokenValue: totals[0]?.tokenValue ?? 0, transactions: totals[0]?.transactions ?? 0 },
      byModel: byModel.map((d) => ({ model: d._id ?? 'unknown', tokenValue: d.tokenValue, transactions: d.transactions })),
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

    const [totals, overTime, byMember, byModel] = await Promise.all([
      Tx.aggregate([
        { $match: { user: { $in: memberIds } } },
        { $group: { _id: null, tokenValue: { $sum: '$tokenValue' }, transactions: { $sum: 1 } } },
      ]),
      Tx.aggregate([
        { $match: { user: { $in: memberIds }, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            tokenValue: { $sum: '$tokenValue' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Tx.aggregate([
        { $match: { user: { $in: memberIds }, createdAt: { $gte: since } } },
        { $group: { _id: '$user', tokenValue: { $sum: '$tokenValue' }, transactions: { $sum: 1 } } },
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
        { $match: { user: { $in: memberIds }, createdAt: { $gte: since } } },
        { $group: { _id: '$model', tokenValue: { $sum: '$tokenValue' }, transactions: { $sum: 1 } } },
        { $sort: { tokenValue: -1 } },
        { $limit: 10 },
      ]),
    ]);

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
      byModel: byModel.map((d) => ({ model: d._id ?? 'unknown', tokenValue: d.tokenValue, transactions: d.transactions })),
    });
  } catch (err) {
    logger.error('[usage/group]', { err });
    res.status(500).json({ error: 'Failed to fetch group usage' });
  }
});

export default router;
