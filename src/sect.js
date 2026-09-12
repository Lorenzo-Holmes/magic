(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSSect = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Lightweight sect progression. No contribution currency, job ladder, RNG,
  // daily reset or management simulation lives in this module.
  const VERSION = 1;
  const MAX_HISTORY = 20;
  const copy = value => JSON.parse(JSON.stringify(value));
  function requireThat(condition, message) { if (!condition) throw new Error(message); }

  const SECTS = Object.freeze([
    {
      id:'qingyun', name:'青云剑宗', path:'sword', tags:['sword','burst'],
      cast:[{name:'沈照川',role:'执剑长老'},{name:'叶停霜',role:'同门师姐'},{name:'顾临渊',role:'守阵师兄'}],
      motto:'一峰一剑，借雷问天。', passive:{swordPower:.06}, passiveText:'习得剑诀后有效战力 +6%。',
      heritage:{bossPower:.04}, heritageName:'青云断岳式', heritageText:'完成入门试剑后，首领有效战力 +4%。',
      events:[
        {id:'qingyun-init',minRealm:1,title:'山门试剑',text:'执剑长老沈照川守在石壁前。那上面只有一道极细剑痕，他没有问你的出身，只说：“留下你自己的这一剑。”',choices:[
          {id:'edge',name:'以锋芒回应',note:'沿自身剑势留下痕迹',xp:.05,unlock:true},
          {id:'listen',name:'先听山风再出剑',note:'以理解校正锋芒',xp:.06,unlock:true}
        ]},
        {id:'qingyun-core',minRealm:3,title:'剑冢夜鸣',text:'金丹夜里，废剑冢数百柄残剑同时震动。师姐叶停霜守在冢门前，有人主张镇压，她却问你愿不愿把万剑最后一句话听完。',choices:[
          {id:'resonate',name:'任万剑共鸣',note:'让已有 Build 决定你听见什么',xp:.07},
          {id:'seal',name:'只封最躁的一柄',note:'克制扩散，不追逐所有机缘',xp:.05}
        ]},
        {id:'qingyun-sky',minRealm:5,title:'云海借剑',text:'外敌越过山门时，顾临渊独守残阵，护宗剑阵恰缺一处阵眼。你可以借宗门之剑，也可以只用自己的道。',choices:[
          {id:'array',name:'补入剑阵',note:'与宗门传承并肩',xp:.08},
          {id:'self',name:'阵外独守一线',note:'证明传承不是枷锁',xp:.07}
        ]},
        {id:'qingyun-major',minRealm:7,major:true,title:'青云断峰',text:'旧敌以界裂斩断主峰。沈照川的剑折在山腰，叶停霜带人护送后辈下山。宗门第一次不再问你能得到什么，只问你愿意留下什么。'},
        {id:'qingyun-farewell',minRealm:8,farewell:true,title:'天门前的一杯冷茶',text:'大乘圆满前夕，叶停霜把一杯早已凉透的茶放在断峰边。沈照川已经坐化，顾临渊也不再执剑。她只说：“若你真能走出去，替我们看看天门后有没有山。”',choices:[
          {id:'qingyun-remember',name:'饮尽冷茶',note:'把这座断峰记到天门之外',xp:0},
          {id:'qingyun-leave-sword',name:'留下一道无名剑痕',note:'不留神兵，只留后来者能看见的路',xp:0}
        ]}
      ]
    },
    {
      id:'tiangang', name:'天罡体宗', path:'body', tags:['body','survival'],
      cast:[{name:'石无咎',role:'负岳教习'},{name:'岳青萝',role:'炼体师姐'},{name:'贺山河',role:'守山宗主'}],
      motto:'身若山岳，劫来不退。', passive:{guard:.04}, passiveText:'战斗损伤降低 4%。',
      heritage:{bone:1}, heritageName:'地脉炼骨法', heritageText:'完成入门负岳后，根骨 +1。',
      events:[
        {id:'tiangang-init',minRealm:1,title:'负岳入门',text:'教习石无咎不测拳力，只把一块没有灵气的黑石放到你背上，让你走完千阶。',choices:[
          {id:'carry',name:'一步不卸',note:'以身体记住重量',xp:.05,unlock:true},
          {id:'pace',name:'调息再负岳',note:'不逞一时之强',xp:.06,unlock:true}
        ]},
        {id:'tiangang-core',minRealm:3,title:'地火淬骨',text:'地脉翻身，炼体窟火线失控。岳青萝被困在最深处，最强的弟子反而最容易被自身蛮力拖住。',choices:[
          {id:'anchor',name:'以身镇住地脉',note:'承压而不追击',xp:.07},
          {id:'guide',name:'引火绕骨而行',note:'把蛮力变成控制',xp:.06}
        ]},
        {id:'tiangang-sky',minRealm:5,title:'山门将倾',text:'护山巨像失去一足，整座山门向深谷缓缓滑落。宗主贺山河站在山脚，以双肩硬扛第一寸坠势。',choices:[
          {id:'hold',name:'托住山门',note:'让同门先修阵脚',xp:.08},
          {id:'break',name:'击碎坠落山体',note:'以更小代价换生路',xp:.07}
        ]},
        {id:'tiangang-major',minRealm:7,major:true,title:'祖山崩鸣',text:'祖山地脉被人截断，万年炼体根基开始坍塌。石无咎已老得背不起入门黑石，却仍守在第一阶前。'},
        {id:'tiangang-farewell',minRealm:8,farewell:true,title:'最后一次负岳',text:'大乘将满，岳青萝把当年那块黑石搬到你面前。贺山河已退隐，石无咎也在冬前去世。她笑道：“再背一次吧。这回不是入门，是下山。”',choices:[
          {id:'tiangang-carry-home',name:'再背黑石走完千阶',note:'用最初的重量送别这一段路',xp:0},
          {id:'tiangang-set-stone',name:'把黑石立在山门外',note:'让后来者自己决定要不要背起它',xp:0}
        ]}
      ]
    },
    {
      id:'wanling', name:'万灵吞月谷', path:'devour', tags:['devour','growth'],
      cast:[{name:'闻野',role:'辨灵师兄'},{name:'宁小满',role:'守井师姐'},{name:'白慈',role:'吞月谷主'}],
      motto:'万物有灵，取之有度。', passive:{devour:.08}, passiveText:'吞噬修为 +8%。',
      heritage:{devourHeal:3}, heritageName:'万灵归炉篇', heritageText:'完成入门辨灵后，吞噬额外恢复 3 元气。',
      events:[
        {id:'wanling-init',minRealm:1,title:'辨灵第一课',text:'师兄闻野没有催你吞下灵物。他先摆出三团气息，要你分清“可炼”“有主”“不可碰”。',choices:[
          {id:'discern',name:'逐一辨清再炼',note:'饥饿先学会边界',xp:.06,unlock:true},
          {id:'refuse',name:'这一课先不吞',note:'证明吞噬不是失控',xp:.05,unlock:true}
        ]},
        {id:'wanling-core',minRealm:3,title:'月井反噬',text:'月井积蓄百年的杂灵同时翻涌。守井的宁小满死死压着井沿，任何一口贪多都会把杂念一并吞进体内。',choices:[
          {id:'layers',name:'分层炼化',note:'慢一些，但不让杂念入体',xp:.07},
          {id:'core',name:'只取最纯一缕',note:'舍弃数量换稳定',xp:.06}
        ]},
        {id:'wanling-sky',minRealm:5,title:'灵潮越界',text:'山外兽潮不是来攻宗，而是在逃离更深处的灾变。谷主白慈下令封阵，却把最后一道阵门的决定留给你。',choices:[
          {id:'open',name:'开谷放行',note:'不把所有来者都当资源',xp:.08},
          {id:'hunt',name:'只猎失控凶兽',note:'把吞噬用于止灾',xp:.07}
        ]},
        {id:'wanling-major',minRealm:7,major:true,title:'吞月大阵失控',text:'祖师留下的吞月阵开始把整片山河视作可炼之物。闻野被阵意侵蚀，反复念着入门第一课里的三个词。'},
        {id:'wanling-farewell',minRealm:8,farewell:true,title:'月井封口',text:'大乘末期，宁小满请你最后来看月井。闻野已经散功归田，白慈也把谷主令交给后辈。井口被永久封住，只留一道清水从石缝流出。',choices:[
          {id:'wanling-last-sip',name:'只饮一口井水',note:'以克制结束一条吞噬之路',xp:0},
          {id:'wanling-seal-name',name:'亲手刻下“有主不可夺”',note:'把第一课留给后来者',xp:0}
        ]}
      ]
    },
    {
      id:'tianji', name:'天机道院', path:'insight', tags:['insight','fortune'],
      cast:[{name:'谢知微',role:'观星先生'},{name:'苏照',role:'同门推演师'},{name:'闻星辞',role:'天机院主'}],
      motto:'见一叶而知秋，不替众生作答。', passive:{explore:.05}, passiveText:'历练修为 +5%。',
      heritage:{mind:1}, heritageName:'观微天书', heritageText:'完成入门观星后，神识 +1。',
      events:[
        {id:'tianji-init',minRealm:1,title:'无答案的星盘',text:'入院第一夜，谢知微先生让星盘给出三条互相矛盾的吉兆，只问你一句：准备相信哪一条？',choices:[
          {id:'compare',name:'比较三兆的来源',note:'先问证据，再问吉凶',xp:.06,unlock:true},
          {id:'none',name:'一条都不信',note:'把选择留给自己',xp:.05,unlock:true}
        ]},
        {id:'tianji-core',minRealm:3,title:'失真卦象',text:'连续七日，院中所有卦象都指向同一个不可能发生的结果。苏照把七百张废稿铺满地面，坚持其中一定藏着共同误差。',choices:[
          {id:'trace',name:'追查共同误差',note:'寻找被忽略的前提',xp:.07},
          {id:'break',name:'停卦七日',note:'拒绝让错误继续自证',xp:.06}
        ]},
        {id:'tianji-sky',minRealm:5,title:'一城两命',text:'两份推演都能救下一城，却会让不同的人承担代价。院主闻星辞把印玺放在桌上：天机不再给出“最好”的答案。',choices:[
          {id:'reveal',name:'公开两份推演',note:'让因果由众人共同承担',xp:.08},
          {id:'act',name:'亲自选择并负责',note:'不把责任推给天机',xp:.07}
        ]},
        {id:'tianji-major',minRealm:7,major:true,title:'天书自焚',text:'镇院天书开始自行删去未来。谢知微已经看不清星盘，苏照则第一次承认：有些未来不该被提前写完。'},
        {id:'tianji-farewell',minRealm:8,farewell:true,title:'今夜不占',text:'你将触及天门前，闻星辞撤去所有星盘。谢知微已经坐化，苏照也封笔多年。院中只点一盏普通油灯，灯下没有卦象。',choices:[
          {id:'tianji-no-divination',name:'今夜不占',note:'不知道天门之后，也照样向前',xp:0},
          {id:'tianji-leave-blank',name:'在天书末页留一页空白',note:'把未知还给后来者',xp:0}
        ]}
      ]
    }
  ].map(sect => Object.freeze({...sect, events:Object.freeze(sect.events.map(event=>Object.freeze({...event,choices:event.choices?Object.freeze(event.choices.map(Object.freeze)):undefined})))})));
  const BY_ID = Object.freeze(Object.fromEntries(SECTS.map(sect=>[sect.id,sect])));
  const EVENT_BY_ID = Object.freeze(Object.fromEntries(SECTS.flatMap(sect=>sect.events.map(event=>[event.id,{sect:sect.id,...event}]))));
  const MAJOR_CHOICES = Object.freeze([
    Object.freeze({id:'protect',name:'护宗',note:'留下处理宗门大劫；保留传承。',xp:.12}),
    Object.freeze({id:'leave',name:'离宗',note:'不背叛旧义，但从此各走其道。',xp:.06}),
    Object.freeze({id:'betray',name:'叛宗',note:'主动斩断宗门关系；为后续因果留下明确记录。',xp:.08})
  ]);

  function createState() { return {version:VERSION,membership:null,joinedRealm:null,declined:[],heritageUnlocked:false,completed:[],pending:null,majorOutcomes:[],history:[]}; }
  function data(id) { return BY_ID[id] || null; }
  function current(state) { validate(state); return state.membership ? BY_ID[state.membership] : null; }
  function appendHistory(state, row) { state.history.push(row); if (state.history.length>MAX_HISTORY) state.history.shift(); }
  function nextEvent(state, realm) {
    const sect=current(state); if(!sect) return null;
    return sect.events.find(event=>event.minRealm<=realm&&!state.completed.includes(event.id))||null;
  }
  function observe(input, before, after) {
    validate(input); const state=copy(input);
    if (!state.membership || state.pending || after?.phase!=='playing' || after?.secretRealm?.active) return state;
    const next=nextEvent(state,after.realm||0); if(next) state.pending=next.id;
    validate(state); return state;
  }
  function decline(input,id,realm) {
    validate(input); const state=copy(input); requireThat(BY_ID[id],'未知宗门。'); requireThat(!state.membership,'已有宗门归属。'); requireThat(realm>=1,'炼气之后才会有宗门正式收徒。');
    if(!state.declined.includes(id)) state.declined.push(id); validate(state); return state;
  }
  function join(input,id,realm) {
    validate(input); const state=copy(input),sect=BY_ID[id]; requireThat(sect,'未知宗门。'); requireThat(!state.membership,'已有宗门归属。'); requireThat(realm>=1,'炼气之后才可正式入宗。');
    requireThat(!state.majorOutcomes.some(x=>x.sect===id&&x.outcome==='betray'),'已经叛离此宗，今生不能重新拜入。');
    state.membership=id; state.joinedRealm=realm; state.heritageUnlocked=state.completed.includes(sect.events[0].id);
    state.pending=nextEvent(state,realm)?.id||null;
    appendHistory(state,{sect:id,event:'join',choice:'join',realm}); validate(state); return state;
  }
  function leave(input,realm,kind='leave') {
    validate(input); const state=copy(input),sect=current(state); requireThat(sect,'当前没有宗门归属。'); requireThat(['leave','betray'].includes(kind),'未知离宗方式。');
    state.majorOutcomes=state.majorOutcomes.filter(x=>x.sect!==sect.id); state.majorOutcomes.push({sect:sect.id,outcome:kind,realm});
    appendHistory(state,{sect:sect.id,event:'leave',choice:kind,realm}); state.membership=null; state.joinedRealm=null; state.heritageUnlocked=false; state.pending=null;
    validate(state); return state;
  }
  function pendingEvent(state) { validate(state); return state.pending ? EVENT_BY_ID[state.pending] || null : null; }
  function resolve(input,choiceId,realm) {
    validate(input); const state=copy(input), event=pendingEvent(state), sect=current(state); requireThat(event&&sect&&event.sect===sect.id,'当前没有待处理的宗门事件。');
    let choice;
    if(event.major) choice=MAJOR_CHOICES.find(x=>x.id===choiceId);
    else choice=event.choices.find(x=>x.id===choiceId);
    requireThat(choice,'当前宗门事件没有这条选择。');
    requireThat(!state.completed.includes(event.id),'宗门事件已经结算。');
    state.completed.push(event.id); state.pending=null; if(choice.unlock) state.heritageUnlocked=true;
    appendHistory(state,{sect:sect.id,event:event.id,choice:choice.id,realm});
    let outcome=null;
    if(event.major) {
      outcome=choice.id; state.majorOutcomes=state.majorOutcomes.filter(x=>x.sect!==sect.id); state.majorOutcomes.push({sect:sect.id,outcome,realm});
      if(outcome==='leave'||outcome==='betray') { state.membership=null; state.joinedRealm=null; state.heritageUnlocked=false; state.pending=null; }
    }
    if(state.membership&&!state.pending) state.pending=nextEvent(state,realm)?.id||null;
    const reward={xpFactor:choice.xp||0,heal:choice.id==='protect'?16:0,outcome,event:event.id,sect:sect.id};
    validate(state); return {state,reward};
  }
  function effects(state) {
    validate(state); const sect=current(state); if(!sect) return {};
    const out={...sect.passive}; if(state.heritageUnlocked) for(const [key,value] of Object.entries(sect.heritage)) out[key]=(out[key]||0)+value;
    const protectedOutcome=state.majorOutcomes.find(x=>x.sect===sect.id&&x.outcome==='protect');
    if(protectedOutcome) out.explore=(out.explore||0)+.02;
    return out;
  }
  function validate(state) {
    requireThat(state&&state.version===VERSION,'宗门存档版本不兼容。');
    requireThat(state.membership===null||BY_ID[state.membership],'宗门归属损坏。');
    requireThat(state.joinedRealm===null||state.membership&&Number.isInteger(state.joinedRealm)&&state.joinedRealm>=1&&state.joinedRealm<=9,'入宗境界损坏。');
    requireThat(Array.isArray(state.declined)&&state.declined.length<=SECTS.length&&new Set(state.declined).size===state.declined.length&&state.declined.every(id=>BY_ID[id]),'宗门拒绝记录损坏。');
    requireThat(typeof state.heritageUnlocked==='boolean'&&(!state.heritageUnlocked||state.membership),'宗门传承状态损坏。');
    requireThat(Array.isArray(state.completed)&&state.completed.length<=SECTS.length*4&&new Set(state.completed).size===state.completed.length&&state.completed.every(id=>EVENT_BY_ID[id]),'宗门事件记录损坏。');
    requireThat(state.pending===null||state.membership&&EVENT_BY_ID[state.pending]?.sect===state.membership&&!state.completed.includes(state.pending),'宗门待办事件损坏。');
    requireThat(Array.isArray(state.majorOutcomes)&&state.majorOutcomes.length<=SECTS.length&&new Set(state.majorOutcomes.map(x=>x.sect)).size===state.majorOutcomes.length&&state.majorOutcomes.every(x=>BY_ID[x.sect]&&['protect','leave','betray'].includes(x.outcome)&&Number.isInteger(x.realm)&&x.realm>=1&&x.realm<=9),'宗门大事件记录损坏。');
    requireThat(Array.isArray(state.history)&&state.history.length<=MAX_HISTORY&&state.history.every(x=>x&&BY_ID[x.sect]&&typeof x.event==='string'&&typeof x.choice==='string'&&Number.isInteger(x.realm)&&x.realm>=1&&x.realm<=9),'宗门历程损坏。');
    return true;
  }
  return Object.freeze({VERSION,MAX_HISTORY,SECTS,BY_ID,EVENT_BY_ID,MAJOR_CHOICES,createState,data,current,nextEvent,observe,decline,join,leave,pendingEvent,resolve,effects,validate});
});
