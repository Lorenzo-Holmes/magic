'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Story=require('../src/story.js');
const Meta=require('../src/meta.js');

test('三卷按凡尘→仙界→证道顺序解锁，未完成前不泄露为可进入状态',()=>{
  const meta=Meta.createMeta();
  let chapters=Story.chapters(meta,null);
  assert.deepEqual(chapters.map(x=>[x.id,x.unlocked,x.completed]),[['mortal',true,false],['immortal',false,false],['dao',false,false]]);
  meta.storyProgress.mortalCleared=true;
  chapters=Story.chapters(meta,null);
  assert.equal(chapters.find(x=>x.id==='immortal').unlocked,true);assert.equal(chapters.find(x=>x.id==='dao').unlocked,false);
  meta.storyProgress.immortalCleared=true;
  chapters=Story.chapters(meta,null);
  assert.equal(chapters.find(x=>x.id==='dao').unlocked,true);
});

test('故事卷状态只读取 meta/run，不修改对象或 RNG',()=>{
  const meta=Meta.createMeta(),state={phase:'complete',flags:{ascended:true},rng:123,immortal:null,world:null};
  const beforeMeta=JSON.stringify(meta),beforeState=JSON.stringify(state);
  const chapters=Story.chapters(meta,state);
  assert.equal(chapters.find(x=>x.id==='mortal').completed,true);
  assert.equal(chapters.find(x=>x.id==='mortal').current,true);
  assert.equal(JSON.stringify(meta),beforeMeta);assert.equal(JSON.stringify(state),beforeState);
});

test('已有仙界/证道真实完成状态可以只读反映卷目完成度',()=>{
  const meta=Meta.createMeta();
  const immortal={phase:'complete',flags:{ascended:true},immortal:{evolution:{completed:true}},world:null};
  let chapters=Story.chapters(meta,immortal);
  assert.equal(chapters.find(x=>x.id==='mortal').completed,true);assert.equal(chapters.find(x=>x.id==='immortal').completed,true);assert.equal(chapters.find(x=>x.id==='dao').unlocked,true);
  const dao={...immortal,world:{phase:'ending'}};
  chapters=Story.chapters(meta,dao);assert.equal(chapters.find(x=>x.id==='dao').completed,true);assert.equal(Story.activeChapter(dao),'dao');
});

test('独立第二卷与第三卷shell在尚未生成子状态时仍归属正确卷目',()=>{
  const meta=Meta.createMeta(),immortal={phase:'complete',flags:{ascended:true},storyOrigin:{chapter:'immortal'},immortal:null,world:null},dao={phase:'complete',flags:{ascended:true},storyOrigin:{chapter:'dao'},immortal:null,world:null};
  assert.equal(Story.activeChapter(immortal),'immortal');assert.equal(Story.activeChapter(dao),'dao');
  assert.equal(Story.chapters(meta,immortal).find(x=>x.id==='immortal').unlocked,true);
  const daoChapters=Story.chapters(meta,dao);assert.equal(daoChapters.find(x=>x.id==='dao').unlocked,true);assert.equal(daoChapters.find(x=>x.id==='dao').current,true);
});
