(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSKarma = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION=1, ACTIVE_LIMIT=24, SUMMARY_LIMIT=40;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const requireThat=(ok,msg)=>{if(!ok)throw new Error(msg);};
  const SECT_NAMES={qingyun:'青云剑宗',tiangang:'天罡体宗',wanling:'万灵吞月谷',tianji:'天机道院'};
  const LIFE_NAMES={herb:'药农之子',orphan:'山野孤儿',scribe:'落第书生',servant:'宗门杂役'};
  const SECRET_NAMES={blackwind:'黑风旧窟',danxia:'丹霞遗府',outside:'界外残境'};
  const BEAST_NAMES={moonfox:'月影灵狐',thundercrane:'惊雷青鹤',stoneape:'玄岩幼猿',devourfish:'吞灵幼鲤'};
  const EVENTS=Object.freeze({
    'sect-protect':{relation:'山门之恩',title:'旧山门再来一封信',text:'当年你选择护宗。如今旧山门遇到一件不必你出手、却只有你能定下态度的事。',choices:[
      {id:'answer',name:'回应旧誓',note:'把当年的选择负责到底',xp:.07},{id:'guide',name:'只留一段指引',note:'不再替山门决定未来',xp:.04},{id:'close',name:'此缘到此为止',note:'明确结束这段关系',xp:0}]},
    'sect-leave':{relation:'山门余情',title:'山门外的一盏旧灯',text:'你离宗时没有反目。多年后，那盏为离山弟子留下的灯还亮着。',choices:[
      {id:'visit',name:'回去看一眼',note:'承认旧缘仍在',xp:.05},{id:'letter',name:'只寄回一封信',note:'保持距离，也不抹去过去',xp:.03},{id:'pass',name:'不再回头',note:'让关系自然结束',xp:0}]},
    'sect-betray':{relation:'旧宗追索',title:'旧宗终于找到你',text:'叛宗没有随机惩罚，但那次选择也没有凭空消失。旧宗把一份旧账摆到你面前。',choices:[
      {id:'face',name:'正面了结旧账',note:'把恩怨说清，不逃避来源',xp:.07},{id:'repay',name:'偿还该还的部分',note:'承认自己欠下的那一段',xp:.04},{id:'cut',name:'斩断最后联系',note:'不再领取任何旧宗收益',xp:0}]},
    life:{relation:'凡尘旧约',title:'旧日选择有了回声',text:'你曾经在凡尘做过一次重大选择。如今有人循着那次选择留下的痕迹找到了你。',choices:[
      {id:'return',name:'亲自回应',note:'让过去与现在接上',xp:.06},{id:'entrust',name:'托可信之人处理',note:'不必凡事亲临，也不推卸',xp:.04},{id:'release',name:'让旧事停在旧日',note:'明确拒绝继续延伸',xp:0}]},
    secret:{relation:'秘境遗印',title:'秘境留下的门再次发亮',text:'首通秘境时留下的印记重新出现。它不是随机新奖励，而是那次首通的延迟回声。',choices:[
      {id:'read',name:'再读一次遗印',note:'把旧发现化成新的理解',xp:.06},{id:'seal',name:'把遗印封存',note:'保留记录，不再索取',xp:.02},{id:'erase',name:'让这条路结束',note:'不再继续这段秘境因果',xp:0}]},
    beast:{relation:'灵契分途',title:'灵契记住了那次分支',text:'灵兽第一次选择妖兽或圣兽方向时，灵契里留下了一道不可逆的纹路。如今它主动回应了你。',choices:[
      {id:'resonate',name:'与它同调一次',note:'强化彼此理解，而非直接加永久战力',xp:.05,heal:8},{id:'observe',name:'只观察它的变化',note:'把选择权仍留给灵兽',xp:.03},{id:'quiet',name:'不催促这段灵契',note:'不领取额外数值收益',xp:0}]},
    boss:{relation:'妖王余烬',title:'第三只眼留下的灰烬',text:'三眼妖王已经伏诛，但它曾盘踞的地界并不会立刻恢复。余烬里留下了一个需要你决定是否收尾的问题。',choices:[
      {id:'clean',name:'亲自清理余烬',note:'把战斗之后的责任也做完',xp:.07},{id:'teach',name:'把方法留给后来人',note:'不替他们永远守着此地',xp:.05},{id:'leave',name:'让天地自行恢复',note:'不把所有后果都揽到自己身上',xp:0}]},
    ascension:{relation:'天门见证',title:'天门记得你的名字',text:'你真正踏入仙界后，那道曾在凡界打开的天门再次与你共鸣。这里没有额外飞升奖励，只有一次对过去的确认。',choices:[
      {id:'remember',name:'记住凡界来处',note:'留下历史，不增加凡界倍率',xp:0},{id:'name',name:'只留下一个名字',note:'让后来者知道有人走过',xp:0},{id:'silence',name:'不留下任何刻字',note:'让飞升只属于这一世',xp:0}]}
  });
  function createState(){return {version:VERSION,serial:0,active:[],pending:null,summaries:[]};}
  function keyExists(state,key){return state.active.some(x=>x.sourceKey===key)||state.summaries.some(x=>x.sourceKey===key);}
  function add(input,entry){validate(input);const state=clone(input);if(keyExists(state,entry.sourceKey))return state;
    const id=`k${state.serial++}`;state.active.push({id,kind:entry.kind,sourceKey:entry.sourceKey,source:entry.source,relation:EVENTS[entry.kind].relation,strength:entry.strength,createdRealm:entry.createdRealm,trigger:entry.trigger,hint:entry.hint});
    if(state.active.length>ACTIVE_LIMIT){const old=state.active.shift();state.summaries.push({...old,outcome:'旧因果已归档',settledRealm:entry.createdRealm});state.summaries=state.summaries.slice(-SUMMARY_LIMIT);}
    validate(state);return state;}
  function eligible(entry,context){return entry.trigger.type==='immortal'?!!context.immortal:Number(context.realm||0)>=entry.trigger.value;}
  function refresh(input,context={}){validate(input);const state=clone(input);if(state.pending||!context.playable)return state;const hit=state.active.find(x=>eligible(x,context));state.pending=hit?.id||null;validate(state);return state;}
  function observe(input,before,after,action){validate(input);let state=clone(input);const realm=Number(after?.realm||0);
    const sectBefore=before?.sect?.majorOutcomes?.length||0,sectAfter=after?.sect?.majorOutcomes?.length||0;
    if(sectAfter>sectBefore){const row=after.sect.majorOutcomes.at(-1),kind=`sect-${row.outcome}`;if(EVENTS[kind])state=add(state,{kind,sourceKey:`sect:${row.sect}:${row.outcome}`,source:`宗门 · ${SECT_NAMES[row.sect]||row.sect}`,strength:row.outcome==='betray'?3:2,createdRealm:realm,trigger:{type:'realm',value:Math.min(8,realm+1)},hint:'你与旧山门的关系尚未完全结束。'});}
    const lifeBefore=before?.life?.majorOutcomes?.length||0,lifeAfter=after?.life?.majorOutcomes?.length||0;
    if(lifeAfter>lifeBefore){const row=after.life.majorOutcomes.at(-1);state=add(state,{kind:'life',sourceKey:`life:${row.event}:${row.choice}`,source:`人生 · ${LIFE_NAMES[row.origin]||row.origin}`,strength:2,createdRealm:realm,trigger:{type:'realm',value:Math.min(8,realm+1)},hint:'这次凡尘选择还会在更高境界留下回声。'});}
    const secretBefore=before?.secretRealm?.history?.length||0,secretAfter=after?.secretRealm?.history?.length||0;
    if(secretAfter>secretBefore){const row=after.secretRealm.history.at(-1);if(row.firstClear)state=add(state,{kind:'secret',sourceKey:`secret:${row.realmId}:first`,source:`秘境首通 · ${SECRET_NAMES[row.realmId]||row.realmId}`,strength:2,createdRealm:realm,trigger:{type:'realm',value:Math.min(8,Math.max(3,realm+2))},hint:'首通时留下的秘境印记尚未完全沉寂。'});}
    const beastBefore=before?.spiritBeast?.history?.length||0,beastAfter=after?.spiritBeast?.history?.length||0;
    if(beastAfter>beastBefore){const row=after.spiritBeast.history.at(-1);if(row.type==='evolve'&&row.stage===2)state=add(state,{kind:'beast',sourceKey:`beast:${row.species}:${row.branch}`,source:`灵兽分支 · ${BEAST_NAMES[row.species]||row.species}`,strength:2,createdRealm:realm,trigger:{type:'realm',value:Math.min(8,realm+2)},hint:'不可逆的灵兽分支会在以后回应这次选择。'});}
    if(!before?.flags?.bossSlain&&after?.flags?.bossSlain)state=add(state,{kind:'boss',sourceKey:'boss:threeeye',source:'妖王 · 三眼妖王',strength:3,createdRealm:realm,trigger:{type:'realm',value:5},hint:'妖王已死，它留下的地界仍有余烬。'});
    if(!before?.flags?.ascended&&after?.flags?.ascended)state=add(state,{kind:'ascension',sourceKey:'ascension:first',source:'飞升 · 天门洞开',strength:3,createdRealm:realm,trigger:{type:'immortal'},hint:'真正踏入仙界后，天门会再次回应。'});
    return refresh(state,{realm,immortal:!!after?.immortal,playable:(after?.phase==='playing'&&!after?.secretRealm?.active)||!!after?.immortal});
  }
  function pendingEntry(state){validate(state);return state.pending?state.active.find(x=>x.id===state.pending)||null:null;}
  function eventFor(entry){return entry?EVENTS[entry.kind]||null:null;}
  function resolve(input,choiceId,context={}){validate(input);const state=clone(input),entry=pendingEntry(state),event=eventFor(entry);requireThat(entry&&event,'当前没有待偿因果。');
    const choice=event.choices.find(x=>x.id===choiceId);requireThat(choice,'因果回响没有这条选择。');
    state.active=state.active.filter(x=>x.id!==entry.id);state.pending=null;state.summaries.push({id:entry.id,sourceKey:entry.sourceKey,source:entry.source,relation:entry.relation,strength:entry.strength,outcome:choice.name,settledRealm:Number(context.realm||0),kind:entry.kind});state.summaries=state.summaries.slice(-SUMMARY_LIMIT);
    const next=refresh(state,context);validate(next);return {state:next,reward:{choice:choice.id,name:choice.name,xpFactor:choice.xp||0,heal:choice.heal||0,entry,event}};}
  function validate(state){requireThat(state&&state.version===VERSION,'因果存档版本不兼容。');requireThat(Number.isSafeInteger(state.serial)&&state.serial>=0&&state.serial<=100000,'因果序号损坏。');
    requireThat(Array.isArray(state.active)&&state.active.length<=ACTIVE_LIMIT&&Array.isArray(state.summaries)&&state.summaries.length<=SUMMARY_LIMIT,'因果账本超出上限。');
    const ids=new Set(),keys=new Set();for(const row of state.active){requireThat(row&&typeof row.id==='string'&&EVENTS[row.kind]&&typeof row.sourceKey==='string'&&row.sourceKey.length<160&&typeof row.source==='string'&&row.source.length<160&&row.relation===EVENTS[row.kind].relation&&Number.isInteger(row.strength)&&row.strength>=1&&row.strength<=3&&Number.isInteger(row.createdRealm)&&row.createdRealm>=0&&row.createdRealm<=9,'活跃因果损坏。');requireThat(row.trigger&&(['immortal','realm'].includes(row.trigger.type))&&(row.trigger.type==='immortal'||Number.isInteger(row.trigger.value)&&row.trigger.value>=1&&row.trigger.value<=9),'因果触发阶段损坏。');requireThat(!ids.has(row.id)&&!keys.has(row.sourceKey),'因果重复。');ids.add(row.id);keys.add(row.sourceKey);}
    for(const row of state.summaries){requireThat(row&&typeof row.sourceKey==='string'&&typeof row.source==='string'&&typeof row.relation==='string'&&typeof row.outcome==='string'&&row.outcome.length<120,'因果摘要损坏。');requireThat(!keys.has(row.sourceKey),'因果来源重复。');keys.add(row.sourceKey);}
    requireThat(state.pending===null||ids.has(state.pending),'待偿因果损坏。');return true;}
  return Object.freeze({VERSION,ACTIVE_LIMIT,SUMMARY_LIMIT,EVENTS,createState,add,refresh,observe,pendingEntry,eventFor,resolve,validate});
});
