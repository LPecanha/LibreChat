/**
 * Diff profundo: extrai estilos de TODOS os elementos visualmente relevantes
 * com seletores corretos. Reporta apenas diffs concretos.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'border', 'border-color', 'border-radius',
  'padding', 'margin', 'box-shadow', 'width', 'height', 'opacity'];

const CHECKS = [
  { name: 'BODY (root font)', proto: 'body', prod: 'body' },
  { name: 'H1 greeting', proto: '#view-home h1', prod: 'h1' },
  { name: 'Hero subtitle <p>', proto: '#view-home .hero p', prod: '.hero p, .banner p' },
  { name: 'Composer container', proto: '#view-home .siri-hero', prod: '.siri-hero' },
  { name: 'Composer textarea', proto: '#view-home .siri-hero textarea', prod: '.siri-hero textarea' },
  { name: 'Plan pill', proto: '#view-home .hero > div > div:first-child', prod: '.hero .rounded-full' },
  { name: 'Stat card', proto: '#view-home .stat', prod: '[class*="stat"]:not(.starter)' },
  { name: 'Tools tile (first)', proto: '#view-home .grid > a, #view-home [class*="tool-tile"], #view-home [class*="rounded-2xl"]', prod: '[class*="tool"], a.rounded-2xl' },
  { name: 'Chip (first)', proto: '#view-home .chip', prod: 'main button[class*="chip"], button:has(span.text-base)' },
  { name: 'Sidebar', proto: '.sidebar', prod: 'div.flex.h-full > div:first-child' },
];

async function pull(page, sel) {
  return await page.evaluate(({ sel, props }) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false, sel };
    const cs = getComputedStyle(el);
    const out = { found: true, sel, text: el.textContent?.slice(0, 60) || '', tag: el.tagName, cls: el.className?.slice(0, 80) };
    for (const p of props) out[p] = cs.getPropertyValue(p);
    const r = el.getBoundingClientRect();
    out._rect = `${Math.round(r.width)}×${Math.round(r.height)}@(${Math.round(r.x)},${Math.round(r.y)})`;
    return out;
  }, { sel, props: PROPS });
}

const browser = await chromium.launch();

const prodCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const prod = await prodCtx.newPage();
await prod.goto(`${APP}/login`);
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload();
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/);
await prod.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await prod.waitForTimeout(1500);

const protoCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const proto = await protoCtx.newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.remove('dark'));
await proto.evaluate(() => window.showView?.('home'));
await proto.waitForTimeout(800);

console.log('═══════════════════ DIFF PROFUNDO ═══════════════════\n');

for (const c of CHECKS) {
  const a = await pull(proto, c.proto);
  const b = await pull(prod, c.prod);

  console.log(`▸ ${c.name}`);
  console.log(`  proto  ${a.found ? `${a.tag}.${(a.cls || '').slice(0, 60)}` : 'NOT FOUND ' + a.sel}`);
  console.log(`  prod   ${b.found ? `${b.tag}.${(b.cls || '').slice(0, 60)}` : 'NOT FOUND ' + b.sel}`);

  if (a.found && b.found) {
    const diffs = [];
    for (const p of PROPS) {
      if (a[p] !== b[p]) diffs.push(`    ${p.padEnd(18)} proto=${a[p]}  ·  prod=${b[p]}`);
    }
    if (diffs.length) console.log('  DIFFS:\n' + diffs.join('\n'));
    else console.log('  ✓');
    console.log(`  size: proto=${a._rect} prod=${b._rect}`);
  }
  console.log();
}

await browser.close();
