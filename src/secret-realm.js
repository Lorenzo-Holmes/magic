(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSSecretRealm = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1, HISTORY_LIMIT = 12;
  const REALMS = Object.freeze([
    Object.freeze({ id:'blackwind', name:'黑风旧窟', rank:'凡人～筑基', minRealm:0, maxRealm:2, floors:3, boss:'噬碑蜥', risk:.62, note:'黑风岭地脉下的旧洞，适合第一次试探秘境规则。' }),
    Object.freeze({ id:'danxia', name:'丹霞遗府', rank:'金丹～化神', minRealm:3, maxRealm:5, floors:4, boss:'守炉丹傀', risk:.78, note:'残宗炼丹地宫仍在运转，机缘与禁制都更集中。' }),
    Object.freeze({ id:'outside', name:'界外残境', rank:'炼虚～渡劫', minRealm:6, maxRealm:9, floors:5, boss:'裂界残灵', risk:.92, note:'破碎界域卡在凡界边缘，路线短，但每一步都更接近虚空。' })
  ]);
  const NODE_TYPES = Object.freeze({
    combat:{name:'战斗',risk:'交锋',note:'胜利获得较高修为；失败会结束本次秘境。'},
    herb:{name:'灵药',risk:'安稳',note:'低风险修为，并获得本次秘境的护持。'},
    merchant:{name:'交换',risk:'可控',note:'以部分已得修为换取本次秘境的破局增益。'},
    page:{name:'功法残页',risk:'安稳',note:'少量修为，并提高本次秘境的有效战力。'},
    trap:{name:'禁制',risk:'凶险',note:'提前标明高风险；成功收益高，失败会损失未保底收益。'},
    mystery:{name:'异象',risk:'未知',note:'结果在进入本层时已经固定，刷新不会重抽。'},
    boss:{name:'Boss',risk:'决战',note:'胜利完成秘境；首胜才有独有装备来源。'}
  });
  const clone = value => JSON.parse(JSON.stringify(value));
  function requireThat(ok, message) { if (!ok) throw new Error(message); }
  function hash(seed, text) {
    let h = (seed >>> 0) ^ 2166136261;
    for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); h ^= h >>> 13; }
    return h >>> 0;
  }
  function realm(id) { return REALMS.find(x=>x.id===id); }
  function createState() { return { version:VERSION, active:null, completed:[], history:[] }; }
  function available(mainRealm) { return REALMS.filter(r=>mainRealm>=r.minRealm && mainRealm<=r.maxRealm); }
  function node(id, type, floor, session, index) {
    const h=hash(session.seed,`${session.realmId}|${floor}|${index}|${type}`), base=Math.max(8,Math.round(session.threshold*(.055+floor*.012)));
    const rewards={ combat:1.5, herb:.72, merchant:.35, page:.88, trap:2.0, mystery:1.2 };
    const required = Math.max(1,Math.round(session.entryPower*(session.difficulty + floor*.06 + (type==='trap'?.18:type==='combat'?.06:0))));
    return { id, type, title:NODE_TYPES[type].name, risk:NODE_TYPES[type].risk, note:NODE_TYPES[type].note,
      reward:Math.max(1,Math.round(base*(rewards[type]||1))), required, roll:(h%10000)/10000 };
  }
  function makeOptions(session) {
    if (session.floor >= session.floors) {
      const required=Math.round(session.entryPower*(session.difficulty+session.floor*.08+.10));
      return [{ id:`f${session.floor}-boss`,type:'boss',title:realm(session.realmId).boss,risk:'决战',note:'首胜提供独有装备来源；失败不会破坏本世主线。',reward:Math.round(session.threshold*.16),required,roll:(hash(session.seed,`${session.realmId}|boss|${session.floor}`)%10000)/10000 }];
    }
    const pools=[['combat','herb','page'],['combat','merchant','trap'],['page','mystery','combat'],['herb','trap','mystery']];
    const row=pools[hash(session.seed,`${session.realmId}|floor|${session.floor}`)%pools.length];
    // Every floor always contains at least one non-failing route (herb/page).
    const safe=row.some(x=>x==='herb'||x==='page')?row:[row[0],'page',row[2]];
    return safe.map((type,index)=>node(`f${session.floor}-${index}-${type}`,type,session.floor,session,index));
  }
  function start(input, realmId, seed, mainRealm, entryPower, threshold) {
    validate(input); const state=clone(input), config=realm(realmId);
    requireThat(!state.active,'已有一座秘境尚未退出。'); requireThat(config&&mainRealm>=config.minRealm&&mainRealm<=config.maxRealm,'当前境界不能进入这座秘境。');
    requireThat(Number.isFinite(entryPower)&&entryPower>0&&Number.isFinite(threshold)&&threshold>0,'秘境入口战力无效。');
    const session={ realmId,seed:hash(seed,`secret:${realmId}:${state.history.length}:${state.completed.includes(realmId)?'repeat':'first'}`),floor:1,floors:config.floors,
      difficulty:config.risk,entryPower:Math.round(entryPower),threshold:Math.round(threshold),tempPower:0,tempGuard:0,pendingXp:0,bankedXp:0,visited:[],options:[],note:`踏入${config.name}。离开按钮始终可用。` };
    session.options=makeOptions(session); state.active=session; validate(state); return state;
  }
  function success(session, option) {
    if (['herb','page','merchant'].includes(option.type)) return true;
    const effective=session.entryPower*(1+session.tempPower), ratio=effective/option.required;
    if (ratio>=2) return true; if (ratio<.55) return false;
    const chance=Math.max(.18,Math.min(.96,.52+(ratio-1)*.62)); return option.roll<chance;
  }
  function finalize(state, ending, awardXp, firstClear=false) {
    const s=state.active, config=realm(s.realmId);
    const row={realmId:s.realmId,name:config.name,ending,floor:s.floor,awardXp:Math.max(0,Math.round(awardXp)),firstClear:!!firstClear};
    state.history.push(row); if(state.history.length>HISTORY_LIMIT)state.history.shift(); state.active=null;
    return { state, settlement:{...row,boss:firstClear} };
  }
  function choose(input, nodeId) {
    validate(input); const state=clone(input), s=state.active; requireThat(s,'当前没有进行中的秘境。');
    const option=s.options.find(x=>x.id===nodeId); requireThat(option&&!s.visited.includes(nodeId),'这条秘境路线已经失效。');
    s.visited.push(nodeId); const won=success(s,option);
    if (option.type==='merchant') {
      const spend=Math.min(s.pendingXp,Math.round(s.threshold*.04)); s.pendingXp-=spend; s.tempPower=Math.min(.45,s.tempPower+.10); s.note=`你用 ${spend} 修为换来一枚破阵符，本次秘境有效战力提高。`;
    } else if (option.type==='herb') {
      s.pendingXp+=option.reward; s.tempGuard=Math.min(.35,s.tempGuard+.08); s.note=`灵药入腹，暂存修为 +${option.reward}；本次秘境更能承受风险。`;
    } else if (option.type==='page') {
      s.pendingXp+=option.reward; s.tempPower=Math.min(.45,s.tempPower+.07); s.note=`残页可读，暂存修为 +${option.reward}；本次秘境有效战力提高。`;
    } else if (won) {
      const reward=option.type==='mystery'&&option.roll>.72?Math.round(option.reward*1.45):option.reward; s.pendingXp+=reward;
      s.note=`${option.title}已破，暂存修为 +${reward}。`;
    } else {
      const kept=s.bankedXp+Math.floor((s.pendingXp-s.bankedXp)*.25); return finalize(state,'failed',kept,false);
    }
    if (option.type==='boss') {
      const first=!state.completed.includes(s.realmId); if(first)state.completed.push(s.realmId);
      return finalize(state,'complete',s.pendingXp,first);
    }
    // Reaching a new floor banks half the current unbanked reward. A manual
    // exit keeps all banked reward plus half of the remaining pending reward.
    s.bankedXp=Math.max(s.bankedXp,Math.floor(s.pendingXp*.5)); s.floor++; s.options=makeOptions(s); validate(state); return {state,settlement:null};
  }
  function exit(input) {
    validate(input); const state=clone(input), s=state.active; requireThat(s,'当前没有进行中的秘境。');
    const keep=s.bankedXp+Math.floor(Math.max(0,s.pendingXp-s.bankedXp)*.5); return finalize(state,'exit',keep,false);
  }
  function validate(state) {
    requireThat(state&&state.version===VERSION,'秘境存档版本不兼容。');
    requireThat(Array.isArray(state.completed)&&state.completed.length<=REALMS.length&&new Set(state.completed).size===state.completed.length&&state.completed.every(id=>realm(id)),'秘境完成记录损坏。');
    requireThat(Array.isArray(state.history)&&state.history.length<=HISTORY_LIMIT,'秘境历史损坏。');
    if(state.active){const s=state.active,c=realm(s.realmId);requireThat(c&&Number.isInteger(s.seed)&&s.seed>=0&&Number.isInteger(s.floor)&&s.floor>=1&&s.floor<=s.floors&&s.floors===c.floors,'秘境层级损坏。');
      for(const key of ['entryPower','threshold','pendingXp','bankedXp'])requireThat(Number.isSafeInteger(s[key])&&s[key]>=0&&s[key]<=1e12,'秘境数值损坏。');
      requireThat(Number.isFinite(s.tempPower)&&s.tempPower>=0&&s.tempPower<=.45&&Number.isFinite(s.tempGuard)&&s.tempGuard>=0&&s.tempGuard<=.35,'秘境临时增益损坏。');
      requireThat(Array.isArray(s.visited)&&s.visited.length<=20&&Array.isArray(s.options)&&s.options.length>=1&&s.options.length<=3,'秘境路线损坏。');
      requireThat(s.options.every(o=>o&&typeof o.id==='string'&&NODE_TYPES[o.type]&&Number.isSafeInteger(o.reward)&&Number.isSafeInteger(o.required)&&o.required>0&&o.roll>=0&&o.roll<1),'秘境节点损坏。');}
    return true;
  }
  return Object.freeze({VERSION,HISTORY_LIMIT,REALMS,NODE_TYPES,createState,available,start,choose,exit,validate,hash});
});
