'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { out: base } = require('./qa-paths.cjs');
const name = process.argv[2] || 'browser-smoke';
const log = fs.readFileSync(path.join(base, `${name}.log`), 'utf8');
const match = log.match(/### Result\s*\n([\s\S]*?)(?=\n### |$)/);
if (!match) throw new Error('No completed browser result; inspect the log. Do not report this run as a pass.');
const report = JSON.parse(match[1]);
report.testedZipSha256 = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../release/build-report.json'), 'utf8')).zipSha256;
if (report.errors?.length || report.failedRequests?.length) throw new Error('Browser reported errors.');
if (report.externalRequests !== 0) throw new Error('Unexpected external resource requests.');
if (name === 'browser-smoke' && report.completed?.phase !== 'complete') throw new Error('Main route did not finish.');
if (name === 'browser-visual' && report.passed !== true) throw new Error('Visual matrix did not finish.');
if (name === 'browser-extension' && report.passed !== true) throw new Error('Extension suite did not finish.');
if (report.sceneStates) {
  fs.mkdirSync(path.join(base, 'states'), { recursive: true });
  for (const [id, state] of Object.entries(report.sceneStates)) {
    require('../src/engine.js').validate(state);
    fs.writeFileSync(path.join(base, 'states', `${id}.json`), JSON.stringify(state));
  }
  report.sceneStateFiles = Object.keys(report.sceneStates).map(id => `states/${id}.json`);
  delete report.sceneStates;
}
fs.writeFileSync(path.join(base, `${name}-report.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ version: report.version, completed: report.completed, passed: report.passed,
  layouts: report.layouts?.length, screenshots: report.screenshots?.length,
  widths: report.layouts && [...new Set(report.layouts.map(l => l.width))],
  scenes: report.scenes && [...new Set(report.scenes.map(s => `${s.scene}/${s.atmosphere}`))],
  backgrounds: report.backgrounds?.length, highEvents: report.highEvents?.length, traceEvents: report.traceEvents?.length, fileCases: report.fileCases?.length,
  reducedMotion: report.reducedMotion, fileMode: report.fileMode, lightning: report.lightning,
  requests: report.requests?.length, externalRequests: report.externalRequests,
  errors: report.errors, failedRequests: report.failedRequests, testedZipSha256: report.testedZipSha256 }, null, 2));
