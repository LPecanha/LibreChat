import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface IModelPreset {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  blockedSpecs: string[];
  agentsDisabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IModelPreset>(
  {
    name: { type: String, required: true },
    description: String,
    blockedSpecs: { type: [String], default: [] },
    agentsDisabled: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'ext_model_presets' },
);

export function getModelPresetModel() {
  return useModel<IModelPreset>('ExtModelPreset', schema);
}
