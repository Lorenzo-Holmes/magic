'use strict';
// Installs only the generated artwork bundle. Does not alter code, saves,
// browser permissions, the production whitelist, Git state, or the original ZIP.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const NAME = 'wo-yu-fei-sheng-ui-v3-art-assets.zip';
const MAX_ZIP = 10000000, MAX_RAW = 20000000, MAX_ENTRIES = 128;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function safeName(name) {
  return /^assets\/ui-v3\/(?:manifest\.(?:json|js)|(?:scenes|characters|props|icons|panels|fx)\/[a-z0-9-]+\.webp)$/.test(name);
}
function readZip(zip) {
  assert.ok(Buffer.isBuffer(zip) && zip.length >= 22 && zip.length <= MAX_ZIP, 'Invalid ZIP size');
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50, 'ZIP footer missing or ZIP comments unsupported');
  assert.equal(zip.readUInt16LE(end + 4), 0, 'Multi-disk ZIP rejected');
  assert.equal(zip.readUInt16LE(end + 6), 0, 'Multi-disk ZIP rejected');
  assert.equal(zip.readUInt16LE(end + 20), 0);
  const count = zip.readUInt16LE(end + 10), start = zip.readUInt32LE(end + 16);
  assert.ok(count > 0 && count <= MAX_ENTRIES, 'Too many or no files');
  assert.equal(zip.readUInt16LE(end + 8), count);
  assert.equal(start + zip.readUInt32LE(end + 12), end);
  const result = new Map(); let cursor = start, total = 0, localCursor = 0;
  for (let i = 0; i < count; i++) {
    assert.ok(cursor + 46 <= end, 'Truncated directory');
    assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
    const flags = zip.readUInt16LE(cursor + 8), method = zip.readUInt16LE(cursor + 10);
    assert.equal(flags & ~0x800, 0, 'Encrypted or streamed ZIP rejected');
    assert.ok(method === 0 || method === 8, 'Unsupported compression');
    const crc = zip.readUInt32LE(cursor + 16), packed = zip.readUInt32LE(cursor + 20), rawSize = zip.readUInt32LE(cursor + 24);
    const n = zip.readUInt16LE(cursor + 28), extra = zip.readUInt16LE(cursor + 30), comment = zip.readUInt16LE(cursor + 32);
    const fileType = (zip.readUInt32LE(cursor + 38) >>> 16) & 0xf000;
    assert.ok(fileType === 0 || fileType === 0x8000, 'Non-file ZIP entry rejected');
    assert.ok(cursor + 46 + n + extra + comment <= end, 'Truncated filename');
    const name = zip.subarray(cursor + 46, cursor + 46 + n).toString('utf8');
    assert.ok(safeName(name), `Unexpected path: ${name}`);
    assert.ok(!result.has(name), `Duplicate path: ${name}`);
    const local = zip.readUInt32LE(cursor + 42);
    assert.equal(local, localCursor, 'Overlapping or reordered local entries');
    assert.ok(local + 30 <= start);
    assert.equal(zip.readUInt32LE(local), 0x04034b50);
    assert.equal(zip.readUInt16LE(local + 6), flags);
    assert.equal(zip.readUInt16LE(local + 8), method);
    assert.equal(zip.readUInt32LE(local + 14), crc);
    assert.equal(zip.readUInt32LE(local + 18), packed);
    assert.equal(zip.readUInt32LE(local + 22), rawSize);
    const ln = zip.readUInt16LE(local + 26), le = zip.readUInt16LE(local + 28);
    assert.equal(zip.subarray(local + 30, local + 30 + ln).toString('utf8'), name);
    const from = local + 30 + ln + le;
    assert.ok(from + packed <= start);
    total += rawSize; assert.ok(rawSize > 0 && total <= MAX_RAW, 'Uncompressed size limit exceeded');
    const bytes = method === 8 ? zlib.inflateRawSync(zip.subarray(from, from + packed), { maxOutputLength: rawSize }) : zip.subarray(from, from + packed);
    assert.equal(bytes.length, rawSize); assert.equal(crc32(bytes), crc, `CRC mismatch: ${name}`);
    result.set(name, bytes);
    localCursor = from + packed; cursor += 46 + n + extra + comment;
  }
  assert.equal(localCursor, start); assert.equal(cursor, end);
  return result;
}
function validateManifest(files) {
  const manifestBytes = files.get('assets/ui-v3/manifest.json');
  assert.ok(manifestBytes, 'Artwork manifest missing');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.assets) && manifest.assets.length === 82, 'Expected 82 artwork slices');
  assert.equal(new Set(manifest.assets.map(x => x.id)).size, manifest.assets.length, 'Duplicate asset ID');
  assert.equal(new Set(manifest.assets.map(x => x.path)).size, manifest.assets.length, 'Duplicate asset path');
  assert.equal(files.size, manifest.assets.length + 2, 'Unlisted files in bundle');
  assert.ok(files.has('assets/ui-v3/manifest.js'), 'File-mode manifest missing');
  for (const item of manifest.assets) {
    assert.ok(safeName(item.path) && item.path.endsWith('.webp'), 'Non-image in asset list');
    const bytes = files.get(item.path); assert.ok(bytes, `Missing asset: ${item.path}`);
    assert.equal(bytes.length, item.bytes); assert.equal(sha(bytes), item.sha256);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(Number.isInteger(item.width) && item.width > 0 && item.width <= 4096);
    assert.ok(Number.isInteger(item.height) && item.height > 0 && item.height <= 4096);
  }
  // Treat manifest.js only as bytes. Never execute JavaScript from the ZIP.
  return manifest;
}
function rejectSymlink(location) {
  if (fs.existsSync(location)) assert.ok(!fs.lstatSync(location).isSymbolicLink(), `Symlink rejected: ${location}`);
}
function install(files, projectRoot, checkOnly = false) {
  const manifest = validateManifest(files);
  const assets = path.join(projectRoot, 'assets'), destination = path.join(assets, 'ui-v3');
  rejectSymlink(projectRoot); rejectSymlink(assets); rejectSymlink(destination);
  if (fs.existsSync(destination)) {
    for (const [name, bytes] of files) {
      const target = path.join(projectRoot, ...name.split('/'));
      rejectSymlink(path.dirname(target)); rejectSymlink(target);
      assert.ok(fs.existsSync(target) && fs.readFileSync(target).equals(bytes), 'Existing artwork differs; will not overwrite it');
    }
    return { status: 'already-installed-identical', assets: manifest.assets.length, destination };
  }
  if (checkOnly) return { status: 'validated-not-installed', assets: manifest.assets.length, destination };
  assert.ok(fs.existsSync(assets), 'Project assets directory missing');
  const cache = path.join(projectRoot, '.cache'); rejectSymlink(cache); fs.mkdirSync(cache, { recursive: true });
  const staging = fs.mkdtempSync(path.join(cache, 'ui-v3-art-import-'));
  try {
    const stagedArt = path.join(staging, 'art'); fs.mkdirSync(stagedArt);
    for (const [name, bytes] of files) {
      const relative = name.slice('assets/ui-v3/'.length), target = path.join(stagedArt, ...relative.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
      assert.equal(sha(fs.readFileSync(target)), sha(bytes));
    }
    assert.ok(!fs.existsSync(destination), 'Destination appeared during import; refusing overwrite');
    fs.renameSync(stagedArt, destination);
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  return { status: 'installed-art-only', assets: manifest.assets.length, destination, gameCodeModified: false };
}
function main(args = process.argv.slice(2)) {
  const checkOnly = args.includes('--check'), names = args.filter(x => x !== '--check');
  assert.ok(names.length <= 1 && names.every(x => !x.startsWith('--')), 'Usage: node tools/import-ui-v3-art.cjs [ZIP path] [--check]');
  const archive = path.resolve(ROOT, names[0] || NAME);
  if (!fs.existsSync(archive)) throw new Error(`Artwork ZIP not found: ${archive}. Save the supplied ZIP here first; nothing was changed.`);
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/UI_V3_ART_IMPORT.json'), 'utf8'));
  const zip = fs.readFileSync(archive);
  assert.equal(zip.length, contract.zipBytes, 'ZIP size mismatch');
  assert.equal(sha(zip), contract.sha256, 'ZIP SHA-256 mismatch; import refused');
  const result = install(readZip(zip), ROOT, checkOnly);
  console.log(JSON.stringify({ ...result, archive, zipSha256: sha(zip), next: 'Integrate artwork in V3 windows, then rebuild and run browser QA. Import alone does not change the visible UI.' }, null, 2));
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { crc32, sha, safeName, readZip, validateManifest, install, main };
