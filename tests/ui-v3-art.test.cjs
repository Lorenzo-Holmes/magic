'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
function art(){const c=vm.createContext({});c.window=c;for(const file of ['assets/ui-v3/manifest.js','src/ui-v3/art.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);return c.FSArt;}
test('V3 源素材保持来源哈希，已退役角色与洞府分层不进入正式包',()=>{
  const m=require('../assets/ui-v3/manifest.json'),files=require('../tools/production-files.cjs');assert.equal(m.assets.length,82);
  const retired=new Set(['character.dao','prop.platform','prop.forge','prop.gate','prop.beast','prop.astrolabe','prop.pine','prop.pond']);
  for(const a of m.assets){const bytes=fs.readFileSync(path.join(root,a.path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(files.includes(a.path),!retired.has(a.id),a.id);}
  // V4 cultivation now reuses an installed scene plus per-character seated art;
  // source sheets and historical whole-screen art stay out of the production ZIP.
  assert.deepEqual(files.filter(f=>/^assets\/art\//.test(f)), []);
});
test('所有真实装备、丹方和材料均有明确类别图标映射，未知 ID 拒绝',()=>{
  const A=art();for(const d of require('../src/equipment.js').ITEMS)assert.ok(A.asset(A.item('equipment',d.id)));
  for(const d of require('../src/crafting.js').PILLS)assert.ok(A.asset(A.item('pills',d.id)));
  for(const d of require('../src/crafting.js').MATERIALS)assert.ok(A.asset(A.item('materials',d.id)));
  assert.equal(A.item('equipment','unknown',false),'item.chest');assert.throws(()=>A.item('equipment','unknown'),/Missing/);
});
test('图片模板转义属性且不接受外部来源或未知资源',()=>{
  const A=art(),html=A.img('scene.cave','scene','" onload="x');assert.match(html,/&quot;/);assert.ok(!html.includes('alt="" onload='));assert.throws(()=>A.img('https://unknown'),/Unknown/);
  assert.throws(()=>A.img('character.dao'),/Retired/);assert.ok(!A.runtimeIds.includes('character.dao'));
});
test('画布镜头保持等比，缩放夹取与居中坐标均可确定计算',()=>{
  const A=art(),g=A.cameraGeometry(352,704,704,1408,1);assert.equal(g.scale,.5);assert.equal(g.x,0);assert.equal(g.y,0);
  const h=A.cameraGeometry(352,704,704,1408,99);assert.equal(h.scale,1.25);assert.ok(h.x<=0&&h.y<=0);
});
