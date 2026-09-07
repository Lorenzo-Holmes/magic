(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSPresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Pure presentation rules. This module never mutates a run and never consumes RNG.
  const VERSION = '1.1.0';
  const QUALITY = Object.freeze({
    common: Object.freeze({ id: 'common', name: '凡', rank: 0 }),
    refined: Object.freeze({ id: 'refined', name: '灵', rank: 1 }),
    rare: Object.freeze({ id: 'rare', name: '玄', rank: 2 }),
    epic: Object.freeze({ id: 'epic', name: '地', rank: 3 }),
    mythic: Object.freeze({ id: 'mythic', name: '天', rank: 4 })
  });
  const TRIBULATIONS = Object.freeze(['九霄雷劫', '问心魔劫', '天门终劫']);
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function qualityFromRarity(rarity) {
    const ids = ['common', 'refined', 'rare', 'epic', 'mythic'];
    return QUALITY[ids[Math.max(0, Math.min(4, Number(rarity) || 0))]];
  }
  function reward(before, after, action) {
    if (!before || !after || !action) return [];
    const out = [];
    if (after.realm === before.realm && Number.isFinite(after.xp) && Number.isFinite(before.xp) && after.xp > before.xp) {
      out.push({ id: 'xp', label: '修为', value: `+${after.xp - before.xp}`, tone: 'growth' });
    }
    if ((after.devours || 0) > (before.devours || 0)) out.push({ id: 'devour', label: '吞噬', value: '+1', tone: 'rare' });
    if ((after.vitality || 0) > (before.vitality || 0) && action.type !== 'breakthrough') {
      out.push({ id: 'vitality', label: '元气', value: `+${after.vitality - before.vitality}`, tone: 'recovery' });
    }
    return out.slice(0, 3);
  }
  function major(before, after, action) {
    if (!before || !after || !action) return null;
    if (after.flags?.ascended && !before.flags?.ascended) return {
      id: 'ascension', kind: 'ascension', eyebrow: '天门洞开', title: '飞升', subtitle: '凡尘在下 · 仙途在上', duration: 2600
    };
    if (action.type === 'breakthrough' && after.phase === 'draft' && after.realm > before.realm) return {
      id: `breakthrough-${after.realm}`, kind: 'breakthrough', eyebrow: '桎梏已破', title: after.realmName || '', subtitle: '生命层级跃迁', duration: 1900
    };
    if (action.type === 'pick-fusion' && after.fusions?.length > before.fusions?.length) return {
      id: `fusion-${after.fusions.at(-1)}`, kind: 'fusion', eyebrow: '万法入炉', title: '能力融合', subtitle: '已有 Build 发生质变', duration: 2000
    };
    if (action.type === 'mutate' && after.mutations?.length > before.mutations?.length) return {
      id: `mutation-${after.mutations.at(-1)}`, kind: 'mutation', eyebrow: '异血归身', title: '首次异变', subtitle: '旧敌之血 · 化作己道', duration: 1800
    };
    if (action.type === 'tribulation-step' && (after.tribulationRoutes?.length || 0) > (before.tribulationRoutes?.length || 0)) {
      const cleared = Math.max(0, Math.min(2, (after.tribulationRoutes?.length || 1) - 1));
      return { id: `tribulation-${cleared}`, kind: 'thunder', eyebrow: '此劫已渡', title: TRIBULATIONS[cleared], subtitle: `${cleared + 1} / 3`, duration: 1900 };
    }
    if (action.type === 'immortal-evolution-fuse') return {
      id: `evolution-fuse-${action.id || 'unknown'}`, kind: 'fusion', eyebrow: '五槽共鸣', title: '仙界融合', subtitle: '旧力熔尽 · 新法成形', duration: 2000
    };
    return null;
  }
  function feedback(before, after, action) {
    const raw = JSON.stringify([before, after]);
    const result = Object.freeze({ rewards: Object.freeze(reward(before, after, action).map(Object.freeze)), major: major(before, after, action) });
    if (JSON.stringify([before, after]) !== raw) throw new Error('表现层不得修改游戏状态。');
    return result;
  }
  function enrich(feedbackValue, names = {}) {
    const value = copy(feedbackValue) || { rewards: [], major: null };
    if (value.major?.kind === 'breakthrough' && names.realm) value.major.title = names.realm;
    if (value.major?.kind === 'fusion' && names.fusion) value.major.title = names.fusion;
    if (value.major?.kind === 'mutation' && names.mutation) value.major.title = names.mutation;
    return value;
  }
  return Object.freeze({ VERSION, QUALITY, TRIBULATIONS, qualityFromRarity, reward, major, feedback, enrich });
});
