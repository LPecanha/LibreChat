/**
 * Abre Chromium headed mode com produto (logado em /home) e protótipo
 * lado a lado em duas janelas. Mantém aberto até Ctrl+C para inspeção
 * manual via DevTools.
 */
import { chromium } from 'playwright';

const APP = 'http://localhost:3090';
const PROTO = 'http://localhost:8765/ui-preview.html';
const EMAIL = 'teste@navvia.com.br';
const PASSWORD = 'NavviaTest2026!';

const browser = await chromium.launch({
  headless: false,
  devtools: true,
  args: ['--window-size=900,1000', '--auto-open-devtools-for-tabs'],
});

// Produto — esquerda
const prodCtx = await browser.newContext({
  viewport: { width: 900, height: 900 },
  locale: 'pt-BR',
});
const prod = await prodCtx.newPage();
await prod.goto(`${APP}/login`);
await prod.evaluate(() => localStorage.setItem('i18nextLng', 'pt-BR'));
await prod.reload();
await prod.waitForSelector('input[name="email"]');
await prod.fill('input[name="email"]', EMAIL);
await prod.fill('input[name="password"]', PASSWORD);
await prod.click('button[type="submit"]');
await prod.waitForURL(/\/home/);
await prod.evaluate(() => {
  localStorage.setItem('color-theme', 'dark');
  document.documentElement.classList.add('dark');
});
console.log('✓ Produto: http://localhost:3090/home (DEVTOOLS aberto)');

// Protótipo — direita
const protoCtx = await browser.newContext({
  viewport: { width: 900, height: 900 },
  locale: 'pt-BR',
});
const proto = await protoCtx.newPage();
await proto.goto(PROTO);
await proto.evaluate(() => document.documentElement.classList.add('dark'));
await proto.evaluate(() => window.showView?.('home'));
console.log('✓ Protótipo: http://localhost:8765/ui-preview.html (DEVTOOLS aberto)');

console.log('\nNavegadores abertos para inspeção manual. Ctrl+C para fechar.');
await new Promise(() => {}); // mantém vivo
