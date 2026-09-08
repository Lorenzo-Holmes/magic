(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api; else root.FSCrafting=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1,MAX_MATERIAL=99,MAX_PILL=9;
  const MATERIALS=Object.freeze([
    {id:'spirit-herb',name:'青露灵草'},{id:'beast-bone',name:'妖兽骨粉'},{id:'spirit-dew',name:'灵泉露'},
    {id:'thunder-sand',name:'雷砂'},{id:'star-iron',name:'坠星铁屑'},{id:'blood-essence',name:'妖血精华'},
    {id:'void-dust',name:'虚空尘'},{id:'dao-ash',name:'道火余烬'}
  ]);
  const METHODS=Object.freeze([
    {id:'gentle',name:'文火慢炼',note:'稳定成丹；异丹率 8%。',variant:8},
    {id:'thunder',name:'雷火淬丹',note:'偏锋成丹；异丹率 14%。',variant:14},
    {id:'dao',name:'道火归一',note:'高阶手法；异丹率 20%。',variant:20}
  ]);
  const PILLS=Object.freeze([
    {id:'qi',name:'纳气丹',needs:{'spirit-herb':2,'spirit-dew':1},kind:'xp',amount:.08,tags:['insight','growth'],text:'立刻获得当前境界 8% 修为。'},
    {id:'spring',name:'回春丹',needs:{'spirit-herb':1,'beast-bone':1},kind:'heal',amount:30,tags:['survival','growth'],text:'恢复 30 元气。'},
    {id:'blood',name:'炼血丹',needs:{'blood-essence':2,'beast-bone':1},kind:'buff',charges:2,effects:{devour:.05,devourHeal:2},tags:['devour','growth'],text:'接下来 2 次主线行动增强吞噬。'},
    {id:'mind',name:'照心丹',needs:{'spirit-dew':2,'void-dust':1},kind:'buff',charges:2,effects:{mind:1,explore:.04},tags:['soul','insight'],text:'接下来 2 次主线行动提升神识与历练。'},
    {id:'sword',name:'洗锋丹',needs:{'thunder-sand':1,'star-iron':1},kind:'buff',charges:2,effects:{swordPower:.05},tags:['sword','thunder'],text:'接下来 2 次主线行动增强剑诀。'},
    {id:'body',name:'锻骨丹',needs:{'beast-bone':2,'dao-ash':1},kind:'buff',charges:2,effects:{guard:.04,rest:2},tags:['body','survival'],text:'接下来 2 次主线行动降低承伤并提高恢复。'},
    {id:'fortune',name:'问签丹',needs:{'spirit-dew':1,'dao-ash':1},kind:'buff',charges:2,effects:{luck:1,explore:.025},tags:['fortune','growth'],text:'接下来 2 次主线行动略增气运与历练。'},
    {id:'void',name:'虚灵丹',needs:{'void-dust':2,'spirit-herb':1},kind:'xp',amount:.12,tags:['insight','growth'],text:'立刻获得当前境界 12% 修为。'},
    {id:'thunder',name:'雷元丹',needs:{'thunder-sand':2,'spirit-dew':1},kind:'buff',charges:1,effects:{power:.04},tags:['thunder','burst'],text:'下一次主线行动获得小幅爆发。'},
    {id:'star',name:'星髓丹',needs:{'star-iron':1,'dao-ash':1,'void-dust':1},kind:'buff',charges:3,effects:{xp:.03},tags:['growth','insight'],text:'接下来 3 次主线行动全部修为 +3%。'}
  ]);
  const WEAPON_RECIPES=Object.freeze([
    {id:'sword-temper',name:'雷砂淬锋',path:'sword',needs:{'thunder-sand':2,'star-iron':1},xp:65,text:'以雷砂和星铁温养剑道本命兵器。'},
    {id:'devour-inscribe',name:'妖血铭幡',path:'devour',needs:{'blood-essence':2,'void-dust':1},xp:65,text:'以妖血和虚空尘温养吞噬本命兵器。'},
    {id:'body-quench',name:'地骨镇器',path:'body',needs:{'beast-bone':2,'dao-ash':1},xp:65,text:'以骨粉和道火温养肉身本命兵器。'},
    {id:'star-refine',name:'星髓通灵',path:'any',needs:{'star-iron':2,'dao-ash':1,'spirit-dew':1},xp:80,text:'通用高阶炼器手法，为已穿戴本命兵器注入历练。'}
  ]);
  const MATERIAL_BY_ID=Object.freeze(Object.fromEntries(MATERIALS.map(x=>[x.id,x]))),PILL_BY_ID=Object.freeze(Object.fromEntries(PILLS.map(x=>[x.id,x]))),METHOD_BY_ID=Object.freeze(Object.fromEntries(METHODS.map(x=>[x.id,x]))),WEAPON_BY_ID=Object.freeze(Object.fromEntries(WEAPON_RECIPES.map(x=>[x.id,x])));
  const clone=v=>JSON.parse(JSON.stringify(v)); const requireThat=(ok,msg)=>{if(!ok)throw new Error(msg);};
  function hash(seed,text){let h=(seed>>>0)^0x9e3779b9;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
  function createState(){return{version:VERSION,materials:Object.fromEntries(MATERIALS.map(x=>[x.id,0])),pills:{},buff:null,craftIndex:0,seenSources:[],history:[]};}
  function grantMaterial(input,id,amount,source='fixture'){
    validate(input);requireThat(MATERIAL_BY_ID[id],'未知材料。');const s=clone(input),n=Math.max(0,Math.floor(amount));s.materials[id]=Math.min(MAX_MATERIAL,s.materials[id]+n);s.history.push({type:'material',id,amount:n,source:String(source).slice(0,60)});s.history=s.history.slice(-16);validate(s);return s;
  }
  function hasNeeds(s,needs){return Object.entries(needs).every(([id,n])=>(s.materials[id]||0)>=n);}
  function pay(s,needs){for(const[id,n]of Object.entries(needs))s.materials[id]-=n;}
  function craftPill(input,seed,recipeId,methodId){
    validate(input);const recipe=PILL_BY_ID[recipeId],method=METHOD_BY_ID[methodId];requireThat(recipe&&method,'未知丹方或炼法。');requireThat(hasNeeds(input,recipe.needs),'炼丹材料不足。');requireThat((input.pills[recipeId]?.length||0)<MAX_PILL,'这类丹药携带已满。');
    const s=clone(input),roll=hash(seed,`pill|${s.craftIndex}|${recipeId}|${methodId}`)%100,variant=roll<method.variant;pay(s,recipe.needs);if(!s.pills[recipeId])s.pills[recipeId]=[];s.pills[recipeId].push(variant);s.craftIndex++;s.history.push({type:'pill',id:recipeId,method:methodId,variant});s.history=s.history.slice(-16);validate(s);return{state:s,variant,recipe,method};
  }
  function usePill(input,recipeId){
    validate(input);const recipe=PILL_BY_ID[recipeId];requireThat(recipe&&(input.pills[recipeId]?.length||0)>0,'没有可用的这枚丹药。');const s=clone(input),variant=!!s.pills[recipeId].pop();
    if(!s.pills[recipeId].length)delete s.pills[recipeId];let reward={kind:recipe.kind,amount:recipe.amount||0,variant};
    if(recipe.kind==='buff'){const scale=reward.variant?1.35:1;s.buff={id:recipeId,charges:recipe.charges,effects:Object.fromEntries(Object.entries(recipe.effects).map(([k,v])=>[k,typeof v==='number'?v*scale:v])),tags:[...recipe.tags],variant:reward.variant};}
    if(reward.variant&&recipe.kind!=='buff')reward.amount=Math.round(reward.amount*1.35*1000)/1000;
    s.history.push({type:'use',id:recipeId,variant:reward.variant});s.history=s.history.slice(-16);validate(s);return{state:s,reward,recipe};
  }
  function forgeWeapon(input,recipeId,path){
    validate(input);const recipe=WEAPON_BY_ID[recipeId];requireThat(recipe,'未知炼器配方。');requireThat(recipe.path==='any'||recipe.path===path,'这份炼器法不适合当前本命兵器。');requireThat(hasNeeds(input,recipe.needs),'炼器材料不足。');const s=clone(input);pay(s,recipe.needs);s.craftIndex++;s.history.push({type:'forge',id:recipeId,path});s.history=s.history.slice(-16);validate(s);return{state:s,weaponXp:recipe.xp,recipe};
  }
  function effects(state){validate(state);return state.buff?{...state.buff.effects}:{};}
  function buildSource(state){validate(state);if(!state.buff)return null;const recipe=PILL_BY_ID[state.buff.id];return{source:`crafting:${state.buff.id}`,name:`丹药余效 · ${recipe.name}`,tags:[...state.buff.tags],weight:1};}
  function afterAction(input,action){validate(input);const s=clone(input),type=String(action?.type||'');if(!s.buff||!['act','seek-proof','cultivate-to-ready','resolve','breakthrough','challenge-boss','tribulation-step','secret-enter','secret-choose','secret-exit','sect-resolve','life-resolve'].includes(type))return s;s.buff.charges--;if(s.buff.charges<=0)s.buff=null;validate(s);return s;}
  function observe(input,before,after,action){
    validate(input);let s=clone(input);if(String(action?.type||'').startsWith('craft-'))return s;let key=null,kind=null;
    if(before?.event?.id==='hunt'&&after?.xp>before?.xp){key=`hunt:${before.revision}`;kind='hunt';}
    else if(!before?.flags?.bossSlain&&after?.flags?.bossSlain){key='boss:threeeye';kind='boss';}
    else if((after?.realmProofs?.length||0)>(before?.realmProofs?.length||0)){key=`proof:${after.realm}`;kind='proof';}
    else if((after?.secretRealm?.history?.length||0)>(before?.secretRealm?.history?.length||0)){key=`secret:${after.secretRealm.history.length}`;kind='secret';}
    if(!key||s.seenSources.includes(key))return s;s.seenSources.push(key);if(s.seenSources.length>64)s.seenSources.shift();
    const h=hash(after?.seed||1,`${key}|${kind}`),count=kind==='boss'?3:kind==='proof'?2:1;
    for(let i=0;i<count;i++){const id=MATERIALS[(h+i*7)%MATERIALS.length].id;s.materials[id]=Math.min(MAX_MATERIAL,s.materials[id]+1);}
    s.history.push({type:'gather',source:key,count});s.history=s.history.slice(-16);validate(s);return s;
  }
  function validate(s){
    requireThat(s&&s.version===VERSION,'丹器存档版本不兼容。');requireThat(s.materials&&MATERIALS.every(x=>Number.isSafeInteger(s.materials[x.id])&&s.materials[x.id]>=0&&s.materials[x.id]<=MAX_MATERIAL),'材料数据损坏。');
    requireThat(s.pills&&Object.entries(s.pills).every(([id,list])=>PILL_BY_ID[id]&&Array.isArray(list)&&list.length>0&&list.length<=MAX_PILL&&list.every(x=>typeof x==='boolean')),'丹药背包损坏。');requireThat(Number.isSafeInteger(s.craftIndex)&&s.craftIndex>=0&&s.craftIndex<=1000000,'炼制计数损坏。');
    requireThat(Array.isArray(s.seenSources)&&s.seenSources.length<=64&&new Set(s.seenSources).size===s.seenSources.length,'材料来源损坏。');requireThat(Array.isArray(s.history)&&s.history.length<=16,'丹器历程损坏。');
    if(s.buff)requireThat(PILL_BY_ID[s.buff.id]&&Number.isInteger(s.buff.charges)&&s.buff.charges>0&&s.buff.charges<=3&&s.buff.effects&&Array.isArray(s.buff.tags),'临时丹效损坏。');return true;
  }
  return Object.freeze({VERSION,MAX_MATERIAL,MAX_PILL,MATERIALS,MATERIAL_BY_ID,METHODS,METHOD_BY_ID,PILLS,PILL_BY_ID,WEAPON_RECIPES,WEAPON_BY_ID,createState,grantMaterial,craftPill,usePill,forgeWeapon,effects,buildSource,afterAction,observe,hash,validate});
});
