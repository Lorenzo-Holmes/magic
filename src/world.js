(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./dao.js'):root.FSDao);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(A){
  'use strict';
  const VERSION=1,LIMIT=24,copy=v=>JSON.parse(JSON.stringify(v)),clamp=n=>Math.max(0,Math.min(100,n));
  const need=(ok,msg)=>{if(!ok)throw new Error(msg);};
  const OPTIONS=Object.freeze({
    aura:[{id:'abundant',name:'灵潮丰沛',text:'生机增长更快，也会放大灾劫。',value:8},{id:'balanced',name:'灵气均衡',text:'成长与界压均衡。',value:4},{id:'scarce',name:'灵机稀薄',text:'成长较慢，劫势也更轻。',value:1}],
    system:[{id:'sword',name:'剑修立世',text:'开拓更快，传承讲求破局。',value:4},{id:'body',name:'炼体为基',text:'生机稳固，更能抵挡灾劫。',value:2},{id:'soul',name:'神魂传法',text:'重视秩序与传承。',value:1}],
    dao:[{id:'own',name:'此世自创大道',text:'以已凝成的大道作为天地根本。'}],
    risk:[{id:'calamity',name:'天劫磨砺',text:'劫势强烈，秩序经历更多考验。',value:9},{id:'beasts',name:'万灵竞逐',text:'生灵相争，生机与秩序彼此牵动。',value:6},{id:'turbulence',name:'界流侵扰',text:'劫势较轻，仍需持续照拂。',value:4}],
    inheritance:[{id:'open',name:'众生共传',text:'生机扩散迅速，秩序需要照拂。',growth:8,order:1},{id:'master',name:'师徒相承',text:'传承缓慢而稳定。',growth:3,order:7},{id:'relic',name:'遗器留道',text:'以遗器保存根本，兼顾两端。',growth:5,order:4}]
  });
  const LABELS=Object.freeze({aura:'灵气规则',system:'主修体系',dao:'核心大道',risk:'世界风险',inheritance:'传承规则'});
  const TYPES=Object.freeze(['cultivation','calamity','inheritance']);
  const TITLES=Object.freeze({cultivation:'第一缕灵气流入众生',calamity:'天地迎来自己的考验',inheritance:'后来者开始写下道统'});
  const option=(key,id)=>OPTIONS[key].find(x=>x.id===id);
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function configValid(c){need(c&&typeof c==='object'&&Object.keys(c).length===5&&Object.keys(OPTIONS).every(k=>typeof c[k]==='string'&&option(k,c[k])),'世界法则包含未知或缺失选项。');}
  function defaults(){return {aura:'balanced',system:'sword',dao:'own',risk:'turbulence',inheritance:'master'};}
  function canCreate(run){return !run.world&&!!run.flags?.ascended&&run.phase==='complete'&&!!run.immortal?.evolution?.completed&&run.immortal.phase!=='dead'&&!!run.dao?.formed;}
  function seal(s){return hash(JSON.stringify([s.seed,s.config,s.rules,s.projection])).toString(16);}
  function create(run,config){
    need(canCreate(run),'先完成仙界正式结局，并凝成此世大道。');configValid(config);
    const s={version:VERSION,seed:run.seed,config:copy(config),rules:[...run.dao.formed.rules],era:'1',cursor:0,phase:'event',vitality:65,order:65,history:[],
      projection:{type:'dao',name:run.dao.formed.name,sourceSeed:run.seed,summary:'昔日修士从凡尘走到世界边缘，将此世自创大道留作新天地的功法源头。'}};
    s.seal=seal(s);validate(s);return s;
  }
  function name(s){return s.projection.name+' · 初生天地';}
  function ruleSummary(s){
    return Object.keys(OPTIONS).map(k=>({key:k,label:LABELS[k],name:k==='dao'?s.projection.name:option(k,s.config[k]).name,text:option(k,s.config[k]).text}));
  }
  function event(s){
    if(s.phase!=='event')return null;
    const type=TYPES[s.cursor],c=s.config,a=option('aura',c.aura),system=option('system',c.system),risk=option('risk',c.risk),inherit=option('inheritance',c.inheritance);
    const favorable=s.rules.includes('insight')||s.rules.includes('soul')?3:1,guard=s.rules.includes('body')||s.rules.includes('survival')?4:1;
    const variation=hash(s.seed+':'+s.era+':'+s.cursor)%3;
    let vitality,order,text;
    if(type==='cultivation'){vitality=a.value+system.value+favorable;order=inherit.order-Math.floor(risk.value/3);text='灵气开始沿着你定下的主修体系流动。丰沛与稀薄决定成长速度，道统决定众生如何共处。';}
    if(type==='calamity'){vitality=-risk.value-Math.floor(a.value/2)+guard+(c.system==='body'?4:0)-variation;order=-Math.floor(risk.value/2)+(c.system==='soul'?3:0)+Math.floor(inherit.order/3);text='世界风险化成了真实劫势。灵气越盛，冲击越大；肉身根基、守护大道和传承秩序将共同承受它。';}
    if(type==='inheritance'){vitality=inherit.growth+Math.floor(a.value/2)+system.value;order=inherit.order+favorable-Math.floor(risk.value/4);text='后来者在古史中发现了「'+s.projection.name+'」。这段真实来路开始成为新世界的功法源头。';}
    const key='e'+s.era+'-'+s.cursor;
    return {key,type,title:TITLES[type],text,choices:[
      {id:key+':flow',name:type==='cultivation'?'让众生自行修行':type==='calamity'?'按既定法则承受':'将此道传向众生',vitality,order,text:'遵循当前世界法则。'},
      {id:key+':guard',name:type==='calamity'?'收束灵机，庇护众生':'放缓扩张，稳固根基',vitality:type==='calamity'?Math.ceil(vitality/2):Math.floor(vitality/2)-2,order:order+6,text:'牺牲部分生机增长，换取更稳的秩序。'}
    ]};
  }
  function resolve(input,id){
    validate(input);const current=event(input),choice=current?.choices.find(x=>x.id===id);need(choice,'此天地事件已结束，或选择无效。');
    const s=copy(input),before={vitality:s.vitality,order:s.order};s.vitality=clamp(s.vitality+choice.vitality);s.order=clamp(s.order+choice.order);
    s.history.push({key:current.key,type:current.type,title:current.title,choice:choice.name,era:s.era,before,after:{vitality:s.vitality,order:s.order}});
    s.history=s.history.slice(-LIMIT);s.cursor++;if(s.cursor===3)s.phase='ending';validate(s);return s;
  }
  function continueWorld(input){validate(input);need(input.phase==='ending','请先完成本纪三段天地事件。');const s=copy(input);s.era=(BigInt(s.era)+1n).toString();s.cursor=0;s.phase='event';validate(s);return s;}
  function conclusion(s){return s.order>=60&&s.vitality>=50?'众生已有自己的修行与传承。你不再只问如何飞升，而是为后来者定义了抬头所见的天。':s.order<40?'这方天地仍有裂痕，但创世已成。你可以继续照拂，让众生在后续岁月里找到自己的秩序。':'天地已生，道统初立。它仍需要时间，去消化你赋予它的法则。';}
  function validate(s){
    need(s&&s.version===VERSION&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=4294967295,'创世存档版本或种子无效。');configValid(s.config);
    need(Array.isArray(s.rules)&&s.rules.length>=1&&s.rules.length<=2&&new Set(s.rules).size===s.rules.length&&s.rules.every(id=>A.RULES.some(r=>r.id===id))&&s.rules.every(id=>s.rules.every(other=>!A.CONFLICTS[id].includes(other))),'创世大道规则无效。');
    need(s.projection&&s.projection.type==='dao'&&s.projection.sourceSeed===s.seed&&typeof s.projection.name==='string'&&s.projection.name.length>0&&s.projection.name.length<=60&&typeof s.projection.summary==='string'&&s.projection.summary.length<=150,'历史投影损坏。');
    need(s.seal===seal(s),'世界法则与创世来源不一致。');
    need(typeof s.era==='string'&&/^[1-9]\d{0,127}$/.test(s.era)&&Number.isInteger(s.cursor)&&s.cursor>=0&&s.cursor<=3&&['event','ending'].includes(s.phase)&&(s.phase==='ending')===(s.cursor===3),'世界纪元或阶段损坏。');
    need(Number.isInteger(s.vitality)&&s.vitality>=0&&s.vitality<=100&&Number.isInteger(s.order)&&s.order>=0&&s.order<=100,'世界状态超出范围。');
    need(Array.isArray(s.history)&&s.history.length<=LIMIT,'世界历史超限。');
    const completed=(BigInt(s.era)-1n)*3n+BigInt(s.cursor);
    need(s.history.length===Number(completed>BigInt(LIMIT)?BigInt(LIMIT):completed),'世界历史与纪元不一致。');
    const keys=new Set();for(const row of s.history){need(row&&TYPES.includes(row.type)&&typeof row.key==='string'&&row.key.length<=140&&!keys.has(row.key)&&typeof row.era==='string'&&/^[1-9]\d{0,127}$/.test(row.era)&&BigInt(row.era)<=BigInt(s.era)&&row.title===TITLES[row.type]&&typeof row.choice==='string'&&row.choice.length<=40,'世界历史条目损坏。');keys.add(row.key);for(const snap of [row.before,row.after])need(snap&&['vitality','order'].every(k=>Number.isInteger(snap[k])&&snap[k]>=0&&snap[k]<=100),'世界历史数值损坏。');}
    if(s.history.length){const last=s.history.at(-1);need(last.after.vitality===s.vitality&&last.after.order===s.order,'世界现状与最后史册不一致。');}
    return true;
  }
  return Object.freeze({VERSION,LIMIT,OPTIONS,LABELS,TYPES,defaults,canCreate,create,name,ruleSummary,event,resolve,continueWorld,conclusion,validate});
});
