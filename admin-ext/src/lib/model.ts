import mongoose, { type Model, type Schema } from 'mongoose';

/**
 * [EXT] Phase J.19 Navvia: registra/recupera um Model na conexão default
 * do mongoose. Substitui o antigo helper que pegava o `tenantContext.getDb()`
 * (multi-tenant) — agora roda direto na conexão única.
 */
export function useModel<T>(name: string, schema: Schema<T>): Model<T> {
  const db = mongoose.connection;
  return (db.models[name] as Model<T>) ?? db.model<T>(name, schema);
}
