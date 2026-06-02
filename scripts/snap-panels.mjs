/** Captura screenshot de cada panel aberto pra validação visual. */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const TARGETS = ['Meus Arquivos', 'Memórias', 'Favoritos', 'Servidores MCP'];

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

for (const target of TARGETS) {
  await p.goto(`${APP}/home`);
  await p.waitForTimeout(700);
  const coord = await p.evaluate((label) => {
    const sb = document.querySelector('aside.sidebar-main');
    const el = Array.from(sb.querySelectorAll('.lib-item')).find((b) => (b.textContent || '').trim().startsWith(label));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, target);
  if (!coord) continue;
  await p.mouse.click(coord.x, coord.y);
  await p.waitForTimeout(1200);
  const slug = target.replace(/[ \/]/g, '-').toLowerCase();
  await p.screenshot({ path: `/tmp/panel-${slug}.png`, fullPage: false });
  console.log(`✓ panel-${slug}.png`);
}

await b.close();
