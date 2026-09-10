'use strict';
// Focused source-preview acceptance. Uses an isolated browser context and the
// existing local server; it never reads or replaces the user's browser profile.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const baseURL = 'http://127.0.0.1:4317';
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
