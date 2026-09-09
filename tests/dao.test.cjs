'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/dao.js'),E=require('../src/engine.js'),B=require('../src/build.js'),D=require('../src/data.js');
const {simulate}=require('../tools/simulation-policy.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
test('创道后六条路线各二十种子仍可完成凡界与仙界，规则余次始终有界',()=>{
  const {chooseAction}=require('../tools/simulation-policy.cjs'),{prologue}=require('../tools/immortal-policy.cjs');
  let formed=0;
  for(const path of B.PRIMARY)for(let seed=1;seed<=20;seed++){
    let s=E.createRun(121000+seed,{carriedTrace:path});
    for(let turn=0;turn<400&&!['complete','dead'].includes(s.phase);turn++){
      if(A.preview(s.dao,s).ready&&!s.secretRealm.active){s=E.transition(s,{type:'dao-form'});formed++;}
      s=E.transition(s,chooseAction(s,path));E.validate(s);
    }
    assert.equal(s.phase,'complete',path+'/'+seed);assert.ok(s.dao.formed);
    for(const [id,n]of Object.entries(s.dao.used))assert.ok(n<=A.RULES.find(r=>r.id===id).charges);
    const immortal=prologue(s,path).state;assert.equal(immortal.immortal.wormSlain,true);assert.deepEqual(immortal.dao,s.dao);
  }
  assert.equal(formed,120);
});
test('八个规则组件分别在声明动作触发，耗尽后不会继续发放',()=>{
  const triggers={hunt:[{type:'act',kind:'hunt'},{}],devour:[{type:'resolve',choice:'devour'},{devours:1}],combat:[{type:'resolve',choice:'fight'},{combatReplay:{id:'new'}}],explore:[{type:'act',kind:'explore'},{}],karma:[{type:'karma-resolve',id:'answer'},{}],cultivate:[{type:'act',kind:'cultivate'},{}],breakthrough:[{type:'breakthrough'},{}],tribulation:[{type:'tribulation-step',id:'sword'},{}]};
  for(const rule of A.RULES){
    let d=A.createState();d.total=12;const main=B.PRIMARY.includes(rule.id)?rule.id:'insight';
    d.samples=Array.from({length:12},(_,i)=>({n:i+1,main,kind:rule.kind,realm:4,route:'explicit-rule-fixture',equipment:[]}));
    d=A.form(d,{seed:4242,realm:4,phase:'playing'});assert.ok(d.formed.rules.includes(rule.id));
    const [action,extra]=triggers[rule.kind],before={devours:0,phase:'playing'},after={...before,...extra};
    for(let i=0;i<rule.charges+2;i++){const result=A.afterAction(d,before,after,action,1000);d=result.state;const hit=result.rewards.find(r=>r.id===rule.id);assert.equal(!!hit,i<rule.charges);if(hit)assert.ok(hit.xp>0||hit.heal>0);}
    A.validate(d);assert.equal(d.used[rule.id],rule.charges);
  }
});
function ready(path='insight',seed=12001){return simulate(seed,path,{stop:s=>s.phase==='playing'&&!E.isBlocking(s)&&A.preview(s.dao,s).ready}).state;}
test('真实主线积累行为后创道；同 seed 同路线给出相同名称与规则',()=>{
  const a=ready(),b=ready();assert.ok(A.preview(a.dao,a).ready);assert.ok(a.dao.samples.every(x=>x.route&&x.n>0));
  const n=E.transition(a,{type:'dao-form',revision:a.revision});
  assert.deepEqual(n.dao.formed,E.transition(b,{type:'dao-form'}).dao.formed);
  assert.equal(n.rng,a.rng);assert.equal(E.power(n),E.power(a));assert.deepEqual(E.deserialize(E.serialize(n)),n);
  assert.throws(()=>E.transition(n,{type:'dao-form'}));assert.throws(()=>E.transition(n,{type:'dao-form',revision:a.revision}));
});
test('六条路线可以形成非冲突大道；名称组件与规则组件固定且可核对',()=>{
  assert.equal(A.ROOTS.length,10);assert.equal(A.RULES.length,8);
  for(const path of B.PRIMARY){const s=ready(path,12002),p=A.preview(s.dao,s);assert.ok(p.ready,path);const n=E.transition(s,{type:'dao-form'});const ids=n.dao.formed.rules;assert.ok(ids.length>=1&&ids.length<=2);for(const id of ids)assert.ok(ids.every(other=>!A.CONFLICTS[id].includes(other)));}
  for(const [id,others] of Object.entries(A.CONFLICTS))for(const other of others)assert.ok(A.CONFLICTS[other].includes(id));
});
test('不足十二段或主脉不稳定不能创道；面板预览不改变历史与随机数',()=>{
  const s=ready(),raw=E.serialize(s);for(let i=0;i<50;i++)A.preview(s.dao,s);assert.equal(E.serialize(s),raw);
  const low=clone(s);low.dao.samples=low.dao.samples.slice(0,11);assert.throws(()=>E.transition(low,{type:'dao-form'}));
  const mixed=clone(s);mixed.dao.samples.forEach((r,i)=>r.main=B.PRIMARY[i%6]);assert.throws(()=>E.transition(mixed,{type:'dao-form'}));
});
test('大道效果扣除有限次数；刷新和再次创道不能恢复次数',()=>{
  let s=E.transition(ready(),{type:'dao-form'});assert.ok(s.dao.formed.rules.includes('insight'));
  while(s.dao.used.insight<3){
    const before=s,xp=s.xp;s=E.transition(s,{type:'act',kind:'cultivate'});
    assert.ok(s.xp>=xp);assert.equal(s.dao.used.insight,before.dao.used.insight+1);s=E.deserialize(E.serialize(s));
  }
  const after=E.transition(s,{type:'act',kind:'cultivate'});assert.equal(after.dao.used.insight,3);assert.throws(()=>E.transition(after,{type:'dao-form'}));
  assert.deepEqual(E.createRun(99999).dao,A.createState());
});
test('装备与已选路线从行动当时采样；只打开面板或整理背包不计修行',()=>{
  const s=ready();let d=A.observe(s.dao,s,s,{type:'equipment-equip',id:'fake'});assert.deepEqual(d,s.dao);
  const before=E.serialize(s);A.preview(s.dao,s);B.evaluateBuild(s);assert.equal(E.serialize(s),before);
  const sample=s.dao.samples.at(-1);assert.ok(A.KINDS[sample.kind]);assert.ok(B.PRIMARY.includes(sample.main));
});
test('长时间修行只保留四十八段来源；成道后来源不会被后续动作冲掉',()=>{
  const s=ready();let d=A.createState();for(let i=0;i<300;i++)d=A.observe(d,s,{...s,actions:s.actions+1},{type:'act',kind:'cultivate'});
  assert.equal(d.total,300);assert.equal(d.samples.length,48);A.validate(d);
  d=A.form(d,s);assert.deepEqual(A.observe(d,s,s,{type:'act',kind:'explore'}),d);
});
test('v13旧档与v5主线迁移仅补空大道，不推断旧日志',()=>{
  const old=clone(ready());old.version=13;delete old.dao;
  const n=E.deserialize(JSON.stringify(old));assert.deepEqual(n.dao,A.createState());assert.equal(n.rng,old.rng);assert.equal(n.realm,old.realm);
  const v5=clone(old);v5.version=5;for(const key of ['equipment','combatReplay','secretRealm','sect','life','spiritBeast','crafting','karma'])delete v5[key];
  assert.deepEqual(E.deserialize(JSON.stringify(v5)).dao,A.createState());
});
test('损坏名称、规则、来源和次数拒绝导入；没有动态执行入口',()=>{
  const s=E.transition(ready(),{type:'dao-form'});
  for(const alter of [n=>n.dao.formed.name='伪造大道',n=>n.dao.formed.rules=['unknown'],n=>n.dao.used.insight=999,n=>n.dao.samples[0].main='invalid',n=>n.dao.formed.seed=n.seed+1]){
    const n=clone(s);alter(n);assert.throws(()=>E.deserialize(JSON.stringify(n)));
  }
  assert.ok(D.REALMS[s.realm].threshold>0);
});
