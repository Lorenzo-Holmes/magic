(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./build.js'):root.FSBuild);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSDao=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(B){
  'use strict';
  const VERSION=1,LIMIT=48,MIN_SAMPLES=12;
  const ROOTS=Object.freeze(['太初','归墟','照夜','玄微','长生','无相','破晓','沧溟','星垂','天衡']);
  const KINDS=Object.freeze({cultivate:'静修',explore:'历练',hunt:'狩猎',devour:'吞噬',combat:'交锋',breakthrough:'破境',tribulation:'渡劫',karma:'偿还因果',immortal:'仙界修行'});
  const RULES=Object.freeze([
    {id:'sword',name:'断障',kind:'hunt',xp:.06,heal:0,charges:3,text:'狩猎后补益当前境界所需修为的 6%，此世最多三次。'},
    {id:'devour',name:'归元',kind:'devour',xp:0,heal:6,charges:3,text:'吞噬后恢复 6 元气，此世最多三次。'},
    {id:'body',name:'不动',kind:'combat',xp:0,heal:8,charges:3,text:'交锋后恢复 8 元气，此世最多三次。'},
    {id:'soul',name:'照幽',kind:'explore',xp:.05,heal:0,charges:3,text:'历练后补益当前境界所需修为的 5%，此世最多三次。'},
    {id:'fortune',name:'逢隙',kind:'karma',xp:0,heal:10,charges:2,text:'偿还因果后恢复 10 元气，此世最多两次。'},
    {id:'insight',name:'明心',kind:'cultivate',xp:.04,heal:0,charges:3,text:'静修后补益当前境界所需修为的 4%，此世最多三次。'},
    {id:'survival',name:'守一',kind:'breakthrough',xp:.03,heal:0,charges:2,text:'破境后补益新境界所需修为的 3%，此世最多两次。'},
    {id:'burst',name:'惊雷',kind:'tribulation',xp:0,heal:8,charges:2,text:'渡劫后恢复 8 元气，此世最多两次。'}
  ].map(Object.freeze));
  // Symmetric exclusions keep mutually opposed rule components out of one Dao.
  const CONFLICTS=Object.freeze({sword:['devour'],devour:['sword'],body:['soul'],soul:['body'],fortune:['insight'],insight:['fortune'],survival:['burst'],burst:['survival']});
  const byId=id=>RULES.find(r=>r.id===id),copy=v=>JSON.parse(JSON.stringify(v));
  const demand=(ok,msg)=>{if(!ok)throw new Error(msg);};
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function createState(){return {version:VERSION,total:0,samples:[],formed:null,used:{}};}
  function kind(before,after,a){
    if(after.devours>before.devours)return 'devour';
    if(a.type==='tribulation-step')return 'tribulation';
    if(a.type==='breakthrough')return 'breakthrough';
    if(a.type==='karma-resolve')return 'karma';
    if(after.combatReplay&&after.combatReplay.id!==before.combatReplay?.id)return 'combat';
    if(a.type==='act')return KINDS[a.kind]?a.kind:null;
    if(a.type==='cultivate-to-ready'&&after.actions>before.actions)return 'cultivate';
    if(a.type==='seek-proof')return 'explore';
    if(a.type.startsWith('immortal-')&&before.immortal&&after.immortal?.days>before.immortal.days)return 'immortal';
    if(a.type==='resolve'&&before.event?.id!==after.event?.id)return 'explore';
    return null;
  }
  function observe(input,before,after,action){
    if(input.formed)return input;
    const k=kind(before,after,action);if(!k)return input;
    const value=B.evaluateBuild(before),main=value.main;if(!main)return input;
    const s=copy(input);s.total=Math.min(1000000,s.total+1);
    const equipment=[...new Set(value.sources.filter(x=>x.source.startsWith('equipment:')).flatMap(x=>x.tags))].filter(x=>byId(x)).sort();
    const route=String(action.id||action.choice||action.kind||(action.type==='seek-proof'?'explore':action.type)).slice(0,80);
    s.samples.push({n:s.total,kind:k,main,realm:after.realm,route,equipment});
    s.samples=s.samples.slice(-LIMIT);return s;
  }
  function compile(s,seed){
    const scores=Object.fromEntries(B.PRIMARY.map(x=>[x,0]));
    for(const row of s.samples)scores[row.main]++;
    const main=B.PRIMARY.slice().sort((a,b)=>scores[b]-scores[a]||B.PRIMARY.indexOf(a)-B.PRIMARY.indexOf(b))[0];
    const recent=s.samples.slice(-12),stable=recent.filter(x=>x.main===main).length;
    const behavior={cultivate:'insight',explore:'soul',hunt:'sword',devour:'devour',combat:'body',breakthrough:'survival',tribulation:'burst',karma:'fortune',immortal:'insight'};
    const secondaryScores=Object.fromEntries(RULES.map(x=>[x.id,0]));
    for(const row of s.samples){secondaryScores[behavior[row.kind]]+=2;for(const tag of row.equipment)secondaryScores[tag]++;}
    const secondary=RULES.map(x=>x.id).filter(id=>id!==main&&!CONFLICTS[main].includes(id)&&secondaryScores[id]>0).sort((a,b)=>secondaryScores[b]-secondaryScores[a]||RULES.findIndex(x=>x.id===a)-RULES.findIndex(x=>x.id===b))[0]||null;
    const fingerprint=hash(JSON.stringify([seed,s.samples])).toString(16).padStart(8,'0');
    const rules=[main,...secondary?[secondary]:[]];
    const name=ROOTS[hash(fingerprint)%ROOTS.length]+B.TAGS[main]+(secondary?byId(secondary).name:'守真')+'道';
    return {main,secondary,rules,name,fingerprint,stable,ready:s.samples.length>=MIN_SAMPLES&&stable>=9};
  }
  function preview(s,run){const result=compile(s,run.seed);return {...result,ready:result.ready&&run.realm>=4&&s.samples.some(r=>r.realm>=4)&&!s.formed&&run.phase!=='dead'&&run.immortal?.phase!=='dead',formed:s.formed};}
  function form(input,run){
    validate(input);const p=preview(input,run);demand(p.ready,'大道尚未稳定：元婴以后，至少十二段行为，最近十二段中九段主脉一致。');
    const s=copy(input);s.formed={seed:run.seed,name:p.name,main:p.main,secondary:p.secondary,rules:p.rules,fingerprint:p.fingerprint};s.used=Object.fromEntries(p.rules.map(id=>[id,0]));validate(s);return s;
  }
  function afterAction(input,before,after,action,threshold){
    if(!input.formed||['complete','dead','talents','attributes'].includes(after.phase)||after.immortal)return {state:input,rewards:[]};
    const k=kind(before,after,action),s=copy(input),rewards=[];
    for(const id of s.formed.rules){const rule=byId(id);if(k===rule.kind&&s.used[id]<rule.charges){s.used[id]++;rewards.push({id,name:rule.name,xp:Math.floor(threshold*rule.xp),heal:rule.heal});}}
    return {state:s,rewards};
  }
  function validate(s){
    demand(s&&s.version===VERSION&&Number.isInteger(s.total)&&s.total>=0&&s.total<=1000000,'大道记录损坏。');
    demand(Array.isArray(s.samples)&&s.samples.length<=LIMIT&&s.samples.length<=s.total,'大道行为记录超限。');
    let previous=0;
    for(const row of s.samples){demand(row&&Number.isInteger(row.n)&&row.n>=previous&&row.n<=s.total&&row.n>0&&KINDS[row.kind]&&B.PRIMARY.includes(row.main)&&Number.isInteger(row.realm)&&row.realm>=0&&row.realm<=9&&typeof row.route==='string'&&row.route.length<=80,'大道行为来源损坏。');previous=row.n;demand(Array.isArray(row.equipment)&&row.equipment.length<=RULES.length&&new Set(row.equipment).size===row.equipment.length&&row.equipment.every(x=>byId(x)),'大道装备来源损坏。');}
    demand(s.used&&typeof s.used==='object'&&!Array.isArray(s.used),'大道次数损坏。');
    if(s.formed){demand(Number.isInteger(s.formed.seed)&&s.formed.seed>0&&s.formed.seed<=4294967295,'大道种子损坏。');const p=compile(s,s.formed.seed);demand(p.ready&&s.samples.some(r=>r.realm>=4)&&s.formed.name===p.name&&s.formed.main===p.main&&s.formed.secondary===p.secondary&&JSON.stringify(s.formed.rules)===JSON.stringify(p.rules)&&s.formed.fingerprint===p.fingerprint,'大道规则与行为来源不一致。');demand(Object.keys(s.used).length===p.rules.length&&p.rules.every(id=>Number.isInteger(s.used[id])&&s.used[id]>=0&&s.used[id]<=byId(id).charges),'大道次数超出上限。');}
    else demand(Object.keys(s.used).length===0,'尚未创道不能预支效果。');
    return true;
  }
  return Object.freeze({VERSION,LIMIT,MIN_SAMPLES,ROOTS,KINDS,RULES,CONFLICTS,createState,observe,preview,form,afterAction,validate});
});
