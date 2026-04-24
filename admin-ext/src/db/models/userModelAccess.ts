import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface IUserModelAccess {
  _id: Types.ObjectId;
  userId: string;
  presetId?: Types.ObjectId;
  blockedSpecsOverride: string[];
  effectiveBlockedSpecs: string[];
  agentsDisabled: boolean;
  updatedAt: Date;
}

const schema = new Schema<IUserModelAccess>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    presetId: { type: Schema.Types.ObjectId },
    blockedSpecsOverride: { type: [String], default: [] },
    effectiveBlockedSpecs: { type: [String], default: [] },
    agentsDisabled: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'ext_user_model_access' },
);

export function getUserModelAccessModel() {
  return useModel<IUserModelAccess>('ExtUserModelAccess', schema);
}
