async (page, options = {}) => {
  const version = await page.evaluate(() => FSScenes.VERSION), baseURL = new URL(page.url()).origin;
  const out = options.out || `output/playwright/v${version}`;
  const report = { version, passed: false, errors: [], requests: [], failedRequests: [], layouts: [], screenshots: [] };
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
  page.on('request', r => report.requests.push(r.url()));
  page.on('requestfailed', r => report.failedRequests.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  const ui = name => page.locator(`[data-ui="${name}"]`);
  const action = name => page.locator(`[data-action="${name}"]`);
  const run = () => page.evaluate(() => JSON.parse(localStorage.getItem('feisheng.run.v1')));
  async function close() { if (await page.locator('dialog[open]').count()) await page.locator('dialog [data-ui="close-dialog"]').click(); }
  async function restore(name) {
    await close(); await ui('journal').first().click();
    if (!(await page.locator('#import-save').count())) await page.locator('dialog [data-ui="settings"]').click();
    await page.locator('#import-save').setInputFiles(`${out}/states/${name}.json`);
    await page.locator('[data-ui="confirm-import"]').click();
  }
  async function layout(name) {
    for (const width of [320, 390, 430, 1280]) {
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
  await restore('ascension--ascension');
  report.externalRequests = report.requests.filter(url => /^https?:/.test(url) && !url.startsWith(`${baseURL}/`) && url !== baseURL).length;
  check(report.externalRequests === 0 && report.errors.length === 0 && report.failedRequests.length === 0, 'Extension produced network or browser errors');
  report.passed = true;
  return report;
}
