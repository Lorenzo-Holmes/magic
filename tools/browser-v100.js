async (page, options = {}) => {
  const version = await page.evaluate(() => FSScenes.VERSION), baseURL = new URL(page.url()).origin;
  const out = options.out || `output/playwright/v${version}`;
  const widths = [320,360,390,430,768,1280];
  const report = { version, passed:false, layouts:[], screenshots:[], errors:[], requests:[], failedRequests:[] };
  const check = (ok,msg) => { if(!ok) throw new Error(msg); };
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
  page.on('request',r=>report.requests.push(r.url())); page.on('requestfailed',r=>report.failedRequests.push(r.url()));
  const ui=name=>page.locator(`[data-ui="${name}"]`), action=name=>page.locator(`[data-action="${name}"]`);
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('feisheng.run.v1')));
  const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('feisheng.meta.v1')));
  async function layout(name) {
    await page.waitForFunction(()=>{const w=document.querySelector('#world'),i=w?.querySelector('.world-image.is-visible');return w&&w.dataset.scene===w.dataset.loadedScene&&i?.complete&&i.naturalWidth>0;});
    for(const width of widths){
      await page.setViewportSize({width,height:width>=768?900:844});
      const result=await page.evaluate(()=>{const root=document.documentElement,main=document.querySelector('main');return {width:innerWidth,page:root.scrollWidth,main:main.scrollWidth,client:main.clientWidth,small:[...main.querySelectorAll('button')].filter(x=>x.getClientRects().length&&((x.getBoundingClientRect().width<43.9)||(x.getBoundingClientRect().height<43.9))).map(x=>x.textContent.trim())};});
      report.layouts.push({name,...result}); check(result.page<=width+1&&result.main<=result.client+1&&!result.small.length,`v1 layout ${name}/${width}: ${JSON.stringify(result)}`);
      const file=`${out}/v100-${name}-${width}.png`;await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);
    }
    await page.setViewportSize({width:390,height:844});
  }
  async function chooseTalent(strategy) {
    const id=await page.evaluate(strategy=>{
      const s=JSON.parse(localStorage.getItem('feisheng.run.v1'));
      const names={devour:'吞噬',sword:'剑道',body:'肉身',soul:'神魂',fortune:'气运',insight:'修炼'};
      return s.offer.map(id=>FSData.TALENTS.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>(b.exclusiveTrace===strategy)-(a.exclusiveTrace===strategy)+(b.path===names[strategy])-(a.path===names[strategy])+b.rarity-a.rarity)[0].id;
    },strategy);
    await page.locator(`[data-action="pick"][data-id="${id}"]`).click();
  }
  async function resolvePreferred(ids) {
    for(const id of ids){const loc=page.locator(`[data-action="resolve"][data-choice="${id}"]:not(:disabled)`);if(await loc.count()){await loc.first().click();return id;}}
    const any=page.locator('[data-action="resolve"]:not(:disabled)');check(await any.count()>0,'No viable resolve option');const id=await any.first().getAttribute('data-choice');await any.first().click();return id;
  }
  await page.goto(baseURL); await page.setViewportSize({width:390,height:844});
  const before=await ledger(); check(before.nextTrace&&before.nextTraceSource,'v1 second-life QA needs the first life pending trace');
  const trace=await page.evaluate(id=>FSData.TRACES.find(t=>t.id===id),before.nextTrace), firstSeed=before.nextTraceSource;
  check(trace?.talentId,'Inherited trace has no memory talent');
  await ui('new').click(); await ui('confirm-new').click();
  let s=await state(), meta=await ledger();
  check(s.carriedTrace===trace.id&&s.traceSourceSeed===firstSeed,'Second life did not preserve trace provenance');
  check(meta.nextTrace===null&&meta.nextTraceSource===null,'Second life did not consume pending trace');
  check(s.offer.includes(trace.talentId),'Matching memory talent is missing from second-life offer');
  check(s.offer.filter(id=>id.startsWith('memory-')).length===1,'Second-life offer contains multiple memory talents');
  await layout('second-life-talents');
  const selected=[trace.talentId,...s.offer.filter(id=>id!==trace.talentId).slice(0,2)];for(const id of selected)await page.locator(`[data-action="select"][data-id="${id}"]`).click();
  await action('confirm-talents').click(); await page.locator('[data-action="preset"][data-id="balanced"]').click(); await action('enter').click();
  await action('cultivate-to-ready').click(); await page.locator('[data-action="resolve"][data-choice="flee"]').click();
  s=await state();check(s.event?.id==='trace-echo'&&s.event.trace===trace.id,'Second-life early echo missing');await layout('second-life-echo');await page.locator('[data-action="resolve"][data-choice="remember"]').click();
  const preferred={devour:['devour-eye','devour','drink','eat-gate'],sword:['sword-break','sword','cut-gate'],body:['body-charge','body','step-gate'],soul:['see-through','mind','see','probe'],fortune:['fate','fortune','fate-gate'],insight:['insight','dao','comprehend']}[trace.id];
  const mutation={devour:'serpentblood',sword:'redscale',body:'redscale',soul:'serpenteye',fortune:'serpenteye',insight:'serpenteye'}[trace.id];
  const fusion={devour:['devour-body','dragon-blood'],sword:['thunder-sword','flame-scale'],body:['golden-body','flame-scale'],soul:['abyss-eye'],fortune:['fate-veil'],insight:['five-unity']}[trace.id];
  let turns=0,resonanceSeen=false;
  while(turns++<160){
    s=await state();if(s.phase==='complete')break;check(s.phase!=='dead','Second-life browser route died');
    if(s.phase==='draft'){await chooseTalent(trace.id);}
    else if(s.phase==='mutation')await page.locator(`[data-action="mutate"][data-id="${mutation}"]`).click();
    else if(s.phase==='fusion'){let id=fusion.find(x=>s.fusionOffer.includes(x))||s.fusionOffer[0];await page.locator(`[data-action="pick-fusion"][data-id="${id}"]`).click();}
    else if(s.phase==='tribulation'){
      const ids=[`trace-${trace.id}`,...preferred,'fusion'];let clicked=false;for(const id of ids){const loc=page.locator(`[data-action="tribulation-step"][data-id="${id}"]:not(:disabled)`);if(await loc.count()){await loc.click();clicked=true;break;}}if(!clicked)await page.locator('[data-action="tribulation-step"]:not(:disabled)').first().click();
    }
    else if(s.event?.id==='trace-resonance'){if(!resonanceSeen){await layout('second-life-resonance');resonanceSeen=true;}await page.locator('[data-action="resolve"][data-choice="remember"]').click();}
    else if(s.event?.id==='first-python')await page.locator('[data-action="resolve"][data-choice="flee"]').click();
    else if(['revenge','remains'].includes(s.event?.id))await page.locator('[data-action="resolve"][data-choice="devour"]').click();
    else if(s.event?.id==='swordsman')await page.locator('[data-action="resolve"][data-choice="learn"]').click();
    else if(s.event?.id==='ruin')await page.locator('[data-action="resolve"][data-choice="probe"]').click();
    else if(s.event?.id==='hunt')await page.locator('[data-action="resolve"][data-choice="flee"]').click();
    else if(['advanced','high'].includes(s.event?.id))await resolvePreferred(preferred);
    else if(s.event?.id==='boss')await resolvePreferred(preferred);
    else if(await action('breakthrough').count())await action('breakthrough').click();
    else if(await action('challenge-boss').count()&&s.xp>=12000)await action('challenge-boss').click();
    else if(s.realm===3&&s.advancedResolved<2)await page.locator('[data-action="act"][data-kind="explore"]').click();
    else if(s.realm>=4&&s.realm<=8&&!s.realmProofs.includes(s.realm))await action('seek-proof').click();
    else if(s.realm===1&&!s.flags.swordEvent)await page.locator('[data-action="act"][data-kind="explore"]').click();
    else if(await action('cultivate-to-ready').isEnabled())await action('cultivate-to-ready').click();
    else await page.locator('[data-action="act"][data-kind="cultivate"]').click();
  }
  s=await state();meta=await ledger();check(s.phase==='complete'&&s.flags.ascended,'Second life did not ascend');
  check(s.talents.includes(trace.talentId)&&s.flags.traceEchoSeen&&s.flags.traceResonanceSeen&&resonanceSeen,'Second-life inherited content did not complete');
  check(meta.totals.ended===2&&meta.totals.ascended===2&&meta.runHistory.length===2,'Ledger did not record two completed lives');
  check(meta.runHistory[0].seed===s.seed&&meta.runHistory[0].trace===trace.id&&meta.runHistory[0].sourceSeed===firstSeed,'Second-life history lost inheritance provenance');
  const profile=await page.evaluate(()=>FSMeta.classifyPath(JSON.parse(localStorage.getItem('feisheng.run.v1'))));check(profile.id===trace.id,`Second-life build did not follow inherited path: ${profile.id}/${trace.id}`);
  await layout('second-life-ascension');
  await action('immortal-enter').click(); await page.locator('[data-action="immortal-approach"][data-id="hide"]').click(); await action('immortal-adapt').click();
  let immortalTurns=0;
  while(immortalTurns++<80){
    s=await state();const i=s.immortal;if(i.phase==='law')break;
    if(i.phase==='encounter')await action('immortal-devour').click();
    else {const choice=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('feisheng.run.v1')).immortal,I=FSImmortal;if(s.health<100)return{type:'rest'};const safe=I.availableCreatures(s).filter(c=>I.threat(s,I.enemy(s,c.id)).chance===1);if(safe.length)return{type:'hunt',id:safe[0].id};return{type:'cultivate'};});await page.locator(`[data-action="immortal-${choice.type}"]${choice.id?`[data-id="${choice.id}"]`:''}`).click();}
  }
  s=await state();check(s.immortal.phase==='law','Second life did not reach immortal law choice');check(s.immortal.lineage===trace.id&&s.immortal.lawOffer[0]===trace.id,'Second-life Build did not influence immortal law offer');
  await layout('second-life-law'); await page.locator(`[data-action="immortal-law"][data-id="${trace.id}"]`).click();
  check((await state()).immortal.law===trace.id,'Second-life inherited law was not selectable');
  report.secondLife={firstSeed,secondSeed:s.seed,trace:trace.id,memoryTalent:trace.talentId,mortalTurns:turns,resonanceSeen,profile:profile.id,ledger:{ended:meta.totals.ended,ascended:meta.totals.ascended},immortalLaw:trace.id,immortalTurns};
  report.externalRequests=report.requests.filter(url=>/^https?:/.test(url)&&url!==baseURL&&!url.startsWith(`${baseURL}/`)).length;
  check(!report.errors.length&&!report.failedRequests.length&&report.externalRequests===0,'v1 second-life QA produced browser/network errors');report.passed=true;return report;
}
