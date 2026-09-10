'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const entries = require('./production-files.cjs');
const { version } = require('../package.json');
const goalBytes = 3000000, maxBytes = 10000000;
const out = path.join(root, 'dist'), release = path.join(root, 'release');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(release, { recursive: true });
// Remove only these two retired generated assets; source originals remain intact.
for(const name of ['src/visual-theme.css','assets/ink-landscape.svg']){
  const target=path.resolve(out,name);
  if(fs.existsSync(target)){
    const relative=path.relative(fs.realpathSync(out),fs.realpathSync(target));
    if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.lstatSync(target).isFile())throw new Error('Retired asset is outside the generated directory');
    fs.unlinkSync(target);
  }
}
// Clean only generated production files through an allowlist, never the project itself.
for (const file of entries) {
  fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
const table = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); return c >>> 0;
});
function crc32(buf) { let c = 0xffffffff; for (const byte of buf) c = table[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const local = [], central = [], manifest = [];
let offset = 0;
for (const name of entries) {
  const raw = fs.readFileSync(path.join(out, name)), compressed = zlib.deflateRawSync(raw, { level: 9 }), filename = Buffer.from(name);
  const crc = crc32(raw), head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x800, 6); head.writeUInt16LE(8, 8);
  head.writeUInt16LE(33, 12); head.writeUInt32LE(crc, 14); head.writeUInt32LE(compressed.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(filename.length, 26);
  local.push(head, filename, compressed);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x800, 8); dir.writeUInt16LE(8, 10);
  dir.writeUInt16LE(33, 14); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(compressed.length, 20); dir.writeUInt32LE(raw.length, 24); dir.writeUInt16LE(filename.length, 28); dir.writeUInt32LE(offset, 42);
  central.push(dir, filename); offset += head.length + filename.length + compressed.length;
  manifest.push({ path: name, bytes: raw.length, deflatedBytes: compressed.length, sha256: crypto.createHash('sha256').update(raw).digest('hex') });
}
const centralBuffer = Buffer.concat(central), footer = Buffer.alloc(22);
footer.writeUInt32LE(0x06054b50); footer.writeUInt16LE(entries.length, 8); footer.writeUInt16LE(entries.length, 10); footer.writeUInt32LE(centralBuffer.length, 12); footer.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...local, centralBuffer, footer]);
const totalRawBytes = manifest.reduce((sum, f) => sum + f.bytes, 0);
if (zip.length >= maxBytes || totalRawBytes >= maxBytes) throw new Error('Production package exceeds the user-specified 10 MB ceiling.');
if (zip.length >= goalBytes) throw new Error('Production package exceeds the 3 MB internal budget.');
const zipName = `wo-yu-fei-sheng-v${version}.zip`;
fs.writeFileSync(path.join(release, zipName), zip);
const report = { version, zip: zipName, zipBytes: zip.length, zipSha256: crypto.createHash('sha256').update(zip).digest('hex'), rawBytes: totalRawBytes, backgroundBytes: manifest.filter(f => f.path.startsWith('assets/bg/')).reduce((n, f) => n + f.bytes, 0), goalBytes, maxBytes, dependencies: 0, files: manifest };
fs.writeFileSync(path.join(release, 'build-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
