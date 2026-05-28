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

  console.log('\nDONE →', OUT);
  await browser.close();
})();
