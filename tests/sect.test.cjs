'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../src/sect.js');
const E = require('../src/engine.js');
const B = require('../src/build.js');

const clone = value => JSON.parse(JSON.stringify(value));

function mortalPlaying(seed=606) {
  let s=E.createRun(seed);
  for(const id of s.offer.slice(0,3)) s=E.transition(s,{type:'select',id,revision:s.revision});
  s=E.transition(s,{type:'confirm-talents',revision:s.revision});
  s=E.transition(s,{type:'preset',id:'balanced',revision:s.revision});
  s=E.transition(s,{type:'enter',revision:s.revision});
  // A compact valid炼气 fixture for sect reducer tests. The engine does not
  // require historical logs to infer a realm; it only validates current facts.
  s.realm=1; s.xp=0; s.flags.pythonSeen=true; s.event={id:'quiet',title:'山门在望',text:'炼气之后，各宗开始正式收徒。'};
  E.validate(s); return s;
}

test('四个宗门都只有轻量被动、传承、三节成长事件与一个大事件', () => {
  assert.equal(X.SECTS.length,4); assert.equal(X.MAJOR_CHOICES.length,3);
  assert.deepEqual(X.MAJOR_CHOICES.map(x=>x.id),['protect','leave','betray']);
  for(const sect of X.SECTS){
    assert.equal(sect.events.length,4,sect.id);
    assert.equal(sect.events.filter(x=>x.major).length,1,sect.id);
    assert.deepEqual(sect.events.map(x=>x.minRealm),[1,3,5,7],sect.id);
    assert.ok(Object.keys(sect.passive).length>=1&&Object.keys(sect.heritage).length>=1,sect.id);
    assert.equal('currency' in sect,false); assert.equal('positions' in sect,false);
  }
});

test('谢绝不会锁死路线；入宗后首事件解锁传承且不修改输入', () => {
  const empty=X.createState(), raw=JSON.stringify(empty);
  const declined=X.decline(empty,'qingyun',1); assert.equal(JSON.stringify(empty),raw); assert.deepEqual(declined.declined,['qingyun']);
  const joined=X.join(declined,'qingyun',1); assert.equal(joined.membership,'qingyun'); assert.equal(joined.pending,'qingyun-init');
  const before=JSON.stringify(joined), result=X.resolve(joined,'edge',1);
  assert.equal(JSON.stringify(joined),before); assert.equal(result.state.heritageUnlocked,true); assert.ok(result.state.completed.includes('qingyun-init'));
  assert.equal(result.state.pending,null); assert.ok((X.effects(result.state).swordPower||0)>0); assert.ok((X.effects(result.state).bossPower||0)>0);
});

test('宗门事件严格按境界顺序一次性推进，刷新式复制不会重复事件', () => {
  let s=X.join(X.createState(),'tianji',1);
  s=X.resolve(s,'compare',1).state; assert.equal(s.pending,null);
  s=X.observe(s,{realm:1},{realm:3,phase:'playing',secretRealm:{active:null}}); assert.equal(s.pending,'tianji-core');
  const copyAtCore=clone(s); assert.deepEqual(X.observe(copyAtCore,{realm:3},{realm:3,phase:'playing',secretRealm:{active:null}}),copyAtCore);
  s=X.resolve(s,'trace',3).state;
  s=X.observe(s,{realm:3},{realm:5,phase:'playing',secretRealm:{active:null}}); assert.equal(s.pending,'tianji-sky');
  s=X.resolve(s,'reveal',5).state;
  s=X.observe(s,{realm:5},{realm:7,phase:'playing',secretRealm:{active:null}}); assert.equal(s.pending,'tianji-major');
  assert.equal(new Set(s.completed).size,s.completed.length);
});

test('宗门大事件的护宗、离宗、叛宗三种结果边界明确', () => {
  function major(outcome){
    let s=X.join(X.createState(),'wanling',7);
    s=X.resolve(s,'discern',7).state;
    s=X.resolve(s,'layers',7).state;
    s=X.resolve(s,'open',7).state;
    assert.equal(s.pending,'wanling-major');
    return X.resolve(s,outcome,7).state;
  }
  const protectedState=major('protect'); assert.equal(protectedState.membership,'wanling'); assert.equal(protectedState.majorOutcomes[0].outcome,'protect'); assert.ok((X.effects(protectedState).explore||0)>.01);
  const left=major('leave'); assert.equal(left.membership,null); assert.deepEqual(X.effects(left),{});
  const betrayed=major('betray'); assert.equal(betrayed.membership,null); assert.throws(()=>X.join(betrayed,'wanling',7),/不能重新拜入/);
});

test('宗门是Build真实来源，离宗后来源与协同即时重算', () => {
  const base=mortalPlaying(607), without=B.evaluateBuild(base);
  let withSect=clone(base); withSect.sect=X.join(withSect.sect,'qingyun',1); withSect.sect=X.resolve(withSect.sect,'edge',1).state; E.validate(withSect);
  const built=B.evaluateBuild(withSect); assert.ok(built.sources.some(src=>src.source==='sect:qingyun'));
  const left=clone(withSect); left.sect=X.leave(left.sect,1); E.validate(left);
  assert.equal(B.evaluateBuild(left).sources.some(src=>src.source==='sect:qingyun'),false);
  assert.ok(built.sources.length>without.sources.length);
});

test('宗门动作进入主reducer，revision、奖励与刷新保存都可验证', () => {
  let s=mortalPlaying(608), raw=JSON.stringify(s);
  const joined=E.transition(s,{type:'sect-join',id:'tianji',revision:s.revision}); assert.equal(JSON.stringify(s),raw); assert.equal(joined.sect.membership,'tianji'); assert.equal(joined.sect.pending,'tianji-init');
  const xp=joined.xp, resolved=E.transition(joined,{type:'sect-resolve',id:'compare',revision:joined.revision});
  assert.ok(resolved.xp>xp); assert.equal(resolved.sect.heritageUnlocked,true); assert.notEqual(String(resolved.revision),String(joined.revision));
  const restored=E.deserialize(E.serialize(resolved)); assert.deepEqual(restored,resolved);
  const left=E.transition(restored,{type:'sect-leave',revision:restored.revision}); assert.equal(left.sect.membership,null); assert.deepEqual(X.effects(left.sect),{});
});

test('旧v8存档迁移到当前版本仍只补空宗门态，不伪造入宗与事件历史', () => {
  const current=E.createRun(609), old=clone(current); old.version=8; delete old.sect; delete old.life;
  const migrated=E.deserialize(JSON.stringify(old)); assert.equal(migrated.version,E.VERSION); assert.deepEqual(migrated.sect,X.createState());
});
