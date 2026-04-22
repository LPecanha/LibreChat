import type { Model, Schema } from 'mongoose';
import { tenantContext } from './tenantContext';

export function useModel<T>(name: string, schema: Schema<T>): Model<T> {
  const db = tenantContext.getDb();
  return (db.models[name] as Model<T>) ?? db.model<T>(name, schema);
}
