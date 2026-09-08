'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/secret-realm.js');
const E = require('../src/engine.js');

const clone = value => JSON.parse(JSON.stringify(value));
function enter(seed=42){
  let s=E.createRun(seed); for(const id of s.offer.slice(0,3))s=E.transition(s,{type:'select',id});
  s=E.transition(s,{type:'confirm-talents'}); s=E.transition(s,{type:'preset',id:'balanced'}); return E.transition(s,{type:'enter'});
}
function safeOption(active){return active.options.find(o=>['herb','page','merchant'].includes(o.type))||active.options[0];}

test('三座秘境分别为3/4/5层，境界入口互不重叠且都有安全退出',()=>{
  assert.deepEqual(R.REALMS.map(x=>x.floors),[3,4,5]);
  assert.deepEqual(R.available(0).map(x=>x.id),['blackwind']);
  assert.deepEqual(R.available(3).map(x=>x.id),['danxia']);
  assert.deepEqual(R.available(8).map(x=>x.id),['outside']);
  for(const config of R.REALMS){
    const st=R.start(R.createState(),config.id,1234,config.minRealm,1000,10000);
    assert.equal(st.active.realmId,config.id); assert.ok(st.active.options.length>=1);
    const out=R.exit(st); assert.equal(out.state.active,null); assert.equal(out.settlement.ending,'exit');
  }
});

test('同种子同层路线完全稳定，刷新式复制不会重抽异象',()=>{
  const a=R.start(R.createState(),'danxia',5678,3,5000,12000), b=R.start(R.createState(),'danxia',5678,3,5000,12000);
  assert.deepEqual(a,b);
  const id=safeOption(a.active).id, next=R.choose(a,id).state;
  const restored=JSON.parse(JSON.stringify(next)); R.validate(restored);
  assert.deepEqual(restored.active.options,next.active.options);
});

test('1200个确定性秘境样本没有死循环，每个普通层至少存在非失败路线',()=>{
  let samples=0, completed=0, failed=0;
  for(const config of R.REALMS){
    for(let seed=1;seed<=400;seed++){
      let state=R.start(R.createState(),config.id,seed,config.minRealm,10000,20000), steps=0;
      while(state.active&&steps++<8){
        const active=state.active;
        if(active.floor<active.floors) assert.ok(active.options.some(o=>['herb','page'].includes(o.type)),`${config.id}/${seed}/floor${active.floor}`);
        const option=active.floor<active.floors?safeOption(active):active.options[0];
        const result=R.choose(state,option.id); state=result.state;
        if(result.settlement){if(result.settlement.ending==='complete')completed++;else if(result.settlement.ending==='failed')failed++;}
      }
      assert.ok(steps<=config.floors+1,`${config.id}/${seed} exceeded floor budget`); assert.equal(state.active,null); samples++;
    }
  }
  assert.equal(samples,1200); assert.ok(completed>0); assert.ok(failed>0);
});

test('失败只结算秘境，不会在模块中产生主线死亡或负资源',()=>{
  let state=R.start(R.createState(),'outside',99,6,1000,1500000), result;
  while(state.active){const a=state.active, option=a.floor<a.floors?safeOption(a):a.options[0];result=R.choose(state,option.id);state=result.state;}
  assert.ok(['complete','failed'].includes(result.settlement.ending)); assert.ok(result.settlement.awardXp>=0); assert.equal(state.active,null); R.validate(state);
});

test('Boss首胜只标记一次，重复通关不再次提供首胜独有奖励',()=>{
  let ledger=R.createState(), first=null;
  for(let seed=1;seed<200&&!first;seed++){
    let state=R.start(ledger,'blackwind',seed,0,10000,10000), result;
    while(state.active){const a=state.active, option=a.floor<a.floors?safeOption(a):a.options[0];result=R.choose(state,option.id);state=result.state;}
    if(result.settlement.ending==='complete'){first={state,result,seed};}
  }
  assert.ok(first&&first.result.settlement.boss); ledger=first.state;
  let second=R.start(ledger,'blackwind',first.seed,0,10000,10000), result;
  while(second.active){const a=second.active, option=a.floor<a.floors?safeOption(a):a.options[0];result=R.choose(second,option.id);second=result.state;}
  if(result.settlement.ending==='complete')assert.equal(result.settlement.boss,false);
  assert.equal(second.completed.filter(x=>x==='blackwind').length,1);
});

test('主 reducer 可刷新恢复秘境并安全退出，退出后主线继续且只结算一次',()=>{
  let s=enter(2468), startXp=s.xp;
  s=E.transition(s,{type:'secret-enter',id:'blackwind',revision:s.revision}); assert.ok(s.secretRealm.active);
  const raw=E.serialize(s), restored=E.deserialize(raw); assert.deepEqual(restored.secretRealm,s.secretRealm);
  const option=safeOption(restored.secretRealm.active); s=E.transition(restored,{type:'secret-choose',id:option.id,revision:restored.revision});
  assert.ok(s.secretRealm.active); const beforeExit=s.xp;
  s=E.transition(s,{type:'secret-exit',revision:s.revision}); assert.equal(s.secretRealm.active,null); assert.equal(s.phase,'playing'); assert.ok(s.xp>=beforeExit&&s.xp>=startXp);
  assert.throws(()=>E.transition(s,{type:'secret-exit',revision:s.revision}));
});

test('旧 v7 存档迁移到 v8 只补空秘境态',()=>{
  const current=E.createRun(77), old=clone(current); old.version=7; delete old.secretRealm;
  const migrated=E.deserialize(JSON.stringify(old)); assert.equal(migrated.version,E.VERSION); assert.deepEqual(migrated.secretRealm,R.createState());
});
