'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const M = require('../src/meta.js');
const F = require('../src/format.js');
const { simulate, PATHS } = require('../tools/simulation-policy.cjs');
test('寻天地印证沿用一次历练，并停在玩家选择之前', () => {
  const s = simulate(73, 'soul', { stop: s => s.realm === 4 && s.phase === 'playing' && !E.isBlocking(s) }).state;
  assert.ok(E.canSeekProof(s));
  const next = E.transition(s, { type: 'seek-proof' });
  assert.deepEqual(next, E.transition(s, { type: 'act', kind: 'explore' }));
  assert.equal(next.event.id, 'high'); assert.ok(E.isBlocking(next));
  assert.ok(!next.realmProofs.includes(4));
  assert.throws(() => E.transition(next, { type: 'seek-proof' }));
});
test('连续闭关会预留寿元；普通闭关仍由玩家自选风险', () => {
  const s = simulate(74, 'body', { stop: s => s.flags.pythonSeen && !E.isBlocking(s) }).state;
  const cost = E.actionPreview(s, 'cultivate').years;
  s.age = E.maxAge(s) - cost * 2;
  assert.equal(E.canCultivateToReady(s), false);
  assert.throws(() => E.transition(s, { type: 'cultivate-to-ready' }));
  assert.equal(E.transition(s, { type: 'act', kind: 'cultivate' }).phase, 'playing');
});
test('长数字缩写不改变完整值，异常数字明确拒绝', () => {
  assert.equal(F.short(150), '150'); assert.equal(F.short(46872000000), '468.7 亿');
  assert.equal(F.full(46872000000), '46,872,000,000');
  assert.throws(() => F.short(Infinity)); assert.throws(() => F.full(NaN));
});
test('旧 v4 不伪造无暇证明；逆寿按入劫前寿元核验', () => {
  const s = simulate(75, 'soul').state;
  assert.equal(s.phase, 'complete');
  s.defeats = 1; s.log = s.log.slice(-2);
  assert.ok(!M.endingTitles(s).some(t => t.id === 'flawless-ascension'));
  delete s.defeats;
  s.version = 4;
  const old = E.deserialize(JSON.stringify(s));
  assert.equal(old.defeats, null);
  assert.ok(!M.endingTitles(old).some(t => t.id === 'flawless-ascension'));
  s.age = Math.ceil(E.maxAge({ ...s, realm: 8 }) * .85);
  assert.ok(M.endingTitles(s).some(t => t.id === 'against-lifespan'));
});
test('首局飞升永久关闭批注，旧轮回册仍可读取', () => {
  const s = simulate(76, 'soul').state;
  const old = M.createMeta(); delete old.tutorialSeen; delete old.tutorialHidden;
  const meta = M.observe(M.deserialize(JSON.stringify(old)), s);
  assert.equal(meta.tutorialHidden, true); assert.deepEqual(M.observe(meta, s), meta);
});
test('六种策略的批量闭关与逐次闭关结果一致，关键决策未被跳过', () => {
  const result = [];
  for (const strategy of PATHS) for (let seed = 1; seed <= 20; seed++) {
    const bulk = simulate(seed, strategy), one = simulate(seed, strategy, { batch: false });
    assert.equal(bulk.state.phase, 'complete', `${seed}/${strategy}`);
    for (const field of ['realm', 'xp', 'age', 'vitality', 'ascendedPower', 'rng']) assert.equal(bulk.state[field], one.state[field], `${field}/${seed}/${strategy}`);
    assert.ok(bulk.state.flags.pythonSlain && bulk.state.flags.bossSlain && bulk.state.realmProofs.length === 5);
    assert.ok(bulk.turns < one.turns); result.push(bulk.turns);
  }
  console.log(JSON.stringify({ pacedSamples: result.length, min: Math.min(...result), max: Math.max(...result), mean: result.reduce((a,b)=>a+b,0)/result.length }));
});
