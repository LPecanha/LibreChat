import { Router } from 'express';
import mongoose from 'mongoose';
import { tenantContext } from '../../lib/tenantContext';
import { requireAdminJwt } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
router.use(requireAdminJwt);

interface CategoryDoc {
  _id: mongoose.Types.ObjectId;
  value: string;
  label: string;
  description: string;
  order: number;
  isActive: boolean;
  custom: boolean;
  tenantId?: string;
}

function getCategoryModel(): mongoose.Model<CategoryDoc> {
  const db = tenantContext.getDb();
  if (db.models['AgentCategory']) return db.models['AgentCategory'] as mongoose.Model<CategoryDoc>;
  const schema = new mongoose.Schema<CategoryDoc>(
    {
      value: { type: String, required: true, trim: true, lowercase: true },
      label: { type: String, required: true, trim: true },
      description: { type: String, trim: true, default: '' },
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      custom: { type: Boolean, default: false },
      tenantId: String,
    },
    { collection: 'agentcategories', strict: false, timestamps: true },
  );
  schema.index({ value: 1, tenantId: 1 }, { unique: true });
  return db.model<CategoryDoc>('AgentCategory', schema);
}

router.get('/', async (_req: AuthenticatedRequest, res) => {
  try {
    const Cat = getCategoryModel();
    const cats = await Cat.find({}).sort({ order: 1, label: 1 }).lean();
    res.json(cats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { label, description = '', order } = req.body as {
      label: string;
      description?: string;
      order?: number;
    };
    if (!label?.trim()) {
      res.status(400).json({ error: 'label is required' });
      return;
    }
    const Cat = getCategoryModel();
    const value = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!value) {
      res.status(400).json({ error: 'label produces an empty slug' });
      return;
    }
    const existing = await Cat.findOne({ value }).lean();
    if (existing) {
      res.status(409).json({ error: `Category "${value}" already exists` });
      return;
    }
    const maxOrder = order ?? ((await Cat.find({}).sort({ order: -1 }).limit(1).lean())[0]?.order ?? -1) + 1;
    const cat = await Cat.create({ value, label: label.trim(), description, order: maxOrder, isActive: true, custom: true });
    res.status(201).json(cat.toObject());
  } catch {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.patch('/:value', async (req: AuthenticatedRequest, res) => {
  try {
    const { value } = req.params as { value: string };
    const { label, description, order, isActive } = req.body as {
      label?: string;
      description?: string;
      order?: number;
      isActive?: boolean;
    };
    const update: Partial<CategoryDoc> = {};
    if (label !== undefined) update.label = label.trim();
    if (description !== undefined) update.description = description;
    if (order !== undefined) update.order = order;
    if (isActive !== undefined) update.isActive = isActive;
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    const Cat = getCategoryModel();
    const updated = await Cat.findOneAndUpdate({ value }, { $set: update }, { new: true }).lean();
    if (!updated) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:value', async (req: AuthenticatedRequest, res) => {
  try {
    const { value } = req.params as { value: string };
    const Cat = getCategoryModel();
    const cat = await Cat.findOne({ value }).lean();
    if (!cat) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    if (!cat.custom) {
      res.status(403).json({ error: 'Built-in categories cannot be deleted; use isActive=false to hide them' });
      return;
    }
    await Cat.deleteOne({ value });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
