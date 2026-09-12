(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSStory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CHAPTERS=Object.freeze([
    Object.freeze({id:'mortal',order:1,kicker:'第一卷 · 凡尘',name:'我欲飞升',teaser:'一介凡身，欲叩天门。',unlock:'初始开放',ending:'飞升'}),
    Object.freeze({id:'immortal',order:2,kicker:'第二卷 · 仙界',name:'仙路无穷',teaser:'天门之后，仙亦如尘。',unlock:'完成第一卷后开放',ending:'噬界者'}),
    Object.freeze({id:'dao',order:3,kicker:'第三卷 · 证道',name:'我即天道',teaser:'道无尽处，问何以为道。',unlock:'完成第二卷后开放',ending:'证道终局'})
  ]);
  const copy=value=>JSON.parse(JSON.stringify(value));
  function facts(meta,state){
    const stored=meta?.storyProgress||{};
    const daoOrigin=state?.storyOrigin?.chapter==='dao',immortalOrigin=state?.storyOrigin?.chapter==='immortal';
    const mortal=!!stored.mortalCleared||daoOrigin||immortalOrigin||!!(state?.phase==='complete'&&state?.flags?.ascended);
    const immortal=!!stored.immortalCleared||daoOrigin||!!state?.immortal?.evolution?.completed;
    const dao=!!stored.daoCleared||!!(state?.world?.phase==='ending');
    return {mortalCleared:mortal,immortalCleared:immortal||dao,daoCleared:dao};
  }
  function activeChapter(state){
    if(state?.storyOrigin?.chapter==='dao')return 'dao';
    if(state?.storyOrigin?.chapter==='immortal')return 'immortal';
    if(state?.world)return 'dao';
    if(state?.immortal)return 'immortal';
    return 'mortal';
  }
  function chapters(meta,state){
    const f=facts(meta,state),active=activeChapter(state);
    return CHAPTERS.map(base=>{
      const unlocked=base.id==='mortal'||base.id==='immortal'&&f.mortalCleared||base.id==='dao'&&f.immortalCleared;
      const completed=base.id==='mortal'?f.mortalCleared:base.id==='immortal'?f.immortalCleared:f.daoCleared;
      const current=active===base.id&&!!state;
      return {...copy(base),unlocked,completed,current,status:completed?'已完成':current?'进行中':unlocked?'已解锁':'封印中'};
    });
  }
  function chapter(id,meta,state){return chapters(meta,state).find(item=>item.id===id)||null;}
  return Object.freeze({CHAPTERS,chapters,chapter,facts,activeChapter});
});
