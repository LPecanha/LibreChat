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
await prod.goto(`${APP}/c/new`);
await prod.waitForTimeout(2000);

for (const theme of ['light', 'dark']) {
  await prod.evaluate((d) => {
    localStorage.setItem('color-theme', d);
    document.documentElement.classList.toggle('dark', d === 'dark');
  }, theme);
  await prod.waitForTimeout(400);
  await prod.screenshot({ path: `/tmp/chat-prod-${theme}.png`, fullPage: false });
  console.log(`✓ chat-prod-${theme}.png`);
}

const proto = await (await b.newContext({ viewport: V, locale: 'pt-BR' })).newPage();
await proto.goto(PROTO);
for (const theme of ['light', 'dark']) {
  await proto.evaluate((d) => document.documentElement.classList.toggle('dark', d === 'dark'), theme);
  await proto.evaluate(() => window.showView?.('chat'));
  await proto.waitForTimeout(600);
  await proto.screenshot({ path: `/tmp/chat-proto-${theme}.png`, fullPage: false });
  console.log(`✓ chat-proto-${theme}.png`);
}

await b.close();
