import { getActiveTenant } from './tenant';

/** Extract the friendly display name from LibreChat's "provider__modelId___Friendly Name" format. */
export function cleanModelName(model: string): string {
  const idx = model.indexOf('___');
  if (idx !== -1) return model.slice(idx + 3);
  return model;
}

export type Provider = 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' | 'xai' | 'deepseek' | 'unknown';

export function modelProvider(model: string): Provider {
  const lower = model.toLowerCase();
  if (lower.includes('claude') || lower.includes('anthropic')) return 'anthropic';
  if (lower.includes('gpt') || lower.includes('openai') || /\bo[13]-/.test(lower) || / o[13]/.test(lower)) return 'openai';
  if (lower.includes('gemini') || lower.includes('google')) return 'google';
  if (lower.includes('llama') || lower.includes('meta/')) return 'meta';
  if (lower.includes('mistral')) return 'mistral';
  if (lower.includes('grok') || lower.includes('xai')) return 'xai';
  if (lower.includes('deepseek')) return 'deepseek';
  return 'unknown';
}

export const PROVIDER_COLORS: Record<Provider, string> = {
  anthropic: '#c96442',
  openai: '#10a37f',
  google: '#4285f4',
  meta: '#0866ff',
  mistral: '#ff6b35',
  xai: '#374151',
  deepseek: '#2563eb',
  unknown: '#6b7280',
};

export const PROVIDER_INITIALS: Record<Provider, string> = {
  anthropic: 'A',
  openai: 'O',
  google: 'G',
  meta: 'M',
  mistral: 'MI',
  xai: 'X',
  deepseek: 'DS',
  unknown: '?',
};

/** Resolve a relative avatar path to an absolute URL using the active tenant's LibreChat base URL. */
export function resolveAvatarUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const base = getActiveTenant()?.librechatUrl ?? '';
  return base ? `${base}${path}` : undefined;
}
