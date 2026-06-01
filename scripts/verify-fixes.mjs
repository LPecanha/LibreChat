/**
 * Valida os 3 fixes: dark bg, popover opaco, Settings/Files wireados.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

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

/* 1) DARK BG */
await p.evaluate(() => { localStorage.setItem('color-theme', 'dark'); document.documentElement.classList.add('dark'); });
await p.waitForTimeout(500);
const bodyBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('dark body.bg =', bodyBg, '(esperado: rgb(15, 16, 18))');
await p.screenshot({ path: '/tmp/fix-1-dark.png', clip: { x: 0, y: 0, width: 1440, height: 600 } });

/* 2) POPOVER */
await p.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await p.waitForTimeout(500);

const accountBtn = await p.evaluate(() => {
  const sidebar = document.querySelector('aside, [class*="sidebar"]');
  if (!sidebar) return null;
  const btn = Array.from(sidebar.querySelectorAll('button')).find((b) => /teste@navvia|TN/.test(b.textContent || ''));
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
if (accountBtn) {
  await p.mouse.click(accountBtn.x, accountBtn.y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/fix-2-popover.png', clip: { x: 0, y: 600, width: 320, height: 300 } });
  const popBg = await p.evaluate(() => {
    const pop = document.querySelector('.pop');
    return pop ? getComputedStyle(pop).backgroundColor : 'not found';
  });
  console.log('popover.bg =', popBg, '(esperado: rgb(255, 255, 255))');

  /* 3) SETTINGS WIRE */
  // Clica em "Configurações"
  const cfgBtn = await p.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'));
    const cfg = items.find((b) => /Configura|Settings/i.test(b.textContent || ''));
    if (!cfg) return null;
    const r = cfg.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  if (cfgBtn) {
    await p.mouse.click(cfgBtn.x, cfgBtn.y);
    await p.waitForTimeout(700);
    const dialogVisible = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"], .DialogPanel, [class*="DialogPanel"]');
      if (!d) return 'NO DIALOG';
      const r = d.getBoundingClientRect();
      return { found: true, w: Math.round(r.width), h: Math.round(r.height), text: d.textContent?.slice(0, 80) };
    });
    console.log('settings dialog =', JSON.stringify(dialogVisible));
    await p.screenshot({ path: '/tmp/fix-3-settings.png', fullPage: false });
  } else {
    console.log('settings menu-item NOT FOUND');
  }
}

await b.close();
console.log('\nScreenshots: /tmp/fix-1-dark.png, /tmp/fix-2-popover.png, /tmp/fix-3-settings.png');
