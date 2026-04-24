import { Router } from 'express';
import mongoose from 'mongoose';
import { tenantContext } from '../../lib/tenantContext';
import { getModelPresetModel } from '../../db/models/modelPreset';
import { getUserModelAccessModel } from '../../db/models/userModelAccess';
import logger from '../../lib/logger';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

interface SpecItem { name: string; label: string; }

async function fetchAvailableSpecs(): Promise<SpecItem[]> {
  const tenant = tenantContext.get();
  if (!tenant) {
    logger.warn('[modelAccess] fetchAvailableSpecs: no tenant in context');
    return [];
  }
  const url = tenant.internalLibrechatUrl ?? tenant.librechatUrl;
  logger.info(`[modelAccess] fetching specs from ${url}/api/config`);
  try {
    const resp = await fetch(`${url}/api/config`);
    if (!resp.ok) {
      logger.warn(`[modelAccess] /api/config responded ${resp.status}`);
      return [];
    }
    const text = await resp.text();
    logger.info(`[modelAccess] raw response (first 500 chars): ${text.slice(0, 500)}`);
    const cfg = JSON.parse(text) as { modelSpecs?: { list?: { name: string; label?: string }[] } };
    const list = cfg.modelSpecs?.list ?? [];
    logger.info(`[modelAccess] got ${list.length} specs`);
    return list.map((s) => ({ name: s.name, label: s.label ?? s.name }));
  } catch (err) {
    logger.error('[modelAccess] failed to fetch specs', { err });
    return [];
  }
}

function computeEffective(presetBlocked: string[], overrides: string[]): string[] {
  return [...new Set([...presetBlocked, ...overrides])];
}

async function recomputePresetUsers(presetId: mongoose.Types.ObjectId, presetBlocked: string[], agentsDisabled: boolean) {
  const Access = getUserModelAccessModel();
  const users = await Access.find({ presetId }).lean();
  await Promise.all(
    users.map((u) =>
      Access.updateOne(
        { _id: u._id },
        {
          $set: {
            effectiveBlockedSpecs: computeEffective(presetBlocked, u.blockedSpecsOverride),
            agentsDisabled,
          },
        },
      ),
    ),
  );
}

// ── Available specs ──────────────────────────────────────────────────────────

router.get('/specs', async (_req: AuthenticatedRequest, res) => {
  const specs = await fetchAvailableSpecs();
  res.json(specs);
});

// ── Presets CRUD ─────────────────────────────────────────────────────────────

router.get('/presets', async (_req: AuthenticatedRequest, res) => {
  const Preset = getModelPresetModel();
  const Access = getUserModelAccessModel();

  const presets = await Preset.find().sort({ createdAt: -1 }).lean();
  const ids = presets.map((p) => p._id);

  const counts = await Access.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { presetId: { $in: ids } } },
    { $group: { _id: '$presetId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  res.json(
    presets.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      blockedSpecs: p.blockedSpecs,
      agentsDisabled: p.agentsDisabled,
      userCount: countMap.get(p._id.toString()) ?? 0,
      createdAt: p.createdAt,
    })),
  );
});

router.post('/presets', async (req: AuthenticatedRequest, res) => {
  const { name, description, blockedSpecs = [], agentsDisabled = false } = req.body as {
    name?: string;
    description?: string;
    blockedSpecs?: string[];
    agentsDisabled?: boolean;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const Preset = getModelPresetModel();
  const preset = await Preset.create({ name: name.trim(), description, blockedSpecs, agentsDisabled });

  res.status(201).json({
    id: preset._id.toString(),
    name: preset.name,
    description: preset.description,
    blockedSpecs: preset.blockedSpecs,
    agentsDisabled: preset.agentsDisabled,
    userCount: 0,
    createdAt: preset.createdAt,
  });
});

router.patch('/presets/:id', async (req: AuthenticatedRequest, res) => {
  const { name, description, blockedSpecs, agentsDisabled } = req.body as {
    name?: string;
    description?: string;
    blockedSpecs?: string[];
    agentsDisabled?: boolean;
  };

  const Preset = getModelPresetModel();
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name.trim();
  if (description !== undefined) update.description = description;
  if (blockedSpecs !== undefined) update.blockedSpecs = blockedSpecs;
  if (agentsDisabled !== undefined) update.agentsDisabled = agentsDisabled;

  const updated = await Preset.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!updated) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }

  await recomputePresetUsers(updated._id, updated.blockedSpecs, updated.agentsDisabled);

  res.json({
    id: updated._id.toString(),
    name: updated.name,
    description: updated.description,
    blockedSpecs: updated.blockedSpecs,
    agentsDisabled: updated.agentsDisabled,
    createdAt: updated.createdAt,
  });
});

router.delete('/presets/:id', async (req: AuthenticatedRequest, res) => {
  const Preset = getModelPresetModel();
  const Access = getUserModelAccessModel();

  const presetObjId = new mongoose.Types.ObjectId(req.params.id as string);
  const deleted = await Preset.findByIdAndDelete(presetObjId);
  if (!deleted) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }

  // Remove preset from affected users — keep their per-user overrides, recompute effective
  const affected = await Access.find({ presetId: presetObjId }).lean();
  await Promise.all(
    affected.map((u) =>
      Access.updateOne(
        { _id: u._id },
        {
          $unset: { presetId: '' },
          $set: { effectiveBlockedSpecs: u.blockedSpecsOverride },
        },
      ),
    ),
  );

  res.json({ ok: true });
});

// ── Apply preset to multiple users ───────────────────────────────────────────

router.post('/presets/:id/apply', async (req: AuthenticatedRequest, res) => {
  const { userIds } = req.body as { userIds?: string[] };
  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ error: 'userIds array required' });
    return;
  }

  const Preset = getModelPresetModel();
  const Access = getUserModelAccessModel();

  const preset = await Preset.findById(req.params.id).lean();
  if (!preset) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }

  const objIds = userIds.map((uid) => new mongoose.Types.ObjectId(uid));
  const existing = await Access.find({ userId: { $in: objIds } }).lean();
  const overrideMap = new Map(existing.map((u) => [u.userId.toString(), u.blockedSpecsOverride ?? []]));

  await Promise.all(
    objIds.map((uid) =>
      Access.findOneAndUpdate(
        { userId: uid },
        {
          $set: {
            userId: uid,
            presetId: preset._id,
            effectiveBlockedSpecs: computeEffective(preset.blockedSpecs, overrideMap.get(uid.toString()) ?? []),
            agentsDisabled: preset.agentsDisabled,
          },
          $setOnInsert: { blockedSpecsOverride: [] },
        },
        { upsert: true },
      ),
    ),
  );

  res.json({ ok: true, applied: userIds.length });
});

// ── Per-user access ───────────────────────────────────────────────────────────

router.get('/user/:userId', async (req: AuthenticatedRequest, res) => {
  const Access = getUserModelAccessModel();
  const Preset = getModelPresetModel();

  const access = await Access.findOne({ userId: req.params.userId }).lean();
  let presetName: string | undefined;
  if (access?.presetId) {
    const preset = await Preset.findById(access.presetId).lean();
    presetName = preset?.name;
  }

  res.json({
    userId: req.params.userId,
    presetId: access?.presetId?.toString(),
    presetName,
    blockedSpecsOverride: access?.blockedSpecsOverride ?? [],
    agentsDisabled: access?.agentsDisabled ?? false,
    effectiveBlockedSpecs: access?.effectiveBlockedSpecs ?? [],
  });
});

router.put('/user/:userId', async (req: AuthenticatedRequest, res) => {
  const { presetId, blockedSpecsOverride = [], agentsDisabled } = req.body as {
    presetId?: string;
    blockedSpecsOverride?: string[];
    agentsDisabled?: boolean;
  };

  const Access = getUserModelAccessModel();
  const Preset = getModelPresetModel();

  let presetBlocked: string[] = [];
  let effectiveAgentsDisabled = agentsDisabled ?? false;
  let resolvedPresetId: mongoose.Types.ObjectId | undefined;

  if (presetId) {
    const preset = await Preset.findById(presetId).lean();
    if (preset) {
      resolvedPresetId = preset._id;
      presetBlocked = preset.blockedSpecs;
      if (agentsDisabled === undefined) effectiveAgentsDisabled = preset.agentsDisabled;
    }
  }

  const effectiveBlockedSpecs = computeEffective(presetBlocked, blockedSpecsOverride);

  const userObjId = new mongoose.Types.ObjectId(req.params.userId as string);
  await Access.findOneAndUpdate(
    { userId: userObjId },
    {
      $set: {
        userId: userObjId,
        ...(resolvedPresetId ? { presetId: resolvedPresetId } : {}),
        blockedSpecsOverride,
        effectiveBlockedSpecs,
        agentsDisabled: effectiveAgentsDisabled,
      },
      ...(!resolvedPresetId ? { $unset: { presetId: '' } } : {}),
    },
    { upsert: true },
  );

  res.json({ ok: true, effectiveBlockedSpecs });
});

router.delete('/user/:userId', async (req: AuthenticatedRequest, res) => {
  const Access = getUserModelAccessModel();
  await Access.deleteOne({ userId: req.params.userId });
  res.json({ ok: true });
});

export default router;
