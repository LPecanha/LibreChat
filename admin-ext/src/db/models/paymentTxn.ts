import { Schema, Types } from 'mongoose';
import { useModel } from '../../lib/model';
import type { EntityType, PaymentProvider } from './subscription';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface IPaymentTxn {
  _id: Types.ObjectId;
  entityType: EntityType;
  entityId: Types.ObjectId;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  idempotencyKey: string;
  creditsGranted: number;
  externalTxnId?: string;
  subscriptionId?: Types.ObjectId;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPaymentTxn>(
  {
    entityType: { type: String, enum: ['user', 'group'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'BRL' },
    provider: { type: String, enum: ['asaas', 'manual'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    idempotencyKey: { type: String, required: true },
    creditsGranted: { type: Number, default: 0 },
    externalTxnId: String,
    subscriptionId: { type: Schema.Types.ObjectId },
    metadata: { type: Map, of: String },
  },
  { timestamps: true, collection: 'ext_payment_txns' },
);

export function getPaymentTxnModel() {
  return useModel<IPaymentTxn>('ExtPaymentTxn', schema);
}
