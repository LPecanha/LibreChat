import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1440,height:900},locale:'pt-BR'})).newPage();
await p.goto('http://localhost:3090/login');
await p.fill('input[name="email"]','teste@navvia.com.br');
await p.fill('input[name="password"]','NavviaTest2026!');
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(1500);
await p.goto('http://localhost:3090/c/new');
await p.waitForTimeout(3500);
const data = await p.evaluate(() => {
  // Try to read the recoil atom indirectly
  const dump = window.__RECOIL_DEVTOOLS_EXTENSION_BACKEND__ || {};
  // Capture the model selector text
  const sel = document.querySelector('header button[aria-haspopup], header button[aria-expanded]');
  return {
    selText: sel?.textContent?.trim() ?? null,
    selAria: sel?.getAttribute('aria-label'),
    headerHtml: document.querySelector('header')?.outerHTML?.slice(0, 1500),
  };
});
console.log(JSON.stringify(data, null, 2));
await b.close();
