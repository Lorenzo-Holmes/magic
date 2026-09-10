'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const J=require('../src/journey.js'),E=require('../src/engine.js'),D=require('../src/data.js');
const clone=v=>JSON.parse(JSON.stringify(v));
const context=(seed,realm=0)=>({seed,realm,stats:{bone:6,mind:6,insight:6,luck:6},gear:1});
function entered(seed=12,journey=true){let s=E.createRun(seed,null,{journey});for(const id of s.offer.slice(0,3))s=E.transition(s,{type:'select',id});s=E.transition(s,{type:'confirm-talents'});return E.transition(s,{type:'enter'});}
function trip(seed,route=J.ROUTES[0],method=0){let j=J.start(J.createState(true),context(seed,J.REGIONS.find(r=>r.id===route.region).min),route.id,J.KITS.find(k=>k.stat===route.stat).id);while(j.active)j=J.resolve(j,J.preview(j).options[method].id).state;return j;}

test('六地十八目标各有三段具体遭遇，三个早期地区可选，后续境界逐步开放',()=>{
 assert.equal(J.REGIONS.length,6);assert.equal(J.ROUTES.length,18);assert.equal(J.available(0).length,3);assert.equal(J.available(4).length,6);
 assert.equal(new Set(J.ROUTES.flatMap(r=>r.scenes.map(s=>s[0]))).size,54);
 for(const r of J.REGIONS)assert.equal(J.ROUTES.filter(x=>x.region===r.id).length,3);
 for(const r of J.ROUTES){assert.equal(r.scenes.length,3);assert.ok(r.scenes.every(s=>s[1].length>12));assert.equal(J.KITS.filter(k=>k.stat===r.stat).length,1);}
 assert.throws(()=>J.start(J.createState(true),context(1),'peaks-duel','rope'));
});
test('路线和显示查询确定，不推进主随机流；相同存档选择得到相同结果',()=>{
 const s=entered(),n=E.transition(s,{type:'journey-start',id:'forest-herbs',kind:'pouch'}),raw=E.serialize(n);
 assert.equal(n.rng,s.rng);assert.equal(n.age,s.age+1);assert.equal(n.journey.silver,s.journey.silver-3);
 for(let i=0;i<100;i++)J.preview(n.journey);assert.equal(E.serialize(n),raw);
 const action={type:'journey-resolve',id:J.preview(n.journey).options[0].id};
 assert.deepEqual(E.transition(n,action),E.transition(E.deserialize(raw),action));
 assert.equal(E.transition(n,action).rng,s.rng);
});
test('途中恢复，禁止换装、闭关或同时进入旧秘境；过期按钮不能重复结算',()=>{
 let s=E.transition(entered(),{type:'journey-start',id:'forest-herbs',kind:'pouch'});
 for(const a of [{type:'act',kind:'cultivate'},{type:'secret-enter',id:'blackwind'},{type:'equipment-identify',id:'unknown'}])assert.throws(()=>E.transition(s,a));
 const action={type:'journey-resolve',id:J.preview(s.journey).options[0].id,revision:s.revision};
 s=E.transition(s,action);assert.throws(()=>E.transition(s,action));assert.throws(()=>E.transition(s,{...action,revision:s.revision}));
 s=E.deserialize(E.serialize(s));assert.ok(s.journey.active);const n=E.transition(s,{type:'journey-retreat'});assert.equal(n.phase,'playing');assert.equal(n.journey.active,null);assert.throws(()=>E.transition(n,{type:'journey-retreat'}));
});
test('主动撤回保留八成，三层伤势自动撤回保留四成；失败不直接结束本世',()=>{
 let s=E.transition(entered(12),{type:'journey-start',id:'forest-herbs',kind:'pouch'});
 s=E.transition(s,{type:'journey-resolve',id:J.preview(s.journey).options[0].id});const points=s.journey.active.pending,wounds=s.journey.wounds;
 const n=E.transition(s,{type:'journey-retreat'});assert.equal(n.journey.last.points,Math.floor(points*.8));assert.equal(n.journey.wounds,wounds);assert.equal(n.journey.last.foundation,0);
 let failed=0;for(let seed=1;seed<=100;seed++){let q=E.transition(entered(seed),{type:'journey-start',id:'forest-tracks',kind:'token'});while(q.journey.active)q=E.transition(q,{type:'journey-resolve',id:J.preview(q.journey).options[2].id});if(q.journey.last.ending==='failed'){failed++;assert.equal(q.journey.wounds,3);assert.equal(q.phase,'playing');assert.ok(q.vitality>0);}}
 assert.ok(failed>20);
});
test('补给、工具、疗伤和伤势形成可恢复的资源约束，不能白领或负数',()=>{
 let j=J.createState(true);j.supplies=1;j.silver=0;j.wounds=3;j.medicine=0;
 assert.throws(()=>J.start(j,context(5),'forest-herbs','pouch'));assert.throws(()=>J.prepare(j,'supplies'));assert.throws(()=>J.prepare(j,'heal'));
 j=J.prepare(j,'work');j=J.prepare(j,'supplies');assert.equal(j.supplies,7);assert.equal(j.silver,4);
 j=J.prepare(j,'rest');assert.equal(j.wounds,2);j=J.prepare(J.prepare(j,'work'),'medicine');j=J.prepare(j,'heal');assert.equal(j.wounds,0);assert.equal(j.medicine,0);
 assert.throws(()=>J.prepare(j,'rest'));assert.throws(()=>J.prepare(j,'unknown'));
});
test('已掌握路线不在同境重复提供根基，问道路线比采集提供更多',()=>{
 let j=trip(12);assert.equal(j.foundation[0],2);assert.equal(j.discoveries.length,1);
 j.supplies=12;j.silver=100;j.wounds=0;j=J.start(j,context(12),'forest-herbs','pouch');while(j.active)j=J.resolve(j,J.preview(j).options[0].id).state;assert.equal(j.foundation[0],2);assert.equal(j.surveys.length,1);
 const found=Array.from({length:50},(_,i)=>trip(i+1,J.ROUTES[2])).find(q=>q.last.foundation===3);assert.ok(found);assert.equal(found.foundation[0],3);
});
test('新模式修为满仍需根基，经典模式与旧档主线不被强行改写',()=>{
 const s=entered();s.flags.pythonSeen=true;s.xp=D.REALMS[0].threshold;assert.equal(E.canBreak(s),false);assert.throws(()=>E.transition(s,{type:'breakthrough'}));
 let n=E.transition(s,{type:'journey-start',id:'forest-herbs',kind:'pouch'});while(n.journey.active)n=E.transition(n,{type:'journey-resolve',id:J.preview(n.journey).options[0].id});assert.equal(E.canBreak(n),true);n=E.transition(n,{type:'breakthrough'});assert.equal(n.realm,1);assert.equal(n.journey.foundation[1],0);
 const old=entered(12,false);old.version=15;delete old.journey;const migrated=E.deserialize(JSON.stringify(old));assert.equal(migrated.version,16);assert.equal(migrated.journey.enabled,false);assert.deepEqual(migrated.journey.surveys,[]);const restored=clone(migrated);restored.version=15;delete restored.journey;assert.deepEqual(restored,old);
});
test('结算材料真实进入炼丹行囊、兵器历练有上限，导入不会再次发奖',()=>{
 let s=E.transition(entered(),{type:'journey-start',id:'forest-herbs',kind:'pouch'});while(s.journey.active)s=E.transition(s,{type:'journey-resolve',id:J.preview(s.journey).options[0].id});
 const r=s.journey.last;assert.ok(r.materialCount>0);assert.equal(s.crafting.materials[r.material],r.materialCount);assert.ok(s.xp>0);assert.deepEqual(E.deserialize(E.serialize(s)),s);
});
test('损坏资源、假路线、越界进度、修改途中准备和跨世行旅被拒绝',()=>{
 const base=E.transition(entered(),{type:'journey-start',id:'forest-herbs',kind:'pouch'});
 for(const change of [s=>s.journey.supplies=-1,s=>s.journey.wounds=4,s=>s.journey.foundation[0]=7,s=>s.journey.active.routeId='missing',s=>s.journey.active.step=3,s=>s.journey.active.stats.mind=100,s=>s.journey.active.pending=100,s=>s.journey.active.seed=999,s=>s.journey.surveys=['0:fake']]){const n=clone(base);change(n);assert.throws(()=>E.deserialize(JSON.stringify(n)));}
});
test('十八路线均可完成；准备充分比连续强取有显著优势，但不保证必胜',()=>{
 let careful=0,bold=0,carefulInjury=0,boldInjury=0,total=0;
 for(const r of J.ROUTES){let completed=0;for(let seed=1;seed<=100;seed++){const a=trip(seed,r,0),b=trip(seed,r,2);careful+=a.last.ending==='complete';bold+=b.last.ending==='complete';carefulInjury+=a.wounds;boldInjury+=b.wounds;completed+=a.last.ending==='complete';total++;}assert.ok(completed>30,r.id);}
 assert.ok(careful>bold+total*.20);assert.ok(careful<total);assert.ok(carefulInjury<boldInjury*.65);
});
test('行前提示显示朝闻道带来的实际寿元代价',()=>{
 const s=entered();s.talents.push('morningdao');const UI=require('../src/journey-ui.js');
 const button=(id,text)=>text;assert.equal(E.actionPreview(s,'hunt').years,2);
 assert.match(UI.atlas(s,button),/出发用去 2 年/);assert.match(UI.provisions(s,button),/2 年 · 盘缠/);
});
test('晚年不能开启来不及返回的行旅，仍可正常完成本世而非卡死准备页',()=>{
 const s=entered();s.age=E.maxAge(s)-1;s.flags.pythonSeen=true;s.xp=D.REALMS[0].threshold;
 assert.throws(()=>E.transition(s,{type:'journey-start',id:'forest-cave',kind:'chart'}),/寿元/);
 assert.throws(()=>E.transition(s,{type:'journey-prepare',id:'work'}),/寿元/);
 const ended=E.transition(s,{type:'act',kind:'cultivate'});assert.equal(ended.phase,'dead');assert.equal(ended.journey.active,null);assert.doesNotThrow(()=>E.deserialize(E.serialize(ended)));
});
test('行粮不足可撤回，满伤与资金不足可以通过帮工和静养恢复，不消耗随机流',()=>{
 let s=entered();s.journey.supplies=3;s=E.transition(s,{type:'journey-start',id:'forest-herbs',kind:'pouch'});s=E.transition(s,{type:'journey-resolve',id:J.preview(s.journey).options[0].id});assert.equal(s.journey.supplies,1);assert.equal(J.preview(s.journey).options[0].enabled,false);s=E.transition(s,{type:'journey-retreat'});const rng=s.rng;s.journey.silver=0;s.journey.wounds=3;s=E.transition(s,{type:'journey-prepare',id:'work'});s=E.transition(s,{type:'journey-prepare',id:'rest'});s=E.transition(s,{type:'journey-prepare',id:'supplies'});assert.ok(s.journey.supplies>=6);assert.equal(s.rng,rng);
});
