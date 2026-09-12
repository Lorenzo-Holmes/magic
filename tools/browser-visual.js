async (page, options = {}) => {
  const baseURL = await page.evaluate(() => location.origin);
  const version = await page.evaluate(() => FSScenes.VERSION);
  const out = options.out || `output/playwright/v${version}`;
  const report = { version, backgrounds: [], specialAtmospheres: [], highEvents: [], traceEvents: [], fileCases: [], screenshots: [], requests: [], errors: [], failedRequests: [] };
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('request', r => report.requests.push(r.url()));
  page.on('requestfailed', r => report.failedRequests.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  async function restore(file) {
    if (await page.locator('dialog[open]').count()) await page.locator('dialog [data-ui="close-dialog"]').click();
    const settings = page.locator('[data-ui="settings"]:visible').first();
    check(await settings.count(), 'No visible settings entry for fixture restore');
    await settings.click();
    if (!(await page.locator('#import-save').count())) await page.locator('dialog [data-ui="settings"]').click();
    await page.locator('#import-save').setInputFiles(`${out}/states/${file}.json`);
    await page.locator('dialog [data-ui="confirm-import"]').click();
    await page.evaluate(() => {
      const notice = document.querySelector('#notice');
      notice?.classList.remove('visible');
      if (notice) notice.textContent = '';
    });
  }
  async function ready(scene, atmosphere) {
    await page.waitForFunction(() => {
      const w = document.querySelector('#world'), i = w.querySelector('.world-image.is-visible');
      return w.dataset.loadedScene === w.dataset.scene && !w.dataset.sceneError && i.complete && i.naturalWidth > 0;
    });
    const data = await page.evaluate(() => {
      const w = document.querySelector('#world'), image = w.querySelector('.world-image.is-visible');
      return { scene: w.dataset.scene, atmosphere: w.dataset.atmosphere, image: image.src,
        width: image.naturalWidth, height: image.naturalHeight, fit: getComputedStyle(image).objectFit,
        worldWidth: w.getBoundingClientRect().width, viewport: innerWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    check(data.scene === scene, `Expected ${scene}, got ${data.scene}`);
    if (atmosphere) check(data.atmosphere === atmosphere, `Expected ${atmosphere}, got ${data.atmosphere}`);
    check(data.fit === 'cover' && data.width / data.height === 540 / 960, 'Background image stretched');
    check(!data.horizontalOverflow && data.worldWidth <= data.viewport + 1, 'Background caused page overflow');
    return data;
  }
  async function reduced() {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const result = await page.evaluate(() => ({
      active: document.getAnimations().filter(a => a.effect?.target?.closest?.('#world') && a.playState === 'running').length,
      css: [...document.querySelectorAll('.world-fx,.world-image')].every(el => getComputedStyle(el).animationName === 'none' && getComputedStyle(el).transitionDuration === '0s'),
      lightning: getComputedStyle(document.querySelector('.world-lightning')).opacity
    }));
    check(result.active === 0 && result.css && Number(result.lightning) === 0, 'Reduced motion failed');
    return result;
  }
  async function fullShot(filename) {
    const previous = await page.evaluate(() => {
      const root = document.documentElement, value = root.style.scrollbarWidth;
      root.style.scrollbarWidth = 'none'; return value;
    });
    try { await page.screenshot({ path: filename, fullPage: true }); }
    finally { await page.evaluate(value => { document.documentElement.style.scrollbarWidth = value; }, previous); }
  }
  const core = [
    ['mortal', 'calm'], ['foundation', 'calm'], ['goldcore', 'calm'], ['nascent', 'calm'],
    ['void', 'calm'], ['tribulation', 'thunder'], ['ascension', 'ascension']
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [scene, atmosphere] of core) {
    await page.bringToFront();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await restore(`${scene}--${atmosphere}`);
    const data = await ready(scene, atmosphere);
    await page.waitForTimeout(1350);
    // Legacy scene metadata still loads for old saves; visible art is static ink.
    const animation=await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest?.('#world')&&a.playState==='running').map(a=>a.animationName));
    check(animation.length===0,'Removed ambient layer still animates');
    const painting=page.locator('.v3-cave-bg,.cultivation-scene-painting').first();
    if(await painting.count())check(await painting.evaluate(i=>i.complete&&i.naturalWidth>=704),'Generated portrait artwork failed to load at its documented production resolution');
    if(scene==='tribulation')report.lightning={enabled:false,reason:'Static ink art replaces flashing scenery'};
    report.backgrounds.push({ ...data, animation, reducedMotion: await reduced() });
    const filename = `${out}/verified-${scene}-390.png`;
    await page.evaluate(() => scrollTo(0, 0));
    await fullShot(filename); report.screenshots.push(filename);
  }
  for (const [scene, atmosphere] of [
    ['mortal','serpent-danger'], ['foundation','serpent-prey'], ['goldcore','gold-fusion'], ['goldcore','demon-eye']
  ]) {
    await restore(`${scene}--${atmosphere}`);
    report.specialAtmospheres.push({ ...await ready(scene, atmosphere), reducedMotion: await reduced() });
  }
  const high = await page.evaluate(() => FSData.HIGH_EVENTS.map(e => ({ id: e.id, realm: e.realm,
    background: FSScenes.REALM_SCENES[e.realm], atmosphere: FSScenes.HIGH_ATMOSPHERES[e.id] })));
  for (const event of high) {
    await restore(`high-${event.id}`);
    report.highEvents.push({ id: event.id, fixtureOnly: true, ...await ready(event.background, event.atmosphere), reducedMotion: await reduced() });
  }
  const traces = await page.evaluate(() => FSData.TRACES.map(trace => ({
    id: trace.id, name: trace.name, atmosphere: FSScenes.TRACE_ATMOSPHERES[trace.id],
    echo: trace.echo.title, echoText: trace.echo.text,
    resonance: trace.resonance.title, resonanceText: trace.resonance.text
  })));
  for (const trace of traces) {
    for (const kind of ['echo', 'resonance']) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await restore(`trace-${trace.id}-${kind}`);
      const scene = kind === 'echo' ? 'mortal' : 'nascent';
      const data = await ready(scene, trace.atmosphere);
      const title = await page.locator('.event-title').innerText(), text = await page.locator('.trace-event').innerText();
      check(title.includes(trace[kind]), `${trace.id}/${kind}: trace event title is missing`);
      check(text.includes(trace[`${kind}Text`]), `${trace.id}/${kind}: trace event body is missing`);
      check(await page.locator('[data-action="resolve"][data-choice="remember"]').count() === 1, `${trace.id}/${kind}: trace event has no continue action`);
      const filename = `${out}/verified-trace-${trace.id}-${kind}-390.png`;
      await page.evaluate(() => scrollTo(0, 0));
      await fullShot(filename); report.screenshots.push(filename);
      report.traceEvents.push({ id: trace.id, kind, fixtureOnly: true, ...data, reducedMotion: await reduced() });
    }
  }
  const roots = options.fileRoots || [
    ['source', 'file:///D:/我欲飞升/index.html'],
    ['dist', 'file:///D:/我欲飞升/dist/index.html'],
    ['zip-extracted', `file:///D:/我欲飞升/output/playwright/v${version}/package/index.html`]
  ];
  for (const [mode, url] of roots) {
    await page.goto(url);
    check((await page.title()).includes(`v${version}`), `${mode}: wrong version`);
    for (const [scene, atmosphere] of core) {
      await restore(`${scene}--${atmosphere}`);
      report.fileCases.push({ mode, ...await ready(scene, atmosphere) });
    }
    await page.setViewportSize({ width: 320, height: 844 });
    const numbers = await page.locator('.ascension-ending .revenge-comparison strong').evaluateAll(elements => elements.map(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      return { text: el.textContent, lines: range.getClientRects().length };
    }));
    check(numbers.length === 2 && numbers.every(n => n.lines === 1), `${mode}: narrow-screen power number split`);
    check(await page.locator('.immortal-preview').count() === 0, `${mode}: retired immortal transition preview returned`);
    await page.locator('.ascension-ending .chapter-entry').scrollIntoViewIfNeeded();
    const screenshot = `${out}/verified-${mode}-ascension-ending-320.png`;
    await page.screenshot({ path: screenshot }); report.screenshots.push(screenshot);
    await page.setViewportSize({ width: 390, height: 844 });
  }
  // Return to the production HTTP save for separate real export clicks.
  await page.goto(baseURL); await restore('ascension--ascension'); await ready('ascension', 'ascension');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const external = report.requests.filter(url => /^https?:/.test(url) && url !== baseURL && !url.startsWith(`${baseURL}/`));
  report.externalRequests = external.length;
  check(!external.length && !report.errors.length && !report.failedRequests.length, 'Unexpected resources or browser errors');
  report.passed = true;
  return report;
}
