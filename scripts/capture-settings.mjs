import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const b = await chromium.launch();

/* PRODUTO */
const prod = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await prod.goto(`${APP}/login`);
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload();
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/);
await prod.waitForTimeout(2000);
await prod.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await prod.waitForTimeout(500);

const accountBtn = await prod.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('aside button')).find((b) => /teste@navvia/.test(b.textContent || ''));
  const r = btn?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
await prod.mouse.click(accountBtn.x, accountBtn.y);
await prod.waitForTimeout(400);

const cfgBtn = await prod.evaluate(() => {
  const cfg = Array.from(document.querySelectorAll('.menu-item')).find((b) => /Configura/i.test(b.textContent || ''));
  const r = cfg?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
await prod.mouse.click(cfgBtn.x, cfgBtn.y);
await prod.waitForTimeout(800);
await prod.screenshot({ path: '/tmp/settings-prod-light.png', fullPage: false });
console.log('✓ settings-prod-light.png');

/* PROTÓTIPO */
const proto = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.remove('dark'));
await proto.evaluate(() => window.openSettings?.());
await proto.waitForTimeout(600);
await proto.screenshot({ path: '/tmp/settings-proto-light.png', fullPage: false });
console.log('✓ settings-proto-light.png');

/* DARK */
await prod.evaluate(() => { localStorage.setItem('color-theme', 'dark'); document.documentElement.classList.add('dark'); });
await prod.waitForTimeout(400);
await prod.screenshot({ path: '/tmp/settings-prod-dark.png', fullPage: false });
console.log('✓ settings-prod-dark.png');

await proto.evaluate(() => document.documentElement.classList.add('dark'));
await proto.waitForTimeout(400);
await proto.screenshot({ path: '/tmp/settings-proto-dark.png', fullPage: false });
console.log('✓ settings-proto-dark.png');

await b.close();
