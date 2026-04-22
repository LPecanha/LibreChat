import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface ICreditAllocation {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  period: string;
  allocatedAmount: number;
  usedAmount: number;
  allocatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICreditAllocation>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    period: { type: String, required: true },
    allocatedAmount: { type: Number, required: true },
    usedAmount: { type: Number, default: 0 },
    allocatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'ext_credit_allocations' },
);

schema.index({ orgId: 1, userId: 1, period: 1 }, { unique: true });

export function getCreditAllocationModel() {
  return useModel<ICreditAllocation>('ExtCreditAllocation', schema);
}
