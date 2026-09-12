'use strict';
// Release stress: 1,000 deterministic seeds × six inherited paths.
// Every sample is a legal second-life mortal run followed by the earned
// immortal prologue. It does not mutate fixtures or skip state transitions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const D = require('../src/data.js');
const M = require('../src/meta.js');
const I = require('../src/immortal.js');
const { simulate, PATHS } = require('./simulation-policy.cjs');
const { prologue } = require('./immortal-policy.cjs');
const root = path.resolve(__dirname, '..');
const version = require('../package.json').version;
function mean(values) { return values.reduce((a,b)=>a+b,0) / values.length; }
function run() {
  // Major releases may change presentation/story structure without changing the
  // classic compatibility simulation contract. Keep this future-safe while
  // still requiring a plain stable semver release (no prerelease/build suffix).
  assert.match(version, /^[1-9]\d*\.\d+\.\d+$/, 'Unsupported release version');
  assert.equal(require('../src/scenes.js').VERSION, version, 'Release/scenes version mismatch');
  const perPath = {}, allMortalTurns = [], allImmortalTurns = [];
  for (const strategy of PATHS) {
    const mortalTurns = [], immortalTurns = [], powers = [], ages = [];
    let classified = 0;
    const memoryId = D.TRACES.find(t=>t.id===strategy).talentId;
    for (let seed=1; seed<=1000; seed++) {
      const runSeed = (seed + (PATHS.indexOf(strategy)+1) * 100000) >>> 0;
      const mortalRun = simulate(runSeed, strategy, { trace: strategy }), mortal = mortalRun.state;
      assert.equal(mortal.phase, 'complete', `${strategy}/${seed}: mortal did not ascend`);
      assert.equal(mortal.flags.ascended, true, `${strategy}/${seed}: ascension flag missing`);
      assert.ok(mortal.talents.includes(memoryId), `${strategy}/${seed}: inherited memory talent was not selected`);
      assert.equal(mortal.carriedTrace, strategy, `${strategy}/${seed}: inherited mark changed`);
      if (M.classifyPath(mortal).id === strategy) classified++;
      const immortal = prologue(mortal, strategy);
      assert.equal(immortal.state.immortal.phase, 'prologue-complete', `${strategy}/${seed}: immortal prologue incomplete`);
      assert.equal(immortal.state.immortal.wormSlain, true, `${strategy}/${seed}: spirit worm revenge incomplete`);
      assert.equal(immortal.state.ascendedPower, mortal.ascendedPower, `${strategy}/${seed}: immortal play changed mortal power`);
      assert.equal(immortal.state.immortal.wormPower, I.create(mortal).wormPower, `${strategy}/${seed}: worm scaled with player`);
      mortalTurns.push(mortalRun.turns);
      immortalTurns.push(immortal.turns); powers.push(mortal.ascendedPower); ages.push(mortal.age);
    }
    const row = { samples:1000, classifiedAsIntended:classified, classifiedRate:classified/1000, mortalTurns:{min:Math.min(...mortalTurns),max:Math.max(...mortalTurns),mean:mean(mortalTurns)},
      immortalTurns:{min:Math.min(...immortalTurns),max:Math.max(...immortalTurns),mean:mean(immortalTurns)},
      ascendedPower:{min:Math.min(...powers),max:Math.max(...powers),mean:mean(powers)}, age:{min:Math.min(...ages),max:Math.max(...ages),mean:mean(ages)} };
    // The strategy is a decision policy, not a locked class. Classification is
    // reported for balance review rather than forced to match every seed.
    perPath[strategy] = row; allMortalTurns.push(...mortalTurns); allImmortalTurns.push(...immortalTurns);
  }
  const means = Object.values(perPath).map(x=>x.ascendedPower.mean);
  const balanceRatio = Math.max(...means) / Math.min(...means);
  // Paths should feel different, but a release regression must not make one
  // deterministic policy several orders of magnitude stronger than another.
  assert.ok(balanceRatio < 4, `Path mean-power spread is too large: ${balanceRatio}`);
  const result = { version, rules:'classic-compatibility', passed:true, simulations:6000, seedsPerPath:1000, paths:PATHS, perPath,
    balanceRatio, mortalTurns:{min:Math.min(...allMortalTurns),max:Math.max(...allMortalTurns),mean:mean(allMortalTurns)},
    immortalTurns:{min:Math.min(...allImmortalTurns),max:Math.max(...allImmortalTurns),mean:mean(allImmortalTurns)},
    guarantees:{allAscended:true,allImmortalProloguesComplete:true,allWormRevengeComplete:true,memoryTalentSelected:true} };
  const out = path.join(root, 'output', `final-simulation-v${version}.json`);
  fs.mkdirSync(path.dirname(out), {recursive:true}); fs.writeFileSync(out, JSON.stringify(result,null,2));
  console.log(JSON.stringify(result)); return result;
}
if (require.main === module) run();
module.exports = { run };
