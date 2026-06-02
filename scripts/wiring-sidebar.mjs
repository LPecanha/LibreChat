/**
 * Wiring sweep da NavviaSidebar.
 * Clica em cada link/botão e reporta o efeito (URL change, modal open, etc.).
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));

await p.goto(`${APP}/login`);
await p.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await p.reload();
await p.waitForSelector('input[name="email"]');
await p.fill('input[name="email"]', EMAIL);
await p.fill('input[name="password"]', PASSWORD);
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(2000);

/* Inventário sidebar */
console.log('═══════ INVENTÁRIO SIDEBAR ═══════\n');
const items = await p.evaluate(() => {
  const sidebar = document.querySelector('aside.sidebar-main, aside[aria-label*="control" i]');
  if (!sidebar) return null;
  const out = { navitems: [], libitems: [], buttons: [], inputs: [] };
  sidebar.querySelectorAll('.navitem, .lib-item').forEach((el) => {
    const cls = el.className.includes('lib-item') ? 'libitems' : 'navitems';
    out[cls].push((el.textContent || '').trim().slice(0, 30));
  });
  sidebar.querySelectorAll('button').forEach((b) => {
    const txt = (b.textContent || '').trim().slice(0, 30);
    if (txt && !out.navitems.includes(txt) && !out.libitems.includes(txt)) {
      out.buttons.push(txt);
    }
  });
  sidebar.querySelectorAll('input').forEach((i) => {
    out.inputs.push(i.placeholder || i.name || '?');
  });
  return out;
});
if (!items) { console.log('Sidebar not found'); process.exit(1); }
console.log('Nav items:', items.navitems);
console.log('Lib items:', items.libitems);
console.log('Buttons:', items.buttons);
console.log('Inputs:', items.inputs);

/* Test each lib-item click */
const LIB_TARGETS = items.libitems;
console.log(`\n═══════ TESTANDO ${LIB_TARGETS.length} LIB-ITEMS ═══════\n`);

const results = [];
for (const target of LIB_TARGETS) {
  /* Reset to /home */
  await p.goto(`${APP}/home`);
  await p.waitForTimeout(800);
  const urlBefore = p.url().replace(APP, '');
  const dialogsBefore = await p.$$eval('[role="dialog"]', (els) => els.length);

  /* Click the item */
  const coord = await p.evaluate((label) => {
    const sb = document.querySelector('aside.sidebar-main');
    const el = Array.from(sb.querySelectorAll('.lib-item')).find((b) => (b.textContent || '').trim().startsWith(label));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, target);

  if (!coord) {
    results.push({ target, status: '✗ not found' });
    continue;
  }

  await p.mouse.click(coord.x, coord.y);
  await p.waitForTimeout(1200);

  const urlAfter = p.url().replace(APP, '');
  const dialogsAfter = await p.$$eval('[role="dialog"]', (els) => els.length);
  const visibleDialog = await p.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    return dialogs.some((d) => {
      const r = d.getBoundingClientRect();
      return r.width > 100 && r.height > 100;
    });
  });

  let status;
  if (urlAfter !== urlBefore && urlAfter !== '/home') {
    status = `✓ navigate → ${urlAfter}`;
  } else if (dialogsAfter > dialogsBefore || visibleDialog) {
    status = `✓ modal opened (${dialogsAfter} dialogs)`;
  } else {
    status = `✗ no effect (url=${urlAfter}, dialogs=${dialogsAfter})`;
  }
  results.push({ target, status });
  console.log(`  ${status.padEnd(40)} · "${target}"`);
}

console.log(`\n═══════ NAV-ITEMS ═══════\n`);
for (const target of items.navitems) {
  await p.goto(`${APP}/home`);
  await p.waitForTimeout(600);
  const urlBefore = p.url().replace(APP, '');
  const coord = await p.evaluate((label) => {
    const sb = document.querySelector('aside.sidebar-main');
    const el = Array.from(sb.querySelectorAll('.navitem')).find((b) => (b.textContent || '').trim().startsWith(label));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, target);
  if (!coord) { console.log(`  ✗ "${target}" not found`); continue; }
  await p.mouse.click(coord.x, coord.y);
  await p.waitForTimeout(800);
  const urlAfter = p.url().replace(APP, '');
  console.log(`  ${urlAfter !== urlBefore ? '✓' : '·'} "${target}" → ${urlAfter}`);
}

console.log(`\n═══════ ACCOUNT POPOVER ═══════\n`);
await p.goto(`${APP}/home`);
await p.waitForTimeout(800);
const accBtn = await p.evaluate(() => {
  const sb = document.querySelector('aside.sidebar-main');
  const b = Array.from(sb.querySelectorAll('button')).find((b) => /teste@navvia/.test(b.textContent || ''));
  const r = b?.getBoundingClientRect();
  return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
});
if (accBtn) {
  await p.mouse.click(accBtn.x, accBtn.y);
  await p.waitForTimeout(500);
  const popItems = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('.pop .menu-item, .menu-item')).map((b) => (b.textContent || '').trim());
  });
  console.log('Popover items:', popItems);
}

if (errs.length) {
  console.log('\n⚠ Errors:');
  errs.slice(0, 5).forEach((e) => console.log('  ' + e));
}

await b.close();
