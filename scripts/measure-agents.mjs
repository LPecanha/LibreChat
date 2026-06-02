/**
 * Mede dimensões reais dos componentes da /agents em ambos para garantir
 * que estamos com paridade dos CSS computed.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';
const V = { width: 1440, height: 900 };

async function inspect(page, sel) {
  return await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 30),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bg: cs.backgroundColor,
      color: cs.color,
      pad: cs.padding,
      bord: cs.borderRadius,
      fs: cs.fontSize,
      fw: cs.fontWeight,
      flexDir: cs.flexDirection,
      gap: cs.gap,
    };
  }, sel);
}

const b = await chromium.launch();

const prod = await (await b.newContext({ viewport: V, locale: 'pt-BR' })).newPage();
await prod.goto(`${APP}/login`);
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload();
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/);
await prod.waitForTimeout(1500);
await prod.goto(`${APP}/agents`);
await prod.evaluate(() => { localStorage.setItem('color-theme', 'light'); document.documentElement.classList.remove('dark'); });
await prod.waitForTimeout(2500);

const proto = await (await b.newContext({ viewport: V, locale: 'pt-BR' })).newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.remove('dark'));
await proto.evaluate(() => window.showView?.('agents'));
await proto.waitForTimeout(800);

const CHECKS = [
  { name: 'h1', protoSel: '#view-agents h1', prodSel: 'main h1' },
  { name: 'subtitle', protoSel: '#view-agents > div > div:first-child p', prodSel: 'main h1 + p' },
  { name: 'create button', protoSel: '#view-agents button.bg-brand', prodSel: 'main button.bg-brand' },
  { name: 'sub-tab active', protoSel: '#view-agents .border-brand[class*="font-semibold"]', prodSel: 'main button.border-brand' },
  { name: 'chip active', protoSel: '#view-agents .chip.active', prodSel: 'main [role="tab"][aria-selected="true"]' },
  { name: 'chip first', protoSel: '#view-agents .chip:not(.active)', prodSel: 'main [role="tab"][aria-selected="false"]' },
  { name: 'agent-card (proto only)', protoSel: '#view-agents .agent-card', prodSel: 'main .agent-card' },
];

console.log('═══════════════ COMPARAÇÃO DE TAMANHOS ═══════════════\n');
for (const c of CHECKS) {
  const a = await inspect(proto, c.protoSel);
  const b2 = await inspect(prod, c.prodSel);
  console.log(`▸ ${c.name}`);
  console.log(`  proto: ${a ? `${a.tag} "${a.text}" ${a.w}×${a.h} pad=${a.pad} bg=${a.bg} fs=${a.fs}` : 'NOT FOUND'}`);
  console.log(`  prod:  ${b2 ? `${b2.tag} "${b2.text}" ${b2.w}×${b2.h} pad=${b2.pad} bg=${b2.bg} fs=${b2.fs}` : 'NOT FOUND'}`);
  if (a && b2) {
    const diffs = [];
    if (Math.abs(a.w - b2.w) > 4) diffs.push(`w:${a.w}/${b2.w}`);
    if (Math.abs(a.h - b2.h) > 4) diffs.push(`h:${a.h}/${b2.h}`);
    if (a.pad !== b2.pad) diffs.push(`pad`);
    if (a.bg !== b2.bg) diffs.push(`bg`);
    if (a.fs !== b2.fs) diffs.push(`fs`);
    if (a.flexDir !== b2.flexDir) diffs.push(`flexDir:${a.flexDir}/${b2.flexDir}`);
    console.log(`  ${diffs.length ? '⚠ ' + diffs.join(' · ') : '✓'}`);
  }
  console.log();
}

await b.close();
