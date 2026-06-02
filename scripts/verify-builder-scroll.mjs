/**
 * Verifica que o aside Builder é scrollável e que o botão "Criar" é
 * acessível via scroll.
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
await p.waitForTimeout(1500);
await p.goto(`${APP}/agents`);
await p.waitForTimeout(2500);

const btn = await p.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((b) => /Criar agente/i.test((b.textContent || '').trim()));
  const r = b?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
await p.mouse.click(btn.x, btn.y);
await p.waitForTimeout(1500);

const before = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  return {
    scrollHeight: aside?.scrollHeight,
    clientHeight: aside?.clientHeight,
    scrollable: aside ? aside.scrollHeight > aside.clientHeight : false,
    btnCriarVisivel: !!document.querySelector('aside[aria-label*="Criar" i] button')
      && (() => {
        const all = Array.from(document.querySelectorAll('aside[aria-label*="Criar" i] button'));
        const criar = all.find((b) => (b.textContent || '').trim() === 'Criar');
        if (!criar) return false;
        const r = criar.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      })(),
  };
});
console.log('Antes do scroll:', JSON.stringify(before));

await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  if (aside) aside.scrollTop = aside.scrollHeight;
});
await p.waitForTimeout(700);

const after = await p.evaluate(() => {
  const criar = Array.from(document.querySelectorAll('aside[aria-label*="Criar" i] button')).find((b) => (b.textContent || '').trim() === 'Criar');
  if (!criar) return { btnVisivel: false };
  const r = criar.getBoundingClientRect();
  return {
    btnVisivel: r.top >= 0 && r.bottom <= window.innerHeight,
    btnTop: Math.round(r.top),
    btnBottom: Math.round(r.bottom),
    vh: window.innerHeight,
  };
});
console.log('Após scroll:', JSON.stringify(after));

await p.screenshot({ path: '/tmp/builder-scrolled.png', fullPage: false });
await b.close();
