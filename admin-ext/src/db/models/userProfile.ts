import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export type AccountType = 'individual' | 'company_member';

export interface IUserProfile {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountType: AccountType;
  primaryOrgId?: Types.ObjectId;
  monthlyAllowance?: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    accountType: { type: String, enum: ['individual', 'company_member'], default: 'individual' },
    primaryOrgId: { type: Schema.Types.ObjectId },
    monthlyAllowance: Number,
  },
  { timestamps: true, collection: 'ext_user_profiles' },
);

export function getUserProfileModel() {
  return useModel<IUserProfile>('ExtUserProfile', schema);
}
