'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/audio.js');
test('四层环境声由境界映射，首页不会泄漏终局声境', () => {
  assert.equal(Object.keys(A.BANDS).length, 4);
  for (const [realm, band] of [[0,'mortal'],[2,'mortal'],[3,'cloud'],[5,'cloud'],[6,'void'],[8,'void'],[9,'tribulation']]) assert.equal(A.bandFor({ realm }), band);
  assert.equal(A.bandFor({ realm: 9 }, true), 'mortal');
});
test('九类关键反馈与普通操作分离，播放映射不修改状态', () => {
  const before = { realm: 2, devours: 1, flags: { ascended: false } }, after = { ...before, devours: 2 };
  const raw = JSON.stringify([before, after]);
  assert.equal(Object.keys(A.CUES).length, 9);
  assert.equal(A.cueFor(before, after, { type: 'resolve' }), 'devour');
  assert.equal(A.cueFor(before, before, { type: 'act' }), null);
  assert.equal(A.cueFor(before, { flags: { ascended: true } }, { type: 'tribulation-step' }), 'ascension');
  assert.equal(JSON.stringify([before, after]), raw);
});
test('声音设置安全夹取；无音频设备时仍可运行且不会自动创建播放器', () => {
  assert.equal(A.normalize({ volume: 9 }).volume, .8);
  assert.equal(A.normalize({ volume: -1 }).volume, 0);
  assert.equal(A.normalize({ volume: NaN }).volume, .28);
  const audio = A.create();
  assert.equal(audio.diagnostics().state, 'locked'); assert.equal(audio.diagnostics().unlocked, false);
  assert.equal(audio.cue('ascension'), false);
  audio.scene({ realm: 9 }); assert.equal(audio.diagnostics().band, 'tribulation');
  audio.update({ music: false, effects: false }); assert.equal(audio.diagnostics().state, 'locked');
});
