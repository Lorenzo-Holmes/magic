'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const A = require('../tools/import-ui-v3-art.cjs');
const ROOT = path.resolve(__dirname, '..');
function zip(rows) {
  const locals = [], central = []; let offset = 0;
  for (const [name, bytes] of rows) {
    const n = Buffer.from(name), packed = zlib.deflateRawSync(bytes), crc = A.crc32(bytes);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(bytes.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    locals.push(local, n, packed); central.push(c, n); offset += local.length + n.length + packed.length;
  }
  const dir = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(rows.length, 8); end.writeUInt16LE(rows.length, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}
function fixture() {
  // Container/image decoding is checked independently; these are parser-only
  // RIFF fixtures, never generated game artwork or production test evidence.
  const files = new Map(), assets = [];
  for (let i = 0; i < 82; i++) {
    const data = Buffer.from('RIFFxxxxWEBPfixture-' + i), p = `assets/ui-v3/icons/test-${i}.webp`;
    files.set(p, data); assets.push({ id: 'test.' + i, path: p, bytes: data.length, sha256: A.sha(data), width: 1, height: 1 });
  }
  files.set('assets/ui-v3/manifest.json', Buffer.from(JSON.stringify({ schemaVersion: 1, assets })));
  files.set('assets/ui-v3/manifest.js', Buffer.from('throw new Error("must never execute");'));
  return files;
}
function temp(t) {
  const parent = path.join(ROOT, '.cache'); fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'art-import-test-')); fs.mkdirSync(path.join(root, 'assets'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root;
}
test('美术导入只接受图像与两个固定清单路径', () => {
  assert.ok(A.safeName('assets/ui-v3/scenes/cave.webp'));
  for (const p of ['../app.js', 'assets/ui-v3/../../app.js', 'assets/ui-v3/icon.exe', 'C:/a.webp', 'assets\\ui-v3\\x.webp', 'assets/ui-v3/icons/a.js']) assert.equal(A.safeName(p), false);
});
test('ZIP 中央目录、本地文件、CRC 与字节往返一致', () => {
  const rows = [['assets/ui-v3/manifest.json', Buffer.from('{}')]];
  assert.deepEqual([...A.readZip(zip(rows))], rows);
});
test('ZIP 目录穿越、重复文件与截断均拒绝', () => {
  assert.throws(() => A.readZip(zip([['../escape.webp', Buffer.from('x')]])));
  const row = ['assets/ui-v3/manifest.json', Buffer.from('{}')];
  assert.throws(() => A.readZip(zip([row, row])));
  assert.throws(() => A.readZip(zip([row]).subarray(0, 30)));
});
test('ZIP 校验值与尺寸不一致时拒绝，不执行解包写入', () => {
  const data = zip([['assets/ui-v3/manifest.json', Buffer.from('{}')]]);
  data.writeUInt32LE(0, 14); assert.throws(() => A.readZip(data));
});
test('完整 82 图像清单可校验；清单脚本不会执行', () => {
  assert.equal(A.validateManifest(fixture()).assets.length, 82);
});
test('清单缺图、图像哈希损坏与未列出文件均拒绝', () => {
  const missing = fixture(); missing.delete('assets/ui-v3/icons/test-0.webp'); assert.throws(() => A.validateManifest(missing));
  const bad = fixture(); bad.set('assets/ui-v3/icons/test-0.webp', Buffer.from('corrupt')); assert.throws(() => A.validateManifest(bad));
  const extra = fixture(); extra.set('assets/ui-v3/icons/extra.webp', Buffer.from('extra')); assert.throws(() => A.validateManifest(extra));
});
test('--check 只验证，不创建资源目录', t => {
  const root = temp(t); assert.equal(A.install(fixture(), root, true).status, 'validated-not-installed');
  assert.equal(fs.existsSync(path.join(root, 'assets/ui-v3')), false);
});
test('原子安装与重复导入保留相同文件，不重复改写', t => {
  const root = temp(t), files = fixture();
  assert.equal(A.install(files, root).status, 'installed-art-only');
  assert.equal(A.install(files, root).status, 'already-installed-identical');
  assert.equal(fs.readFileSync(path.join(root, 'assets/ui-v3/icons/test-0.webp')).equals(files.get('assets/ui-v3/icons/test-0.webp')), true);
});
test('已有不同资源时拒绝覆盖并保留用户文件', t => {
  const root = temp(t), files = fixture(); A.install(files, root);
  const target = path.join(root, 'assets/ui-v3/icons/test-0.webp'); fs.writeFileSync(target, 'user-owned-change');
  assert.throws(() => A.install(files, root), /will not overwrite/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'user-owned-change');
});
test('非目标资源包无法通过固定 SHA-256 检查', t => {
  const root = temp(t), target = path.join(root, 'wrong-art.zip'); fs.writeFileSync(target, zip([...fixture()]));
  assert.throws(() => A.main([target, '--check']), /ZIP size mismatch|SHA-256 mismatch/);
});
