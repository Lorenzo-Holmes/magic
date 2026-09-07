(function (root, factory) {
  const scenes = factory();
  if (typeof module === 'object' && module.exports) module.exports = scenes;
  else root.FSScenes = scenes;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Presentation only: never mutate the run, advance RNG, or add save fields.
  const VERSION = '0.7.0';
  const STAGES = Object.freeze(Object.fromEntries([
    ['mortal', '黑风岭', '山野如墨 · 此身如尘'],
    ['foundation', '凌云之巅', '云海在下 · 初窥天地'],
    ['goldcore', '丹霞悬境', '残宗浮山 · 万法归丹'],
    ['nascent', '诸域云上', '古战场寂 · 山河入眼'],
    ['void', '界外星海', '大陆如舟 · 星辰如尘'],
    ['tribulation', '九霄劫天', '天地合拢 · 唯道可渡'],
    ['ascension', '天门彼岸', '凡尘在下 · 仙途在上']
  ].map(([id, title, subtitle]) => [id, Object.freeze({ id, title, subtitle, src: `assets/bg/realm-${id}.svg` })])));
  const REALM_SCENES = Object.freeze(['mortal', 'mortal', 'foundation', 'goldcore', 'nascent', 'nascent', 'void', 'void', 'void', 'tribulation']);
  const HIGH_ATMOSPHERES = Object.freeze({
    'nascent-battlefield': 'world-cloud', 'nascent-sea': 'world-cloud', 'nascent-shell': 'world-spirit',
    'soul-city': 'world-spirit', 'soul-rift': 'world-rift', 'dao-stele': 'world-spirit',
    'void-nest': 'world-rift', 'space-river': 'world-rift', 'ancient-gate': 'world-rift',
    'world-form': 'world-cloud', 'demon-sky': 'world-rift', 'old-sect': 'world-cloud',
    'star-corpse': 'world-star', 'heaven-stele': 'world-star', 'immortal-shadow': 'world-spirit'
  });
  const TRACE_ATMOSPHERES = Object.freeze({
    devour: 'serpent-prey', sword: 'world-rift', body: 'gold-fusion',
    soul: 'world-spirit', fortune: 'gold-fusion', insight: 'world-spirit'
  });
  function resolve(state, home = false) {
    if (home || !state || ['talents', 'attributes'].includes(state.phase)) return { ...STAGES.mortal, atmosphere: 'calm' };
    let id = REALM_SCENES[state.realm] || 'mortal', atmosphere = 'calm';
    if (state.phase === 'complete' && state.flags?.ascended) { id = 'ascension'; atmosphere = 'ascension'; }
    else if (state.phase === 'dead') atmosphere = 'still';
    else if (id === 'tribulation') atmosphere = 'thunder';
    else if (state.event?.id === 'first-python') atmosphere = 'serpent-danger';
    else if (['revenge', 'remains'].includes(state.event?.id) || state.phase === 'mutation') atmosphere = 'serpent-prey';
    else if (state.event?.id === 'boss' || state.event?.enemy === 'threeeye') atmosphere = 'demon-eye';
    else if (state.phase === 'fusion') atmosphere = 'gold-fusion';
    else if (['trace-echo', 'trace-resonance'].includes(state.event?.id)) atmosphere = TRACE_ATMOSPHERES[state.event.trace] || 'world-spirit';
    else if (state.event?.id === 'high') atmosphere = HIGH_ATMOSPHERES[state.event.scene] || 'world-spirit';
    return { ...STAGES[id], atmosphere };
  }
  function attach(element) {
    if (!element) return { update: resolve };
    const doc = element.ownerDocument, win = doc.defaultView;
    const layers = [...element.querySelectorAll('.world-image')];
    const cache = new Map();
    let active = 0, loaded = 'mortal', requested = 'mortal', generation = 0;
    function load(id) {
      if (!cache.has(id)) cache.set(id, new Promise((accept, reject) => {
        const image = new win.Image();
        image.onload = () => accept(image);
        image.onerror = () => { cache.delete(id); reject(new Error(`Background unavailable: ${id}`)); };
        image.src = new URL(STAGES[id].src, doc.baseURI).href;
      }));
      return cache.get(id);
    }
    function update(state, home = false) {
      const next = resolve(state, home);
      element.dataset.scene = next.id;
      element.dataset.atmosphere = next.atmosphere;
      doc.documentElement.dataset.world = next.id;
      if (requested !== next.id || element.dataset.sceneError) {
        requested = next.id;
        const token = ++generation;
        delete element.dataset.sceneError;
        if (loaded !== next.id) load(next.id).then(async image => {
          if (token !== generation) return;
          const back = layers[1 - active];
          back.src = image.src;
          // Keep the old picture visible until the new one is decoded. No white frames.
          if (back.decode) { try { await back.decode(); } catch { /* onload has already verified the image */ } }
          if (token !== generation) return;
          back.classList.add('is-visible'); layers[active].classList.remove('is-visible');
          active = 1 - active; loaded = next.id; element.dataset.loadedScene = loaded;
        }).catch(() => {
          if (token === generation) element.dataset.sceneError = next.id;
          // An unavailable asset must never interrupt play or erase the previous scene.
        });
      }
      return next;
    }
    doc.addEventListener('visibilitychange', () => { element.dataset.paused = String(doc.hidden); });
    return { update };
  }
  return Object.freeze({ VERSION, STAGES, REALM_SCENES, HIGH_ATMOSPHERES, TRACE_ATMOSPHERES, resolve, attach });
});
