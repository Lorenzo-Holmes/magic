(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSLife = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION=1, MAX_HISTORY=16;
  const copy=value=>JSON.parse(JSON.stringify(value));
  function requireThat(condition,message){ if(!condition) throw new Error(message); }
  const CHAINS=Object.freeze({
    herb:Object.freeze({name:'药农之子',events:Object.freeze([
      Object.freeze({id:'herb-home',minRealm:2,title:'青露故乡',text:'筑基后第一次路过故乡，你发现当年采药的坡地正在枯死。父老只知道灵气变薄，却不知道山腹多了一条断脉。',choices:Object.freeze([
        Object.freeze({id:'herb-heal',name:'替故乡续上地脉',note:'回报凡尘旧恩',xp:.05,tag:'growth',effects:{explore:.02}}),
        Object.freeze({id:'herb-seed',name:'只留下新的药种',note:'不替所有人决定未来',xp:.04,tag:'insight',effects:{cultivate:.015}}),
        Object.freeze({id:'herb-refuse',name:'不再介入凡尘',note:'拒绝这条人生支线',xp:0})
      ])}),
      Object.freeze({id:'herb-debt',minRealm:4,title:'旧药篓里的名字',text:'元婴以后，一只破旧药篓被送到洞府。篓底压着十几个你小时候认识的名字，以及一句“若还能记得，就回来看看”。',choices:Object.freeze([
        Object.freeze({id:'herb-return',name:'回去看一眼',note:'把修士的时间还给故人一日',xp:.05,tag:'fortune',effects:{luck:1}}),
        Object.freeze({id:'herb-medicine',name:'托人送回灵药',note:'保留距离，但不忘旧恩',xp:.04,tag:'growth',effects:{explore:.015}}),
        Object.freeze({id:'herb-ignore',name:'把药篓收起',note:'拒绝继续牵扯',xp:0})
      ])}),
      Object.freeze({id:'herb-major',minRealm:6,major:true,title:'故乡与灵田只能保一处',text:'炼虚时，空间裂隙同时吞向故乡与一座能救活千里灵脉的古灵田。你的力量足以救一边，却来不及两全。',choices:Object.freeze([
        Object.freeze({id:'herb-save-home',name:'先救故乡',note:'选择具体的人，而非更大的收益',xp:.08,tag:'survival',effects:{guard:.02}}),
        Object.freeze({id:'herb-save-field',name:'先保古灵田',note:'让更多陌生人以后受益',xp:.09,tag:'growth',effects:{xp:.02}}),
        Object.freeze({id:'herb-let-go',name:'两边都不替天作主',note:'拒绝以力量决定所有命运',xp:.03,tag:'insight',effects:{cultivate:.01}})
      ])})
    ])}),
    orphan:Object.freeze({name:'山野孤儿',events:Object.freeze([
      Object.freeze({id:'orphan-hut',minRealm:2,title:'旧猎屋仍有人住',text:'你回到曾经避雨的猎屋，发现一个同样无父无母的孩子把那里当成了家。',choices:Object.freeze([
        Object.freeze({id:'orphan-teach',name:'教他如何在山里活下去',note:'只教生存，不替他修仙',xp:.05,tag:'survival',effects:{guard:.015}}),
        Object.freeze({id:'orphan-token',name:'留一枚护身木牌',note:'在危险时给一次退路',xp:.04,tag:'fortune',effects:{luck:1}}),
        Object.freeze({id:'orphan-pass',name:'悄然离开',note:'拒绝把自己的过去投向他人',xp:0})
      ])}),
      Object.freeze({id:'orphan-pack',minRealm:4,title:'群狼归山',text:'黑风岭旧猎道上出现一支狼群，它们没有袭村，而是在围住一处被邪修污染的泉眼。',choices:Object.freeze([
        Object.freeze({id:'orphan-clean',name:'净化泉眼',note:'相信山野自己的警告',xp:.05,tag:'soul',effects:{mind:1}}),
        Object.freeze({id:'orphan-track',name:'循污染追查邪修',note:'把危机追到源头',xp:.06,tag:'burst',effects:{bossPower:.02}}),
        Object.freeze({id:'orphan-leave',name:'让山里自己恢复',note:'拒绝介入',xp:0})
      ])}),
      Object.freeze({id:'orphan-major',minRealm:6,major:true,title:'黑风岭要被搬空',text:'炼虚势力准备抽走整条黑风岭灵脉，理由是“山野无主”。你曾经正是在这片无主之地活下来。',choices:Object.freeze([
        Object.freeze({id:'orphan-guard',name:'替无主之山守一次',note:'不为宗门，只为故土',xp:.09,tag:'body',effects:{power:.02}}),
        Object.freeze({id:'orphan-move',name:'先迁走山中凡民',note:'不争灵脉，先保活人',xp:.08,tag:'survival',effects:{guard:.02}}),
        Object.freeze({id:'orphan-release',name:'接受山河也会易主',note:'放下故土执念',xp:.04,tag:'insight',effects:{cultivate:.01}})
      ])})
    ])}),
    scribe:Object.freeze({name:'落第书生',events:Object.freeze([
      Object.freeze({id:'scribe-school',minRealm:2,title:'旧书院的新先生',text:'昔日嘲笑你读仙书的旧书院换了先生。他把你当年的批注抄给学生，却不知道作者是谁。',choices:Object.freeze([
        Object.freeze({id:'scribe-correct',name:'补正三处误解',note:'只留下知识，不留姓名',xp:.05,tag:'insight',effects:{cultivate:.02}}),
        Object.freeze({id:'scribe-name',name:'留下真实署名',note:'让凡人知道修仙者也曾落第',xp:.04,tag:'fortune',effects:{luck:1}}),
        Object.freeze({id:'scribe-close',name:'合上旧书',note:'拒绝回到旧身份',xp:0})
      ])}),
      Object.freeze({id:'scribe-edict',minRealm:4,title:'皇榜上的异文',text:'一张凡朝皇榜把“修士现世”解释成天降祥瑞，并借此征税。你认得其中几句，正是自己少年文章的断章取义。',choices:Object.freeze([
        Object.freeze({id:'scribe-expose',name:'公开原文',note:'让误读无处藏身',xp:.06,tag:'soul',effects:{mind:1}}),
        Object.freeze({id:'scribe-burn',name:'烧掉被利用的旧稿',note:'斩断文字的权威',xp:.05,tag:'burst',effects:{power:.015}}),
        Object.freeze({id:'scribe-ignore',name:'不替王朝纠错',note:'拒绝介入',xp:0})
      ])}),
      Object.freeze({id:'scribe-major',minRealm:6,major:true,title:'一城要焚尽所有旧书',text:'灾乱后，新王朝要焚掉旧朝典籍以“断绝妖言”。其中既有谎言，也有无数普通人的记录。',choices:Object.freeze([
        Object.freeze({id:'scribe-save-books',name:'保住全部典籍',note:'让后人自己判断真假',xp:.09,tag:'insight',effects:{xp:.02}}),
        Object.freeze({id:'scribe-save-people',name:'只救记录中的人',note:'文字不是比活人更高的道',xp:.08,tag:'fortune',effects:{explore:.02}}),
        Object.freeze({id:'scribe-walk',name:'任一朝文字自生自灭',note:'拒绝成为新的裁定者',xp:.04,tag:'survival',effects:{guard:.01}})
      ])})
    ])}),
    servant:Object.freeze({name:'宗门杂役',events:Object.freeze([
      Object.freeze({id:'servant-stairs',minRealm:2,title:'旧天阶仍有人在扫',text:'你再次踏上曾经只配打扫的天阶。新来的杂役低着头，没有人告诉他山门之外还有别的路。',choices:Object.freeze([
        Object.freeze({id:'servant-tell',name:'告诉他可以离开',note:'把曾无人给你的选择给他',xp:.05,tag:'fortune',effects:{luck:1}}),
        Object.freeze({id:'servant-teach',name:'教他一式基础吐纳',note:'不给身份，只给一把钥匙',xp:.05,tag:'growth',effects:{cultivate:.015}}),
        Object.freeze({id:'servant-pass',name:'不干涉山门规矩',note:'拒绝旧因果',xp:0})
      ])}),
      Object.freeze({id:'servant-letter',minRealm:4,title:'旧掌事来信',text:'当年从不记得你名字的掌事，如今在信中连写三次“道友”，请你替旧宗处理一桩无法公开的麻烦。',choices:Object.freeze([
        Object.freeze({id:'servant-help',name:'只处理危及弟子的部分',note:'不替旧权力收拾全部残局',xp:.06,tag:'survival',effects:{guard:.015}}),
        Object.freeze({id:'servant-return-letter',name:'原信退回',note:'让他们自己承担选择',xp:.04,tag:'insight',effects:{mind:1}}),
        Object.freeze({id:'servant-ignore',name:'不回信',note:'拒绝旧宗门支线',xp:0})
      ])}),
      Object.freeze({id:'servant-major',minRealm:6,major:true,title:'旧宗要拿杂役祭阵',text:'护山阵将破，旧宗高层准备牺牲外门杂役拖延一刻。你曾经就是名单上最容易被抹掉的那种人。',choices:Object.freeze([
        Object.freeze({id:'servant-break-rule',name:'破阵法，带杂役下山',note:'明确站在被牺牲者一边',xp:.09,tag:'burst',effects:{power:.02}}),
        Object.freeze({id:'servant-rewrite',name:'重写阵眼，让强者承担代价',note:'改变规则，而非只救一批人',xp:.09,tag:'insight',effects:{xp:.02}}),
        Object.freeze({id:'servant-refuse',name:'不替旧宗决定存亡',note:'拒绝介入，但记住这件事',xp:.03,tag:'soul',effects:{mind:1}})
      ])})
    ])})
  });
  const EVENTS=Object.freeze(Object.fromEntries(Object.entries(CHAINS).flatMap(([origin,chain])=>chain.events.map(event=>[event.id,{origin,...event}]))));
  function createState(){ return {version:VERSION,completed:[],pending:null,marks:[],majorOutcomes:[],history:[]}; }
  function chain(origin){ return CHAINS[origin]||null; }
  function event(id){ return EVENTS[id]||null; }
  function nextEvent(state,origin,realm){ const c=chain(origin); return c?.events.find(e=>e.minRealm<=realm&&!state.completed.includes(e.id))||null; }
  function observe(input,origin,realm,playable=true){ validate(input); const state=copy(input); if(!playable||state.pending||!chain(origin)) return state; state.pending=nextEvent(state,origin,realm)?.id||null; validate(state); return state; }
  function resolve(input,origin,choiceId,realm){
    validate(input); const state=copy(input), e=event(state.pending); requireThat(e&&e.origin===origin,'当前没有待处理的人生事件。');
    const choice=e.choices.find(x=>x.id===choiceId); requireThat(choice,'人生事件没有这条选择。'); requireThat(!state.completed.includes(e.id),'人生事件已经结算。');
    state.completed.push(e.id); state.pending=null; if(choice.tag) state.marks.push(choice.id);
    if(e.major) state.majorOutcomes.push({origin,event:e.id,choice:choice.id,realm});
    state.history.push({origin,event:e.id,choice:choice.id,realm}); if(state.history.length>MAX_HISTORY) state.history.shift();
    state.pending=nextEvent(state,origin,realm)?.id||null; validate(state);
    return {state,reward:{xpFactor:choice.xp||0,event:e.id,choice:choice.id,tag:choice.tag||null,major:!!e.major}};
  }
  function effects(state){ validate(state); const out={}; for(const mark of state.marks){ const choice=Object.values(EVENTS).flatMap(e=>e.choices).find(x=>x.id===mark); if(choice?.effects) for(const [key,value] of Object.entries(choice.effects)) out[key]=(out[key]||0)+value; } return out; }
  function buildSources(state){ validate(state); return state.marks.map(mark=>{ const e=Object.values(EVENTS).find(event=>event.choices.some(x=>x.id===mark)), choice=e?.choices.find(x=>x.id===mark); return choice?.tag?{source:`life:${mark}`,name:`${CHAINS[e.origin].name} · ${choice.name}`,tags:[choice.tag],weight:e.major?2:1}:null; }).filter(Boolean); }
  function validate(state){
    requireThat(state&&state.version===VERSION,'人生存档版本不兼容。');
    requireThat(Array.isArray(state.completed)&&state.completed.length<=12&&new Set(state.completed).size===state.completed.length&&state.completed.every(id=>EVENTS[id]),'人生事件记录损坏。');
    requireThat(state.pending===null||EVENTS[state.pending]&&!state.completed.includes(state.pending),'人生待办事件损坏。');
    const validChoices=new Set(Object.values(EVENTS).flatMap(e=>e.choices.map(x=>x.id)));
    requireThat(Array.isArray(state.marks)&&state.marks.length<=12&&new Set(state.marks).size===state.marks.length&&state.marks.every(id=>validChoices.has(id)),'人生余波记录损坏。');
    requireThat(Array.isArray(state.majorOutcomes)&&state.majorOutcomes.length<=4&&state.majorOutcomes.every(x=>CHAINS[x.origin]&&EVENTS[x.event]?.major&&validChoices.has(x.choice)&&Number.isInteger(x.realm)&&x.realm>=1&&x.realm<=9),'人生重大选择损坏。');
    requireThat(Array.isArray(state.history)&&state.history.length<=MAX_HISTORY&&state.history.every(x=>CHAINS[x.origin]&&EVENTS[x.event]&&validChoices.has(x.choice)&&Number.isInteger(x.realm)&&x.realm>=1&&x.realm<=9),'人生历程损坏。'); return true;
  }
  return Object.freeze({VERSION,MAX_HISTORY,CHAINS,EVENTS,createState,chain,event,nextEvent,observe,resolve,effects,buildSources,validate});
});
