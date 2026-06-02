/**
 * Wiring test do Agent Builder aside.
 * Inventaria + exercita cada controle do form e verifica que o estado interno responde.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'pt-BR' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errs.push(`[console.error] ${m.text().slice(0, 200)}`); });

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

/* Open builder */
const btn = await p.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((b) => /Criar agente/i.test((b.textContent || '').trim()));
  const r = b?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
await p.mouse.click(btn.x, btn.y);
await p.waitForTimeout(1500);

/* Inventário */
console.log('═══════ INVENTÁRIO DE CAMPOS NO BUILDER ═══════\n');
const inv = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  if (!aside) return { error: 'aside not found' };
  const out = {
    inputs: [],
    textareas: [],
    selects: [],
    switches: [],
    buttons: [],
    comboboxes: [],
  };
  aside.querySelectorAll('input').forEach((el) => {
    if (el.type !== 'hidden') out.inputs.push({
      type: el.type,
      name: el.name || el.getAttribute('name') || el.placeholder || el.id || '?',
      placeholder: el.placeholder || '',
      checked: el.type === 'checkbox' ? el.checked : null,
    });
  });
  aside.querySelectorAll('textarea').forEach((el) => {
    out.textareas.push({ name: el.name || el.placeholder || '?', placeholder: el.placeholder });
  });
  aside.querySelectorAll('select').forEach((el) => out.selects.push(el.name || el.id || '?'));
  aside.querySelectorAll('[role="switch"]').forEach((el) => out.switches.push({
    label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '?',
    checked: el.getAttribute('aria-checked') === 'true',
  }));
  aside.querySelectorAll('[role="combobox"]').forEach((el) => out.comboboxes.push({
    label: el.getAttribute('aria-label') || '?',
    value: (el.textContent || '').trim().slice(0, 30),
  }));
  aside.querySelectorAll('button').forEach((el) => {
    const txt = (el.textContent || '').trim();
    if (txt && txt.length < 40) out.buttons.push(txt);
  });
  return out;
});

console.log(`Inputs:     ${inv.inputs.length}`);
inv.inputs.forEach((i) => console.log(`  · ${i.type.padEnd(8)} "${i.name}" ph="${i.placeholder}"`));
console.log(`\nTextareas:  ${inv.textareas.length}`);
inv.textareas.forEach((t) => console.log(`  · "${t.name}" ph="${t.placeholder}"`));
console.log(`\nComboboxes: ${inv.comboboxes.length}`);
inv.comboboxes.forEach((c) => console.log(`  · "${c.label}" value="${c.value}"`));
console.log(`\nSwitches:   ${inv.switches.length}`);
inv.switches.forEach((s) => console.log(`  · "${s.label}" checked=${s.checked}`));
console.log(`\nButtons:    ${inv.buttons.length}`);
inv.buttons.forEach((b) => console.log(`  · "${b}"`));

/* Test typing into Nome */
console.log('\n═══════ TESTE 1: digitar Nome ═══════');
const nomeInput = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const i = Array.from(aside.querySelectorAll('input')).find((el) => /nome/i.test(el.placeholder || ''));
  if (!i) return null;
  const r = i.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
if (nomeInput) {
  await p.mouse.click(nomeInput.x, nomeInput.y);
  await p.keyboard.type('Agente Teste');
  await p.waitForTimeout(400);
  const val = await p.evaluate(() => {
    const aside = document.querySelector('aside[aria-label*="Criar" i]');
    const i = Array.from(aside.querySelectorAll('input')).find((el) => /nome/i.test(el.placeholder || ''));
    return i?.value;
  });
  console.log(`Nome value: "${val}" ${val === 'Agente Teste' ? '✓' : '✗'}`);
}

/* Test typing into Descrição */
console.log('\n═══════ TESTE 2: digitar Descrição ═══════');
const descInput = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const t = Array.from(aside.querySelectorAll('input, textarea')).find((el) => /descreva|descri/i.test(el.placeholder || ''));
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), tag: t.tagName };
});
if (descInput) {
  await p.mouse.click(descInput.x, descInput.y);
  await p.keyboard.type('Agente para testar wiring');
  await p.waitForTimeout(400);
  const val = await p.evaluate(() => {
    const aside = document.querySelector('aside[aria-label*="Criar" i]');
    const t = Array.from(aside.querySelectorAll('input, textarea')).find((el) => /descreva|descri/i.test(el.placeholder || ''));
    return t?.value;
  });
  console.log(`Descrição value: "${val?.slice(0, 40)}" ${val?.includes('wiring') ? '✓' : '✗'}`);
}

/* Test typing into Instruções */
console.log('\n═══════ TESTE 3: digitar Instruções ═══════');
const instr = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const t = Array.from(aside.querySelectorAll('textarea')).find((el) => /instru/i.test(el.placeholder || ''));
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
if (instr) {
  await p.mouse.click(instr.x, instr.y);
  await p.keyboard.type('Sistema prompt teste.');
  await p.waitForTimeout(400);
  const val = await p.evaluate(() => {
    const aside = document.querySelector('aside[aria-label*="Criar" i]');
    const t = Array.from(aside.querySelectorAll('textarea')).find((el) => /instru/i.test(el.placeholder || ''));
    return t?.value;
  });
  console.log(`Instruções value: "${val?.slice(0, 40)}" ${val?.includes('teste') ? '✓' : '✗'}`);
}

/* Test capacity checkboxes (Executar código, Busca na web, etc) */
console.log('\n═══════ TESTE 4: toggle Capacidades ═══════');
const caps = await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  return Array.from(aside.querySelectorAll('input[type="checkbox"]')).map((c, i) => ({
    idx: i,
    checked: c.checked,
    parent: c.closest('label')?.textContent?.trim().slice(0, 30) || '?',
  }));
});
console.log(`Found ${caps.length} checkboxes`);
caps.forEach((c) => console.log(`  · [${c.idx}] "${c.parent}" checked=${c.checked}`));

if (caps.length > 0) {
  // Click first non-disabled
  await p.evaluate(() => {
    const aside = document.querySelector('aside[aria-label*="Criar" i]');
    const c = aside.querySelectorAll('input[type="checkbox"]')[0];
    c?.click();
  });
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => {
    const aside = document.querySelector('aside[aria-label*="Criar" i]');
    return aside.querySelectorAll('input[type="checkbox"]')[0]?.checked;
  });
  console.log(`Toggled checkbox[0]: ${after ? '✓ now checked' : '✗ still unchecked'}`);
}

/* Scroll aside to see more fields */
console.log('\n═══════ Scrolling aside to inspect bottom ═══════');
await p.evaluate(() => {
  const aside = document.querySelector('aside[aria-label*="Criar" i]');
  const scroller = aside.querySelector('[class*="overflow-y-auto"]') || aside;
  scroller.scrollTop = 9999;
});
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/builder-bottom.png', fullPage: false });

if (errs.length) {
  console.log('\n⚠ Errors:');
  errs.slice(0, 10).forEach((e) => console.log('  ' + e));
}

await b.close();
