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
await p.waitForTimeout(2500);

const data = await p.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => /Adicionar servidor/i.test(b.textContent || ''));
  if (!btn) return null;
  const cs = getComputedStyle(btn);
  return {
    bg: cs.backgroundColor,
    bgImage: cs.backgroundImage,
    color: cs.color,
    classNames: btn.className,
  };
});
console.log(JSON.stringify(data, null, 2));

// compare with proto in another tab
const proto = await (await b.newContext({viewport:{width:1440,height:900},locale:'pt-BR'})).newPage();
await proto.goto('http://localhost:8765/ui-preview.html');
await proto.evaluate(()=>window.showView?.('mcp'));
await proto.waitForTimeout(600);
const protoData = await proto.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('#view-mcp button')).find(b => /Adicionar servidor/i.test(b.textContent || ''));
  if (!btn) return null;
  const cs = getComputedStyle(btn);
  return { bg: cs.backgroundColor, bgImage: cs.backgroundImage, color: cs.color };
});
console.log('PROTO:', JSON.stringify(protoData, null, 2));
await b.close();
