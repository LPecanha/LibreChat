import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
await p.goto('http://localhost:3090/login');
await p.fill('input[name="email"]', 'teste@navvia.com.br');
await p.fill('input[name="password"]', 'NavviaTest2026!');
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(2000);

const accountBtn = await p.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('aside button')).find((b) => /teste@navvia/.test(b.textContent || ''));
  const r = btn?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
await p.mouse.click(accountBtn.x, accountBtn.y);
await p.waitForTimeout(400);
const cfgBtn = await p.evaluate(() => {
  const cfg = Array.from(document.querySelectorAll('.menu-item')).find((b) => /Configura/i.test(b.textContent || ''));
  const r = cfg?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
await p.mouse.click(cfgBtn.x, cfgBtn.y);
await p.waitForTimeout(700);

const info = await p.evaluate(() => {
  const out = { tabs: [], panels: [] };
  document.querySelectorAll('[role="tab"]').forEach((t) => out.tabs.push({ text: (t.textContent || '').trim().slice(0, 20), state: t.getAttribute('data-state'), value: t.getAttribute('data-value') }));
  document.querySelectorAll('[role="tabpanel"]').forEach((t) => out.panels.push({ state: t.getAttribute('data-state'), value: t.getAttribute('data-value'), hidden: t.hasAttribute('hidden'), text: (t.textContent || '').trim().slice(0, 40) }));
  return out;
});
console.log(JSON.stringify(info, null, 2));

// Click Chat
console.log('\n→ Clicking Chat tab');
await p.evaluate(() => {
  const t = Array.from(document.querySelectorAll('[role="tab"]')).find((el) => (el.textContent || '').trim().startsWith('Chat'));
  t?.click();
});
await p.waitForTimeout(700);

const info2 = await p.evaluate(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((t) => ({ text: (t.textContent || '').trim().slice(0, 20), state: t.getAttribute('data-state') }));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]')).map((t) => ({ state: t.getAttribute('data-state'), hidden: t.hasAttribute('hidden'), text: (t.textContent || '').trim().slice(0, 40) }));
  return { tabs, panels };
});
console.log(JSON.stringify(info2, null, 2));

await b.close();
