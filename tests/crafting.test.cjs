'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../src/crafting.js');
const E=require('../src/engine.js');
const G=require('../src/equipment.js');
const B=require('../src/build.js');

function rich(){let s=K.createState();for(const m of K.MATERIALS)s=K.grantMaterial(s,m.id,20,'fixture');return s;}
function entered(seed=9101){let s=E.createRun(seed);for(const id of s.offer.slice(0,3))s=E.transition(s,{type:'select',id});s=E.transition(s,{type:'confirm-talents'});s=E.transition(s,{type:'preset',id:'balanced'});return E.transition(s,{type:'enter'});}

test('丹器首版固定为10丹方、8材料、3炼法、4本命炼器配方',()=>{
  assert.equal(K.PILLS.length,10);assert.equal(K.MATERIALS.length,8);assert.equal(K.METHODS.length,3);assert.equal(K.WEAPON_RECIPES.length,4);
  for(const recipe of [...K.PILLS,...K.WEAPON_RECIPES]){assert.ok(Object.keys(recipe.needs).length>=2);for(const id of Object.keys(recipe.needs))assert.ok(K.MATERIAL_BY_ID[id]);}
});

test('同seed同炼制序号与同手法得到完全一致的成丹与异丹结果',()=>{
  const a=K.craftPill(rich(),123456,'qi','dao'),b=K.craftPill(rich(),123456,'qi','dao');assert.deepEqual(a,b);
  assert.equal(a.state.craftIndex,1);assert.equal(a.state.pills.qi.length,1);assert.equal(a.state.pills.qi[0],a.variant);
});

test('丹方真实消费材料；普通丹与异丹逐枚保存，不会串位',()=>{
  let s=rich();const before={...s.materials};let a=K.craftPill(s,1,'spring','gentle');s=a.state;let b=K.craftPill(s,1,'spring','dao');s=b.state;
  assert.equal(s.materials['spirit-herb'],before['spirit-herb']-2);assert.equal(s.materials['beast-bone'],before['beast-bone']-2);
  const top=s.pills.spring.at(-1),used=K.usePill(s,'spring');assert.equal(used.reward.variant,top);assert.equal(used.state.pills.spring.length,1);
});

test('临时Build丹效有界且只在真实效果行动后扣次数',()=>{
  let s=rich();s=K.craftPill(s,77,'mind','gentle').state;s=K.usePill(s,'mind').state;assert.equal(s.buff.charges,2);assert.ok(K.buildSource(s));
  const untouched=K.afterAction(s,{type:'beast-bond'});assert.equal(untouched.buff.charges,2);
  const once=K.afterAction(s,{type:'act'});assert.equal(once.buff.charges,1);const done=K.afterAction(once,{type:'resolve'});assert.equal(done.buff,null);
});

test('炼器只服务已穿戴本命兵器并真实增加现有神兵历练',()=>{
  let s=entered(9102);s.equipment=G.addDrop(s.equipment,s.seed,'boss:craft-fixture','boss',3,'sword-break');const uid=s.equipment.inventory[0].uid;s.equipment=G.identify(s.equipment,uid);s.equipment=G.equip(s.equipment,uid);s.crafting=rich();E.validate(s);
  const before=s.equipment.inventory[0].xp,after=E.transition(s,{type:'craft-weapon',id:'sword-temper',revision:s.revision});assert.equal(after.equipment.inventory[0].xp,before+65);assert.ok(after.crafting.materials['thunder-sand']<s.crafting.materials['thunder-sand']);
  assert.throws(()=>E.transition(after,{type:'craft-weapon',id:'devour-inscribe',revision:after.revision}));
});

test('主reducer炼丹服丹、Build来源、刷新恢复与v11迁移均可验证',()=>{
  let s=entered(9103);s.crafting=rich();E.validate(s);s=E.transition(s,{type:'craft-pill',id:'mind',kind:'dao',revision:s.revision});assert.equal(s.crafting.pills.mind.length,1);
  s=E.transition(s,{type:'craft-use',id:'mind',revision:s.revision});assert.ok(s.crafting.buff);assert.ok(B.sources(s).some(x=>x.source==='crafting:mind'));assert.deepEqual(E.deserialize(E.serialize(s)),s);
  const old=JSON.parse(JSON.stringify(E.createRun(9104)));old.version=11;delete old.crafting;const migrated=E.deserialize(JSON.stringify(old));assert.equal(migrated.version,E.VERSION);assert.deepEqual(migrated.crafting,K.createState());
});
