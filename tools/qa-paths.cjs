'use strict';
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { version } = require('../package.json');
const base = path.join(root, 'output/playwright', `v${version}`);
// An optional run directory prevents concurrent/manual QA from mixing evidence.
// Restrict all overrides to this project's versioned QA folder.
const out = process.env.FS_QA_OUTPUT ? path.resolve(root, process.env.FS_QA_OUTPUT) : base;
const relative = path.relative(base, out);
if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
  throw new Error('FS_QA_OUTPUT must stay inside the project versioned QA folder.');
}
module.exports = Object.freeze({ root, base, out });
