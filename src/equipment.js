(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSEquipment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const MAX_INVENTORY = 12;
  const SLOTS = Object.freeze({ weapon:'兵器', artifact:'法宝', robe:'法衣', accessory:'佩饰' });
  const REFINE_NAMES = Object.freeze(['初炼', '温养', '通灵', '圆满']);
  const item = (id, name, slot, rarity, description, effects, extra = {}) => Object.freeze({ id, name, slot, rarity, description, effects:Object.freeze(effects), ...extra });
  const ITEMS = Object.freeze([
    item('iron-sword','玄铁长剑','weapon',0,'山门常见兵刃，胜在可靠。',{power:.04}),
    item('spirit-saber','聚灵刀','weapon',1,'刀脊聚拢灵气，出手更沉。',{power:.07,cultivate:.03}),
    item('jade-spear','青玉长枪','weapon',1,'枪锋一点青芒，专破妖躯。',{power:.06,beastPower:.06}),
    item('star-bow','落星弓','weapon',2,'弓弦震时如星火坠地。',{power:.10,bossPower:.05}),
    item('thunder-hammer','引雷锤','weapon',2,'锤心藏雷，正面破势。',{power:.11,guard:.04}),
    item('frost-blade','寒魄刃','weapon',2,'寒意贴刃而行，心神更稳。',{power:.09,mind:1}),
    item('spirit-mirror','照灵镜','artifact',0,'能照出寻常障眼法。',{mind:1}),
    item('jade-bell','清心铃','artifact',1,'铃声清越，可定心神。',{mind:2}),
    item('compass','寻炁罗盘','artifact',1,'指针追逐灵机，利于历练。',{explore:.06}),
    item('soul-lamp','照魂灯','artifact',2,'灯芯不燃火，只照神魂。',{mind:3,bossPower:.04}),
    item('thunder-seal','雷纹法印','artifact',2,'掌中法印可引一线天雷。',{power:.08,breakPower:.02}),
    item('dao-scroll','无字道卷','artifact',2,'空白处留有前人悟道痕迹。',{insight:1,xp:.05}),
    item('hemp-robe','青麻道衣','robe',0,'粗布耐磨，山行无碍。',{guard:.03}),
    item('cloud-robe','流云法衣','robe',1,'衣摆似云，卸去部分冲击。',{guard:.07}),
    item('scale-mail','赤纹软甲','robe',1,'妖鳞编成的轻甲。',{guard:.08,beastPower:.03}),
    item('star-cloak','星纹披风','robe',2,'暗纹如夜空，护持周身。',{guard:.11,luck:1}),
    item('thunder-vest','雷蚕法衣','robe',2,'雷蚕丝织成，筋骨受雷更稳。',{guard:.10,bone:1}),
    item('void-robe','虚纹道袍','robe',2,'衣角像与周围空间错开半寸。',{guard:.09,mind:1,power:.03}),
    item('jade-ring','温玉戒','accessory',0,'温玉养气，久戴身轻。',{rest:3}),
    item('beast-tooth','妖牙坠','accessory',1,'旧猎物留下的獠牙。',{beastPower:.07}),
    item('spirit-bead','聚灵珠','accessory',1,'微弱灵气不断回流经脉。',{cultivate:.05}),
    item('fate-knot','红尘命结','accessory',2,'一缕偶然被系成结。',{luck:2}),
    item('eye-charm','照幽坠','accessory',2,'坠中竖纹会在幻象前发热。',{mind:2,bossPower:.06}),
    item('dao-pin','问道簪','accessory',2,'簪尾刻着一个未完的问句。',{insight:1,xp:.04}),
    item('azure-embryo','青锋剑胚','weapon',2,'本命神兵 · 剑道初胚。剑意尚未定型。',{power:.12,swordPower:.08},{special:true,path:'sword',stage:0,next:'thunder-edge'}),
    item('thunder-edge','雷狱剑','weapon',3,'本命神兵 · 雷与剑意已经同鸣。',{power:.22,swordPower:.16,bossPower:.06},{special:true,path:'sword',stage:1,next:'heaven-rend'}),
    item('heaven-rend','斩界天锋','weapon',4,'本命神兵 · 一线锋芒足以叩问界壁。',{power:.38,swordPower:.24,bossPower:.12},{special:true,path:'sword',stage:2,next:null}),
    item('devour-embryo','噬灵幡胚','weapon',2,'本命神兵 · 幡面只吞一线游离灵气。',{power:.09,devour:.12},{special:true,path:'devour',stage:0,next:'taotie-banner'}),
    item('taotie-banner','饕餮玄幡','weapon',3,'本命神兵 · 幡中饥意已经有了形。',{power:.18,devour:.26,devourHeal:4},{special:true,path:'devour',stage:1,next:'world-eater-banner'}),
    item('world-eater-banner','吞天魔幡','weapon',4,'本命神兵 · 所吞不止血肉，也包括散落法力。',{power:.32,devour:.42,devourHeal:8},{special:true,path:'devour',stage:2,next:null}),
    item('mountain-embryo','镇岳尺胚','weapon',2,'本命神兵 · 重若山石，适合以力证道。',{power:.10,guard:.08},{special:true,path:'body',stage:0,next:'earth-pillar'}),
    item('earth-pillar','地脉镇尺','weapon',3,'本命神兵 · 一尺落下，地脉随之共鸣。',{power:.20,guard:.14,bone:1},{special:true,path:'body',stage:1,next:'sky-bearing-staff'}),
    item('sky-bearing-staff','擎天神岳','weapon',4,'本命神兵 · 器身仿佛承着一座不可见的山。',{power:.35,guard:.20,bone:2},{special:true,path:'body',stage:2,next:null})
  ]);
  const BY_ID = Object.freeze(Object.fromEntries(ITEMS.map(x => [x.id,x])));
  const BASE_IDS = Object.freeze(ITEMS.filter(x => !x.special).map(x => x.id));
  const SPECIAL_ROOTS = Object.freeze(['azure-embryo','devour-embryo','mountain-embryo']);
  function requireThat(ok, message) { if (!ok) throw new Error(message); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function hash(seed, text) {
    let h = (seed >>> 0) ^ 2166136261;
    for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h,16777619); h ^= h >>> 13; }
    return h >>> 0;
  }
  function createState() { return { version:VERSION, slots:{weapon:null,artifact:null,robe:null,accessory:null}, inventory:[], essence:0, seenSources:[], lastDrop:null }; }
  function data(entry) { return BY_ID[entry?.id] || null; }
  function equipped(state, slot) { const uid=state?.slots?.[slot]; return uid ? state.inventory.find(x=>x.uid===uid) || null : null; }
  function effectScale(entry) { return 1 + entry.refinement * .10; }
  function effects(state) {
    validate(state); const out={};
    for (const slot of Object.keys(SLOTS)) {
      const entry=equipped(state,slot), def=data(entry); if (!entry || !def || !entry.identified) continue;
      const scale=effectScale(entry);
      for (const [key,value] of Object.entries(def.effects)) out[key]=(out[key]||0)+value*scale;
    }
    return out;
  }
  function routeRoot(route, h) {
    if (String(route||'').includes('sword')) return 'azure-embryo';
    if (String(route||'').includes('devour')) return 'devour-embryo';
    if (String(route||'').includes('body')) return 'mountain-embryo';
    return SPECIAL_ROOTS[h % SPECIAL_ROOTS.length];
  }
  function pickBase(h, realm) {
    const ceiling = realm >= 5 ? 2 : realm >= 2 ? 1 : 0;
    const pool=BASE_IDS.filter(id=>BY_ID[id].rarity<=ceiling+1);
    return pool[h % pool.length];
  }
  function addDrop(input, seed, sourceKey, kind, realm=0, route='') {
    validate(input); const state=clone(input);
    if (state.seenSources.includes(sourceKey)) return state;
    state.seenSources.push(sourceKey); if (state.seenSources.length>64) state.seenSources.shift();
    const h=hash(seed,`${sourceKey}|${kind}|${realm}|${route}`);
    const chance = kind === 'hunt' ? 32 : kind === 'adventure' ? 48 : 100;
    if (h % 100 >= chance) { state.lastDrop={source:sourceKey,kind,missed:true}; return state; }
    const special = kind === 'boss' || kind === 'tribulation' && ((h>>>8)%2===0);
    const id=special ? routeRoot(route,h>>>7) : pickBase(h>>>5,realm), def=BY_ID[id];
    const uid=`gear-${hash(seed,`${sourceKey}|${id}`).toString(36)}`;
    if (state.inventory.some(x=>x.uid===uid)) return state;
    if (state.inventory.length>=MAX_INVENTORY) {
      const converted=1+def.rarity; state.essence+=converted;
      state.lastDrop={source:sourceKey,kind,id,converted,full:true}; return state;
    }
    state.inventory.push({uid,id,identified:false,refinement:0,xp:0});
    state.lastDrop={source:sourceKey,kind,id,uid,converted:0}; return state;
  }
  function grantWeaponXp(input, amount) {
    validate(input); const state=clone(input), weapon=equipped(state,'weapon');
    if (!weapon || !weapon.identified) return state;
    weapon.xp=Math.min(1000000,weapon.xp+Math.max(0,Math.floor(amount))); return state;
  }
  function observe(input, before, after, action) {
    let state=clone(input); validate(state);
    const realm=after.realm||0, seed=after.seed||1, hostile = before.event?.id==='hunt' && after.xp>before.xp;
    if (hostile) state=grantWeaponXp(state,12+realm*4);
    if (!before.flags?.bossSlain && after.flags?.bossSlain) {
      state=grantWeaponXp(state,70+realm*8);
      state=addDrop(state,seed,'boss:threeeye','boss',realm,after.bossRoute);
    }
    const proofAdded=(after.realmProofs?.length||0)>(before.realmProofs?.length||0);
    if (proofAdded) state=addDrop(state,seed,`proof:${realm}:${before.event?.scene||'world'}`,'proof',realm,after.bossRoute);
    const tribAdded=(after.tribulationRoutes?.length||0)>(before.tribulationRoutes?.length||0);
    if (tribAdded) {
      state=grantWeaponXp(state,90);
      state=addDrop(state,seed,`tribulation:${after.tribulationRoutes.length}`,'tribulation',realm,after.tribulationRoutes.at(-1));
    }
    if (action.type==='resolve' && before.event?.id==='advanced' && after.xp>before.xp) state=addDrop(state,seed,`adventure:${before.revision}:${before.event.scene}`,'adventure',realm,action.choice);
    if (hostile) state=addDrop(state,seed,`hunt:${before.revision}:${before.event.enemy}`,'hunt',realm,before.event.enemy);
    validate(state); return state;
  }
  function identify(input, uid) { const state=clone(input), entry=state.inventory.find(x=>x.uid===uid); requireThat(entry,'找不到这件装备。'); entry.identified=true; validate(state); return state; }
  function equip(input, uid) { const state=clone(input), entry=state.inventory.find(x=>x.uid===uid), def=data(entry); requireThat(entry&&def&&entry.identified,'需要先鉴定这件装备。'); state.slots[def.slot]=uid; validate(state); return state; }
  function unequip(input, slot) { const state=clone(input); requireThat(Object.hasOwn(SLOTS,slot),'未知装备位。'); state.slots[slot]=null; validate(state); return state; }
  function refine(input, uid) {
    const state=clone(input), entry=state.inventory.find(x=>x.uid===uid); requireThat(entry&&entry.identified,'需要先鉴定这件装备。');
    requireThat(entry.refinement<3,'这件装备已经温养圆满。'); const cost=entry.refinement+1; requireThat(state.essence>=cost,`器蕴不足，需要 ${cost}。`);
    state.essence-=cost; entry.refinement++; validate(state); return state;
  }
  function salvage(input, uid) {
    const state=clone(input), index=state.inventory.findIndex(x=>x.uid===uid); requireThat(index>=0,'找不到这件装备。');
    requireThat(!Object.values(state.slots).includes(uid),'已穿戴装备不能归炉。'); const entry=state.inventory[index], def=data(entry);
    state.essence+=1+def.rarity+entry.refinement; state.inventory.splice(index,1); validate(state); return state;
  }
  function evolve(input, uid) {
    const state=clone(input), entry=state.inventory.find(x=>x.uid===uid), def=data(entry); requireThat(entry&&entry.identified&&def?.slot==='weapon'&&def.special,'只有已鉴定的本命神兵可以蜕变。');
    requireThat(def.next,'这条神兵路线已经抵达当前终点。'); const threshold=def.stage===0?80:220; requireThat(entry.xp>=threshold,`神兵历练不足，需要 ${threshold}。`);
    entry.xp-=threshold; entry.id=def.next; validate(state); return state;
  }
  function validate(state) {
    requireThat(state&&state.version===VERSION,'装备存档版本不兼容。');
    requireThat(state.slots&&Object.keys(SLOTS).every(k=>state.slots[k]===null||typeof state.slots[k]==='string'),'装备槽损坏。');
    requireThat(Array.isArray(state.inventory)&&state.inventory.length<=MAX_INVENTORY,'行囊容量损坏。');
    requireThat(new Set(state.inventory.map(x=>x.uid)).size===state.inventory.length,'装备实例重复。');
    for (const entry of state.inventory) requireThat(entry&&/^gear-[a-z0-9]+$/.test(entry.uid)&&BY_ID[entry.id]&&typeof entry.identified==='boolean'&&Number.isInteger(entry.refinement)&&entry.refinement>=0&&entry.refinement<=3&&Number.isInteger(entry.xp)&&entry.xp>=0&&entry.xp<=1000000,'装备数据损坏。');
    for (const [slot,uid] of Object.entries(state.slots)) if (uid) { const entry=state.inventory.find(x=>x.uid===uid); requireThat(entry&&entry.identified&&data(entry).slot===slot,'穿戴关系损坏。'); }
    requireThat(Number.isSafeInteger(state.essence)&&state.essence>=0&&state.essence<=1000000,'器蕴数据损坏。');
    requireThat(Array.isArray(state.seenSources)&&state.seenSources.length<=64&&new Set(state.seenSources).size===state.seenSources.length&&state.seenSources.every(x=>typeof x==='string'&&x.length<120),'掉落来源记录损坏。');
    requireThat(state.lastDrop===null||state.lastDrop&&typeof state.lastDrop.source==='string','最后掉落记录损坏。'); return true;
  }
  return Object.freeze({ VERSION,MAX_INVENTORY,SLOTS,REFINE_NAMES,ITEMS,BY_ID,BASE_IDS,SPECIAL_ROOTS,createState,data,equipped,effects,hash,addDrop,grantWeaponXp,observe,identify,equip,unequip,refine,salvage,evolve,validate });
});
