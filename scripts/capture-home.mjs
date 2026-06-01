import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();

// PRODUTO
const prodCtx = await browser.newContext({ viewport: VIEWPORT });
const prodPage = await prodCtx.newPage();
await prodPage.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await prodPage.waitForSelector('input[name="email"]', { timeout: 20000 });
await prodPage.fill('input[name="email"]', EMAIL);
await prodPage.fill('input[name="password"]', PASSWORD);
await prodPage.click('button[type="submit"]');
await prodPage.waitForURL(/\/home/, { timeout: 20000 });
await prodPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await prodPage.waitForTimeout(2000);

// LIGHT
await prodPage.evaluate(() => {
  localStorage.setItem('color-theme', 'light');
  document.documentElement.classList.remove('dark');
});
await prodPage.waitForTimeout(800);
await prodPage.screenshot({ path: '/tmp/home-prod-light.png', fullPage: false });
console.log('✓ home-prod-light.png');

// DARK
await prodPage.evaluate(() => {
  localStorage.setItem('color-theme', 'dark');
  document.documentElement.classList.add('dark');
});
await prodPage.waitForTimeout(800);
await prodPage.screenshot({ path: '/tmp/home-prod-dark.png', fullPage: false });
console.log('✓ home-prod-dark.png');

// PROTÓTIPO
const protoCtx = await browser.newContext({ viewport: VIEWPORT });
const protoPage = await protoCtx.newPage();
await protoPage.goto(PROTO, { waitUntil: 'domcontentloaded' });

await protoPage.evaluate(() => document.documentElement.classList.remove('dark'));
await protoPage.evaluate(() => window.showView?.('home'));
await protoPage.waitForTimeout(800);
await protoPage.screenshot({ path: '/tmp/home-proto-light.png', fullPage: false });
console.log('✓ home-proto-light.png');

await protoPage.evaluate(() => document.documentElement.classList.add('dark'));
await protoPage.waitForTimeout(500);
await protoPage.screenshot({ path: '/tmp/home-proto-dark.png', fullPage: false });
console.log('✓ home-proto-dark.png');

await browser.close();
