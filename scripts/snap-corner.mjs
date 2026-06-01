import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, locale:'pt-BR' })).newPage();
await p.goto('http://localhost:3090/login');
await p.fill('input[name="email"]','teste@navvia.com.br');
await p.fill('input[name="password"]','NavviaTest2026!');
await p.click('button[type="submit"]');
await p.waitForURL(/\/home/);
await p.waitForTimeout(2000);

await p.evaluate(()=>{localStorage.setItem('color-theme','light');document.documentElement.classList.remove('dark');});
await p.waitForTimeout(500);
await p.screenshot({ path:'/tmp/sidebar-top-light.png', clip:{x:0,y:0,width:280,height:120} });

await p.evaluate(()=>{localStorage.setItem('color-theme','dark');document.documentElement.classList.add('dark');});
await p.waitForTimeout(500);
await p.screenshot({ path:'/tmp/sidebar-top-dark.png', clip:{x:0,y:0,width:280,height:120} });

await b.close();
console.log('done');
