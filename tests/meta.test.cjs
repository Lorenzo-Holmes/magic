'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/data.js');
const E = require('../src/engine.js');
const M = require('../src/meta.js');
const Z = require('../src/spirit-beast.js');
const G = require('../src/equipment.js');
const K = require('../src/karma.js');
const { simulate } = require('../tools/simulation-policy.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
function entered(seed = 600) {
  const s = E.createRun(seed);
  s.phase = 'playing'; s.root = 'thunder'; s.origin = 'orphan';
  s.stats = { bone: 5, insight: 5, luck: 5, mind: 5 };
  s.talents = ['strong', 'bright', 'fortunate']; s.innate = [...s.talents]; s.offer = []; s.selected = [...s.innate];
  s.flags.pythonSeen = true; s.event = { id: 'quiet', title: '测试', text: '测试' };
  return s;
}
function ascended(seed = 601) {
  const s = entered(seed);
  s.phase = 'complete'; s.realm = 9; s.xp = 0; s.age = 3000;
  s.talents = ['spirit', 'blood', 'stomach', 'taotie', 'sense', 'aware', 'bright', 'study', 'seed', 'fortunate', 'fortune', 'destiny'];
  s.innate = s.talents.slice(0, 3); s.mutations = ['serpenteye']; s.fusions = ['abyss-eye'];
  s.devours = 8; s.sword = true; s.flags = { pythonSeen: true, pythonSlain: true, swordEvent: true, bossSeen: true, bossSlain: true, ascended: true };
  s.bossRoute = 'see-through'; s.tribulationStage = 3; s.tribulationBase = 10000000000;
  s.tribulationRoutes = ['fusion', 'trace-soul', 'cut-gate']; s.realmProofs = [4, 5, 6, 7, 8];
  s.highSeen = ['nascent-battlefield', 'soul-rift', 'void-nest', 'world-form', 'star-corpse'];
  s.ending = '飞升'; s.log = [{ title: '飞升', text: '天门洞开。', tone: 'gold', age: s.age, realm: 9 }];
  s.ascendedPower = E.power(s); return s;
}
test('六类流派识别读取真实天命、属性、异变、融合与路线', () => {
  const cases = [
    ['devour', s => { s.talents = ['spirit', 'blood', 'stomach']; s.devours = 9; s.mutations = ['serpentblood']; s.fusions = ['devour-body']; }],
    ['sword', s => { s.talents = ['swordheart', 'swordbone', 'bright']; s.sword = true; s.fusions = ['thunder-sword']; }],
    ['body', s => { s.talents = ['strong', 'iron', 'dragonbone']; s.stats.bone = 10; s.mutations = ['redscale']; s.fusions = ['golden-body']; }],
    ['soul', s => { s.talents = ['aware', 'sense', 'bright']; s.stats.mind = 10; s.mutations = ['serpenteye']; s.fusions = ['abyss-eye']; }],
    ['fortune', s => { s.talents = ['fortunate', 'fortune', 'destiny']; s.stats.luck = 10; s.fusions = ['fate-veil']; }],
    ['insight', s => { s.talents = ['bright', 'study', 'seed']; s.stats.insight = 10; s.fusions = ['five-unity']; }]
  ];
  for (const [expected, tune] of cases) {
    const s = entered(610 + cases.findIndex(item => item[0] === expected)); tune(s);
    assert.equal(M.classifyPath(s).id, expected);
    assert.ok(M.classifyPath(s).signals.length);
  }
});
test('飞升称号可以同时成立，并以更具体的称号优先', () => {
  const s = ascended();
  const titles = M.endingTitles(s).map(title => title.id);
  assert.equal(titles[0], 'myriad-devourer');
  assert.ok(titles.includes('sword-opens-heaven'));
  assert.ok(titles.includes('clear-all-delusions'));
  assert.ok(titles.includes('flawless-ascension'));
  assert.ok(titles.includes('mortal-ascender'));
});
test('轮回册观察只登记一次结局，并收集图谱发现', () => {
  const s = ascended();
  let meta = M.observe(M.createMeta(), s);
  const once = clone(meta);
  meta = M.observe(meta, s);
  assert.deepEqual(meta, once);
  assert.equal(meta.totals.ended, 1); assert.equal(meta.totals.ascended, 1);
  assert.ok(meta.discovered.talents.includes('taotie'));
  assert.ok(meta.discovered.fusions.includes('abyss-eye'));
  assert.ok(meta.discovered.highEvents.includes('star-corpse'));
  assert.ok(meta.discovered.bossRoutes.includes('see-through'));
  assert.ok(meta.discovered.tribulationRoutes.includes('trace-soul'));
  assert.ok(meta.discovered.titles.includes('myriad-devourer'));
  assert.equal(meta.storyProgress.endings.mortal.sourceSeed,s.seed);assert.equal(meta.storyProgress.endings.mortal.title,M.endingTitles(s)[0].name);assert.equal(meta.storyProgress.endings.mortal.path,M.classifyPath(s).id);assert.equal(meta.storyProgress.endings.mortal.power,s.ascendedPower);
});
test('每局只凝练一枚候选道痕，开始下一世后即被消费', () => {
  const s = ascended(620), candidates = M.traceCandidates(s);
  assert.equal(candidates.length, 3);
  let meta = M.selectTrace(M.observe(M.createMeta(), s), s, candidates[0].id);
  assert.equal(meta.nextTrace, candidates[0].id); assert.equal(meta.nextTraceSource, s.seed);
  const consumed = M.consumeTrace(meta);
  assert.equal(consumed.trace, candidates[0].id); assert.equal(consumed.meta.nextTrace, null); assert.equal(consumed.meta.nextTraceSource, null);
  assert.throws(() => M.selectTrace(meta, s, D.TRACES.find(trace => !candidates.some(c => c.id === trace.id)).id));
});
test('命途图谱对未发现内容只给线索，序列化拒绝损坏数据', () => {
  const empty = M.createMeta(), sections = M.codexSections(empty);
  assert.ok(sections.every(section => section.entries.every(entry => !entry.discovered && entry.name === '？？？')));
  const observed = M.observe(empty, ascended());
  const restored = M.deserialize(M.serialize(observed));
  assert.deepEqual(restored, observed);
  assert.ok(M.summary(observed).discovered > 0);
  const broken = clone(observed); broken.discovered.traces.push('missing');
  assert.throws(() => M.deserialize(JSON.stringify(broken)));
  const orphanSource = clone(observed); orphanSource.nextTraceSource = 123;
  assert.throws(() => M.deserialize(JSON.stringify(orphanSource)));
});
test('百世回响保存人物摘要、因果回声与重要对象传说，但不复制旧存档', () => {
  const s=ascended(630);
  s.karma.summaries=[{sourceKey:'life:test',source:'人生 · 故乡',relation:'凡尘旧约',strength:2,outcome:'亲自回应',settledRealm:6,kind:'life'}];
  s.equipment.inventory=[{uid:'gear-legend',id:'heaven-rend',identified:true,refinement:0,xp:240}];
  let beast=Z.bond(Z.createState(),'moonfox');beast=Z.addEssence(beast,20,'test');beast=Z.evolve(beast,{realm:1});beast=Z.evolve(beast,{realm:2},'sacred');s.spiritBeast=beast;
  const meta=M.observe(M.createMeta(),s),snap=M.legacySnapshot(meta);
  assert.equal(snap.lives.length,1);assert.match(snap.lives[0].summary,/飞升/);assert.equal(snap.lives[0].bossRoute,'see-through');assert.deepEqual(snap.lives[0].tribulationRoutes,s.tribulationRoutes);
  assert.equal(snap.echoes.length,1);assert.equal(snap.echoes[0].relation,'凡尘旧约');
  assert.ok(snap.legends.some(x=>x.type==='weapon'&&x.name==='斩界天锋'));assert.ok(snap.legends.some(x=>x.type==='beast'&&x.name.includes('圣狐')));
  assert.ok(!JSON.stringify(meta).includes('inventory'));assert.ok(!JSON.stringify(meta).includes('materials'));
});
test('下一世只获得前世文本与路线提示，不直接改变当前数值或解锁条件', () => {
  const old=ascended(631),meta=M.observe(M.createMeta(),old),next=entered(632);next.traceSourceSeed=old.seed;
  const before=JSON.stringify(next),arrival=M.eventMemory(meta,next,'arrival'),boss=M.routeMemory(meta,next,'boss','see-through'),trib=M.routeMemory(meta,next,'tribulation','fusion');
  assert.match(arrival,/记忆|旧字/);assert.match(boss,/前世/);assert.match(trib,/前世/);assert.equal(JSON.stringify(next),before);
  assert.equal(M.routeMemory(meta,next,'boss','fight'),'');
});
test('v2轮回册迁移到v4只补空百世回响与三卷进度，不伪造旧传说', () => {
  const old=clone(M.createMeta());old.version=2;delete old.legacy;
  delete old.storyProgress;
  const migrated=M.deserialize(JSON.stringify(old));assert.equal(migrated.version,4);assert.deepEqual(migrated.legacy,{echoes:[],legends:[]});
  assert.deepEqual(migrated.storyProgress,{version:2,mortalCleared:false,immortalCleared:false,daoCleared:false,lastMortalBridge:null,lastImmortalBridge:null,endings:{mortal:null,immortal:null,dao:null}});
});
test('v3轮回册只根据可信飞升统计补第一卷完成，不猜测后两卷', () => {
  const old=clone(M.createMeta());old.version=3;delete old.storyProgress;old.totals={ended:2,ascended:1};
  const migrated=M.deserialize(JSON.stringify(old));assert.equal(migrated.version,4);
  assert.equal(migrated.storyProgress.mortalCleared,true);assert.equal(migrated.storyProgress.immortalCleared,false);assert.equal(migrated.storyProgress.daoCleared,false);
});
test('旧v4 storyProgress v1迁移到v2只补空三卷结局摘要',()=>{
  const old=clone(M.createMeta());old.storyProgress={version:1,mortalCleared:true,immortalCleared:true,daoCleared:false,lastMortalBridge:null,lastImmortalBridge:null};
  const migrated=M.deserialize(JSON.stringify(old));assert.equal(migrated.storyProgress.version,2);assert.deepEqual(migrated.storyProgress.endings,{mortal:null,immortal:null,dao:null});assert.equal(migrated.storyProgress.mortalCleared,true);assert.equal(migrated.storyProgress.immortalCleared,true);
});
test('飞升后合法结契与仙兽进化持续更新同世传说，旧v3及旧本世存档不降级', () => {
  let s=simulate(633).state;
  assert.equal(s.phase,'complete');
  let meta=M.observe(M.createMeta(),s);
  s=E.transition(s,{type:'beast-bond',id:'moonfox'});
  meta=M.observe(meta,s);
  assert.equal(meta.legacy.legends.filter(x=>x.type==='beast').length,1);
  assert.equal(meta.legacy.legends.find(x=>x.type==='beast').stage,0);
  // Supply a bounded resource fixture; all progression gates use the real reducer.
  s.spiritBeast=Z.addEssence(s.spiritBeast,20,'progression-test');
  const younger=E.deserialize(E.serialize(s));
  for (const id of [undefined,'sacred',undefined]) {
    s=E.transition(s,{type:'beast-evolve',id}); meta=M.observe(meta,s);
    assert.equal(meta.legacy.legends.filter(x=>x.type==='beast').length,1);
  }
  assert.throws(()=>E.transition(s,{type:'beast-evolve'}));
  const oldV3=clone(meta); for(const row of oldV3.legacy.legends) delete row.stage;
  meta=M.deserialize(JSON.stringify(oldV3));
  assert.deepEqual(M.observe(meta,younger),meta);
  s=E.transition(s,{type:'immortal-enter'});
  s=E.transition(s,{type:'beast-evolve'});
  const raw=E.serialize(s); meta=M.observe(meta,s);
  const beast=meta.legacy.legends.filter(x=>x.type==='beast');
  assert.equal(beast.length,1); assert.equal(beast[0].stage,4); assert.match(beast[0].text,/仙兽/);
  assert.deepEqual(meta.totals,{ended:1,ascended:1}); assert.equal(E.serialize(s),raw);
  assert.deepEqual(M.observe(meta,s),meta); assert.deepEqual(M.observe(meta,younger),meta);
  const finalOldV3=clone(meta); delete finalOldV3.legacy.legends.find(x=>x.type==='beast').stage;
  const restored=M.deserialize(JSON.stringify(finalOldV3));
  assert.deepEqual(M.observe(restored,younger),restored);
});
test('飞升后鉴定与本命进化保留同世最高段遗器，兼容缺stage的旧v3传说', () => {
  let s=simulate(634).state,meta=M.observe(M.createMeta(),s);
  const uid=s.equipment.inventory.find(x=>G.data(x).special).uid;
  s=E.transition(s,{type:'equipment-identify',id:uid});
  s=E.transition(s,{type:'equipment-equip',id:uid});
  s.equipment=G.grantWeaponXp(s.equipment,300);
  const younger=E.deserialize(E.serialize(s));
  meta=M.observe(meta,s); assert.equal(meta.legacy.legends.find(x=>x.type==='weapon').stage,0);
  s=E.transition(s,{type:'equipment-evolve',id:uid}); meta=M.observe(meta,s);
  const oldV3=clone(meta); for(const row of oldV3.legacy.legends) delete row.stage;
  meta=M.deserialize(JSON.stringify(oldV3)); assert.deepEqual(M.observe(meta,younger),meta);
  s=E.transition(s,{type:'equipment-evolve',id:uid}); meta=M.observe(meta,s);
  const weapons=meta.legacy.legends.filter(x=>x.type==='weapon');
  assert.equal(weapons.length,1); assert.equal(weapons[0].stage,2); assert.equal(weapons[0].name,'擎天神岳');
  assert.deepEqual(M.observe(meta,younger),meta); assert.deepEqual(M.observe(meta,s),meta);
  assert.deepEqual(meta.totals,{ended:1,ascended:1});
  const broken=clone(meta); broken.legacy.legends[0].stage=3;
  assert.throws(()=>M.deserialize(JSON.stringify(broken)));
});
test('飞升后实际偿还天门因果新增跨世回声，重复观察不重复计数或改变本世', () => {
  let s=simulate(635).state,meta=M.observe(M.createMeta(),s);
  const initially=meta.legacy.echoes.length;
  s=E.transition(s,{type:'immortal-enter'});
  let resolvedAscension=false;
  for(let i=0;s.karma.pending&&i<24;i++) {
    const entry=K.pendingEntry(s.karma),choice=K.eventFor(entry).choices[0];
    s=E.transition(s,{type:'karma-resolve',id:choice.id});
    const raw=E.serialize(s); meta=M.observe(meta,s);
    assert.equal(E.serialize(s),raw);
    if(entry.kind==='ascension') resolvedAscension=true;
  }
  assert.ok(resolvedAscension); assert.ok(meta.legacy.echoes.length>initially);
  assert.equal(meta.legacy.echoes.filter(x=>x.id===`karma:${s.seed}:ascension:first`).length,1);
  assert.match(meta.legacy.echoes.find(x=>x.id===`karma:${s.seed}:ascension:first`).outcome,/记住凡界来处/);
  assert.deepEqual(meta.totals,{ended:1,ascended:1}); assert.equal(meta.runHistory.length,1);
  assert.deepEqual(M.observe(M.deserialize(M.serialize(meta)),E.deserialize(E.serialize(s))),meta);
});
