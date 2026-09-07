'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/presentation.js');

const base = () => ({ realm: 2, xp: 100, vitality: 60, devours: 1, mutations: [], fusions: [], tribulationRoutes: [], flags: { ascended: false } });

test('品质令牌统一覆盖五级且稀有度映射安全夹取', () => {
  assert.deepEqual(Object.keys(P.QUALITY), ['common','refined','rare','epic','mythic']);
  assert.equal(P.qualityFromRarity(-9).id, 'common');
  assert.equal(P.qualityFromRarity(2).id, 'rare');
  assert.equal(P.qualityFromRarity(99).id, 'mythic');
});

test('奖励反馈只读取前后状态，不消费随机数也不改存档', () => {
  const before = base(), after = { ...base(), xp: 145, vitality: 75, devours: 2 };
  const raw = JSON.stringify([before, after]);
  const result = P.feedback(before, after, { type: 'resolve' });
  assert.deepEqual(result.rewards.map(x => x.id), ['xp','devour','vitality']);
  assert.equal(JSON.stringify([before, after]), raw);
});

test('突破、异变、融合、雷劫和飞升共享不可叠加重大事件规格', () => {
  let before = base(), after = { ...base(), realm: 3, phase: 'draft' };
  assert.equal(P.major(before, after, { type: 'breakthrough' }).kind, 'breakthrough');
  assert.equal(P.major(before, { ...before, mutations:['redscale'] }, { type:'mutate' }).kind, 'mutation');
  assert.equal(P.major(before, { ...before, fusions:['flame-scale'] }, { type:'pick-fusion' }).kind, 'fusion');
  assert.equal(P.major(before, { ...before, tribulationRoutes:['fusion'] }, { type:'tribulation-step' }).kind, 'thunder');
  assert.equal(P.major(before, { ...before, flags:{ascended:true} }, { type:'tribulation-step' }).kind, 'ascension');
});

test('表现反馈允许补全显示名但不污染原事件对象', () => {
  const feedback = { rewards: [], major: { kind:'fusion', title:'能力融合', subtitle:'x' } };
  const result = P.enrich(feedback, { fusion:'雷剑体' });
  assert.equal(result.major.title, '雷剑体');
  assert.equal(feedback.major.title, '能力融合');
});
