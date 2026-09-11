'use strict';
// Incremental, fixed-scope importer for the four paired seated portraits.
// It intentionally does not weaken or reuse the standing/portrait importer.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const EXPECTED=Object.freeze([
  'assets/ui-v4/characters/jade-sword-seated.webp',
  'assets/ui-v4/characters/cloud-lotus-seated.webp',
  'assets/ui-v4/characters/herbal-sage-seated.webp',
  'assets/ui-v4/characters/jade-healer-seated.webp'
]);
const MANIFEST='assets/ui-v4/seated-manifest.json';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
const safeName=name=>name===MANIFEST||EXPECTED.includes(name);
function readZip(zip){
  assert.ok(Buffer.isBuffer(zip)&&zip.length>=22&&zip.length<2000000,'Invalid seated ZIP size');
  const end=zip.length-22;assert.equal(zip.readUInt32LE(end),0x06054b50,'No ZIP footer');
  assert.equal(zip.readUInt32LE(end+4),0,'Multi-disk ZIP rejected');assert.equal(zip.readUInt16LE(end+20),0,'ZIP comments rejected');
  const count=zip.readUInt16LE(end+10),start=zip.readUInt32LE(end+16);assert.equal(zip.readUInt16LE(end+8),count);assert.equal(count,5);assert.equal(start+zip.readUInt32LE(end+12),end);
  const files=new Map();let cursor=start,localCursor=0,total=0;
  for(let i=0;i<count;i++){
    assert.ok(cursor+46<=end);assert.equal(zip.readUInt32LE(cursor),0x02014b50);
    const flags=zip.readUInt16LE(cursor+8),method=zip.readUInt16LE(cursor+10),crc=zip.readUInt32LE(cursor+16),packed=zip.readUInt32LE(cursor+20),size=zip.readUInt32LE(cursor+24);
    assert.equal(flags&~0x800,0);assert.ok([0,8].includes(method));assert.ok(size>0);total+=size;assert.ok(total<2000000);
    const n=zip.readUInt16LE(cursor+28),extra=zip.readUInt16LE(cursor+30),comment=zip.readUInt16LE(cursor+32),local=zip.readUInt32LE(cursor+42);
    assert.ok(cursor+46+n+extra+comment<=end);const name=zip.subarray(cursor+46,cursor+46+n).toString();assert.ok(safeName(name),'Unexpected seated ZIP path');assert.ok(!files.has(name),'Duplicate seated ZIP entry');
    assert.equal(local,localCursor);assert.ok(local+30<=start);assert.equal(zip.readUInt32LE(local),0x04034b50);assert.equal(zip.readUInt16LE(local+6),flags);assert.equal(zip.readUInt16LE(local+8),method);
    assert.equal(zip.readUInt32LE(local+14),crc);assert.equal(zip.readUInt32LE(local+18),packed);assert.equal(zip.readUInt32LE(local+22),size);
    const ln=zip.readUInt16LE(local+26),le=zip.readUInt16LE(local+28),from=local+30+ln+le;assert.equal(zip.subarray(local+30,local+30+ln).toString(),name);assert.ok(from+packed<=start);
    const data=method===8?zlib.inflateRawSync(zip.subarray(from,from+packed),{maxOutputLength:size}):zip.subarray(from,from+packed);
    assert.equal(data.length,size);assert.equal(crc32(data),crc,'Seated ZIP CRC mismatch');files.set(name,data);cursor+=46+n+extra+comment;localCursor=from+packed;
  }
  assert.equal(cursor,end);assert.equal(localCursor,start);return files;
}
function validate(files){
  assert.equal(files.size,5);for(const name of EXPECTED)assert.ok(files.has(name),`Missing seated portrait: ${name}`);
  const raw=files.get(MANIFEST);assert.ok(raw);const manifest=JSON.parse(raw.toString());assert.equal(manifest.schemaVersion,1);assert.equal(manifest.bundleId,'v4-seated-portraits-20260911');
  assert.equal(manifest.assets?.length,4);assert.deepEqual(Object.keys(manifest.mapping||{}).sort(),['cloud-lotus','herbal-sage','jade-healer','jade-sword']);
  const seen=new Set();for(const asset of manifest.assets){assert.ok(/^character\.(jade-sword|cloud-lotus|herbal-sage|jade-healer)\.seated$/.test(asset.id));assert.ok(EXPECTED.includes(asset.path));assert.ok(!seen.has(asset.path));seen.add(asset.path);
    const data=files.get(asset.path);assert.equal(data.length,asset.bytes);assert.equal(sha(data),asset.sha256);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.equal(asset.width,480);assert.equal(asset.height,640);assert.equal(asset.alpha,true);}
  return manifest;
}
function noLink(p){if(fs.existsSync(p))assert.ok(!fs.lstatSync(p).isSymbolicLink(),'Symbolic link rejected');}
function install(files,root,checkOnly=false){
  const manifest=validate(files),characters=path.join(root,'assets','ui-v4','characters');noLink(root);noLink(path.join(root,'assets'));noLink(path.join(root,'assets','ui-v4'));noLink(characters);assert.ok(fs.existsSync(characters),'V4 standing portraits must be installed first');
  let identical=0;for(const name of EXPECTED){const target=path.join(root,name);noLink(target);if(fs.existsSync(target)){assert.ok(fs.readFileSync(target).equals(files.get(name)),'Existing seated portrait differs; refusing overwrite');identical++;}}
  if(identical===EXPECTED.length)return {status:'already-installed-identical',assets:4};
  assert.equal(identical,0,'Partial seated installation detected; refusing mutation');
  if(checkOnly)return {status:'validated-not-installed',assets:4};
  const created=[];try{for(const name of EXPECTED){const target=path.join(root,name);fs.writeFileSync(target,files.get(name),{flag:'wx'});created.push(target);assert.equal(sha(fs.readFileSync(target)),sha(files.get(name)));}}
  catch(error){for(const target of created)fs.rmSync(target,{force:true});throw error;}
  return {status:'installed-seated-art-only',assets:manifest.assets.length,codeChanged:false};
}
function main(args=process.argv.slice(2)){
  if(args.includes('--help')){console.log('Usage: node tools/import-ui-v4-seated.cjs [ZIP path] [--check]');return;}
  const names=args.filter(a=>a!=='--check');assert.ok(names.length<=1&&names.every(a=>!a.startsWith('--')),'Invalid arguments; see --help');
  const contract=require('../docs/UI_V4_SEATED_TRANSFER.json'),archive=path.resolve(ROOT,names[0]||contract.archiveName);assert.ok(fs.existsSync(archive),`Seated transfer missing: ${archive}`);
  const zip=fs.readFileSync(archive);assert.equal(zip.length,contract.zipBytes);assert.equal(sha(zip),contract.sha256,'Wrong seated ZIP SHA-256');const files=readZip(zip);assert.equal(sha(files.get(MANIFEST)),contract.manifestSha256,'Wrong seated manifest SHA-256');
  const manifest=validate(files);assert.equal(manifest.assets.length,contract.assets);for(const asset of manifest.assets)assert.equal(asset.sha256,contract.files[path.basename(asset.path)]);
  console.log(JSON.stringify({...install(files,ROOT,args.includes('--check')),sha256:contract.sha256},null,2));
}
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={EXPECTED,MANIFEST,sha,crc32,safeName,readZip,validate,install,main};
