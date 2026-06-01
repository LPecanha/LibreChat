import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await page.goto('http://localhost:3090/login');
await page.fill('input[name="email"]', 'teste@navvia.com.br');
await page.fill('input[name="password"]', 'NavviaTest2026!');
await page.click('button[type="submit"]');
await page.waitForURL(/\/home/);
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const all = document.querySelectorAll('svg[aria-label="Navvia"]');
  const out = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const parent = el.parentElement;
    out.push({
      attrs: { width: el.getAttribute('width'), height: el.getAttribute('height') },
      rect: { w: r.width, h: r.height, x: r.x, y: r.y },
      computed: { display: cs.display, width: cs.width, height: cs.height, transform: cs.transform },
      parentTag: parent?.tagName,
      parentCls: parent?.className,
    });
  }
  return out;
});

console.log(JSON.stringify(info, null, 2));

// Also check NavviaLogo elsewhere (e.g. MobileTopBar)
const mobile = await page.evaluate(() => {
  const m = document.querySelector('header svg, [class*="MobileTop"] svg');
  if (!m) return 'no mobile top';
  const r = m.getBoundingClientRect();
  return { found: true, w: r.width, h: r.height, x: r.x, y: r.y, label: m.getAttribute('aria-label') };
});
console.log('MOBILE:', JSON.stringify(mobile));

await browser.close();
