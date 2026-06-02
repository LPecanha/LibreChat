import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1440,height:900},locale:'pt-BR'})).newPage();
await p.goto('http://localhost:3090/login');
await p.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await p.reload();
await p.waitForSelector('input[name="email"]');
await p.fill('input[name="email"]','teste@navvia.com.br');
await p.fill('input[name="password"]','NavviaTest2026!');
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(1500);
await p.goto('http://localhost:3090/mcp');
await p.waitForTimeout(2000);

// Click "+ Adicionar servidor"
const ctaCoord = await p.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => /Adicionar servidor/i.test(b.textContent || ''));
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
console.log('CTA coord:', ctaCoord);
if (ctaCoord) {
  await p.mouse.click(ctaCoord.x, ctaCoord.y);
  await p.waitForTimeout(1200);
}

// Check submit button computed bg color
const submitInfo = await p.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return { error: 'no dialog' };
  const btns = Array.from(dialog.querySelectorAll('button'));
  const all = btns.map((b) => ({
    text: (b.textContent || '').trim().slice(0, 30),
    bg: getComputedStyle(b).backgroundColor,
    color: getComputedStyle(b).color,
  }));
  return all;
});
console.log('Dialog buttons:', JSON.stringify(submitInfo, null, 2));

await p.screenshot({path:'/tmp/mcp-modal.png', fullPage: false});
console.log('✓ mcp-modal.png');

await b.close();
