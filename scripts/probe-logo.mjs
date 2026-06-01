import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const page = await ctx.newPage();
await page.goto(`${APP}/login`);
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/\/home/);
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const out = {};
  out['.sidebar-brand'] = (() => {
    const el = document.querySelector('.sidebar-brand');
    if (!el) return 'NOT FOUND';
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      display: cs.display, padding: cs.padding, height: cs.height,
      w: r.width, h: r.height, x: r.x, y: r.y,
      innerHTML: el.innerHTML.slice(0, 200),
    };
  })();
  out['svg[aria-label="Navvia"]'] = (() => {
    const el = document.querySelector('svg[aria-label="Navvia"]');
    if (!el) return 'NOT FOUND';
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      w: r.width, h: r.height, x: r.x, y: r.y,
      attrs: { width: el.getAttribute('width'), height: el.getAttribute('height') },
    };
  })();
  return out;
});

console.log(JSON.stringify(info, null, 2));

await page.screenshot({ path: '/tmp/logo-debug.png', fullPage: false, clip: { x: 0, y: 0, width: 280, height: 100 } });
await browser.close();
