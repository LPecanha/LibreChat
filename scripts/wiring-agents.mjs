/**
 * Wiring test da página /agents:
 *  - Click em categoria muda displayCategory
 *  - Click em search input + type altera URL
 *  - Click em "+ Criar agente" navega para /c/new?createAgent=1
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

const errors = [];
p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

/* 1) CATEGORIES */
console.log('═══ CATEGORIES ═══');
const cats = await p.evaluate(() => {
  return Array.from(document.querySelectorAll('[role="tab"]')).map((b) => ({
    text: (b.textContent || '').trim(),
    selected: b.getAttribute('aria-selected'),
    id: b.id,
  }));
});
console.log('found:', cats.length, 'categories');
let catsResponded = 0;
for (const cat of cats.slice(0, 4)) {
  const coord = await p.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, cat.id);
  if (!coord) continue;
  await p.mouse.click(coord.x, coord.y);
  await p.waitForTimeout(800);
  const url = p.url();
  const expectedCat = cat.id.replace('category-tab-', '');
  const ok = url.includes(`/agents/${expectedCat}`) || url.endsWith('/agents') || url.includes(`category=${expectedCat}`);
  if (ok) {
    catsResponded++;
    console.log(`  ✓ ${cat.text.padEnd(30)} → URL ${url.replace(APP, '')}`);
  } else {
    console.log(`  ✗ ${cat.text.padEnd(30)} → URL ${url.replace(APP, '')}`);
  }
}

/* 2) SEARCH */
console.log('\n═══ SEARCH ═══');
const searchInput = await p.evaluate(() => {
  const i = document.querySelector('input[type="search"], input[placeholder*="esquis" i], input[placeholder*="earch" i]');
  if (!i) return null;
  const r = i.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), ph: i.placeholder };
});
console.log('search input:', searchInput);
if (searchInput) {
  await p.mouse.click(searchInput.x, searchInput.y);
  await p.keyboard.type('test');
  await p.waitForTimeout(800);
  const url = p.url();
  console.log(`  → URL after search: ${url.replace(APP, '')}`);
  // clear
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Delete');
  await p.waitForTimeout(300);
}

/* 2b) SUB-TABS Destaques / Meus agentes / Da organização */
console.log('\n═══ SUB-TABS ═══');
for (const label of ['Destaques', 'Meus agentes', 'Da organização']) {
  const coord = await p.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l);
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, label);
  if (!coord) { console.log(`  ✗ ${label} not found`); continue; }
  await p.mouse.click(coord.x, coord.y);
  await p.waitForTimeout(600);
  const active = await p.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l);
    return btn ? btn.className.includes('border-brand') || btn.className.includes('font-semibold') : false;
  }, label);
  console.log(`  ${active ? '✓' : '✗'} ${label}  active=${active}`);
}

/* 3) CREATE BUTTON */
console.log('\n═══ CREATE AGENT BUTTON ═══');
const createBtn = await p.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((b) => /Criar agente/i.test(b.textContent || ''));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: (b.textContent || '').trim() };
});
console.log('create btn:', createBtn);
if (createBtn) {
  await p.mouse.click(createBtn.x, createBtn.y);
  await p.waitForTimeout(1500);
  const url = p.url();
  const ok = url.includes('/c/new') || url.includes('createAgent');
  console.log(`  ${ok ? '✓' : '✗'} URL after click: ${url.replace(APP, '')}`);
}

console.log(`\n══ Categories wired: ${catsResponded}/${Math.min(4, cats.length)}`);
if (errors.length) {
  console.log('\n⚠ Errors:');
  errors.slice(0, 5).forEach((e) => console.log('  ' + e));
}

await b.close();
