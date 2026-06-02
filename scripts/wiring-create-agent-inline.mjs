/**
 * E2E: clicar "+ Criar agente" em /agents deve ABRIR aside builder na mesma página
 * (sem navegar pra /c/new).
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text().slice(0, 250)}`); });

await p.goto(`${APP}/login`);
await p.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await p.reload();
await p.waitForSelector('input[name="email"]');
await p.fill('input[name="email"]', EMAIL);
await p.fill('input[name="password"]', PASSWORD);
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(2000);

await p.goto(`${APP}/agents`);
await p.waitForTimeout(2500);

const beforeURL = p.url();
console.log('URL antes do click:', beforeURL.replace(APP, ''));

const headerBtn = await p.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /Criar agente/i.test((b.textContent || '').trim()));
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
if (!headerBtn) { console.log('✗ button not found'); await b.close(); process.exit(1); }
await p.mouse.click(headerBtn.x, headerBtn.y);
await p.waitForTimeout(1500);

const afterURL = p.url();
const state = await p.evaluate(() => ({
  hasBuilderAside: !!document.querySelector('aside[aria-label*="Criar" i]'),
  hasCriarNovoAgente: /Criar Novo Agente/i.test(document.body.innerText),
}));
console.log('URL após click:', afterURL.replace(APP, ''));
console.log('Permaneceu em /agents?', afterURL.includes('/agents') ? '✓' : '✗ NAVEGOU');
console.log('Builder aside visível?', state.hasBuilderAside ? '✓' : '✗');
console.log('Texto "Criar Novo Agente" presente?', state.hasCriarNovoAgente ? '✓' : '✗');

await p.screenshot({ path: '/tmp/create-agent-inline.png', fullPage: false });

if (errors.length) {
  console.log('\n⚠ Errors:');
  errors.slice(0, 5).forEach((e) => console.log('  ' + e));
}

await b.close();
