(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.FSEngine = factory(root.FSData);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const VERSION = 13;
  const immortalEngine = () => typeof module === 'object' && module.exports ? require('./immortal.js') : globalThis.FSImmortal;
  const equipmentEngine = () => typeof module === 'object' && module.exports ? require('./equipment.js') : globalThis.FSEquipment;
  const buildEngine = () => typeof module === 'object' && module.exports ? require('./build.js') : globalThis.FSBuild;
  const combatEngine = () => typeof module === 'object' && module.exports ? require('./combat.js') : globalThis.FSCombat;
  const secretRealmEngine = () => typeof module === 'object' && module.exports ? require('./secret-realm.js') : globalThis.FSSecretRealm;
  const sectEngine = () => typeof module === 'object' && module.exports ? require('./sect.js') : globalThis.FSSect;
  const lifeEngine = () => typeof module === 'object' && module.exports ? require('./life.js') : globalThis.FSLife;
  const spiritBeastEngine = () => typeof module === 'object' && module.exports ? require('./spirit-beast.js') : globalThis.FSSpiritBeast;
  const craftingEngine = () => typeof module === 'object' && module.exports ? require('./crafting.js') : globalThis.FSCrafting;
  const karmaEngine = () => typeof module === 'object' && module.exports ? require('./karma.js') : globalThis.FSKarma;
  const PHASES = ['talents', 'attributes', 'playing', 'draft', 'mutation', 'fusion', 'tribulation', 'complete', 'dead'];
  const EVENT_IDS = ['arrival', 'quiet', 'herbs', 'ruin', 'swordsman', 'hunt', 'first-python', 'revenge', 'remains', 'advanced', 'boss', 'high', 'trace-echo', 'trace-resonance'];
  const BOSS_ROUTE_IDS = ['fight', 'see-through', 'sword-break', 'devour-eye', 'body-charge', 'fate'];
  const TRIBULATION_ROUTE_IDS = ['endure', 'fusion', 'body', 'sword', 'devour', 'mind', 'fate', 'dao', 'cut-gate', 'eat-gate', 'step-gate', 'fate-gate', 'legacy', ...D.TRACES.map(trace => trace.route.id)];
  const byId = (items, id) => items.find(item => item.id === id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function requireThat(condition, message) { if (!condition) throw new Error(message); }
  function nextRevision(s) { s.revision = typeof s.revision === 'number' && s.revision < 999999 ? s.revision + 1 : (BigInt(s.revision) + 1n).toString(); }
  function random(s) {
    let x = s.rng >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.rng = x >>> 0;
    return s.rng / 4294967296;
  }
  function choose(s, items) { return items[Math.floor(random(s) * items.length)]; }
  function effects(s) {
    const result = {};
    const sources = [byId(D.ROOTS, s.root), byId(D.ORIGINS, s.origin),
      ...s.talents.map(id => byId(D.TALENTS, id)), ...s.mutations.map(id => byId(D.MUTATIONS, id)),
      ...(s.fusions || []).map(id => byId(D.FUSIONS, id))];
    for (const source of sources.filter(Boolean)) for (const [key, value] of Object.entries(source.effects)) result[key] = (result[key] || 0) + value;
    if (s.equipment) for (const [key, value] of Object.entries(equipmentEngine().effects(s.equipment))) result[key] = (result[key] || 0) + value;
    if (s.sect) for (const [key,value] of Object.entries(sectEngine().effects(s.sect))) result[key]=(result[key]||0)+value;
    if (s.life) for (const [key,value] of Object.entries(lifeEngine().effects(s.life))) result[key]=(result[key]||0)+value;
    if (s.spiritBeast) for (const [key,value] of Object.entries(spiritBeastEngine().effects(s.spiritBeast))) result[key]=(result[key]||0)+value;
    if (s.crafting) for (const [key,value] of Object.entries(craftingEngine().effects(s.crafting))) result[key]=(result[key]||0)+value;
    if (s.phase && !['talents','attributes'].includes(s.phase)) for (const [key,value] of Object.entries(buildEngine().effects(s))) result[key]=(result[key]||0)+value;
    if (s.talents.includes('taotie') && s.talents.includes('stomach')) { result.devour = (result.devour || 0) + 0.25; result.power = (result.power || 0) + 0.15; }
    if (s.root === 'thunder' && s.talents.includes('swordbone') && s.sword) result.power = (result.power || 0) + 0.20;
    return result;
  }
  function stats(s) {
    const e = effects(s);
    return Object.fromEntries(D.STATS.map(stat => [stat.id, s.stats[stat.id] + (e[stat.id] || 0)]));
  }
  function maxAge(s) { return D.REALMS[s.realm].cap + Math.max(0, stats(s).bone - 5) * 2 + (effects(s).lifespan || 0); }
  function power(s, enemy = null) {
    const a = stats(s), e = effects(s), r = D.REALMS[s.realm];
    const base = 5 + a.bone * 1.2 + a.insight * 0.8 + a.mind * 0.8 + a.luck * 0.2;
    const progress = r.threshold ? clamp(s.xp / r.threshold, 0, 1) : 0;
    const bonus = (e.power || 0) + (e.breakPower || 0) * s.realm + (s.sword ? 0.12 + (e.swordPower || 0) : 0)
      + (enemy?.beast ? e.beastPower || 0 : 0) + (enemy?.boss ? e.bossPower || 0 : 0);
    return Math.max(1, Math.floor(base * r.multiplier * (1 + progress * 0.55) * (1 + bonus) * (0.65 + s.vitality * 0.0035)));
  }
  function threat(s, enemy) {
    const ratio = power(s, enemy) / enemy.power;
    const label = ratio < 0.55 ? '十死无生' : ratio < 0.85 ? '凶险' : ratio < 1.2 ? '势均力敌' : ratio < 2 ? '优势' : ratio < 3 ? '碾压' : '蝼蚁';
    // Combat randomness is bounded; a crushing advantage never randomly loses.
    const chance = ratio >= 2 ? 1 : ratio < 0.55 ? 0 : clamp(0.50 + (ratio - 1) * 0.65, 0.12, 0.98);
    return { ratio, label, chance };
  }
  function log(s, title, text, tone = 'normal') {
    if (/^败退|· 受创$/.test(title) && s.defeats !== null) s.defeats = (s.defeats || 0) + 1;
    s.log.push({ title, text, tone, age: s.age, realm: s.realm });
    if (s.log.length > 100) s.log.shift();
  }
  function gain(s, amount, source) {
    const e = effects(s);
    const bonus = source === 'devour' ? e.devour || 0 : source === 'cultivate' ? e.cultivate || 0 : source === 'explore' ? e.explore || 0 : 0;
    const value = Math.max(1, Math.round(amount * (1 + bonus) * (1 + (e.xp || 0))));
    const cap = D.REALMS[s.realm].threshold || 500;
    s.xp = Math.min(cap * 2, s.xp + value);
    s.lastGain = value;
    return value;
  }
  function years(s, count) {
    s.age += Math.ceil(count * (1 + (effects(s).ageCost || 0)));
    if (s.age >= maxAge(s)) {
      s.phase = 'dead'; s.ending = '坐化'; s.event = null;
      log(s, '此世止步', '石门未开，岁月已尽。你未能在寿元耗尽前破境。', 'danger');
      return false;
    }
    return true;
  }
  function hurt(s, amount) {
    s.vitality = Math.max(0, s.vitality - Math.ceil(amount * Math.max(0.25, 1 - (effects(s).guard || 0))));
    if (s.vitality === 0) {
      if ((effects(s).extraLife || 0) > s.rebirthUsed) {
        s.rebirthUsed++; s.vitality = 40;
        log(s, '滴血重生', '最后一滴血重新凝聚。此世的保命机会已耗尽。', 'gold');
      } else { s.phase = 'dead'; s.ending = '身死道消'; s.event = null; log(s, '身死道消', '元气耗尽。你倒在了这条未走完的道途上。', 'danger'); }
    }
  }
  function rollOffer(s, count, minimumRarity = 0, opening = false) {
    let pool = D.TALENTS.filter(t => !t.exclusiveTrace && !s.talents.includes(t.id));
    const out = [], luck = opening ? 5 : stats(s).luck;
    for (let i = 0; i < count; i++) {
      const eligible = pool.filter(t => i === 0 ? t.rarity >= minimumRarity : true);
      const weights = eligible.map(t => D.RARITIES[t.rarity].weight * (1 + Math.max(0, luck - 5) * 0.035 * t.rarity));
      let cursor = random(s) * weights.reduce((a, b) => a + b, 0), pick = eligible[eligible.length - 1];
      for (let j = 0; j < eligible.length; j++) { cursor -= weights[j]; if (cursor < 0) { pick = eligible[j]; break; } }
      if (!pick) break;
      out.push(pick.id); pool = pool.filter(t => t.id !== pick.id);
    }
    return out;
  }
  function openingOffer(s) {
    const offer = rollOffer(s, 8, 2, true), trace = byId(D.TRACES, s.carriedTrace);
    if (!trace) return offer;
    requireThat(byId(D.TALENTS, trace.talentId)?.exclusiveTrace === trace.id, '道痕天命配置不完整。');
    // Keep the ordinary玄品 guarantee and exactly one exclusive memory card.
    offer[offer.length - 1] = trace.talentId;
    return offer;
  }
  function availableFusions(s) {
    const a = stats(s), e = effects(s), ids = [];
    const mutation = s.mutations[0];
    if (mutation === 'redscale') ids.push('flame-scale');
    if (mutation === 'serpenteye') ids.push('abyss-eye');
    if (mutation === 'serpentblood') ids.push('dragon-blood');
    if (s.root === 'thunder' && s.sword && s.talents.includes('swordbone')) ids.push('thunder-sword');
    if (s.talents.includes('taotie') && s.talents.includes('stomach')) ids.push('devour-body');
    if (a.bone >= 11 || s.talents.includes('goldbody') || s.talents.includes('dragonbone')) ids.push('golden-body');
    if (s.root === 'mixed' || a.insight >= 11) ids.push('five-unity');
    if (a.luck >= 11 || s.talents.includes('destiny') || s.talents.includes('fortune')) ids.push('fate-veil');
    // Every run must have at least three meaningful fusion choices. Mutation route is always first.
    for (const fallback of ['golden-body', 'five-unity', 'fate-veil']) if (!ids.includes(fallback)) ids.push(fallback);
    return [...new Set(ids)].map(id => byId(D.FUSIONS, id)).filter(Boolean);
  }
  function fusionOffer(s) {
    const pool = availableFusions(s), preferred = pool.filter(f => {
      if (s.mutations[0] === 'redscale') return f.id === 'flame-scale';
      if (s.mutations[0] === 'serpenteye') return f.id === 'abyss-eye';
      if (s.mutations[0] === 'serpentblood') return f.id === 'dragon-blood';
      return false;
    });
    const out = preferred.slice(0, 1), rest = pool.filter(f => !out.some(x => x.id === f.id));
    while (out.length < 3 && rest.length) out.push(rest.splice(Math.floor(random(s) * rest.length), 1)[0]);
    return out.map(f => f.id);
  }
  function advancedChoices(s, sceneId) {
    const a = stats(s), e = effects(s), has = id => (s.fusions || []).includes(id), choices = [{ id: 'leave', name: '暂且退去', note: '无风险，不获得修为', factor: 0 }];
    const add = (id, name, note, factor, risk = 0) => choices.unshift({ id, name, note, factor, risk });
    if (sceneId === 'sealed-cave') {
      add('force', '强破石门', '高收益 · 损失元气', .34, 18);
      if (a.mind >= 10 || has('abyss-eye')) add('probe', '看破阵眼', '神识路线 · 高收益无伤', .30);
      if (s.sword) add('sword', '一剑斩阵', '剑道路线 · 直接破阵', .28);
      if ((e.devour || 0) >= .45) add('devour', '吞噬阵灵', '吞噬路线 · 修为与疗愈', .31);
    } else if (sceneId === 'thunder-pool') {
      add('collect', '取走雷晶', '稳妥收益', .18);
      if (s.root === 'thunder' || has('thunder-sword')) add('thunder', '引雷入体', '雷道路线 · 极高收益', .34);
      if (a.bone >= 11 || has('golden-body')) add('bathe', '肉身沐雷', '炼体路线 · 高收益', .30, 8);
    } else if (sceneId === 'fox-den') {
      add('track', '循迹追踪', '普通历练', .18);
      if (a.mind >= 10 || has('abyss-eye')) add('see', '看破狐火', '神识路线 · 无视幻象', .31);
      if (a.luck >= 10 || has('fate-veil')) add('fortune', '跟着最暗的那盏灯', '气运路线 · 意外机缘', .30);
      if (s.sword) add('cut', '一剑斩尽狐火', '剑道路线 · 强行开路', .27);
    } else if (sceneId === 'sword-cliff') {
      add('listen', '听风悟剑', '稳妥参悟', .18);
      if (s.sword) add('resonate', '万剑共鸣', '剑道路线 · 高收益', .33);
      if (a.insight >= 10 || has('five-unity')) add('comprehend', '悟其剑理', '悟性路线 · 高收益', .30);
      if ((e.devour || 0) >= .55) add('devour', '吞下残余剑气', '吞噬路线 · 凶险但收益高', .35, 10);
    } else if (sceneId === 'blood-altar') {
      add('purge', '毁去血坛', '普通收益', .18);
      if ((e.devour || 0) >= .45) add('devour', '吞尽血煞', '吞噬路线 · 高收益并恢复', .34);
      if (a.bone >= 11 || has('golden-body')) add('break', '一拳碎坛', '肉身路线 · 快速破阵', .28);
      if (a.mind >= 10) add('purify', '以神识净煞', '神魂路线 · 无伤', .29);
    } else if (sceneId === 'mirror-lake') {
      add('observe', '静观倒影', '普通参悟', .17);
      if (a.mind >= 10 || has('abyss-eye')) add('heart', '照见本心', '神识路线 · 高收益', .30);
      if (a.luck >= 10 || has('fate-veil')) add('other', '选择另一条命数', '气运路线 · 高收益', .29);
      if ((e.devour || 0) >= .55) add('drink', '饮尽镜湖', '吞噬路线 · 获得大量修为', .32);
    } else if (sceneId === 'bone-field') {
      add('search', '搜寻遗骨', '普通收益', .18);
      if ((e.devour || 0) >= .45) add('devour', '炼尽残骨妖气', '吞噬路线 · 高收益', .33);
      if (a.bone >= 11 || has('golden-body')) add('refine', '以骨炼骨', '肉身路线 · 高收益', .30);
      if (a.mind >= 10) add('trace', '追索残魂', '神魂路线 · 高收益', .28);
    } else if (sceneId === 'fallen-star') {
      add('chip', '取一块星铁', '稳妥收益', .18);
      if (s.sword) add('forge', '以星铁淬剑', '剑道路线 · 极高收益', .34);
      if (a.bone >= 11) add('carry', '徒手搬走星铁', '肉身路线 · 高收益', .29, 6);
      if (a.luck >= 10) add('vein', '再向坑底挖三尺', '气运路线 · 发现伴生灵脉', .31);
    }
    return choices;
  }
  function bossChoices(s) {
    const a = stats(s), e = effects(s), has = id => (s.fusions || []).includes(id), out = [{ id: 'fight', name: '正面镇杀', note: '以当前战力硬撼妖王', enemyFactor: 1 }];
    if (a.mind >= 12 || has('abyss-eye')) out.push({ id: 'see-through', name: '看破第三只眼', note: '神识路线 · 妖王有效战力 -35%', enemyFactor: .65 });
    if (s.sword && (s.talents.includes('swordheart') || s.talents.includes('swordbone') || has('thunder-sword'))) out.push({ id: 'sword-break', name: '一剑斩幻', note: '剑道路线 · 妖王有效战力 -32%', enemyFactor: .68 });
    if ((e.devour || 0) >= .80 || has('devour-body') || has('dragon-blood')) out.push({ id: 'devour-eye', name: '吞其妖眼', note: '吞噬路线 · 妖王有效战力 -28%', enemyFactor: .72, devour: true });
    if (a.bone >= 13 || has('golden-body') || has('flame-scale')) out.push({ id: 'body-charge', name: '以身破幻', note: '肉身路线 · 妖王有效战力 -25%', enemyFactor: .75 });
    if (a.luck >= 12 || has('fate-veil')) out.push({ id: 'fate', name: '押上这一世气运', note: '气运路线 · 妖王露出命门', enemyFactor: .70 });
    return out;
  }
  function highChoices(s, sceneId) {
    const scene = byId(D.HIGH_EVENTS, sceneId); requireThat(scene, '未知高阶机缘。');
    const a = stats(s), e = effects(s), has = id => (s.fusions || []).includes(id);
    const out = [{ id: 'refine', name: '炼化外围灵机', note: '稳妥路线 · 中等收益', factor: .18, risk: 0 }];
    if (a.mind >= 12 || has('abyss-eye')) out.push({ id: 'mind', name: '神识洞彻', note: '神魂路线 · 看见更深层机缘', factor: .31, risk: 0 });
    if (s.sword) out.push({ id: 'sword', name: '以剑开路', note: '剑道路线 · 直接斩开阻隔', factor: .30, risk: 0 });
    if ((e.devour || 0) >= .80 || has('devour-body') || has('dragon-blood')) out.push({ id: 'devour', name: '吞下此地灵机', note: '吞噬路线 · 高收益并恢复元气', factor: .34, risk: 0, devour: true });
    if (a.bone >= 13 || has('golden-body') || has('flame-scale')) out.push({ id: 'body', name: '以身承之', note: '肉身路线 · 高收益，轻微损耗', factor: .32, risk: 8 });
    if (a.luck >= 12 || has('fate-veil')) out.push({ id: 'fortune', name: '顺势取命', note: '气运路线 · 发现隐藏机缘', factor: .33, risk: 0 });
    if (a.insight >= 12 || has('five-unity')) out.push({ id: 'insight', name: '坐地悟道', note: '悟性路线 · 以理解代替强取', factor: .30, risk: 0 });
    return out;
  }
  function tribulationChoices(s) {
    requireThat(s.phase === 'tribulation', '当前不在渡劫。');
    const stage = s.tribulationStage, a = stats(s), e = effects(s), has = id => (s.fusions || []).includes(id), fusion = byId(D.FUSIONS, s.fusions[0]);
    const labels = ['九霄雷劫', '问心魔劫', '天门终劫'];
    const out = [{ id: 'endure', name: '以全部修为硬渡', note: '通用路线 · 风险较高', enemyFactor: .55 }];
    if (fusion) out.push({ id: 'fusion', name: `以「${fusion.name}」承劫`, note: '本世融合路线 · 最稳定', enemyFactor: .40 });
    if (stage === 0) {
      if (a.bone >= 14 || has('golden-body') || has('flame-scale')) out.push({ id: 'body', name: '肉身沐天雷', note: '炼体路线', enemyFactor: .42 });
      if (s.sword) out.push({ id: 'sword', name: '一剑引雷', note: '剑道路线', enemyFactor: .42 });
      if ((e.devour || 0) >= .90) out.push({ id: 'devour', name: '吞下一道天雷', note: '吞噬路线', enemyFactor: .42 });
    } else if (stage === 1) {
      if (a.mind >= 13 || has('abyss-eye')) out.push({ id: 'mind', name: '照破万千心魔', note: '神魂路线', enemyFactor: .41 });
      if (a.luck >= 13 || has('fate-veil')) out.push({ id: 'fate', name: '以命数镇心魔', note: '气运路线', enemyFactor: .42 });
      if (a.insight >= 13 || has('five-unity')) out.push({ id: 'dao', name: '明心见道', note: '悟性路线', enemyFactor: .42 });
    } else {
      if (s.sword) out.push({ id: 'cut-gate', name: '一剑叩天门', note: '剑道路线', enemyFactor: .43 });
      if ((e.devour || 0) >= .90) out.push({ id: 'eat-gate', name: '吞天门外溢仙气', note: '吞噬路线', enemyFactor: .43 });
      if (a.bone >= 14) out.push({ id: 'step-gate', name: '肉身踏天阶', note: '肉身路线', enemyFactor: .43 });
      if (a.luck >= 13) out.push({ id: 'fate-gate', name: '借此世命数开门', note: '气运路线', enemyFactor: .43 });
    }
    const inherited = byId(D.TRACES, s.carriedTrace);
    if (inherited && inherited.tribulationStage === stage) out.push({ ...inherited.route, trace: inherited.id });
    return { name: labels[stage], options: out };
  }
  function canChallengeBoss(s) {
    if (!(s.phase === 'playing' && s.realm === 3 && (s.fusions || []).length > 0 && (s.advancedResolved || 0) >= 2 && !s.flags.bossSlain && !isBlocking(s))) return false;
    const enemy = byId(D.ENEMIES, 'threeeye');
    return bossChoices(s).some(option => threat(s, { ...enemy, power: Math.round(enemy.power * option.enemyFactor) }).ratio >= .55);
  }
  function createRun(seed, inherited = null) {
    const carriedTrace = typeof inherited === 'string' ? inherited : inherited?.carriedTrace || null;
    const traceSourceSeed = inherited && typeof inherited === 'object' ? inherited.sourceSeed ?? null : null;
    requireThat(carriedTrace === null || byId(D.TRACES, carriedTrace), '未知轮回道痕。');
    requireThat(traceSourceSeed === null || carriedTrace && Number.isInteger(traceSourceSeed) && traceSourceSeed > 0 && traceSourceSeed <= 4294967295, '前世来源无效。');
    const s = {
      version: VERSION, seed: (seed >>> 0) || 1, rng: (seed >>> 0) || 1, revision: 0,
      phase: 'talents', realm: 0, xp: 0, age: 16, vitality: 100,
      stats: { bone: 5, insight: 5, luck: 5, mind: 5 }, root: null, origin: null,
      talents: [], innate: [], selected: [], offer: [], mutations: [], fusions: [], fusionOffer: [], sword: false,
      openingRerolls: 2, redrawUsed: 0, rebirthUsed: 0, actions: 0, devours: 0, defeats: 0,
      flags: { pythonSeen: false, pythonSlain: false, swordEvent: false, bossSeen: false, bossSlain: false, ascended: false, traceEchoSeen: false, traceResonanceSeen: false },
      advancedSeen: [], advancedResolved: 0,
      highSeen: [], realmProofs: [], tribulationStage: 0, tribulationBase: null, ascendedPower: null,
      carriedTrace, traceSourceSeed, bossRoute: null, tribulationRoutes: [], batchCultivations: 0,
      event: null, draft: null, firstPower: null, revengePower: null, lastGain: 0,
      ending: null, log: [], equipment: equipmentEngine().createState(), combatReplay: null, secretRealm: secretRealmEngine().createState(), sect: sectEngine().createState(), life: lifeEngine().createState(), spiritBeast: spiritBeastEngine().createState(), crafting: craftingEngine().createState(), karma: karmaEngine().createState(), immortal: null
    };
    s.offer = openingOffer(s);
    return s;
  }
  function canBreak(s) {
    if (!(s.phase === 'playing' && !isBlocking(s) && s.realm < 9 && D.REALMS[s.realm].threshold && s.xp >= D.REALMS[s.realm].threshold && s.flags.pythonSeen)) return false;
    if (s.realm === 2 && !s.flags.pythonSlain) return false;
    if (s.realm === 3 && !s.flags.bossSlain) return false;
    if (s.realm >= 4 && s.realm <= 8 && !s.realmProofs.includes(s.realm)) return false;
    return true;
  }
  function isBlocking(s) { return !!s.event && ['ruin', 'swordsman', 'hunt', 'first-python', 'revenge', 'remains', 'advanced', 'boss', 'high', 'trace-echo', 'trace-resonance'].includes(s.event.id); }
  function actionPreview(s, kind) {
    const r = D.REALMS[s.realm], a = stats(s), e = effects(s), threshold = r.threshold || 500;
    const xp = kind === 'cultivate' ? Math.max(1, Math.round(threshold * (0.15 + a.insight * 0.004) * (1 + (e.cultivate || 0)) * (1 + (e.xp || 0)))) : null;
    const cost = kind === 'cultivate' ? r.years : kind === 'explore' ? 2 : 1;
    return { xp, years: Math.ceil(cost * (1 + (e.ageCost || 0))), heal: 16 + (e.rest || 0) };
  }
  function canCultivateToReady(s) {
    if (!(s && s.phase === 'playing' && !isBlocking(s) && s.realm < 9)) return false;
    const threshold = D.REALMS[s.realm].threshold;
    if (!threshold || s.xp >= threshold) return false;
    // The forced first-python encounter is a valid automatic stop even when the
    // next requested action will not actually cultivate.
    if (!s.flags.pythonSeen && s.actions >= 1) return s.age + Math.ceil(1 + (effects(s).ageCost || 0)) < maxAge(s);
    const preview = actionPreview(s, 'cultivate');
    return s.age + preview.years + Math.max(2, preview.years) < maxAge(s);
  }
  function cultivateToReady(s) {
    requireThat(canCultivateToReady(s), '当前无法安全连续闭关。');
    const startAge = s.age, startXp = s.xp, threshold = D.REALMS[s.realm].threshold;
    let cycles = 0;
    while (cycles < 64 && s.phase === 'playing' && !isBlocking(s) && s.xp < threshold) {
      const beforeXp = s.xp, preview = actionPreview(s, 'cultivate');
      if (s.flags.pythonSeen || s.actions < 1) {
        if (s.age + preview.years + Math.max(2, preview.years) >= maxAge(s)) break;
      }
      act(s, 'cultivate');
      if (s.event?.id === 'quiet' && s.xp > beforeXp) cycles++;
      if (s.phase !== 'playing' || isBlocking(s) || s.xp >= threshold) break;
    }
    requireThat(cycles > 0 || isBlocking(s), '寿元已进入危险区，连续闭关在行动前停止。');
    s.batchCultivations += cycles;
    if (cycles > 1 && s.phase === 'playing' && s.event?.id === 'quiet') {
      const total = s.xp - startXp;
      s.event = {
        id: 'quiet', title: `连续闭关 · ${cycles} 次`, gain: total, batch: cycles,
        text: `你封住洞门，一次又一次运转周天。${s.age - startAge} 年后，修为已逼近这一境的尽头；任何必须亲自处理的遭遇都会让闭关自动停止。`
      };
      log(s, '连续闭关', `${cycles} 次周天，修为共 +${total}；此刻 ${s.age} 岁。`, 'gold');
    }
  }
  function act(s, kind) {
    requireThat(s.phase === 'playing' && !isBlocking(s), '请先处理眼前的遭遇。');
    requireThat(s.realm < 9, '已经进入渡劫，不能再进行普通行动。');
    requireThat(['cultivate', 'explore', 'hunt'].includes(kind), '未知行动。');
    if (!s.flags.pythonSeen && s.actions >= 1) {
      if (!years(s, 1)) return;
      s.actions++; s.event = { id: 'first-python', enemy: 'python' }; s.firstPower = power(s, byId(D.ENEMIES, 'python'));
      log(s, '黑风岭 · 赤鳞', '妖蟒横断山路。你记住了那一身赤鳞，也记住了自己此刻的弱小。', 'danger');
      return;
    }
    requireThat(!canBreak(s), '修为已满，请先突破。');
    const preview = actionPreview(s, kind);
    if (!years(s, kind === 'cultivate' ? D.REALMS[s.realm].years : kind === 'explore' ? 2 : 1)) return;
    s.actions++;
    if (kind === 'cultivate') {
      const amount = gain(s, D.REALMS[s.realm].threshold * (0.15 + stats(s).insight * 0.004), kind);
      s.vitality = Math.min(100, s.vitality + preview.heal);
      s.event = { id: 'quiet', title: '山中无甲子', text: `石壁上的刻痕又深了一道。你守住心神，将山间灵气缓缓纳入经脉。`, gain: amount };
      log(s, '闭关', `修为 +${amount}，元气恢复；此刻 ${s.age} 岁。`);
    } else if (kind === 'explore') {
      if (s.realm >= 4) {
        const pool = D.HIGH_EVENTS.filter(scene => scene.realm === s.realm);
        const unseen = pool.filter(scene => !s.highSeen.includes(scene.id));
        // 每个高境界第一次历练保底触发世界尺度事件，避免修为满后仍刷不到破境凭证。
        if (!s.realmProofs.includes(s.realm) || random(s) < .68) {
          const scene = choose(s, unseen.length ? unseen : pool); s.event = { id: 'high', scene: scene.id }; return;
        }
      }
      if (s.realm >= 2 && random(s) < .72) {
        const unseen = D.ADVANCED_EVENTS.filter(scene => !s.advancedSeen.includes(scene.id));
        const scene = choose(s, unseen.length ? unseen : D.ADVANCED_EVENTS);
        s.event = { id: 'advanced', scene: scene.id };
        return;
      }
      if (s.realm === 1 && !s.flags.swordEvent) {
        s.flags.swordEvent = true; s.event = { id: 'swordsman' };
      } else if (random(s) < Math.min(0.7, 0.30 + stats(s).luck * 0.018)) s.event = { id: 'ruin' };
      else {
        const amount = gain(s, D.REALMS[s.realm].threshold * (0.09 + random(s) * 0.04), 'explore');
        s.event = { id: 'herbs', title: '崖畔灵草', text: '你沿着微弱的灵气寻去，在悬崖背阴处采得一株青露草。药香洗去了赶路的倦意。', gain: amount };
        s.vitality = Math.min(100, s.vitality + 8); log(s, '历练所得', `炼化青露草，修为 +${amount}。`);
      }
    } else {
      const pool = s.realm === 0 ? D.ENEMIES.slice(0, 2)
        : s.realm === 1 ? D.ENEMIES.slice(2, 5)
        : s.realm === 2 ? D.ENEMIES.slice(6, 9)
        : s.realm === 3 ? D.ENEMIES.slice(9, 11)
        : s.realm === 4 ? D.ENEMIES.slice(12, 14)
        : s.realm === 5 ? D.ENEMIES.slice(14, 16)
        : s.realm === 6 ? D.ENEMIES.slice(16, 18)
        : s.realm === 7 ? D.ENEMIES.slice(18, 20)
        : D.ENEMIES.slice(20, 22);
      const enemy = choose(s, pool); s.event = { id: 'hunt', enemy: enemy.id };
    }
  }
  function canSeekProof(s) {
    return !!(s && s.phase === 'playing' && s.realm >= 4 && s.realm <= 8 && !isBlocking(s)
      && !s.realmProofs.includes(s.realm) && s.age + actionPreview(s, 'explore').years < maxAge(s));
  }
  function resolve(s, choice) {
    requireThat(s.phase === 'playing' && isBlocking(s), '当前没有待处理的遭遇。');
    const id = s.event.id;
    if (id === 'first-python') {
      requireThat(['flee', 'observe'].includes(choice), '现在还不是它的对手。');
      requireThat(choice !== 'observe' || stats(s).mind >= 8, '神识不足，无法辨识退路。');
      s.flags.pythonSeen = true;
      const inherited = byId(D.TRACES, s.carriedTrace);
      s.event = inherited && !s.flags.traceEchoSeen
        ? { id: 'trace-echo', trace: inherited.id }
        : { id: 'quiet', title: '活下来，才有来日', text: choice === 'observe' ? '你看破了妖蟒巡视的间隙。石缝后的残碑上，刻着一段吞灵法门。' : '你藏进石隙，直到赤鳞的倒影远去。绝壁后，一段残缺的吞灵诀悄然映入识海。' };
      log(s, '因果已记 · 赤鳞妖蟒', '习得基础吞灵诀。妖兽皆可炼化；筑基后，回来讨还。', 'gold');
    } else if (id === 'trace-echo' || id === 'trace-resonance') {
      const trace = byId(D.TRACES, s.event.trace), passage = id === 'trace-echo' ? trace?.echo : trace?.resonance;
      requireThat(trace && passage && choice === 'remember', '这段前世回响无法如此处理。');
      if (id === 'trace-echo') s.flags.traceEchoSeen = true;
      else s.flags.traceResonanceSeen = true;
      s.event = { id: 'quiet', title: passage.title, text: passage.result };
      log(s, `${trace.name} · ${passage.title}`, passage.result, 'gold');
    } else if (id === 'swordsman') {
      requireThat(['learn', 'meditate'].includes(choice), '请选择领悟之道。');
      if (choice === 'learn') {
        s.sword = true; s.event = { id: 'quiet', title: '青云剑诀', text: '残魂将最后一式传给你。剑不在手，锋芒已入心。基础战力 +12%，剑道天命开始生效。' };
        log(s, '领悟青云剑诀', '剑诀生效。剑心、剑骨、金灵根可与之叠加。', 'gold');
      } else {
        const value = gain(s, 90, 'explore'); s.event = { id: 'quiet', title: '各行其道', text: '你没有接过那柄残剑，而是参悟了洞府中残留的道意。', gain: value };
        log(s, '参悟道意', `修为 +${value}。`);
      }
    } else if (id === 'ruin') {
      requireThat(['probe', 'force', 'leave'].includes(choice), '无效的洞府选择。');
      if (choice === 'leave') { s.event = { id: 'quiet', title: '不争此时', text: '你记下洞府方位，收敛气息离开。今日无所得，也无所失。' }; return; }
      const threshold = D.REALMS[s.realm].threshold;
      if (choice === 'probe') {
        const good = stats(s).mind >= 8;
        const value = gain(s, threshold * (good ? 0.25 : 0.12), 'explore');
        s.event = { id: 'quiet', title: good ? '看破阵眼' : '谨慎探查', text: good ? '神识穿过伪装。真正的灵藏，原来藏在阵眼之后。' : '你只取走入口处的灵石，没有贸然触碰深处的阵纹。', gain: value };
        log(s, '洞府探查', `修为 +${value}；未受伤。`);
      } else {
        const before = s.vitality; hurt(s, 22);
        if (s.phase === 'dead') return;
        const value = gain(s, threshold * 0.28, 'explore');
        s.event = { id: 'quiet', title: '强取机缘', text: `你以肉身撞碎阵纹。元气损失 ${before - s.vitality}，灵气却也灌入经脉。`, gain: value };
        log(s, '破阵', `修为 +${value}。`);
      }
    } else if (id === 'hunt') {
      const enemy = byId(D.ENEMIES, s.event.enemy), t = threat(s, enemy);
      requireThat(['flee', 'fight', 'devour'].includes(choice), '未知战斗选择。');
      if (choice === 'flee') { s.event = { id: 'quiet', title: '收敛锋芒', text: '你绕过这场厮杀。退让不是终点，只是还没到时候。' }; log(s, '避战', `离开${enemy.name}的领地。`); return; }
      requireThat(t.ratio >= 0.55, '战力悬殊，不可贸然送死。');
      requireThat(choice !== 'devour' || (enemy.beast && s.flags.pythonSeen), '尚不可吞噬这个目标。');
      const C = combatEngine(), playerPower = power(s, enemy), roll = t.chance === 1 ? 0 : random(s);
      const guardScale = Math.max(.25, 1 - (effects(s).guard || 0));
      const rawWinDamage = t.ratio >= 2 ? 0 : Math.round(12 + 18 / t.ratio), rawLoseDamage = 45;
      let combat = C.resolveCombat({ enemy, playerPower, action: choice, chance: t.chance, roll,
        damageWin: Math.ceil(rawWinDamage * guardScale), damageLose: Math.ceil(rawLoseDamage * guardScale), reward: 0 });
      if (combat.result.damage) hurt(s, combat.result.win ? rawWinDamage : rawLoseDamage);
      if (s.phase === 'dead') {
        s.combatReplay = C.createReplay(combat, `hunt-${s.revision}-${enemy.id}`, { enemy: enemy.name });
        return;
      }
      if (combat.result.win) {
        const eat = choice === 'devour';
        const value = gain(s, D.REALMS[s.realm].threshold * enemy.fraction, eat ? 'devour' : 'combat');
        if (eat) { s.devours++; s.vitality = Math.min(100, s.vitality + (effects(s).devourHeal || 0)); }
        combat = C.resolveCombat({ enemy, playerPower, action: choice, chance: t.chance, roll,
          damageWin: Math.ceil(rawWinDamage * guardScale), damageLose: Math.ceil(rawLoseDamage * guardScale), reward: value });
        s.combatReplay = C.createReplay(combat, `hunt-${s.revision}-${enemy.id}`, { enemy: enemy.name });
        s.event = { id: 'quiet', title: eat ? '化为一口修为' : '一战得胜', text: t.ratio >= 2 ? `你甚至不必认真出手。${enemy.name}已被镇压，曾经的危险如今不过是前路的养分。` : `你抓住破绽，击败了${enemy.name}。元气尚有损耗，闭关可以疗愈。`, gain: value };
        log(s, eat ? '吞噬' : '取胜', `${enemy.name}，修为 +${value}。`, eat ? 'gold' : 'normal');
      } else {
        s.combatReplay = C.createReplay(combat, `hunt-${s.revision}-${enemy.id}`, { enemy: enemy.name });
        s.event = { id: 'quiet', title: '负伤而归', text: '这一战未能取胜。你付出元气的代价，终于甩开追兵。闭关可以恢复；不要带伤逞强。' };
        log(s, '败退', `败于${enemy.name}，失去元气但成功逃生。`, 'danger');
      }
    } else if (id === 'revenge' || id === 'remains') {
      requireThat(id === 'remains' ? choice === 'devour' : ['devour', 'kill'].includes(choice), '请选择如何了结这段因果。');
      if (choice === 'kill') {
        s.event = { id: 'remains' };
        log(s, '一掌镇杀', '妖蟒陨落，赤鳞遗蜕仍蕴含完整妖血。', 'gold');
      } else {
        requireThat(!s.flags.pythonSlain, '这段因果已经了结。');
        s.flags.pythonSlain = true; s.devours++;
        const value = gain(s, 87, 'devour');
        s.vitality = Math.min(100, s.vitality + (effects(s).devourHeal || 0));
        s.phase = 'mutation'; s.event = null;
        log(s, '吞噬赤鳞妖蟒', `修为 +${value}。异种妖血正在改写你的肉身。`, 'gold');
      }
    } else if (id === 'advanced') {
      const scene = byId(D.ADVANCED_EVENTS, s.event.scene), options = advancedChoices(s, s.event.scene), option = options.find(x => x.id === choice);
      requireThat(scene && option, '当前能力无法选择这条路线。');
      if (!s.advancedSeen.includes(scene.id)) s.advancedSeen.push(scene.id);
      s.advancedResolved++;
      if (option.risk) hurt(s, option.risk);
      if (s.phase === 'dead') return;
      if (!option.factor) {
        s.event = { id: 'quiet', title: '不争此时', text: '你将这处机缘记在心里，转身离开。道途漫长，不必每一步都赌命。' };
        log(s, scene.title, '你选择暂退，没有获得修为。');
      } else {
        const value = gain(s, D.REALMS[s.realm].threshold * option.factor, option.id === 'devour' || option.id === 'drink' ? 'devour' : 'explore');
        if (option.id === 'devour' || option.id === 'drink') { s.devours++; s.vitality = Math.min(100, s.vitality + 10 + (effects(s).devourHeal || 0)); }
        s.event = { id: 'quiet', title: `${scene.title} · ${option.name}`, text: `你没有照旧路行事，而是让自己的道替你开路。${option.risk ? '代价留下伤痕，但机缘已经到手。' : '这条路原本就只对现在的你开放。'}`, gain: value };
        log(s, scene.title, `${option.name}，修为 +${value}。`, 'gold');
      }
    } else if (id === 'boss') {
      const enemy = byId(D.ENEMIES, 'threeeye'), option = bossChoices(s).find(x => x.id === choice);
      requireThat(option, '当前能力无法使用这条破局方式。');
      const effectiveEnemy = { ...enemy, power: Math.round(enemy.power * option.enemyFactor) };
      const t = threat(s, effectiveEnemy);
      requireThat(t.ratio >= .55, '即使找到破绽，你现在仍没有胜算。先继续修炼或寻找机缘。');
      const C = combatEngine(), playerPower = power(s, effectiveEnemy), roll = t.chance === 1 ? 0 : random(s);
      const guardScale = Math.max(.25, 1 - (effects(s).guard || 0)), rawLoseDamage = 42;
      let combat = C.resolveCombat({ enemy: effectiveEnemy, playerPower, action: option.devour ? 'devour' : 'boss', chance: t.chance, roll,
        damageWin: 0, damageLose: Math.ceil(rawLoseDamage * guardScale), reward: 0, route: option.name });
      if (!combat.result.win) {
        if (combat.result.damage) hurt(s, rawLoseDamage);
        s.combatReplay = C.createReplay(combat, `boss-${s.revision}-${option.id}`, { enemy: enemy.name });
        if (s.phase === 'dead') return;
        s.event = { id: 'quiet', title: '妖眼未闭', text: '第三只眼重新合拢前，你抢回了自己的意识。此战未成，但你已经知道该如何破它。继续积累，再来。' };
        log(s, '败退 · 三眼妖王', `${option.name}未能一击奏效。你负伤退回山外。`, 'danger');
        return;
      }
      s.flags.bossSlain = true;
      s.bossRoute = option.id;
      if (option.devour) { s.devours++; s.vitality = Math.min(100, s.vitality + 20 + (effects(s).devourHeal || 0)); }
      const value = gain(s, D.REALMS[3].threshold * .30, option.devour ? 'devour' : 'combat');
      combat = C.resolveCombat({ enemy: effectiveEnemy, playerPower, action: option.devour ? 'devour' : 'boss', chance: t.chance, roll,
        damageWin: 0, damageLose: Math.ceil(rawLoseDamage * guardScale), reward: value, route: option.name });
      s.combatReplay = C.createReplay(combat, `boss-${s.revision}-${option.id}`, { enemy: enemy.name });
      s.event = { id: 'quiet', title: '妖眼已闭，凡界未尽', text: `三眼妖王倒下，修为 +${value}。你已经证明这一世的 Build 能够破局。继续向元婴迈进。` };
      log(s, '镇杀三眼妖王', `${option.name}。第三只眼终于熄灭；金丹篇完成，但你的凡界道途还没有结束。`, 'gold');
    } else if (id === 'high') {
      const scene = byId(D.HIGH_EVENTS, s.event.scene), option = highChoices(s, s.event.scene).find(x => x.id === choice);
      requireThat(scene && scene.realm === s.realm && option, '当前无法走这条高阶路线。');
      if (!s.highSeen.includes(scene.id)) s.highSeen.push(scene.id);
      if (option.risk) hurt(s, option.risk);
      if (s.phase === 'dead') return;
      const value = gain(s, D.REALMS[s.realm].threshold * option.factor, option.devour ? 'devour' : 'explore');
      if (option.devour) { s.devours++; s.vitality = Math.min(100, s.vitality + 12 + (effects(s).devourHeal || 0)); }
      if (!s.realmProofs.includes(s.realm)) s.realmProofs.push(s.realm);
      s.event = { id: 'quiet', title: `${scene.title} · ${option.name}`, text: `你以这一世已经长成的道处理了这场机缘。修为 +${value}。此境的天地印证已经足够，修为圆满后可以继续破境。`, gain: value };
      log(s, scene.title, `${option.name}，修为 +${value}；${D.REALMS[s.realm].name}天地印证完成。`, 'gold');
    }
  }
  function transition(state, action) {
    validate(state);
    requireThat(action && typeof action.type === 'string', '无效操作。');
    if (action.revision !== undefined) requireThat(String(action.revision) === String(state.revision), '此选择已失效，请使用当前画面的选项。');
    const s = copy(state);
    // A replay is evidence of an already committed result. Any subsequent
    // gameplay action dismisses it without rerolling or paying rewards again.
    if (s.combatReplay) s.combatReplay = null;
    if (state.secretRealm?.active && !action.type.startsWith('secret-')) requireThat(false, '秘境尚未结束，请先继续路线或安全退出。');
    if (action.type.startsWith('immortal-')) {
      requireThat(s.phase === 'complete' && s.flags.ascended, '只有飞升后才能踏入仙界。');
      const I = immortalEngine();
      if (action.type === 'immortal-enter' || action.type === 'immortal-retry') {
        requireThat(action.type === 'immortal-enter' ? !s.immortal : s.immortal?.phase === 'dead', '不能重复领取仙界开局。');
        s.immortal = I.create(s);
      } else {
        requireThat(s.immortal, '尚未进入仙界。');
        s.immortal = I.transition(s.immortal, { ...action, type: action.type.slice(9) });
      }
      s.spiritBeast = spiritBeastEngine().observe(s.spiritBeast, state, s, action);
      s.karma = karmaEngine().observe(s.karma, state, s, action);
      nextRevision(s); validate(s); return s;
    }
    switch (action.type) {
      case 'select':
        requireThat(s.phase === 'talents' && s.offer.includes(action.id), '无法选择这条天命。');
        if (s.selected.includes(action.id)) s.selected = s.selected.filter(id => id !== action.id);
        else { requireThat(s.selected.length < 3, '最多选三条天命，先取消一条。'); s.selected.push(action.id); }
        break;
      case 'reroll-opening':
        requireThat(s.phase === 'talents' && s.openingRerolls > 0, '开局重抽次数已用完。');
        s.openingRerolls--; s.selected = []; s.offer = openingOffer(s); break;
      case 'confirm-talents':
        requireThat(s.phase === 'talents' && s.selected.length === 3, '请选择三条先天天命。');
        s.talents = [...s.selected]; s.innate = [...s.selected]; s.phase = 'attributes'; break;
      case 'stat': {
        requireThat(s.phase === 'attributes' && D.STATS.some(a => a.id === action.id), '当前不可加点。');
        requireThat(action.delta === 1 || action.delta === -1, '属性调整必须为一点。');
        const value = s.stats[action.id] + action.delta;
        const total = Object.values(s.stats).reduce((a, b) => a + b, 0) + action.delta;
        requireThat(value >= 1 && value <= 10 && total <= 20, '每项 1～10 点，总计 20 点。');
        s.stats[action.id] = value; break;
      }
      case 'preset': {
        requireThat(s.phase === 'attributes', '当前不可加点。');
        const presets = { balanced: [5, 5, 5, 5], body: [8, 5, 3, 4], sage: [3, 8, 4, 5], lucky: [3, 4, 9, 4] };
        requireThat(presets[action.id], '未知属性方案。');
        D.STATS.forEach((a, i) => { s.stats[a.id] = presets[action.id][i]; }); break;
      }
      case 'enter':
        requireThat(s.phase === 'attributes' && Object.values(s.stats).reduce((a, b) => a + b, 0) === 20, '请分配完全部 20 点。');
        s.root = choose(s, D.ROOTS).id; s.origin = choose(s, D.ORIGINS).id; s.phase = 'playing';
        s.event = { id: 'arrival', title: '此生，从黑风岭起', text: `${byId(D.ORIGINS, s.origin).text}十六岁这一年，你带着一卷残书走入黑风岭。${s.carriedTrace ? `识海深处还留着一道「${byId(D.TRACES, s.carriedTrace).name}」，仿佛某个并不存在的前世仍在注视这条山路。` : ''}先做一次行动，去看一眼这座山。` };
        log(s, '入世', `${byId(D.ROOTS, s.root).name}，${byId(D.ORIGINS, s.origin).name}。这一世，你不甘止于凡人。`); break;
      case 'act': act(s, action.kind); break;
      case 'seek-proof':
        requireThat(canSeekProof(s), '当前没有可以安全寻找的天地印证。');
        act(s, 'explore'); break;
      case 'cultivate-to-ready': cultivateToReady(s); break;
      case 'resolve': resolve(s, action.choice); break;
      case 'breakthrough': {
        requireThat(canBreak(s), '尚未达到突破条件。');
        const before = power(s), previous = s.realm, threshold = D.REALMS[previous].threshold;
        s.xp = Math.max(0, s.xp - threshold); s.realm++; s.vitality = 100;
        s.phase = 'draft'; s.event = null; s.offer = rollOffer(s, 3, s.realm >= 2 ? 2 : 1);
        s.draft = { previous, before, after: power(s) };
        log(s, `突破 · ${D.REALMS[s.realm].name}`, `战力 ${before} → ${power(s)}。寿元上限 ${maxAge(s)} 年。`, 'gold'); break;
      }
      case 'reroll-draft':
        requireThat(s.phase === 'draft' && s.redrawUsed < 1 + (effects(s).redraw || 0), '本世悟道重抽次数已用完。');
        s.redrawUsed++; s.offer = rollOffer(s, 3, s.realm >= 2 ? 2 : 1); break;
      case 'pick':
        requireThat(s.phase === 'draft' && s.offer.includes(action.id) && !s.talents.includes(action.id), '此天命不可领取。');
        s.talents.push(action.id); log(s, '悟道所得', byId(D.TALENTS, action.id).name, 'gold');
        s.phase = 'playing'; s.draft = null; s.offer = [];
        if (s.realm === 2 && !s.flags.pythonSlain) {
          s.revengePower = power(s, byId(D.ENEMIES, 'python')); s.event = { id: 'revenge', enemy: 'python' };
          log(s, '故地重逢', '还是那条妖蟒，还是一百五十战力。变的只有你。', 'gold');
        } else if (s.realm === 3) {
          s.phase = 'fusion'; s.fusionOffer = fusionOffer(s); s.event = null;
          log(s, '金丹凝成', '旧有天命与异变开始在金丹中互相牵引。你必须选择一种力量，让它真正融合。', 'gold');
        } else if (s.realm === 9) {
          s.phase = 'tribulation'; s.event = null; s.tribulationStage = 0; s.tribulationBase = power(s);
          log(s, '渡劫', '修为已无可再进。云海之上，九重劫云开始合拢。飞升不再是一个境界数字，而是接下来的三场劫。', 'danger');
        } else if (s.realm >= 4) {
          const inherited = byId(D.TRACES, s.carriedTrace);
          s.event = inherited && !s.flags.traceResonanceSeen
            ? { id: 'trace-resonance', trace: inherited.id }
            : { id: 'quiet', title: `${D.REALMS[s.realm].name} · 天地更阔`, text: '过去需要仰望的力量正在缩小。修至圆满之外，你还需要在这一境亲自经历一次天地印证，才能继续破境。' };
        }
        else s.event = { id: 'quiet', title: '引气入体', text: '你终于能将灵气留在体内。接下来可历练寻剑诀，也可闭关或狩猎；筑基后，回来找那条妖蟒。' };
        break;
      case 'mutate':
        requireThat(s.phase === 'mutation' && byId(D.MUTATIONS, action.id) && !s.mutations.length, '只能选择一种首次异变。');
        s.mutations.push(action.id); s.phase = 'playing'; s.event = { id: 'quiet', title: '异变已定', text: '妖血归于经脉。筑基只是开始：将这份力量带进金丹，看看它会与什么发生融合。' };
        log(s, '第一次异变', byId(D.MUTATIONS, action.id).name, 'gold'); break;
      case 'pick-fusion':
        requireThat(s.phase === 'fusion' && s.fusionOffer.includes(action.id) && byId(D.FUSIONS, action.id), '这次金丹融合无法选择该能力。');
        s.fusions.push(action.id); s.fusionOffer = []; s.phase = 'playing'; s.event = { id: 'quiet', title: '第一次能力融合', text: `${byId(D.FUSIONS, action.id).name}已经烙进金丹。接下来至少经历两处金丹机缘，三眼妖王才会真正显露踪迹。` };
        log(s, '能力融合', byId(D.FUSIONS, action.id).name, 'gold'); break;
      case 'challenge-boss':
        requireThat(canChallengeBoss(s), '三眼妖王的踪迹尚未显露。至少完成两处金丹机缘。');
        s.flags.bossSeen = true; s.event = { id: 'boss', enemy: 'threeeye' };
        log(s, '妖王现世', '第三只眼从云雾后睁开。它不是单纯更大的数字，而是在逼你证明这一世究竟走成了什么道。', 'danger'); break;
      case 'tribulation-step': {
        requireThat(s.phase === 'tribulation' && s.tribulationStage < 3, '当前没有可继续的天劫。');
        const data = tribulationChoices(s), option = data.options.find(x => x.id === action.id);
        requireThat(option, '这条渡劫路线当前不可用。');
        const stageFactor = [1, 1.08, 1.16][s.tribulationStage];
        const obstacle = { power: Math.round(s.tribulationBase * stageFactor * option.enemyFactor), beast: false };
        const t = threat(s, obstacle); requireThat(t.ratio >= .55, '这条路仍不足以承受此劫。');
        const win = t.chance === 1 || random(s) < t.chance;
        if (!win) {
          hurt(s, 34); if (s.phase === 'dead') { s.ending = '大道无情'; break; }
          log(s, `${data.name} · 受创`, '劫力贯体。你没有倒下，但必须在劫云散去前重新稳住自己的道。', 'danger');
          break;
        }
        log(s, `${data.name} · 已渡`, `${option.name}。这一劫再也拦不住你。`, 'gold');
        s.tribulationRoutes.push(option.id);
        s.tribulationStage++;
        if (s.tribulationStage >= 3) {
          s.flags.ascended = true; s.phase = 'complete'; s.ending = '飞升'; s.ascendedPower = power(s); s.event = null;
          log(s, '飞升', '天门洞开。你终于离开这个困住无数修士一生的世界。', 'gold');
        }
        break;
      }
      case 'equipment-identify':
        requireThat(!['talents', 'attributes'].includes(s.phase), '尚未入世，不能整理装备。');
        s.equipment = equipmentEngine().identify(s.equipment, action.id); break;
      case 'equipment-equip':
        requireThat(!['talents', 'attributes'].includes(s.phase), '尚未入世，不能穿戴装备。');
        s.equipment = equipmentEngine().equip(s.equipment, action.id); break;
      case 'equipment-unequip':
        requireThat(!['talents', 'attributes'].includes(s.phase), '尚未入世，不能调整装备。');
        s.equipment = equipmentEngine().unequip(s.equipment, action.id); break;
      case 'equipment-refine':
        requireThat(!['talents', 'attributes'].includes(s.phase), '尚未入世，不能温养装备。');
        s.equipment = equipmentEngine().refine(s.equipment, action.id); break;
      case 'equipment-salvage':
        requireThat(!['talents', 'attributes'].includes(s.phase), '尚未入世，不能归炉装备。');
        s.equipment = equipmentEngine().salvage(s.equipment, action.id); break;
      case 'equipment-evolve':
        requireThat(!['talents', 'attributes'].includes(s.phase), '尚未入世，不能蜕变神兵。');
        s.equipment = equipmentEngine().evolve(s.equipment, action.id); break;
      case 'secret-enter': {
        requireThat(s.phase === 'playing' && !isBlocking(s), '当前无法进入秘境。');
        const R=secretRealmEngine(), threshold=D.REALMS[s.realm].threshold || D.REALMS[8].threshold;
        s.secretRealm=R.start(s.secretRealm,action.id,s.seed,s.realm,power(s),threshold);
        log(s,'秘境开启',`踏入${R.REALMS.find(r=>r.id===action.id).name}。任何一层都可以选择安全退出。`,'gold');
        break;
      }
      case 'secret-choose': {
        const R=secretRealmEngine(), result=R.choose(s.secretRealm,action.id); s.secretRealm=result.state;
        if(result.settlement){
          const actual=result.settlement.awardXp?gain(s,result.settlement.awardXp,'explore'):0;
          if(result.settlement.boss) s.equipment=equipmentEngine().addDrop(s.equipment,s.seed,`secret:${result.settlement.realmId}:boss`,'boss',s.realm,buildEngine().evaluateBuild(s).main || '');
          log(s,`秘境 · ${result.settlement.name}`,`${result.settlement.ending==='complete'?'破境而出':result.settlement.ending==='failed'?'败退离境':'收束所得'}，带回修为 +${actual}。${result.settlement.boss?'首胜独有装备来源已结算。':''}`,result.settlement.ending==='failed'?'danger':'gold');
        }
        break;
      }
      case 'secret-exit': {
        const result=secretRealmEngine().exit(s.secretRealm); s.secretRealm=result.state;
        const actual=result.settlement.awardXp?gain(s,result.settlement.awardXp,'explore'):0;
        log(s,`秘境 · ${result.settlement.name}`,`你主动收束路线，安全带回修为 +${actual}。`,'gold'); break;
      }
      case 'sect-decline': {
        requireThat(s.phase==='playing'&&!isBlocking(s)&&!s.secretRealm.active,'当前无法处理宗门邀约。');
        const X=sectEngine(); s.sect=X.decline(s.sect,action.id,s.realm);
        log(s,'宗门邀约',`暂未拜入「${X.data(action.id).name}」。此世仍可重新考虑。`); break;
      }
      case 'sect-join': {
        requireThat(s.phase==='playing'&&!isBlocking(s)&&!s.secretRealm.active,'当前无法拜入宗门。');
        const X=sectEngine(); s.sect=X.join(s.sect,action.id,s.realm);
        log(s,'拜入宗门',`你正式拜入「${X.data(action.id).name}」。宗门提供传承与事件，不要求每日贡献。`,'gold'); break;
      }
      case 'sect-resolve': {
        requireThat(s.phase==='playing'&&!isBlocking(s)&&!s.secretRealm.active,'当前无法处理宗门事件。');
        const X=sectEngine(), result=X.resolve(s.sect,action.id,s.realm); s.sect=result.state;
        const threshold=D.REALMS[s.realm].threshold||D.REALMS[8].threshold;
        const actual=result.reward.xpFactor?gain(s,threshold*result.reward.xpFactor,'explore'):0;
        if(result.reward.heal) s.vitality=Math.min(100,s.vitality+result.reward.heal);
        const event=X.EVENT_BY_ID[result.reward.event], sect=X.data(result.reward.sect);
        const outcomeName=result.reward.outcome?X.MAJOR_CHOICES.find(x=>x.id===result.reward.outcome)?.name:'';
        log(s,`宗门 · ${event.title}`,`${outcomeName?`选择「${outcomeName}」。`:'事件已结。'}修为 +${actual}。${result.reward.heal?`元气恢复 ${result.reward.heal}。`:''}`,result.reward.outcome==='betray'?'danger':'gold');
        if(result.reward.outcome==='leave'||result.reward.outcome==='betray') s.event={id:'quiet',title:'山门在后',text:`你与「${sect.name}」的宗门关系已经结束。传承不再提供本世被动，但这次选择会被保留为后续因果依据。`};
        break;
      }
      case 'sect-leave': {
        requireThat(s.phase==='playing'&&!isBlocking(s)&&!s.secretRealm.active,'当前无法离宗。');
        const X=sectEngine(), old=X.current(s.sect); s.sect=X.leave(s.sect,s.realm,'leave');
        log(s,'离宗',`你向「${old.name}」辞别。没有贡献清算，也没有永久数值惩罚。`); break;
      }
      case 'life-resolve': {
        requireThat(s.phase==='playing'&&!isBlocking(s)&&!s.secretRealm.active,'当前无法处理人生回响。');
        const L=lifeEngine(), result=L.resolve(s.life,s.origin,action.id,s.realm); s.life=result.state;
        const threshold=D.REALMS[s.realm].threshold||D.REALMS[8].threshold;
        const actual=result.reward.xpFactor?gain(s,threshold*result.reward.xpFactor,'explore'):0;
        const event=L.EVENTS[result.reward.event], choice=event.choices.find(x=>x.id===result.reward.choice);
        log(s,`人生 · ${event.title}`,`你选择「${choice.name}」。${actual?`修为 +${actual}。`:'没有数值收益。'}${result.reward.major?'这次重大选择会作为后续因果来源保留。':''}`,result.reward.major?'gold':'normal');
        break;
      }
      case 'beast-bond': {
        requireThat(!['talents','attributes','dead'].includes(s.phase),'当前无法结伴灵兽。');
        const P=spiritBeastEngine(); s.spiritBeast=P.bond(s.spiritBeast,action.id);
        log(s,'灵兽结契',`你与「${P.BY_ID[action.id].name}」结下主契。这一世只保留一个主灵兽位。`,'gold'); break;
      }
      case 'beast-evolve': {
        requireThat(!['talents','attributes','dead'].includes(s.phase),'当前无法让灵兽进化。');
        const P=spiritBeastEngine(), before=P.summary(s.spiritBeast);
        s.spiritBeast=P.evolve(s.spiritBeast,{realm:s.realm,ascended:s.flags.ascended,immortal:!!s.immortal},action.id||null);
        const after=P.summary(s.spiritBeast); log(s,'灵兽进化',`${before.name} → ${after.name} · ${after.stageName}。分支一旦形成便不可逆。`,'gold'); break;
      }
      case 'craft-pill': {
        requireThat(!['talents','attributes','dead'].includes(s.phase)&&!s.immortal,'当前无法炼丹。');
        const C=craftingEngine(),result=C.craftPill(s.crafting,s.seed,action.id,action.kind);s.crafting=result.state;
        log(s,'炼丹',`${result.method.name}炼成「${result.recipe.name}」${result.variant?'，丹纹异变。':'。'}材料已结算，丹药收入药匣。`,result.variant?'gold':'normal');break;
      }
      case 'craft-use': {
        requireThat(!['talents','attributes','dead'].includes(s.phase)&&!s.immortal,'当前无法服用凡界丹药。');
        const C=craftingEngine(),result=C.usePill(s.crafting,action.id);s.crafting=result.state;let actual=0;
        if(result.reward.kind==='xp'){const threshold=D.REALMS[s.realm].threshold||D.REALMS[8].threshold;actual=gain(s,threshold*result.reward.amount,'cultivate');}
        else if(result.reward.kind==='heal'){const before=s.vitality;s.vitality=Math.min(100,s.vitality+Math.round(result.reward.amount));actual=s.vitality-before;}
        log(s,'服丹',`服下「${result.recipe.name}」。${result.reward.kind==='xp'?`修为 +${actual}。`:result.reward.kind==='heal'?`元气恢复 ${actual}。`:`临时 Build 已激活，共 ${s.crafting.buff?.charges||0} 次主线行动。`}`,result.reward.variant?'gold':'normal');break;
      }
      case 'craft-weapon': {
        requireThat(!['talents','attributes','dead'].includes(s.phase)&&!s.immortal,'当前无法炼器。');
        const C=craftingEngine(),entry=equipmentEngine().equipped(s.equipment,'weapon'),def=equipmentEngine().data(entry);
        requireThat(entry&&entry.identified&&def?.special,'需要先穿戴一件已鉴定的本命兵器。');
        const result=C.forgeWeapon(s.crafting,action.id,def.path);s.crafting=result.state;s.equipment=equipmentEngine().grantWeaponXp(s.equipment,result.weaponXp);
        log(s,'炼器',`${result.recipe.name}完成，本命兵器历练 +${result.weaponXp}。没有强化失败或耐久损失。`,'gold');break;
      }
      case 'karma-resolve': {
        requireThat(s.karma?.pending,'当前没有待偿因果。');
        const K=karmaEngine(),result=K.resolve(s.karma,action.id,{realm:s.realm,immortal:!!s.immortal,playable:s.phase==='playing'||!!s.immortal});s.karma=result.state;
        const threshold=D.REALMS[Math.min(s.realm,8)].threshold||D.REALMS[8].threshold;
        const actual=result.reward.xpFactor&&s.phase==='playing'?gain(s,threshold*result.reward.xpFactor,'explore'):0;
        if(result.reward.heal&&s.phase==='playing')s.vitality=Math.min(100,s.vitality+result.reward.heal);
        log(s,`因果 · ${result.reward.entry.relation}`,`源自「${result.reward.entry.source}」。你选择「${result.reward.name}」。${actual?`修为 +${actual}。`:''}${result.reward.heal?`元气恢复 ${result.reward.heal}。`:''}`,'gold');break;
      }
      default: throw new Error('未识别的操作。');
    }
    if (!action.type.startsWith('equipment-')) {
      const previousDrop = JSON.stringify(s.equipment.lastDrop);
      s.equipment = equipmentEngine().observe(s.equipment, state, s, action);
      if (s.combatReplay && JSON.stringify(s.equipment.lastDrop) !== previousDrop) {
        const drop = s.equipment.lastDrop;
        if (drop?.id && s.combatReplay.events.length < 10) {
          const def = equipmentEngine().BY_ID[drop.id];
          const text = drop.full ? `行囊已满，「${def.name}」自动归炉为 ${drop.converted} 器蕴。` : `额外战利品：未鉴定「${def.name}」已收入行囊。`;
          s.combatReplay.events.push({ type:'drop', text, tone:'rare' });
        }
      }
    }
    s.sect=sectEngine().observe(s.sect,state,s,action);
    s.life=lifeEngine().observe(s.life,s.origin,s.realm,s.phase==='playing'&&!isBlocking(s)&&!s.secretRealm.active);
    if (!action.type.startsWith('beast-')) s.spiritBeast=spiritBeastEngine().observe(s.spiritBeast,state,s,action);
    s.crafting=craftingEngine().observe(s.crafting,state,s,action);
    s.crafting=craftingEngine().afterAction(s.crafting,action);
    s.karma=karmaEngine().observe(s.karma,state,s,action);
    nextRevision(s);
    validate(s);
    return s;
  }
  function validate(s) {
    requireThat(s && typeof s === 'object' && !Array.isArray(s) && s.version === VERSION, '存档版本不兼容。');
    requireThat(PHASES.includes(s.phase), '存档阶段无效。');
    if (s.immortal != null) {
      requireThat(s.phase === 'complete' && s.flags?.ascended && s.immortal.mortalPower === s.ascendedPower, '仙界与凡界成就不一致。');
      immortalEngine().validate(s.immortal);
    }
    equipmentEngine().validate(s.equipment);
    combatEngine().validateReplay(s.combatReplay);
    secretRealmEngine().validate(s.secretRealm);
    sectEngine().validate(s.sect);
    lifeEngine().validate(s.life);
    spiritBeastEngine().validate(s.spiritBeast);
    craftingEngine().validate(s.crafting);
    karmaEngine().validate(s.karma);
    requireThat(s.defeats === undefined || s.defeats === null || (Number.isSafeInteger(s.defeats) && s.defeats >= 0), '败退记录损坏。');
    for (const key of ['seed', 'rng']) requireThat(Number.isInteger(s[key]) && s[key] > 0 && s[key] <= 4294967295, '随机种子损坏。');
    requireThat(Number.isSafeInteger(s.revision) && s.revision >= 0 || typeof s.revision === 'string' && s.revision.length <= 2048 && /^(0|[1-9]\d*)$/.test(s.revision), '操作版本损坏。');
    for (const key of ['age', 'realm', 'vitality', 'openingRerolls', 'redrawUsed', 'rebirthUsed', 'actions', 'devours', 'tribulationStage', 'batchCultivations']) requireThat(Number.isInteger(s[key]) && s[key] >= 0 && s[key] <= 1000000, '存档数值损坏。');
    requireThat(Number.isInteger(s.xp) && s.xp >= 0 && s.xp <= 100000000, '修为数据损坏。');
    requireThat(s.realm <= 9 && s.vitality <= 100 && s.openingRerolls <= 2 && s.age <= 200000 && s.tribulationStage <= 3, '存档数值超出范围。');
    requireThat(s.stats && D.STATS.every(a => Number.isInteger(s.stats[a.id]) && s.stats[a.id] >= 1 && s.stats[a.id] <= 10), '属性点损坏。');
    const total = D.STATS.reduce((n, a) => n + s.stats[a.id], 0);
    requireThat(total <= 20 && total >= 4 && (['talents', 'attributes'].includes(s.phase) || total === 20), '属性点总数不正确。');
    for (const key of ['talents', 'innate', 'selected', 'offer']) requireThat(Array.isArray(s[key]) && s[key].length <= D.TALENTS.length && new Set(s[key]).size === s[key].length && s[key].every(id => typeof id === 'string' && byId(D.TALENTS, id) && (!byId(D.TALENTS, id).exclusiveTrace || byId(D.TALENTS, id).exclusiveTrace === s.carriedTrace)), '天命数据损坏。');
    requireThat(s.selected.length <= 3 && s.innate.length <= 3, '先天天命数量不正确。');
    requireThat(Array.isArray(s.mutations) && s.mutations.length <= 1 && s.mutations.every(id => byId(D.MUTATIONS, id)), '异变数据损坏。');
    requireThat(Array.isArray(s.fusions) && s.fusions.length <= 1 && s.fusions.every(id => byId(D.FUSIONS, id)), '融合数据损坏。');
    requireThat(Array.isArray(s.fusionOffer) && s.fusionOffer.length <= 3 && new Set(s.fusionOffer).size === s.fusionOffer.length && s.fusionOffer.every(id => byId(D.FUSIONS, id)), '融合签池损坏。');
    requireThat(Array.isArray(s.advancedSeen) && s.advancedSeen.length <= D.ADVANCED_EVENTS.length && new Set(s.advancedSeen).size === s.advancedSeen.length && s.advancedSeen.every(id => byId(D.ADVANCED_EVENTS, id)), '金丹事件记录损坏。');
    requireThat(Number.isInteger(s.advancedResolved) && s.advancedResolved >= 0 && s.advancedResolved <= 100, '金丹事件计数损坏。');
    requireThat(Array.isArray(s.highSeen) && s.highSeen.length <= D.HIGH_EVENTS.length && new Set(s.highSeen).size === s.highSeen.length && s.highSeen.every(id => byId(D.HIGH_EVENTS, id)), '高阶事件记录损坏。');
    requireThat(Array.isArray(s.realmProofs) && s.realmProofs.length <= 5 && new Set(s.realmProofs).size === s.realmProofs.length && s.realmProofs.every(n => Number.isInteger(n) && n >= 4 && n <= 8), '天地印证记录损坏。');
    requireThat(s.carriedTrace === null || byId(D.TRACES, s.carriedTrace), '轮回道痕损坏。');
    requireThat(s.traceSourceSeed == null || s.carriedTrace && Number.isInteger(s.traceSourceSeed) && s.traceSourceSeed > 0 && s.traceSourceSeed <= 4294967295, '前世来源损坏。');
    requireThat(s.bossRoute === null || BOSS_ROUTE_IDS.includes(s.bossRoute), '妖王破局记录损坏。');
    requireThat(Array.isArray(s.tribulationRoutes) && s.tribulationRoutes.length <= 3 && s.tribulationRoutes.every(id => TRIBULATION_ROUTE_IDS.includes(id)), '渡劫路线记录损坏。');
    requireThat(s.tribulationBase === null || (Number.isInteger(s.tribulationBase) && s.tribulationBase > 0), '天劫基准损坏。');
    requireThat(s.ascendedPower === null || (Number.isInteger(s.ascendedPower) && s.ascendedPower > 0), '飞升战力损坏。');
    requireThat(s.flags && ['pythonSeen', 'pythonSlain', 'swordEvent', 'bossSeen', 'bossSlain', 'ascended', 'traceEchoSeen', 'traceResonanceSeen'].every(k => typeof s.flags[k] === 'boolean') && typeof s.sword === 'boolean', '进度标记损坏。');
    requireThat(s.event === null || (s.event && EVENT_IDS.includes(s.event.id) && (!s.event.enemy || byId(D.ENEMIES, s.event.enemy)) && (!s.event.scene || byId(D.ADVANCED_EVENTS, s.event.scene) || byId(D.HIGH_EVENTS, s.event.scene)) && (!s.event.trace || byId(D.TRACES, s.event.trace)) && (!['trace-echo', 'trace-resonance'].includes(s.event.id) || byId(D.TRACES, s.event.trace))), '事件数据损坏。');
    requireThat(s.root === null || byId(D.ROOTS, s.root), '灵根数据损坏。');
    requireThat(s.origin === null || byId(D.ORIGINS, s.origin), '出身数据损坏。');
    if (!['talents', 'attributes'].includes(s.phase)) requireThat(s.root && s.origin && s.innate.length === 3, '入世资料缺失。');
    if (s.phase === 'talents') requireThat(s.offer.length === 8 && s.selected.every(id => s.offer.includes(id)), '开局签池损坏。');
    if (s.phase === 'draft') requireThat(s.offer.length === 3 && s.offer.every(id => !s.talents.includes(id)) && s.draft && s.realm > 0, '悟道存档损坏。');
    if (s.phase === 'mutation') requireThat(s.flags.pythonSlain && s.mutations.length === 0 && s.realm === 2, '异变阶段资料不完整。');
    if (['fusion', 'tribulation', 'complete'].includes(s.phase) || s.realm >= 3) requireThat(s.flags.pythonSlain && s.mutations.length === 1 && s.realm >= 2, '异变进度不完整。');
    if (s.phase === 'fusion') requireThat(s.realm === 3 && s.fusionOffer.length === 3 && s.fusions.length === 0, '融合阶段资料不完整。');
    if (s.realm >= 4) requireThat(s.fusions.length === 1 && s.flags.bossSlain, '高境界前置进度不完整。');
    if (s.phase === 'tribulation') requireThat(s.realm === 9 && s.tribulationStage < 3 && s.tribulationBase, '渡劫资料不完整。');
    if (s.phase === 'complete') requireThat(s.realm === 9 && s.fusions.length === 1 && s.flags.bossSlain && s.flags.ascended && s.tribulationStage === 3 && s.ascendedPower, '飞升结算资料不完整。');
    requireThat(Array.isArray(s.log) && s.log.length <= 100 && s.log.every(l => l && typeof l.title === 'string' && l.title.length < 200 && typeof l.text === 'string' && l.text.length < 2000 && Number.isInteger(l.age) && Number.isInteger(l.realm)), '历程记录损坏。');
    return true;
  }
  function serialize(s) { validate(s); return JSON.stringify(s); }
  function migrateV1(s) {
    if (!s || s.version !== 1) return s;
    s.version = 2; s.fusions = []; s.fusionOffer = []; s.advancedSeen = []; s.advancedResolved = 0;
    s.flags = { ...s.flags, bossSeen: false, bossSlain: false };
    if (s.phase === 'complete' && s.flags.pythonSlain && s.mutations?.length === 1) {
      s.phase = 'playing'; s.ending = null; s.event = { id: 'quiet', title: '道途续开', text: '赤鳞因果已了。旧版序章的终点，如今只是金丹篇的起点。' };
    }
    return s;
  }
  function migrateV2(s) {
    if (!s || s.version !== 2) return s;
    s.version = 3; s.highSeen = []; s.realmProofs = []; s.tribulationStage = 0; s.tribulationBase = null; s.ascendedPower = null;
    s.flags = { ...s.flags, ascended: false };
    if (s.phase === 'complete' && s.flags.bossSlain) {
      s.phase = 'playing'; s.ending = null; s.event = { id: 'quiet', title: '凡界道途续开', text: '三眼妖王已伏诛。旧版金丹篇的终点，如今只是元婴之前的一道门槛。' };
    }
    return s;
  }
  function migrateV3(s) {
    if (!s || s.version !== 3) return s;
    s.version = 4;
    s.carriedTrace = null;
    s.bossRoute = null;
    s.tribulationRoutes = s.phase === 'complete' && s.flags?.ascended ? ['legacy', 'legacy', 'legacy'] : [];
    s.batchCultivations = 0;
    s.flags = { ...s.flags, traceEchoSeen: false, traceResonanceSeen: false };
    return s;
  }
  function normalizeV4(s) {
    if (!s || s.version !== 4 || !s.flags) return s;
    if (s.flags.traceEchoSeen === undefined) s.flags.traceEchoSeen = false;
    if (s.flags.traceResonanceSeen === undefined) s.flags.traceResonanceSeen = false;
    // Old logs are capped at 100 entries; absence of a loss is not proof of a flawless run.
    if (s.defeats === undefined) s.defeats = null;
    return s;
  }
  function migrateV4(s) {
    if (!s || s.version !== 4) return s;
    s.version = 5; s.immortal = null; return s;
  }
  function migrateV5(s) {
    if (!s || s.version !== 5) return s;
    s.version = 6; s.equipment = equipmentEngine().createState(); return s;
  }
  function migrateV6(s) {
    if (!s || s.version !== 6) return s;
    s.version = 7; s.combatReplay = null; return s;
  }
  function migrateV7(s) {
    if (!s || s.version !== 7) return s;
    s.version = 8; s.secretRealm = secretRealmEngine().createState(); return s;
  }
  function migrateV8(s) {
    if (!s || s.version !== 8) return s;
    s.version = 9; s.sect = sectEngine().createState(); return s;
  }
  function migrateV9(s) {
    if (!s || s.version !== 9) return s;
    s.version = 10; s.life = lifeEngine().createState(); return s;
  }
  function migrateV10(s) {
    if (!s || s.version !== 10) return s;
    s.version = 11; s.spiritBeast = spiritBeastEngine().createState(); return s;
  }
  function migrateV11(s) {
    if (!s || s.version !== 11) return s;
    s.version = 12; s.crafting = craftingEngine().createState(); return s;
  }
  function migrateV12(s) {
    if (!s || s.version !== 12) return s;
    s.version = 13; s.karma = karmaEngine().createState(); return s;
  }
  function deserialize(text) { requireThat(typeof text === 'string' && text.length <= 200000, '存档文件过大。'); let s = JSON.parse(text); s = migrateV1(s); s = migrateV2(s); s = migrateV3(s); s = normalizeV4(s); s = migrateV4(s); s = migrateV5(s); s = migrateV6(s); s = migrateV7(s); s = migrateV8(s); s = migrateV9(s); s = migrateV10(s); s = migrateV11(s); s = migrateV12(s); if (s?.version === VERSION && s.immortal) s.immortal = immortalEngine().migrate(s.immortal); validate(s); return s; }
  function synergies(s) {
    const list = [];
    if (s.sword && s.root === 'thunder' && s.talents.includes('swordbone')) list.push({ name: '雷剑体', text: '雷灵根 × 天生剑骨 × 青云剑诀：战力额外 +20%。' });
    if (s.talents.includes('taotie') && s.talents.includes('stomach')) list.push({ name: '吞天魔胃', text: '饕餮之种 × 吞灵之胃：吞噬修为额外 +25%，战力 +15%。' });
    for (const id of s.fusions || []) { const f = byId(D.FUSIONS, id); if (f) list.push({ name: f.name, text: `${f.path}：${f.description}` }); }
    return list;
  }
  return { VERSION, createRun, transition, validate, serialize, deserialize, effects, stats, power, maxAge, threat, canBreak, isBlocking, actionPreview, canCultivateToReady, canSeekProof, synergies, availableFusions, advancedChoices, bossChoices, canChallengeBoss, highChoices, tribulationChoices };
});
