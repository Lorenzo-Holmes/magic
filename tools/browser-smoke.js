async (page, options = {}) => {
  // Run with playwright-cli run-code --filename tools/browser-smoke.js.
  // Uses real DOM clicks, not engine shortcuts, for the complete happy path.
  const baseURL = await page.evaluate(() => location.origin);
  const version = await page.evaluate(() => FSScenes.VERSION);
  await page.bringToFront();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const out = options.out || `output/playwright/v${version}`;
  const report = { version, baseURL, layouts: [], dialogLayouts: [], screenshots: [], checkpoints: [], failures: [], requests: [], scenes: [], sceneStates: {}, failedRequests: [] };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => report.requests.push(request.url()));
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('feisheng.run.v1')));
  const meta = () => page.evaluate(() => JSON.parse(localStorage.getItem('feisheng.meta.v1')));
  const action = (name, extra = '') => page.locator(`[data-action="${name}"]${extra}`);
  const ui = name => page.locator(`[data-ui="${name}"]`);
  async function background(label) {
    await page.waitForFunction(() => {
      const world = document.querySelector('#world'), image = world.querySelector('.world-image.is-visible');
      return world.dataset.scene === world.dataset.loadedScene && !world.dataset.sceneError && image.complete && image.naturalWidth > 0;
    });
    const result = await page.evaluate(() => {
      const world = document.querySelector('#world');
      return { scene: world.dataset.scene, loaded: world.dataset.loadedScene, atmosphere: world.dataset.atmosphere,
        animations: document.getAnimations().filter(a => a.effect?.target?.closest?.('#world') && a.playState === 'running').map(a => a.animationName),
        images: [...world.querySelectorAll('img[src]')].map(img => ({ src: img.src, width: img.naturalWidth, height: img.naturalHeight })) };
    });
    report.scenes.push({ label, ...result });
    const current = await state();
    if (current && !report.sceneStates[`${result.scene}--${result.atmosphere}`]) report.sceneStates[`${result.scene}--${result.atmosphere}`] = current;
    return result;
  }

  async function openPanel(name){
    const settings=page.locator('dialog[open] [data-ui="settings"]');
    if(name==='settings'){if(await settings.count())await settings.click();else await page.locator('[data-ui="settings"]:visible').first().click();return;}
    if(await page.locator('dialog[open]').count())await page.locator('dialog [data-ui="close-dialog"]').click();
    const hub=['equipment','crafting','spirit-beast'].includes(name)?'inventory':name==='secret-realm'?'atlas':'character';
    await page.locator('[data-ui="nav-panel"][data-id="'+hub+'"]').click();
    await ui(name).first().click();
  }
  const widths = [320, 360, 390, 430, 768, 1280];
  async function layout(label) {
    await background(label);
    await page.waitForTimeout(1300);
    for (const width of widths) {
      await page.setViewportSize({ width, height: width > 720 ? 900 : 844 });
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const result = await page.evaluate(() => ({
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        overflows: [...document.querySelectorAll('main *')].filter(el => {
          const r = el.getBoundingClientRect();
          // A pan/zoom art canvas intentionally extends past its clipping port.
          // Its port itself must remain in the page. HUD and other controls are
          // still checked normally; V3 hit tests independently inspect buttons.
          const camera=el.closest('.v3-art-canvas'),port=camera?.parentElement;
          if(port&&port.matches('.v3-cave-viewport,.v3-map-viewport')){
            const p=port.getBoundingClientRect(),style=getComputedStyle(port);
            if(p.left>=-1&&p.right<=innerWidth+1&&['hidden','clip'].includes(style.overflowX))return false;
          }
          return r.width && (r.left < -1 || r.right > innerWidth + 1);
        }).map(el => `${el.tagName}.${el.className}`),
        shortButtons: [...document.querySelectorAll('main button,.topbar button')].filter(el => {
          const r = el.getBoundingClientRect(); return r.width && (r.height < 43.99 || r.width < 43.99);
        }).map(el => el.textContent.trim())
      }));
      report.layouts.push({ stage: label, ...result });
      check(result.documentWidth <= width + 1, `${label}: page overflows at ${width}px`);
      check(!result.overflows.length, `${label}: elements overflow at ${width}px: ${result.overflows.join(',')}`);
      check(!result.shortButtons.length, `${label}: touch target under 44px: ${result.shortButtons.join(',')}`);
      await page.evaluate(() => scrollTo(0, 0));
      await shot(`${label.replace(/[^a-z0-9-]/gi, '-')}-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  async function shot(label) {
    const filename = `${out}/${label}.png`;
    // Chromium full-page capture can trim a classic scrollbar's 15px gutter.
    // Layout was already checked with the native scrollbar; hide only its paint
    // for capture, not overflow or content, and immediately restore it afterward.
    const scrollbar = await page.evaluate(() => {
      const root = document.documentElement, previous = root.style.scrollbarWidth;
      root.style.scrollbarWidth = 'none'; return previous;
    });
    try { await page.screenshot({ path: filename, fullPage: true }); }
    finally { await page.evaluate(value => { document.documentElement.style.scrollbarWidth = value; }, scrollbar); }
    report.screenshots.push(filename);
  }
  async function dialogLayout(label) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width > 720 ? 900 : 844 });
      const result = await page.evaluate(() => {
        const dialog = document.querySelector('dialog[open]');
        if (!dialog) return { width: innerWidth, missing: true };
        const rect = dialog.getBoundingClientRect();
        return {
          width: innerWidth, missing: false, left: rect.left, right: rect.right,
          dialogScrollWidth: dialog.scrollWidth, dialogClientWidth: dialog.clientWidth,
          shortButtons: [...dialog.querySelectorAll('button,label.file-label')].filter(el => {
            const r = el.getBoundingClientRect(); return r.width && (r.height < 43.99 || r.width < 43.99);
          }).map(el => el.textContent.trim())
        };
      });
      report.dialogLayouts.push({ stage: label, ...result });
      check(!result.missing, `${label}: dialog missing at ${width}px`);
      check(result.left >= -1 && result.right <= width + 1, `${label}: dialog overflows at ${width}px`);
      check(result.dialogScrollWidth <= result.dialogClientWidth + 1, `${label}: dialog content overflows at ${width}px`);
      check(!result.shortButtons.length, `${label}: dialog touch target under 44px: ${result.shortButtons.join(',')}`);
      const filename = `${out}/${label}-${width}.png`;
      await page.screenshot({ path: filename }); report.screenshots.push(filename);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  // Dedicated test profile; never uses the user's ordinary browser profile.
  await page.evaluate(() => {
    localStorage.removeItem('feisheng.run.v1');
    localStorage.removeItem('feisheng.backup.v1');
    localStorage.removeItem('feisheng.meta.v1');
  });
  await page.goto(baseURL);
  await layout('home'); await shot('01-home-mobile');
  await page.setViewportSize({ width: 1280, height: 900 }); await shot('01-home-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await ui('new').click();
  await layout('talents'); await shot('02-talents-mobile');
  check(await action('select').count() === 8, 'Opening must have eight options');
  check(await page.locator('[data-note="talents"]').count() === 1, 'First-life talent annotation missing');
  await page.locator('[data-ui="dismiss-note"][data-id="talents"]').click();
  check((await meta()).tutorialSeen.includes('talents'), 'Annotation dismissal did not persist');
  check(await action('confirm-talents').isDisabled(), 'Cannot confirm zero selections');
  const firstIds = (await state()).offer.slice(0, 3);
  for (const id of firstIds) await action('select', `[data-id="${id}"]`).click();
  await action('confirm-talents').click();
  await layout('attributes'); await shot('03-attributes-mobile');
  await action('stat', '[data-id="bone"][data-delta="-1"]').click();
  check(await action('enter').isDisabled(), 'Unspent points must block entry');
  await action('stat', '[data-id="mind"][data-delta="1"]').click();
  await action('preset', '[data-id="balanced"]').click();
  await action('enter').click();
  await layout('arrival'); await shot('04-arrival-mobile');
  const expectedPower = await page.evaluate(() => FSEngine.power(JSON.parse(localStorage.getItem('feisheng.run.v1'))).toLocaleString('zh-CN'));
  await ui('number-detail').click();
  check((await page.locator('.exact-number').innerText()) === expectedPower, 'Full numeric detail differs from engine');
  await ui('close-dialog').click();
  check(await action('cultivate-to-ready').count() === 1, 'Batch cultivation action is missing');
  check(!(await action('cultivate-to-ready').isDisabled()), 'Batch cultivation should be available after entering the world');
  await action('cultivate-to-ready').click();
  const batch = await state();
  check(batch.event?.id === 'first-python', 'Batch cultivation did not stop at the forced serpent encounter');
  check(batch.batchCultivations === 1, 'Batch cultivation count was not recorded');
  report.batchCultivation = { cycles: batch.batchCultivations, stop: batch.event.id, age: batch.age, xp: batch.xp };
  let journeyChecked=false,journeySteps=0;
  async function travelClick(a){
    if(a.type==='journey-start'){
      await page.locator('[data-ui="nav-panel"][data-id="atlas"]').click();
      const region=await page.evaluate(id=>FSJourney.ROUTES.find(r=>r.id===id).region,a.id);
      if(await page.locator('[data-camera="overview"]').count())await page.locator('[data-camera="overview"]').click();
      await page.locator('[data-ui="region"][data-id="'+region+'"]:visible').first().click();
      await page.locator('#journey-kit').selectOption(a.kind);
      if(!journeyChecked)await layout('journey-atlas');
    }else if(a.type==='journey-prepare')await page.locator('[data-ui="nav-panel"][data-id="inventory"]').click();
    await action(a.type,a.id?'[data-id="'+a.id+'"]':'').click();journeySteps++;
    if(a.type==='journey-start'&&!journeyChecked){
      await layout('journey-active');
      const raw=await state(),choices=await page.locator('.travel-choices').innerText();
      report.sceneStates['journey-active']=raw;
      await page.reload();await ui('continue').click();
      check(JSON.stringify(await state())===JSON.stringify(raw)&&await page.locator('.travel-choices').innerText()===choices,'Journey changed on refresh');
      journeyChecked=true;
    }
  }
  let iterations = 0, reloadedDraft = false, hunted = false, presentationChecked = version === '1.0.0';
  const captured = new Set();
  while (iterations++ < 400) {
    const s = await state();
    const travel=options.journeyAction(s);if(travel){await travelClick(travel);continue;}
    if(await page.locator('.atlas-view,.hub-view,.v3-world-window,.v3-baggage-window,.v3-character-window,.v3-forge-window').count())await page.locator('[data-ui="nav-panel"][data-id="practice"]').click();
    const checkpoint = `${s.phase}:${s.event?.id || 'realm'}:${s.realm}${s.phase === 'tribulation' ? `:${s.tribulationStage}` : ''}`;
    if (!captured.has(checkpoint)) {
      captured.add(checkpoint); report.checkpoints.push({ checkpoint, realm: s.realm, power: s.revengePower, age: s.age });
      if (['first-python', 'revenge', 'advanced', 'boss', 'high'].includes(s.event?.id) || ['draft', 'mutation', 'fusion', 'tribulation', 'complete'].includes(s.phase)) {
        await layout(checkpoint);
      }
    }
    if (s.phase === 'complete') break;
    check(s.phase !== 'dead', 'Happy path died unexpectedly');
    if (s.phase === 'draft') {
      if (!reloadedDraft) {
        const raw = await page.evaluate(() => localStorage.getItem('feisheng.run.v1'));
        await page.reload(); await ui('continue').click();
        check(await page.evaluate(() => localStorage.getItem('feisheng.run.v1')) === raw, 'Reload changed draft, RNG or progress');
        reloadedDraft = true;
      }
      await action('pick').first().click();
    } else if (s.phase === 'mutation') await action('mutate', '[data-id="serpenteye"]').click();
    else if (s.phase === 'fusion') {
      const preferred = action('pick-fusion', '[data-id="abyss-eye"]');
      if (await preferred.count()) await preferred.click(); else await action('pick-fusion').first().click();
    }
    else if (s.phase === 'tribulation') {
      const fusion = action('tribulation-step', '[data-id="fusion"]');
      if (await fusion.count()) await fusion.click(); else await page.locator('[data-action="tribulation-step"]:not(:disabled)').first().click();
    }
    else if (s.event?.id === 'first-python') await action('resolve', '[data-choice="flee"]').click();
    else if (s.event?.id === 'revenge' || s.event?.id === 'remains') await action('resolve', '[data-choice="devour"]').click();
    else if (s.event?.id === 'swordsman') await action('resolve', '[data-choice="learn"]').click();
    else if (s.event?.id === 'ruin') await action('resolve', '[data-choice="probe"]').click();
    else if (s.event?.id === 'advanced') {
      const options = await action('resolve').all();
      let clicked = false;
      for (const option of options) {
        if (await option.getAttribute('data-choice') !== 'leave') { await option.click(); clicked = true; break; }
      }
      check(clicked, 'Advanced event had no actionable Build route');
    }
    else if (s.event?.id === 'high') {
      const options = await action('resolve').all();
      check(options.length > 0, 'High-realm event had no route');
      await options[0].click();
    }
    else if (s.event?.id === 'boss') {
      const options = page.locator('[data-action="resolve"]:not(:disabled)');
      check(await options.count() > 0, 'Boss opened without a viable route');
      await options.last().click();
    }
    else if (s.event?.id === 'hunt') {
      const devour = action('resolve', '[data-choice="devour"]');
      if (await devour.count()) await devour.click();
      else await action('resolve', '[data-choice="flee"]').click();
    } else if (await action('breakthrough').count()) {
      await action('breakthrough').click();
      if (!presentationChecked) {
        const presentation = await page.evaluate(() => ({ module: !!window.FSPresentation, ...window.FSPresentationUI?.diagnostics() }));
        check(presentation.module && presentation.majorVisible && presentation.majorKind === 'breakthrough', `Breakthrough presentation missing: ${JSON.stringify(presentation)}`);
        report.presentation = { module: true, breakthroughOverlay: true };
        presentationChecked = true;
      }
    }
    else if (s.realm >= 3 && s.vitality < 80) await action('act', '[data-kind="cultivate"]').click();
    else if (await action('challenge-boss').count()) {
      // If the UI offers the challenge, at least one route is viable. Prefer accumulating to a full bar first for stable smoke runs.
      if (s.xp < 12000) await action('act', '[data-kind="cultivate"]').click();
      else await action('challenge-boss').click();
    }
    else if (s.realm === 3 && s.advancedResolved < 2) await action('act', '[data-kind="explore"]').click();
    else if (s.realm >= 4 && s.realm <= 8 && !s.realmProofs.includes(s.realm)) await action('seek-proof').click();
    else if (s.realm === 1 && !s.flags.swordEvent) await action('act', '[data-kind="explore"]').click();
    else if (s.realm === 1 && !hunted) { hunted = true; await page.locator('[data-ui="nav-panel"][data-id="atlas"]').click(); await action('act', '[data-kind="hunt"]').click(); }
    else if (await action('cultivate-to-ready').isEnabled()) await action('cultivate-to-ready').click();
    else await action('act', '[data-kind="cultivate"]').click();
  }
  const finished = await state();
  check(finished.journey.enabled&&finished.journey.foundation.every((n,i)=>n>=2+Math.floor(i/3))&&journeyChecked,'New journey mode did not earn all nine realm foundations');
  report.journey={passed:true,newMode:true,journeys:finished.journey.serial,steps:journeySteps,foundation:finished.journey.foundation,reloadPreserved:true};
  check((await meta()).tutorialHidden === true, 'First ascension did not disable tutorial annotations');
  check(finished.phase === 'complete', 'Run failed to reach ascension within 400 UI steps');
  check(finished.mutations[0] === 'serpenteye', 'Chosen mutation was not saved');
  check(finished.fusions.length === 1, 'Gold-core fusion was not saved');
  check(finished.flags.pythonSlain && finished.revengePower >= 450, 'Revenge was not a guaranteed crush');
  check(finished.flags.bossSlain, 'Three-eye boss was not defeated');
  check(finished.flags.ascended && finished.realm === 9 && finished.tribulationStage === 3, 'Run did not complete three tribulations and ascend');
  check(finished.realmProofs.length === 5, 'High-realm proof chain is incomplete');
  check(finished.sword, 'Sword encounter did not activate the technique');
  check(finished.version === await page.evaluate(() => FSEngine.VERSION), 'Run save did not use the current save schema');
  check(typeof finished.bossRoute === 'string', 'Boss route was not recorded');
  check(finished.tribulationRoutes.length === 3, 'Tribulation route history is incomplete');
  check(presentationChecked, 'Presentation layer was not exercised by the real playthrough');
  check(await page.locator('.immortal-preview').innerText().then(t => t.includes('仙界噬灵虫')), 'Ascension Easter egg missing');
  check(await page.locator('.revenge-comparison').innerText().then(t => t.includes('150')), 'Original enemy power contrast missing');
  check(finished.ascendedPower > 1000000000 && Math.ceil(finished.ascendedPower * 1.7) > finished.ascendedPower, 'Ascension power contrast changed');
  report.completed = { phase: finished.phase, seed: finished.seed, realm: finished.realm, age: finished.age, firstPower: finished.firstPower, revengePower: finished.revengePower, mutation: finished.mutations[0], fusion: finished.fusions[0], bossRoute: finished.bossRoute, tribulationRoutes: finished.tribulationRoutes, batchCultivations: finished.batchCultivations, bossSlain: finished.flags.bossSlain, ascended: finished.flags.ascended, ascendedPower: finished.ascendedPower, proofs: finished.realmProofs, steps: iterations };

  const endingMeta = await meta();
  check(endingMeta?.version === await page.evaluate(() => FSMeta.VERSION), 'Reincarnation ledger was not saved');
  check(endingMeta.totals.ended === 1 && endingMeta.totals.ascended === 1, 'Completed run was not recorded exactly once');
  check(endingMeta.runHistory.length === 1 && endingMeta.runHistory[0].seed === finished.seed, 'Run history is missing or duplicated');
  check(typeof endingMeta.runHistory[0].summary === 'string' && endingMeta.runHistory[0].summary.length > 0, 'Previous-life character summary was not recorded');
  check(endingMeta.legacy && Array.isArray(endingMeta.legacy.echoes) && Array.isArray(endingMeta.legacy.legends), 'Previous-life legacy ledger is missing');
  check(await page.locator('.ending-title').count() === 1, 'Ending title panel is missing');
  check(await page.locator('[data-ui="carry-trace"]').count() === 3, 'Ending must offer exactly three trace candidates');
  report.metaAfterEnding = {
    totals: endingMeta.totals,
    discoveries: Object.fromEntries(Object.entries(endingMeta.discovered).map(([key, values]) => [key, values.length])),
    history: endingMeta.runHistory.length
  };

  await openPanel('codex');
  check(await page.locator('dialog').isVisible(), 'Fate codex did not open');
  const expectedCodexSections = await page.evaluate(() => FSMeta.codexSections(FSMeta.createMeta()).length);
  check(await page.locator('dialog .codex-section').count() === expectedCodexSections, 'Fate codex section count is incomplete');
  check(await page.locator('dialog .codex-entry.discovered').count() > 0, 'Fate codex did not record discoveries');
  await dialogLayout('codex');
  await page.locator('dialog [data-ui="close-dialog"]').click();

  await page.locator('[data-ui="nav-panel"][data-id="practice"]').click();
  const traceButton = page.locator('[data-ui="carry-trace"]').first();
  const selectedTrace = await traceButton.getAttribute('data-id');
  const traceData = await page.evaluate(id => FSData.TRACES.find(trace => trace.id === id), selectedTrace);
  await traceButton.click();
  const audioCues = await page.evaluate(() => FSSound.diagnostics().cueCounts);
  check(['talent','breakthrough','devour','mutation','fusion','demon','thunder','ascension','trace'].every(id => audioCues[id] > 0), 'Some real-playthrough sound cues never triggered');
  report.audioCues = audioCues;
  const selectedMeta = await meta();
  check(selectedMeta.nextTrace === selectedTrace && selectedMeta.nextTraceSource === finished.seed, 'Selected trace was not persisted for the next life');
  check(await page.locator('.trace-card.selected').count() === 1, 'Selected trace is not visibly marked');
  await shot('ending-trace-selected');
  const finalRaw = await page.evaluate(() => localStorage.getItem('feisheng.run.v1'));
  const finalMetaRaw = await page.evaluate(() => localStorage.getItem('feisheng.meta.v1'));

  await ui('new').click();
  check(await page.locator('dialog').isVisible(), 'Reincarnation confirmation did not open');
  check((await page.locator('dialog').innerText()).includes(traceData.name), 'Reincarnation confirmation does not name the selected trace');
  await dialogLayout('reincarnation-confirm');
  await ui('confirm-new').click();
  const inheritedRun = await state(), consumedMeta = await meta();
  check(inheritedRun.phase === 'talents' && inheritedRun.carriedTrace === selectedTrace, 'Next life did not inherit the selected trace');
  check(inheritedRun.traceSourceSeed === finished.seed, 'Next life did not record which previous life supplied the trace');
  check(consumedMeta.nextTrace === null && consumedMeta.nextTraceSource === null, 'One-use trace was not consumed at reincarnation');
  const guaranteed = await page.evaluate(trace => {
    const run = JSON.parse(localStorage.getItem('feisheng.run.v1'));
    const memories = run.offer.filter(id => FSData.TALENTS.find(talent => talent.id === id)?.exclusiveTrace);
    return { exact: run.offer.includes(trace.talentId), memories };
  }, traceData);
  check(guaranteed.exact && guaranteed.memories.length === 1 && guaranteed.memories[0] === traceData.talentId, 'Inherited trace did not guarantee exactly one matching memory talent');
  check((await page.locator('.trace-banner').innerText()).includes(traceData.name), 'Inherited trace banner is missing');
  await layout('inherited-talents');
  const inheritedIds = [traceData.talentId, ...inheritedRun.offer.filter(id => id !== traceData.talentId).slice(0, 2)];
  for (const id of inheritedIds) await action('select', `[data-id="${id}"]`).click();
  await action('confirm-talents').click();
  await action('preset', '[data-id="balanced"]').click();
  await action('enter').click();
  check(await page.locator('.legacy-echo').count() === 1, 'Inherited life arrival does not show the previous-life text echo');
  check((await page.locator('.legacy-echo').innerText()).includes('记忆') || (await page.locator('.legacy-echo').innerText()).includes('旧字'), 'Previous-life arrival echo is not clearly narrative-only');
  await action('cultivate-to-ready').click();
  check((await state()).event?.id === 'first-python', 'Inherited life did not stop at the serpent encounter');
  await action('resolve', '[data-choice="flee"]').click();
  const echoState = await state();
  check(echoState.event?.id === 'trace-echo' && echoState.event.trace === selectedTrace, 'Inherited trace did not open its early echo event');
  check(await page.locator('.trace-event').count() === 1, 'Trace echo event is not rendered');
  check((await page.locator('.event-title').innerText()).includes(traceData.echo.title), 'Trace echo title does not match the inherited trace');
  check((await page.locator('.trace-event').innerText()).includes(traceData.echo.text), 'Trace echo body does not match the inherited trace');
  await layout('inherited-trace-echo');
  await action('resolve', '[data-choice="remember"]').click();
  check((await state()).flags.traceEchoSeen, 'Trace echo was not recorded after resolution');
  report.reincarnation = { selectedTrace, traceName: traceData.name, memoryTalent: traceData.talentId, traceSourceSeed: finished.seed, consumed: true, echo: traceData.echo.title };

  // Keep the completed first life available for export, file-mode and visual QA.
  await page.evaluate(({ run, ledger }) => {
    localStorage.setItem('feisheng.run.v1', run);
    localStorage.setItem('feisheng.meta.v1', ledger);
  }, { run: finalRaw, ledger: finalMetaRaw });
  await page.reload(); await ui('continue').click();
  // File downloads are tested through separate CLI clicks: its download handler
  // owns downloaded artifacts and must not compete with download.saveAs here.
  report.exportsTestedSeparately = true;
  await openPanel('journal');
  check(await page.locator('dialog').isVisible(), 'Journal did not open');
  await shot('09-journal-mobile'); await openPanel('settings');
  await page.locator('#import-save').setInputFiles('tests/fixtures/invalid-save.json');
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('导入失败'));
  check(await page.evaluate(() => localStorage.getItem('feisheng.run.v1')) === finalRaw, 'Invalid import changed existing save');
  report.invalidImportProtected = true;

  await page.locator('#import-meta').setInputFiles('tests/fixtures/invalid-save.json');
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('导入失败'));
  check(await page.evaluate(() => localStorage.getItem('feisheng.meta.v1')) === finalMetaRaw, 'Invalid meta import changed the reincarnation ledger');
  report.invalidMetaImportProtected = true;

  await page.locator('#import-meta').setInputFiles(`${out}/meta-import-fixture.json`);
  await ui('confirm-import').click();
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('轮回册已载入'));
  check((await meta()).totals.ended === 0, 'Valid meta import did not replace the reincarnation ledger');
  report.validMetaImport = true;
  await page.evaluate(raw => localStorage.setItem('feisheng.meta.v1', raw), finalMetaRaw);
  await page.reload(); await ui('continue').click();
  await openPanel('journal'); await openPanel('settings');

  await page.locator('#import-save').setInputFiles(`${out}/import-fixture.json`);
  await ui('confirm-import').click();
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('本世存档已载入'));
  check((await state()).seed === 4242 && (await state()).phase === 'playing', 'Valid import did not load the selected save');
  report.validImport = true;
  await page.evaluate(({ run, ledger }) => {
    localStorage.setItem('feisheng.run.v1', run);
    localStorage.setItem('feisheng.meta.v1', ledger);
  }, { run: finalRaw, ledger: finalMetaRaw });
  await page.reload(); await ui('continue').click();
  await ui('new').click(); await ui('close-dialog').first().click();
  check(await page.evaluate(() => localStorage.getItem('feisheng.run.v1')) === finalRaw, 'Cancel new run erased save');
  check(await page.evaluate(() => localStorage.getItem('feisheng.meta.v1')) === finalMetaRaw, 'Cancel new run changed the reincarnation ledger');
  report.cancelRestartProtected = true;
  await page.evaluate(() => localStorage.setItem('feisheng.run.v1', '{broken'));
  await page.reload();
  check(await page.locator('.storage-warning').count() === 1, 'Corrupted save did not show a warning');
  check(await page.evaluate(() => localStorage.getItem('feisheng.run.v1')) === '{broken', 'Corrupted raw save was overwritten');
  report.corruptSaveProtected = true;
  await page.evaluate(({ run, ledger }) => {
    localStorage.setItem('feisheng.run.v1', run);
    localStorage.setItem('feisheng.meta.v1', ledger);
  }, { run: finalRaw, ledger: finalMetaRaw });
  await page.reload(); await ui('continue').click();
  await page.evaluate(() => {
    window.__originalStorageSetter = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('Blocked for test', 'SecurityError'); };
  });
  await ui('new').click(); await ui('confirm-new').click();
  check(await page.locator('.storage-warning').count() === 1, 'Blocked storage must be visible, not silent');
  check(await action('select').count() === 8, 'Blocked storage must still allow in-memory play');
  await page.evaluate(({ run, ledger }) => {
    Storage.prototype.setItem = window.__originalStorageSetter;
    localStorage.setItem('feisheng.run.v1', run);
    localStorage.setItem('feisheng.meta.v1', ledger);
  }, { run: finalRaw, ledger: finalMetaRaw });
  report.storageDeniedFallback = true;
  const sourceFile = options.fileRoots?.find(([mode]) => mode === 'source')?.[1] || 'file:///D:/我欲飞升/index.html';
  await page.goto(sourceFile);
  await page.evaluate(() => {
    localStorage.removeItem('feisheng.run.v1');
    localStorage.removeItem('feisheng.backup.v1');
    localStorage.removeItem('feisheng.meta.v1');
  });
  await page.reload();
  check((await page.title()).includes(`v${version}`), 'Double-click file mode failed or shows the wrong version');
  check(await ui('new').count() === 1, 'File mode did not render');
  await ui('new').click();
  if (await ui('confirm-new').count()) await ui('confirm-new').click();
  check(await action('select').count() === 8, 'File mode scripts did not run');
  await ui('home').click();
  check(await ui('codex').count() >= 1, 'File mode did not load the reincarnation UI');
  report.fileMode = true;
  await page.goto(baseURL); await ui('continue').click();
  await background('normal-motion-ascension');
  const activeMotion = await page.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest?.('#world') && a.playState === 'running').map(a => a.animationName));
  check(activeMotion.length === 0, 'Retired ambient layer is still animating'); report.activeMotion = activeMotion;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  check(motion, 'Reduced-motion emulation failed');
  const reduced = await page.evaluate(() => ({
    running: document.getAnimations().filter(a => a.effect?.target?.closest?.('#world') && a.playState === 'running').length,
    styles: [...document.querySelectorAll('.world-fx,.world-image')].map(el => ({ animation: getComputedStyle(el).animationName, transition: getComputedStyle(el).transitionDuration })),
    lightningOpacity: getComputedStyle(document.querySelector('.world-lightning')).opacity
  }));
  check(reduced.running === 0 && reduced.styles.every(x => x.animation === 'none' && x.transition === '0s'), 'Reduced motion did not disable background animations and crossfades');
  check(Number(reduced.lightningOpacity) === 0, 'Reduced motion still flashes lightning');
  report.reducedMotion = reduced;
  await page.setViewportSize({ width: 390, height: 844 }); await shot('10-final-mobile');
  report.errors = errors; check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  check(report.failedRequests.length === 0, `Failed background/resource requests: ${JSON.stringify(report.failedRequests)}`);
  const external = report.requests.filter(url => /^https?:/.test(url) && url !== baseURL && !url.startsWith(`${baseURL}/`));
  check(external.length === 0, `Unexpected external resources: ${external.join(', ')}`);
  report.externalRequests = external.length;
  return report;
}
