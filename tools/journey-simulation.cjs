'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {simulate,PATHS}=require('./simulation-policy.cjs'),J=require('../src/journey.js');
const version=require('../package.json').version,policies={},samples=100;
for(const reckless of [false,true]){
 const name=reckless?'reckless':'prepared',row={runs:0,ascended:0,deaths:0,journeys:0,complete:0,retreat:0,failed:0,wounds:0,medicineUsed:0,workYears:0,turns:0,regions:new Set(),paths:{}};
 for(const strategy of PATHS){let ascended=0;
  for(let seed=1;seed<=samples;seed++){
   const out=simulate(200000+seed+PATHS.indexOf(strategy)*10000,strategy,{journey:true,reckless,reload:seed===1,onStep:(s,a,b)=>{
    if(a.type==='journey-start')row.regions.add(J.ROUTES.find(r=>r.id===a.id).region);
    row.wounds+=Math.max(0,s.journey.wounds-b.journey.wounds);
    if(a.type==='journey-prepare'&&a.id==='heal')row.medicineUsed++;
    if(a.type==='journey-prepare'&&a.id==='work')row.workYears++;
    if(b.journey.active&&!s.journey.active)row[s.journey.last.ending]++;
   }});
   row.runs++;row.turns+=out.turns;row.journeys+=out.state.journey.serial;
   if(out.state.phase==='complete'){row.ascended++;ascended++;assert.ok(out.state.journey.foundation.every((v,i)=>v>=J.required(i)));}
   else {assert.equal(out.state.phase,'dead');row.deaths++;}
  }
  row.paths[strategy]={runs:samples,ascended};
 }
 row.regions=[...row.regions].sort();row.completionRate=row.complete/row.journeys;row.meanWounds=row.wounds/row.journeys;row.meanTurns=row.turns/row.runs;policies[name]=row;
 console.log(name,JSON.stringify(row));
}
assert.ok(policies.prepared.ascended/policies.prepared.runs>=.9,'Prepared mode has excessive terminal failures');
assert.equal(policies.prepared.regions.length,6,'New mode fails to visit all regions');
assert.ok(policies.prepared.meanWounds<policies.reckless.meanWounds*.8,'Preparation does not reduce injury enough');
assert.ok(policies.prepared.completionRate>policies.reckless.completionRate+.1,'Risk choices do not change route outcomes enough');
const result={version,passed:true,rules:'journey-new-game',simulations:samples*6*2,policies,scope:'Legal first-life actions. Prepared policy matches tools and retreats at two wounds; reckless policy forces treasure choices. Auto-policy results are not human retention or difficulty ratings.'};
fs.writeFileSync(path.join(__dirname,'../output',`journey-simulation-v${version}.json`),JSON.stringify(result,null,2));
