import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface IOrgBalance {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  poolCredits: number;
  totalPurchased: number;
  totalDistributed: number;
  updatedAt: Date;
  createdAt: Date;
}

const schema = new Schema<IOrgBalance>(
  {
    groupId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    poolCredits: { type: Number, default: 0 },
    totalPurchased: { type: Number, default: 0 },
    totalDistributed: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'ext_org_balances' },
);

export function getOrgBalanceModel() {
  return useModel<IOrgBalance>('ExtOrgBalance', schema);
}
