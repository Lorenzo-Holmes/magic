'use strict';
// UI-00..03 acceptance. Later tasks append tests instead of claiming full V4.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const mode = process.argv.includes('--baseline') ? 'before' : 'foundation';
const baseURL = process.env.FS_UI_BASE_URL || 'http://127.0.0.1:4317';
assert.equal(new URL(baseURL).hostname,'127.0.0.1','Only isolated local previews are allowed');
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
const probes = require('./ui-v4-probes.cjs');
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
  await page.waitForFunction(()=>[...document.querySelectorAll('#app img[src]')].every(i=>i.complete&&i.naturalWidth>0));
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
    for(const [w,h] of [[390,844],[320,568],[360,800],[430,932],[768,1024],[1280,900]]) await capture(state,w,h);
  }
  await restore('practice');await page.setViewportSize({width:390,height:844});
  if(mode!=='before'){
    assert.equal(await page.locator('[data-ui-shell]').getAttribute('data-surface'),'light','Practice shell should share the light shell with atlas/inventory/character');
    const runBeforeAppearance=await page.evaluate(()=>localStorage.getItem('feisheng.run.v1'));
    await page.locator('[data-ui="nav-panel"][data-id="character"]').click();
    const ids=['jade-sword','cloud-lotus','herbal-sage','jade-healer'];
    report.appearance=[];
    for(const id of ids){
      await page.locator('[data-ui="appearance-open"]').click();
      const rawBefore=await page.evaluate(()=>localStorage.getItem('feisheng.appearance.v1'));
      await page.locator(`[data-ui="appearance-preview"][data-id="${id}"]`).click();
      assert.equal(await page.locator(`[data-ui="appearance-preview"][data-id="${id}"]`).getAttribute('aria-pressed'),'true');
      assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.appearance.v1')),rawBefore,'Preview persisted unexpectedly');
      const previewSrc=await page.locator('.ui-appearance-preview img').getAttribute('src');assert.ok(previewSrc.includes(id));
      await page.locator('[data-ui="appearance-confirm"]').click();
      const src=await page.locator('.v4-character-standing').getAttribute('src');assert.ok(src.includes(id));
      assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),runBeforeAppearance);
      const file=`character-${id}-390x844.png`;await page.screenshot({path:path.join(out,file)});report.screenshots.push(file);
      await page.locator('[data-ui="nav-panel"][data-id="practice"]').click();
      await page.waitForFunction(()=>{const i=document.querySelector('.pr-seated');return i?.complete&&i.naturalWidth>0;});
      const seated=await page.locator('.pr-seated').getAttribute('src');assert.ok(seated.includes(id)&&seated.includes('-seated.webp'));
      assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),runBeforeAppearance);
      const practiceFile=`practice-${id}-390x844.png`;await page.screenshot({path:path.join(out,practiceFile)});report.screenshots.push(practiceFile);
      report.appearance.push({id,src,seated,saveUnchanged:true});
      await page.locator('[data-ui="nav-panel"][data-id="character"]').click();
    }
    await page.reload();await page.locator('[data-ui="continue"]').click();await page.locator('[data-ui="nav-panel"][data-id="character"]').click();
    assert.ok((await page.locator('.v4-character-standing').getAttribute('src')).includes('jade-healer'));
    assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),runBeforeAppearance);
    report.appearancePersistence=true;
    await page.locator('[data-ui="nav-panel"][data-id="practice"]').click();
  }
  for(const tab of ['atlas','inventory','character']){
    await page.locator(`[data-ui="nav-panel"][data-id="${tab}"]`).click();await capture(tab,390,844);
  }
  await page.locator('[data-ui="nav-panel"][data-id="inventory"]').click();await page.locator('[data-ui="forge"]').click();await capture('forge',390,844);
  if(mode!=='before'){
    report.routes=[];
    for(const name of ['practice','immortal-five-slots','creation']){
      await restore(name);
      const raw=await page.evaluate(()=>localStorage.getItem('feisheng.run.v1'));
      const context=await page.locator('[data-ui-shell]').getAttribute('data-context');
      for(const tab of ['character','inventory','practice'])await page.locator(`[data-ui="nav-panel"][data-id="${tab}"]`).click();
      assert.equal(await page.locator('[data-ui-shell]').getAttribute('data-context'),context);
      assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),raw);
      assert.equal(await page.locator('[data-ui-nav="unified"]').count(),1);
      report.routes.push({name,context,readOnly:true});
    }
    await page.locator('[data-ui="world-return"]').click();
    assert.equal(await page.locator('[data-ui-shell]').getAttribute('data-context'),'immortal');
    await page.locator('[data-ui="mortal-summary"]').click();
    assert.equal(await page.locator('[data-ui-shell]').getAttribute('data-context'),'mortal');
    await page.locator('[data-ui="immortal-continue"]').click();
    assert.equal(await page.locator('[data-ui-shell]').getAttribute('data-context'),'immortal');
    report.explicitReturns=true;
    await restore('journey');
    const journey=await page.evaluate(()=>localStorage.getItem('feisheng.run.v1'));
    await page.locator('[data-ui="nav-panel"][data-id="character"]').click();
    assert.ok(await page.locator('[data-action="journey-resolve"]').count());
    assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),journey);
    report.journeyCannotBeBypassed=true;
    await restore('immortal-five-slots');
    await page.setViewportSize({width:390,height:844});
    await page.locator('.evolution-build summary').click();
    report.contrast=await probes.contrast(page,'.ui-document .immortal-view h2,.ui-document .immortal-goal b,.ui-document .story-lead,.ui-document .immortal-actions button,.ui-document .immortal-actions .button-note,.ui-document .slot-row button');
    assert.ok(report.contrast.length>20);
    for(const c of report.contrast){assert.ok(c.flatOpaqueSurface,`Unmeasured texture behind ${c.text}`);assert.equal(c.opacity,1);assert.ok(c.ratio>=4.5,`Low contrast ${c.ratio}: ${c.text}`);assert.ok(c.font>=12);}
    report.hits=await probes.hitTargets(page,'.evolution-build button,.event-sheet button,.ui-navigation button');
    for(const h of report.hits)assert.ok(h.w>=43.9&&h.h>=43.9&&h.inside&&h.points.every(Boolean),`Hit test failed: ${JSON.stringify(h)}`);
    await page.locator('.evolution-build summary').click();
    await page.locator('[data-action="immortal-evolution-cultivate"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'immortal-actions-390.png')});report.screenshots.push('immortal-actions-390.png');
    const expected=await page.evaluate(()=>FSEngine.serialize(FSEngine.transition(FSEngine.deserialize(localStorage.getItem('feisheng.run.v1')),{type:'immortal-evolution-cultivate'})));
    await page.locator('[data-action="immortal-evolution-cultivate"]').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),expected);
    report.gameActionStillUsesReducer=true;
    await page.locator('[data-journal-source="immortal"] summary').click();
    assert.ok((await page.locator('[data-journal-source="immortal"]').innerText()).includes('仙界第'));
    await page.locator('.topbar [data-ui="settings"]').click();
    assert.equal(await page.locator('dialog[open]').getAttribute('data-surface'),'light');
    await page.locator('dialog [data-ui="close-dialog"]').click();
    await page.waitForFunction(()=>document.activeElement?.dataset.ui==='settings');
    report.dialogSurfaceAndFocus=true;
    await page.goto(require('node:url').pathToFileURL(path.join(root,'tools/ui-v4-gallery.html')).href);
    await page.setViewportSize({width:1000,height:960});
    const gallery=await probes.contrast(page,'.ui-gallery button,.ui-gallery .ui-button-note,.ui-gallery [role="alert"]');
    for(const c of gallery)assert.ok(c.ratio>=4.5&&c.opacity===1&&c.flatOpaqueSurface,`Gallery ${c.text}: ${c.ratio}`);
    report.gallery={checks:gallery.length,passed:true};
    await page.screenshot({path:path.join(out,'component-gallery.png'),fullPage:true});report.screenshots.push('component-gallery.png');
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.passed=true;
})().catch(e=>{report.error=e.stack;process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(base,mode+'-latest.json'),JSON.stringify({out,passed:report.passed}));
  console.log(JSON.stringify({out,mode,passed:report.passed,screenshots:report.screenshots.length,error:report.error},null,2));
});
