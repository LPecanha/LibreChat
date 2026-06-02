import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const PAGES = [
  { path: '/files',     slug: 'files' },
  { path: '/memories',  slug: 'memories' },
  { path: '/bookmarks', slug: 'bookmarks' },
  { path: '/mcp',       slug: 'mcp' },
];

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await p.goto(`${APP}/login`);
await p.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await p.reload();
await p.waitForSelector('input[name="email"]');
await p.fill('input[name="email"]', EMAIL);
await p.fill('input[name="password"]', PASSWORD);
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(1500);

for (const pg of PAGES) {
  await p.goto(`${APP}${pg.path}`);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `/tmp/page-${pg.slug}.png`, fullPage: false });
  console.log(`✓ page-${pg.slug}.png`);
}

await b.close();
