(function (root, factory) {
  const meta = factory(
    typeof module === 'object' && module.exports ? require('./data.js') : root.FSData,
    typeof module === 'object' && module.exports ? require('./engine.js') : root.FSEngine
  );
  if (typeof module === 'object' && module.exports) module.exports = meta;
  else root.FSMeta = meta;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, E) {
  'use strict';
  const VERSION = 1;
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
  function ascended(state) { return !!(state?.phase === 'complete' && state.flags?.ascended); }
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
    return { talents: [], mutations: [], fusions: [], highEvents: [], bossRoutes: [], tribulationRoutes: [], titles: [], traces: [] };
  }
  function createMeta() {
    return { version: VERSION, nextTrace: null, nextTraceSource: null, tutorialHidden: false, tutorialSeen: [], totals: { ended: 0, ascended: 0 }, discovered: discoveries(), runHistory: [] };
  }
  const validIds = Object.freeze({
    talents: D.TALENTS.map(x => x.id), mutations: D.MUTATIONS.map(x => x.id), fusions: D.FUSIONS.map(x => x.id),
    highEvents: D.HIGH_EVENTS.map(x => x.id), bossRoutes: BOSS_ROUTES.map(x => x.id),
    tribulationRoutes: TRIBULATION_ROUTES.map(x => x.id), titles: TITLE_RULES.map(x => x.id), traces: D.TRACES.map(x => x.id)
  });
  function validate(meta) {
    if (meta?.tutorialHidden !== undefined && typeof meta.tutorialHidden !== 'boolean') throw new Error('批注设置损坏。');
    if (meta?.tutorialSeen !== undefined && (!Array.isArray(meta.tutorialSeen) || meta.tutorialSeen.length > 6 || meta.tutorialSeen.some(id => !['talents', 'python', 'path', 'fusion', 'tribulation', 'reincarnation'].includes(id)))) throw new Error('批注记录损坏。');
    if (!meta || typeof meta !== 'object' || Array.isArray(meta) || meta.version !== VERSION) throw new Error('轮回册版本不兼容。');
    if (meta.nextTrace !== null && !traceById(meta.nextTrace)) throw new Error('待继承道痕损坏。');
    if (meta.nextTraceSource !== null && (!Number.isInteger(meta.nextTraceSource) || meta.nextTraceSource <= 0)) throw new Error('道痕来源损坏。');
    if ((meta.nextTrace === null) !== (meta.nextTraceSource === null)) throw new Error('待继承道痕与来源不一致。');
    if (!meta.totals || !Number.isInteger(meta.totals.ended) || !Number.isInteger(meta.totals.ascended) || meta.totals.ended < 0 || meta.totals.ascended < 0 || meta.totals.ascended > meta.totals.ended) throw new Error('轮回统计损坏。');
    if (!meta.discovered || typeof meta.discovered !== 'object') throw new Error('命途图谱损坏。');
    for (const [key, ids] of Object.entries(validIds)) {
      const list = meta.discovered[key];
      if (!Array.isArray(list) || list.length > ids.length || new Set(list).size !== list.length || list.some(id => !ids.includes(id))) throw new Error(`命途图谱损坏：${key}。`);
    }
    if (!Array.isArray(meta.runHistory) || meta.runHistory.length > 50 || meta.runHistory.some(run => !run || !Number.isInteger(run.seed) || run.seed <= 0 || typeof run.ending !== 'string' || typeof run.ascended !== 'boolean')) throw new Error('轮回历程损坏。');
    return true;
  }
  function serialize(meta) { validate(meta); return JSON.stringify(meta); }
  function deserialize(text) {
    if (typeof text !== 'string' || text.length > 200000) throw new Error('轮回册文件无效。');
    const meta = JSON.parse(text); validate(meta); return meta;
  }
  function add(discovered, key, values) { discovered[key] = unique([...discovered[key], ...values]).filter(id => validIds[key].includes(id)); }
  function observe(meta, state) {
    validate(meta); if (!state) return copy(meta);
    const next = copy(meta), found = next.discovered;
    add(found, 'talents', state.talents || []); add(found, 'mutations', state.mutations || []); add(found, 'fusions', state.fusions || []);
    add(found, 'highEvents', state.highSeen || []); add(found, 'bossRoutes', [state.bossRoute]); add(found, 'tribulationRoutes', state.tribulationRoutes || []);
    add(found, 'traces', [state.carriedTrace]);
    if (['complete', 'dead'].includes(state.phase)) {
      const titles = endingTitles(state), traces = traceCandidates(state);
      add(found, 'titles', titles.map(title => title.id)); add(found, 'traces', traces.map(trace => trace.id));
      if (!next.runHistory.some(run => run.seed === state.seed)) {
        next.totals.ended++;
        if (ascended(state)) { next.totals.ascended++; next.tutorialHidden = true; }
        const profile = classifyPath(state);
        next.runHistory.unshift({ seed: state.seed, ending: state.ending || state.phase, ascended: ascended(state), realm: state.realm, age: state.age, power: ascended(state) ? state.ascendedPower : E.power(state), path: profile.id, title: titles[0]?.id || null });
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
  function entry(id, name, detail, hint, discovered) { return { id, name: discovered ? name : '？？？', detail: discovered ? detail : '', hint, discovered }; }
  function codexSections(meta) {
    validate(meta); const found = meta.discovered, has = (key, id) => found[key].includes(id);
    const sections = [
      { id: 'talents', name: '天命', entries: D.TALENTS.map(item => entry(item.id, item.name, `${item.path} · ${D.RARITIES[item.rarity].name}品｜${item.description}`, `${item.path}天命 · ${D.RARITIES[item.rarity].name}品尚未显现`, has('talents', item.id))) },
      { id: 'mutations', name: '首次异变', entries: D.MUTATIONS.map(item => entry(item.id, item.name, `${item.slot}｜${item.description}`, '筑基后吞噬赤鳞妖蟒，在三种妖血方向中选择。', has('mutations', item.id))) },
      { id: 'fusions', name: '金丹融合', entries: D.FUSIONS.map(item => entry(item.id, item.name, `${item.path}｜${item.description}`, `成因：${item.requirement}`, has('fusions', item.id))) },
      { id: 'highEvents', name: '天地印证', entries: D.HIGH_EVENTS.map(item => entry(item.id, item.title, `${D.REALMS[item.realm].name}｜${item.text}`, `在${D.REALMS[item.realm].name}历练时可能遭遇。`, has('highEvents', item.id))) },
      { id: 'bossRoutes', name: '妖王破局', entries: BOSS_ROUTES.map(item => entry(item.id, item.name, item.hint, item.hint, has('bossRoutes', item.id))) },
      { id: 'tribulationRoutes', name: '渡劫法门', entries: TRIBULATION_ROUTES.map(item => entry(item.id, item.name, item.hint, item.hint, has('tribulationRoutes', item.id))) },
      { id: 'titles', name: '飞升称号', entries: TITLE_RULES.map(item => entry(item.id, item.name, item.description, item.hint, has('titles', item.id))) },
      { id: 'traces', name: '轮回道痕', entries: D.TRACES.map(item => entry(item.id, item.name, `${item.path}｜${item.description}`, item.hint, has('traces', item.id))) }
    ];
    return sections.map(section => ({ ...section, discovered: section.entries.filter(item => item.discovered).length, total: section.entries.length }));
  }
  function summary(meta) {
    const sections = codexSections(meta);
    return { ended: meta.totals.ended, ascended: meta.totals.ascended, discovered: sections.reduce((n, section) => n + section.discovered, 0), total: sections.reduce((n, section) => n + section.total, 0), nextTrace: traceById(meta.nextTrace) || null };
  }
  return Object.freeze({ VERSION, PATHS, TITLE_RULES, BOSS_ROUTES, TRIBULATION_ROUTES, createMeta, validate, serialize, deserialize, observe, classifyPath, pathScores, endingTitles, traceCandidates, selectTrace, consumeTrace, codexSections, summary });
});
