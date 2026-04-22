import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface IOrgProfile {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  type: 'company' | 'team';
  billingEmail?: string;
  taxId?: string;
  creditLimitPerUser?: number;
  creditPoolEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IOrgProfile>(
  {
    groupId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    type: { type: String, enum: ['company', 'team'], default: 'team' },
    billingEmail: String,
    taxId: String,
    creditLimitPerUser: Number,
    creditPoolEnabled: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'ext_org_profiles' },
);

export function getOrgProfileModel() {
  return useModel<IOrgProfile>('ExtOrgProfile', schema);
}
