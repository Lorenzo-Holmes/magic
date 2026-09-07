'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/build.js');
const G = require('../src/equipment.js');

const base = () => ({ stats:{bone:5,insight:5,luck:5,mind:5}, talents:[], root:'mixed', sword:false, mutations:[], fusions:[], bossRoute:null, tribulationRoutes:[], equipment:G.createState() });

test('十类标准标签和十五条受控协同完整，逐条都能由其声明标签触发', () => {
  assert.deepEqual(Object.keys(B.TAGS), ['sword','thunder','devour','body','soul','fortune','insight','survival','burst','growth']);
  assert.equal(B.SYNERGIES.length, 15);
  for (const rule of B.SYNERGIES) {
    const active=B.evaluateTags(rule.requires);
    assert.ok(active.some(x=>x.id===rule.id), rule.id);
    assert.ok(Object.keys(rule.effects).length > 0 && typeof rule.text === 'string' && rule.text.length > 4, rule.id);
    for (const missing of rule.requires) assert.ok(!B.evaluateTags(rule.requires.filter(x=>x!==missing)).some(x=>x.id===rule.id), `${rule.id}/${missing}`);
  }
});

test('Build 评估返回主辅标签、来源、协同与解释且不修改输入', () => {
  const s=base(); s.root='thunder'; s.sword=true; s.stats.insight=9; s.talents=['swordheart','seed'];
  const raw=JSON.stringify(s), value=B.evaluateBuild(s);
  assert.equal(JSON.stringify(s), raw);
  assert.ok(['sword','insight'].includes(value.main)); assert.ok(value.sub);
  assert.ok(value.sources.some(x=>x.source==='art:sword'));
  assert.ok(value.synergies.some(x=>x.id==='thunder-sword'));
  assert.ok(value.explanation.includes('主脉'));
});

test('卸下装备立即撤销由装备补齐的协同，不保留隐藏倍率', () => {
  const s=base(); s.root='thunder';
  s.equipment.inventory.push({uid:'gear-buildfixture',id:'azure-embryo',identified:true,refinement:0,xp:0});
  s.equipment.slots.weapon='gear-buildfixture'; G.validate(s.equipment);
  const worn=B.evaluateBuild(s);
  assert.ok(worn.synergies.some(x=>x.id==='thunder-sword'));
  const off=JSON.parse(JSON.stringify(s)); off.equipment.slots.weapon=null;
  const unworn=B.evaluateBuild(off);
  assert.ok(!unworn.synergies.some(x=>x.id==='thunder-sword'));
  assert.ok((worn.effects.power||0) > (unworn.effects.power||0));
});

test('全部协同效果都来自公开规则表，聚合值等于逐条效果相加', () => {
  const all=B.evaluateTags(Object.keys(B.TAGS)), expected={};
  for(const rule of all) for(const [key,value] of Object.entries(rule.effects)) expected[key]=(expected[key]||0)+value;
  const s=base();
  s.stats={bone:10,insight:10,luck:10,mind:10}; s.root='thunder'; s.sword=true;
  s.talents=['taotie','goldbody','destiny','morningdao','swordheart','sense'];
  const evaluated=B.evaluateBuild(s);
  for(const [key,value] of Object.entries(evaluated.effects)) {
    const fromRules=evaluated.synergies.reduce((n,rule)=>n+(rule.effects[key]||0),0);
    assert.equal(value,fromRules,key);
  }
  assert.ok(Object.keys(expected).length >= 5);
});
