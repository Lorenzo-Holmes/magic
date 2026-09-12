'use strict';
// Local design acceptance with synthetic, validated saves in a disposable
// browser context. This script never connects to the user's browser profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),E=require('../src/engine.js'),D=require('../src/data.js'),J=require('../src/journey.js');
const cache=path.join(root,'.cache/npm/_npx');
const candidates=[path.join(root,'node_modules/playwright'),...fs.readdirSync(cache).map(x=>path.join(cache,x,'node_modules/playwright'))];
const installed=candidates.find(p=>fs.existsSync(path.join(p,'package.json')));assert.ok(installed,'Project-local Playwright missing');
const evidence=path.join(root,'output/cultivation-review');fs.mkdirSync(evidence,{recursive:true});
const out=fs.mkdtempSync(path.join(evidence,'acceptance-'));
const report={passed:false,scope:'isolated local source candidate; validated synthetic fixtures; not a physical phone test',out,checks:[],errors:[]};
let browser,page,expectedFailure=false;
let initial=E.createRun(12,null,{journey:true});for(const id of initial.offer.slice(0,3))initial=E.transition(initial,{type:'select',id});initial=E.transition(initial,{type:'confirm-talents'});initial=E.transition(initial,{type:'enter'});
const encounter=E.transition(initial,{type:'cultivate-to-ready'}),calm=E.transition(encounter,{type:'resolve',choice:'flee'});
const ready=E.deserialize(E.serialize(calm));ready.xp=D.REALMS[ready.realm].threshold;ready.journey.foundation[ready.realm]=J.required(ready.realm);E.validate(ready);assert.ok(E.canBreak(ready));
const wounded=E.deserialize(E.serialize(calm));wounded.vitality=25;E.validate(wounded);
async function restore(state){
  const raw=E.serialize(state);await page.evaluate(raw=>localStorage.setItem('feisheng.run.v1',raw),raw);
  await page.reload();await page.locator('[data-ui="continue"]').click();
  await page.waitForFunction(()=>document.querySelector('.practice-room'));
  await page.waitForFunction(()=>document.querySelector('.pr-landscape').complete);
}
async function inspect(label){
  const details=await page.evaluate(()=>{
    const room=document.querySelector('.practice-room'),primary=room.querySelector('.pr-main-action'),r=primary.getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect(),nav=document.querySelector('.v3-hud').getBoundingClientRect();
    const failures=[];
    if(r.left<0||r.top<0||r.right>innerWidth||r.bottom>nav.top||r.width<44||r.height<44)failures.push('Primary action clipped or too small');
    if(!primary.disabled)for(const [x,y]of [[.5,.5],[.25,.5],[.75,.5],[.5,.25],[.5,.75]]){const hit=document.elementFromPoint(r.left+r.width*x,r.top+r.height*y);if(!primary.contains(hit))failures.push('Primary hit failed');}
    for(const el of room.querySelectorAll('.pr-action-dock button,.pr-header button,.pr-room-tools>button')){
      const b=el.getBoundingClientRect();if(b.width<44||b.height<44||b.bottom>nav.top+1||b.left<-.5||b.right>innerWidth+.5)failures.push(el.textContent.trim());
    }
    return{viewport:[innerWidth,innerHeight],primary:[r.x,r.y,r.width,r.height],mainBottom:main.bottom,navTop:nav.top,documentWidth:document.documentElement.scrollWidth,failures};
  });
  report.checks.push({label,...details});assert.deepEqual(details.failures,[],label);
  assert.ok(details.mainBottom<=details.navTop+1&&details.documentWidth<=details.viewport[0]+1,label);
  await page.screenshot({path:path.join(out,label+'.png')});
}
(async()=>{
  browser=await require(installed).chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>{if(!expectedFailure)report.errors.push(r.url());});
  await page.goto('http://127.0.0.1:4317/');await restore(calm);
  const raw=await page.evaluate(()=>localStorage.getItem('feisheng.run.v1'));
  for(const [w,h]of [[320,568],[360,800],[390,844],[430,932],[768,1024],[1280,900]]){await page.setViewportSize({width:w,height:h});await inspect(`practice-${w}x${h}`);}
  await page.setViewportSize({width:320,height:568});
  await page.locator('.pr-affairs summary').click();
  for(const ui of ['atlas','forge','spirit-beast','journal']){const target=page.locator('.pr-affairs [data-ui="'+ui+'"]');await target.click({trial:true});}
  await page.keyboard.press('Escape');assert.equal(await page.locator('.pr-affairs[open]').count(),0);
  await page.locator('.pr-affairs summary').click();
  await page.locator('[data-ui="practice-pills"]').click();assert.equal(await page.evaluate(()=>FSUIV3.getState('bagFilter')),'pills');assert.equal(await page.locator('.v3-baggage-window').count(),1);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('practice-focus')),false);
  await page.locator('[data-ui="nav-panel"][data-id="practice"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),raw);report.navigationReadOnly=true;
  await page.evaluate(()=>document.querySelector('[data-ui-generation="v3"]').style.setProperty('--v3-safe-bottom','34px'));await inspect('practice-320x568-inset34');
  await restore(ready);await inspect('breakthrough-ready-320x568');
  await page.locator('[data-action="breakthrough"]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('feisheng.run.v1')).phase),'draft');report.breakthrough=true;
  await restore(encounter);assert.ok(await page.locator('.pr-main-action').isDisabled());assert.ok(await page.locator('[data-action="cultivate-to-ready"]').isDisabled());
  await page.screenshot({path:path.join(out,'encounter-320x568.png')});
  await page.locator('[data-action="resolve"][data-choice="flee"]').click();assert.equal(await page.locator('.pr-encounter').count(),0);report.blockingEncounter=true;
  await restore(wounded);assert.ok((await page.locator('.pr-scene-caption').innerText()).includes('元气有损'));report.woundedVisible=true;
  const animations=await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest?.('.practice-room')&&a.playState==='running').length);assert.equal(animations,0);report.reducedMotion=true;
  expectedFailure=true;await page.route('**/assets/ui-v3/scenes/character.webp',route=>route.abort());await restore(calm);
  assert.equal(await page.locator('.pr-stage.pr-no-art').count(),1);
  await page.locator('.pr-main-action').click();assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('feisheng.run.v1')).revision)>calm.revision);report.artFailureStillOperable=true;
  assert.deepEqual(report.errors,[]);report.passed=true;
})().catch(async e=>{report.error=e.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}).finally(async()=>{if(browser)await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});
