(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./data.js') : root.FSData,
    typeof module === 'object' && module.exports ? require('./equipment.js') : root.FSEquipment,
    typeof module === 'object' && module.exports ? require('./sect.js') : root.FSSect,
    typeof module === 'object' && module.exports ? require('./life.js') : root.FSLife
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSBuild = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, G, X, L) {
  'use strict';
  const VERSION = 1;
  const TAGS = Object.freeze({
    sword:'剑道', thunder:'雷霆', devour:'吞噬', body:'肉身', soul:'神魂', fortune:'气运', insight:'悟道', survival:'生存', burst:'爆发', growth:'成长'
  });
  const PRIMARY = Object.freeze(['devour','sword','body','soul','fortune','insight']);
  const PATH_TAG = Object.freeze({ '吞噬':'devour','剑道':'sword','肉身':'body','神魂':'soul','气运':'fortune','修炼':'insight' });
  const MUTATION_TAGS = Object.freeze({ redscale:['body','survival'], serpenteye:['soul','insight'], serpentblood:['devour','growth'] });
  const FUSION_TAGS = Object.freeze({
    'thunder-sword':['sword','thunder','burst'], 'devour-body':['devour','body','growth'], 'dragon-blood':['devour','body','growth'],
    'golden-body':['body','survival'], 'flame-scale':['body','burst'], 'abyss-eye':['soul','insight'], 'fate-veil':['fortune','survival'], 'five-unity':['insight','growth']
  });
  const ROOT_TAGS = Object.freeze({ thunder:['thunder','burst'], metal:['sword'], wood:['growth'], water:['insight','growth'], mixed:['insight'] });
  const ROUTE_TAGS = Object.freeze({
    'sword-break':['sword','burst'], 'devour-eye':['devour','burst'], 'body-charge':['body','survival'], 'see-through':['soul','insight'], fate:['fortune'], fight:['burst'],
    sword:['sword','thunder'], 'cut-gate':['sword','burst'], devour:['devour','growth'], 'eat-gate':['devour','growth'], body:['body','survival'], 'step-gate':['body','survival'],
    mind:['soul','insight'], dao:['insight','growth'], 'fate-gate':['fortune','growth']
  });
  const SYNERGIES = Object.freeze([
    {id:'thunder-sword',name:'雷剑同鸣',requires:['sword','thunder'],effects:{power:.05},text:'战力 +5%｜剑意借雷势成锋。'},
    {id:'sword-burst',name:'一线破界',requires:['sword','burst'],effects:{bossPower:.06},text:'首领有效战力 +6%｜锋芒集中于关键破局。'},
    {id:'devour-growth',name:'以战养道',requires:['devour','growth'],effects:{devour:.08},text:'吞噬修为 +8%｜所得立即反哺成长。'},
    {id:'devour-survival',name:'血食续命',requires:['devour','survival'],effects:{devourHeal:3},text:'吞噬额外恢复 3 元气。'},
    {id:'body-survival',name:'岳峙不移',requires:['body','survival'],effects:{guard:.04},text:'战斗损伤再降低 4%。'},
    {id:'body-burst',name:'一力破万法',requires:['body','burst'],effects:{power:.04},text:'战力 +4%｜以肉身把爆发落到实处。'},
    {id:'soul-insight',name:'照见其理',requires:['soul','insight'],effects:{explore:.05},text:'历练修为 +5%｜看破之后更易参悟。'},
    {id:'soul-fortune',name:'灵台知机',requires:['soul','fortune'],effects:{mind:1},text:'神识 +1｜机缘临近前先见其兆。'},
    {id:'fortune-growth',name:'顺势而生',requires:['fortune','growth'],effects:{explore:.04},text:'历练修为 +4%｜把偶然转化为成长。'},
    {id:'fortune-survival',name:'逢凶化隙',requires:['fortune','survival'],effects:{guard:.03},text:'战斗损伤再降低 3%。'},
    {id:'insight-growth',name:'一念百通',requires:['insight','growth'],effects:{cultivate:.05},text:'闭关修为 +5%｜理解本身成为修行效率。'},
    {id:'insight-survival',name:'知止不殆',requires:['insight','survival'],effects:{xp:.03},text:'全部修为 +3%｜少走错路也是增长。'},
    {id:'thunder-body',name:'雷炼道躯',requires:['thunder','body'],effects:{guard:.03},text:'战斗损伤再降低 3%｜雷意先淬自身。'},
    {id:'devour-burst',name:'饕餮一口',requires:['devour','burst'],effects:{power:.04},text:'战力 +4%｜吞噬之势集中爆发。'},
    {id:'sword-insight',name:'剑理归一',requires:['sword','insight'],effects:{swordPower:.06},text:'剑诀有效战力 +6%｜剑不止锋利，也有其理。'}
  ].map(Object.freeze));
  function addSource(list, source, name, tags, weight=1) {
    const clean=[...new Set((tags||[]).filter(tag=>TAGS[tag]))]; if (!clean.length) return;
    list.push({source,id:String(source),name:String(name),tags:clean,weight});
  }
  function sources(state) {
    const list=[]; if (!state) return list;
    for (const id of state.talents||[]) { const t=D.TALENTS.find(x=>x.id===id); if (t) addSource(list,`talent:${id}`,t.name,[PATH_TAG[t.path], t.effects?.power||t.effects?.swordPower?'burst':null, t.effects?.guard||t.effects?.extraLife?'survival':null, t.effects?.xp||t.effects?.cultivate||t.effects?.explore?'growth':null],2); }
    const raw=state.stats||{};
    if ((raw.bone||0)>=8) addSource(list,'stat:bone','高根骨',['body','survival'],1);
    if ((raw.mind||0)>=8) addSource(list,'stat:mind','高神识',['soul','insight'],1);
    if ((raw.luck||0)>=8) addSource(list,'stat:luck','高气运',['fortune','growth'],1);
    if ((raw.insight||0)>=8) addSource(list,'stat:insight','高悟性',['insight','growth'],1);
    if (state.root) addSource(list,`root:${state.root}`,D.ROOTS.find(x=>x.id===state.root)?.name||state.root,ROOT_TAGS[state.root],1);
    if (state.sword) addSource(list,'art:sword','青云剑诀',['sword','burst'],2);
    for (const id of state.mutations||[]) addSource(list,`mutation:${id}`,D.MUTATIONS.find(x=>x.id===id)?.name||id,MUTATION_TAGS[id],2);
    for (const id of state.fusions||[]) addSource(list,`fusion:${id}`,D.FUSIONS.find(x=>x.id===id)?.name||id,FUSION_TAGS[id],3);
    for (const id of [state.bossRoute,...(state.tribulationRoutes||[])].filter(Boolean)) addSource(list,`route:${id}`,id,ROUTE_TAGS[id]||ROUTE_TAGS[String(id).replace(/^trace-/,'')],1);
    if (state.equipment) for (const [slot,uid] of Object.entries(state.equipment.slots||{})) {
      const entry=uid&&state.equipment.inventory?.find(x=>x.uid===uid), def=G?.data(entry); if (!entry||!entry.identified||!def) continue;
      const tags=[]; if(def.special&&def.path) tags.push(def.path); if(def.effects.swordPower)tags.push('sword'); if(def.effects.devour)tags.push('devour'); if(def.effects.guard||def.effects.bone)tags.push('survival','body'); if(def.effects.mind)tags.push('soul'); if(def.effects.luck)tags.push('fortune'); if(def.effects.insight||def.effects.xp||def.effects.cultivate||def.effects.explore)tags.push('insight','growth'); if(def.effects.power||def.effects.bossPower)tags.push('burst');
      addSource(list,`equipment:${slot}:${def.id}`,def.name,tags,def.special?3:1);
    }
    if (state.sect?.membership && X?.data) {
      const sect=X.data(state.sect.membership);
      if (sect) addSource(list,`sect:${sect.id}`,sect.name,sect.tags,state.sect.heritageUnlocked?2:1);
    }
    if (state.life && L?.buildSources) for (const item of L.buildSources(state.life)) addSource(list,item.source,item.name,item.tags,item.weight);
    return list;
  }
  function evaluateTags(inputTags) {
    const set=new Set(inputTags||[]);
    return SYNERGIES.filter(rule=>rule.requires.every(tag=>set.has(tag)));
  }
  function evaluateBuild(state) {
    const src=sources(state), scores=Object.fromEntries(Object.keys(TAGS).map(id=>[id,0]));
    for(const s of src) for(const tag of s.tags) scores[tag]+=s.weight;
    const ordered=Object.entries(scores).filter(([,score])=>score>0).sort((a,b)=>b[1]-a[1]||Object.keys(TAGS).indexOf(a[0])-Object.keys(TAGS).indexOf(b[0]));
    const primaryScores=ordered.filter(([id])=>PRIMARY.includes(id));
    const tags=ordered.map(([id])=>id), synergies=evaluateTags(tags);
    const effect={}; for(const synergy of synergies) for(const [key,value] of Object.entries(synergy.effects)) effect[key]=(effect[key]||0)+value;
    const main=primaryScores[0]?.[0]||null, sub=primaryScores[1]?.[0]||null;
    const result={version:VERSION,main,sub,tags:ordered.map(([id,score])=>({id,name:TAGS[id],score})),sources:src,synergies,effects:effect,
      explanation: main ? `主脉「${TAGS[main]}」${sub?`，辅脉「${TAGS[sub]}」`:''}；由 ${src.length} 个真实来源形成 ${synergies.length} 条可解释协同。` : '当前来源不足，道途协同尚未显形。'};
    return result;
  }
  function effects(state){
    const tags=new Set(); for(const source of sources(state)) for(const tag of source.tags) tags.add(tag);
    const effect={}; for(const rule of SYNERGIES) if(rule.requires.every(tag=>tags.has(tag))) for(const [key,value] of Object.entries(rule.effects)) effect[key]=(effect[key]||0)+value;
    return effect;
  }
  return Object.freeze({VERSION,TAGS,PRIMARY,SYNERGIES,sources,evaluateTags,evaluateBuild,effects});
});
