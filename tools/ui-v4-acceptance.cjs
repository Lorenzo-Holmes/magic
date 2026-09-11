'use strict';
// UI-00..03 acceptance. Later tasks append tests instead of claiming full V4.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const mode = process.argv.includes('--baseline') ? 'before' : 'foundation';
const baseURL = 'http://127.0.0.1:4317';
const base = path.join(root, 'output/ui-v4-foundation'); fs.mkdirSync(base, { recursive:true });
const out = fs.mkdtempSync(path.join(base, mode + '-'));
const tmp = path.join(root, '.cache/tmp'); fs.mkdirSync(tmp, { recursive:true });
Object.assign(process.env, { TEMP:tmp, TMP:tmp, TMPDIR:tmp });
const cache = path.join(root, '.cache/npm/_npx');
const candidates = [path.join(root, 'node_modules/playwright'), ...(fs.existsSync(cache) ? fs.readdirSync(cache).map(n=>path.join(cache,n,'node_modules/playwright')) : [])];
const installed = candidates.find(p=>fs.existsSync(path.join(p,'package.json')));
assert.ok(installed, 'Project-local Playwright required; no implicit installation');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const states = require('./ui-v4-fixtures.cjs').create();
const report = { scope:'UI-00..03 foundation only; not full V4, ZIP, or physical-device acceptance', mode, out, passed:false, screenshots:[], colors:[], layouts:[], errors:[], failures:[], states:{} };
for (const [name,state] of Object.entries(states)) { const raw=JSON.stringify(state); fs.writeFileSync(path.join(out,name+'.json'),raw);report.states[name]={seed:state.seed,revision:state.revision,sha256:sha(raw)}; }
report.sourceHashes = Object.fromEntries(require('./production-files.cjs').map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
let browser, page;
async function restore(name) {
  await page.goto(baseURL);
  await page.evaluate(raw=>{localStorage.setItem('feisheng.run.v1',raw);localStorage.removeItem('feisheng.meta.v1');},JSON.stringify(states[name]));
  await page.reload(); await page.locator('[data-ui="continue"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#app img[src]')].every(i=>i.complete));
}
async function capture(label,width,height) {
  await page.setViewportSize({width,height});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const sample=await page.evaluate(()=>{
    const main=document.querySelector('main'),nav=document.querySelector('nav[aria-label="主要功能"]');
    const rect=n=>{const r=n?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}:null;};
    const rows=[...document.querySelectorAll('.immortal-view h2,.immortal-subtitle,.immortal-goal b,.story-lead,.immortal-actions button,.immortal-actions .button-note,.ui-recent-journal p,.travel-journal h3')].map(el=>{
      const style=getComputedStyle(el);let parent=el,bg=[],opacity=1;
      while(parent){const s=getComputedStyle(parent);opacity*=Number(s.opacity);if(s.backgroundColor!=='rgba(0, 0, 0, 0)'||s.backgroundImage!=='none')bg.push({tag:parent.tagName,class:parent.className,color:s.backgroundColor,image:s.backgroundImage});parent=parent.parentElement;}
      return {text:el.textContent.trim().slice(0,90),color:style.color,opacity,font:style.fontSize,disabled:el.matches(':disabled'),backgrounds:bg.slice(0,5)};
    });
    return {rows,width:innerWidth,documentWidth:document.documentElement.scrollWidth,main:rect(main),nav:rect(nav),navCount:document.querySelectorAll('nav[aria-label="主要功能"]').length,scrollWidth:main.scrollWidth,clientWidth:main.clientWidth};
  });
  report.colors.push({label,rows:sample.rows});delete sample.rows;report.layouts.push({label,...sample});
  const file=label+'-'+width+'x'+height+'.png';await page.screenshot({path:path.join(out,file),fullPage:false});report.screenshots.push(file);
  if(mode!=='before'){
    assert.ok(sample.documentWidth<=width+1,`${label}: document overflow`);
    assert.ok(sample.scrollWidth<=sample.clientWidth+1,`${label}: main overflow`);
    assert.equal(sample.navCount,1,`${label}: duplicated/missing navigation`);
    assert.ok(sample.main.bottom<=sample.nav.y+1&&sample.nav.bottom<=height+1,`${label}: navigation overlap`);
  }
}
(async()=>{
  browser=await require(installed).chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('requestfailed',r=>report.failures.push(r.url()));
  for(const state of ['practice','immortal-five-slots','creation']) {
    await restore(state);
    for(const [w,h] of [[390,844],[320,568],[1280,900]]) await capture(state,w,h);
  }
  await restore('practice');await page.setViewportSize({width:390,height:844});
  for(const tab of ['atlas','inventory','character']){
    await page.locator(`[data-ui="nav-panel"][data-id="${tab}"]`).click();await capture(tab,390,844);
  }
  await page.locator('[data-ui="nav-panel"][data-id="inventory"]').click();await page.locator('[data-ui="forge"]').click();await capture('forge',390,844);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.passed=true;
})().catch(e=>{report.error=e.stack;process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(base,mode+'-latest.json'),JSON.stringify({out,passed:report.passed}));
  console.log(JSON.stringify({out,mode,passed:report.passed,screenshots:report.screenshots.length,error:report.error},null,2));
});
