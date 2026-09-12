(function (root, factory) {
  const meta = factory(
    typeof module === 'object' && module.exports ? require('./data.js') : root.FSData,
    typeof module === 'object' && module.exports ? require('./engine.js') : root.FSEngine,
    typeof module === 'object' && module.exports ? require('./evolution.js') : root.FSEvolution,
    typeof module === 'object' && module.exports ? require('./equipment.js') : root.FSEquipment,
    typeof module === 'object' && module.exports ? require('./spirit-beast.js') : root.FSSpiritBeast,
    typeof module === 'object' && module.exports ? require('./world.js') : root.FSWorld
  );
  if (typeof module === 'object' && module.exports) module.exports = meta;
  else root.FSMeta = meta;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, E, V, G, Z, W) {
  'use strict';
  const VERSION = 4, LEGACY_LIMIT = 24;
  const LAW_NAMES = Object.freeze({devour:'吞噬法则',sword:'锋芒法则',body:'不灭法则',soul:'破妄法则',fortune:'命线法则',insight:'归一法则'});
  const copy = value => JSON.parse(JSON.stringify(value));
  const traceById = id => D.TRACES.find(trace => trace.id === id);
  const unique = values => [...new Set(values.filter(Boolean))];
  const PATHS = Object.freeze({
    devour: Object.freeze({ id: 'devour', name: '吞噬进化流', short: '吞噬', talentPath: '吞噬', next: '继续吞噬高阶妖兽，让夺来的血脉与金丹融合。' }),
    sword: Object.freeze({ id: 'sword', name: '雷剑破界流', short: '剑道', talentPath: '剑道', next: '寻找剑诀、剑骨与灵根共鸣，以一剑打开更高层的阻隔。' }),
    body: Object.freeze({ id: 'body', name: '不灭肉身流', short: '肉身', talentPath: '肉身', next: '继续提高根骨与承伤，让肉身成为最稳定的破局法门。' }),
    soul: Object.freeze({ id: 'soul', name: '神魂妖瞳流', short: '神魂', talentPath: '神魂', next: '提高神识并寻找妖瞳融合，以看破幻境、心魔与界外裂隙。' }),
    fortune: Object.freeze({ id: 'fortune', name: '天命气运流', short: '气运', talentPath: '气运', next: '积累气运与命数，让原本不可见的机缘主动显露。' }),
    insight: Object.freeze({ id: 'insight', name: '悟道归一流', short: '悟道', talentPath: '修炼', next: '提高悟性并贯通五行，以理解代替蛮力取得天地印证。' })
  });
  const BOSS_ROUTES = Object.freeze([
    { id: 'fight', name: '正面镇杀', hint: '以足够战力直接镇杀三眼妖王。' },
    { id: 'see-through', name: '看破第三只眼', hint: '需要高神识或九幽妖瞳。' },
    { id: 'sword-break', name: '一剑斩幻', hint: '需要剑诀与剑道天命或雷剑体。' },
    { id: 'devour-eye', name: '吞其妖眼', hint: '需要足够成熟的吞噬能力。' },
    { id: 'body-charge', name: '以身破幻', hint: '需要高根骨或肉身融合。' },
    { id: 'fate', name: '押上这一世气运', hint: '需要高气运或天命护体。' }
  ]);
  const TRIBULATION_ROUTES = Object.freeze([
    { id: 'endure', name: '以全部修为硬渡', hint: '三劫均可使用的通用路线。' },
    { id: 'fusion', name: '以本世融合承劫', hint: '先完成金丹融合。' },
    { id: 'body', name: '肉身沐天雷', hint: '九霄雷劫中的肉身路线。' },
    { id: 'sword', name: '一剑引雷', hint: '九霄雷劫中的剑道路线。' },
    { id: 'devour', name: '吞下一道天雷', hint: '九霄雷劫中的吞噬路线。' },
    { id: 'mind', name: '照破万千心魔', hint: '问心魔劫中的神魂路线。' },
    { id: 'fate', name: '以命数镇心魔', hint: '问心魔劫中的气运路线。' },
    { id: 'dao', name: '明心见道', hint: '问心魔劫中的悟道路线。' },
    { id: 'cut-gate', name: '一剑叩天门', hint: '天门终劫中的剑道路线。' },
    { id: 'eat-gate', name: '吞天门外溢仙气', hint: '天门终劫中的吞噬路线。' },
    { id: 'step-gate', name: '肉身踏天阶', hint: '天门终劫中的肉身路线。' },
    { id: 'fate-gate', name: '借此世命数开门', hint: '天门终劫中的气运路线。' },
    ...D.TRACES.map(trace => ({ id: trace.route.id, name: trace.route.name, hint: `${trace.name}在对应天劫中开启。` }))
  ]);
  function ascended(state) { return !!(state?.phase === 'complete' && state.flags?.ascended && state.storyOrigin?.chapter !== 'dao'); }
  function effectiveStats(state) {
    try { return E.stats(state); }
    catch { return state?.stats || { bone: 5, insight: 5, luck: 5, mind: 5 }; }
  }
  function talentCount(state, path) {
    return (state?.talents || []).map(id => D.TALENTS.find(talent => talent.id === id)).filter(talent => talent?.path === path).length;
  }
  function hasFusion(state, ...ids) { return ids.includes(state?.fusions?.[0]); }
  function routeUsed(state, ...ids) { return (state?.tribulationRoutes || []).some(id => ids.includes(id)); }
  function pathSignals(state, id, stats) {
    const signals = [];
    if (id === 'devour') {
      if (state.devours) signals.push(`已吞噬 ${state.devours} 次`);
      if (talentCount(state, '吞噬')) signals.push(`${talentCount(state, '吞噬')} 条吞噬天命`);
      if (hasFusion(state, 'devour-body', 'dragon-blood')) signals.push(D.FUSIONS.find(f => f.id === state.fusions[0]).name);
    } else if (id === 'sword') {
      if (state.sword) signals.push('已悟青云剑诀');
      if (talentCount(state, '剑道')) signals.push(`${talentCount(state, '剑道')} 条剑道天命`);
      if (hasFusion(state, 'thunder-sword')) signals.push('雷剑体');
    } else if (id === 'body') {
      signals.push(`根骨 ${stats.bone}`);
      if (talentCount(state, '肉身')) signals.push(`${talentCount(state, '肉身')} 条肉身天命`);
      if (hasFusion(state, 'golden-body', 'flame-scale')) signals.push(D.FUSIONS.find(f => f.id === state.fusions[0]).name);
    } else if (id === 'soul') {
      signals.push(`神识 ${stats.mind}`);
      if (state.mutations?.[0] === 'serpenteye') signals.push('蛇瞳');
      if (hasFusion(state, 'abyss-eye')) signals.push('九幽妖瞳');
    } else if (id === 'fortune') {
      signals.push(`气运 ${stats.luck}`);
      if (talentCount(state, '气运')) signals.push(`${talentCount(state, '气运')} 条气运天命`);
      if (hasFusion(state, 'fate-veil')) signals.push('天命护体');
    } else {
      signals.push(`悟性 ${stats.insight}`);
      if (talentCount(state, '修炼')) signals.push(`${talentCount(state, '修炼')} 条修炼天命`);
      if (hasFusion(state, 'five-unity')) signals.push('五行归一');
    }
    if (state.carriedTrace === id) signals.push(`继承「${traceById(id).name}」`);
    return signals.slice(0, 3);
  }
  function pathScores(state) {
    const s = state || {}, a = effectiveStats(s), mutation = s.mutations?.[0], fusion = s.fusions?.[0];
    const values = {
      devour: talentCount(s, '吞噬') * 4 + (s.devours || 0) * 1.6 + (mutation === 'serpentblood' ? 4 : 0) + (['devour-body', 'dragon-blood'].includes(fusion) ? 7 : 0) + (s.bossRoute === 'devour-eye' ? 4 : 0) + (routeUsed(s, 'devour', 'eat-gate', 'trace-devour') ? 4 : 0),
      sword: talentCount(s, '剑道') * 4 + (s.sword ? 5 : 0) + (fusion === 'thunder-sword' ? 8 : 0) + (s.bossRoute === 'sword-break' ? 4 : 0) + (routeUsed(s, 'sword', 'cut-gate', 'trace-sword') ? 4 : 0),
      body: talentCount(s, '肉身') * 4 + Math.max(0, a.bone - 5) * 1.1 + (mutation === 'redscale' ? 4 : 0) + (['golden-body', 'flame-scale'].includes(fusion) ? 7 : 0) + (s.bossRoute === 'body-charge' ? 4 : 0) + (routeUsed(s, 'body', 'step-gate', 'trace-body') ? 4 : 0),
      soul: talentCount(s, '神魂') * 4 + Math.max(0, a.mind - 5) * 1.15 + (mutation === 'serpenteye' ? 5 : 0) + (fusion === 'abyss-eye' ? 8 : 0) + (s.bossRoute === 'see-through' ? 4 : 0) + (routeUsed(s, 'mind', 'trace-soul') ? 4 : 0),
      fortune: talentCount(s, '气运') * 4 + Math.max(0, a.luck - 5) * 1.05 + (fusion === 'fate-veil' ? 8 : 0) + (s.bossRoute === 'fate' ? 4 : 0) + (routeUsed(s, 'fate', 'fate-gate', 'trace-fortune') ? 4 : 0),
      insight: talentCount(s, '修炼') * 4 + Math.max(0, a.insight - 5) * 1.05 + (fusion === 'five-unity' ? 8 : 0) + (routeUsed(s, 'dao', 'trace-insight') ? 4 : 0)
    };
    if (s.carriedTrace && values[s.carriedTrace] !== undefined) values[s.carriedTrace] += 1;
    return Object.keys(PATHS).map(id => ({ ...PATHS[id], score: Math.round(values[id] * 10) / 10, signals: pathSignals(s, id, a) }))
      .sort((left, right) => right.score - left.score || Object.keys(PATHS).indexOf(left.id) - Object.keys(PATHS).indexOf(right.id));
  }
  function nextHint(state, id) {
    if (!state || ['talents', 'attributes'].includes(state.phase)) return '先选择三条天命并完成属性分配，道途会随真实选择逐渐显形。';
    if (!state.flags?.pythonSeen) return '先在黑风岭活过赤鳞妖蟒的第一次出现。';
    if (state.realm < 2) return '修至筑基，回到旧地吞噬赤鳞妖蟒，确定第一次异变。';
    if (!state.mutations?.length) return '吞噬赤鳞妖蟒，从赤鳞、蛇瞳与妖蟒血中确定第一次异变。';
    if (state.realm < 3) return '将第一次异变带入金丹，让已有能力发生第一次融合。';
    if (!state.fusions?.length) return '从金丹融合候选中选择最能延续当前道途的一项。';
    if (!state.flags?.bossSlain) return '完成两处金丹机缘，再让当前 Build 决定如何击败三眼妖王。';
    if (state.realm >= 4 && state.realm <= 8 && !state.realmProofs?.includes(state.realm)) return `通过历练完成${D.REALMS[state.realm].name}的天地印证。`;
    if (state.phase === 'tribulation') return state.carriedTrace ? `前世「${traceById(state.carriedTrace).name}」会在对应天劫中开启一次专属路线。` : '让本世融合与已经形成的流派决定三重天劫的路线。';
    if (ascended(state)) return '此世已经闭环。凝练一枚道痕，让下一世从不同的可能开始。';
    return PATHS[id].next;
  }
  function classifyPath(state) {
    if (!state || ['talents', 'attributes'].includes(state.phase)) return { id: null, name: '道途未定', short: '未定', score: 0, stage: '未显', signals: [], next: nextHint(state) };
    const top = pathScores(state)[0], stage = top.score < 7 ? '初显' : top.score < 14 ? '成形' : top.score < 24 ? '稳固' : '圆满';
    return { ...top, stage, next: nextHint(state, top.id) };
  }
  const TITLE_RULES = Object.freeze([
    { id: 'myriad-devourer', name: '万妖归腹', hint: '以高吞噬次数完成飞升。', description: '凡界万妖皆成一口修为。', test: s => ascended(s) && s.devours >= 6 },
    { id: 'sword-opens-heaven', name: '一剑开天', hint: '以剑道路线完成天门终劫。', description: '天门未开，便以一剑令它打开。', test: s => ascended(s) && routeUsed(s, 'cut-gate', 'trace-sword') },
    { id: 'undying-body', name: '不灭道躯', hint: '以肉身路线承受雷劫或踏过天阶。', description: '雷火能伤其表，不能动其道骨。', test: s => ascended(s) && routeUsed(s, 'body', 'step-gate', 'trace-body') },
    { id: 'clear-all-delusions', name: '照破诸妄', hint: '看破三眼妖王，并以神魂路线渡过心魔。', description: '妖眼、心魔与虚妄皆无所遁形。', test: s => ascended(s) && s.bossRoute === 'see-through' && routeUsed(s, 'mind', 'trace-soul') },
    { id: 'favored-by-fate', name: '天命所归', hint: '以气运融合或命数路线完成飞升。', description: '一路偶然，最终汇成无法回避的命数。', test: s => ascended(s) && (hasFusion(s, 'fate-veil') || routeUsed(s, 'fate', 'fate-gate', 'trace-fortune')) },
    { id: 'dao-at-dawn', name: '朝闻大道', hint: '以高悟性、五行归一或明心见道完成飞升。', description: '此生所求不是活得最久，而是终于想通。', test: s => ascended(s) && (effectiveStats(s).insight >= 13 || hasFusion(s, 'five-unity') || routeUsed(s, 'dao', 'trace-insight')) },
    { id: 'flawless-ascension', name: '无暇飞升', hint: '全程不败退、不触发重生并完成飞升；旧档缺完整败退记录时不补发。', description: '自入山起，所有险阻都在第一次选择中被跨过。', test: s => ascended(s) && s.defeats === 0 && s.rebirthUsed === 0 && !(s.log || []).some(entry => /败退|受创|负伤而归/.test(`${entry.title}${entry.text}`)) },
    { id: 'against-lifespan', name: '逆寿成仙', hint: '在入劫前大乘寿元达到 82% 后完成飞升。', description: '最后一段寿元烧尽之前，天门终于洞开。', test: s => ascended(s) && s.age / E.maxAge({ ...s, realm: 8 }) >= 0.82 },
    { id: 'mortal-ascender', name: '凡界飞升者', hint: '完成三重天劫并飞升。', description: '从黑风岭起步，最终走出整个凡界。', test: s => ascended(s) }
  ]);
  function endingTitles(state) { return TITLE_RULES.filter(rule => rule.test(state)).map(({ test, ...rule }) => rule); }
  function traceCandidates(state) {
    if (!state || !['complete', 'dead'].includes(state.phase)) return [];
    return pathScores(state).slice(0, 3).map(path => {
      const trace = traceById(path.id);
      return { ...trace, score: path.score, reason: path.signals.join(' · ') || `此世的${path.short}倾向最为清晰` };
    });
  }
  function discoveries() {
    return { talents: [], mutations: [], fusions: [], highEvents: [], bossRoutes: [], tribulationRoutes: [], titles: [], traces: [],
      traceEvents: [], immortalLaws: [], evolutionTraits: [], evolutionFusions: [], worlds: [] };
  }
  function legacyState() { return { echoes: [], legends: [] }; }
  const BRIDGE_VERSION = 1;
  const exactKeys = (value, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const actual = Object.keys(value).sort(), expected = [...keys].sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
  };
  function validateMortalBridge(bridge) {
    if (!exactKeys(bridge, ['version','sourceSeed','ascendedPower','lineage','mortalFusion','ascendedAge','companion'])) throw new Error('凡尘跨卷桥梁字段损坏。');
    if (bridge.version !== BRIDGE_VERSION || !Number.isInteger(bridge.sourceSeed) || bridge.sourceSeed <= 0 || bridge.sourceSeed > 4294967295) throw new Error('凡尘跨卷桥梁来源损坏。');
    if (!Number.isSafeInteger(bridge.ascendedPower) || bridge.ascendedPower <= 0 || !Number.isSafeInteger(bridge.ascendedAge) || bridge.ascendedAge < 16 || bridge.ascendedAge > 200000) throw new Error('凡尘跨卷桥梁数值损坏。');
    if (!PATHS[bridge.lineage] || !D.FUSIONS.some(item => item.id === bridge.mortalFusion)) throw new Error('凡尘跨卷桥梁道基损坏。');
    if (bridge.companion !== null) {
      if (!exactKeys(bridge.companion, ['species','stage','branch']) || !Z?.BY_ID?.[bridge.companion.species] || !Number.isInteger(bridge.companion.stage) || bridge.companion.stage < 0 || bridge.companion.stage > 3) throw new Error('凡尘跨卷桥梁灵兽损坏。');
      if (bridge.companion.stage < 2 ? bridge.companion.branch !== null : !['wild','sacred'].includes(bridge.companion.branch)) throw new Error('凡尘跨卷桥梁灵兽分支损坏。');
    }
    return true;
  }
  function createMortalBridge(state) {
    if (!ascended(state) || !Number.isSafeInteger(state.ascendedPower) || state.ascendedPower <= 0 || !D.FUSIONS.some(item => item.id === state.fusions?.[0])) throw new Error('只有真实完成飞升的本世才能生成凡尘桥梁。');
    const origin = state.storyOrigin?.chapter === 'immortal' ? state.storyOrigin : null;
    const lineage = origin?.lineage || classifyPath(state).id || 'insight';
    const mortalFusion = origin?.mortalFusion || state.fusions[0];
    const beast = state.spiritBeast ? Z?.summary?.(state.spiritBeast) : null;
    const companion = beast ? { species:beast.species, stage:Math.min(3,beast.stage), branch:beast.branch } : null;
    const bridge = { version: BRIDGE_VERSION, sourceSeed: state.seed, ascendedPower: state.ascendedPower, lineage, mortalFusion, ascendedAge: state.age, companion };
    validateMortalBridge(bridge); return bridge;
  }
  function mergeMortalBridge(existing, candidate) {
    if (!existing || existing.sourceSeed !== candidate.sourceSeed) return candidate;
    const oldStage = existing.companion?.stage ?? -1;
    const newStage = candidate.companion?.stage ?? -1;
    return newStage > oldStage ? candidate : existing;
  }
  function validateImmortalBridge(bridge) {
    if (!exactKeys(bridge, ['version','sourceSeed','lineage','law','mortalFusion','slots'])) throw new Error('仙界跨卷桥梁字段损坏。');
    if (bridge.version !== BRIDGE_VERSION || !Number.isInteger(bridge.sourceSeed) || bridge.sourceSeed <= 0 || bridge.sourceSeed > 4294967295) throw new Error('仙界跨卷桥梁来源损坏。');
    if (!PATHS[bridge.lineage] || !LAW_NAMES[bridge.law] || !D.FUSIONS.some(item => item.id === bridge.mortalFusion)) throw new Error('仙界跨卷桥梁道基损坏。');
    if (!exactKeys(bridge.slots, Object.keys(V.SLOTS))) throw new Error('仙界跨卷桥梁五槽损坏。');
    for (const [slot, item] of Object.entries(bridge.slots)) {
      if (!item || !exactKeys(item, ['id','level']) || !V.TRAITS.some(trait => trait.id === item.id && trait.slot === slot) || !Number.isInteger(item.level) || item.level < 1 || item.level > 5) throw new Error('仙界跨卷桥梁槽位损坏。');
    }
    return true;
  }
  function createImmortalBridge(state) {
    const immortal = state?.immortal, evolution = immortal?.evolution;
    if (!immortal || immortal.phase !== 'ending' || !evolution?.completed) throw new Error('只有真实完成仙界正式结局的存档才能生成仙界桥梁。');
    const slots = {};
    for (const slot of Object.keys(V.SLOTS)) {
      const item = evolution.slots?.[slot];
      if (!item) throw new Error('仙界正式结局缺少完整五槽。');
      slots[slot] = { id: item.id, level: item.level };
    }
    const bridge = { version: BRIDGE_VERSION, sourceSeed: state.seed, lineage: immortal.lineage, law: immortal.law, mortalFusion: immortal.mortalFusion, slots };
    validateImmortalBridge(bridge); return bridge;
  }
  function endingSummaries(){return {mortal:null,immortal:null,dao:null};}
  function validateEndingSummary(kind,row){
    if(row===null)return true;
    if(kind==='mortal'){
      if(!exactKeys(row,['version','sourceSeed','title','path','age','power'])||row.version!==1||!Number.isInteger(row.sourceSeed)||row.sourceSeed<=0||row.sourceSeed>4294967295||typeof row.title!=='string'||row.title.length>80||!PATHS[row.path]||!Number.isSafeInteger(row.age)||row.age<16||row.age>200000||!Number.isSafeInteger(row.power)||row.power<=0)throw new Error('凡尘结局摘要损坏。');
    }else if(kind==='immortal'){
      if(!exactKeys(row,['version','sourceSeed','title','law','slots'])||row.version!==1||!Number.isInteger(row.sourceSeed)||row.sourceSeed<=0||row.sourceSeed>4294967295||row.title!=='噬界者'||!LAW_NAMES[row.law]||!exactKeys(row.slots,Object.keys(V.SLOTS)))throw new Error('仙界结局摘要损坏。');
      for(const [slot,item] of Object.entries(row.slots))if(!item||!exactKeys(item,['id','level'])||!V.TRAITS.some(t=>t.id===item.id&&t.slot===slot)||!Number.isInteger(item.level)||item.level<1||item.level>5)throw new Error('仙界结局摘要五槽损坏。');
    }else if(kind==='dao'){
      if(!exactKeys(row,['version','sourceSeed','title','choice','vitality','order','worldName'])||row.version!==1||!Number.isInteger(row.sourceSeed)||row.sourceSeed<=0||row.sourceSeed>4294967295||!W.ENDINGS.some(x=>x.id===row.choice&&x.name===row.title)||typeof row.worldName!=='string'||row.worldName.length<1||row.worldName.length>80||!Number.isInteger(row.vitality)||row.vitality<0||row.vitality>100||!Number.isInteger(row.order)||row.order<0||row.order>100)throw new Error('证道结局摘要损坏。');
    }else throw new Error('未知结局摘要。');
    return true;
  }
  function mortalEndingSummary(state){
    const bridge=createMortalBridge(state),title=endingTitles(state)[0]?.name||'凡界飞升者';
    return {version:1,sourceSeed:state.seed,title,path:bridge.lineage,age:state.age,power:state.ascendedPower};
  }
  function immortalEndingSummary(state){
    const bridge=createImmortalBridge(state);return {version:1,sourceSeed:state.seed,title:'噬界者',law:bridge.law,slots:copy(bridge.slots)};
  }
  function daoEndingSummary(state){
    const world=state?.world,ending=W.ENDINGS.find(x=>x.id===world?.story?.ending);if(!world||!ending||world.phase!=='ending'||!world.story?.completed||world.story.sandbox)throw new Error('只有第三卷正式证道结局才能生成摘要。');
    return {version:1,sourceSeed:world.seed,title:ending.name,choice:ending.id,vitality:world.vitality,order:world.order,worldName:W.name(world)};
  }
  function storyProgress() {
    return { version: 2, mortalCleared: false, immortalCleared: false, daoCleared: false, lastMortalBridge: null, lastImmortalBridge: null, endings:endingSummaries() };
  }
  function createMeta() {
    return { version: VERSION, nextTrace: null, nextTraceSource: null, tutorialHidden: false, tutorialSeen: [], totals: { ended: 0, ascended: 0 }, discovered: discoveries(), runHistory: [], legacy: legacyState(), storyProgress: storyProgress() };
  }
  const validIds = Object.freeze({
    talents: D.TALENTS.map(x => x.id), mutations: D.MUTATIONS.map(x => x.id), fusions: D.FUSIONS.map(x => x.id),
    highEvents: D.HIGH_EVENTS.map(x => x.id), bossRoutes: BOSS_ROUTES.map(x => x.id),
    tribulationRoutes: TRIBULATION_ROUTES.map(x => x.id), titles: TITLE_RULES.map(x => x.id), traces: D.TRACES.map(x => x.id),
    traceEvents: D.TRACES.flatMap(t => [`${t.id}-echo`, `${t.id}-resonance`]), immortalLaws: Object.keys(LAW_NAMES),
    evolutionTraits: V.TRAITS.map(t => t.id), evolutionFusions: V.RECIPES.map(r => r.id), worlds: ['1','2','3','4']
  });
  function validate(meta) {
    if (meta?.tutorialHidden !== undefined && typeof meta.tutorialHidden !== 'boolean') throw new Error('批注设置损坏。');
    if (meta?.tutorialSeen !== undefined && (!Array.isArray(meta.tutorialSeen) || meta.tutorialSeen.length > 6 || meta.tutorialSeen.some(id => !['talents', 'python', 'path', 'fusion', 'tribulation', 'reincarnation'].includes(id)))) throw new Error('批注记录损坏。');
    if (!meta || typeof meta !== 'object' || Array.isArray(meta) || meta.version !== VERSION) throw new Error('轮回册版本不兼容。');
    if (meta.nextTrace !== null && !traceById(meta.nextTrace)) throw new Error('待继承道痕损坏。');
    if (meta.nextTraceSource !== null && (!Number.isInteger(meta.nextTraceSource) || meta.nextTraceSource <= 0 || meta.nextTraceSource > 4294967295)) throw new Error('道痕来源损坏。');
    if ((meta.nextTrace === null) !== (meta.nextTraceSource === null)) throw new Error('待继承道痕与来源不一致。');
    if (!meta.totals || !Number.isSafeInteger(meta.totals.ended) || !Number.isSafeInteger(meta.totals.ascended) || meta.totals.ended < 0 || meta.totals.ascended < 0 || meta.totals.ascended > meta.totals.ended) throw new Error('轮回统计损坏。');
    if (!meta.discovered || typeof meta.discovered !== 'object') throw new Error('命途图谱损坏。');
    for (const [key, ids] of Object.entries(validIds)) {
      const list = meta.discovered[key];
      if (!Array.isArray(list) || list.length > ids.length || new Set(list).size !== list.length || list.some(id => !ids.includes(id))) throw new Error(`命途图谱损坏：${key}。`);
    }
    if (!Array.isArray(meta.runHistory) || meta.runHistory.length > 50 || new Set(meta.runHistory.map(r=>r?.seed)).size !== meta.runHistory.length || meta.runHistory.some(run => !run || !Number.isInteger(run.seed) || run.seed <= 0 || run.seed > 4294967295 || typeof run.ending !== 'string' || run.ending.length > 200 || typeof run.ascended !== 'boolean' || (run.trace !== undefined && run.trace !== null && !traceById(run.trace)) || (run.sourceSeed !== undefined && run.sourceSeed !== null && (!Number.isInteger(run.sourceSeed) || run.sourceSeed <= 0 || run.sourceSeed > 4294967295)) || (run.bossRoute !== undefined && run.bossRoute !== null && !BOSS_ROUTES.some(x=>x.id===run.bossRoute)) || (run.tribulationRoutes !== undefined && (!Array.isArray(run.tribulationRoutes) || run.tribulationRoutes.length>3 || run.tribulationRoutes.some(id=>id!=='legacy'&&!TRIBULATION_ROUTES.some(x=>x.id===id)))) || (run.summary !== undefined && (typeof run.summary!=='string' || run.summary.length>500)))) throw new Error('轮回历程损坏。');
    if (!meta.legacy || typeof meta.legacy !== 'object' || Array.isArray(meta.legacy)) throw new Error('百世回响损坏。');
    if (!Array.isArray(meta.legacy.echoes) || meta.legacy.echoes.length > LEGACY_LIMIT || new Set(meta.legacy.echoes.map(x=>x?.id)).size !== meta.legacy.echoes.length || meta.legacy.echoes.some(x=>!x||typeof x.id!=='string'||x.id.length>180||!Number.isInteger(x.sourceSeed)||x.sourceSeed<=0||x.sourceSeed>4294967295||typeof x.source!=='string'||x.source.length>180||typeof x.relation!=='string'||x.relation.length>120||typeof x.outcome!=='string'||x.outcome.length>160)) throw new Error('前世因果回声损坏。');
    if (!Array.isArray(meta.legacy.legends) || meta.legacy.legends.length > LEGACY_LIMIT || new Set(meta.legacy.legends.map(x=>x?.id)).size !== meta.legacy.legends.length || meta.legacy.legends.some(x=>!x||typeof x.id!=='string'||x.id.length>180||!['weapon','beast'].includes(x.type)||!Number.isInteger(x.sourceSeed)||x.sourceSeed<=0||x.sourceSeed>4294967295||typeof x.name!=='string'||x.name.length>120||typeof x.text!=='string'||x.text.length>300||(x.stage!==undefined&&(!Number.isInteger(x.stage)||x.stage<0||x.stage>(x.type==='beast'?4:2))))) throw new Error('前世传说损坏。');
    const story=meta.storyProgress;
    if (!exactKeys(story, ['version','mortalCleared','immortalCleared','daoCleared','lastMortalBridge','lastImmortalBridge','endings']) || story.version!==2 || ['mortalCleared','immortalCleared','daoCleared'].some(k=>typeof story[k]!=='boolean') || !exactKeys(story.endings,['mortal','immortal','dao'])) throw new Error('三卷进度损坏。');
    if (story.lastMortalBridge !== null) validateMortalBridge(story.lastMortalBridge);
    if (story.lastImmortalBridge !== null) validateImmortalBridge(story.lastImmortalBridge);
    for(const kind of ['mortal','immortal','dao'])validateEndingSummary(kind,story.endings[kind]);
    if (story.lastMortalBridge && !story.mortalCleared) throw new Error('凡尘桥梁缺少第一卷完成标记。');
    if (story.lastImmortalBridge && !story.immortalCleared) throw new Error('仙界桥梁缺少第二卷完成标记。');
    if (story.endings.mortal && !story.mortalCleared || story.endings.immortal && !story.immortalCleared || story.endings.dao && !story.daoCleared) throw new Error('结局摘要与三卷完成状态不一致。');
    if (story.immortalCleared && !story.mortalCleared) throw new Error('三卷进度顺序损坏。');
    if (story.daoCleared && !story.immortalCleared) throw new Error('证道进度缺少仙界前置。');
    return true;
  }
  function serialize(meta) { validate(meta); return JSON.stringify(meta); }
  function deserialize(text) {
    if (typeof text !== 'string' || text.length > 200000) throw new Error('轮回册文件无效。');
    const meta = JSON.parse(text);
    if (meta?.version === 1) {
      meta.version = 2;
      if (!meta.discovered || typeof meta.discovered !== 'object' || Array.isArray(meta.discovered)) throw new Error('旧轮回册图谱损坏。');
      for (const key of ['traceEvents','immortalLaws','evolutionTraits','evolutionFusions','worlds']) meta.discovered[key] = [];
      if (meta.tutorialHidden === undefined) meta.tutorialHidden = false;
      if (meta.tutorialSeen === undefined) meta.tutorialSeen = [];
    }
    if (meta?.version === 2) { meta.version = 3; meta.legacy = legacyState(); }
    if (meta?.version === 3) {
      meta.version = 4; meta.storyProgress = storyProgress();
      if (Number.isSafeInteger(meta.totals?.ascended) && meta.totals.ascended > 0) meta.storyProgress.mortalCleared = true;
    }
    if (meta?.version === 4 && meta.storyProgress?.version === 1) {
      meta.storyProgress = { ...meta.storyProgress, version:2, endings:endingSummaries() };
    }
    validate(meta); return meta;
  }
  function add(discovered, key, values) { discovered[key] = unique([...discovered[key], ...values]).filter(id => validIds[key].includes(id)); }
  function addLegacy(list, value) {
    if (!value || list.some(item => item.id === value.id)) return;
    list.unshift(value); if (list.length > LEGACY_LIMIT) list.length = LEGACY_LIMIT;
  }
  function legendStage(value) {
    if (value.stage !== undefined) return value.stage;
    // Early v3 ledgers encoded the stage in catalog IDs instead of a field.
    // Do not guess an unrecognized old record's strength from its prose.
    if (value.type === 'weapon') {
      const prefix=`weapon:${value.sourceSeed}:`, def=value.id.startsWith(prefix)?G?.BY_ID[value.id.slice(prefix.length)]:null;
      return def?.special ? def.stage : Infinity;
    }
    const parts=value.id.split(':');
    return parts.length===5&&parts[0]==='beast'&&parts[1]===String(value.sourceSeed)&&Z?.BY_ID[parts[2]]&&['none','wild','sacred'].includes(parts[3])&&/^[0-4]$/.test(parts[4]) ? Number(parts[4]) : Infinity;
  }
  function addLegend(list, value) {
    const matches=list.filter(item=>item.type===value.type&&item.sourceSeed===value.sourceSeed);
    if (!matches.length) { addLegacy(list,value); return; }
    const best=matches.reduce((left,right)=>legendStage(right)>legendStage(left)?right:left);
    const replacement=legendStage(value)>legendStage(best)?value:best;
    const index=list.indexOf(matches[0]);
    list.splice(index,1,replacement);
    for (let i=list.length-1;i>index;i--) if(list[i].type===value.type&&list[i].sourceSeed===value.sourceSeed) list.splice(i,1);
  }
  function runSummary(state, profile, title) {
    const origin = D.ORIGINS.find(x=>x.id===state.origin)?.name || '无名出身';
    const realm = D.REALMS[state.realm]?.name || '未知境界';
    return `${origin}出身，走成「${profile.name}」；${state.flags?.ascended ? `于 ${state.age} 岁飞升` : `止步${realm}`}。${title ? `世人后来称其「${title.name}」。` : ''}`;
  }
  function collectLegacy(next, state) {
    for (const row of state.karma?.summaries || []) addLegacy(next.legacy.echoes, {
      id:`karma:${state.seed}:${row.sourceKey}`,sourceSeed:state.seed,source:row.source,relation:row.relation,outcome:row.outcome
    });
    const specials=(state.equipment?.inventory||[]).map(entry=>({entry,def:G?.data(entry)})).filter(x=>x.entry.identified&&x.def?.special)
      .sort((a,b)=>(b.def.stage||0)-(a.def.stage||0)||b.entry.xp-a.entry.xp);
    if (specials[0]) addLegend(next.legacy.legends, {id:`weapon:${state.seed}:${specials[0].def.id}`,type:'weapon',sourceSeed:state.seed,name:specials[0].def.name,stage:specials[0].def.stage,
      text:`此世曾持本命神兵「${specials[0].def.name}」，走到第 ${(specials[0].def.stage||0)+1} 段。后世只记其名，不继承装备数值。`});
    const beast=state.spiritBeast?.companion ? Z?.summary(state.spiritBeast) : null;
    if (beast) addLegend(next.legacy.legends, {id:`beast:${state.seed}:${beast.species}:${beast.branch||'none'}:${beast.stage}`,type:'beast',sourceSeed:state.seed,name:beast.name,stage:beast.stage,
      text:`此世曾与「${beast.name}」同行至${beast.stageName}${beast.branchName?` · ${beast.branchName}`:''}。后世只听见这段灵契传说。`});
  }
  function observe(meta, state) {
    validate(meta); if (!state) return copy(meta);
    const next = copy(meta), found = next.discovered;
    if (ascended(state)) {
      next.storyProgress.mortalCleared = true;
      next.storyProgress.lastMortalBridge = mergeMortalBridge(next.storyProgress.lastMortalBridge, createMortalBridge(state));
      if(state.storyOrigin?.chapter!=='immortal'||!next.storyProgress.endings.mortal) next.storyProgress.endings.mortal = mortalEndingSummary(state);
    }
    if (state.immortal?.evolution?.completed) {
      next.storyProgress.mortalCleared = true;
      next.storyProgress.immortalCleared = true;
      // The bridge is frozen at the formal second-story ending. Endless mode
      // may continue changing the five slots, so later postgame observations
      // must never rewrite (or attempt to reconstruct) that ending snapshot.
      if (state.immortal.phase === 'ending') {
        next.storyProgress.lastImmortalBridge = createImmortalBridge(state);
        next.storyProgress.endings.immortal = immortalEndingSummary(state);
      }
    }
    if (state.world?.phase === 'ending') {
      next.storyProgress.mortalCleared = true; next.storyProgress.immortalCleared = true; next.storyProgress.daoCleared = true;
      if(state.world.story?.completed&&!state.world.story.sandbox) next.storyProgress.endings.dao = daoEndingSummary(state);
    }
    add(found, 'talents', state.talents || []); add(found, 'mutations', state.mutations || []); add(found, 'fusions', state.fusions || []);
    add(found, 'highEvents', state.highSeen || []); add(found, 'bossRoutes', [state.bossRoute]); add(found, 'tribulationRoutes', state.tribulationRoutes || []);
    add(found, 'traces', [state.carriedTrace]);
    if (state.carriedTrace) {
      add(found, 'traceEvents', [state.flags?.traceEchoSeen ? `${state.carriedTrace}-echo` : null,
        state.flags?.traceResonanceSeen ? `${state.carriedTrace}-resonance` : null]);
    }
    if (state.immortal) {
      add(found, 'immortalLaws', [state.immortal.law]);
      const evolution = state.immortal.evolution;
      if (evolution) {
        add(found, 'evolutionTraits', Object.values(evolution.slots).filter(Boolean).map(item => item.id));
        add(found, 'evolutionFusions', evolution.fusions);
        add(found, 'worlds', [String(evolution.world), ...evolution.cleared.map(String)]);
      }
    }
    if (['complete', 'dead'].includes(state.phase) && state.storyOrigin?.chapter!=='dao') {
      const titles = endingTitles(state), traces = traceCandidates(state);
      add(found, 'titles', titles.map(title => title.id)); add(found, 'traces', traces.map(trace => trace.id));
      collectLegacy(next,state);
      if (!next.runHistory.some(run => run.seed === state.seed)) {
        next.totals.ended++;
        if (ascended(state)) { next.totals.ascended++; next.tutorialHidden = true; }
        const profile = classifyPath(state);
        next.runHistory.unshift({ seed: state.seed, ending: state.ending || state.phase, ascended: ascended(state), realm: state.realm, age: state.age, power: ascended(state) ? state.ascendedPower : E.power(state), path: profile.id, title: titles[0]?.id || null,
          trace: state.carriedTrace || null, sourceSeed: state.traceSourceSeed || null, origin:state.origin||null, root:state.root||null, bossRoute:state.bossRoute||null, tribulationRoutes:[...(state.tribulationRoutes||[])],
          summary:runSummary(state,profile,titles[0]) });
        next.runHistory = next.runHistory.slice(0, 50);
      }
    }
    validate(next); return next;
  }
  function selectTrace(meta, state, id) {
    validate(meta);
    if (!traceCandidates(state).some(trace => trace.id === id)) throw new Error('这一世尚未凝成该道痕。');
    const next = copy(meta); next.nextTrace = id; next.nextTraceSource = state.seed; add(next.discovered, 'traces', [id]); validate(next); return next;
  }
  function consumeTrace(meta) {
    validate(meta); const next = copy(meta), trace = next.nextTrace;
    next.nextTrace = null; next.nextTraceSource = null; validate(next); return { meta: next, trace };
  }
  function reconcile(meta, state) {
    validate(meta);
    // A new run records the inherited mark's source before the ledger is saved.
    // Retry that one pending consumption if writing the second key was interrupted.
    if (state?.traceSourceSeed && state.seed !== state.traceSourceSeed && state.traceSourceSeed === meta.nextTraceSource && state.carriedTrace === meta.nextTrace) return consumeTrace(meta).meta;
    return copy(meta);
  }
  function recentLives(meta, currentSeed = null, limit = 5) {
    validate(meta); return meta.runHistory.filter(run=>run.seed!==currentSeed).slice(0,Math.max(0,Math.min(12,limit)));
  }
  function previousRun(meta, state) {
    const lives=recentLives(meta,state?.seed,12);
    return lives.find(run=>state?.traceSourceSeed&&run.seed===state.traceSourceSeed)||lives[0]||null;
  }
  function eventMemory(meta, state, eventId) {
    const run=previousRun(meta,state); if(!run)return '';
    if(eventId==='arrival') return `轮回册里仍留着一行旧字：${run.summary||`上一世走成了${PATHS[run.path]?.name||'另一条道'}。`} 这只是记忆，不替这一世增加属性。`;
    if(eventId==='first-python'&&run.ascended) return '你忽然记起：前世的自己也曾在这条山路前弱得必须退走。记得结局，不等于此刻拥有前世的力量。';
    if(eventId==='boss'&&run.bossRoute) return `前世传说曾以「${BOSS_ROUTES.find(x=>x.id===run.bossRoute)?.name||run.bossRoute}」破过妖王；这一世是否能走同路，仍只看当前 Build。`;
    return '';
  }
  function routeMemory(meta, state, type, id) {
    const run=previousRun(meta,state); if(!run)return '';
    if(type==='boss'&&run.bossRoute===id)return '前世曾以此路破局';
    if(type==='tribulation'&&(run.tribulationRoutes||[]).includes(id))return '前世曾以此法承劫';
    return '';
  }
  function legacySnapshot(meta, currentSeed = null) {
    validate(meta); return { lives:recentLives(meta,currentSeed,8), echoes:meta.legacy.echoes.slice(0,LEGACY_LIMIT), legends:meta.legacy.legends.slice(0,LEGACY_LIMIT) };
  }
  function entry(id, name, detail, hint, discovered) { return { id, name: discovered ? name : '？？？', detail: discovered ? detail : '', hint, discovered }; }
  function codexSections(meta) {
    validate(meta); const found = meta.discovered, has = (key, id) => found[key].includes(id);
    const sections = [
      { id: 'talents', name: '天命与前世天命', entries: D.TALENTS.map(item => entry(item.id, item.name, `${item.path} · ${D.RARITIES[item.rarity].name}品｜${item.description}`,
        item.exclusiveTrace ? `携「${traceById(item.exclusiveTrace).name}」转世，在八选三中选择此命。` : `${item.path}天命 · ${D.RARITIES[item.rarity].name}品 · 需实际择入命格。`, has('talents', item.id))) },
      { id: 'mutations', name: '首次异变', entries: D.MUTATIONS.map(item => entry(item.id, item.name, `${item.slot}｜${item.description}`, '筑基后吞噬赤鳞妖蟒，在三种妖血方向中选择。', has('mutations', item.id))) },
      { id: 'fusions', name: '金丹融合', entries: D.FUSIONS.map(item => entry(item.id, item.name, `${item.path}｜${item.description}`, `成因：${item.requirement}`, has('fusions', item.id))) },
      { id: 'highEvents', name: '天地印证', entries: D.HIGH_EVENTS.map(item => entry(item.id, item.title, `${D.REALMS[item.realm].name}｜${item.text}`, `在${D.REALMS[item.realm].name}历练时可能遭遇。`, has('highEvents', item.id))) },
      { id: 'bossRoutes', name: '妖王破局', entries: BOSS_ROUTES.map(item => entry(item.id, item.name, item.hint, item.hint, has('bossRoutes', item.id))) },
      { id: 'tribulationRoutes', name: '渡劫法门', entries: TRIBULATION_ROUTES.map(item => entry(item.id, item.name, item.hint, item.hint, has('tribulationRoutes', item.id))) },
      { id: 'titles', name: '飞升称号', entries: TITLE_RULES.map(item => entry(item.id, item.name, item.description, item.hint, has('titles', item.id))) },
      { id: 'traces', name: '轮回道痕', entries: D.TRACES.map(item => entry(item.id, item.name, `${item.path}｜${item.description}`, item.hint, has('traces', item.id))) },
      { id: 'traceEvents', name: '前世回声', entries: D.TRACES.flatMap(t => ['echo','resonance'].map(kind => entry(`${t.id}-${kind}`, t[kind].title, t[kind].text, `携「${t.name}」后，在${kind === 'echo' ? '赤鳞初遇之后' : '元婴初成之时'}亲自回应这段回声。`, has('traceEvents', `${t.id}-${kind}`)))) },
      { id: 'immortalLaws', name: '仙界法则', entries: Object.entries(LAW_NAMES).map(([id,name]) => entry(id,name,`${traceById(id).talentPath}之道在仙界的延伸。`, '仙界第一次吞噬后，选择一道法则。', has('immortalLaws',id))) },
      { id: 'evolutionTraits', name: '五槽进化', entries: V.TRAITS.map(t => entry(t.id,t.name,`${V.SLOTS[t.slot]}｜${t.text}`, '从凡界道基、仙兽吞噬或融合中实际留下这种力量。', has('evolutionTraits',t.id))) },
      { id: 'evolutionFusions', name: '仙界融合', entries: V.RECIPES.map(r => entry(r.id,r.name,`碎片成本 ${r.cost}。${r.catalyst ? '法则引子保留。' : '材料归入新的槽位。'}`, r.needs.map(id=>V.TRAITS.find(t=>t.id===id).name).join(' + '), has('evolutionFusions',r.id))) },
      { id: 'worlds', name: '界外见闻', entries: V.WORLDS.slice(1).map((w,n) => entry(String(n+1),w.name,`${w.rank}｜${w.text}`, '越过前一界的守界者，并亲自踏入此界。', has('worlds',String(n+1)))) }
    ];
    return sections.map(section => ({ ...section, discovered: section.entries.filter(item => item.discovered).length, total: section.entries.length }));
  }
  function summary(meta) {
    const sections = codexSections(meta);
    return { ended: meta.totals.ended, ascended: meta.totals.ascended, discovered: sections.reduce((n, section) => n + section.discovered, 0), total: sections.reduce((n, section) => n + section.total, 0), nextTrace: traceById(meta.nextTrace) || null };
  }
  return Object.freeze({ VERSION, LEGACY_LIMIT, BRIDGE_VERSION, PATHS, TITLE_RULES, BOSS_ROUTES, TRIBULATION_ROUTES, createMeta, validate, serialize, deserialize, observe, classifyPath, pathScores, endingTitles, traceCandidates, createMortalBridge, validateMortalBridge, createImmortalBridge, validateImmortalBridge, selectTrace, consumeTrace, reconcile, recentLives, eventMemory, routeMemory, legacySnapshot, codexSections, summary });
});
