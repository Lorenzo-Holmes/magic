'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const W=require('../src/world.js'),A=require('../src/dao.js'),E=require('../src/engine.js'),M=require('../src/meta.js');
const {simulate}=require('../tools/simulation-policy.cjs'),{campaign}=require('../tools/evolution-policy.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
let cached;
test('浏览器脚本先加载quantity/evolution再加载world，避免第三卷Bridge依赖未定义',()=>{
  const html=fs.readFileSync('index.html','utf8'),quantity=html.indexOf('./src/quantity.js'),evolution=html.indexOf('./src/evolution.js'),world=html.indexOf('./src/world.js');
  assert.ok(quantity>=0&&evolution>quantity&&world>evolution);
});
test('六条主脉完成仙界后都能带着真实大道创世并归卷',()=>{
  for(const path of ['devour','sword','body','soul','fortune','insight']){
    let s=campaign(simulate(230001,path,{trace:path}).state,path).state;
    s=E.transition(s,{type:'dao-form'});s=E.transition(s,{type:'world-create',config:W.defaults()});
    for(let i=0;i<3;i++)s=E.transition(s,{type:'world-resolve',id:W.event(s.world).choices[0].id});
    assert.equal(s.world.phase,'ending');assert.deepEqual(s.world.rules,s.dao.formed.rules);assert.ok(s.immortal.evolution.completed);
  }
});
function earned(){if(!cached){cached=campaign(simulate(220001,'insight').state,'insight').state;assert.ok(A.preview(cached.dao,cached).ready);cached=E.transition(cached,{type:'dao-form'});}return clone(cached);}
function create(config=W.defaults()){return E.transition(earned(),{type:'world-create',config});}
function immortalBridge(){const s=campaign(simulate(220002,'soul').state,'soul').state;return M.observe(M.createMeta(),s).storyProgress.lastImmortalBridge;}
function third(config=W.defaults()){return E.transition(E.createDaoRun(immortalBridge()),{type:'world-create',config});}
test('仙界正式结局Bridge可独立启动第三卷，不携带第二卷资源或无尽层数',()=>{
  const bridge=immortalBridge(),shell=E.createDaoRun(bridge);assert.equal(shell.storyOrigin.chapter,'dao');assert.equal(shell.immortal,null);assert.equal(shell.world,null);assert.equal(shell.equipment.inventory.length,0);assert.ok(W.canCreate(shell));
  const s=E.transition(shell,{type:'world-create',config:W.defaults()});assert.equal(s.world.projection.type,'bridge');assert.equal(s.world.story.cursor,0);assert.equal(W.event(s.world).title,'第一位感灵者');assert.deepEqual(E.deserialize(E.serialize(s)),s);
});
test('第三卷九段众生史按固定顺序推进，查看事件不改状态或随机流',()=>{
  let s=third(),raw=E.serialize(s);for(let i=0;i<20;i++)W.event(s.world);assert.equal(E.serialize(s),raw);
  const titles=[];for(let i=0;i<W.STORY_NODES.length;i++){const e=W.event(s.world);titles.push(e.title);const action={type:'world-resolve',id:e.choices[i%2].id,revision:s.revision};s=E.transition(s,action);assert.throws(()=>E.transition(s,action));}
  assert.deepEqual(titles,W.STORY_NODES.map(x=>x.title));assert.equal(s.world.phase,'ending-choice');assert.equal(s.world.story.cursor,W.STORY_NODES.length);assert.equal(s.world.history.length,W.STORY_NODES.length);
});
test('第三卷三种终局都由玩家显式选择，生机秩序不替玩家自动决定',()=>{
  for(const ending of W.ENDINGS){let s=third();while(s.world.phase==='event'){const e=W.event(s.world);s=E.transition(s,{type:'world-resolve',id:e.choices[0].id});}
    const before={vitality:s.world.vitality,order:s.world.order};assert.deepEqual(W.endingChoices(s.world).map(x=>x.id),W.ENDINGS.map(x=>x.id));s=E.transition(s,{type:'world-ending',id:ending.id});
    assert.equal(s.world.phase,'ending');assert.equal(s.world.story.ending,ending.id);assert.deepEqual({vitality:s.world.vitality,order:s.world.order},before);assert.match(W.conclusion(s.world),new RegExp(ending.text.slice(0,8)));
    const meta=M.observe(M.createMeta(),s);assert.equal(meta.storyProgress.daoCleared,true);assert.equal(meta.storyProgress.endings.dao.choice,ending.id);assert.equal(meta.storyProgress.endings.dao.title,ending.name);assert.equal(meta.storyProgress.endings.dao.sourceSeed,s.seed);
  }
});
test('第三卷正式结局后才能进入后日谈，后日谈继续复用有界三事件纪元',()=>{
  let s=third();while(s.world.phase==='event'){const e=W.event(s.world);s=E.transition(s,{type:'world-resolve',id:e.choices[0].id});}
  assert.throws(()=>E.transition(s,{type:'world-continue'}));s=E.transition(s,{type:'world-ending',id:'all-ascend'});s=E.transition(s,{type:'world-continue'});
  assert.equal(s.world.story.sandbox,true);assert.equal(s.world.era,'2');assert.equal(W.event(s.world).type,'cultivation');for(let n=0;n<100;n++){if(s.world.phase==='ending')s=E.transition(s,{type:'world-continue'});else s=E.transition(s,{type:'world-resolve',id:W.event(s.world).choices[0].id});}
  assert.ok(s.world.history.length<=W.LIMIT);W.validate(s.world);
});
test('从合法凡界到仙界正式结局与创道，才能创建世界；不重复创世',()=>{
  const s=earned();assert.ok(W.canCreate(s));const raw=E.serialize(s),n=create();
  assert.equal(E.serialize(s),raw);assert.equal(n.rng,s.rng);assert.deepEqual(n.immortal,s.immortal);assert.equal(n.ascendedPower,s.ascendedPower);
  assert.throws(()=>E.transition(n,{type:'world-create',config:W.defaults()}));
  assert.throws(()=>E.transition(E.createRun(22),{type:'world-create',config:W.defaults()}));
  const noDao=clone(s);noDao.dao=A.createState();assert.throws(()=>E.transition(noDao,{type:'world-create',config:W.defaults()}));
});
test('三种事件均受世界法则影响；相同 seed 与法则产生相同历史',()=>{
  let x=W.create(earned(),W.defaults()),same=W.create(earned(),W.defaults());
  let y=W.create(earned(),{aura:'abundant',system:'body',dao:'own',risk:'calamity',inheritance:'open'});
  for(const type of W.TYPES){const a=W.event(x),b=W.event(y);assert.equal(a.type,type);assert.notDeepEqual(a.choices.map(c=>[c.vitality,c.order]),b.choices.map(c=>[c.vitality,c.order]));
    x=W.resolve(x,a.choices[0].id);same=W.resolve(same,W.event(same).choices[0].id);y=W.resolve(y,b.choices[0].id);}
  assert.deepEqual(x,same);assert.equal(x.phase,'ending');assert.equal(x.cursor,3);assert.ok(W.conclusion(x));
});
test('全部八十一种法则组合可以完成创世，不生成越界状态',()=>{
  let count=0;const s=earned();for(const a of W.OPTIONS.aura)for(const t of W.OPTIONS.system)for(const r of W.OPTIONS.risk)for(const i of W.OPTIONS.inheritance){
    let w=W.create(s,{aura:a.id,system:t.id,dao:'own',risk:r.id,inheritance:i.id});
    for(let n=0;n<3;n++)w=W.resolve(w,W.event(w).choices[n%2].id);
    W.validate(w);assert.equal(w.phase,'ending');count++;
  }assert.equal(count,81);
});
test('创世后三类选择、结局、下一纪与刷新恢复完整闭环',()=>{
  let s=create();const seen=[];
  for(let n=0;n<3;n++){const e=W.event(s.world),action={type:'world-resolve',id:e.choices[0].id,revision:s.revision};seen.push(e.type);s=E.transition(s,action);assert.throws(()=>E.transition(s,action));assert.throws(()=>E.transition(s,{type:'world-resolve',id:action.id}));s=E.deserialize(E.serialize(s));}
  assert.deepEqual(seen,W.TYPES);assert.equal(s.world.phase,'ending');
  s=E.transition(s,{type:'world-continue'});assert.equal(s.world.era,'2');assert.equal(W.event(s.world).type,'cultivation');assert.throws(()=>E.transition(s,{type:'world-continue'}));
});
test('历史投影只保留大道来源，持续千段事件仍只有二十四条历史',()=>{
  let w=create().world;assert.equal(w.projection.type,'dao');assert.equal(w.projection.name,earned().dao.formed.name);assert.equal(w.projection.sourceSeed,earned().seed);
  assert.equal(w.equipment,undefined);assert.equal(w.talents,undefined);
  for(let n=0;n<1000;n++){if(w.phase==='ending')w=W.continueWorld(w);w=W.resolve(w,W.event(w).choices[n%2].id);}
  W.validate(w);assert.equal(w.history.length,24);assert.ok(JSON.stringify(w).length<15000);
});
test('v1.12 的 v14 与 v1.0 的 v5 结构迁移只补空世界，核心成就不变',()=>{
  const old=earned();old.version=14;delete old.world;const n=E.deserialize(JSON.stringify(old));assert.equal(n.world,null);assert.deepEqual(n.dao,old.dao);assert.deepEqual(n.immortal,old.immortal);
  const legacy=clone(old);legacy.version=5;for(const k of ['equipment','combatReplay','secretRealm','sect','life','spiritBeast','crafting','karma','dao'])delete legacy[k];
  const m=E.deserialize(JSON.stringify(legacy));assert.equal(m.world,null);assert.deepEqual(m.dao,A.createState());assert.equal(m.ascendedPower,legacy.ascendedPower);assert.equal(m.rng,legacy.rng);assert.deepEqual(m.immortal,legacy.immortal);
});
test('损坏参数、投影、史册、未知选择、非法纪元与乱序操作拒绝',()=>{
  const s=create();
  for(const change of [n=>n.world.config.risk='unknown',n=>n.world.config.aura='abundant',n=>n.world.rules=['unknown'],n=>n.world.projection.name='伪造大道',n=>n.world.era='1e9',n=>n.world.history=Array(25).fill({}),n=>n.world.cursor=3,n=>n.world.vitality=101]){
    const n=clone(s);change(n);assert.throws(()=>E.deserialize(JSON.stringify(n)));
  }
  assert.throws(()=>E.transition(s,{type:'world-resolve',id:'bad'}));assert.throws(()=>E.transition(s,{type:'world-continue'}));assert.throws(()=>E.transition(earned(),{type:'world-create',config:{...W.defaults(),extra:'x'}}));
});
test('查看法则与事件不改变世界或本世随机流；大纪元按整数续写',()=>{
  const s=create(),raw=E.serialize(s);for(let i=0;i<50;i++){W.event(s.world);W.name(s.world);W.ruleSummary(s.world);}assert.equal(E.serialize(s),raw);
  assert.deepEqual(E.deserialize(raw),s);
  let w=clone(s.world);for(let i=0;i<24;i++){if(w.phase==='ending')w=W.continueWorld(w);w=W.resolve(w,W.event(w).choices[0].id);}
  const shift=9007199254740992n-BigInt(w.era);w.era='9007199254740992';for(const row of w.history){row.era=(BigInt(row.era)+shift).toString();row.key='e'+row.era+'-'+W.TYPES.indexOf(row.type);}
  W.validate(w);assert.equal(W.continueWorld(w).era,'9007199254740993');
});
