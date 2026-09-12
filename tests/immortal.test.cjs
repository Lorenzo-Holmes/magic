'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js'), I = require('../src/immortal.js'), M = require('../src/meta.js'), Z = require('../src/spirit-beast.js');
const { simulate, PATHS } = require('../tools/simulation-policy.cjs');
const { prologue } = require('../tools/immortal-policy.cjs');
const clone = x => JSON.parse(JSON.stringify(x));
test('仙界自愿进入且不清空凡界成就，重复入界与过期操作被拒绝', () => {
  assert.throws(() => E.transition(E.createRun(6), { type: 'immortal-enter' }));
  const mortal = simulate(806, 'soul').state, raw = E.serialize(mortal);
  const s = E.transition(mortal, { type: 'immortal-enter' });
  assert.equal(E.serialize(mortal), raw);
  const expected = clone(mortal); expected.immortal = s.immortal; expected.revision++;
  assert.deepEqual(s, expected); assert.equal(s.phase, 'complete');
  assert.ok(I.power(s.immortal) < s.immortal.wormPower);
  assert.throws(() => E.transition(s, { type: 'immortal-enter' }));
  assert.throws(() => E.transition(s, { type: 'immortal-approach', id: 'hide', revision: mortal.revision }));
});
test('凡尘桥梁只携带跨卷必要字段，并可创建独立第二卷运行态', () => {
  const mortal=simulate(8061,'sword').state, meta=M.observe(M.createMeta(),mortal), bridge=meta.storyProgress.lastMortalBridge;
  assert.deepEqual(Object.keys(bridge).sort(),['ascendedAge','ascendedPower','companion','lineage','mortalFusion','sourceSeed','version']);
  assert.equal(bridge.sourceSeed,mortal.seed);assert.equal(bridge.ascendedPower,mortal.ascendedPower);
  assert.equal(bridge.companion,null);assert.equal(JSON.stringify(bridge).includes('equipment'),false);assert.equal(JSON.stringify(bridge).includes('rng'),false);
  const second=E.createImmortalRun(bridge);
  assert.equal(second.storyOrigin.chapter,'immortal');assert.equal(second.immortal.phase,'arrival');assert.equal(second.root,null);assert.equal(second.origin,null);
  assert.deepEqual(second.equipment.inventory,[]);assert.equal(second.immortal.lineage,bridge.lineage);assert.equal(second.immortal.mortalFusion,bridge.mortalFusion);
  assert.deepEqual(E.deserialize(E.serialize(second)),second);
  const stepped=E.transition(second,{type:'immortal-approach',id:'hide',revision:second.revision});assert.equal(stepped.immortal.phase,'shelter');
  const broken=clone(meta);broken.storyProgress.lastMortalBridge.extra='forbidden';assert.throws(()=>M.serialize(broken),/桥梁/);
});
test('第一卷真灵只以最小摘要跨卷，第二卷可继续进化但不继承精华和历史',()=>{
  const mortal=simulate(8062,'body').state;
  let beast=Z.bond(Z.createState(),'stoneape');beast=Z.addEssence(beast,30,'fixture');
  beast=Z.evolve(beast,{realm:9});beast=Z.evolve(beast,{realm:9},'sacred');beast=Z.evolve(beast,{realm:9});
  mortal.spiritBeast=beast;E.validate(mortal);
  const bridge=M.createMortalBridge(mortal);assert.deepEqual(bridge.companion,{species:'stoneape',stage:3,branch:'sacred'});
  const second=E.createImmortalRun(bridge);assert.deepEqual(second.spiritBeast.companion,bridge.companion);assert.equal(second.spiritBeast.essence,0);assert.deepEqual(second.spiritBeast.history,[]);
  second.spiritBeast=Z.addEssence(second.spiritBeast,8,'immortal-fixture');const evolved=E.transition(second,{type:'beast-evolve',revision:second.revision});
  assert.equal(evolved.spiritBeast.companion.stage,4);assert.equal(Z.summary(evolved.spiritBeast).stageName,'仙兽');
});
test('首口吞噬形成三选一法则，签池刷新稳定且只扣一次碎片', () => {
  const s = prologue(simulate(807, 'soul').state, 'soul', { stop: s => s.immortal.phase === 'law' }).state;
  const i = s.immortal;
  assert.equal(i.lawOffer.length, 3); assert.equal(new Set(i.lawOffer).size, 3);
  assert.ok(i.lawOffer.includes(i.lineage)); assert.ok(i.devours === 1 && i.fragments >= 3);
  const reloaded = E.deserialize(E.serialize(s)); assert.deepEqual(reloaded, s);
  const chosen = E.transition(reloaded, { type: 'immortal-law', id: i.lawOffer[0] });
  assert.equal(chosen.immortal.fragments, i.fragments - 1);
  assert.throws(() => E.transition(chosen, { type: 'immortal-law', id: i.lawOffer[0] }));
});
test('六种法则具有实际差异，仙界能力不改变凡界战力', () => {
  const s = prologue(simulate(808).state).state, base = clone(s.immortal);
  base.law = 'devour'; const normal = I.power(base); base.law = 'sword'; assert.ok(I.power(base) > normal);
  base.law = 'soul'; assert.ok(I.power(base, { kind: 'illusion' }) > I.power(base));
  base.law = 'insight'; const cheap = I.trainingCost(base); base.law = 'body'; assert.ok(I.trainingCost(base) > cheap);
  for (const law of I.LAWS) {
    const i = { ...base, law: law.id, phase: 'encounter', target: 'dew-beetle', wormSlain: false, health: 100, devours: 2 };
    const next = I.transition(i, { type: 'devour' });
    assert.equal(next.fragments - i.fragments, law.id === 'fortune' ? 2 : 1);
    assert.equal(next.essence - i.essence, law.id === 'devour' ? 26 : 22);
  }
  assert.equal(E.power(s), s.ascendedPower);
});
test('仙躯崩散可从落点重试，原凡界结局与道痕不丢失', () => {
  const s = prologue(simulate(809).state, 'body', { stop: s => s.immortal.phase === 'field' }).state;
  s.immortal.phase = 'dead'; s.immortal.health = 0; s.immortal.note = '死亡测试夹具';
  const meta = M.observe(M.createMeta(), s), retry = E.transition(s, { type: 'immortal-retry' });
  assert.equal(retry.immortal.phase, 'arrival'); assert.equal(retry.immortal.health, 100);
  assert.equal(retry.ascendedPower, s.ascendedPower); assert.deepEqual(M.observe(meta, retry), meta);
});
test('旧 v4 通关档升级仍在原结局，损坏仙界存档被拦截', () => {
  const old = simulate(810).state; old.version = 4; delete old.immortal;
  const migrated = E.deserialize(JSON.stringify(old));
  assert.equal(migrated.version, E.VERSION); assert.equal(migrated.phase, 'complete'); assert.equal(migrated.immortal, null); assert.deepEqual(migrated.equipment.inventory, []);
  const real = prologue(migrated).state;
  for (const mutate of [i=>i.basePower++,i=>i.wormPower++,i=>i.health=101,i=>i.law='fake',i=>i.journal=Array(41).fill({day:0,text:'x'}),i=>i.target='fake']) {
    const broken = clone(real); mutate(broken.immortal); assert.throws(() => E.deserialize(JSON.stringify(broken)));
  }
});
test('六策略各二十局仙界序章完整可通，噬灵虫不随玩家增长', () => {
  const turns = [];
  for (const strategy of PATHS) for (let seed=1;seed<=20;seed++) {
    const mortal = simulate(seed + 8000, strategy).state;
    const a = prologue(mortal, strategy), b = prologue(mortal, strategy, { reload: true });
    assert.equal(a.state.immortal.phase, 'prologue-complete', `${strategy}/${seed}`);
    assert.deepEqual(a.state, b.state); assert.ok(a.state.immortal.wormSlain);
    assert.equal(a.state.immortal.wormPower, I.create(mortal).wormPower);
    assert.ok(I.power(a.state.immortal) >= a.state.immortal.wormPower * 2);
    assert.equal(a.state.ascendedPower, mortal.ascendedPower); assert.equal(a.state.rng, mortal.rng);
    turns.push(a.turns);
  }
  console.log(JSON.stringify({ immortalSamples: turns.length, min:Math.min(...turns),max:Math.max(...turns),mean:turns.reduce((a,b)=>a+b,0)/turns.length }));
});
