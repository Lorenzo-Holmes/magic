'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const L=require('../src/life.js'), E=require('../src/engine.js'), B=require('../src/build.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function entered(seed=707,origin='herb'){
 let s=E.createRun(seed);
 for(const id of s.offer.slice(0,3)) s=E.transition(s,{type:'select',id,revision:s.revision});
 s=E.transition(s,{type:'confirm-talents',revision:s.revision});
 s=E.transition(s,{type:'preset',id:'balanced',revision:s.revision});
 s=E.transition(s,{type:'enter',revision:s.revision});
 s.origin=origin;s.realm=2;s.flags.pythonSeen=true;s.flags.pythonSlain=true;s.mutations=['redscale'];
 s.event={id:'quiet',title:'life',text:'echo'};s.life=L.observe(s.life,s.origin,s.realm,true);E.validate(s);return s;
}
test('four origin chains have 2 echoes and 1 major event',()=>{
 assert.deepEqual(Object.keys(L.CHAINS).sort(),['herb','orphan','scribe','servant']);
 for(const [id,c] of Object.entries(L.CHAINS)){assert.equal(c.events.length,3,id);assert.equal(c.events.filter(e=>e.major).length,1,id);assert.deepEqual(c.events.map(e=>e.minRealm),[2,4,6]);for(const e of c.events)assert.equal(e.choices.length,3);}
});
test('refusal settles once without reward',()=>{
 let s=L.observe(L.createState(),'herb',2,true);const raw=JSON.stringify(s),r=L.resolve(s,'herb','herb-refuse',2);
 assert.equal(JSON.stringify(s),raw);assert.equal(r.reward.xpFactor,0);assert.ok(r.state.completed.includes('herb-home'));assert.equal(r.state.marks.length,0);assert.throws(()=>L.resolve(r.state,'herb','herb-heal',2));assert.equal(L.observe(r.state,'herb',2,true).pending,null);
});
test('late entry catches up in realm order',()=>{
 let s=L.observe(L.createState(),'scribe',6,true);assert.equal(s.pending,'scribe-school');
 s=L.resolve(s,'scribe','scribe-correct',6).state;assert.equal(s.pending,'scribe-edict');
 s=L.resolve(s,'scribe','scribe-expose',6).state;assert.equal(s.pending,'scribe-major');
 s=L.resolve(s,'scribe','scribe-save-books',6).state;assert.equal(s.pending,null);assert.equal(s.completed.length,3);assert.equal(s.majorOutcomes.length,1);
});
test('life marks are bounded explainable Build sources',()=>{
 let s=L.observe(L.createState(),'orphan',2,true);s=L.resolve(s,'orphan','orphan-teach',2).state;
 assert.ok((L.effects(s).guard||0)>0);const src=L.buildSources(s);assert.equal(src[0].source,'life:orphan-teach');assert.deepEqual(src[0].tags,['survival']);
 let run=entered(708,'orphan');run.life=s;E.validate(run);assert.ok(B.evaluateBuild(run).sources.some(x=>x.source==='life:orphan-teach'));
 const refused=L.resolve(L.observe(L.createState(),'orphan',2,true),'orphan','orphan-pass',2).state;assert.equal(L.buildSources(refused).length,0);
});
test('engine resolves, rewards and reloads life choices',()=>{
 let s=entered(709,'herb'),before=JSON.stringify(s),xp=s.xp;
 let n=E.transition(s,{type:'life-resolve',id:'herb-heal',revision:s.revision});assert.equal(JSON.stringify(s),before);assert.ok(n.xp>xp);assert.notEqual(String(n.revision),String(s.revision));
 assert.ok(n.life.completed.includes('herb-home'));assert.deepEqual(E.deserialize(E.serialize(n)),n);
});
test('v9 migration adds empty life state only',()=>{
 const old=clone(E.createRun(710));old.version=9;delete old.life;const n=E.deserialize(JSON.stringify(old));assert.equal(n.version,10);assert.deepEqual(n.life,L.createState());
});
