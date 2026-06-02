/**
 * [EXT] Phase J.19 Navvia: config single-tenant.
 *
 * Substitui o antigo `tenants.ts` que parseava `TENANTS_CONFIG` (JSON array)
 * pra suportar multi-tenant. Agora roda Navvia-only via env vars flat:
 *
 *   MONGO_URI               — string Mongo (Navvia DB)
 *   JWT_SECRET              — secret pra validar JWTs vindos do LibreChat
 *   LIBRECHAT_URL           — URL publica do LibreChat (login proxy)
 *   LIBRECHAT_INTERNAL_URL  — opcional, URL Docker interna (server-to-server)
 *
 * `getConfig()` lê uma vez, cacheia, e valida. Lança se faltar algo obrigatório.
 */

export interface AppConfig {
  mongoUri: string;
  jwtSecret: string;
  librechatUrl: string;
  internalLibrechatUrl: string;
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  const mongoUri = process.env.MONGO_URI;
  const jwtSecret = process.env.JWT_SECRET;
  const librechatUrl = process.env.LIBRECHAT_URL;
  const internalLibrechatUrl = process.env.LIBRECHAT_INTERNAL_URL ?? librechatUrl;

  const missing: string[] = [];
  if (!mongoUri) missing.push('MONGO_URI');
  if (!jwtSecret) missing.push('JWT_SECRET');
  if (!librechatUrl) missing.push('LIBRECHAT_URL');

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  _config = {
    mongoUri: mongoUri as string,
    jwtSecret: jwtSecret as string,
    librechatUrl: librechatUrl as string,
    internalLibrechatUrl: internalLibrechatUrl as string,
  };
  return _config;
}
