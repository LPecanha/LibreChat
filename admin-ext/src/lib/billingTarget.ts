import mongoose, { type Model } from 'mongoose';
import { getOrgProfileModel } from '../db/models';
import { tenantContext } from './tenantContext';

/**
 * Resolves *who* a billing operation credits, and proves the caller is allowed
 * to credit them.
 *
 * The identity always comes from the verified JWT — never from the request body.
 * A client may ask to bill a group instead of itself, but only a group it is
 * actually a member of; the membership is re-checked against the database on
 * every call rather than trusted from the request.
 */

export interface GroupDoc {
  _id: mongoose.Types.ObjectId;
  memberIds: string[];
}

export function getGroupModel(): Model<GroupDoc> {
  const db = tenantContext.getDb();
  if (db.models['Group']) return db.models['Group'] as Model<GroupDoc>;
  const schema = new mongoose.Schema<GroupDoc>(
    { memberIds: [String] },
    { collection: 'groups', strict: false },
  );
  return db.model<GroupDoc>('Group', schema);
}

/** The company group the user belongs to, if any. */
export async function checkOrgMembership(
  userId: string,
): Promise<{ isOrgMember: boolean; orgId?: string }> {
  try {
    const companyProfiles = await getOrgProfileModel().find({ type: 'company' }).select('groupId').lean();
    if (!companyProfiles.length) return { isOrgMember: false };
    const companyGroupIds = companyProfiles.map((p) => p.groupId);
    const group = await getGroupModel()
      .findOne({ _id: { $in: companyGroupIds }, memberIds: userId })
      .select('_id')
      .lean();
    if (!group) return { isOrgMember: false };
    return { isOrgMember: true, orgId: group._id.toString() };
  } catch {
    return { isOrgMember: false };
  }
}

export type BillingEntityType = 'user' | 'group';

export interface BillingTarget {
  entityType: BillingEntityType;
  entityId: string;
}

export type ResolveResult =
  | { ok: true; target: BillingTarget }
  | { ok: false; status: number; error: string };

/**
 * @param userId   `req.user.id` from the verified JWT — the only trusted identity.
 * @param wanted   Optional caller request to bill a group instead of the user.
 */
export async function resolveBillingTarget(
  userId: string | undefined,
  wanted?: { entityType?: string; entityId?: string },
): Promise<ResolveResult> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  // Default and only self-serve case: bill the authenticated user.
  if (!wanted?.entityType || wanted.entityType === 'user') {
    // Billing another user is never legitimate — the JWT decides, not the body.
    if (wanted?.entityId && wanted.entityId !== userId) {
      return { ok: false, status: 403, error: 'Cannot bill another user' };
    }
    return { ok: true, target: { entityType: 'user', entityId: userId } };
  }

  if (wanted.entityType !== 'group') {
    return { ok: false, status: 400, error: 'Invalid entityType' };
  }

  const groupId = wanted.entityId;
  if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
    return { ok: false, status: 400, error: 'Invalid entityId' };
  }

  // Group billing requires proven membership of that exact group.
  const member = await getGroupModel()
    .findOne({ _id: new mongoose.Types.ObjectId(groupId), memberIds: userId })
    .select('_id')
    .lean();

  if (!member) {
    return { ok: false, status: 403, error: 'Not a member of this group' };
  }

  return { ok: true, target: { entityType: 'group', entityId: groupId } };
}
