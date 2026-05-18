#!/usr/bin/env node
/**
 * Fetches the live model catalogue from each provider's /v1/models endpoint
 * and reports the diff against what's declared in deploy/<instance>/librechat.yaml.
 *
 * Run manually or via cron (suggested: biweekly, 1st and 15th of each month):
 *   node scripts/fetch-models.mjs
 *
 * Exit codes:
 *   0 — no drift detected (every yaml model still exists upstream)
 *   1 — drift detected (new models available OR yaml references deprecated models)
 *
 * Requires the same API keys as runtime in the repo-root .env:
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY
 *
 * Does NOT modify any yaml — review and update manually based on the report
 * (each new model needs an appropriate modelSpec entry with caps/temperature).
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

// --- env loader (no deps) ----------------------------------------------------
try {
  const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch { /* fall back to real env */ }

// --- provider definitions ----------------------------------------------------
const PROVIDERS = [
  {
    name: 'openai',
    yamlKey: 'openAI',
    envKey: 'OPENAI_API_KEY',
    url: 'https://api.openai.com/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    parse: (json) => (json.data ?? []).map((m) => m.id),
    // keep chat/reasoning-capable text models; drop TTS/whisper/embeddings/moderation/image gen
    filter: (id) => /^(gpt-|o\d|chatgpt-)/i.test(id)
      && !/whisper|tts|embedding|moderation|dall-e|sora|audio|transcribe/i.test(id),
  },
  {
    name: 'anthropic',
    yamlKey: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    url: 'https://api.anthropic.com/v1/models',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    parse: (json) => (json.data ?? []).map((m) => m.id),
    filter: (id) => /^claude-/i.test(id),
  },
  {
    name: 'google',
    yamlKey: 'google',
    envKey: 'GEMINI_API_KEY',
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    headers: () => ({}),
    parse: (json) => (json.models ?? []).map((m) => m.name.replace(/^models\//, '')),
    filter: (id) => /^(gemini|imagen)/i.test(id) && !/embedding|aqa/i.test(id),
  },
  {
    name: 'xai',
    yamlKey: 'xai', // custom: name == 'xai'
    envKey: 'XAI_API_KEY',
    url: 'https://api.x.ai/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    parse: (json) => (json.data ?? []).map((m) => m.id),
    filter: (id) => /^grok-/i.test(id),
  },
];

// --- HTTP fetch with timeout -------------------------------------------------
async function fetchJson(url, headers, timeoutMs = 20000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// --- yaml model extractor (regex-based, no deps) -----------------------------
// Extracts every model referenced under:
//   endpoints.<provider>.models.default[...]
//   endpoints.custom[].models.default[...] where name == 'xai' etc.
//   modelSpecs.list[].preset.model
function extractYamlModels(yamlText, providerYamlKey) {
  const lines = yamlText.split('\n');
  const found = new Set();

  // 1) endpoints.<provider>.models default list
  // 2) endpoints.custom items (name: 'xai')
  let mode = null;     // 'endpoint-default' when collecting default models
  let endpointFor = null;
  let customName = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;

    // detect named endpoints
    const endpointMatch = line.match(/^  ([A-Za-z]+):\s*$/);
    if (endpointMatch && indent === 2) {
      endpointFor = endpointMatch[1];
      customName = null;
      mode = null;
      continue;
    }

    // custom item: '    - name: "xai"'
    const customMatch = line.match(/^    - name:\s*["']?([A-Za-z0-9_-]+)["']?/);
    if (customMatch && /\s+custom:\s*$/.test(lines[Math.max(0, i - 6)] ?? '')) {
      customName = customMatch[1];
      mode = null;
      continue;
    }
    const anyCustomMatch = line.match(/^    - name:\s*["']?([A-Za-z0-9_-]+)["']?/);
    if (anyCustomMatch && customName !== null) {
      customName = anyCustomMatch[1];
    }

    // entering a "default:" list under models
    if (/^\s+default:\s*$/.test(line)) {
      const activeName = customName ?? endpointFor;
      if (activeName === providerYamlKey) mode = 'endpoint-default';
      continue;
    }
    // collecting list items
    if (mode === 'endpoint-default' && trimmed.startsWith('- ')) {
      const m = trimmed.match(/^-\s*["']?([^"'\s]+)["']?\s*$/);
      if (m) found.add(m[1]);
      continue;
    }
    // exit list when indent drops
    if (mode === 'endpoint-default' && trimmed !== '' && !trimmed.startsWith('- ')) {
      mode = null;
    }

    // endpoints.<provider>.models: list (no default key, just '- "name"')
    // example: anthropic:\n  models:\n    - "claude-sonnet-4-6"
    if (/^\s+models:\s*$/.test(line)) {
      const activeName = customName ?? endpointFor;
      if (activeName === providerYamlKey) mode = 'plain-list';
      continue;
    }
    if (mode === 'plain-list' && trimmed.startsWith('- ')) {
      const m = trimmed.match(/^-\s*["']?([^"'\s]+)["']?\s*$/);
      if (m) found.add(m[1]);
      continue;
    }
    if (mode === 'plain-list' && trimmed !== '' && !trimmed.startsWith('- ')) {
      mode = null;
    }
  }

  // modelSpecs entries: scan for preset.endpoint == providerYamlKey then capture nearby model
  // We do a simple two-pass: split into specs blocks separated by `- name:`
  const specBlocks = yamlText.split(/(?=^    - name:)/m);
  for (const block of specBlocks) {
    const endpointLine = block.match(/^\s*endpoint:\s*["']?([A-Za-z]+)["']?\s*$/m);
    if (!endpointLine) continue;
    if (endpointLine[1] !== providerYamlKey) continue;
    const modelLine = block.match(/^\s*model:\s*["']?([^"'\s]+)["']?\s*$/m);
    if (modelLine) found.add(modelLine[1]);
  }

  return found;
}

// --- main --------------------------------------------------------------------
function colour(c, s) {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, gray: 90, bold: 1 };
  return process.stdout.isTTY ? `\x1b[${codes[c] ?? 0}m${s}\x1b[0m` : s;
}

async function main() {
  const instances = [];
  const deployDir = resolve(ROOT, 'deploy');
  if (existsSync(deployDir)) {
    for (const dir of readdirSync(deployDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const yamlPath = join(deployDir, dir.name, 'librechat.yaml');
      if (existsSync(yamlPath)) instances.push({ name: dir.name, yaml: readFileSync(yamlPath, 'utf8') });
    }
  }
  if (instances.length === 0) {
    console.error('No deploy/<instance>/librechat.yaml found');
    process.exit(2);
  }

  const fresh = {};
  for (const p of PROVIDERS) {
    const key = process.env[p.envKey];
    if (!key || key === 'user_provided') {
      console.warn(colour('yellow', `⚠  ${p.name}: ${p.envKey} not set in .env — skipping live fetch`));
      fresh[p.name] = null;
      continue;
    }
    try {
      const url = typeof p.url === 'function' ? p.url(key) : p.url;
      const json = await fetchJson(url, p.headers(key));
      const ids = p.parse(json).filter(p.filter).sort();
      fresh[p.name] = new Set(ids);
      console.log(colour('cyan', `✓ ${p.name}: ${ids.length} models available upstream`));
    } catch (err) {
      console.error(colour('red', `✗ ${p.name}: fetch failed — ${err.message}`));
      fresh[p.name] = null;
    }
  }

  console.log('\n' + colour('bold', '═══ DRIFT REPORT ═══'));
  let anyDrift = false;
  for (const inst of instances) {
    console.log('\n' + colour('bold', `▸ ${inst.name}`));
    for (const p of PROVIDERS) {
      const live = fresh[p.name];
      if (!live) { console.log(`  ${p.name}: (skipped, no key)`); continue; }
      const declared = extractYamlModels(inst.yaml, p.yamlKey);
      const missing = [...declared].filter((m) => !live.has(m)).sort();
      const novel = [...live].filter((m) => !declared.has(m)).sort();
      if (missing.length === 0 && novel.length === 0) {
        console.log(`  ${colour('green', '✓')} ${p.name}: in sync (${declared.size} models)`);
        continue;
      }
      anyDrift = true;
      console.log(`  ${colour('yellow', '↻')} ${p.name}:`);
      if (missing.length > 0) {
        console.log(colour('red', `    ✗ declared but NOT in API (deprecated/typo): ${missing.join(', ')}`));
      }
      if (novel.length > 0) {
        console.log(colour('green', `    + new in API (consider adding):           ${novel.join(', ')}`));
      }
    }
  }

  const anyFetched = Object.values(fresh).some((v) => v !== null);
  if (!anyFetched) {
    console.log('\n' + colour('red', '✗ No providers fetched — check API keys in .env'));
    process.exit(2);
  }
  console.log('\n' + (anyDrift ? colour('yellow', '⚠  Drift detected — review the report and update yamls manually.') : colour('green', '✓ All in sync.')));
  process.exit(anyDrift ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(2); });
