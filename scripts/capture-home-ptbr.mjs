import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  locale: 'pt-BR',
});
const page = await ctx.newPage();

await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[name="email"]', { timeout: 20000 });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/\/home/, { timeout: 20000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2000);

// LIGHT
await page.evaluate(() => {
  localStorage.setItem('color-theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/home-prod-ptbr-light.png', fullPage: true });
console.log('✓ home-prod-ptbr-light.png');

// DARK
await page.evaluate(() => {
  localStorage.setItem('color-theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/home-prod-ptbr-dark.png', fullPage: true });
console.log('✓ home-prod-ptbr-dark.png');

await browser.close();
