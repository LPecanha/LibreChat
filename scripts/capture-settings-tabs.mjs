import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const TABS = [
  { id: 'general',  match: 'Geral' },
  { id: 'chat',     match: 'Chat' },
  { id: 'commands', match: 'Comandos' },
  { id: 'speech',   match: 'Fala' },
  { id: 'data',     match: 'Controles de dados' },
  { id: 'balance',  match: 'Créditos' },
  { id: 'account',  match: 'Conta' },
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
await p.waitForTimeout(2000);
await p.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await p.waitForTimeout(500);

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
await p.waitForTimeout(800);

for (const t of TABS) {
  const trigger = await p.evaluate((match) => {
    const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => (b.textContent || '').trim().startsWith(match));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, t.match);
  if (!trigger) { console.log(`tab ${t.id} NOT FOUND (match='${t.match}')`); continue; }
  await p.mouse.click(trigger.x, trigger.y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/settings-tab-${t.id}.png`, fullPage: false });
  console.log(`✓ settings-tab-${t.id}.png`);
}

await b.close();
