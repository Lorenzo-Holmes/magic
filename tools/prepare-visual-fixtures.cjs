'use strict';
const fs = require('node:fs');
const path = require('node:path');
const E = require('../src/engine.js');
const D = require('../src/data.js');
const { out: base } = require('./qa-paths.cjs');
const final = E.deserialize(fs.readFileSync(path.join(base, 'states/ascension--ascension.json'), 'utf8'));
const browser = JSON.parse(fs.readFileSync(path.join(base, 'browser-smoke-report.json'), 'utf8'));
const generated = [];
// These are labeled visual-only fixtures, not evidence of 15 separate full playthroughs.
// The full UI route and its unmodified intermediate saves are tested separately.
for (const event of D.HIGH_EVENTS) {
  const s = JSON.parse(JSON.stringify(final));
  s.phase = 'playing'; s.realm = event.realm; s.xp = Math.round(D.REALMS[s.realm].threshold / 3);
  s.age = browser.checkpoints.find(p => p.checkpoint === `playing:high:${s.realm}`)?.age || 150;
  s.flags.ascended = false; s.ending = null; s.ascendedPower = null; s.tribulationStage = 0; s.tribulationBase = null;
  s.event = { id: 'high', scene: event.id }; s.draft = null; s.offer = [];
  s.realmProofs = s.realmProofs.filter(r => r < s.realm);
  s.highSeen = s.highSeen.filter(id => D.HIGH_EVENTS.find(e => e.id === id).realm < s.realm);
  s.log = s.log.filter(entry => entry.realm <= s.realm && entry.age <= s.age);
  E.validate(s);
  const name = `high-${event.id}.json`;
  fs.writeFileSync(path.join(base, 'states', name), E.serialize(s));
  generated.push({ file: name, realm: s.realm, scene: event.id, type: 'visual-only derived fixture' });
}
for (const [index, trace] of D.TRACES.entries()) {
  let echo = E.createRun(9000 + index, trace.id);
  for (const id of echo.offer.slice(0, 3)) echo = E.transition(echo, { type: 'select', id });
  echo = E.transition(echo, { type: 'confirm-talents' });
  echo = E.transition(echo, { type: 'enter' });
  echo = E.transition(echo, { type: 'act', kind: 'cultivate' });
  echo = E.transition(echo, { type: 'act', kind: 'cultivate' });
  echo = E.transition(echo, { type: 'resolve', choice: 'flee' });
  E.validate(echo);
  const echoName = `trace-${trace.id}-echo.json`;
  fs.writeFileSync(path.join(base, 'states', echoName), E.serialize(echo));
  generated.push({ file: echoName, realm: 0, scene: trace.id, type: 'trace echo visual-only derived fixture' });

  const resonance = JSON.parse(JSON.stringify(final));
  resonance.phase = 'playing'; resonance.realm = 4; resonance.xp = 0;
  resonance.carriedTrace = trace.id; resonance.flags.ascended = false;
  resonance.flags.traceEchoSeen = true; resonance.flags.traceResonanceSeen = false;
  resonance.ending = null; resonance.ascendedPower = null; resonance.tribulationStage = 0; resonance.tribulationBase = null;
  resonance.tribulationRoutes = []; resonance.event = { id: 'trace-resonance', trace: trace.id };
  resonance.draft = null; resonance.offer = []; resonance.realmProofs = resonance.realmProofs.filter(r => r < 4);
  resonance.highSeen = resonance.highSeen.filter(id => D.HIGH_EVENTS.find(event => event.id === id).realm < 4);
  resonance.age = browser.checkpoints.find(p => p.checkpoint === 'draft:realm:4')?.age || 150;
  resonance.log = resonance.log.filter(entry => entry.realm <= 4 && entry.age <= resonance.age);
  E.validate(resonance);
  const resonanceName = `trace-${trace.id}-resonance.json`;
  fs.writeFileSync(path.join(base, 'states', resonanceName), E.serialize(resonance));
  generated.push({ file: resonanceName, realm: 4, scene: trace.id, type: 'trace resonance visual-only derived fixture' });
}
fs.writeFileSync(path.join(base, 'visual-fixtures.json'), JSON.stringify(generated, null, 2));
console.log(JSON.stringify({ generated: generated.length, highEvents: D.HIGH_EVENTS.length, traceEvents: D.TRACES.length * 2, validated: true, scope: 'visual fixtures only' }));
