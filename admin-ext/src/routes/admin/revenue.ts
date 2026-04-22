import { Router } from 'express';
import { getPaymentTxnModel, getSubscriptionModel } from '../../db/models';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.get('/summary', async (_req: AuthenticatedRequest, res) => {
  try {
    const PaymentTxn = getPaymentTxnModel();
    const Subscription = getSubscriptionModel();

    const now = new Date();
    const since30 = new Date(now);
    since30.setDate(since30.getDate() - 30);

    const [allTime, last30, subStats, byProvider] = await Promise.all([
      PaymentTxn.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            totalCreditsGranted: { $sum: '$creditsGranted' },
          },
        },
      ]),
      PaymentTxn.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since30 } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
      Subscription.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalCreditsPerCycle: { $sum: '$creditsPerCycle' },
          },
        },
      ]),
      PaymentTxn.aggregate([
        {
          $group: {
            _id: { provider: '$provider', status: '$status' },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),
    ]);

    const subByStatus: Record<string, { count: number; totalCreditsPerCycle: number }> = {};
    for (const s of subStats) {
      subByStatus[s._id as string] = { count: s.count, totalCreditsPerCycle: s.totalCreditsPerCycle };
    }

    const providerMap: Record<string, { completed: number; failed: number; totalAmount: number }> = {};
    for (const p of byProvider) {
      const key = p._id.provider as string;
      if (!providerMap[key]) providerMap[key] = { completed: 0, failed: 0, totalAmount: 0 };
      if (p._id.status === 'completed') {
        providerMap[key].completed += p.count;
        providerMap[key].totalAmount += p.totalAmount;
      } else if (p._id.status === 'failed') {
        providerMap[key].failed += p.count;
      }
    }

    res.json({
      allTime: {
        totalAmount: allTime[0]?.totalAmount ?? 0,
        totalTransactions: allTime[0]?.totalTransactions ?? 0,
        totalCreditsGranted: allTime[0]?.totalCreditsGranted ?? 0,
      },
      last30Days: {
        totalAmount: last30[0]?.totalAmount ?? 0,
        totalTransactions: last30[0]?.totalTransactions ?? 0,
      },
      subscriptions: {
        active: subByStatus['active']?.count ?? 0,
        paused: subByStatus['paused']?.count ?? 0,
        cancelled: subByStatus['cancelled']?.count ?? 0,
        pastDue: subByStatus['past_due']?.count ?? 0,
        activeCreditsPerCycle: subByStatus['active']?.totalCreditsPerCycle ?? 0,
      },
      byProvider: Object.entries(providerMap).map(([provider, data]) => ({
        provider,
        totalAmount: data.totalAmount,
        completedCount: data.completed,
        failedCount: data.failed,
        failureRate: data.completed + data.failed > 0
          ? data.failed / (data.completed + data.failed)
          : 0,
      })),
    });
  } catch (err) {
    logger.error('[revenue/summary]', { err });
    res.status(500).json({ error: 'Failed to fetch revenue summary' });
  }
});

router.get('/over-time', async (req: AuthenticatedRequest, res) => {
  try {
    const PaymentTxn = getPaymentTxnModel();
    const { period = 'day', days = '30' } = req.query as { period?: string; days?: string };

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const dateFormats: Record<string, object> = {
      day: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
      week: { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
      month: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
    };

    const groupBy = dateFormats[period] ?? dateFormats.day;

    const data = await PaymentTxn.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: since } } },
      {
        $group: {
          _id: groupBy,
          totalAmount: { $sum: '$amount' },
          totalCreditsGranted: { $sum: '$creditsGranted' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json(data.map((d) => ({
      ...d._id,
      totalAmount: d.totalAmount,
      totalCreditsGranted: d.totalCreditsGranted,
      transactionCount: d.transactionCount,
    })));
  } catch (err) {
    logger.error('[revenue/over-time]', { err });
    res.status(500).json({ error: 'Failed to fetch revenue over time' });
  }
});

export default router;
