#!/usr/bin/env node
/**
 * QA visual COMPARAÇÃO — produto React vs protótipo HTML lado a lado.
 *
 * Captura cada view nos dois ambientes:
 *  - Protótipo:  http://localhost:8765/ui-preview.html#view-{name}
 *               (usa showView() do JS)
 *  - Produto:    http://localhost:3090/{route}
 *
 * Output: design/dev-snapshots/compare/{view}-{proto|prod}-{theme}.png
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'design', 'dev-snapshots', 'compare');
mkdirSync(OUT, { recursive: true });

const PROTO = 'http://localhost:8765/ui-preview.html';
const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const VIEWPORT = { width: 1440, height: 900 };

const VIEWS = [
  { name: 'home',    protoView: 'home',    prodRoute: '/home' },
  { name: 'agents',  protoView: 'agents',  prodRoute: '/agents' },
  { name: 'chat',    protoView: 'chat',    prodRoute: '/c/new' },
  { name: 'prompts', protoView: 'prompts', prodRoute: '/d/prompts' },
  { name: 'skills',  protoView: 'skills',  prodRoute: '/d/skills' },
  { name: 'memories',protoView: 'memories',prodRoute: '/d/memories' },
];

async function shot(page, name) {
  const p = join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`✓ ${name}.png`);
}

async function login(page) {
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(c|home|agents)\b/, { timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch();

  /* ---- PROTÓTIPO ---- */
  console.log('\n=== PROTÓTIPO HTML ===');
  const protoCtx = await browser.newContext({ viewport: VIEWPORT });
  const protoPage = await protoCtx.newPage();

  // LIGHT
  await protoPage.goto(PROTO, { waitUntil: 'domcontentloaded' });
  await protoPage.evaluate(() => document.documentElement.classList.remove('dark'));
  await protoPage.waitForTimeout(1000);
  for (const v of VIEWS) {
    await protoPage.evaluate((name) => window.showView?.(name), v.protoView);
    await protoPage.waitForTimeout(700);
    await shot(protoPage, `${v.name}-proto-light`);
  }

  // DARK
  await protoPage.evaluate(() => document.documentElement.classList.add('dark'));
  await protoPage.waitForTimeout(500);
  for (const v of VIEWS) {
    await protoPage.evaluate((name) => window.showView?.(name), v.protoView);
    await protoPage.waitForTimeout(700);
    await shot(protoPage, `${v.name}-proto-dark`);
  }

  /* ---- PRODUTO ---- */
  console.log('\n=== PRODUTO REACT ===');
  const prodCtx = await browser.newContext({ viewport: VIEWPORT });
  const prodPage = await prodCtx.newPage();

  // LIGHT
  await login(prodPage);
  await prodPage.evaluate(() => {
    localStorage.setItem('color-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  for (const v of VIEWS) {
    await prodPage.goto(`${APP}${v.prodRoute}`, { waitUntil: 'domcontentloaded' });
    await prodPage.waitForTimeout(2000);
    await shot(prodPage, `${v.name}-prod-light`);
  }

  // DARK
  await prodPage.evaluate(() => {
    localStorage.setItem('color-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  for (const v of VIEWS) {
    await prodPage.goto(`${APP}${v.prodRoute}`, { waitUntil: 'domcontentloaded' });
    await prodPage.waitForTimeout(2000);
    await shot(prodPage, `${v.name}-prod-dark`);
  }

  console.log('\nDONE →', OUT);
  await browser.close();
})();
