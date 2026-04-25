import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

interface CouponUsage {
  userId: string;
  userName: string;
  userEmail: string;
  usedAt: Date;
  creditsGranted: number;
}

interface CouponDoc {
  code: string;
  description?: string;
  credits: number;
  expiresAt?: Date;
  maxUses?: number;
  isActive: boolean;
  usages: CouponUsage[];
  createdAt: Date;
}

const couponSchema = new mongoose.Schema<CouponDoc>(
  {
    code: { type: String, required: true },
    description: String,
    credits: { type: Number, required: true },
    expiresAt: Date,
    maxUses: Number,
    isActive: { type: Boolean, default: true },
    usages: [
      {
        userId: String,
        userName: String,
        userEmail: String,
        usedAt: Date,
        creditsGranted: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'coupons', strict: false },
);

function getCouponModel(): Model<CouponDoc> {
  const db = tenantContext.getDb();
  if (db.models['Coupon']) return db.models['Coupon'] as Model<CouponDoc>;
  return db.model<CouponDoc>('Coupon', couponSchema);
}

router.get('/', async (_req: AuthenticatedRequest, res) => {
  try {
    const coupons = await getCouponModel().find().sort({ createdAt: -1 }).lean();
    const result = coupons.map((c) => ({
      ...c,
      totalUsages: c.usages.length,
      totalCreditsGranted: c.usages.reduce((sum, u) => sum + u.creditsGranted, 0),
    }));
    res.json(result);
  } catch (err) {
    logger.error('[coupons/list]', { err });
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { code, description, credits, expiresAt, maxUses } = req.body as {
      code: string;
      description?: string;
      credits: number;
      expiresAt?: string;
      maxUses?: number;
    };

    if (!code || typeof credits !== 'number' || credits <= 0) {
      res.status(400).json({ error: 'code and credits (> 0) are required' });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await getCouponModel().findOne({ code: normalizedCode }).lean();
    if (existing) {
      res.status(409).json({ error: 'Coupon code already exists' });
      return;
    }

    const coupon = await getCouponModel().create({
      code: normalizedCode,
      description: description?.trim(),
      credits,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses: maxUses ?? undefined,
      isActive: true,
      usages: [],
    });

    res.status(201).json(coupon);
  } catch (err) {
    logger.error('[coupons/create]', { err });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.patch('/:code', async (req: AuthenticatedRequest, res) => {
  try {
    const code = String(req.params['code'] ?? '').toUpperCase();
    const { isActive, description, expiresAt, maxUses } = req.body as {
      isActive?: boolean;
      description?: string;
      expiresAt?: string | null;
      maxUses?: number | null;
    };

    const update: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') update['isActive'] = isActive;
    if (description !== undefined) update['description'] = description;
    if (expiresAt !== undefined) update['expiresAt'] = expiresAt ? new Date(expiresAt) : null;
    if (maxUses !== undefined) update['maxUses'] = maxUses ?? null;

    const updated = await getCouponModel()
      .findOneAndUpdate({ code }, { $set: update }, { new: true })
      .lean();

    if (!updated) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error('[coupons/update]', { err });
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

router.delete('/:code', async (req: AuthenticatedRequest, res) => {
  try {
    const code = String(req.params['code'] ?? '').toUpperCase();
    const deleted = await getCouponModel().findOneAndDelete({ code }).lean();
    if (!deleted) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error('[coupons/delete]', { err });
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
