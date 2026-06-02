import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const V = { width: 1440, height: 900 };

const b = await chromium.launch();

const prod = await (await b.newContext({ viewport: V, locale: 'pt-BR' })).newPage();
await prod.goto(`${APP}/login`);
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload();
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/);
await prod.waitForTimeout(1500);

for (const [theme, cls] of [['light', false], ['dark', true]]) {
  await prod.evaluate((d) => {
    localStorage.setItem('color-theme', d ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', d);
  }, cls);
  await prod.waitForTimeout(300);
  await prod.goto(`${APP}/agents`, { waitUntil: 'domcontentloaded' });
  await prod.waitForTimeout(2500);
  await prod.screenshot({ path: `/tmp/agents-prod-${theme}.png`, fullPage: false });
  console.log(`✓ agents-prod-${theme}.png`);
}

const proto = await (await b.newContext({ viewport: V, locale: 'pt-BR' })).newPage();
await proto.goto(PROTO);
for (const [theme, cls] of [['light', false], ['dark', true]]) {
  await proto.evaluate((d) => document.documentElement.classList.toggle('dark', d), cls);
  await proto.evaluate(() => window.showView?.('agents'));
  await proto.waitForTimeout(700);
  await proto.screenshot({ path: `/tmp/agents-proto-${theme}.png`, fullPage: false });
  console.log(`✓ agents-proto-${theme}.png`);
}

// Inventory
const prodInv = await prod.evaluate(() => {
  const out = {};
  ['h1', 'h2', '.agent-card', '.category-chip', '.chip', '[role="tab"]', 'input[type="search"], input[placeholder*="esquis"]', 'button'].forEach((sel) => {
    const els = document.querySelectorAll(sel);
    out[sel] = els.length;
  });
  return out;
});
const protoInv = await proto.evaluate(() => {
  const view = document.getElementById('view-agents');
  if (!view) return null;
  const out = {};
  ['h1', '.agent-card', '.category-chip', '.chip', 'input', 'button'].forEach((sel) => {
    out[sel] = view.querySelectorAll(sel).length;
  });
  return out;
});

console.log('\n=== INVENTÁRIO ===');
console.log('Produto:', JSON.stringify(prodInv, null, 2));
console.log('Protótipo:', JSON.stringify(protoInv, null, 2));

await b.close();
