'use strict';
// Visual evidence only. All saves belong to an isolated, disposable context.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const url = process.argv[2] || 'https://magic.1106314996.workers.dev/';
const allowed = new Set(['https://magic.1106314996.workers.dev', 'http://127.0.0.1:4317']);
assert.ok(allowed.has(new URL(url).origin), 'Unexpected preview origin');
const folders = [path.join(root, 'node_modules/playwright')];
const cache = path.join(root, '.cache/npm/_npx');
if (fs.existsSync(cache)) for (const name of fs.readdirSync(cache)) folders.push(path.join(cache, name, 'node_modules/playwright'));
const installed = folders.find(p => fs.existsSync(path.join(p, 'package.json')));
assert.ok(installed, 'Install local Playwright first; no download is attempted');
const base = path.join(root, 'output/cultivation-review');
fs.mkdirSync(base, {recursive:true});
const out = fs.mkdtempSync(path.join(base, url.startsWith('https:') ? 'online-' : 'local-'));
let browser, page;
const report = {url, out, screenshots:[], errors:[], requests:[], states:[], scope:'Isolated browser; does not read or modify the user profile'};
async function capture(name, width, height) {
  await page.setViewportSize({width,height});
  await page.waitForFunction(() => Array.from(document.querySelectorAll('img[src]')).every(i => i.complete), null, {timeout:20000});
  await page.waitForTimeout(500);
  const file = path.join(out, `${name}-${width}x${height}.png`);
  await page.screenshot({path:file,fullPage:false});
  report.screenshots.push(file);
  report.states.push(await page.evaluate(() => ({title:document.title,version:window.FSScenes?.VERSION,
    phase:JSON.parse(localStorage.getItem('feisheng.run.v1'))?.phase, screen:document.querySelector('.game-shell')?.dataset.screen,
    viewport:[innerWidth,innerHeight], scrollWidth:document.documentElement.scrollWidth,
    controls:Array.from(document.querySelectorAll('main button')).map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent.trim(),aria:el.getAttribute('aria-label'),action:el.dataset.action,ui:el.dataset.ui,rect:[r.x,r.y,r.width,r.height]};})})));
}
(async()=>{
 browser=await require(installed).chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 page=await context.newPage(); page.setDefaultTimeout(20000);
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.requests.push({url:r.url(),status:r.status()});});
 const response=await page.goto(url); report.status=response.status();
 report.headers=await response.allHeaders();
 await capture('home',390,844);
 await page.locator('[data-ui="new"]').click();
 for(let i=0;i<3;i++)await page.locator('[data-action="select"]').nth(i).click();
 await page.locator('[data-action="confirm-talents"]').click();
 await page.locator('[data-action="preset"][data-id="balanced"]').click();
 await page.locator('[data-action="enter"]').click();
 await capture('arrival',390,844);
 await page.locator('[data-action="cultivate-to-ready"]').click();
 await capture('encounter',390,844);
 await page.locator('[data-action="resolve"][data-choice="flee"]').click();
 for(const [w,h]of [[390,844],[320,568],[1280,900]])await capture('practice',w,h);
 report.completed=true;
})().catch(e=>{report.error=e.stack;process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({out,completed:report.completed,status:report.status,screenshots:report.screenshots,errors:report.errors,error:report.error},null,2));
});
