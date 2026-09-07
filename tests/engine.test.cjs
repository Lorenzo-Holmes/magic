'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const D = require('../src/data.js');
const clone = v => JSON.parse(JSON.stringify(v));
function step(s, type, extra = {}) { return E.transition(s, { type, ...extra }); }
function enter(seed = 42, preset = 'balanced', trace = null) {
  let s = E.createRun(seed, trace);
  for (const id of s.offer.slice(0, 3)) s = step(s, 'select', { id });
  s = step(s, 'confirm-talents'); s = step(s, 'preset', { id: preset });
  return step(s, 'enter');
}
function finish(seed, options = {}) {
  let s = enter(seed, options.preset || 'balanced', options.trace || null), turns = 0;
  while (!['complete', 'dead'].includes(s.phase) && turns++ < 500) {
    if (s.phase === 'draft') s = step(s, 'pick', { id: s.offer[options.pickIndex || 0] });
    else if (s.phase === 'mutation') s = step(s, 'mutate', { id: options.mutation || 'redscale' });
    else if (s.phase === 'fusion') s = step(s, 'pick-fusion', { id: s.fusionOffer[options.fusionIndex || 0] });
    else if (s.phase === 'tribulation') {
      const data = E.tribulationChoices(s), route = data.options.find(x => x.id === 'fusion') || data.options[0];
      s = step(s, 'tribulation-step', { id: route.id });
    }
    else if (s.event?.id === 'first-python') s = step(s, 'resolve', { choice: 'flee' });
    else if (s.event?.id === 'trace-echo' || s.event?.id === 'trace-resonance') s = step(s, 'resolve', { choice: 'remember' });
    else if (s.event?.id === 'revenge') s = step(s, 'resolve', { choice: options.kill ? 'kill' : 'devour' });
    else if (s.event?.id === 'remains') s = step(s, 'resolve', { choice: 'devour' });
    else if (s.event?.id === 'swordsman') s = step(s, 'resolve', { choice: 'learn' });
    else if (s.event?.id === 'ruin') s = step(s, 'resolve', { choice: 'probe' });
    else if (s.event?.id === 'hunt') s = step(s, 'resolve', { choice: 'flee' });
    else if (s.event?.id === 'advanced') {
      const choices = E.advancedChoices(s, s.event.scene).filter(c => c.id !== 'leave');
      const safe = choices.find(c => !c.risk) || choices[0]; s = step(s, 'resolve', { choice: safe.id });
    }
    else if (s.event?.id === 'high') {
      const choices = E.highChoices(s, s.event.scene).slice().sort((a, b) => (b.factor - b.risk * .003) - (a.factor - a.risk * .003));
      const safe = choices.find(c => !c.risk) || choices[0]; s = step(s, 'resolve', { choice: safe.id });
    }
    else if (s.event?.id === 'boss') {
      const boss = D.ENEMIES.find(e => e.id === 'threeeye');
      const route = E.bossChoices(s).map(route => ({ route, threat: E.threat(s, { ...boss, power: Math.round(boss.power * route.enemyFactor) }) })).filter(x => x.threat.ratio >= .55).sort((a, b) => b.threat.ratio - a.threat.ratio)[0];
      if (!route) throw new Error('Boss event opened without a viable route');
      s = step(s, 'resolve', { choice: route.route.id });
    }
    else if (E.canBreak(s)) s = step(s, 'breakthrough');
    else if (s.realm >= 3 && s.vitality < 80) s = step(s, 'act', { kind: 'cultivate' });
    else if (E.canChallengeBoss(s)) {
      const boss = D.ENEMIES.find(e => e.id === 'threeeye');
      const best = E.bossChoices(s).map(route => E.threat(s, { ...boss, power: Math.round(boss.power * route.enemyFactor) })).sort((a, b) => b.chance - a.chance)[0];
      if (best.chance < .98 && s.xp < D.REALMS[3].threshold) s = step(s, 'act', { kind: 'cultivate' });
      else s = step(s, 'challenge-boss');
    }
    else if (s.realm === 3 && s.advancedResolved < 2) s = step(s, 'act', { kind: 'explore' });
    else if (s.realm >= 4 && s.realm <= 8 && !s.realmProofs.includes(s.realm)) s = step(s, 'act', { kind: 'explore' });
    else s = step(s, 'act', { kind: 'cultivate' });
    if (options.reload) s = E.deserialize(E.serialize(s));
  }
  return { state: s, turns };
}
test('开局八选三：唯一签池、至少一玄、确定性随机', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = E.createRun(seed);
    assert.equal(s.offer.length, 8); assert.equal(new Set(s.offer).size, 8);
    assert.ok(s.offer.some(id => D.TALENTS.find(t => t.id === id).rarity >= 2));
    assert.deepEqual(s, E.createRun(seed));
  }
});
test('开局加点与选择均有硬边界', () => {
  let s = E.createRun(12);
  assert.throws(() => step(s, 'confirm-talents'));
  for (const id of s.offer.slice(0, 3)) s = step(s, 'select', { id });
  assert.throws(() => step(s, 'select', { id: s.offer[3] }));
  s = step(s, 'confirm-talents');
  assert.throws(() => step(s, 'stat', { id: 'bone', delta: 1 }));
  s = step(s, 'stat', { id: 'bone', delta: -1 });
  assert.throws(() => step(s, 'enter'));
  s = step(s, 'stat', { id: 'mind', delta: 1 });
  assert.equal(step(s, 'enter').phase, 'playing');
  assert.throws(() => step(s, 'stat', { id: 'bone', delta: 40 }));
  assert.throws(() => step(s, 'stat', { id: '__proto__', delta: 1 }));
});
test('重抽次数有限，刷新不能重置', () => {
  let s = E.createRun(9);
  s = step(s, 'reroll-opening'); s = E.deserialize(E.serialize(s));
  assert.equal(s.openingRerolls, 1); s = step(s, 'reroll-opening');
  assert.throws(() => step(s, 'reroll-opening'));
  assert.deepEqual(E.deserialize(E.serialize(s)).offer, s.offer);
});
test('六枚轮回道痕都保证对应流派进入开局签池，重抽后仍生效', () => {
  for (const trace of D.TRACES) {
    let s = E.createRun(100 + D.TRACES.indexOf(trace), trace.id);
    const paths = () => s.offer.map(id => D.TALENTS.find(t => t.id === id).path);
    assert.ok(paths().includes(trace.talentPath), trace.id);
    s = step(s, 'reroll-opening');
    assert.ok(paths().includes(trace.talentPath), `${trace.id} after reroll`);
    assert.equal(s.carriedTrace, trace.id);
  }
  assert.throws(() => E.createRun(1, 'not-a-trace'));
});
test('六枚道痕各有两次叙事回响，回响不直接增加战力或修为', () => {
  for (const [index, trace] of D.TRACES.entries()) {
    let s = enter(600 + index, 'balanced', trace.id);
    s = step(s, 'act', { kind: 'cultivate' });
    s = step(s, 'act', { kind: 'cultivate' });
    assert.equal(s.event.id, 'first-python');
    s = step(s, 'resolve', { choice: 'flee' });
    assert.deepEqual(s.event, { id: 'trace-echo', trace: trace.id });
    const before = { xp: s.xp, power: E.power(s), stats: E.stats(s) };
    s = step(s, 'resolve', { choice: 'remember' });
    assert.equal(s.flags.traceEchoSeen, true);
    assert.equal(s.xp, before.xp); assert.equal(E.power(s), before.power); assert.deepEqual(E.stats(s), before.stats);

    const complete = finish(700 + index, { trace: trace.id }).state;
    assert.equal(complete.phase, 'complete', trace.id);
    assert.equal(complete.flags.traceEchoSeen, true, `${trace.id}: echo`);
    assert.equal(complete.flags.traceResonanceSeen, true, `${trace.id}: resonance`);
    assert.ok(complete.log.some(entry => entry.title.includes(trace.echo.title)), `${trace.id}: echo log`);
    assert.ok(complete.log.some(entry => entry.title.includes(trace.resonance.title)), `${trace.id}: resonance log`);
  }
});
test('第二次普通行动必遇妖蟒，基础吞噬不依赖随机天命', () => {
  let s = enter(42); s = step(s, 'act', { kind: 'cultivate' }); s = step(s, 'act', { kind: 'hunt' });
  assert.equal(s.event.id, 'first-python');
  assert.equal(E.threat(s, D.ENEMIES.find(e => e.id === 'python')).label, '十死无生');
  assert.throws(() => step(s, 'resolve', { choice: 'fight' }));
  s = step(s, 'resolve', { choice: 'flee' }); assert.equal(s.flags.pythonSeen, true);
});
test('连续闭关在强制遭遇、修为圆满或寿元警戒前自动停止', () => {
  let s = enter(420);
  s = step(s, 'act', { kind: 'cultivate' });
  s = step(s, 'cultivate-to-ready');
  assert.equal(s.event.id, 'first-python');
  assert.equal(s.flags.pythonSeen, false);
  s = step(s, 'resolve', { choice: 'flee' });
  s = step(s, 'cultivate-to-ready');
  assert.ok(s.xp >= D.REALMS[0].threshold);
  assert.ok(E.canBreak(s));
  assert.ok(s.batchCultivations > 0);
  const risky = enter(421); risky.flags.pythonSeen = true; risky.age = E.maxAge(risky) - 1;
  assert.equal(E.canCultivateToReady(risky), false);
  assert.throws(() => step(risky, 'cultivate-to-ready'));
});
test('完整凡界可通关：旧敌、融合、妖王、五境印证与飞升', () => {
  const { state: s, turns } = finish(42);
  assert.equal(s.phase, 'complete'); assert.equal(s.realm, 9); assert.equal(s.mutations.length, 1); assert.equal(s.fusions.length, 1);
  assert.ok(s.revengePower >= 450); assert.ok(s.firstPower < 83); assert.ok(s.devours >= 1);
  assert.equal(s.talents.length, 12); assert.ok(turns < 140); assert.ok(s.advancedResolved >= 2); assert.equal(s.flags.bossSlain, true);
  assert.deepEqual(s.realmProofs.slice().sort((a,b)=>a-b), [4, 5, 6, 7, 8]); assert.equal(s.flags.ascended, true); assert.equal(s.tribulationStage, 3);
  assert.ok(s.log.some(l => l.title === '吞噬赤鳞妖蟒'));
  assert.ok(s.log.some(l => l.title === '能力融合')); assert.ok(s.log.some(l => l.title === '镇杀三眼妖王')); assert.ok(s.log.some(l => l.title === '飞升'));
});
test('先镇杀再炼遗蜕也可完成，不会产生另一条死路', () => {
  const s = finish(100, { kill: true, mutation: 'serpenteye' }).state;
  assert.equal(s.phase, 'complete'); assert.ok(s.devours >= 1); assert.deepEqual(s.mutations, ['serpenteye']); assert.equal(s.flags.bossSlain, true); assert.equal(s.flags.ascended, true);
});
test('每步保存并恢复，结果与不中断游玩一致', () => {
  for (const seed of [1, 17, 42, 333, 98765]) assert.deepEqual(finish(seed).state, finish(seed, { reload: true }).state);
});
test('三种异变都真实改变计算，不重复领奖', () => {
  for (const mutation of D.MUTATIONS) {
    const s = finish(14, { mutation: mutation.id }).state;
    const without = clone(s); without.mutations = [];
    const key = Object.keys(mutation.effects)[0];
    assert.ok((E.effects(s)[key] || 0) > (E.effects(without)[key] || 0));
    assert.throws(() => step(s, 'mutate', { id: mutation.id }));
    assert.throws(() => step(s, 'mutate', { id: mutation.id }));
  }
});
test('旧 revision 不能再次领奖，reducer 不污染输入', () => {
  const s = E.createRun(4), raw = E.serialize(s);
  const next = E.transition(s, { type: 'select', id: s.offer[0], revision: s.revision });
  assert.equal(E.serialize(s), raw);
  assert.throws(() => E.transition(next, { type: 'select', id: next.offer[1], revision: s.revision }));
});
test('战力判定所有边界与碾压必胜', () => {
  const s = enter(2), p = E.power(s);
  for (const [ratio, label] of [[.54, '十死无生'], [.55, '凶险'], [.85, '势均力敌'], [1.2, '优势'], [2, '碾压'], [3, '蝼蚁']]) {
    const t = E.threat(s, { power: p / ratio }); assert.equal(t.label, label);
    if (ratio >= 2) assert.equal(t.chance, 1);
  }
});
test('碾压不随机败北，不损失元气', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = enter(seed); s.realm = 1; s.flags.pythonSeen = true; s.event = { id: 'hunt', enemy: 'worm' };
    const next = step(s, 'resolve', { choice: 'devour' });
    assert.equal(next.vitality, 100); assert.equal(next.devours, 1); assert.ok(next.xp > 0);
  }
});
test('重伤玩家仍可避战并闭关疗伤', () => {
  let s = enter(7); s.flags.pythonSeen = true; s.vitality = 5; s.event = { id: 'hunt', enemy: 'rogue' };
  assert.throws(() => step(s, 'resolve', { choice: 'fight' }));
  s = step(s, 'resolve', { choice: 'flee' }); s = step(s, 'act', { kind: 'cultivate' });
  assert.ok(s.vitality > 5); assert.equal(s.phase, 'playing');
});
test('寿尽会结束，保命天赋不能抵消寿尽', () => {
  const s = enter(8); s.flags.pythonSeen = true; s.talents.push('rebirth'); s.talents = [...new Set(s.talents)]; s.age = E.maxAge(s) - 1;
  const result = step(s, 'act', { kind: 'cultivate' }); assert.equal(result.phase, 'dead'); assert.equal(result.ending, '坐化');
  assert.throws(() => step(result, 'act', { kind: 'cultivate' }));
});
test('保命天赋在破阵濒死时仅触发一次', () => {
  let s = enter(8); s.talents = [...new Set([...s.talents, 'rebirth'])]; s.vitality = 1; s.event = { id: 'ruin' };
  s = step(s, 'resolve', { choice: 'force' }); assert.equal(s.rebirthUsed, 1); assert.equal(s.vitality, 40);
  s.vitality = 1; s.event = { id: 'ruin' }; s = step(s, 'resolve', { choice: 'force' }); assert.equal(s.phase, 'dead');
});
test('神识改变洞府收益，剑诀激活条件战力', () => {
  const a = enter(6); a.stats = { bone: 5, insight: 5, luck: 9, mind: 1 }; a.event = { id: 'ruin' };
  const b = clone(a); b.stats = { bone: 5, insight: 5, luck: 1, mind: 9 };
  assert.ok(step(b, 'resolve', { choice: 'probe' }).xp > step(a, 'resolve', { choice: 'probe' }).xp);
  const c = enter(10); c.talents = [...new Set([...c.talents, 'swordbone'])];
  const before = E.power(c); c.sword = true; assert.ok(E.power(c) > before * 1.4);
});
test('两种隐藏共鸣都有额外效果', () => {
  const s = enter(5); s.root = 'thunder'; s.sword = true; s.talents = ['swordbone', 'taotie', 'stomach']; s.fusions = [];
  assert.equal(E.synergies(s).length, 2); assert.ok(E.effects(s).power >= .35); assert.ok(E.effects(s).devour > 1.3);
});
test('金丹融合签池来自本局 Build，且融合真实改变数值', () => {
  let s = finish(77, { mutation: 'serpenteye' }).state;
  assert.equal(s.phase, 'complete'); assert.equal(s.fusions.length, 1); assert.equal(s.flags.ascended, true);
  const without = clone(s); without.fusions = [];
  assert.ok(E.power(s) > E.power(without) || E.stats(s).mind > E.stats(without).mind);
  const pre = enter(77); pre.realm = 2; pre.flags.pythonSeen = true; pre.flags.pythonSlain = true; pre.mutations = ['serpenteye']; pre.talents = [...new Set([...pre.talents, 'swordbone'])]; pre.sword = true; pre.root = 'thunder';
  const ids = E.availableFusions(pre).map(f => f.id);
  assert.ok(ids.includes('abyss-eye')); assert.ok(ids.includes('thunder-sword'));
});
test('高级事件会根据 Build 暴露不同选项', () => {
  const a = enter(91); a.realm = 2; a.flags.pythonSeen = true; a.flags.pythonSlain = true; a.mutations = ['serpenteye']; a.stats.mind = 10; a.stats.bone = 1; a.stats.insight = 4; a.stats.luck = 5;
  const options = E.advancedChoices(a, 'sealed-cave').map(x => x.id);
  assert.ok(options.includes('probe'));
  const b = clone(a); b.stats.mind = 1; b.stats.bone = 10;
  const other = E.advancedChoices(b, 'sealed-cave').map(x => x.id);
  assert.ok(!other.includes('probe')); assert.ok(other.includes('force'));
});
test('三眼妖王存在 Build 专属破局路线', () => {
  const s = enter(31); s.realm = 3; s.flags.pythonSeen = true; s.flags.pythonSlain = true; s.mutations = ['serpenteye']; s.fusions = ['abyss-eye']; s.stats.mind = 10;
  const routes = E.bossChoices(s).map(x => x.id);
  assert.ok(routes.includes('see-through')); assert.ok(routes.includes('fight'));
});
test('v1 赤鳞结算存档可迁移为 v4 并继续完整凡界', () => {
  const legacy = finish(12).state;
  legacy.version = 1; legacy.realm = 2; legacy.phase = 'complete'; legacy.flags = { pythonSeen: true, pythonSlain: true, swordEvent: false }; legacy.fusions = undefined; legacy.fusionOffer = undefined; legacy.advancedSeen = undefined; legacy.advancedResolved = undefined;
  legacy.highSeen = undefined; legacy.realmProofs = undefined; legacy.tribulationStage = undefined; legacy.tribulationBase = undefined; legacy.ascendedPower = undefined;
  const migrated = E.deserialize(JSON.stringify(legacy));
  assert.equal(migrated.version, 4); assert.equal(migrated.phase, 'playing'); assert.equal(migrated.realm, 2); assert.deepEqual(migrated.fusions, []); assert.deepEqual(migrated.realmProofs, []); assert.equal(migrated.carriedTrace, null);
});
test('v2 金丹结算存档可迁移为 v4 并继续元婴', () => {
  const legacy = finish(18).state;
  legacy.version = 2; legacy.realm = 3; legacy.phase = 'complete'; legacy.ending = '金丹初成'; legacy.flags = { pythonSeen: true, pythonSlain: true, swordEvent: true, bossSeen: true, bossSlain: true };
  delete legacy.highSeen; delete legacy.realmProofs; delete legacy.tribulationStage; delete legacy.tribulationBase; delete legacy.ascendedPower;
  const migrated = E.deserialize(JSON.stringify(legacy));
  assert.equal(migrated.version, 4); assert.equal(migrated.realm, 3); assert.equal(migrated.phase, 'playing'); assert.equal(migrated.flags.bossSlain, true); assert.equal(migrated.flags.ascended, false);
});
test('v3 完整凡界存档迁移后保留结局，并补齐轮回字段', () => {
  const legacy = finish(19).state;
  legacy.version = 3;
  delete legacy.carriedTrace; delete legacy.bossRoute; delete legacy.tribulationRoutes; delete legacy.batchCultivations;
  const migrated = E.deserialize(JSON.stringify(legacy));
  assert.equal(migrated.version, 4); assert.equal(migrated.phase, 'complete'); assert.equal(migrated.flags.ascended, true);
  assert.deepEqual(migrated.tribulationRoutes, ['legacy', 'legacy', 'legacy']); assert.equal(migrated.batchCultivations, 0);
});
test('每个高境界至少需要一次天地印证才能破境', () => {
  const finished = finish(33).state, s = clone(finished);
  s.phase = 'playing'; s.realm = 4; s.flags.ascended = false; s.ending = null; s.event = { id: 'quiet' }; s.xp = D.REALMS[4].threshold; s.tribulationStage = 0; s.tribulationBase = null; s.ascendedPower = null; s.realmProofs = s.realmProofs.filter(r => r !== 4);
  assert.equal(E.canBreak(s), false); s.realmProofs.push(4); assert.equal(E.canBreak(s), true);
});
test('渡劫分三段，本世融合路线可以稳定承劫', () => {
  let s = finish(44).state;
  s.phase = 'tribulation'; s.flags.ascended = false; s.ending = null; s.realm = 9; s.tribulationStage = 0; s.tribulationBase = E.power(s); s.ascendedPower = null; s.tribulationRoutes = [];
  for (let i = 0; i < 3; i++) {
    assert.ok(E.tribulationChoices(s).options.some(x => x.id === 'fusion'));
    s = step(s, 'tribulation-step', { id: 'fusion' });
  }
  assert.equal(s.phase, 'complete'); assert.equal(s.flags.ascended, true); assert.equal(s.tribulationStage, 3);
});
test('继承道痕只在对应天劫增加路线，成功后记录实际选择', () => {
  let s = finish(45, { trace: 'soul' }).state;
  s.phase = 'tribulation'; s.flags.ascended = false; s.ending = null; s.realm = 9; s.tribulationStage = 0; s.tribulationBase = E.power(s); s.ascendedPower = null; s.tribulationRoutes = [];
  assert.ok(!E.tribulationChoices(s).options.some(option => option.id === 'trace-soul'));
  s = step(s, 'tribulation-step', { id: 'fusion' });
  assert.ok(E.tribulationChoices(s).options.some(option => option.id === 'trace-soul'));
  s = step(s, 'tribulation-step', { id: 'trace-soul' });
  assert.equal(s.tribulationRoutes[1], 'trace-soul');
});
test('拒绝损坏、未知版本、无效阶段与越界存档', () => {
  assert.throws(() => E.deserialize('broken'));
  const original = enter(99);
  for (const modify of [s => s.version = 99, s => s.phase = 'infinite', s => s.realm = 12, s => s.stats.bone = -1, s => s.vitality = 999, s => s.rng = 0, s => s.talents.push('not-exist'), s => s.event = { id: 'unknown' }, s => s.event = { id: 'trace-echo' }, s => s.root = 'missing', s => s.log = null]) {
    const s = clone(original); modify(s); assert.throws(() => E.deserialize(JSON.stringify(s)));
  }
  assert.throws(() => E.deserialize(' '.repeat(200001)));
});
test('天赋 effects 都属于已实现的数值字段', () => {
  const implemented = new Set(['bone', 'insight', 'luck', 'mind', 'devour', 'beastPower', 'bossPower', 'guard', 'cultivate', 'swordPower', 'rest', 'lifespan', 'power', 'xp', 'devourHeal', 'explore', 'breakPower', 'redraw', 'ageCost', 'extraLife']);
  for (const item of [...D.TALENTS, ...D.ROOTS, ...D.ORIGINS, ...D.MUTATIONS, ...D.FUSIONS]) for (const key of Object.keys(item.effects)) assert.ok(implemented.has(key), `${item.id}: ${key}`);
});
test('200 个种子 × 四种推荐加点：完整凡界保守路线可飞升且没有死锁', () => {
  let totalTurns = 0, minTurns = Infinity, maxTurns = 0;
  for (let seed = 1; seed <= 200; seed++) for (const preset of ['balanced', 'body', 'sage', 'lucky']) {
    const { state: s, turns } = finish(seed, { preset, pickIndex: seed % 3 });
    assert.equal(s.phase, 'complete', `seed=${seed}, preset=${preset}, age=${s.age}, realm=${s.realm}`);
    assert.ok(s.firstPower < 83, `Opening must be weaker: seed=${seed}, power=${s.firstPower}`);
    assert.ok(s.revengePower >= 450); assert.equal(s.realm, 9); assert.equal(s.flags.bossSlain, true); assert.equal(s.flags.ascended, true); assert.deepEqual(s.realmProofs.slice().sort((a,b)=>a-b), [4,5,6,7,8]); totalTurns += turns; minTurns = Math.min(minTurns, turns); maxTurns = Math.max(maxTurns, turns);
  }
  console.log(JSON.stringify({ simulations: 800, minTransitions: minTurns, maxTransitions: maxTurns, meanTransitions: totalTurns / 800 }));
});
