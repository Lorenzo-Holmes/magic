'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/data.js'), E = require('../src/engine.js'), M = require('../src/meta.js');
const clone = value => JSON.parse(JSON.stringify(value));
test('前世天命只在对应道痕第二世出现，重抽不复制也不丢失', () => {
  const memoryIds = D.TRACES.map(t=>t.talentId);
  for (const trace of D.TRACES) {
    const plain = E.createRun(1000 + D.TRACES.indexOf(trace));
    assert.equal(plain.offer.some(id=>memoryIds.includes(id)), false);
    let inherited = E.createRun(2000 + D.TRACES.indexOf(trace), {carriedTrace:trace.id,sourceSeed:1234});
    assert.equal(inherited.traceSourceSeed, 1234);
    assert.deepEqual(inherited.offer.filter(id=>memoryIds.includes(id)), [trace.talentId]);
    inherited = E.transition(inherited,{type:'reroll-opening'});
    assert.deepEqual(inherited.offer.filter(id=>memoryIds.includes(id)), [trace.talentId]);
  }
});
test('跨两个 localStorage 键的道痕消费可以在中断后自动对账', () => {
  const first = E.createRun(3001); first.phase='complete'; first.realm=9; first.xp=0; first.age=100;
  first.root='wood';first.origin='herb';first.talents=first.offer.slice(0,3);first.innate=[...first.talents];first.selected=[...first.talents];first.offer=[];
  first.flags={pythonSeen:true,pythonSlain:true,swordEvent:true,bossSeen:true,bossSlain:true,ascended:true,traceEchoSeen:false,traceResonanceSeen:false};
  first.mutations=['redscale'];first.fusions=['golden-body'];first.realmProofs=[4,5,6,7,8];first.tribulationStage=3;first.tribulationBase=1;first.tribulationRoutes=['legacy','legacy','legacy'];first.ascendedPower=1000000000;first.ending='飞升';first.defeats=0;
  E.validate(first);
  let ledger=M.observe(M.createMeta(),first);const candidate=M.traceCandidates(first)[0];ledger=M.selectTrace(ledger,first,candidate.id);
  const second=E.createRun(3002,{carriedTrace:candidate.id,sourceSeed:first.seed});
  const recovered=M.reconcile(ledger,second);
  assert.equal(recovered.nextTrace,null);assert.equal(recovered.nextTraceSource,null);
  assert.deepEqual(M.reconcile(recovered,second),recovered);
});
test('v1 轮回册迁移到 v2 后补齐仙界图谱字段且保留旧发现', () => {
  const old=M.createMeta();old.version=1;
  for(const key of ['traceEvents','immortalLaws','evolutionTraits','evolutionFusions','worlds'])delete old.discovered[key];
  old.tutorialHidden=undefined;old.tutorialSeen=undefined;old.discovered.talents=['strong'];
  const migrated=M.deserialize(JSON.stringify(old));
  assert.equal(migrated.version,2);assert.deepEqual(migrated.discovered.talents,['strong']);
  for(const key of ['traceEvents','immortalLaws','evolutionTraits','evolutionFusions','worlds'])assert.deepEqual(migrated.discovered[key],[]);
  assert.equal(migrated.tutorialHidden,false);assert.deepEqual(migrated.tutorialSeen,[]);
});
test('轮回历程记录第二世的道痕来源并拒绝伪造来源', () => {
  const s=E.createRun(4002,{carriedTrace:'soul',sourceSeed:4001});
  const broken=M.createMeta();broken.runHistory=[{seed:9,ending:'飞升',ascended:true,trace:'fake'}];
  assert.throws(()=>M.validate(broken));
  assert.equal(s.traceSourceSeed,4001);
  const raw=E.deserialize(E.serialize(s));assert.deepEqual(raw,s);
});
