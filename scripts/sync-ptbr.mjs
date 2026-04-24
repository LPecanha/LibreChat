#!/usr/bin/env node
/**
 * Syncs pt-BR translation with en, translating missing keys via OpenAI.
 * Run after each upstream rebase: node scripts/sync-ptbr.mjs
 * Requires: OPENAI_API_KEY in env (or .env file at repo root).
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

// Load .env if present (no deps required)
try {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch { /* no .env — rely on real env */ }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set.');
  process.exit(1);
}

const EN_PATH  = resolve(ROOT, 'client/src/locales/en/translation.json');
const PT_PATH  = resolve(ROOT, 'client/src/locales/pt-BR/translation.json');
const BATCH    = 80; // keys per API call

const en = JSON.parse(readFileSync(EN_PATH, 'utf8'));
const pt = JSON.parse(readFileSync(PT_PATH, 'utf8'));

const missing = Object.keys(en).filter((k) => !(k in pt));

if (missing.length === 0) {
  console.log('pt-BR is already up to date — nothing to translate.');
  process.exit(0);
}

console.log(`Translating ${missing.length} missing keys in batches of ${BATCH}…`);

async function translateBatch(pairs) {
  const payload = JSON.stringify(pairs, null, 2);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional software localizer. ' +
            'Translate the UI strings from English to Brazilian Portuguese (pt-BR). ' +
            'Rules:\n' +
            '- Keep interpolation placeholders exactly as-is: {{variable}}, {0}, {1}, etc.\n' +
            '- Keep HTML tags exactly as-is.\n' +
            '- Keep tone friendly and consistent with a chat application UI.\n' +
            '- Return ONLY a JSON object mapping each key to its pt-BR translation. No markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Translate these key-value pairs to pt-BR:\n\n${payload}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content ?? '';
  // Strip markdown code fences if present
  const cleaned = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

const translated = { ...pt };

for (let i = 0; i < missing.length; i += BATCH) {
  const chunk = missing.slice(i, i + BATCH);
  const pairs = Object.fromEntries(chunk.map((k) => [k, en[k]]));
  const progress = `[${i + 1}–${Math.min(i + BATCH, missing.length)}/${missing.length}]`;
  process.stdout.write(`  ${progress} translating…`);
  const result = await translateBatch(pairs);
  for (const k of chunk) {
    if (result[k] !== undefined) translated[k] = result[k];
    else translated[k] = en[k]; // fallback to English if key missing in response
  }
  process.stdout.write(' done\n');
}

// Rebuild output ordered by en key order (makes diffs clean after rebase)
const ordered = Object.fromEntries(Object.keys(en).map((k) => [k, translated[k] ?? en[k]]));

writeFileSync(PT_PATH, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
console.log(`\nDone. pt-BR now has ${Object.keys(ordered).length} keys (was ${Object.keys(pt).length}).`);
