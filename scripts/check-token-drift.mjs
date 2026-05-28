#!/usr/bin/env node
/**
 * scripts/check-token-drift.mjs
 *
 * Valida que as variáveis de tema definidas em `client/src/style.css`
 * (sob `:root`, `html`, `.dark`, `.gizmo`) estão sincronizadas com as
 * strings RGB em `packages/client/src/theme/themes/{default,dark}.ts`.
 *
 * Os dois arquivos são fontes paralelas dos mesmos tokens. Quando um é
 * editado sem o outro, gera bugs visuais sutis. Este script falha (exit 1)
 * se houver token presente num e não no outro, ou com valor incompatível.
 *
 * Uso:
 *   node scripts/check-token-drift.mjs
 *
 * Convenções:
 * - Em `style.css`, tokens são `--text-primary: #1a1d21;`
 * - Em `theme/themes/default.ts`, viram `'rgb-text-primary': '26 29 33'`
 *   (RGB em espaço separado, em vez do hex).
 * - Tokens whitelisted abaixo (TOKEN_WHITELIST) são esperados em ambos.
 * - Tokens utilitários (apenas em style.css, sem RGB equivalente) entram em
 *   STYLE_ONLY_WHITELIST.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const STYLE_CSS = join(ROOT, 'client/src/style.css');
const THEME_DEFAULT = join(ROOT, 'packages/client/src/theme/themes/default.ts');
const THEME_DARK = join(ROOT, 'packages/client/src/theme/themes/dark.ts');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

/** Tokens que DEVEM existir em ambos os lados (CSS var + RGB string). */
const TOKEN_WHITELIST = new Set([
  'text-primary', 'text-secondary', 'text-secondary-alt', 'text-tertiary',
  'text-warning', 'text-destructive',
  'ring-primary',
  'header-primary', 'header-hover', 'header-button-hover',
  'surface-active', 'surface-active-alt', 'surface-hover', 'surface-hover-alt',
  'surface-primary', 'surface-primary-alt', 'surface-primary-contrast',
  'surface-secondary', 'surface-secondary-alt', 'surface-tertiary', 'surface-tertiary-alt',
  'surface-dialog', 'surface-submit', 'surface-submit-hover',
  'surface-destructive', 'surface-destructive-hover', 'surface-chat',
  'border-light', 'border-medium', 'border-medium-alt', 'border-heavy', 'border-xheavy',
  'border-destructive',
  'brand-purple', 'presentation',
  // [EXT] Navvia brand
  'brand',
]);

/** Tokens shadcn utilitários: em CSS são HSL, em themes/*.ts são RGB.
 * Validamos só presença em ambos os lados (sem comparar valor — exigiria
 * conversão HSL↔RGB). */
const SHADCN_UTIL_TOKENS = new Set([
  'background', 'foreground', 'card', 'card-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'destructive-foreground', 'border', 'input', 'ring',
]);

/** Tokens que só vivem em style.css (cores semânticas utilitárias, fontes, raios). */
const STYLE_ONLY_WHITELIST = new Set([
  // shadcn não-mapeados em themes (destructive em HSL, switch, charts)
  'destructive', 'switch-unchecked',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
  // tipografia + raios + spacing
  'radius', 'row-h', 'ui-font', 'msg-font', 'space',
  'font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl',
  'markdown-font-size',
  // paleta base
  'white', 'black',
  'gray-20', 'gray-50', 'gray-100', 'gray-200', 'gray-300', 'gray-400', 'gray-500',
  'gray-600', 'gray-700', 'gray-800', 'gray-850', 'gray-900',
  'green-50', 'green-100', 'green-200', 'green-300', 'green-400', 'green-500',
  'green-600', 'green-700', 'green-800', 'green-900', 'green-950',
  'red-50', 'red-100', 'red-200', 'red-300', 'red-400', 'red-500',
  'red-600', 'red-700', 'red-800', 'red-900', 'red-950',
  'amber-50', 'amber-100', 'amber-200', 'amber-300', 'amber-400', 'amber-500',
  'amber-600', 'amber-700', 'amber-800', 'amber-900', 'amber-950',
  'gizmo-gray-500', 'gizmo-gray-600', 'gizmo-gray-950',
  // Navvia brand (vai entrar na Fase 1)
  'brand', 'brand-soft', 'brand-fg', 'brand-grad-start', 'brand-grad-end',
  'siri-a', 'siri-b', 'siri-c',
]);

/** Drifts pré-existentes do upstream que serão resolvidos em alguma fase.
 * Cada entrada: `${token}:${scope}` (scope ∈ html|dark). Quando resolvermos,
 * remover daqui. Fase 1 já resolveu os 5 que existiam no baseline. */
const KNOWN_BASELINE_DRIFT = new Set([]);

function extractCssVars(css, selector) {
  // Captura o bloco { ... } depois do seletor exato (ex.: ':root', 'html', '.dark', '.gizmo')
  const re = new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`);
  const m = css.match(re);
  if (!m) return {};
  const block = m[1];
  const vars = {};
  for (const line of block.split('\n')) {
    const mv = line.match(/--([a-z0-9-]+):\s*([^;]+);/i);
    if (mv) vars[mv[1].trim()] = mv[2].trim();
  }
  return vars;
}

function extractThemeRgb(tsSrc) {
  // Captura entries do tipo 'rgb-text-primary': '26 29 33'
  const out = {};
  const re = /['"]rgb-([a-z0-9-]+)['"]\s*:\s*['"]([^'"]+)['"]/gi;
  let m;
  while ((m = re.exec(tsSrc)) !== null) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function rgbStringToHex(rgb) {
  // "26 29 33" -> "#1a1d21"
  const parts = rgb.split(/\s+/).map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return '#' + parts.map((n) => n.toString(16).padStart(2, '0')).join('');
}

function hexToRgbString(hex) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1];
  return `${parseInt(h.substr(0, 2), 16)} ${parseInt(h.substr(2, 2), 16)} ${parseInt(h.substr(4, 2), 16)}`;
}

function resolveVarRef(value, allVars) {
  // Resolve `var(--gray-800)` recursivamente até chegar num hex literal
  let v = value.trim();
  let depth = 0;
  while (v.startsWith('var(') && depth < 5) {
    const m = v.match(/^var\(--([a-z0-9-]+)\)$/i);
    if (!m) break;
    const next = allVars[m[1]];
    if (next == null) return null;
    v = next.trim();
    depth++;
  }
  return v;
}

const issues = [];
function err(msg) { issues.push({ level: 'error', msg }); }
function warn(msg) { issues.push({ level: 'warn', msg }); }

if (!existsSync(STYLE_CSS)) {
  err(`style.css não encontrado em ${STYLE_CSS}`);
} else if (!existsSync(THEME_DEFAULT) || !existsSync(THEME_DARK)) {
  err(`theme/themes/{default,dark}.ts não encontrados`);
} else {
  const css = readFileSync(STYLE_CSS, 'utf8');
  const tsDefault = readFileSync(THEME_DEFAULT, 'utf8');
  const tsDark = readFileSync(THEME_DARK, 'utf8');

  const rootVars = extractCssVars(css, ':root');
  const htmlVars = extractCssVars(css, 'html');
  const darkVars = extractCssVars(css, '\\.dark');
  const gizmoVars = extractCssVars(css, '\\.gizmo');

  const themeDefault = extractThemeRgb(tsDefault);
  const themeDark = extractThemeRgb(tsDark);

  function checkScope(scope, cssScope, themeScope) {
    for (const tok of TOKEN_WHITELIST) {
      // CSS scope: html/.dark vence; se ausente, cai para :root (tokens base universais).
      const cssVal = cssScope[tok] != null ? cssScope[tok] : rootVars[tok];
      const themeVal = themeScope[tok];
      const known = KNOWN_BASELINE_DRIFT.has(`${tok}:${scope}`);

      if (cssVal == null && themeVal == null) continue;
      if (cssVal == null) {
        const fn = known ? warn : err;
        fn(`[${scope}] token "${tok}" presente em themes/${scope === 'html' ? 'default' : 'dark'}.ts (${themeVal}) mas ausente em style.css${known ? ' (baseline conhecido)' : ''}`);
        continue;
      }
      if (themeVal == null) {
        const fn = known ? warn : err;
        fn(`[${scope}] token "${tok}" presente em style.css (${cssVal}) mas ausente em themes/${scope === 'html' ? 'default' : 'dark'}.ts${known ? ' (baseline conhecido)' : ''}`);
        continue;
      }
      const resolved = resolveVarRef(cssVal, { ...rootVars, ...cssScope });
      const expectedRgb = resolved && resolved.startsWith('#') ? hexToRgbString(resolved) : null;
      if (expectedRgb && expectedRgb !== themeVal) {
        err(`[${scope}] token "${tok}" divergente: style.css→${resolved} (rgb ${expectedRgb}) vs themes→${themeVal}`);
      }
    }
    // Shadcn utility: só validar presença em ambos
    for (const tok of SHADCN_UTIL_TOKENS) {
      const cssVal = cssScope[tok];
      const themeVal = themeScope[tok];
      if (cssVal == null && themeVal != null) err(`[${scope}] shadcn util "${tok}" presente em themes mas ausente em style.css`);
      if (themeVal == null && cssVal != null) err(`[${scope}] shadcn util "${tok}" presente em style.css mas ausente em themes`);
    }
  }
  checkScope('html', htmlVars, themeDefault);
  checkScope('dark', darkVars, themeDark);

  // Tokens em html/dark que não estão em nenhuma whitelist — possível esquecimento
  const allKnown = new Set([...TOKEN_WHITELIST, ...SHADCN_UTIL_TOKENS, ...STYLE_ONLY_WHITELIST]);
  for (const tok of Object.keys(htmlVars)) {
    if (!allKnown.has(tok)) warn(`token "${tok}" em style.css html não está em nenhuma whitelist (atualize check-token-drift.mjs?)`);
  }
  for (const tok of Object.keys(themeDefault)) {
    if (!TOKEN_WHITELIST.has(tok) && !SHADCN_UTIL_TOKENS.has(tok)) warn(`token "rgb-${tok}" em default.ts não está em nenhuma whitelist`);
  }
}

const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');

if (warns.length) {
  console.log(`${YELLOW}⚠  ${warns.length} aviso(s):${RESET}`);
  for (const w of warns) console.log(`   ${w.msg}`);
}
if (errors.length) {
  console.log(`${RED}✗  ${errors.length} erro(s) de drift de tokens:${RESET}`);
  for (const e of errors) console.log(`   ${e.msg}`);
  console.log(`\n${RED}Falhou.${RESET} Sincronize style.css ↔ theme/themes/*.ts.`);
  process.exit(1);
}

console.log(`${GREEN}✓  Tokens sincronizados (style.css ↔ themes/*.ts).${RESET}`);
process.exit(0);
