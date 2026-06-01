import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[name="email"]', { timeout: 20000 });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

console.log('FINAL URL:', page.url());
console.log('TITLE:', await page.title());
console.log('CONSOLE LOGS:');
logs.slice(-20).forEach((l) => console.log(' ', l));

await page.screenshot({ path: '/tmp/probe-after-login.png', fullPage: false });
await browser.close();
