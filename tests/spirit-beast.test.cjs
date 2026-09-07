'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Z=require('../src/spirit-beast.js');
const E=require('../src/engine.js');
const B=require('../src/build.js');

function entered(seed=8101){
  let s=E.createRun(seed);
  for(const id of s.offer.slice(0,3)) s=E.transition(s,{type:'select',id});
  s=E.transition(s,{type:'confirm-talents'}); s=E.transition(s,{type:'preset',id:'balanced'}); return E.transition(s,{type:'enter'});
}

test('四种初始灵兽各有两条不可逆分支且只有一个主灵兽位',()=>{
  assert.equal(Z.SPECIES.length,4); for(const species of Z.SPECIES) assert.deepEqual(Object.keys(species.branches),['wild','sacred']);
  const state=Z.bond(Z.createState(),'moonfox'); assert.equal(state.companion.species,'moonfox'); assert.throws(()=>Z.bond(state,'stoneape'));
});

test('幼体到仙兽五阶段消费固定材料，分支一旦选择不可逆',()=>{
  let s=Z.bond(Z.createState(),'thundercrane'); s=Z.addEssence(s,30,'fixture');
  let check=Z.canEvolve(s,{realm:1}); assert.equal(check.ok,true); s=Z.evolve(s,{realm:1}); assert.equal(s.companion.stage,1);
  check=Z.canEvolve(s,{realm:2}); assert.equal(check.needsBranch,true); assert.equal(check.ok,false);
  s=Z.evolve(s,{realm:2},'wild'); assert.equal(s.companion.branch,'wild'); assert.equal(s.companion.stage,2);
  s=Z.evolve(s,{realm:4}); assert.equal(s.companion.stage,3); assert.equal(s.companion.branch,'wild');
  assert.equal(Z.canEvolve(s,{realm:9,ascended:true,immortal:false}).ok,false);
  s=Z.evolve(s,{realm:9,ascended:true,immortal:true}); assert.equal(s.companion.stage,4); assert.equal(s.companion.branch,'wild');
  assert.equal(s.essence,10); assert.throws(()=>Z.evolve(s,{realm:9,ascended:true,immortal:true},'sacred'));
});

test('灵兽精华只来自真实事件观察并保持99上限',()=>{
  let s=Z.bond(Z.createState(),'devourfish');
  s=Z.observe(s,{event:{id:'hunt'},xp:5,flags:{bossSlain:false},realmProofs:[],secretRealm:{history:[]},immortal:null},{xp:9,flags:{bossSlain:false},realmProofs:[],secretRealm:{history:[]},immortal:null},{type:'resolve'});
  assert.equal(s.essence,1);
  s=Z.observe(s,{event:null,xp:9,flags:{bossSlain:false},realmProofs:[],secretRealm:{history:[]},immortal:null},{xp:9,flags:{bossSlain:true},realmProofs:[],secretRealm:{history:[]},immortal:null},{type:'resolve'});
  assert.equal(s.essence,4);
  s=Z.addEssence(s,999,'cap'); assert.equal(s.essence,99); assert.ok(s.history.length<=12);
});

test('灵兽是可解释Build来源，阶段效果不依赖隐藏随机数',()=>{
  let s=entered(8102); s=E.transition(s,{type:'beast-bond',id:'stoneape',revision:s.revision});
  const before=JSON.stringify(s), sources=B.sources(s); assert.ok(sources.some(x=>x.source==='spirit-beast:stoneape')); assert.equal(JSON.stringify(s),before);
  assert.ok((Z.effects(s.spiritBeast).guard||0)>0);
});

test('主reducer保存结契，换世不继承；v10迁移只补空灵兽态',()=>{
  let s=entered(8103); s=E.transition(s,{type:'beast-bond',id:'moonfox',revision:s.revision});
  const restored=E.deserialize(E.serialize(s)); assert.equal(restored.spiritBeast.companion.species,'moonfox');
  assert.equal(E.createRun(8104).spiritBeast.companion,null);
  const old=JSON.parse(JSON.stringify(E.createRun(8105))); old.version=10; delete old.spiritBeast;
  const migrated=E.deserialize(JSON.stringify(old)); assert.equal(migrated.version,E.VERSION); assert.deepEqual(migrated.spiritBeast,Z.createState());
});
