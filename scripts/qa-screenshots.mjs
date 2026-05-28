#!/usr/bin/env node
/**
 * QA visual — captura screenshots dos pontos da refactor Navvia.
 * Output: design/dev-snapshots/{nome}.png
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'design', 'dev-snapshots');
mkdirSync(OUT, { recursive: true });

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const VIEWPORT = { width: 1440, height: 900 };

async function login(page) {
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(c|home|agents)\b/, { timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

async function shot(page, name, fullPage = false) {
  const p = join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage });
  console.log(`✓ ${name}.png`);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  console.log('\n--- LIGHT ---');
  /* Screenshot login antes de logar */
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await shot(page, '00-login-light');

  await login(page);
  await page.waitForTimeout(2000);
  /* [EXT] Força navegação para /home — Vite pode não ter HMR-reloaded Startup.tsx */
  await page.goto(`${APP}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await shot(page, '01-home-dashboard-light-viewport', false);
  await shot(page, '01-home-dashboard-light', true);

  await page.goto(`${APP}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await shot(page, '02-chat-landing-light');

  await page.focus('#prompt-textarea').catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '03-composer-focused-light');

  await page.goto(`${APP}/agents`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await shot(page, '04-agents-light', true);

  console.log('\n--- DARK ---');
  await page.evaluate(() => {
    localStorage.setItem('color-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.goto(`${APP}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await shot(page, '05-home-dashboard-dark', true);

  await page.goto(`${APP}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.focus('#prompt-textarea').catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '06-composer-focused-dark');

  console.log('\n--- MOBILE (iPhone 14 Pro 393x852) ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const mob = await mobileCtx.newPage();
  /* re-login no mobile */
  await mob.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await mob.waitForSelector('input[name="email"]', { timeout: 20000 });
  await mob.fill('input[name="email"]', EMAIL);
  await mob.fill('input[name="password"]', PASSWORD);
  await mob.click('button[type="submit"]');
  await mob.waitForURL(/\/(c|home|agents)\b/, { timeout: 20000 });
  await mob.waitForTimeout(2000);
  await mob.goto(`${APP}/home`, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(2500);
  await mob.screenshot({ path: join(OUT, '07-home-mobile.png'), fullPage: false });
  console.log('✓ 07-home-mobile.png');
  await mob.goto(`${APP}/c/new`, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(1500);
  await mob.screenshot({ path: join(OUT, '08-chat-mobile.png'), fullPage: false });
  console.log('✓ 08-chat-mobile.png');

  console.log('\nDONE →', OUT);
  await browser.close();
})();
