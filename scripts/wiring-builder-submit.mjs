/**
 * E2E final: preenche form mínimo no Builder e clica "Criar".
 * Verifica se POST /api/agents é disparado e se aparece confirmação.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'pt-BR' })).newPage();

const networkLog = [];
p.on('request', (req) => {
  if (req.url().includes('/api/agents') || req.url().includes('/api/agent')) {
    networkLog.push(`→ ${req.method()} ${req.url().replace(APP, '')}`);
  }
});
p.on('response', (res) => {
  if (res.url().includes('/api/agents') || res.url().includes('/api/agent')) {
    networkLog.push(`← ${res.status()} ${res.url().replace(APP, '')}`);
  }
});

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

/* Preencher: name, description, instructions */
await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const name = aside.querySelector('input[name="name"]');
  const desc = aside.querySelector('input[name="description"]');
  const instr = aside.querySelector('textarea[name="instructions"]');
  const nameSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const taSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  if (name) { nameSetter.call(name, 'Teste Wire ' + Date.now().toString().slice(-4)); name.dispatchEvent(new Event('input', { bubbles: true })); }
  if (desc) { nameSetter.call(desc, 'Descrição de teste'); desc.dispatchEvent(new Event('input', { bubbles: true })); }
  if (instr) { taSetter.call(instr, 'Você é um agente de teste wiring.'); instr.dispatchEvent(new Event('input', { bubbles: true })); }
});
await p.waitForTimeout(500);

/* Selecionar modelo (combobox "Selecionar um modelo") */
console.log('═══ Selecionar modelo ═══');
const modelBtn = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const b = Array.from(aside.querySelectorAll('button')).find((b) => /Selecionar um modelo/i.test((b.textContent || '').trim()));
  const r = b?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
if (modelBtn) {
  await p.mouse.click(modelBtn.x, modelBtn.y);
  await p.waitForTimeout(700);
  /* Pegar primeira opção do dropdown */
  const opt = await p.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]'));
    const visible = items.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const first = visible[0];
    if (!first) return null;
    const r = first.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: (first.textContent || '').trim().slice(0, 30) };
  });
  if (opt) {
    await p.mouse.click(opt.x, opt.y);
    await p.waitForTimeout(700);
    console.log(`Selected model: "${opt.text}" ✓`);
  } else {
    console.log('No model options visible');
  }
}

/* Scroll para baixo p/ ver o botão Criar */
await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const sc = aside.querySelector('[class*="overflow-y-auto"]') || aside;
  sc.scrollTop = sc.scrollHeight;
});
await p.waitForTimeout(500);

/* Click Criar */
console.log('\n═══ Click "Criar" ═══');
const submitBtn = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const b = Array.from(aside.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Criar');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), disabled: b.disabled };
});
console.log('Submit button:', submitBtn);
if (submitBtn && !submitBtn.disabled) {
  await p.mouse.click(submitBtn.x, submitBtn.y);
  await p.waitForTimeout(3000);
}

console.log('\nNETWORK:');
networkLog.forEach((l) => console.log('  ' + l));

await p.screenshot({ path: '/tmp/builder-after-submit.png', fullPage: false });

await b.close();
