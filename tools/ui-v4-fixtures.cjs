'use strict';
// Deterministic, earned states for visual QA. No user browser or save file is read.
const E = require('../src/engine.js');
const W = require('../src/world.js');
const { simulate } = require('./simulation-policy.cjs');
const { campaign } = require('./evolution-policy.cjs');
function create() {
  const states = {};
  const remember = (key, state) => { if (!states[key]) states[key] = E.deserialize(E.serialize(state)); };
  const mortal = simulate(220001, 'insight', { onStep(s) {
    if (s.phase === 'talents') remember('talents', s);
    if (s.phase === 'attributes') remember('attributes', s);
    if (s.phase === 'playing' && !E.isBlocking(s) && s.flags.pythonSeen) remember('practice', s);
    if (s.event?.id === 'first-python') remember('encounter', s);
    if (s.phase === 'draft') remember('breakthrough', s);
  }}).state;
  remember('mortal-ending', mortal);
  const immortal = campaign(mortal, 'insight', { onStep(s) {
    if (s.immortal.phase === 'world') {
      remember('immortal-world', s);
      if (Object.values(s.immortal.evolution.slots).filter(Boolean).length === 5 && s.immortal.evolution.refinement >= 1) remember('immortal-five-slots', s);
    }
  }}).state;
  remember('immortal-ending', immortal);
  const formed = E.transition(immortal, { type:'dao-form' });
  remember('creation', E.transition(formed, { type:'world-create', config:W.defaults() }));
  simulate(230001, 'body', { journey:true, onStep(s) { if (s.journey.active) remember('journey', s); } });
  for (const s of Object.values(states)) E.validate(s);
  if (!states['immortal-five-slots']) throw new Error('No earned five-slot state');
  return states;
}
module.exports = { create };
