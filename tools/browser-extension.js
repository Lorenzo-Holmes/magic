async (page, options = {}) => {
  const version = await page.evaluate(() => FSScenes.VERSION), baseURL = new URL(page.url()).origin;
  const out = options.out || `output/playwright/v${version}`;
  const report = { version, passed: false, errors: [], requests: [], failedRequests: [], layouts: [], screenshots: [], systems:{} };
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
  page.on('request', r => report.requests.push(r.url()));
  page.on('requestfailed', r => report.failedRequests.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  const ui = name => page.locator(`[data-ui="${name}"]`);
  const action = name => page.locator(`[data-action="${name}"]`);
  const run = () => page.evaluate(() => JSON.parse(localStorage.getItem('feisheng.run.v1')));
  const widths = [320, 360, 390, 430, 768, 1280];
  async function close() { if (await page.locator('dialog[open]').count()) await page.locator('dialog [data-ui="close-dialog"]').click(); }
  async function restore(name) {
    await close(); await ui('journal').first().click();
    if (!(await page.locator('#import-save').count())) await page.locator('dialog [data-ui="settings"]').click();
    await page.locator('#import-save').setInputFiles(`${out}/states/${name}.json`);
    await page.locator('[data-ui="confirm-import"]').click();
  }
  async function layout(name) {
    await page.waitForFunction(() => {
      const w = document.querySelector('#world'), img = w.querySelector('.world-image.is-visible');
      return w.dataset.scene === w.dataset.loadedScene && !w.dataset.sceneError && img.complete && img.naturalWidth > 0;
    });
    await page.waitForTimeout(1350);
    await page.waitForFunction(() => !document.querySelector('#notice')?.classList.contains('visible'), null, {timeout:6000});
    for (const width of widths) {
      await page.setViewportSize({ width, height: width > 720 ? 900 : 844 });
      const status = await page.evaluate(() => {
        const target = document.querySelector('dialog[open]') || document.querySelector('main');
        const elements = [...target.querySelectorAll('button,input[type=range]')].filter(el => el.getClientRects().length);
        const r = target.getBoundingClientRect();
        return { width: innerWidth, page: document.documentElement.scrollWidth, left: r.left, right: r.right,
          scroll: target.scrollWidth, client: target.clientWidth,
          small: elements.filter(el => { const b = el.getBoundingClientRect(); return b.width < 43.9 || b.height < 43.9; }).map(el => el.textContent.trim()) };
      });
      report.layouts.push({ name, ...status });
      check(status.page <= width + 1 && status.left >= -1 && status.right <= width + 1 && status.scroll <= status.client + 1 && !status.small.length, `Extension layout failed ${name}/${width}: ${JSON.stringify(status)}`);
      const file = `${out}/extension-${name}-${width}.png`;
      await page.screenshot({ path: file, fullPage: !await page.locator('dialog[open]').count() }); report.screenshots.push(file);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.bringToFront();
  const initial = await page.evaluate(() => FSSound.diagnostics());
  check(initial.state === 'locked' && !initial.unlocked, 'Audio was created before user interaction');
  await ui('audio-settings').click();
  await page.waitForFunction(() => FSSound.diagnostics().state === 'running');
  await page.waitForFunction(() => FSSound.diagnostics().rms > .0001);
  report.audio = { startsLocked: true, firstGesture: true, sample: await page.evaluate(() => FSSound.diagnostics()), bands: [] };
  await layout('audio-settings'); await close();
  for (const [fixture, expected] of [['mortal--calm','mortal'],['goldcore--calm','cloud'],['void--calm','void'],['tribulation--thunder','tribulation']]) {
    await restore(fixture);
    await page.waitForFunction(band => FSSound.diagnostics().ambientBand === band && FSSound.diagnostics().state === 'running', expected);
    report.audio.bands.push({ band: expected, detected: await page.evaluate(() => FSSound.diagnostics().band) });
  }
  // Synthetic lifecycle events, not a claim of physical mobile hardware testing.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => FSSound.diagnostics().state === 'suspended');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => FSSound.diagnostics().state === 'running');
  report.audio.focusLifecycle = true;
  await ui('audio-settings').click(); await ui('audio-music').click(); await ui('audio-effects').click();
  await page.waitForFunction(() => FSSound.diagnostics().state === 'suspended');
  const slider = page.locator('#audio-volume'); await slider.focus(); await slider.press('Home');
  for (let k = 0; k < 18; k++) await slider.press('ArrowRight');
  check((await page.evaluate(() => FSSound.settings())).volume === .18, 'Keyboard volume input failed');
  await page.reload();
  const reloaded = await page.evaluate(() => FSSound.diagnostics());
  check(reloaded.state === 'locked' && !reloaded.settings.music && !reloaded.settings.effects && reloaded.settings.volume === .18, 'Audio settings did not survive reload');
  report.audio.muteAndReload = true;
  await ui('audio-settings').click(); await ui('audio-music').click(); await ui('audio-effects').click(); await close();
  await page.waitForFunction(() => FSSound.diagnostics().state === 'running');
  // Synthesis fixtures; actual gameplay cue routing is checked in the main suite.
  const before = JSON.stringify(await run());
  for (const cue of ['talent','breakthrough','devour','mutation','fusion','demon','thunder','ascension','trace']) {
    await page.evaluate(name => FSSound.cue(name), cue); await page.waitForTimeout(1100);
  }
  check(JSON.stringify(await run()) === before, 'Sound synthesis changed the run');
  const diag = await page.evaluate(() => FSSound.diagnostics());
  check(Object.keys(diag.cueCounts).length === 9 && diag.voices <= 24, 'Cue synthesis or voice cleanup failed');
  report.audio.nineCues = true; report.audio.maxVoiceBudget = 24;
  if (await page.evaluate(() => !!window.FSEquipment)) {
    await restore('ascension--ascension');
    const equipmentStart = await run();
    check(equipmentStart.equipment?.inventory?.length > 0, 'Ascension fixture did not earn any mortal equipment');
    const uid = equipmentStart.equipment.inventory[0].uid;
    await ui('equipment').click();
    check(await page.locator('dialog .gear-card').count() === equipmentStart.equipment.inventory.length, 'Equipment modal inventory count differs from save');
    await layout('equipment-inventory');
    if (await page.locator(`[data-action="equipment-identify"][data-id="${uid}"]`).count()) await page.locator(`[data-action="equipment-identify"][data-id="${uid}"]`).click();
    const identified = await run();
    check(identified.equipment.inventory.find(x => x.uid === uid)?.identified, 'Equipment identify did not persist');
    await page.locator(`[data-action="equipment-equip"][data-id="${uid}"]`).click();
    const equipped = await run(), def = await page.evaluate(id => FSEquipment.data(JSON.parse(localStorage.getItem('feisheng.run.v1')).equipment.inventory.find(x=>x.uid===id)), uid);
    check(equipped.equipment.slots[def.slot] === uid, 'Equipment did not enter its matching mortal slot');
    const equippedRaw = JSON.stringify(equipped);
    await page.reload(); await ui('continue').click();
    check(JSON.stringify(await run()) === equippedRaw, 'Mortal equipment changed after reload');
    check((await run()).immortal === null, 'Equipment acceptance unexpectedly entered immortal state');
    report.systems.equipment = { passed:true, inventory:equipmentStart.equipment.inventory.length, capacity:12, identified:true, equippedSlot:def.slot, reloadPreserved:true, mortalOnly:true };
    await restore('ascension--ascension');
  }
  if (await page.evaluate(() => !!window.FSBuild)) {
    // The calm gold-core visual checkpoint is captured during the breakthrough
    // draft, where the normal play HUD (and therefore the Build entry) is not
    // intentionally rendered. Use the real gold-core boss checkpoint instead:
    // it is a playing-state save with an established mutation/fusion and the
    // same deterministic Build data, so the user-facing "查看协同" entry exists.
    await restore('goldcore--demon-eye');
    const buildBefore=JSON.stringify(await run()), evaluated=await page.evaluate(()=>FSBuild.evaluateBuild(JSON.parse(localStorage.getItem('feisheng.run.v1'))));
    check(evaluated.main && evaluated.sources.length > 0 && evaluated.synergies.length > 0, 'Build evaluator did not form an explainable build on the gold-core fixture');
    await ui('build').click();
    check(await page.locator('dialog .build-synergy').count() === evaluated.synergies.length, 'Build modal does not match pure evaluator');
    await layout('build-synergies'); await close();
    check(JSON.stringify(await run()) === buildBefore, 'Opening Build explanation changed the save');
    report.systems.build={passed:true,main:evaluated.main,sub:evaluated.sub,sources:evaluated.sources.length,synergies:evaluated.synergies.length,readOnly:true};
    await restore('ascension--ascension');
  }
  if (await page.evaluate(() => !!window.FSCombat)) {
    await page.emulateMedia({ reducedMotion:'no-preference' });
    await restore('goldcore--demon-eye');
    const beforeCombat=JSON.stringify(await run());
    const route=page.locator('[data-action="resolve"]:not(:disabled)').last();
    check(await route.count()===1,'Gold-core combat fixture has no viable boss route');
    await route.click();
    const committed=JSON.stringify(await run()), committedState=JSON.parse(committed);
    check(committed!==beforeCombat && committedState.flags.bossSlain && committedState.combatReplay?.events?.length>=4,'Boss result was not committed with a bounded replay');
    await page.waitForFunction(() => FSPresentationUI.diagnostics().combatVisible);
    const diagCombat=await page.evaluate(()=>FSPresentationUI.diagnostics());
    check(diagCombat.combatReplay===committedState.combatReplay.id && diagCombat.combatEvents===committedState.combatReplay.events.length,'Combat overlay differs from committed replay');
    const combatShot=`${out}/extension-combat-replay-390.png`; await page.screenshot({path:combatShot}); report.screenshots.push(combatShot);
    await ui('skip-combat').click();
    check(JSON.stringify(await run())===committed,'Skipping replay changed the committed save');
    await page.reload(); await ui('continue').click();
    await page.waitForFunction(id => FSPresentationUI.diagnostics().combatReplay===id, committedState.combatReplay.id);
    check(JSON.stringify(await run())===committed,'Reload rerolled or repaid the combat result');
    await ui('skip-combat').click();
    await page.emulateMedia({ reducedMotion:'reduce' }); await page.reload(); await ui('continue').click();
    await page.waitForFunction(() => FSPresentationUI.diagnostics().combatVisible);
    check(await page.locator('.combat-event:not(.shown)').count()===0,'Reduced motion did not jump combat replay to the final frame');
    check(JSON.stringify(await run())===committed,'Reduced-motion replay changed the committed save');
    if (await ui('skip-combat').count()) await ui('skip-combat').click();
    await page.emulateMedia({ reducedMotion:'no-preference' });
    report.systems.combat={passed:true,replayId:committedState.combatReplay.id,events:committedState.combatReplay.events.length,skipReadOnly:true,reloadPreserved:true,reducedMotion:true,result:committedState.combatReplay.result};
    await restore('ascension--ascension');
  }
  if (await page.evaluate(() => !!window.FSSecretRealm)) {
    // Use the real 筑基 revenge checkpoint, then resolve the mandatory
    // serpent/mutation flow through DOM actions. The generic calm fixtures are
    // intentionally captured during draft screens and therefore do not expose
    // normal-world side activities such as secret realms.
    await restore('foundation--serpent-prey');
    await page.locator('[data-action="resolve"][data-choice="devour"]').click();
    await page.locator('[data-action="mutate"][data-id="serpenteye"]').click();
    const secretStart=await run();
    check(secretStart.phase==='playing'&&!secretStart.secretRealm.active,'Secret-realm fixture is not a normal mortal playing state');
    await ui('secret-realm').click();
    check(await page.locator('dialog .secret-realm-card').count()===1,'Current realm should expose exactly one secret realm');
    await page.locator('dialog [data-action="secret-enter"]').click();
    const entered=await run(); check(entered.secretRealm.active?.floor===1,'Secret realm did not enter floor 1');
    const enteredRaw=JSON.stringify(entered), option=entered.secretRealm.active.options.find(o=>['herb','page'].includes(o.type))||entered.secretRealm.active.options[0];
    await layout('secret-realm-active');
    await page.reload(); await ui('continue').click();
    check(JSON.stringify(await run())===enteredRaw,'Reload changed secret-realm route or temporary state');
    await page.getByRole('button',{name:'返回秘境'}).click();
    await page.locator(`[data-action="secret-choose"][data-id="${option.id}"]`).click();
    const advanced=await run(); check(advanced.secretRealm.active?.floor===2,'Secret realm did not advance exactly one floor');
    const beforeExit=JSON.stringify(advanced); await page.locator('dialog [data-action="secret-exit"]').click();
    const exited=await run(); check(!exited.secretRealm.active&&exited.phase==='playing','Safe secret-realm exit did not return to the mortal mainline');
    check(exited.secretRealm.history.length===1&&exited.secretRealm.history[0].ending==='exit','Safe exit was not recorded exactly once');
    check(exited.xp>=JSON.parse(beforeExit).xp,'Safe exit lost already banked mainline progress');
    report.systems.secretRealm={passed:true,realmId:entered.secretRealm.active.realmId,reloadPreserved:true,advancedFloor:2,safeExit:true,history:exited.secretRealm.history.length,mainlinePreserved:true};
    await restore('ascension--ascension');
  }
  if (await page.evaluate(() => !!window.FSSect)) {
    await restore('foundation--serpent-prey');
    await page.locator('[data-action="resolve"][data-choice="devour"]').click();
    await page.locator('[data-action="mutate"][data-id="serpenteye"]').click();
    const beforeSect=await run(); check(beforeSect.phase==='playing'&&!beforeSect.sect.membership,'Sect fixture is not a normal unaligned mortal state');
    await ui('sect').click();
    check(await page.locator('dialog .sect-card').count()===4,'Sect chooser does not expose exactly four sects');
    await layout('sect-chooser');
    await page.locator('dialog [data-action="sect-decline"][data-id="tianji"]').click();
    check((await run()).sect.declined.includes('tianji'),'Sect decline was not recorded');
    await page.locator('dialog [data-action="sect-join"][data-id="qingyun"]').click();
    const joined=await run(); check(joined.sect.membership==='qingyun'&&joined.sect.pending==='qingyun-init','Joining sect did not open its first one-shot event');
    check((await page.locator('dialog .sect-event').count())===1,'Pending sect event is not visible');
    const buildWithSect=await page.evaluate(()=>FSBuild.evaluateBuild(JSON.parse(localStorage.getItem('feisheng.run.v1'))));
    check(buildWithSect.sources.some(x=>x.source==='sect:qingyun'),'Joined sect did not become a Build source');
    await page.locator('dialog [data-action="sect-resolve"][data-id="edge"]').click();
    const resolved=await run(); check(resolved.sect.heritageUnlocked&&resolved.sect.completed.includes('qingyun-init'),'Sect inheritance did not unlock exactly once');
    const saved=JSON.stringify(resolved); await close(); await page.reload(); await ui('continue').click();
    check(JSON.stringify(await run())===saved,'Reload changed sect membership, event history or inheritance');
    await ui('sect').click(); await layout('sect-membership');
    await page.locator('dialog [data-action="sect-leave"]').click();
    const left=await run(); check(left.sect.membership===null,'Manual sect leave did not clear current membership');
    const buildAfterLeave=await page.evaluate(()=>FSBuild.evaluateBuild(JSON.parse(localStorage.getItem('feisheng.run.v1'))));
    check(!buildAfterLeave.sources.some(x=>x.source==='sect:qingyun'),'Leaving sect left a hidden Build source');
    report.systems.sect={passed:true,choices:4,declineReconsiderable:true,membership:'qingyun',inheritanceUnlocked:true,reloadPreserved:true,buildSource:true,leaveClearsEffects:true};
    await restore('ascension--ascension');
  }
  if (await page.evaluate(() => !!window.FSLife)) {
    await restore('foundation--serpent-prey');
    await page.locator('[data-action="resolve"][data-choice="devour"]').click();
    await page.locator('[data-action="mutate"][data-id="serpenteye"]').click();
    const lifeStart=await run();
    check(lifeStart.life?.pending,'Origin echo did not become pending after reaching Foundation');
    const pending=await page.evaluate(()=>FSLife.event(JSON.parse(localStorage.getItem('feisheng.run.v1')).life.pending));
    await ui('life').click();
    check(await page.locator('dialog .life-event').count()===1,'Origin echo event is not visible');
    check(await page.locator('dialog [data-action="life-resolve"]').count()===3,'Origin echo must offer three explicit choices including refusal');
    await layout('life-echo');
    const raw=JSON.stringify(lifeStart), firstChoice=pending.choices[0].id;
    await page.locator(`dialog [data-action="life-resolve"][data-id="${firstChoice}"]`).click();
    const chosen=await run(); check(JSON.stringify(chosen)!==raw&&chosen.life.completed.includes(pending.id),'Origin echo did not settle exactly once');
    check(chosen.life.history.length===1,'Origin echo history was not recorded once');
    const build=await page.evaluate(()=>FSBuild.evaluateBuild(JSON.parse(localStorage.getItem('feisheng.run.v1'))));
    check(build.sources.some(x=>x.source.startsWith('life:')),'Origin choice did not become a Build source');
    const saved=JSON.stringify(chosen); await close(); await page.reload(); await ui('continue').click();
    check(JSON.stringify(await run())===saved,'Reload changed origin echo choice or reward');
    await ui('life').click(); await layout('life-history'); await close();
    report.systems.life={passed:true,origin:chosen.origin,event:pending.id,choices:3,settledOnce:true,reloadPreserved:true,buildSource:true,refusalAvailable:pending.choices.some(x=>x.xp===0)};
    await restore('ascension--ascension');
  }
  if (await page.evaluate(() => !!window.FSSpiritBeast)) {
    await restore('foundation--serpent-prey');
    await page.locator('[data-action="resolve"][data-choice="devour"]').click();
    await page.locator('[data-action="mutate"][data-id="serpenteye"]').click();
    await ui('spirit-beast').click();
    check(await page.locator('dialog .beast-card').count()===4,'Spirit-beast chooser must expose exactly four initial species');
    await layout('spirit-beast-chooser');
    await page.locator('dialog [data-action="beast-bond"][data-id="moonfox"]').click();
    let bonded=await run(); check(bonded.spiritBeast.companion?.species==='moonfox','Spirit beast was not bonded to the single main slot');
    check(await page.locator('dialog [data-action="beast-bond"]').count()===0,'A second companion slot appeared after bonding');
    // Fixture-only material grant: acquisition rules are state-machine tested;
    // browser acceptance here verifies the actual irreversible evolution UI.
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('feisheng.run.v1'));s.spiritBeast=FSSpiritBeast.addEssence(s.spiritBeast,20,'browser-fixture');localStorage.setItem('feisheng.run.v1',FSEngine.serialize(s));});
    await page.reload(); await ui('continue').click(); await ui('spirit-beast').click();
    await page.locator('dialog [data-action="beast-evolve"]:not([data-id])').click();
    check((await run()).spiritBeast.companion.stage===1,'Spirit beast did not reach the spirit-beast stage');
    await page.locator('dialog [data-action="beast-evolve"][data-id="sacred"]').click();
    const branched=await run(); check(branched.spiritBeast.companion.stage===2&&branched.spiritBeast.companion.branch==='sacred','Spirit beast branch was not committed');
    check(branched.spiritBeast.essence===14,'Spirit beast evolution did not consume the declared material cost');
    const saved=JSON.stringify(branched); await close(); await page.reload(); await ui('continue').click(); check(JSON.stringify(await run())===saved,'Reload changed spirit-beast branch or materials');
    const build=await page.evaluate(()=>FSBuild.evaluateBuild(JSON.parse(localStorage.getItem('feisheng.run.v1'))));
    check(build.sources.some(x=>x.source==='spirit-beast:moonfox'),'Spirit beast did not become an explainable Build source');
    const gate=await page.evaluate(()=>{let b=FSSpiritBeast.bond(FSSpiritBeast.createState(),'moonfox');b=FSSpiritBeast.addEssence(b,30,'gate');b=FSSpiritBeast.evolve(b,{realm:1});b=FSSpiritBeast.evolve(b,{realm:2},'sacred');b=FSSpiritBeast.evolve(b,{realm:4});return {without:FSSpiritBeast.canEvolve(b,{realm:9,ascended:true,immortal:false}).ok,with:FSSpiritBeast.canEvolve(b,{realm:9,ascended:true,immortal:true}).ok};});
    check(!gate.without&&gate.with,'Final spirit-beast evolution is not gated by actual immortal entry');
    report.systems.spiritBeast={passed:true,choices:4,oneSlot:true,branch:'sacred',irreversible:true,materialSpent:true,reloadPreserved:true,buildSource:true,immortalGate:true};
    await restore('ascension--ascension');
  }
  await restore('ascension--ascension');
  const mortal = await run(), originalPower = mortal.ascendedPower;
  await action('immortal-enter').click();
  const arrival = await run();
  check(arrival.immortal.basePower < arrival.immortal.wormPower, 'Immortal arrival lost the weaker-than-worm contrast');
  await layout('immortal-arrival');
  await page.locator('[data-action="immortal-approach"][data-id="test"]').click();
  check((await run()).immortal.health === 70, 'Testing realm pressure should cost 30 health');
  await layout('immortal-shelter');
  await action('immortal-adapt').click();
  let turns = 0, lawReloaded = false;
  const captured = new Set();
  while (turns++ < 150) {
    const s = await run(), i = s.immortal;
    if (!captured.has(i.phase)) { captured.add(i.phase); await layout(`immortal-${i.phase}`); }
    if (i.phase === 'prologue-complete') break;
    check(i.phase !== 'dead', 'Conservative immortal browser route died');
    if (i.phase === 'law') {
      const raw = JSON.stringify(s);
      await page.reload(); await ui('continue').click();
      check(JSON.stringify(await run()) === raw, 'Reload changed pending immortal law offer'); lawReloaded = true;
      await page.locator(`[data-action="immortal-law"][data-id="${i.lawOffer[0]}"]`).click();
    } else if (i.phase === 'encounter') await action('immortal-devour').click();
    else {
      const choice = await page.evaluate(() => {
        const i = JSON.parse(localStorage.getItem('feisheng.run.v1')).immortal, I = FSImmortal;
        if (i.health < 100) return { type: 'rest' };
        const safe = I.availableCreatures(i).filter(c => I.threat(i, I.enemy(i,c.id)).chance === 1);
        if (safe.some(c => c.boss)) return { type:'hunt',id:safe.find(c=>c.boss).id };
        if (i.level < 8 && i.essence >= I.trainingCost(i)) return { type:'train' };
        if (safe.length) return { type:'hunt',id:safe.sort((a,b)=>b.reward-a.reward)[0].id };
        return { type:'cultivate' };
      });
      await page.locator(`[data-action="immortal-${choice.type}"]${choice.id ? `[data-id="${choice.id}"]` : ''}`).click();
    }
  }
  const final = await run(), i = final.immortal;
  check(i.phase === 'prologue-complete' && i.wormSlain && lawReloaded && i.wormPower === arrival.immortal.wormPower, 'Immortal prologue incomplete');
  check(final.ascendedPower === originalPower && final.rng === mortal.rng, 'Immortal continuation mutated mortal accomplishments or RNG');
  const raw = JSON.stringify(final);
  await ui('mortal-summary').click();
  check((await page.locator('.immortal-preview').innerText()).includes('仙界噬灵虫'), 'Original ascension ending no longer accessible');
  await ui('immortal-continue').click(); check(JSON.stringify(await run()) === raw, 'Reviewing mortal ending changed save');
  const fileCases = [];
  for (const [mode,url] of options.fileRoots) {
    await page.goto(url); await close(); await ui('journal').first().click();
    if (!(await page.locator('#import-save').count())) await page.locator('dialog [data-ui="settings"]').click();
    await page.locator('#import-save').setInputFiles({ name:'earned-immortal.json', mimeType:'application/json', buffer:Buffer.from(raw) });
    await page.locator('[data-ui="confirm-import"]').click();
    check(await page.locator('[data-view="immortal-prologue-complete"]').count() === 1, `${mode} did not load earned immortal ending`);
    await page.waitForFunction(() => document.querySelector('#world').dataset.scene === document.querySelector('#world').dataset.loadedScene);
    fileCases.push(mode);
  }
  report.immortal = { passed:true,seed:final.seed,steps:turns,initialPower:i.basePower,wormPower:i.wormPower,
    finalPower:await page.evaluate(()=>FSImmortal.power(JSON.parse(localStorage.getItem('feisheng.run.v1')).immortal)),
    law:i.law,level:i.level,devours:i.devours,lawReloaded,mortalPreserved:true,fileCases };
  await page.goto(baseURL); await ui('continue').click();
  await action('immortal-evolution-enter').click();
  let evolutionTurns = 0, offerReloaded = false, upgraded = false, replaced = false, formalEnding = null;
  const evolutionShots = new Set();
  while (evolutionTurns++ < 400) {
    const current = await run(), c = current.immortal, e = c.evolution;
    const checkpoint = `${c.phase}-${e.world}${e.endless ? '-endless' : ''}`;
    if (!evolutionShots.has(checkpoint) && (!e.endless || c.phase === 'world')) {
      evolutionShots.add(checkpoint); await layout(`evolution-${checkpoint}`);
    }
    check(c.phase !== 'dead', 'Conservative evolution route died');
    if (e.endless && BigInt(e.layer) >= 7n && c.phase === 'world') break;
    if (c.phase === 'ending') {
      formalEnding = { cleared:e.cleared,scale:e.scale,slots:e.slots,fusions:e.fusions,power:await page.evaluate(()=>FSEvolution.power(JSON.parse(localStorage.getItem('feisheng.run.v1')).immortal)) };
      check(e.completed && e.cleared.length === 4, 'Formal evolution ending arrived before all worlds');
    }
    if (c.phase === 'evolve' && !offerReloaded) {
      const saved = JSON.stringify(current); await page.reload(); await ui('continue').click();
      check(JSON.stringify(await run()) === saved, 'Reload rerolled or consumed evolution candidates'); offerReloaded = true;
    }
    let a = options.evolutionAction(c);
    if (!upgraded && c.phase === 'world' && e.fusions.length && c.fragments >= e.slots.law.level + 2 && e.slots.law.level < 5) { a={type:'upgrade',id:'law'};upgraded=true; }
    if (!replaced && c.phase === 'evolve' && e.world >= 2) {
      const candidate = await page.evaluate(() => {
        const e=JSON.parse(localStorage.getItem('feisheng.run.v1')).immortal.evolution;
        return e.offer.find(id=>{const t=FSEvolution.TRAITS.find(t=>t.id===id);return e.slots[t.slot]&&e.slots[t.slot].id!==id;});
      });
      if(candidate){a={type:'choose',id:candidate};replaced=true;}
    }
    if (['upgrade','fuse'].includes(a.type) && !(await page.locator('.evolution-build').getAttribute('open') !== null)) await page.locator('.evolution-build summary').click();
    if(a.type==='fuse')await layout('evolution-fusion-ready');
    await page.locator(`[data-action="immortal-evolution-${a.type}"]${a.id?`[data-id="${a.id}"]`:''}`).click();
    if(a.type==='choose')check(Object.keys((await run()).immortal.evolution.slots).length===5,'Choosing an evolution grew an extra slot');
  }
  const evolved = await run(), evolvedRaw=JSON.stringify(evolved);
  check(formalEnding && formalEnding.fusions.length > 0 && offerReloaded && upgraded && replaced, 'Evolution core features were not all exercised');
  check(evolved.immortal.evolution.endless && BigInt(evolved.immortal.evolution.layer) >= 7n, 'Two endless worlds were not completed');
  async function importRaw(text) {
    await close();await ui('journal').first().click();
    if(!(await page.locator('#import-save').count()))await page.locator('dialog [data-ui="settings"]').click();
    await page.locator('#import-save').setInputFiles({name:'evolution-save.json',mimeType:'application/json',buffer:Buffer.from(text)});
    await page.locator('[data-ui="confirm-import"]').click();
  }
  // Explicit stress fixture, not a claim of playing a thousand-digit realm count.
  const extreme=JSON.parse(evolvedRaw);extreme.revision='90071992547409910000';
  extreme.immortal.evolution.scale={m:4.35,e:'1000'};extreme.immortal.evolution.layer='100000000000000000001';
  await importRaw(JSON.stringify(extreme));await layout('evolution-large-number-fixture');
  await action('immortal-evolution-cultivate').click();
  check((await run()).revision==='90071992547409910001','Large revision lost precision');
  const cosmic = await page.evaluate(() => {
    const power = FSEvolution.power(JSON.parse(localStorage.getItem('feisheng.run.v1')).immortal);
    return {text:FSQuantity.format(power),exponent:power.e};
  });
  check((await page.locator('.cosmic-number').textContent())===cosmic.text && BigInt(cosmic.exponent)>=1000n,'Cosmic power fell back to Infinity or lost exponent');
  await importRaw(evolvedRaw);
  const evolutionFiles=[];
  for(const [mode,url] of options.fileRoots){
    await page.goto(url);await importRaw(evolvedRaw);
    check((await run()).immortal.evolution.layer===evolved.immortal.evolution.layer,`${mode}: endless layer did not import`);
    await action('immortal-evolution-cultivate').click();
    check(await page.locator('.evolution-view').count()===1,`${mode}: evolution renderer failed`);evolutionFiles.push(mode);
  }
  report.evolution={passed:true,turns:evolutionTurns,formalEnding,offerReloaded,upgraded,replaced,
    endlessLayer:evolved.immortal.evolution.layer,endlessWorlds:2,largeNumberFixture:true,fileCases:evolutionFiles,mortalPreserved:evolved.ascendedPower===originalPower};
  await page.goto(baseURL); await restore('ascension--ascension');
  report.externalRequests = report.requests.filter(url => /^https?:/.test(url) && !url.startsWith(`${baseURL}/`) && url !== baseURL).length;
  check(report.externalRequests === 0 && report.errors.length === 0 && report.failedRequests.length === 0, 'Extension produced network or browser errors');
  report.passed = true;
  return report;
}
