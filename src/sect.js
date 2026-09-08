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
      motto:'一峰一剑，借雷问天。', passive:{swordPower:.06}, passiveText:'习得剑诀后有效战力 +6%。',
      heritage:{bossPower:.04}, heritageName:'青云断岳式', heritageText:'完成入门试剑后，首领有效战力 +4%。',
      events:[
        {id:'qingyun-init',minRealm:1,title:'山门试剑',text:'守门石壁只留一道极细剑痕。长老没有问你的出身，只让你留下自己的一剑。',choices:[
          {id:'edge',name:'以锋芒回应',note:'沿自身剑势留下痕迹',xp:.05,unlock:true},
          {id:'listen',name:'先听山风再出剑',note:'以理解校正锋芒',xp:.06,unlock:true}
        ]},
        {id:'qingyun-core',minRealm:3,title:'剑冢夜鸣',text:'金丹夜里，废剑冢数百柄残剑同时震动。有人主张镇压，有人主张顺势听完。',choices:[
          {id:'resonate',name:'任万剑共鸣',note:'让已有 Build 决定你听见什么',xp:.07},
          {id:'seal',name:'只封最躁的一柄',note:'克制扩散，不追逐所有机缘',xp:.05}
        ]},
        {id:'qingyun-sky',minRealm:5,title:'云海借剑',text:'外敌越过山门时，护宗剑阵缺了一处阵眼。你可以借宗门之剑，也可以只用自己的道。',choices:[
          {id:'array',name:'补入剑阵',note:'与宗门传承并肩',xp:.08},
          {id:'self',name:'阵外独守一线',note:'证明传承不是枷锁',xp:.07}
        ]},
        {id:'qingyun-major',minRealm:7,major:true,title:'青云断峰',text:'旧敌以界裂斩断主峰。宗门第一次不再问你能得到什么，只问你愿意留下什么。'}
      ]
    },
    {
      id:'tiangang', name:'天罡体宗', path:'body', tags:['body','survival'],
      motto:'身若山岳，劫来不退。', passive:{guard:.04}, passiveText:'战斗损伤降低 4%。',
      heritage:{bone:1}, heritageName:'地脉炼骨法', heritageText:'完成入门负岳后，根骨 +1。',
      events:[
        {id:'tiangang-init',minRealm:1,title:'负岳入门',text:'入宗不测拳力，只让新人背一块没有灵气的黑石走完千阶。',choices:[
          {id:'carry',name:'一步不卸',note:'以身体记住重量',xp:.05,unlock:true},
          {id:'pace',name:'调息再负岳',note:'不逞一时之强',xp:.06,unlock:true}
        ]},
        {id:'tiangang-core',minRealm:3,title:'地火淬骨',text:'地脉翻身，炼体窟的火线失控。最强的弟子反而最容易被自身蛮力拖住。',choices:[
          {id:'anchor',name:'以身镇住地脉',note:'承压而不追击',xp:.07},
          {id:'guide',name:'引火绕骨而行',note:'把蛮力变成控制',xp:.06}
        ]},
        {id:'tiangang-sky',minRealm:5,title:'山门将倾',text:'护山巨像失去一足，整座山门向深谷缓缓滑落。',choices:[
          {id:'hold',name:'托住山门',note:'让同门先修阵脚',xp:.08},
          {id:'break',name:'击碎坠落山体',note:'以更小代价换生路',xp:.07}
        ]},
        {id:'tiangang-major',minRealm:7,major:true,title:'祖山崩鸣',text:'祖山地脉被人截断，万年炼体根基开始坍塌。'}
      ]
    },
    {
      id:'wanling', name:'万灵吞月谷', path:'devour', tags:['devour','growth'],
      motto:'万物有灵，取之有度。', passive:{devour:.08}, passiveText:'吞噬修为 +8%。',
      heritage:{devourHeal:3}, heritageName:'万灵归炉篇', heritageText:'完成入门辨灵后，吞噬额外恢复 3 元气。',
      events:[
        {id:'wanling-init',minRealm:1,title:'辨灵第一课',text:'谷中没有人催你吞下灵物。师兄先摆出三团气息，要求你分清“可炼”“有主”“不可碰”。',choices:[
          {id:'discern',name:'逐一辨清再炼',note:'饥饿先学会边界',xp:.06,unlock:true},
          {id:'refuse',name:'这一课先不吞',note:'证明吞噬不是失控',xp:.05,unlock:true}
        ]},
        {id:'wanling-core',minRealm:3,title:'月井反噬',text:'月井积蓄百年的杂灵同时翻涌，任何一口贪多都会反噬自身。',choices:[
          {id:'layers',name:'分层炼化',note:'慢一些，但不让杂念入体',xp:.07},
          {id:'core',name:'只取最纯一缕',note:'舍弃数量换稳定',xp:.06}
        ]},
        {id:'wanling-sky',minRealm:5,title:'灵潮越界',text:'山外兽潮不是来攻宗，而是在逃离更深处的灾变。',choices:[
          {id:'open',name:'开谷放行',note:'不把所有来者都当资源',xp:.08},
          {id:'hunt',name:'只猎失控凶兽',note:'把吞噬用于止灾',xp:.07}
        ]},
        {id:'wanling-major',minRealm:7,major:true,title:'吞月大阵失控',text:'祖师留下的吞月阵开始把整片山河视作可炼之物。'}
      ]
    },
    {
      id:'tianji', name:'天机道院', path:'insight', tags:['insight','fortune'],
      motto:'见一叶而知秋，不替众生作答。', passive:{explore:.05}, passiveText:'历练修为 +5%。',
      heritage:{mind:1}, heritageName:'观微天书', heritageText:'完成入门观星后，神识 +1。',
      events:[
        {id:'tianji-init',minRealm:1,title:'无答案的星盘',text:'入院第一夜，星盘给出三条互相矛盾的吉兆。先生只问：你准备相信哪一条？',choices:[
          {id:'compare',name:'比较三兆的来源',note:'先问证据，再问吉凶',xp:.06,unlock:true},
          {id:'none',name:'一条都不信',note:'把选择留给自己',xp:.05,unlock:true}
        ]},
        {id:'tianji-core',minRealm:3,title:'失真卦象',text:'连续七日，院中所有卦象都指向同一个不可能发生的结果。',choices:[
          {id:'trace',name:'追查共同误差',note:'寻找被忽略的前提',xp:.07},
          {id:'break',name:'停卦七日',note:'拒绝让错误继续自证',xp:.06}
        ]},
        {id:'tianji-sky',minRealm:5,title:'一城两命',text:'两份推演都能救下一城，却会让不同的人承担代价。天机不再给出“最好”的答案。',choices:[
          {id:'reveal',name:'公开两份推演',note:'让因果由众人共同承担',xp:.08},
          {id:'act',name:'亲自选择并负责',note:'不把责任推给天机',xp:.07}
        ]},
        {id:'tianji-major',minRealm:7,major:true,title:'天书自焚',text:'镇院天书开始自行删去未来，仿佛有人不愿此界继续被推演。'}
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
