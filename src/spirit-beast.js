(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSSpiritBeast = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const STAGES = Object.freeze(['幼体','灵兽','妖兽 / 圣兽','真灵','仙兽']);
  const SPECIES = Object.freeze([
    { id:'moonfox', name:'月影灵狐', note:'擅长看破岔路与机缘。', tags:['soul','fortune'], base:{explore:.025},
      branches:{ wild:{name:'幽月妖狐',tags:['soul','burst'],effects:{bossPower:.03,explore:.02},text:'偏向奇袭与破妄。'}, sacred:{name:'照夜圣狐',tags:['fortune','growth'],effects:{mind:1,explore:.035},text:'偏向寻机与趋吉。'} } },
    { id:'thundercrane', name:'惊雷青鹤', note:'会追随剑鸣与雷息。', tags:['sword','thunder'], base:{swordPower:.025},
      branches:{ wild:{name:'裂空雷鹤',tags:['sword','burst'],effects:{swordPower:.035,bossPower:.025},text:'偏向一击破局。'}, sacred:{name:'太清玄鹤',tags:['thunder','insight'],effects:{cultivate:.025,explore:.02},text:'偏向借雷悟道。'} } },
    { id:'stoneape', name:'玄岩幼猿', note:'以山石为巢，极能承压。', tags:['body','survival'], base:{guard:.02},
      branches:{ wild:{name:'搬山妖猿',tags:['body','burst'],effects:{guard:.02,bossPower:.03},text:'偏向正面破阵。'}, sacred:{name:'镇岳圣猿',tags:['survival','growth'],effects:{guard:.025,rest:3},text:'偏向护持与恢复。'} } },
    { id:'devourfish', name:'吞灵幼鲤', note:'什么都想先咬一口。', tags:['devour','growth'], base:{devour:.025},
      branches:{ wild:{name:'饕海妖鲤',tags:['devour','burst'],effects:{devour:.04,devourHeal:2},text:'偏向吞噬强敌。'}, sacred:{name:'化龙灵鲤',tags:['growth','fortune'],effects:{devour:.025,explore:.025},text:'偏向把机缘化为成长。'} } }
  ]);
  const BY_ID = Object.freeze(Object.fromEntries(SPECIES.map(x=>[x.id,x])));
  const COSTS = Object.freeze([2,4,6,8]);
  const clone = value => JSON.parse(JSON.stringify(value));
  const requireThat = (ok,msg) => { if (!ok) throw new Error(msg); };
  function createState(){ return {version:VERSION, companion:null, essence:0, history:[]}; }
  function bond(input,id){
    validate(input); const state=clone(input); requireThat(!state.companion,'这一世已经有主灵兽。'); requireThat(BY_ID[id],'未知灵兽。');
    state.companion={species:id,stage:0,branch:null}; state.history.push({type:'bond',species:id}); state.history=state.history.slice(-12); validate(state); return state;
  }
  function branchData(companion){ const species=companion&&BY_ID[companion.species]; return companion?.branch&&species?.branches[companion.branch]; }
  function canEvolve(input,context={},branch=null){
    validate(input); const c=input.companion; if(!c||c.stage>=4) return {ok:false,reason:'当前没有可继续进化的灵兽。'};
    const cost=COSTS[c.stage]; if(input.essence<cost) return {ok:false,cost,reason:`灵兽精华不足，需要 ${cost}。`};
    if(c.stage===0&&Number(context.realm||0)<1) return {ok:false,cost,reason:'至少踏入炼气后才能完成第一次蜕变。'};
    if(c.stage===1){ if(Number(context.realm||0)<2) return {ok:false,cost,reason:'至少筑基后才能选择妖兽 / 圣兽分支。'}; if(!['wild','sacred'].includes(branch)) return {ok:false,cost,needsBranch:true,reason:'请选择妖兽或圣兽分支。'}; }
    if(c.stage===2&&Number(context.realm||0)<4) return {ok:false,cost,reason:'至少元婴后才能返祖为真灵。'};
    if(c.stage===3&&!(context.ascended&&context.immortal)) return {ok:false,cost,reason:'飞升并真正踏入仙界后，才能适应为仙兽。'};
    return {ok:true,cost,needsBranch:c.stage===1};
  }
  function evolve(input,context={},branch=null){
    const check=canEvolve(input,context,branch); requireThat(check.ok,check.reason); const state=clone(input), c=state.companion;
    state.essence-=check.cost; if(c.stage===1) c.branch=branch; c.stage++;
    state.history.push({type:'evolve',species:c.species,stage:c.stage,branch:c.branch}); state.history=state.history.slice(-12); validate(state); return state;
  }
  function addEssence(input,amount,source){
    validate(input); if(!input.companion||amount<=0) return clone(input); const state=clone(input); state.essence=Math.min(99,state.essence+Math.floor(amount));
    state.history.push({type:'essence',amount:Math.floor(amount),source:String(source||'unknown').slice(0,60)}); state.history=state.history.slice(-12); validate(state); return state;
  }
  function observe(input,before,after,action){
    validate(input); let state=clone(input); if(!state.companion) return state; let gain=0, source='';
    if(before?.event?.id==='hunt'&&after?.xp>before?.xp){gain=1;source='hunt';}
    if(!before?.flags?.bossSlain&&after?.flags?.bossSlain){gain=Math.max(gain,3);source='boss';}
    if((after?.realmProofs?.length||0)>(before?.realmProofs?.length||0)){gain=Math.max(gain,1);source='proof';}
    if((after?.secretRealm?.history?.length||0)>(before?.secretRealm?.history?.length||0)){gain=Math.max(gain,1);source='secret';}
    if(action?.type?.startsWith('immortal-')){
      const bd=before?.immortal?.devours||0, ad=after?.immortal?.devours||0; if(ad>bd){gain=Math.max(gain,1);source='immortal-devour';}
      if(before?.immortal?.phase!=='prologue-complete'&&after?.immortal?.phase==='prologue-complete'){gain=Math.max(gain,3);source='immortal-boss';}
    }
    return gain?addEssence(state,gain,source):state;
  }
  function effects(state){
    validate(state); const c=state.companion; if(!c) return {}; const species=BY_ID[c.species], out={};
    const scale=1+Math.min(4,c.stage)*.2; for(const [k,v] of Object.entries(species.base||{})) out[k]=(out[k]||0)+v*scale;
    const branch=branchData(c); if(branch&&c.stage>=2) for(const [k,v] of Object.entries(branch.effects||{})) out[k]=(out[k]||0)+v*(1+(c.stage-2)*.18);
    return out;
  }
  function tags(state){
    validate(state); const c=state.companion; if(!c) return []; const species=BY_ID[c.species], branch=branchData(c);
    return [...new Set([...(species.tags||[]),...(c.stage>=2&&branch?branch.tags:[])])];
  }
  function summary(state){
    validate(state); const c=state.companion; if(!c) return null; const species=BY_ID[c.species], branch=branchData(c);
    return {species:c.species,name:c.stage>=2&&branch?branch.name:species.name,baseName:species.name,stage:c.stage,stageName:STAGES[c.stage],branch:c.branch,branchName:branch?.name||null,essence:state.essence,tags:tags(state),effects:effects(state)};
  }
  function validate(state){
    requireThat(state&&state.version===VERSION,'灵兽存档版本不兼容。'); requireThat(Number.isSafeInteger(state.essence)&&state.essence>=0&&state.essence<=99,'灵兽精华损坏。');
    requireThat(Array.isArray(state.history)&&state.history.length<=12,'灵兽历程损坏。');
    if(state.companion){ const c=state.companion; requireThat(BY_ID[c.species]&&Number.isInteger(c.stage)&&c.stage>=0&&c.stage<=4,'主灵兽数据损坏。'); requireThat(c.branch===null||['wild','sacred'].includes(c.branch),'灵兽分支损坏。'); requireThat(c.stage<2?c.branch===null:!!c.branch,'灵兽阶段与分支不一致。'); }
    return true;
  }
  return Object.freeze({VERSION,STAGES,SPECIES,BY_ID,COSTS,createState,bond,canEvolve,evolve,addEssence,observe,effects,tags,summary,validate});
});
