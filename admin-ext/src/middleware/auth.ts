import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import type { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../lib/tenantContext';

export interface AdminJwtPayload {
  id: string;
  username?: string;
  provider?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminJwtPayload;
  user?: AdminJwtPayload;
}

const adminUserSchema = new mongoose.Schema({ role: String }, { collection: 'users', strict: false });

function getSecret(): string | null {
  return tenantContext.get()?.jwtSecret ?? process.env.JWT_SECRET ?? null;
}

function getAdminUserModel() {
  const db = tenantContext.getDb();
  if (db.models['AdminAuthUser']) return db.models['AdminAuthUser'];
  return db.model('AdminAuthUser', adminUserSchema);
}

export async function requireAdminJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const secret = getSecret();
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  let payload: AdminJwtPayload;
  try {
    payload = jwt.verify(token, secret) as AdminJwtPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const UserModel = getAdminUserModel();
    const user = await UserModel.findById(payload.id).select('role').lean() as { role?: string } | null;
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
  } catch {
    res.status(500).json({ error: 'Failed to verify admin role' });
    return;
  }

  req.adminUser = payload;
  next();
}

export async function requireUserJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const secret = getSecret();
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  try {
    req.user = jwt.verify(token, secret) as AdminJwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
