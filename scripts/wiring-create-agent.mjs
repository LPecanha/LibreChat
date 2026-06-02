/**
 * E2E wiring test do "+ Criar agente":
 * 1. Login
 * 2. Vai pra /agents
 * 3. Clica em "+ Criar agente"
 * 4. Verifica que está em /c/new com endpoint=agents
 * 5. Verifica que o Agent Builder panel está visível
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text().slice(0, 200)}`); });

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

/* Click "+ Criar agente" no header */
console.log('━━ Click "+ Criar agente" (header) ━━');
const headerBtn = await p.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /Criar agente/i.test((b.textContent || '').trim()));
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
console.log('header button coord:', headerBtn);
if (!headerBtn) { console.log('✗ button not found'); await b.close(); process.exit(1); }

await p.mouse.click(headerBtn.x, headerBtn.y);
await p.waitForTimeout(2000);

const urlAfter = p.url();
console.log('URL after click:', urlAfter.replace(APP, ''));

const endpoint = await p.evaluate(() => {
  // The active conversation should have endpoint=agents now
  // Check the page chrome for any "Agent Builder" / "agents" hint
  const text = document.body.innerText;
  return {
    onChat: text.includes('Nova conversa') || text.includes('New chat') || location.pathname.includes('/c/'),
    hasAgentBuilder: !!(document.querySelector('[aria-label*="Agent Builder" i], [aria-label*="Construtor" i]') || /Agent Builder|Construtor/i.test(text)),
    hasAgentSelectCombobox: !!document.querySelector('[aria-label*="agent" i][role="combobox"], [aria-label*="agente" i][role="combobox"]'),
    sidePanelOpen: !!document.querySelector('[data-panel="agents"], [aria-label*="Agent" i] [role="tabpanel"]'),
  };
});
console.log('Page state:', JSON.stringify(endpoint, null, 2));

await p.screenshot({ path: '/tmp/create-agent-result.png', fullPage: false });
console.log('\nScreenshot: /tmp/create-agent-result.png');

if (errors.length) {
  console.log('\n⚠ Errors:');
  errors.slice(0, 10).forEach((e) => console.log('  ' + e));
}

await b.close();
