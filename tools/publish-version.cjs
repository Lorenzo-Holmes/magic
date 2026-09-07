'use strict';
// Publish reviewed source without touching the parent drive's Git configuration.
// gh supplies its own credential; no token is read, printed or written here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const { version } = require('../package.json');
const repo = 'Lorenzo-Holmes/magic';
const expected = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(expected || '')) throw new Error('Provide the inspected remote parent SHA.');
function api(endpoint, body) {
  const args = ['api', `repos/${repo}/${endpoint}`];
  if (body) args.push('--method', endpoint.startsWith('git/refs/') ? 'PATCH' : 'POST', '--input', '-');
  return JSON.parse(execFileSync('gh', args, { input: body ? Buffer.from(JSON.stringify(body), 'utf8') : undefined, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
}
const acceptance = JSON.parse(fs.readFileSync(`release/acceptance-v${version}.json`, 'utf8'));
const build = JSON.parse(fs.readFileSync('release/build-report.json', 'utf8'));
if (!acceptance.passed || acceptance.version !== version || acceptance.zipSha256 !== build.zipSha256) throw new Error('Current version has no matching passing acceptance.');
for (const file of build.files) {
  if (crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex') !== file.sha256) throw new Error(`Source changed after acceptance: ${file.path}`);
}
const current = api('git/ref/heads/main').object.sha;
if (current !== expected) throw new Error(`Remote moved: expected ${expected}, got ${current}. Review before retrying.`);
const tree = api(`git/trees/${current}?recursive=1`);
if (tree.truncated) throw new Error('Remote tree incomplete.');
const remote = new Map(tree.tree.filter(x => x.type === 'blob').map(x => [x.path, x.sha]));
const roots = ['.gitignore', 'index.html', 'package.json', 'README.md', 'src', 'assets', 'tests', 'tools', 'docs'];
const files = [];
function walk(name) {
  const stat = fs.lstatSync(name);
  if (stat.isSymbolicLink()) throw new Error(`Do not publish links: ${name}`);
  if (stat.isDirectory()) for (const child of fs.readdirSync(name)) walk(`${name}/${child}`);
  else files.push(name);
}
roots.forEach(walk);
const changes = [];
for (const file of files) {
  if (/node_modules|\.env|(?:^|\/)\.cache|\.pem$|\.key$|output\//i.test(file)) throw new Error(`Unsafe source path: ${file}`);
  const raw = fs.readFileSync(file);
  if (raw.length > 1024 * 1024 || raw.includes(0)) throw new Error(`Unexpected binary/large source: ${file}`);
  const content = raw.toString('utf8');
  if (!Buffer.from(content, 'utf8').equals(raw)) throw new Error(`Non-UTF8 source: ${file}`);
  if (/gh[pousr]_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) throw new Error(`Credential-like content: ${file}`);
  const blob = crypto.createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
  if (remote.get(file) !== blob) changes.push({ path: file, mode: '100644', type: 'blob', content });
}
if (!changes.length) throw new Error('No changed source to publish.');
// base_tree preserves remote-only files. No deleting unrelated remote work.
const nextTree = api('git/trees', { base_tree: tree.sha, tree: changes });
const commit = api('git/commits', { message: `feat: wo-yu-fei-sheng v${version}`, tree: nextTree.sha, parents: [current] });
if (api('git/ref/heads/main').object.sha !== current) throw new Error('Remote moved while preparing commit; no ref was changed.');
api('git/refs/heads/main', { sha: commit.sha, force: false });
if (api('git/ref/heads/main').object.sha !== commit.sha) throw new Error('Remote verification failed.');
const checked = api(`git/trees/${commit.sha}?recursive=1`);
const published = new Map(checked.tree.filter(x => x.type === 'blob').map(x => [x.path, x.sha]));
for (const file of files) {
  const bytes = fs.readFileSync(file), sha = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (published.get(file) !== sha) throw new Error(`Remote bytes differ: ${file}`);
}
const result = { version, repo, branch: 'main', parent: current, commit: commit.sha, zipSha256: build.zipSha256, sourceFiles: files.length, changed: changes.map(x => x.path), verified: true };
fs.writeFileSync(`release/push-v${version}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
