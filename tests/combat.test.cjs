'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/combat.js');
const E = require('../src/engine.js');

const clone = value => JSON.parse(JSON.stringify(value));

function enter(seed = 42) {
  let s = E.createRun(seed);
  for (const id of s.offer.slice(0,3)) s = E.transition(s,{type:'select',id});
  s = E.transition(s,{type:'confirm-talents'});
  s = E.transition(s,{type:'preset',id:'balanced'});
  return E.transition(s,{type:'enter'});
}

test('战斗解析是纯函数，同输入得到同一结果与同一回放', () => {
  const input={enemy:{id:'wolf',name:'独眼山狼',power:100},playerPower:120,action:'fight',chance:.63,roll:.42,damageWin:18,damageLose:45,reward:27,route:'剑理归一'};
  const raw=JSON.stringify(input), a=C.resolveCombat(input), b=C.resolveCombat(input);
  assert.deepEqual(a,b); assert.equal(JSON.stringify(input),raw);
  assert.equal(a.result.win,true); assert.ok(a.replayEvents.some(x=>x.type==='trigger'));
  assert.ok(a.replayEvents.some(x=>x.type==='victory')); assert.ok(a.replayEvents.some(x=>x.type==='drop'));
});

test('R≥2 必胜且无伤，不受传入 roll 影响', () => {
  for (const roll of [0,.5,.999999]) {
    const out=C.resolveCombat({enemy:{id:'rat',name:'食气鼠妖',power:100},playerPower:200,action:'devour',chance:.01,roll,damageWin:99,damageLose:99,reward:40});
    assert.equal(out.result.win,true); assert.equal(out.result.damage,0); assert.equal(out.stateDelta.vitality,0);
    assert.ok(out.replayEvents.some(x=>x.type==='crit')); assert.ok(out.replayEvents.some(x=>x.type==='devour'));
  }
});

test('失败回放有反击与败退，事件数量有界且验证器拒绝损坏输入', () => {
  const out=C.resolveCombat({enemy:{id:'boss',name:'试炼妖王',power:200},playerPower:150,action:'boss',chance:.2,roll:.9,damageWin:0,damageLose:42,reward:0});
  const replay=C.createReplay(out,'fixture-boss',{enemy:'试炼妖王'});
  assert.equal(out.result.win,false); assert.equal(out.result.damage,42); assert.ok(replay.events.some(x=>x.type==='enemy-hit')); assert.ok(replay.events.some(x=>x.type==='defeat'));
  assert.ok(replay.events.length<=10); assert.equal(C.validateReplay(replay),true);
  const bad=clone(replay); bad.events.push(...Array(11).fill({type:'victory',text:'x',tone:'gold'}));
  assert.throws(()=>C.validateReplay(bad));
});

test('主 reducer 一次结算战斗并保存固定回放，刷新不会重新领奖', () => {
  let s=enter(88); s.flags.pythonSeen=true; s.event={id:'hunt',enemy:'worm'}; E.validate(s);
  const before=JSON.stringify(s), fought=E.transition(s,{type:'resolve',choice:'fight',revision:s.revision});
  assert.equal(JSON.stringify(s),before); assert.ok(fought.combatReplay); assert.equal(fought.combatReplay.enemy,'食气灵虫');
  const serialized=E.serialize(fought), restored=E.deserialize(serialized);
  assert.deepEqual(restored.combatReplay,fought.combatReplay); assert.equal(restored.xp,fought.xp); assert.equal(restored.rng,fought.rng);
  const next=E.transition(restored,{type:'act',kind:'cultivate',revision:restored.revision});
  assert.equal(next.combatReplay,null);
});

test('旧 v6 存档迁移到 v7 只补空战斗回放，不伪造历史战斗', () => {
  const current=E.createRun(99), old=clone(current); old.version=6; delete old.combatReplay;
  const migrated=E.deserialize(JSON.stringify(old));
  assert.equal(migrated.version,7); assert.equal(migrated.combatReplay,null);
});
