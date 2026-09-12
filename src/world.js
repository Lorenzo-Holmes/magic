(function(root,factory){
  const api=factory(
    typeof module==='object'&&module.exports?require('./dao.js'):root.FSDao,
    typeof module==='object'&&module.exports?require('./evolution.js'):root.FSEvolution
  );
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(A,V){
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
  const PATH_NAMES=Object.freeze({devour:'吞噬',sword:'锋芒',body:'不灭',soul:'破妄',fortune:'命线',insight:'归一'});
  const LAW_NAMES=Object.freeze({devour:'吞噬',sword:'锋芒',body:'不灭',soul:'破妄',fortune:'命线',insight:'归一'});
  const STORY_NODES=Object.freeze([
    Object.freeze({id:'first-awakening',title:'第一位感灵者',text:'山村里，一个孩子第一次听见草木间的灵气。没有祖师、没有功法，也没有人告诉她这意味着什么。',choices:Object.freeze([
      Object.freeze({id:'open',name:'让她看见完整灵潮',text:'让最初的修行来自理解，而非神谕。',vitality:7,order:1}),
      Object.freeze({id:'veil',name:'只留一缕可循之息',text:'给道路，不替她跳过摸索。',vitality:4,order:5})
    ])}),
    Object.freeze({id:'first-manual',title:'第一部功法',text:'感灵者将自己的呼吸、失败与领悟写成十二页薄册。后来者第一次可以不从零开始。',choices:Object.freeze([
      Object.freeze({id:'common',name:'允许功法公开抄传',text:'知识扩散更快，也会出现更多歧路。',vitality:8,order:-1}),
      Object.freeze({id:'lineage',name:'先由少数人校正传承',text:'传得慢，但每一代都知道自己改过什么。',vitality:3,order:6})
    ])}),
    Object.freeze({id:'first-sect',title:'第一座宗门',text:'修士开始聚居。有人想立门规、收弟子，也有人担心第一堵山门会成为后来所有人的门槛。',choices:Object.freeze([
      Object.freeze({id:'charter',name:'允许宗门立约',text:'让组织承担传承责任，也接受规则的代价。',vitality:4,order:7}),
      Object.freeze({id:'roads',name:'先保留散修之路',text:'不让山门垄断修行资格。',vitality:6,order:2})
    ])}),
    Object.freeze({id:'first-demon',title:'第一位妖修',text:'一只山鹿在灵泉边开了灵智。它学会吐纳，却被人类修士称作“异类”。这个世界第一次必须回答：谁才算众生。',choices:Object.freeze([
      Object.freeze({id:'equal',name:'承认万灵皆可修行',text:'修行资格不以人形为界。',vitality:7,order:3}),
      Object.freeze({id:'boundary',name:'先立互不相害之约',text:'承认其道，同时给冲突划出边界。',vitality:4,order:7})
    ])}),
    Object.freeze({id:'first-conflict',title:'第一场修士冲突',text:'两支传承为同一条灵脉拔剑。过去凡人的争执第一次被修为放大到足以毁掉一座城。',choices:Object.freeze([
      Object.freeze({id:'mediate',name:'让双方自己停剑议约',text:'秩序由冲突中的人共同承担。',vitality:-2,order:8}),
      Object.freeze({id:'divide',name:'重划灵脉，强制止战',text:'你可以止住这一战，但众生会记得天曾出手。',vitality:2,order:4})
    ])}),
    Object.freeze({id:'first-calamity',title:'第一场天地灾劫',text:'灵潮过盛，天火从云层落下。众生第一次意识到：修行并不意味着天地永远站在他们这一边。',choices:Object.freeze([
      Object.freeze({id:'shelter',name:'削弱这一场天火',text:'让文明活下来，再自己记住灾劫为何发生。',vitality:-3,order:7}),
      Object.freeze({id:'endure',name:'让世界按既定法则承受',text:'不替众生取消代价，但保留灾后重建的可能。',vitality:-8,order:3})
    ])}),
    Object.freeze({id:'first-ascender',title:'第一位试图飞升的人',text:'数百年后，有人走到世界最高处。他没有见过你，只在古史里读过一条从凡尘延伸而来的道。现在，他也想叩天门。',choices:Object.freeze([
      Object.freeze({id:'gate',name:'让天门真实存在',text:'飞升不保证成功，但世界允许有人继续向外走。',vitality:3,order:5}),
      Object.freeze({id:'trial',name:'让他先回答自己的三问',text:'门不会因渴望自动开启，修行必须有自己的结论。',vitality:1,order:7})
    ])}),
    Object.freeze({id:'after-ascension',title:'第一位飞升者留下什么',text:'那个人终于越过界壁。他没有返回，只留下最后一段神念：天外还有天，而且那里同样会让强者重新学会弱小。',choices:Object.freeze([
      Object.freeze({id:'record',name:'把这段话写入所有道统',text:'让后人知道飞升不是终极奖励。',vitality:5,order:5}),
      Object.freeze({id:'legend',name:'只把它留作一则传说',text:'不给答案，让后来者亲自验证。',vitality:3,order:3})
    ])}),
    Object.freeze({id:'all-ask',title:'众生共问天',text:'又过许多年，修士、凡人、妖修与宗门同时抬头。他们不再问“谁最强”，而是问：这片天究竟希望众生走向哪里？',choices:Object.freeze([
      Object.freeze({id:'listen',name:'先听完所有声音',text:'不提前替终局作答。',vitality:3,order:6}),
      Object.freeze({id:'silence',name:'保持沉默',text:'让最后的答案只在你真正选择时出现。',vitality:2,order:4})
    ])})
  ]);
  const ENDINGS=Object.freeze([
    Object.freeze({id:'nameless',name:'天道无名',text:'你撤去自己的名字与意志，只留下稳定的法则。此后众生不会再得到“天道替你选择”的答案。'}),
    Object.freeze({id:'solitary',name:'大道独行',text:'你保留一条清晰而艰难的证道路。不是所有人都必须飞升，但任何真正走到尽头的人都能凭自己的道离开。'}),
    Object.freeze({id:'all-ascend',name:'众生皆可飞升',text:'你让天门成为世界规则的一部分。凡人、修士与万灵都可以寻找自己的门，资格不再由出身与宗门垄断。'})
  ]);
  const option=(key,id)=>OPTIONS[key].find(x=>x.id===id);
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function bridgeValid(bridge){
    need(bridge&&typeof bridge==='object'&&!Array.isArray(bridge)&&bridge.version===1&&Number.isInteger(bridge.sourceSeed)&&bridge.sourceSeed>0&&bridge.sourceSeed<=4294967295,'证道桥梁来源损坏。');
    need(PATH_NAMES[bridge.lineage]&&LAW_NAMES[bridge.law]&&typeof bridge.mortalFusion==='string','证道桥梁道基损坏。');
    need(bridge.slots&&typeof bridge.slots==='object'&&!Array.isArray(bridge.slots)&&Object.keys(bridge.slots).length===Object.keys(V.SLOTS).length,'证道桥梁五槽损坏。');
    for(const [slot,item] of Object.entries(bridge.slots))need(Object.hasOwn(V.SLOTS,slot)&&item&&V.TRAITS.some(t=>t.id===item.id&&t.slot===slot)&&Number.isInteger(item.level)&&item.level>=1&&item.level<=5,'证道桥梁五槽损坏。');
    return true;
  }
  function bridgeRules(bridge){
    bridgeValid(bridge);const out=[bridge.lineage];
    if(bridge.law!==bridge.lineage&&!A.CONFLICTS[bridge.lineage].includes(bridge.law))out.push(bridge.law);
    return out;
  }
  function bridgeProjection(bridge){
    bridgeValid(bridge);const law=LAW_NAMES[bridge.law],lineage=PATH_NAMES[bridge.lineage];
    return {type:'bridge',name:`${lineage}${law}${lineage===law?'守真':'合一'}道`,sourceSeed:bridge.sourceSeed,summary:`从凡尘飞升、穿过四界并留下五槽进化后，${lineage}道途与${law}法则成为第三卷开天时唯一被允许跨卷的旧史。`};
  }
  function configValid(c){need(c&&typeof c==='object'&&Object.keys(c).length===5&&Object.keys(OPTIONS).every(k=>typeof c[k]==='string'&&option(k,c[k])),'世界法则包含未知或缺失选项。');}
  function defaults(){return {aura:'balanced',system:'sword',dao:'own',risk:'turbulence',inheritance:'master'};}
  function canCreate(run){return !!run&&!run.world&&(run.storyOrigin?.chapter==='dao'&&bridgeValid(run.storyOrigin.bridge)||!!run.flags?.ascended&&run.phase==='complete'&&!!run.immortal?.evolution?.completed&&run.immortal.phase!=='dead'&&!!run.dao?.formed);}
  function seal(s){return hash(JSON.stringify([s.seed,s.config,s.rules,s.projection])).toString(16);}
  function create(run,config){
    need(canCreate(run),'先完成仙界正式结局，并凝成此世大道。');configValid(config);
    const bridge=run.storyOrigin?.chapter==='dao'?run.storyOrigin.bridge:null,projection=bridge?bridgeProjection(bridge):{type:'dao',name:run.dao.formed.name,sourceSeed:run.seed,summary:'昔日修士从凡尘走到世界边缘，将此世自创大道留作新天地的功法源头。'};
    const s={version:VERSION,seed:bridge?.sourceSeed||run.seed,config:copy(config),rules:bridge?bridgeRules(bridge):[...run.dao.formed.rules],era:'1',cursor:0,phase:'event',vitality:65,order:65,history:[],projection,
      story:bridge?{version:1,cursor:0,ending:null,completed:false,sandbox:false}:null};
    s.seal=seal(s);validate(s);return s;
  }
  function sourceName(run){return run?.storyOrigin?.chapter==='dao'?bridgeProjection(run.storyOrigin.bridge).name:run?.dao?.formed?.name||'此世大道';}
  function name(s){return s.projection.name+' · 初生天地';}
  function ruleSummary(s){
    return Object.keys(OPTIONS).map(k=>({key:k,label:LABELS[k],name:k==='dao'?s.projection.name:option(k,s.config[k]).name,text:option(k,s.config[k]).text}));
  }
  function storyEvent(s){
    if(!s.story||s.story.sandbox||s.phase!=='event')return null;
    const node=STORY_NODES[s.story.cursor];if(!node)return null;
    const aura=option('aura',s.config.aura),system=option('system',s.config.system),risk=option('risk',s.config.risk),inherit=option('inheritance',s.config.inheritance);
    const growth=Math.floor((aura.value+system.value+inherit.growth)/5),stability=Math.floor((inherit.order+(s.config.system==='soul'?2:0)-(risk.value>=9?1:0))/4);
    return {key:`s1-${s.story.cursor}`,type:node.id,title:node.title,text:node.text,story:true,index:s.story.cursor+1,total:STORY_NODES.length,choices:node.choices.map((choice,index)=>({
      id:`s1-${s.story.cursor}:${choice.id}`,name:choice.name,text:choice.text,vitality:choice.vitality+(index===0?growth:Math.floor(growth/2)),order:choice.order+(index===1?stability:Math.floor(stability/2))
    }))};
  }
  function event(s){
    if(s.phase!=='event')return null;
    if(s.story&&!s.story.sandbox)return storyEvent(s);
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
  function endingChoices(s){validate(s);need(s.story&&!s.story.sandbox&&s.phase==='ending-choice'&&!s.story.completed,'当前没有待选择的证道终局。');return ENDINGS.map(item=>copy(item));}
  function chooseEnding(input,id){
    validate(input);need(input.story&&!input.story.sandbox&&input.phase==='ending-choice'&&!input.story.completed,'当前不能决定证道终局。');const ending=ENDINGS.find(x=>x.id===id);need(ending,'未知证道终局。');
    const s=copy(input);s.story.ending=ending.id;s.story.completed=true;s.phase='ending';validate(s);return s;
  }
  function resolve(input,id){
    validate(input);const current=event(input),choice=current?.choices.find(x=>x.id===id);need(choice,'此天地事件已结束，或选择无效。');
    const s=copy(input),before={vitality:s.vitality,order:s.order};s.vitality=clamp(s.vitality+choice.vitality);s.order=clamp(s.order+choice.order);
    s.history.push({key:current.key,type:current.type,title:current.title,choice:choice.name,era:s.era,before,after:{vitality:s.vitality,order:s.order}});
    s.history=s.history.slice(-LIMIT);
    if(s.story&&!s.story.sandbox){s.story.cursor++;if(s.story.cursor===STORY_NODES.length)s.phase='ending-choice';}
    else {s.cursor++;if(s.cursor===3)s.phase='ending';}
    validate(s);return s;
  }
  function continueWorld(input){
    validate(input);need(input.phase==='ending','请先完成当前天地结局。');const s=copy(input);
    if(s.story&&!s.story.sandbox){need(s.story.completed,'先明确第三卷证道终局。');s.story.sandbox=true;s.era='2';s.cursor=0;s.phase='event';}
    else{s.era=(BigInt(s.era)+1n).toString();s.cursor=0;s.phase='event';}
    validate(s);return s;
  }
  function conclusion(s){
    if(s.story?.completed&&!s.story.sandbox){const ending=ENDINGS.find(x=>x.id===s.story.ending);return `${ending.text} ${s.order>=60&&s.vitality>=50?'此刻天地生机与秩序都足以让这个选择由众生继续承担。':s.order<40?'天地仍有裂痕；你的终局不是完美答案，而是这方世界必须继续面对的规则。':'天地已经能够延续，但仍会用漫长岁月检验这条路。'}`;}
    return s.order>=60&&s.vitality>=50?'众生已有自己的修行与传承。你不再只问如何飞升，而是为后来者定义了抬头所见的天。':s.order<40?'这方天地仍有裂痕，但创世已成。你可以继续照拂，让众生在后续岁月里找到自己的秩序。':'天地已生，道统初立。它仍需要时间，去消化你赋予它的法则。';
  }
  function validate(s){
    need(s&&s.version===VERSION&&Number.isInteger(s.seed)&&s.seed>0&&s.seed<=4294967295,'创世存档版本或种子无效。');configValid(s.config);
    need(Array.isArray(s.rules)&&s.rules.length>=1&&s.rules.length<=2&&new Set(s.rules).size===s.rules.length&&s.rules.every(id=>A.RULES.some(r=>r.id===id))&&s.rules.every(id=>s.rules.every(other=>!A.CONFLICTS[id].includes(other))),'创世大道规则无效。');
    need(s.projection&&['dao','bridge'].includes(s.projection.type)&&s.projection.sourceSeed===s.seed&&typeof s.projection.name==='string'&&s.projection.name.length>0&&s.projection.name.length<=60&&typeof s.projection.summary==='string'&&s.projection.summary.length<=180,'历史投影损坏。');
    need(s.seal===seal(s),'世界法则与创世来源不一致。');
    need(typeof s.era==='string'&&/^[1-9]\d{0,127}$/.test(s.era)&&Number.isInteger(s.cursor)&&s.cursor>=0&&s.cursor<=3&&['event','ending-choice','ending'].includes(s.phase),'世界纪元或阶段损坏。');
    need(Number.isInteger(s.vitality)&&s.vitality>=0&&s.vitality<=100&&Number.isInteger(s.order)&&s.order>=0&&s.order<=100,'世界状态超出范围。');
    need(Array.isArray(s.history)&&s.history.length<=LIMIT,'世界历史超限。');
    if(s.story!==null&&s.story!==undefined){
      need(s.story&&s.story.version===1&&Number.isInteger(s.story.cursor)&&s.story.cursor>=0&&s.story.cursor<=STORY_NODES.length&&typeof s.story.completed==='boolean'&&typeof s.story.sandbox==='boolean','众生史进度损坏。');
      need(s.story.ending===null||ENDINGS.some(x=>x.id===s.story.ending),'证道终局损坏。');
      need(s.story.completed===!!s.story.ending&&(!s.story.sandbox||s.story.completed),'证道终局状态不一致。');
      if(!s.story.sandbox){
        need(s.era==='1'&&s.cursor===0,'正式第三卷不使用后日谈纪元。');
        need(s.story.cursor<STORY_NODES.length?s.phase==='event':s.story.completed?s.phase==='ending':s.phase==='ending-choice','众生史阶段与进度不一致。');
        need(s.history.length===s.story.cursor,'众生史与史册进度不一致。');
      }else{
        need(BigInt(s.era)>=2n&&['event','ending'].includes(s.phase)&&(s.phase==='ending')===(s.cursor===3),'后日谈纪元状态损坏。');
        const completed=BigInt(STORY_NODES.length)+(BigInt(s.era)-2n)*3n+BigInt(s.cursor),expected=Number(completed>BigInt(LIMIT)?BigInt(LIMIT):completed);
        need(s.history.length===expected,'后日谈史册与纪元不一致。');
      }
    }else{
      need(['event','ending'].includes(s.phase)&&(s.phase==='ending')===(s.cursor===3),'旧创世阶段与进度不一致。');
      const completed=(BigInt(s.era)-1n)*3n+BigInt(s.cursor);need(s.history.length===Number(completed>BigInt(LIMIT)?BigInt(LIMIT):completed),'世界历史与纪元不一致。');
    }
    const keys=new Set();for(const row of s.history){const storyNode=STORY_NODES.find(x=>x.id===row.type),title=storyNode?.title||TITLES[row.type];need(row&&(TYPES.includes(row.type)||storyNode)&&typeof row.key==='string'&&row.key.length<=140&&!keys.has(row.key)&&typeof row.era==='string'&&/^[1-9]\d{0,127}$/.test(row.era)&&BigInt(row.era)<=BigInt(s.era)&&row.title===title&&typeof row.choice==='string'&&row.choice.length<=40,'世界历史条目损坏。');keys.add(row.key);for(const snap of [row.before,row.after])need(snap&&['vitality','order'].every(k=>Number.isInteger(snap[k])&&snap[k]>=0&&snap[k]<=100),'世界历史数值损坏。');}
    if(s.history.length){const last=s.history.at(-1);need(last.after.vitality===s.vitality&&last.after.order===s.order,'世界现状与最后史册不一致。');}
    return true;
  }
  return Object.freeze({VERSION,LIMIT,OPTIONS,LABELS,TYPES,STORY_NODES,ENDINGS,defaults,validateBridge:bridgeValid,bridgeProjection,sourceName,canCreate,create,name,ruleSummary,event,endingChoices,chooseEnding,resolve,continueWorld,conclusion,validate});
});
