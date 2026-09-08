'use strict';
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..', 'output', 'playwright');
const log = fs.readFileSync(path.join(base, 'browser-smoke.log'), 'utf8');
const result = log.match(/### Result\s*\n([\s\S]*?)(?=\n### |$)/);
if (!result) throw new Error('Browser command did not return a completed result. Inspect browser-smoke.log; do not count this as a pass.');
const report = JSON.parse(result[1]);
if (!report.completed || report.completed.phase !== 'complete' || report.errors.length) throw new Error('Browser regression incomplete or failed.');
fs.writeFileSync(path.join(base, 'browser-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  completed: report.completed,
  layouts: report.layouts.length,
  widths: [...new Set(report.layouts.map(l => l.width))],
  screenshots: report.screenshots.length,
  exportsTestedSeparately: report.exportsTestedSeparately,
  invalidImportProtected: report.invalidImportProtected,
  validImport: report.validImport,
  cancelRestartProtected: report.cancelRestartProtected,
  corruptSaveProtected: report.corruptSaveProtected,
  storageDeniedFallback: report.storageDeniedFallback,
  fileMode: report.fileMode,
  reducedMotion: report.reducedMotion,
  externalRequests: report.externalRequests,
  errors: report.errors
}, null, 2));
