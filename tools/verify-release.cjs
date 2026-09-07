'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = require('./production-files.cjs');
const { version } = require('../package.json');
const report = JSON.parse(fs.readFileSync(path.join(root, 'release/build-report.json'), 'utf8'));
const zipPath = path.join(root, 'release', `wo-yu-fei-sheng-v${version}.zip`);
const zip = fs.readFileSync(zipPath);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const { out } = require('./qa-paths.cjs');
const extracted = path.join(out, 'package');
fs.mkdirSync(extracted, { recursive: true });
assert.equal(report.version, version);
assert.equal(zip.length, report.zipBytes);
assert.equal(sha(zip), report.zipSha256);
assert.ok(zip.length < 3000000 && report.rawBytes < 10000000);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
function crc32(data) { let c = 0xffffffff; for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const entries = []; let offset = 0;
while (offset + 30 <= zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
  assert.equal(zip.readUInt16LE(offset + 8), 8, 'Only deflate entries are expected');
  const crc = zip.readUInt32LE(offset + 14), compressed = zip.readUInt32LE(offset + 18), rawSize = zip.readUInt32LE(offset + 22);
  const nameSize = zip.readUInt16LE(offset + 26), extra = zip.readUInt16LE(offset + 28);
  const name = zip.subarray(offset + 30, offset + 30 + nameSize).toString('utf8');
  assert.ok(files.includes(name) && !entries.some(e => e.path === name), `Unexpected or duplicate entry: ${name}`);
  assert.ok(!name.includes('..') && !path.isAbsolute(name));
  const start = offset + 30 + nameSize + extra;
  const data = zlib.inflateRawSync(zip.subarray(start, start + compressed), { maxOutputLength: 10000000 });
  assert.equal(data.length, rawSize); assert.equal(crc32(data), crc);
  assert.deepEqual(data, fs.readFileSync(path.join(root, name)), `ZIP differs from source: ${name}`);
  assert.deepEqual(data, fs.readFileSync(path.join(root, 'dist', name)), `ZIP differs from dist: ${name}`);
  assert.equal(sha(data), report.files.find(file => file.path === name).sha256);
  fs.mkdirSync(path.dirname(path.join(extracted, name)), { recursive: true });
  fs.writeFileSync(path.join(extracted, name), data);
  entries.push({ path: name, bytes: data.length, crc32: crc.toString(16).padStart(8, '0'), sha256: sha(data) });
  offset = start + compressed;
}
assert.deepEqual(entries.map(e => e.path), files);
assert.equal(zip.readUInt32LE(offset), 0x02014b50, 'Central directory is missing');
const footer = zip.length - 22;
assert.equal(zip.readUInt32LE(footer), 0x06054b50);
assert.equal(zip.readUInt16LE(footer + 8), files.length);
assert.equal(zip.readUInt16LE(footer + 10), files.length);
assert.equal(zip.readUInt32LE(footer + 16), offset);
assert.equal(zip.readUInt32LE(footer + 12) + offset, footer);
for (let i = 0, cursor = offset; i < files.length; i++) {
  assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
  const n = zip.readUInt16LE(cursor + 28), ex = zip.readUInt16LE(cursor + 30), comment = zip.readUInt16LE(cursor + 32);
  assert.equal(zip.subarray(cursor + 46, cursor + 46 + n).toString('utf8'), files[i]);
  cursor += 46 + n + ex + comment;
}
assert.ok(fs.readFileSync(path.join(extracted, 'index.html'), 'utf8').includes(`v${version}`));
const result = { version, passed: true, zipPath, zipBytes: zip.length, zipSha256: sha(zip),
  rawBytes: report.rawBytes, backgroundBytes: report.backgroundBytes,
  productionFiles: entries.length, backgroundFiles: entries.filter(e => e.path.startsWith('assets/bg/')).length,
  crcAndSha256Verified: true, sourceDistZipIdentical: true, screenshotsDocsFontsExcluded: true,
  extractedPath: extracted, entries };
fs.writeFileSync(path.join(out, 'package-report.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, entries: entries.map(e => e.path) }, null, 2));
