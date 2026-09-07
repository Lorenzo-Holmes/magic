'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/data.js');
const E = require('../src/engine.js');
const M = require('../src/meta.js');
const clone = value => JSON.parse(JSON.stringify(value));
function entered(seed = 600) {
  const s = E.createRun(seed);
  s.phase = 'playing'; s.root = 'thunder'; s.origin = 'orphan';
  s.stats = { bone: 5, insight: 5, luck: 5, mind: 5 };
  s.talents = ['strong', 'bright', 'fortunate']; s.innate = [...s.talents]; s.offer = []; s.selected = [...s.innate];
  s.flags.pythonSeen = true; s.event = { id: 'quiet', title: '测试', text: '测试' };
  return s;
}
function ascended(seed = 601) {
  const s = entered(seed);
  s.phase = 'complete'; s.realm = 9; s.xp = 0; s.age = 3000;
  s.talents = ['spirit', 'blood', 'stomach', 'taotie', 'sense', 'aware', 'bright', 'study', 'seed', 'fortunate', 'fortune', 'destiny'];
  s.innate = s.talents.slice(0, 3); s.mutations = ['serpenteye']; s.fusions = ['abyss-eye'];
  s.devours = 8; s.sword = true; s.flags = { pythonSeen: true, pythonSlain: true, swordEvent: true, bossSeen: true, bossSlain: true, ascended: true };
  s.bossRoute = 'see-through'; s.tribulationStage = 3; s.tribulationBase = 10000000000;
  s.tribulationRoutes = ['fusion', 'trace-soul', 'cut-gate']; s.realmProofs = [4, 5, 6, 7, 8];
  s.highSeen = ['nascent-battlefield', 'soul-rift', 'void-nest', 'world-form', 'star-corpse'];
  s.ending = '飞升'; s.log = [{ title: '飞升', text: '天门洞开。', tone: 'gold', age: s.age, realm: 9 }];
  s.ascendedPower = E.power(s); return s;
}
test('六类流派识别读取真实天命、属性、异变、融合与路线', () => {
  const cases = [
    ['devour', s => { s.talents = ['spirit', 'blood', 'stomach']; s.devours = 9; s.mutations = ['serpentblood']; s.fusions = ['devour-body']; }],
    ['sword', s => { s.talents = ['swordheart', 'swordbone', 'bright']; s.sword = true; s.fusions = ['thunder-sword']; }],
    ['body', s => { s.talents = ['strong', 'iron', 'dragonbone']; s.stats.bone = 10; s.mutations = ['redscale']; s.fusions = ['golden-body']; }],
    ['soul', s => { s.talents = ['aware', 'sense', 'bright']; s.stats.mind = 10; s.mutations = ['serpenteye']; s.fusions = ['abyss-eye']; }],
    ['fortune', s => { s.talents = ['fortunate', 'fortune', 'destiny']; s.stats.luck = 10; s.fusions = ['fate-veil']; }],
    ['insight', s => { s.talents = ['bright', 'study', 'seed']; s.stats.insight = 10; s.fusions = ['five-unity']; }]
  ];
  for (const [expected, tune] of cases) {
    const s = entered(610 + cases.findIndex(item => item[0] === expected)); tune(s);
    assert.equal(M.classifyPath(s).id, expected);
    assert.ok(M.classifyPath(s).signals.length);
  }
});
test('飞升称号可以同时成立，并以更具体的称号优先', () => {
  const s = ascended();
  const titles = M.endingTitles(s).map(title => title.id);
  assert.equal(titles[0], 'myriad-devourer');
  assert.ok(titles.includes('sword-opens-heaven'));
  assert.ok(titles.includes('clear-all-delusions'));
  assert.ok(titles.includes('flawless-ascension'));
  assert.ok(titles.includes('mortal-ascender'));
});
test('轮回册观察只登记一次结局，并收集图谱发现', () => {
  const s = ascended();
  let meta = M.observe(M.createMeta(), s);
  const once = clone(meta);
  meta = M.observe(meta, s);
  assert.deepEqual(meta, once);
  assert.equal(meta.totals.ended, 1); assert.equal(meta.totals.ascended, 1);
  assert.ok(meta.discovered.talents.includes('taotie'));
  assert.ok(meta.discovered.fusions.includes('abyss-eye'));
  assert.ok(meta.discovered.highEvents.includes('star-corpse'));
  assert.ok(meta.discovered.bossRoutes.includes('see-through'));
  assert.ok(meta.discovered.tribulationRoutes.includes('trace-soul'));
  assert.ok(meta.discovered.titles.includes('myriad-devourer'));
});
test('每局只凝练一枚候选道痕，开始下一世后即被消费', () => {
  const s = ascended(620), candidates = M.traceCandidates(s);
  assert.equal(candidates.length, 3);
  let meta = M.selectTrace(M.observe(M.createMeta(), s), s, candidates[0].id);
  assert.equal(meta.nextTrace, candidates[0].id); assert.equal(meta.nextTraceSource, s.seed);
  const consumed = M.consumeTrace(meta);
  assert.equal(consumed.trace, candidates[0].id); assert.equal(consumed.meta.nextTrace, null); assert.equal(consumed.meta.nextTraceSource, null);
  assert.throws(() => M.selectTrace(meta, s, D.TRACES.find(trace => !candidates.some(c => c.id === trace.id)).id));
});
test('命途图谱对未发现内容只给线索，序列化拒绝损坏数据', () => {
  const empty = M.createMeta(), sections = M.codexSections(empty);
  assert.ok(sections.every(section => section.entries.every(entry => !entry.discovered && entry.name === '？？？')));
  const observed = M.observe(empty, ascended());
  const restored = M.deserialize(M.serialize(observed));
  assert.deepEqual(restored, observed);
  assert.ok(M.summary(observed).discovered > 0);
  const broken = clone(observed); broken.discovered.traces.push('missing');
  assert.throws(() => M.deserialize(JSON.stringify(broken)));
  const orphanSource = clone(observed); orphanSource.nextTraceSource = 123;
  assert.throws(() => M.deserialize(JSON.stringify(orphanSource)));
});
