'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function runtime({failWrite=false}={}){const store=new Map(),storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{if(failWrite)throw Error('blocked');store.set(k,String(v));}};const c=vm.createContext({localStorage:storage});c.window=c;c.globalThis=c;for(const file of ['assets/ui-v4/manifest.js','src/ui/appearance.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});return {A:c.FSUIAppearance,storage,store};}
test('四种道身外观均有站姿、头像与坐姿，默认值确定且非法 ID 拒绝',()=>{
  const {A}=runtime();assert.equal(A.characters.length,4);assert.equal(A.read().id,'jade-sword');
  for(const c of A.characters){assert.match(A.image('standing','',c.name,c.id),/assets\/ui-v4\/characters\/.+-standing\.webp/);assert.match(A.image('portrait','',c.name,c.id),/assets\/ui-v4\/characters\/.+-portrait\.webp/);assert.match(A.image('seated','',c.name,c.id),/assets\/ui-v4\/characters\/.+-seated\.webp/);}
  assert.throws(()=>A.preview('unknown'),/未知/);
});
test('外观先预览，确认才写独立 UI 键；取消不改变确认值和游戏存档',()=>{
  const {A,storage,store}=runtime();storage.setItem('feisheng.run.v1','RUN-SENTINEL');storage.setItem('feisheng.meta.v1','META-SENTINEL');
  assert.equal(A.KEY,'feisheng.appearance.v1');assert.equal(A.read(storage).id,'jade-sword');
  A.preview('cloud-lotus');assert.equal(A.pending().id,'cloud-lotus');assert.equal(A.read(storage).id,'jade-sword');assert.equal(store.has(A.KEY),false);
  A.cancel();assert.equal(A.pending(),null);assert.equal(A.read(storage).id,'jade-sword');
  A.preview('jade-healer');const result=A.confirm(storage);assert.equal(result.persisted,true);assert.equal(A.read(storage).id,'jade-healer');assert.deepEqual(JSON.parse(store.get(A.KEY)),{version:1,portraitId:'jade-healer'});
  assert.equal(store.get('feisheng.run.v1'),'RUN-SENTINEL');assert.equal(store.get('feisheng.meta.v1'),'META-SENTINEL');
});
test('外观偏好写入失败时会话选择仍保留，不清空游戏数据',()=>{
  const {A,storage}=runtime({failWrite:true});A.preview('herbal-sage');const result=A.confirm(storage);assert.equal(result.persisted,false);assert.equal(A.read(storage).id,'herbal-sage');
});
test('V4 正式包包含十二张角色图并退役单男性与旧洞府分层',()=>{
  const files=require('../tools/production-files.cjs'),m=require('../assets/ui-v4/manifest.json');
  assert.equal(m.assets.length,12);for(const a of m.assets)assert.ok(files.includes(a.path),a.id);
  assert.ok(m.characters.every(c=>c.seated&&c.status==='complete'));
  for(const old of ['assets/ui-v3/characters/dao-body.webp','assets/ui-v3/props/platform.webp','assets/ui-v3/props/forge.webp','assets/ui-v3/props/gate.webp','assets/ui-v3/props/beast.webp','assets/ui-v3/props/astrolabe.webp','assets/ui-v3/props/pine.webp','assets/ui-v3/props/pond.webp'])assert.ok(!files.includes(old),old);
});
