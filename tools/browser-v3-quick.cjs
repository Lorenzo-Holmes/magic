'use strict';
// Focused source-preview acceptance. Uses an isolated browser context and the
// existing local server; it never reads or replaces the user's browser profile.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const baseURL = process.env.FS_UI_BASE_URL || 'http://127.0.0.1:4317';
if(new URL(baseURL).hostname!=='127.0.0.1')throw new Error('Browser quick acceptance only supports isolated local previews.');
const evidenceRoot = path.join(root, 'output/playwright/ui-v3');
fs.mkdirSync(evidenceRoot, { recursive: true });
const out = fs.mkdtempSync(path.join(evidenceRoot, 'quick-'));
const tmp = path.join(root, '.cache/tmp');
fs.mkdirSync(tmp, { recursive: true });
Object.assign(process.env, { TMP: tmp, TEMP: tmp, TMPDIR: tmp });
const candidates = [path.join(root, 'node_modules/playwright')];
const cache = path.join(root, '.cache/npm/_npx');
if (fs.existsSync(cache)) {
  for (const folder of fs.readdirSync(cache)) candidates.push(path.join(cache, folder, 'node_modules/playwright'));
}
const installed = candidates.find(folder => fs.existsSync(path.join(folder, 'package.json')));
if (!installed) throw new Error('Project-local Playwright is required; no implicit install is performed.');
const report = { passed: false, scope: 'isolated source-preview, not ZIP or physical device acceptance', out, checks: [], errors: [], externalRequests: [] };
let browser, page;
async function inspect(label) {
  await page.waitForFunction(()=>[...document.querySelectorAll('img[data-art]')].every(img=>img.complete&&img.naturalWidth>0));
  await page.waitForTimeout(80);
  const result = await page.evaluate(() => {
    const shell = document.querySelector('[data-ui-generation="v3"]');
    if (!shell) throw new Error('V3 shell missing');
    const failures = []; let checked = 0;
    for (const element of shell.querySelectorAll('button:not(:disabled),select:not(:disabled)')) {
      const box = element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1 || getComputedStyle(element).visibility === 'hidden') continue;
      let left = Math.max(0, box.left), right = Math.min(innerWidth, box.right);
      let top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), r = parent.getBoundingClientRect();
        if (/auto|scroll|hidden|clip/.test(style.overflowX)) { left = Math.max(left, r.left); right = Math.min(right, r.right); }
        if (/auto|scroll|hidden|clip/.test(style.overflowY)) { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
      }
      if (right - left < box.width - 1 || bottom - top < box.height - 1) continue;
      checked++;
      const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      if (!hit || !(hit === element || element.contains(hit))) {
        failures.push({ label: element.textContent.trim().slice(0, 60), blockedBy: hit?.className || hit?.tagName || 'none' });
      }
    }
    const main = shell.querySelector('main').getBoundingClientRect(), nav = shell.querySelector('.v3-hud').getBoundingClientRect();
    return { checked, failures, width: innerWidth, height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth, mainBottom: main.bottom, navTop: nav.top, navBottom: nav.bottom,
      activeWindow: FSUIV3.diagnostics().activeWindow };
  });
  report.checks.push({ label, ...result });
  await page.screenshot({ path: path.join(out, `${label.replace(/[^a-z0-9-]/gi, '-')}.png`) });
  assert.ok(result.checked > 0 && !result.failures.length, `${label}: ${JSON.stringify(result)}`);
  assert.ok(result.scrollWidth <= result.width + 1 && result.mainBottom <= result.navTop + 1 && result.navBottom <= result.height + 1, `${label}: viewport/foreground overlap`);
}
async function main() {
  browser = await require(installed).chromium.launch({ channel: 'chrome', headless: true,
    args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('requestfailed', request => report.errors.push(`Request failed: ${request.url()}`));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL) report.externalRequests.push(request.url()); });
  await page.goto(baseURL);
  await page.locator('[data-ui="new"]').click();
  for (let index = 0; index < 3; index++) await page.locator('[data-action="select"]').nth(index).click();
  await page.locator('[data-action="confirm-talents"]').click();
  await page.locator('[data-action="preset"][data-id="balanced"]').click();
  await page.locator('[data-action="enter"]').click();
  await page.locator('[data-action="cultivate-to-ready"]').click();
  await page.locator('[data-action="resolve"][data-choice="flee"]').click();
  const saved = await page.evaluate(() => localStorage.getItem('feisheng.run.v1'));
  for (const [width, height] of [[320,568],[360,800],[390,844],[430,932],[768,1024],[1280,800]]) {
    await page.setViewportSize({ width, height });
    for (const id of ['practice', 'atlas', 'inventory', 'character']) {
      await page.locator(`[data-ui="nav-panel"][data-id="${id}"]`).click();
      await inspect(`${id}-${width}x${height}`);
    }
    await page.locator('[data-ui="nav-panel"][data-id="inventory"]').click();
    await page.locator('[data-ui="forge"]').click();
    await inspect(`forge-${width}x${height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-ui="nav-panel"][data-id="inventory"]').click();
  await page.evaluate(() => document.querySelector('[data-ui-generation="v3"]').style.setProperty('--v3-safe-bottom', '34px'));
  await inspect('inventory-synthetic-inset-34');
  assert.equal(await page.evaluate(() => localStorage.getItem('feisheng.run.v1')), saved, 'Read-only preview changed gameplay');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.externalRequests, []);
  // Decode every installed image, not merely those on the five empty screens.
  report.artworkDecode=await page.evaluate(async()=>{
    const results=[];
    for(const id of FSArt.runtimeIds){const a=FSArtManifest[id],image=new Image();image.src='./'+a.path;await image.decode();results.push({id,width:image.naturalWidth,height:image.naturalHeight,passed:image.naturalWidth===a.width&&image.naturalHeight===a.height});}
    return results;
  });
  const runtimeArtCount=await page.evaluate(()=>FSArt.runtimeIds.length);
  assert.equal(report.artworkDecode.length,runtimeArtCount);assert.ok(report.artworkDecode.every(x=>x.passed));
  await page.locator('[data-ui="nav-panel"][data-id="atlas"]').click();
  const cameraBefore=await page.locator('.v3-map-viewport').getAttribute('data-camera-scale');
  await page.locator('[data-camera="in"]').click();
  assert.ok(Number(await page.locator('.v3-map-viewport').getAttribute('data-camera-scale'))>Number(cameraBefore));
  const mapBox=await page.locator('.v3-map-viewport').boundingBox(),transformBefore=await page.locator('.v3-map-viewport .v3-art-canvas').getAttribute('style');
  await page.mouse.move(mapBox.x+12,mapBox.y+75);await page.mouse.down();await page.mouse.move(mapBox.x+34,mapBox.y+105,{steps:5});await page.mouse.up();
  assert.notEqual(await page.locator('.v3-map-viewport .v3-art-canvas').getAttribute('style'),transformBefore,'Dragging the map did not move its shared canvas');
  await page.locator('[data-camera="reset"]').click();
  for(const id of ['forest','marsh','village','peaks','ruins','canyon']){
    await page.locator('[data-camera="overview"]').click();
    await page.locator(`[data-ui="region"][data-id="${id}"]`).click();
    assert.equal(await page.locator(`[data-ui="region"][data-id="${id}"]`).getAttribute('aria-pressed'),'true');
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),saved);
  report.camera={zoom:true,drag:true,reset:true,sixRegions:true,readOnly:true};
  // A synthetic full-bag fixture is confined to this isolated QA context.
  const fixture=await page.evaluate(()=>{
    const s=FSEngine.deserialize(localStorage.getItem('feisheng.run.v1'));
    s.equipment=FSEquipment.createState();
    FSEquipment.ITEMS.slice(0,11).forEach((d,i)=>s.equipment.inventory.push({uid:'gear-art'+i,id:d.id,identified:true,refinement:0,xp:0}));
    s.equipment.inventory.push({uid:'gear-art11',id:'azure-embryo',identified:true,refinement:0,xp:80});
    s.equipment.slots.weapon='gear-art11';s.equipment.essence=20;
    for(const m of FSCrafting.MATERIALS)s.crafting.materials[m.id]=9;
    s.crafting.pills.qi=[false];FSEngine.validate(s);const raw=FSEngine.serialize(s);localStorage.setItem('feisheng.run.v1',raw);return raw;
  });
  await page.reload();await page.locator('[data-ui="continue"]').click();
  await page.locator('[data-ui="nav-panel"][data-id="character"]').click();
  await page.locator('[data-ui="v3-equipment-slot"][data-id="weapon"]').click();
  assert.equal(await page.locator('[data-equipment-slot="weapon"]').count(),1);
  await page.locator('[data-action="equipment-unequip"][data-id="weapon"]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('feisheng.run.v1')).equipment.slots.weapon),null);
  assert.equal(await page.locator('[data-equipment-slot="weapon"]').count(),1);
  await page.locator('[data-action="equipment-equip"][data-id="gear-art11"]').click();
  await page.locator('dialog [data-ui="close-dialog"]').click();
  await page.locator('[data-ui="nav-panel"][data-id="inventory"]').click();
  assert.equal(await page.locator('[data-ui="v3-bag-select"][data-id^="equipment:"]').count(),12);
  const bagSave=await page.evaluate(()=>localStorage.getItem('feisheng.run.v1'));
  const firstBagId=await page.locator('[data-ui="v3-bag-select"]').nth(0).getAttribute('data-id');
  const secondBagId=await page.locator('[data-ui="v3-bag-select"]').nth(1).getAttribute('data-id');
  assert.notEqual(firstBagId,secondBagId);
  await page.locator('[data-ui="v3-bag-select"]').nth(1).click();
  assert.equal(await page.locator('[data-ui="v3-bag-select"]').nth(1).getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('feisheng.run.v1')),bagSave,'Selecting a treasure cell changed gameplay save');
  await page.locator('.v4-treasure-grid').evaluate(el=>el.scrollTop=el.scrollHeight);
  await inspect('inventory-full-scroll-end');
  await page.locator('[data-ui="forge"]').click();
  await page.locator('[data-ui="v3-forge-select"][data-id="qi"]').click();
  await page.locator('[data-action="craft-pill"][data-id="qi"][data-kind="gentle"]').click();
  const crafted=await page.evaluate(()=>JSON.parse(localStorage.getItem('feisheng.run.v1')));
  assert.equal(crafted.crafting.materials['spirit-herb'],7);assert.equal(crafted.crafting.materials['spirit-dew'],8);assert.equal(crafted.crafting.pills.qi.length,2);
  await inspect('forge-crafted');
  report.liveActions={syntheticFixture:true,fullInventory:12,treasureSelectionReadOnly:true,slotFilter:true,unequip:true,equip:true,craftCosts:true};
  assert.deepEqual(report.errors,[]);
  // Failure injection has a separate context and is not mixed with normal-load errors.
  const failureContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await failureContext.addInitScript(raw=>localStorage.setItem('feisheng.run.v1',raw),fixture);
  await failureContext.route('**/jade-sword-standing.webp',route=>route.abort());
  await failureContext.route('**/jade-sword-seated.webp',route=>route.abort());
  const fallback=await failureContext.newPage();await fallback.goto(baseURL);await fallback.locator('[data-ui="continue"]').click();await fallback.locator('[data-ui="nav-panel"][data-id="character"]').click();
  await fallback.locator('.v4-character-standing.ui-v4-art-failed').waitFor({state:'attached'});
  await fallback.locator('[data-ui="v3-equipment-slot"][data-id="weapon"]').click();
  assert.equal(await fallback.locator('[data-equipment-slot="weapon"]').count(),1);
  await fallback.locator('dialog [data-ui="close-dialog"]').click();
  await fallback.locator('[data-ui="nav-panel"][data-id="practice"]').click();
  await fallback.locator('.pr-seated.ui-v4-art-failed').waitFor({state:'attached'});
  assert.equal(await fallback.locator('.pr-seated-wrap[data-art-fallback="true"]').count(),1);
  assert.equal(await fallback.locator('.pr-main-action:not(:disabled)').count(),1);
  assert.equal(await fallback.evaluate(()=>localStorage.getItem('feisheng.run.v1')),fixture);
  await fallback.screenshot({path:path.join(out,'intentional-character-art-failure.png')});await failureContext.close();
  report.intentionalFailure={assets:['character.jade-sword.standing','character.jade-sword.seated'],fallback:true,actionsStillWork:true,saveUnchanged:true};
  report.passed = true;
}
main().catch(async error => {
  report.error = error.stack; process.exitCode = 1;
  if (page) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
}).finally(async () => {
  if (browser) await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
