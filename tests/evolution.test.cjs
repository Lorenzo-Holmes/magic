'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),I=require('../src/immortal.js'),V=require('../src/evolution.js'),Q=require('../src/quantity.js');
const {simulate,PATHS}=require('../tools/simulation-policy.cjs');
const {prologue}=require('../tools/immortal-policy.cjs');
const {campaign}=require('../tools/evolution-policy.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const entered=()=>E.transition(prologue(simulate(901,'soul').state,'soul').state,{type:'immortal-evolution-enter'});
test('科学计数越过 10^308 仍可比较、增长与保存，不产生 Infinity',()=>{
  const a={m:2.5,e:'90071992547409910000'},b=Q.multiply(a,4);
  assert.equal(b.e,'90071992547409910001');assert.equal(b.m,1);
  assert.equal(Q.compare(b,a),1);assert.equal(Q.ratio(b,a),4);
  assert.equal(Q.ratio(a,Q.from(1)),1000000);
  assert.doesNotMatch(JSON.stringify(b),/Infinity|NaN/);assert.match(Q.format(b),/10\^90071992547409910001/);
  assert.throws(()=>Q.from(Infinity));assert.throws(()=>Q.multiply(a,0));assert.throws(()=>Q.validate({m:10,e:'3'}));
  assert.deepEqual(Q.from(Number.MIN_VALUE),{m:4.94065645841,e:'-324'});
});
test('五槽继承凡界道基，重复进入与无条件提前结局被拒绝',()=>{
  const s=entered();assert.equal(Object.keys(s.immortal.evolution.slots).length,5);
  assert.equal(s.immortal.evolution.slots.soul.id,'void-sight');
  assert.throws(()=>E.transition(s,{type:'immortal-evolution-enter'}));
  assert.throws(()=>E.transition(s,{type:'immortal-evolution-endless'}));
  assert.throws(()=>E.transition(s,{type:'immortal-evolution-hunt',id:'gate'}));
});
test('吞噬三候选只选一，重载不重抽，替换不叠加旧能力',()=>{
  let s=entered();s=E.transition(s,{type:'immortal-evolution-hunt',id:'ruin-beetle'});
  s=E.transition(s,{type:'immortal-evolution-devour',id:'direct'});
  assert.equal(s.immortal.phase,'evolve');assert.equal(s.immortal.evolution.offer.length,3);
  const raw=E.serialize(s);assert.equal(E.serialize(E.deserialize(raw)),raw);
  s.immortal.evolution.slots.body={id:'flame-armor',level:3};
  const beforeChoice=E.serialize(s);
  const id=s.immortal.evolution.offer.find(id=>V.TRAITS.find(t=>t.id===id).slot==='body');
  const next=E.transition(s,{type:'immortal-evolution-choose',id});
  assert.equal(next.immortal.evolution.slots.body.id,id);assert.equal(next.immortal.evolution.offer.length,0);
  assert.throws(()=>E.transition(next,{type:'immortal-evolution-choose',id}));
  assert.equal(next.immortal.evolution.slots.body.level,1);
  assert.equal(E.serialize(s),beforeChoice);
});
test('四种融合消费指定材料与碎片，催化法则保留，不重复领奖',()=>{
  for(const r of V.RECIPES){
    const s=entered(),i=s.immortal,e=i.evolution;
    for(const id of r.needs){const t=V.TRAITS.find(t=>t.id===id);e.slots[t.slot]={id,level:1};if(t.slot==='law')i.law=id.slice(4);}
    i.fragments=r.cost;
    const next=E.transition(s,{type:'immortal-evolution-fuse',id:r.id});
    assert.equal(next.immortal.fragments,0);assert.equal(next.immortal.evolution.slots[V.TRAITS.find(t=>t.id===r.result).slot].id,r.result);
    if(r.catalyst)assert.equal(next.immortal.evolution.slots.law.id,r.catalyst);
    assert.throws(()=>E.transition(next,{type:'immortal-evolution-fuse',id:r.id}));
  }
});
test('升级最多五阶，低资源仍有恢复路线，危险印证会真实死亡',()=>{
  let s=entered();s.immortal.fragments=100;
  for(let n=0;n<4;n++)s=E.transition(s,{type:'immortal-evolution-upgrade',id:'law'});
  assert.equal(s.immortal.evolution.slots.law.level,5);
  assert.throws(()=>E.transition(s,{type:'immortal-evolution-upgrade',id:'law'}));
  s.immortal.health=10;s.immortal.essence=0;
  const healed=E.transition(s,{type:'immortal-evolution-rest'});assert.equal(healed.immortal.health,45);
  assert.equal(E.transition(healed,{type:'immortal-evolution-cultivate'}).immortal.essence,20);
  const ev=E.transition(s,{type:'immortal-evolution-explore'}),dead=E.transition(ev,{type:'immortal-evolution-event',id:'force'});
  assert.equal(dead.immortal.phase,'dead');assert.equal(dead.immortal.health,0);
  const recovered=E.transition(dead,{type:'immortal-evolution-recover'});
  assert.equal(recovered.immortal.health,100);assert.deepEqual(recovered.immortal.evolution.slots,dead.immortal.evolution.slots);
});
test('旧仙界子存档 v1 保留吞虫结局，升级不自动强开后续',()=>{
  const s=prologue(simulate(902).state).state;s.immortal.version=1;delete s.immortal.evolution;
  const migrated=E.deserialize(JSON.stringify(s));
  assert.equal(migrated.immortal.version,2);assert.equal(migrated.immortal.phase,'prologue-complete');assert.equal(migrated.immortal.evolution,null);
});
test('错误的守界前置、进化候选和世界完成顺序均被拒绝',()=>{
  const s=entered();
  for(const mutate of [e=>e.cleared=[3],e=>{e.target='gate';},e=>e.completed=true]){
    const broken=copy(s);mutate(broken.immortal.evolution);
    if(broken.immortal.evolution.target)broken.immortal.phase='world-encounter';
    assert.throws(()=>E.deserialize(JSON.stringify(broken)));
  }
  let offered=E.transition(s,{type:'immortal-evolution-hunt',id:'ruin-beetle'});
  offered=E.transition(offered,{type:'immortal-evolution-devour',id:'direct'});
  offered.immortal.evolution.offer[0]='world-eye';
  assert.throws(()=>E.deserialize(JSON.stringify(offered)));
});
test('无尽数量级与操作版本超过安全整数仍精确递增',()=>{
  const s=campaign(simulate(903,'soul').state,'soul',{endlessWorlds:1}).state;
  s.revision='90071992547409910000';s.immortal.evolution.layer='100000000000000000000000001';s.immortal.evolution.scale={m:4.35,e:'1000'};
  const raw=E.serialize(s),next=E.transition(s,{type:'immortal-evolution-cultivate',revision:s.revision});
  assert.equal(next.revision,'90071992547409910001');assert.equal(E.serialize(s),raw);
  assert.ok(Q.compare(V.power(next.immortal),Q.from(1e308))>0);
  assert.deepEqual(E.deserialize(E.serialize(next)),next);
  assert.throws(()=>E.transition(next,{type:'immortal-evolution-rest',revision:s.revision}));
});
test('六种策略完成四界正式进化与两个无尽界，全部状态可恢复',()=>{
  const counts=[];
  for(const strategy of PATHS)for(let seed=1;seed<=10;seed++){
    const mortal=simulate(9000+seed,strategy).state,a=campaign(mortal,strategy),b=campaign(mortal,strategy,{reload:true});
    assert.equal(a.state.immortal.phase,'ending',`${strategy}/${seed}`);assert.deepEqual(a.state,b.state);
    assert.deepEqual(a.state.immortal.evolution.cleared,[1,2,3,4]);
    const endless=campaign(a.state,strategy,{endlessWorlds:2}).state;
    assert.ok(endless.immortal.evolution.endless&&BigInt(endless.immortal.evolution.layer)>=7n);
    assert.equal(endless.ascendedPower,mortal.ascendedPower);counts.push(a.turns);
  }
  console.log(JSON.stringify({evolutionSamples:counts.length,min:Math.min(...counts),max:Math.max(...counts),mean:counts.reduce((a,b)=>a+b,0)/counts.length}));
});
