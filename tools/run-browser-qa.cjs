'use strict';
// Reuses the existing Playwright suites; no production dependency or CDN.
// All profiles, downloads, temporary files and reports stay inside this project.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { version } = require('../package.json');
const base = path.join(root, 'output/playwright', `v${version}`);
const runs = path.join(base, 'runs'); fs.mkdirSync(runs, { recursive: true });
const out = fs.mkdtempSync(path.join(runs, 'acceptance-'));
process.env.FS_QA_OUTPUT = out;
const relativeOut = path.relative(root, out).split(path.sep).join('/');
const tmp = path.join(root, '.cache/tmp');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
process.chdir(root);
Object.assign(process.env, { TEMP: tmp, TMP: tmp, TMPDIR: tmp });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const writeJSON = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
function localPlaywright() {
  const candidates = [path.join(root, 'node_modules/playwright')];
  const cache = path.join(root, '.cache/npm/_npx');
  if (fs.existsSync(cache)) for (const folder of fs.readdirSync(cache)) candidates.push(path.join(cache, folder, 'node_modules/playwright'));
  for (const candidate of candidates) if (fs.existsSync(path.join(candidate, 'package.json'))) return { module: require(candidate), path: candidate, version: require(path.join(candidate, 'package.json')).version };
  throw new Error('No project-local Playwright found. Install development tooling into this project or its .cache/npm directory; this runner never downloads tools implicitly.');
}
function tool(file, args = [], logName) {
  const output = execFileSync(process.execPath, [path.join(__dirname, file), ...args], { cwd: root, env: process.env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (logName) fs.writeFileSync(path.join(out, logName), output);
  return output;
}
let server, context;
async function startServer() {
  server = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '--dist'], { cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '';
    const timer = setTimeout(() => reject(new Error(`Preview did not start: ${stdout}\n${stderr}`)), 15000);
    server.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const match = stdout.match(/FeiSheng preview: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.stderr.on('data', chunk => { stderr += chunk.toString(); });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited (${code}): ${stderr}`)); });
  });
}
async function suite(name, baseURL, build) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
  await page.goto(baseURL);
  writeJSON(`${name}-report.json`, { passed: false, status: 'running', version, testedZipSha256: build.zipSha256 });
  console.log(`Running ${name} against ${baseURL} ...`);
  try {
    const source = fs.readFileSync(path.join(__dirname, `${name}.js`), 'utf8');
    const run = vm.runInThisContext(`(${source})`, { filename: `${name}.js` });
    const result = await run(page, { out: relativeOut, evolutionAction: require('./evolution-policy.cjs').next, fileRoots: [
      ['source', pathToFileURL(path.join(root, 'index.html')).href],
      ['dist', pathToFileURL(path.join(root, 'dist/index.html')).href],
      ['zip-extracted', pathToFileURL(path.join(out, 'package/index.html')).href]
    ] });
    result.startedFrom = 'production dist; dedicated project-local Chromium profile';
    result.completedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, `${name}.log`), `### Result\n${JSON.stringify(result)}\n`);
    const summary = tool('qa-summary.cjs', [name], `${name}-summary.log`);
    console.log(summary.trim());
    return page;
  } catch (error) {
    fs.writeFileSync(path.join(out, `${name}.log`), `### Error\n${error.stack}\n`);
    writeJSON(`${name}-report.json`, { passed: false, status: 'failed', version, testedZipSha256: build.zipSha256, error: error.stack });
    try {
      await page.screenshot({ path: path.join(out, `${name}-failure.png`), fullPage: true });
      writeJSON(`${name}-failure.json`, await page.evaluate(() => ({
        href: location.href, hidden: document.hidden, visibility: document.visibilityState,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        world: { ...document.querySelector('#world')?.dataset },
        animations: document.getAnimations().map(a => ({ name: a.animationName, state: a.playState, currentTime: a.currentTime, pending: a.pending }))
      })));
    } catch { /* Preserve the original failure even if the browser has closed. */ }
    throw error;
  }
}
async function verifyDownloads(page) {
  const requests = [], errors = [];
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const [png] = await Promise.all([
    page.waitForEvent('download'), page.locator('[data-ui="share"]').click()
  ]);
  assert.equal(await png.failure(), null);
  const imagePath = path.join(out, 'exported-mingge.png');
  await png.saveAs(imagePath);
  const bytes = fs.readFileSync(imagePath);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), 720); assert.equal(bytes.readUInt32BE(20), 1040);
  await page.locator('[data-ui="journal"]').first().click();
  await page.locator('dialog [data-ui="settings"]').click();
  const [json] = await Promise.all([
    page.waitForEvent('download'), page.locator('dialog [data-ui="export"]').click()
  ]);
  assert.equal(await json.failure(), null);
  const savePath = path.join(out, 'exported-save.json'); await json.saveAs(savePath);
  const raw = fs.readFileSync(savePath, 'utf8');
  const save = require('../src/engine.js').deserialize(raw);
  assert.equal(save.phase, 'complete'); assert.equal(save.flags.ascended, true);
  assert.deepEqual(JSON.parse(raw), await page.evaluate(() => JSON.parse(localStorage.getItem('feisheng.run.v1'))));

  const [ledgerDownload] = await Promise.all([
    page.waitForEvent('download'), page.locator('dialog [data-ui="export-meta"]').click()
  ]);
  assert.equal(await ledgerDownload.failure(), null);
  const ledgerPath = path.join(out, 'exported-reincarnation-ledger.json');
  await ledgerDownload.saveAs(ledgerPath);
  const ledgerRaw = fs.readFileSync(ledgerPath, 'utf8');
  const ledger = require('../src/meta.js').deserialize(ledgerRaw);
  assert.ok(ledger.totals.ended >= 1 && ledger.totals.ascended >= 1);
  assert.deepEqual(JSON.parse(ledgerRaw), await page.evaluate(() => JSON.parse(localStorage.getItem('feisheng.meta.v1'))));
  assert.equal(errors.length, 0);
  assert.equal(requests.filter(url => /^https?:/.test(url)).length, 0);
  const result = { passed: true, png: { path: imagePath, bytes: bytes.length, width: 720, height: 1040, sha256: sha(bytes) },
    save: { path: savePath, bytes: Buffer.byteLength(raw), version: save.version, phase: save.phase, matchesCurrentSave: true },
    ledger: { path: ledgerPath, bytes: Buffer.byteLength(ledgerRaw), version: ledger.version, ended: ledger.totals.ended, ascended: ledger.totals.ascended, matchesCurrentLedger: true },
    errors, externalRequests: 0 };
  writeJSON('downloads-report.json', result);
  await page.locator('dialog [data-ui="close-dialog"]').click();
  return result;
}
async function main() {
  const startedAt = new Date().toISOString();
  console.log(`Isolated acceptance evidence: ${out}`);
  writeJSON('final-qa-report.json', { version, passed: false, status: 'running', startedAt });
  const playwright = localPlaywright();
  tool('verify-release.cjs', [], 'package-check.log');
  tool('make-test-fixture.cjs');
  const build = JSON.parse(fs.readFileSync(path.join(root, 'release/build-report.json'), 'utf8'));
  const profileRoot = path.join(root, '.cache', `browser-qa-v${version.replace(/\./g, '')}`); fs.mkdirSync(profileRoot, { recursive: true });
  const profile = fs.mkdtempSync(path.join(profileRoot, 'run-'));
  const baseURL = await startServer();
  context = await playwright.module.chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: true, viewport: { width: 390, height: 844 },
    acceptDownloads: true, downloadsPath: path.join(out, 'downloads'),
    args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'],
    env: process.env
  });
  for (const blank of context.pages()) await blank.close();
  const smokePage = await suite('browser-smoke', baseURL, build);
  tool('prepare-visual-fixtures.cjs', [], 'visual-fixtures.log');
  await smokePage.close();
  const visualPage = await suite('browser-visual', baseURL, build);
  await visualPage.close();
  const extensionPage = await suite('browser-extension', baseURL, build);
  const extension = JSON.parse(fs.readFileSync(path.join(out, 'browser-extension-report.json'), 'utf8'));
  const downloads = await verifyDownloads(extensionPage);
  tool('verify-release.cjs', [], 'package-check.log');
  const currentBuild = JSON.parse(fs.readFileSync(path.join(root, 'release/build-report.json'), 'utf8'));
  assert.equal(currentBuild.zipSha256, build.zipSha256, 'Candidate changed during browser verification');
  const smoke = JSON.parse(fs.readFileSync(path.join(out, 'browser-smoke-report.json'), 'utf8'));
  const visual = JSON.parse(fs.readFileSync(path.join(out, 'browser-visual-report.json'), 'utf8'));
  const result = { version, passed: true, startedAt, completedAt: new Date().toISOString(),
    browser: context.browser()?.version(), playwright: playwright.version, profile, baseURL, evidenceDirectory: out,
    testedZipSha256: build.zipSha256, zipBytes: build.zipBytes,
    mainFlow: smoke.completed, batchCultivation: smoke.batchCultivation,
    reincarnation: smoke.reincarnation, metaAfterEnding: smoke.metaAfterEnding,
    layoutChecks: smoke.layouts.length + extension.layouts.length, dialogLayoutChecks: smoke.dialogLayouts.length,
    widths: [...new Set(smoke.layouts.map(x => x.width))],
    backgrounds: visual.backgrounds.length, highEventFixtures: visual.highEvents.length, traceEventFixtures: visual.traceEvents.length,
    fileCases: visual.fileCases.length, reducedMotion: true,
    extension: { audio: extension.audio, immortal: extension.immortal, evolution: extension.evolution },
    consoleErrors: [...smoke.errors, ...visual.errors, ...extension.errors, ...downloads.errors],
    failedRequests: [...smoke.failedRequests, ...visual.failedRequests, ...extension.failedRequests],
    externalRequests: smoke.externalRequests + visual.externalRequests + extension.externalRequests + downloads.externalRequests,
    downloadsVerified: downloads.passed,
    scope: 'One real DOM-click mortal playthrough, plus its earned-save immortal continuation. Visual fixtures and file-mode imported checkpoints are not separate playthroughs. Desktop Chromium is not a physical iOS/Android device test.' };
  writeJSON('final-qa-report.json', result);
  const evidence = fs.readdirSync(out, { withFileTypes: true }).filter(e => e.isFile()).map(e => {
    const bytes = fs.readFileSync(path.join(out, e.name));
    return { file: e.name, bytes: bytes.length, sha256: sha(bytes) };
  });
  writeJSON('evidence-manifest.json', { version, testedZipSha256: build.zipSha256, createdAt: new Date().toISOString(), files: evidence });
  fs.writeFileSync(path.join(base, 'latest-isolated-run.json'), JSON.stringify({ version, passed: true, evidenceDirectory: out, testedZipSha256: build.zipSha256 }, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => {
  writeJSON('final-qa-report.json', { version, passed: false, status: 'failed', completedAt: new Date().toISOString(), error: error.stack });
  console.error(error.stack); process.exitCode = 1;
}).finally(async () => {
  if (context) await context.close().catch(() => {});
  if (server && server.exitCode === null) server.kill();
});
