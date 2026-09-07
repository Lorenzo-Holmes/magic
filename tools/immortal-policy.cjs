'use strict';
const E = require('../src/engine.js');
const I = require('../src/immortal.js');
function next(i, strategy = 'soul') {
  if (i.phase === 'arrival') return { type: 'approach', id: 'hide' };
  if (i.phase === 'shelter') return { type: 'adapt' };
  if (i.phase === 'law') return { type: 'law', id: i.lawOffer.includes(strategy) ? strategy : i.lawOffer[0] };
  if (i.phase === 'encounter') return { type: 'devour' };
  if (i.phase === 'field') {
    if (i.health < 100) return { type: 'rest' };
    const safe = I.availableCreatures(i).filter(c => I.threat(i, I.enemy(i, c.id)).chance === 1);
    if (safe.some(c => c.boss)) return { type: 'hunt', id: safe.find(c => c.boss).id };
    if (i.level < 8 && i.essence >= I.trainingCost(i)) return { type: 'train' };
    if (safe.length) return { type: 'hunt', id: safe.sort((a,b)=>b.reward-a.reward)[0].id };
    return { type: 'cultivate' };
  }
  throw new Error(`No policy for ${i.phase}`);
}
function prologue(mortal, strategy = 'soul', options = {}) {
  let s = mortal.immortal ? E.deserialize(E.serialize(mortal)) : E.transition(mortal, { type: 'immortal-enter' }), turns = 0;
  while (!['prologue-complete','dead'].includes(s.immortal.phase) && turns++ < 300) {
    if (options.stop?.(s)) break;
    const action = next(s.immortal, strategy);
    s = E.transition(s, { ...action, type: `immortal-${action.type}` });
    if (options.reload) s = E.deserialize(E.serialize(s));
    options.onStep?.(s, action);
  }
  if (turns >= 300) throw new Error('Immortal prologue exceeded safe policy limit');
  return { state: s, turns };
}
module.exports = { next, prologue };
