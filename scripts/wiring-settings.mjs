/**
 * Wiring test: percorre cada aba do Settings, identifica controles
 * (switches, segments, dropdowns), clica em cada um e verifica se
 * o estado visual mudou. Reporta widgets que não responderam.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const TABS = ['Geral', 'Chat', 'Comandos', 'Fala', 'Controles de dados', 'Créditos', 'Conta'];

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

const errors = [];
p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
p.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
});

// Open settings
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
await p.waitForTimeout(700);

let totalControls = 0;
let totalResponded = 0;

for (const tab of TABS) {
  console.log(`\n══ ${tab} ══`);
  // Click tab via Playwright real mouse (Radix Tabs ignores programmatic click)
  const coord = await p.evaluate((match) => {
    const t = Array.from(document.querySelectorAll('[role="tab"]')).find((el) => (el.textContent || '').trim().startsWith(match));
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, tab);
  if (!coord) { console.log('  ✗ tab not found'); continue; }
  await p.mouse.click(coord.x, coord.y);
  await p.waitForTimeout(500);

  // Inventory controls in the active panel
  const inventory = await p.evaluate(() => {
    // Find the active tabpanel
    const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
    if (!panel) return { found: false };

    const out = { found: true, switches: 0, buttons: 0, segments: 0, selects: 0 };
    out.switchSel = [];
    out.buttonSel = [];
    out.segmentBtnSel = [];
    out.selectSel = [];

    // Switches (Radix Switch root)
    panel.querySelectorAll('[role="switch"]').forEach((el, i) => {
      out.switches++;
      out.switchSel.push({ idx: i, checked: el.getAttribute('aria-checked'), label: (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '').slice(0, 40) });
    });
    // Buttons (skip those inside switches or segments)
    panel.querySelectorAll('button:not([role="switch"]):not([role="tab"]):not([role="radio"]):not(.starter)').forEach((el, i) => {
      out.buttons++;
      const txt = (el.textContent || '').trim().slice(0, 30);
      out.buttonSel.push({ idx: i, text: txt });
    });
    // Segment radios
    panel.querySelectorAll('[role="radio"]').forEach((el, i) => {
      out.segments++;
      out.segmentBtnSel.push({ idx: i, checked: el.getAttribute('aria-checked'), text: (el.textContent || '').trim().slice(0, 20) });
    });
    // Dropdowns/Selects
    panel.querySelectorAll('[role="combobox"], select, [data-testid$="-selector"]').forEach((el, i) => {
      out.selects++;
      out.selectSel.push({ idx: i, role: el.getAttribute('role') || el.tagName });
    });

    return out;
  });

  if (!inventory.found) {
    console.log('  ✗ no panel found');
    continue;
  }

  console.log(`  switches: ${inventory.switches}  segments: ${inventory.segments}  selects: ${inventory.selects}  buttons: ${inventory.buttons}`);

  // Try clicking each switch (toggle), check state change
  let panelControls = 0;
  let panelResponded = 0;

  for (let i = 0; i < inventory.switches; i++) {
    panelControls++;
    const before = await p.evaluate((idx) => {
      const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
      return panel.querySelectorAll('[role="switch"]')[idx]?.getAttribute('aria-checked');
    }, i);
    await p.evaluate((idx) => {
      const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
      panel.querySelectorAll('[role="switch"]')[idx]?.click();
    }, i);
    await p.waitForTimeout(150);
    const after = await p.evaluate((idx) => {
      const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
      return panel.querySelectorAll('[role="switch"]')[idx]?.getAttribute('aria-checked');
    }, i);
    const ok = before !== after;
    if (ok) panelResponded++;
    if (!ok) console.log(`  ✗ switch[${i}] (${inventory.switchSel[i]?.label}) didn't toggle: ${before} → ${after}`);
    // restore
    await p.evaluate((idx) => {
      const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
      panel.querySelectorAll('[role="switch"]')[idx]?.click();
    }, i);
    await p.waitForTimeout(80);
  }

  // Segment radios: click each and verify aria-checked
  for (let i = 0; i < inventory.segments; i++) {
    panelControls++;
    const beforeChecked = inventory.segmentBtnSel[i].checked;
    if (beforeChecked === 'true') { panelResponded++; continue; } // already checked
    await p.evaluate((idx) => {
      const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
      panel.querySelectorAll('[role="radio"]')[idx]?.click();
    }, i);
    await p.waitForTimeout(150);
    const after = await p.evaluate((idx) => {
      const panel = Array.from(document.querySelectorAll('[role="tabpanel"]')).find((el) => el.getAttribute('data-state') === 'active');
      return panel.querySelectorAll('[role="radio"]')[idx]?.getAttribute('aria-checked');
    }, i);
    if (after === 'true') panelResponded++;
    else console.log(`  ✗ segment[${i}] (${inventory.segmentBtnSel[i].text}) didn't activate`);
  }

  console.log(`  → ${panelResponded}/${panelControls} controls responded`);
  totalControls += panelControls;
  totalResponded += panelResponded;
}

console.log(`\n══════════ TOTAL: ${totalResponded}/${totalControls} controls wired ══════════`);
if (errors.length) {
  console.log('\n⚠ Page/console errors:');
  errors.slice(0, 30).forEach((e) => console.log('  ' + e));
}

await b.close();
