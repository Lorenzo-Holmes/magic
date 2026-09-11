'use strict';
// New artwork has an independent contract. Never relax the original V3 importer.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
const safeName=n=>/^assets\/ui-v4\/(manifest\.(json|js)|characters\/[a-z0-9-]+\.webp)$/.test(n);
function readZip(zip){
  assert.ok(Buffer.isBuffer(zip)&&zip.length>=22&&zip.length<4000000,'Invalid ZIP size');
  const end=zip.length-22;assert.equal(zip.readUInt32LE(end),0x06054b50,'No ZIP footer');
  assert.equal(zip.readUInt32LE(end+4),0,'Multi-disk ZIP rejected');assert.equal(zip.readUInt16LE(end+20),0,'Comments rejected');
  const count=zip.readUInt16LE(end+10),start=zip.readUInt32LE(end+16);assert.equal(zip.readUInt16LE(end+8),count);assert.ok(count>0&&count<=64);assert.equal(start+zip.readUInt32LE(end+12),end);
  const files=new Map();let cursor=start,localCursor=0,total=0;
  for(let i=0;i<count;i++){
    assert.ok(cursor+46<=end);assert.equal(zip.readUInt32LE(cursor),0x02014b50);
    const flags=zip.readUInt16LE(cursor+8),method=zip.readUInt16LE(cursor+10),crc=zip.readUInt32LE(cursor+16),packed=zip.readUInt32LE(cursor+20),size=zip.readUInt32LE(cursor+24);
    assert.equal(flags&~0x800,0);assert.ok([0,8].includes(method));assert.ok(size>0);total+=size;assert.ok(total<=8000000);
    const n=zip.readUInt16LE(cursor+28),extra=zip.readUInt16LE(cursor+30),comment=zip.readUInt16LE(cursor+32),local=zip.readUInt32LE(cursor+42);
    const fileType=(zip.readUInt32LE(cursor+38)>>>16)&0xf000;assert.ok([0,0x8000].includes(fileType),'Non-file rejected');
    assert.ok(cursor+46+n+extra+comment<=end);
    const name=zip.subarray(cursor+46,cursor+46+n).toString();assert.ok(safeName(name),'Unexpected path');assert.ok(!files.has(name),'Duplicate entry');
    assert.equal(local,localCursor);assert.ok(local+30<=start);assert.equal(zip.readUInt32LE(local),0x04034b50);
    assert.equal(zip.readUInt16LE(local+6),flags);assert.equal(zip.readUInt16LE(local+8),method);assert.equal(zip.readUInt32LE(local+14),crc);assert.equal(zip.readUInt32LE(local+18),packed);assert.equal(zip.readUInt32LE(local+22),size);
    const ln=zip.readUInt16LE(local+26),le=zip.readUInt16LE(local+28),from=local+30+ln+le;
    assert.equal(zip.subarray(local+30,local+30+ln).toString(),name);assert.ok(from+packed<=start);
    const b=method===8?zlib.inflateRawSync(zip.subarray(from,from+packed),{maxOutputLength:size}):zip.subarray(from,from+packed);
    assert.equal(b.length,size);assert.equal(crc32(b),crc,'CRC mismatch');files.set(name,b);
    cursor+=46+n+extra+comment;localCursor=from+packed;
  }
  assert.equal(cursor,end);assert.equal(localCursor,start);return files;
}
function validate(files){
  const m=JSON.parse(files.get('assets/ui-v4/manifest.json')?.toString()||'null');assert.equal(m?.schemaVersion,1);assert.ok(Array.isArray(m.assets)&&m.assets.length>0&&m.assets.length<=60);
  assert.equal(new Set(m.assets.map(a=>a.id)).size,m.assets.length);assert.equal(new Set(m.assets.map(a=>a.path)).size,m.assets.length);assert.equal(files.size,m.assets.length+2);
  const entries={};
  for(const a of m.assets){
    assert.ok(/^character\.[a-z0-9-]+\.(standing|portrait|seated)$/.test(a.id));assert.ok(safeName(a.path)&&a.path.endsWith('.webp'));
    const b=files.get(a.path);assert.ok(b);assert.equal(b.length,a.bytes);assert.equal(sha(b),a.sha256);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.ok(Number.isInteger(a.width)&&a.width>0&&a.width<=2048);assert.ok(Number.isInteger(a.height)&&a.height>0&&a.height<=2048);assert.equal(typeof a.alpha,'boolean');
    entries[a.id]={path:a.path,width:a.width,height:a.height,alpha:a.alpha};
  }
  assert.equal(files.get('assets/ui-v4/manifest.js')?.toString(),`window.FSArtManifestV4 = Object.freeze(${JSON.stringify(entries)});\n`,'Manifest script must be canonical data, not executable additions');
  return m;
}
function noLink(p){if(fs.existsSync(p))assert.ok(!fs.lstatSync(p).isSymbolicLink(),'Symbolic link rejected');}
function install(files,root,checkOnly=false){
  const m=validate(files),assets=path.join(root,'assets'),dest=path.join(assets,'ui-v4');noLink(root);noLink(assets);noLink(dest);
  if(fs.existsSync(dest)){
    for(const [name,b]of files){const target=path.join(root,name);noLink(path.dirname(target));noLink(target);assert.ok(fs.existsSync(target)&&fs.readFileSync(target).equals(b),'Existing file differs; refusing overwrite');}
    return {status:'already-installed-identical',assets:m.assets.length};
  }
  if(checkOnly)return {status:'validated-not-installed',assets:m.assets.length};
  assert.ok(fs.existsSync(assets));const cache=path.join(root,'.cache');noLink(cache);fs.mkdirSync(cache,{recursive:true});
  const temp=fs.mkdtempSync(path.join(cache,'ui-v4-import-'));
  try{
    const staged=path.join(temp,'art');fs.mkdirSync(staged);
    for(const [name,b]of files){const target=path.join(staged,name.slice('assets/ui-v4/'.length));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b,{flag:'wx'});assert.equal(sha(fs.readFileSync(target)),sha(b));}
    assert.ok(!fs.existsSync(dest));fs.renameSync(staged,dest);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  return {status:'installed-art-only',assets:m.assets.length,codeChanged:false,seatedAssets:'not included in this transfer'};
}
function main(args=process.argv.slice(2)){
  if(args.includes('--help')){console.log('Usage: node tools/import-ui-v4-art.cjs [ZIP path] [--check]\nImports the separately verified standing/portrait pack; does not modify saves, UI, whitelist or V3 artwork.');return;}
  const names=args.filter(a=>a!=='--check');assert.ok(names.length<=1&&names.every(a=>!a.startsWith('--')),'Invalid arguments; see --help');
  const c=require('../docs/UI_V4_ART_TRANSFER.json'),p=path.resolve(ROOT,names[0]||c.archiveName);
  assert.ok(fs.existsSync(p),`Artwork transfer missing: ${p}`);const zip=fs.readFileSync(p);assert.equal(zip.length,c.zipBytes);assert.equal(sha(zip),c.sha256,'Wrong ZIP SHA-256');
  const files=readZip(zip);assert.equal(validate(files).assets.length,c.assets);console.log(JSON.stringify({...install(files,ROOT,args.includes('--check')),sha256:c.sha256},null,2));
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={sha,crc32,safeName,readZip,validate,install,main};
