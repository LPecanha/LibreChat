/**
 * Diff produto vs protótipo página a página.
 * Para cada rota: captura screenshot + extrai principais elementos.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const VIEWPORT = { width: 1440, height: 900 };
const OUT = '/tmp/pages-diff';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'home',     route: '/home',         proto: 'home',     focus: 'h1, .stat, .siri-hero, .lib-item' },
  { name: 'chat',     route: '/c/new',        proto: 'chat',     focus: 'h1, .siri, .starter, .chip' },
  { name: 'agents',   route: '/agents',       proto: 'agents',   focus: 'h1, .agent-card, .marketplace-header' },
  { name: 'prompts',  route: '/prompts/new',  proto: 'prompts',  focus: 'h1, .prompt-card' },
  { name: 'skills',   route: '/skills',       proto: 'skills',   focus: 'h1, .skill-card' },
];

async function pull(page, sel) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      cls: el.className?.slice(0, 70) ?? '',
      text: el.textContent?.trim().slice(0, 60) ?? '',
      fs: cs.fontSize,
      fw: cs.fontWeight,
      color: cs.color,
      bg: cs.backgroundColor,
      bord: cs.borderColor,
      pad: cs.padding,
      rad: cs.borderRadius,
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.x),
      y: Math.round(r.y),
    };
  }, sel);
}

async function login(page) {
  await page.goto(`${APP}/login`);
  await page.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
  await page.reload();
  await page.waitForSelector('input[name="email"]');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(home|c|agents)/, { timeout: 20000 });
  await page.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
  await page.waitForTimeout(800);
}

const browser = await chromium.launch();
const prodCtx = await browser.newContext({ viewport: VIEWPORT, locale: 'pt-BR' });
const prod = await prodCtx.newPage();
await login(prod);

const protoCtx = await browser.newContext({ viewport: VIEWPORT, locale: 'pt-BR' });
const proto = await protoCtx.newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.remove('dark'));
await proto.waitForTimeout(500);

for (const p of PAGES) {
  console.log(`\n══════════ ${p.name.toUpperCase()} ══════════`);
  console.log(`route: ${p.route}  ·  proto: #view-${p.proto}`);

  // Produto
  try {
    await prod.goto(`${APP}${p.route}`, { waitUntil: 'domcontentloaded' });
    await prod.waitForTimeout(2500);
    await prod.screenshot({ path: join(OUT, `${p.name}-prod.png`), fullPage: false });
    console.log(`  ✓ ${p.name}-prod.png`);
  } catch (e) {
    console.log(`  ✗ prod failed: ${e.message}`);
  }

  // Protótipo
  try {
    await proto.evaluate((n) => window.showView?.(n), p.proto);
    await proto.waitForTimeout(700);
    await proto.screenshot({ path: join(OUT, `${p.name}-proto.png`), fullPage: false });
    console.log(`  ✓ ${p.name}-proto.png`);
  } catch (e) {
    console.log(`  ✗ proto failed: ${e.message}`);
  }

  // Diff inventário
  for (const sel of p.focus.split(', ')) {
    const a = await pull(proto, `#view-${p.proto} ${sel}`);
    const b = await pull(prod, sel);
    if (!a && !b) continue;
    if (!a) { console.log(`  · ${sel.padEnd(20)} proto: -          prod: ${b.tag}.${b.cls.slice(0, 30)} (${b.w}×${b.h})`); continue; }
    if (!b) { console.log(`  · ${sel.padEnd(20)} proto: ${a.tag}.${a.cls.slice(0, 30)} (${a.w}×${a.h})  prod: MISSING`); continue; }
    const diffs = [];
    if (a.fs !== b.fs) diffs.push(`fs:${a.fs}/${b.fs}`);
    if (a.fw !== b.fw) diffs.push(`fw:${a.fw}/${b.fw}`);
    if (a.color !== b.color) diffs.push(`color:${a.color}/${b.color}`);
    if (a.bg !== b.bg) diffs.push(`bg:${a.bg}/${b.bg}`);
    if (a.rad !== b.rad) diffs.push(`rad:${a.rad}/${b.rad}`);
    if (Math.abs(a.w - b.w) > 30) diffs.push(`w:${a.w}/${b.w}`);
    console.log(`  · ${sel.padEnd(20)} ${diffs.length === 0 ? '✓' : diffs.join(' ')}`);
  }
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
