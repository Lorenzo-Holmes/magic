'use strict';
// Legal-action policies; never assign a realm, victory, item or ending directly.
const E = require('../src/engine.js');
const D = require('../src/data.js');
const PATHS = ['devour', 'sword', 'body', 'soul', 'fortune', 'insight'];
const names = ['吞噬', '剑道', '肉身', '神魂', '气运', '修炼'];
const mutations = { devour: 'serpentblood', sword: 'redscale', body: 'redscale', soul: 'serpenteye', fortune: 'serpenteye', insight: 'serpenteye' };
const fusions = { devour: ['devour-body', 'dragon-blood'], sword: ['thunder-sword', 'flame-scale'], body: ['golden-body', 'flame-scale'], soul: ['abyss-eye'], fortune: ['fate-veil'], insight: ['five-unity'] };
const routes = { devour: ['devour-eye', 'devour', 'drink', 'eat-gate'], sword: ['sword-break', 'sword', 'learn', 'cut-gate'], body: ['body-charge', 'body', 'step-gate'], soul: ['see-through', 'mind', 'see', 'probe'], fortune: ['fate', 'fortune', 'fate-gate'], insight: ['insight', 'dao', 'comprehend'] };
function talentScore(id, strategy) {
  const t = D.TALENTS.find(t => t.id === id);
  return (t.path === names[PATHS.indexOf(strategy)] ? 20 : 0) + t.rarity * 1.5 + (['study', 'seed', 'bright', 'vital'].includes(id) ? 4 : 0);
}
function bestTalent(list, strategy) { return list.slice().sort((a, b) => talentScore(b, strategy) - talentScore(a, strategy))[0]; }
function chooseAction(s, strategy = 'body', batch = true) {
  const resolve = choice => ({ type: 'resolve', choice });
  if (s.phase === 'talents') {
    if (s.selected.length === 3) return { type: 'confirm-talents' };
    return { type: 'select', id: bestTalent(s.offer.filter(id => !s.selected.includes(id)), strategy) };
  }
  if (s.phase === 'attributes') return { type: 'enter' };
  if (s.phase === 'draft') return { type: 'pick', id: bestTalent(s.offer, strategy) };
  if (s.phase === 'mutation') return { type: 'mutate', id: mutations[strategy] };
  if (s.phase === 'fusion') return { type: 'pick-fusion', id: fusions[strategy].find(id => s.fusionOffer.includes(id)) || s.fusionOffer[0] };
  if (s.phase === 'tribulation') {
    const options = E.tribulationChoices(s).options;
    const viable = options.filter(o => E.threat(s, { power: Math.round(s.tribulationBase * [1, 1.08, 1.16][s.tribulationStage] * o.enemyFactor) }).chance === 1);
    const option = viable.find(o => o.id === `trace-${strategy}`) || viable.find(o => routes[strategy].includes(o.id)) || viable.find(o => o.id === 'fusion') || viable[0];
    if (!option) throw new Error('No safe tribulation option');
    return { type: 'tribulation-step', id: option.id };
  }
  if (s.event?.id === 'first-python') return resolve('flee');
  if (s.event?.id === 'trace-echo' || s.event?.id === 'trace-resonance') return resolve('remember');
  if (s.event?.id === 'revenge' || s.event?.id === 'remains') return resolve('devour');
  if (s.event?.id === 'swordsman') return resolve('learn');
  if (s.event?.id === 'ruin') return resolve('probe');
  if (s.event?.id === 'hunt') {
    const enemy = D.ENEMIES.find(e => e.id === s.event.enemy);
    return resolve(E.threat(s, enemy).chance === 1 ? (enemy.beast && s.flags.pythonSeen ? 'devour' : 'fight') : 'flee');
  }
  if (['advanced', 'high'].includes(s.event?.id)) {
    const options = (s.event.id === 'advanced' ? E.advancedChoices(s, s.event.scene) : E.highChoices(s, s.event.scene)).filter(o => o.id !== 'leave' && !o.risk);
    return resolve((options.find(o => routes[strategy].includes(o.id)) || options.sort((a, b) => b.factor - a.factor)[0]).id);
  }
  if (s.event?.id === 'boss') {
    const enemy = D.ENEMIES.find(e => e.id === 'threeeye');
    const options = E.bossChoices(s).map(o => ({ ...o, chance: E.threat(s, { ...enemy, power: Math.round(enemy.power * o.enemyFactor) }).chance }));
    const best = options.slice().sort((a, b) => b.chance - a.chance || a.enemyFactor - b.enemyFactor);
    return resolve((options.find(o => routes[strategy].includes(o.id) && o.chance === 1) || best[0]).id);
  }
  if (E.canBreak(s)) return { type: 'breakthrough' };
  if (E.canChallengeBoss(s) && s.xp >= D.REALMS[3].threshold) return { type: 'challenge-boss' };
  if (s.realm === 1 && !s.flags.swordEvent) return { type: 'act', kind: 'explore' };
  if (s.realm === 3 && s.advancedResolved < 2) return { type: 'act', kind: 'explore' };
  if (E.canSeekProof(s)) return { type: 'seek-proof' };
  if (batch && E.canCultivateToReady(s)) return { type: 'cultivate-to-ready' };
  return { type: 'act', kind: 'cultivate' };
}
function simulate(seed, strategy = 'body', options = {}) {
  if (!PATHS.includes(strategy)) throw new Error('Unknown simulation strategy');
  let s = E.createRun(seed, options.trace || null), turns = 0;
  for (; turns < 400 && !['dead', 'complete'].includes(s.phase); turns++) {
    if (options.stop?.(s)) break;
    const action = chooseAction(s, strategy, options.batch !== false), previous = s;
    s = E.transition(s, action);
    if (options.reload) s = E.deserialize(E.serialize(s));
    options.onStep?.(s, action, previous);
  }
  if (turns === 400) throw new Error(`Simulation turn cap: seed=${seed} strategy=${strategy}`);
  return { state: s, turns };
}
module.exports = { simulate, chooseAction, PATHS };
