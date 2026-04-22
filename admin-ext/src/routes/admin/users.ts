import bcrypt from 'bcryptjs';
import { Router } from 'express';
import mongoose, { type Model } from 'mongoose';
import { tenantContext } from '../../lib/tenantContext';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  provider: string;
  avatar?: string;
  emailVerified?: boolean;
  createdAt?: Date;
}

function getUserModel(): Model<UserDoc> {
  const db = tenantContext.getDb();
  if (db.models['ExtUser']) return db.models['ExtUser'] as Model<UserDoc>;
  const schema = new mongoose.Schema<UserDoc>(
    {
      name: String,
      username: String,
      email: String,
      password: String,
      role: { type: String, default: 'USER' },
      provider: { type: String, default: 'local' },
      avatar: String,
      emailVerified: Boolean,
    },
    { collection: 'users', strict: false, timestamps: true },
  );
  return db.model<UserDoc>('ExtUser', schema);
}

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password, role = 'USER' } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ error: 'name, email and password are required' });
      return;
    }

    const User = getUserModel();
    const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(password, salt);
    const username = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? 'user';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username,
      password: hashed,
      role,
      provider: 'local',
      emailVerified: true,
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      provider: user.provider,
      createdAt: user.createdAt,
    });
  } catch (err) {
    logger.error('[admin/users] create error', { err });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, email, role } = req.body as {
      name?: string;
      email?: string;
      role?: string;
    };

    if (!name && !email && !role) {
      res.status(400).json({ error: 'At least one field required' });
      return;
    }

    const update: Record<string, string> = {};
    if (name?.trim()) update.name = name.trim();
    if (email?.trim()) update.email = email.toLowerCase().trim();
    if (role) update.role = role;

    const User = getUserModel();
    const updated = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set: update },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    });
  } catch (err) {
    logger.error('[admin/users] update error', { err });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as { id: string };

    if (req.adminUser?.id === id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const User = getUserModel();
    const deleted = await User.findByIdAndDelete(new mongoose.Types.ObjectId(id)).lean();

    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logger.info('[admin/users] deleted user', { userId: id, adminId: req.adminUser?.id });
    res.json({ ok: true });
  } catch (err) {
    logger.error('[admin/users] delete error', { err });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
