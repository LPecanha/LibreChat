import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface ICreditAudit {
  _id: Types.ObjectId;
  entityType: 'user' | 'group';
  entityId: Types.ObjectId;
  adminId: Types.ObjectId;
  amount: number;
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICreditAudit>(
  {
    entityType: { type: String, enum: ['user', 'group'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: 'manual' },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true, collection: 'ext_credit_audits' },
);

export function getCreditAuditModel() {
  return useModel<ICreditAudit>('ExtCreditAudit', schema);
}
