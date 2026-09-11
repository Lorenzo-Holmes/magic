'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../tools/import-ui-v4-art.cjs');
function archive(files){
  const local=[],central=[];let offset=0;
  for(const [name,bytes] of files){const n=Buffer.from(name),crc=A.crc32(bytes),h=Buffer.alloc(30),c=Buffer.alloc(46);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(crc,14);h.writeUInt32LE(bytes.length,18);h.writeUInt32LE(bytes.length,22);h.writeUInt16LE(n.length,26);local.push(h,n,bytes);
    c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc,16);c.writeUInt32LE(bytes.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=30+n.length+bytes.length;}
  const cd=Buffer.concat(central),f=Buffer.alloc(22);f.writeUInt32LE(0x06054b50);f.writeUInt16LE(files.length,8);f.writeUInt16LE(files.length,10);f.writeUInt32LE(cd.length,12);f.writeUInt32LE(offset,16);return Buffer.concat([...local,cd,f]);
}
function fixture(){
  const b=Buffer.from('RIFF0000WEBPfake'),a={id:'character.test.standing',path:'assets/ui-v4/characters/test-standing.webp',bytes:b.length,sha256:A.sha(b),width:1,height:1,alpha:true};
  return new Map([[a.path,b],['assets/ui-v4/manifest.json',Buffer.from(JSON.stringify({schemaVersion:1,assets:[a]}))],['assets/ui-v4/manifest.js',Buffer.from('window.FSArtManifestV4 = Object.freeze('+JSON.stringify({[a.id]:{path:a.path,width:1,height:1,alpha:true}})+');\n')]]);
}
test('V4 入库仅允许新目录，不修改旧 V3 白名单',()=>{
  for(const p of ['assets/ui-v4/characters/a-standing.webp','assets/ui-v4/manifest.json'])assert.ok(A.safeName(p));
  for(const p of ['../outside','assets/ui-v3/manifest.json','assets/ui-v4/characters/../../secret','assets/ui-v4/evil.js'])assert.equal(A.safeName(p),false);
  assert.equal(A.validate(fixture()).assets.length,1);
});
test('V4 清单脚本必须是标准数据；追加脚本和错误图片哈希均被拒绝',()=>{
  const f=fixture();f.set('assets/ui-v4/manifest.js',Buffer.from('throw Error("must never execute")'));assert.throws(()=>A.validate(f),/canonical/);
  const q=fixture();q.set('assets/ui-v4/characters/test-standing.webp',Buffer.from('RIFFchangedWEBP'));assert.throws(()=>A.validate(q));
});
test('V4 --check 不写目录；原子导入幂等；不同文件不覆盖',()=>{
  const base=path.resolve('.cache');fs.mkdirSync(base,{recursive:true});const root=fs.mkdtempSync(path.join(base,'v4-import-test-'));fs.mkdirSync(path.join(root,'assets'));
  try{const f=fixture();assert.equal(A.install(f,root,true).status,'validated-not-installed');assert.ok(!fs.existsSync(path.join(root,'assets/ui-v4')));
    assert.equal(A.install(f,root).status,'installed-art-only');assert.equal(A.install(f,root).status,'already-installed-identical');
    fs.writeFileSync(path.join(root,'assets/ui-v4/characters/test-standing.webp'),'USER FILE');assert.throws(()=>A.install(f,root),/refusing overwrite/);assert.equal(fs.readFileSync(path.join(root,'assets/ui-v4/characters/test-standing.webp'),'utf8'),'USER FILE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('V4 ZIP 尺寸、页脚和原始格式损坏拒绝',()=>{
  assert.throws(()=>A.readZip(Buffer.alloc(21)));assert.throws(()=>A.readZip(Buffer.alloc(120)));assert.throws(()=>A.readZip(Buffer.alloc(4000001)));
  assert.equal(A.crc32(Buffer.from('123456789')),0xcbf43926);
});
test('V4 合法 ZIP 目录/内容完整往返；本地校验与中央目录不一致拒绝',()=>{
  const f=fixture(),zip=archive([...f]);assert.deepEqual(A.readZip(zip),f);assert.equal(A.validate(A.readZip(zip)).assets.length,1);
  const bad=Buffer.from(zip);bad.writeUInt32LE(0,14);assert.throws(()=>A.readZip(bad));
});
test('V4 ZIP 重复文件和目录穿越拒绝，缺清单不能进入安装',()=>{
  const rows=[...fixture()];assert.throws(()=>A.readZip(archive([...rows,rows[0]])),/Duplicate/);
  assert.throws(()=>A.readZip(archive([['assets/ui-v4/../outside',Buffer.from('x')]])),/path/);
  const f=fixture();f.delete('assets/ui-v4/manifest.json');assert.throws(()=>A.validate(f));
});
