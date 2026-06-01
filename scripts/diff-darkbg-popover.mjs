/**
 * Diagnóstico dos 3 gaps reportados:
 *   1) Background em dark mode não bate com protótipo
 *   2) Popover do perfil (avatar) com background transparente
 *   3) Settings não wired (não abre)
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

async function login(p) {
  await p.goto(`${APP}/login`);
  await p.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
  await p.reload();
  await p.waitForSelector('input[name="email"]');
  await p.fill('input[name="email"]', EMAIL);
  await p.fill('input[name="password"]', PASSWORD);
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/home/, { timeout: 20000 });
}

const browser = await chromium.launch();

/* 1) DARK BG */
const prodCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const prod = await prodCtx.newPage();
await login(prod);
await prod.evaluate(() => {
  localStorage.setItem('color-theme', 'dark');
  document.documentElement.classList.add('dark');
});
await prod.waitForTimeout(1500);

const protoCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const proto = await protoCtx.newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.add('dark'));
await proto.evaluate(() => window.showView?.('home'));
await proto.waitForTimeout(800);

console.log('═══ DARK BG ═══');
const darkSels = [
  { name: 'html',            sProd: 'html',                                      sProto: 'html' },
  { name: 'body',            sProd: 'body',                                      sProto: 'body' },
  { name: 'root container',  sProd: '#root, [class*="presentation"]:first-child',sProto: '#view-home' },
  { name: 'main area',       sProd: 'main, .h-full > div:nth-child(2)',          sProto: '#view-home .hero' },
  { name: 'sidebar',         sProd: '.sidebar, aside.sidebar',                   sProto: '.sidebar' },
  { name: 'siri-hero',       sProd: '.siri-hero',                                sProto: '#view-home .siri-hero' },
  { name: 'stat',            sProd: '.stat',                                     sProto: '#view-home .stat' },
];

for (const s of darkSels) {
  const a = await proto.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, color: cs.color, bgImg: cs.backgroundImage.slice(0, 60) };
  }, s.sProto);
  const b = await prod.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, color: cs.color, bgImg: cs.backgroundImage.slice(0, 60) };
  }, s.sProd);
  console.log(`▸ ${s.name.padEnd(18)} proto.bg=${a?.bg ?? '-'}   prod.bg=${b?.bg ?? '-'}`);
}

await prod.screenshot({ path: '/tmp/dark-prod.png', fullPage: false });
await proto.screenshot({ path: '/tmp/dark-proto.png', fullPage: false });

/* 2) POPOVER DO PERFIL */
console.log('\n═══ POPOVER DO PERFIL ═══');
await prod.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await prod.waitForTimeout(500);

// Localiza o botão do account/user (na parte de baixo da sidebar)
const accountBtn = await prod.evaluate(() => {
  // Procura o botão com a iniciais "TN" ou que mostre "teste@navvia"
  const sidebar = document.querySelector('aside, [class*="sidebar"]');
  if (!sidebar) return { found: false };
  const candidates = Array.from(sidebar.querySelectorAll('button'));
  const account = candidates.find((b) => /teste@navvia|Teste Navvia|TN/.test(b.textContent || ''));
  if (!account) return { found: false, count: candidates.length };
  const r = account.getBoundingClientRect();
  return { found: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: account.textContent?.slice(0, 60) };
});
console.log('Account button:', JSON.stringify(accountBtn));

if (accountBtn.found) {
  await prod.mouse.click(accountBtn.x, accountBtn.y);
  await prod.waitForTimeout(600);
  await prod.screenshot({ path: '/tmp/popover-open.png', fullPage: false });

  // Inspeciona o popover aberto
  const popover = await prod.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role="menu"], [role="dialog"], [data-radix-popper-content-wrapper], .popover, [class*="popover"], [class*="Popover"]'));
    const visible = els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return visible.map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName, cls: el.className?.slice(0, 80) || '', role: el.getAttribute('role'),
        bg: cs.backgroundColor, opacity: cs.opacity, backdrop: cs.backdropFilter,
        w: Math.round(r.width), h: Math.round(r.height),
      };
    });
  });
  console.log('Popovers visíveis:', JSON.stringify(popover, null, 2));
}

await browser.close();
console.log('\nScreenshots: /tmp/dark-prod.png, /tmp/dark-proto.png, /tmp/popover-open.png');
