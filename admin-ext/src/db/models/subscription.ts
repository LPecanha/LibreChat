import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due';
export type PaymentProvider = 'stripe' | 'pagarme' | 'manual';
export type EntityType = 'user' | 'group';

export interface ISubscription {
  _id: Types.ObjectId;
  entityType: EntityType;
  entityId: Types.ObjectId;
  plan: string;
  creditsPerCycle: number;
  cycleIntervalDays: number;
  status: SubscriptionStatus;
  paymentProvider: PaymentProvider;
  externalSubId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextRefillAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ISubscription>(
  {
    entityType: { type: String, enum: ['user', 'group'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    plan: { type: String, required: true },
    creditsPerCycle: { type: Number, required: true },
    cycleIntervalDays: { type: Number, default: 30 },
    status: { type: String, enum: ['active', 'paused', 'cancelled', 'past_due'], default: 'active' },
    paymentProvider: { type: String, enum: ['stripe', 'pagarme', 'manual'], default: 'manual' },
    externalSubId: String,
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    nextRefillAt: { type: Date, required: true },
    cancelledAt: Date,
  },
  { timestamps: true, collection: 'ext_subscriptions' },
);

schema.index({ entityType: 1, entityId: 1, status: 1 });

export function getSubscriptionModel() {
  return useModel<ISubscription>('ExtSubscription', schema);
}
