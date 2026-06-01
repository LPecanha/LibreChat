/**
 * Compara DOM/estilos computados produto vs protótipo lado a lado.
 * Extrai estilos dos principais blocos da Home e reporta diferenças.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const SELECTORS = [
  { name: 'hero-greeting', proto: '#view-home .hero h1', prod: 'h1' },
  { name: 'hero-sub', proto: '#view-home .hero p', prod: 'main p' },
  { name: 'composer', proto: '#view-home .siri-hero', prod: '.siri-hero, [class*="siri"]' },
  { name: 'sidebar', proto: '.sidebar', prod: 'aside, nav[class*="sidebar"]' },
  { name: 'lib-item-first', proto: '.lib-item', prod: '.lib-item' },
];

const CSS_PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height',
  'color', 'background-color', 'background-image',
  'padding', 'margin', 'border-radius', 'box-shadow',
  'width', 'height',
];

async function inspect(page, sel, name) {
  return await page.evaluate(({ sel, props }) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const out = { found: true, text: el.textContent?.slice(0, 80) || '' };
    for (const p of props) out[p] = cs.getPropertyValue(p);
    const rect = el.getBoundingClientRect();
    out._rect = { w: Math.round(rect.width), h: Math.round(rect.height), x: Math.round(rect.x), y: Math.round(rect.y) };
    return out;
  }, { sel, props: CSS_PROPS });
}

const browser = await chromium.launch({ headless: true });

// PRODUTO (logado, light)
const prod = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await prod.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload({ waitUntil: 'domcontentloaded' });
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/, { timeout: 20000 });
await prod.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await prod.waitForTimeout(1500);

// PROTÓTIPO (light, view-home)
const proto = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await proto.goto(PROTO, { waitUntil: 'domcontentloaded' });
await proto.evaluate(() => document.documentElement.classList.remove('dark'));
await proto.evaluate(() => window.showView?.('home'));
await proto.waitForTimeout(800);

console.log('\n=== COMPARAÇÃO HOME (light, pt-BR) ===\n');

for (const s of SELECTORS) {
  const protoData = await inspect(proto, s.proto, s.name);
  const prodData = await inspect(prod, s.prod, s.name);
  console.log(`\n── ${s.name}`);
  console.log(`  proto: ${s.proto}  → found=${protoData.found}  text="${protoData.text || ''}"`);
  console.log(`  prod:  ${s.prod}   → found=${prodData.found}   text="${prodData.text || ''}"`);
  if (protoData.found && prodData.found) {
    const diffs = [];
    for (const p of CSS_PROPS) {
      if (protoData[p] !== prodData[p]) diffs.push(`    ${p}\n      proto: ${protoData[p]}\n      prod:  ${prodData[p]}`);
    }
    if (protoData._rect && prodData._rect) {
      const r1 = protoData._rect, r2 = prodData._rect;
      if (Math.abs(r1.w - r2.w) > 20 || Math.abs(r1.h - r2.h) > 20)
        diffs.push(`    rect proto=${r1.w}×${r1.h}@(${r1.x},${r1.y}) prod=${r2.w}×${r2.h}@(${r2.x},${r2.y})`);
    }
    if (diffs.length) console.log('  DIFFS:\n' + diffs.join('\n'));
    else console.log('  ✓ idêntico');
  }
}

// Inventory of available selectors in prod for debugging
const prodInv = await prod.evaluate(() => {
  const out = {};
  ['siri-hero','hero','lib-item','tools-grid','stat-card','agent-card','starter','greeting']
    .forEach((cls) => { out[`.${cls}`] = document.querySelectorAll(`.${cls}`).length; });
  out['h1'] = Array.from(document.querySelectorAll('h1')).map(e => e.textContent?.slice(0, 60));
  return out;
});
console.log('\n=== INVENTÁRIO PRODUTO (counts/classes) ===');
console.log(JSON.stringify(prodInv, null, 2));

const protoInv = await proto.evaluate(() => {
  const out = {};
  ['siri-hero','hero','lib-item','tools-grid','stat-card','agent-card','starter','greeting']
    .forEach((cls) => { out[`.${cls}`] = document.querySelectorAll(`.${cls}`).length; });
  out['h1'] = Array.from(document.querySelectorAll('h1')).map(e => e.textContent?.slice(0, 60));
  return out;
});
console.log('\n=== INVENTÁRIO PROTÓTIPO ===');
console.log(JSON.stringify(protoInv, null, 2));

await browser.close();
