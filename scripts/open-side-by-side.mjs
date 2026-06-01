/**
 * Abre duas janelas do Chromium lado-a-lado:
 *   janela esquerda → produto (http://localhost:3090)  já logado em /home
 *   janela direita  → protótipo HTML (http://localhost:8765/ui-preview.html)
 *
 * As janelas ficam abertas para inspeção manual. Pressione Ctrl+C para fechar.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const W = 960, H = 980;

const browser = await chromium.launch({
  headless: false,
  args: [`--window-size=${W},${H}`, `--window-position=20,40`],
});

// PRODUTO
const prodCtx = await browser.newContext({ viewport: { width: W - 20, height: H - 140 }, locale: 'pt-BR' });
const prod = await prodCtx.newPage();
await prod.goto(`${APP}/login`);
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload();
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/, { timeout: 20000 });
await prod.evaluate(() => {
  localStorage.setItem('color-theme', 'light');
  document.documentElement.classList.remove('dark');
});
console.log(`✓ Produto:  ${APP}/home`);

// PROTÓTIPO — segunda janela
const protoBrowser = await chromium.launch({
  headless: false,
  args: [`--window-size=${W},${H}`, `--window-position=${W + 40},40`],
});
const protoCtx = await protoBrowser.newContext({ viewport: { width: W - 20, height: H - 140 }, locale: 'pt-BR' });
const proto = await protoCtx.newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.remove('dark'));
await proto.evaluate(() => window.showView?.('home'));
console.log(`✓ Protótipo: ${PROTO}`);

console.log('\nDuas janelas abertas lado-a-lado. Navegue livremente.');
console.log('Atalhos do protótipo: clique nas tabs do topo (V4, Home, Agents, Chat, ...)');
console.log('No produto: use a sidebar (Início, Agentes, Prompts, etc.)');
console.log('\nPressione Ctrl+C neste terminal para fechar tudo.');

await new Promise(() => {});
