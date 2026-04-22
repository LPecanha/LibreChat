import { Schema, type Document, type Types } from 'mongoose';
import { useModel } from '../../lib/model';

export interface ICreditPlan extends Document {
  _id: Types.ObjectId;
  planId: string;
  name: string;
  type: 'subscription' | 'one_time';
  credits: number;
  pricesBRL: number;
  pricesUSD: number;
  popular: boolean;
  active: boolean;
  discountPct: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICreditPlan>(
  {
    planId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['subscription', 'one_time'], default: 'one_time' },
    credits: { type: Number, required: true },
    pricesBRL: { type: Number, required: true },
    pricesUSD: { type: Number, required: true },
    popular: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    discountPct: { type: Number, default: 0, min: 0, max: 100 },
  },
  { collection: 'ext_credit_plans', timestamps: true },
);

export function getCreditPlanModel() {
  return useModel<ICreditPlan>('ExtCreditPlan', schema);
}
