'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../src/karma.js'),E=require('../src/engine.js');
const clone=v=>JSON.parse(JSON.stringify(v));

function entry(i,kind='secret'){return {kind,sourceKey:`fixture:${i}`,source:`来源 ${i}`,strength:2,createdRealm:2,trigger:{type:'realm',value:4},hint:'已知来源，不剧透结果。'};}

test('因果账本活跃不超过24、摘要不超过40且同一来源不重复',()=>{
  let s=K.createState(); for(let i=0;i<70;i++)s=K.add(s,entry(i));
  assert.equal(s.active.length,K.ACTIVE_LIMIT);assert.equal(s.summaries.length,K.SUMMARY_LIMIT);
  const raw=JSON.stringify(s),same=K.add(s,entry(69));assert.equal(JSON.stringify(same),raw);K.validate(same);
});

test('六类高价值来源都能登记且来源键可追溯',()=>{
  let s=K.createState();
  const before={realm:6,phase:'playing',sect:{majorOutcomes:[]},life:{majorOutcomes:[]},secretRealm:{history:[]},spiritBeast:{history:[]},flags:{bossSlain:false,ascended:false},immortal:null};
  const after=clone(before);after.sect.majorOutcomes=[{sect:'qingyun',outcome:'protect'}];after.life.majorOutcomes=[{origin:'herb',event:'herb-major',choice:'herb-save-home'}];after.secretRealm.history=[{realmId:'blackwind',firstClear:true}];after.spiritBeast.history=[{type:'evolve',species:'moonfox',stage:2,branch:'sacred'}];after.flags.bossSlain=true;after.flags.ascended=true;
  s=K.observe(s,before,after,{type:'fixture'});
  assert.equal(s.active.length,6);assert.deepEqual(new Set(s.active.map(x=>x.kind)),new Set(['sect-protect','life','secret','beast','boss','ascension']));
  assert.ok(s.active.every(x=>x.sourceKey&&x.source&&x.relation));K.validate(s);
});

test('延迟因果只在声明阶段进入待偿，飞升因果在第一卷结局触发',()=>{
  let s=K.add(K.createState(),entry(1));
  assert.equal(K.refresh(s,{realm:3,playable:true}).pending,null);
  s=K.refresh(s,{realm:4,playable:true});assert.equal(s.pending,'k0');
  let a=K.add(K.createState(),{kind:'ascension',sourceKey:'a',source:'飞升',strength:3,createdRealm:9,trigger:{type:'immortal'},hint:'飞升结局回应'});
  assert.equal(K.refresh(a,{realm:9,playable:true,ascended:false}).pending,null);
  assert.equal(K.refresh(a,{realm:9,playable:true,ascended:true}).pending,'k0');
});

test('因果结算只发生一次并保留来源、关系与选择摘要',()=>{
  let s=K.add(K.createState(),entry(2));s=K.refresh(s,{realm:4,playable:true});
  const event=K.eventFor(K.pendingEntry(s)),choice=event.choices[0];const r=K.resolve(s,choice.id,{realm:4,playable:true});
  assert.equal(r.state.active.length,0);assert.equal(r.state.pending,null);assert.equal(r.state.summaries.length,1);assert.equal(r.state.summaries[0].sourceKey,'fixture:2');assert.equal(r.state.summaries[0].outcome,choice.name);
  assert.throws(()=>K.resolve(r.state,choice.id,{realm:4,playable:true}),/没有待偿因果/);
});

test('主reducer能结算待偿因果、保存摘要且不重复领奖',()=>{
  let s=E.createRun(10101);for(const id of s.offer.slice(0,3))s=E.transition(s,{type:'select',id,revision:s.revision});s=E.transition(s,{type:'confirm-talents',revision:s.revision});s=E.transition(s,{type:'preset',id:'balanced',revision:s.revision});s=E.transition(s,{type:'enter',revision:s.revision});
  s.realm=5;s.flags.pythonSeen=true;s.flags.pythonSlain=true;s.flags.bossSeen=true;s.flags.bossSlain=true;s.mutations=['redscale'];s.fusions=['flame-scale'];s.event={id:'quiet',title:'因果测试',text:'一段合法高境界状态。'};
  s.karma=K.add(s.karma,{kind:'boss',sourceKey:'boss:fixture',source:'妖王 · 测试',strength:3,createdRealm:3,trigger:{type:'realm',value:5},hint:'余烬待偿'});s.karma=K.refresh(s.karma,{realm:5,playable:true});E.validate(s);
  const xp=s.xp,id=K.eventFor(K.pendingEntry(s.karma)).choices[0].id,n=E.transition(s,{type:'karma-resolve',id,revision:s.revision});
  assert.ok(n.xp>xp);assert.equal(n.karma.active.length,0);assert.equal(n.karma.summaries.length,1);assert.deepEqual(E.deserialize(E.serialize(n)),n);assert.throws(()=>E.transition(n,{type:'karma-resolve',id,revision:n.revision}));
});

test('v12旧档只补空因果账本，不从旧日志伪造历史',()=>{
  const old=clone(E.createRun(10102));old.version=12;delete old.karma;const n=E.deserialize(JSON.stringify(old));assert.equal(n.version,E.VERSION);assert.deepEqual(n.karma,K.createState());
});
