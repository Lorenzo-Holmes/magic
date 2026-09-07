'use strict';
const E = require('../src/engine.js'), V = require('../src/evolution.js');
const { prologue } = require('./immortal-policy.cjs');
function next(i) {
  if (!i.evolution) return { type:'enter' };
  const e=i.evolution;
  if(i.phase==='world-event') return {type:'event',id:V.eventChoices(i).some(c=>c.id==='law')?'law':'quiet'};
  if(i.phase==='world-encounter') return {type:'devour',id:e.target==='gate'?'resonate':'direct'};
  if(i.phase==='evolve') {
    const ranked=e.offer.map(id=>{
      const t=V.TRAITS.find(t=>t.id===id),old=e.slots[t.slot],previous=old?V.TRAITS.find(x=>x.id===old.id):null;
      const level=old?.id===id?Math.min(5,old.level+1):1;
      const score=t.power*level-(previous?.power||0)*(old?.level||0);
      return {id,score};
    }).sort((a,b)=>b.score-a.score);
    return ranked[0].score>0?{type:'choose',id:ranked[0].id}:{type:'dissolve'};
  }
  if(i.phase==='world-cleared') return {type:'advance'};
  if(i.phase==='ending') return {type:'endless'};
  if(i.phase==='world') {
    if(i.health<100)return {type:'rest'};
    const recipe=V.recipes(i).find(r=>i.fragments>=r.cost);
    if(recipe)return {type:'fuse',id:recipe.id};
    if(!e.proof)return {type:'explore'};
    if(e.hunts>=2&&V.threat(i,V.enemy(i,'gate','resonate')).chance===1)return {type:'hunt',id:'gate'};
    if(e.hunts>=2&&i.essence>=V.trainingCost(i)&&e.refinement<20)return {type:'refine'};
    const prey=V.CREATURES.filter(c=>c.world===e.world&&V.threat(i,V.enemy(i,c.id)).chance===1).sort((a,b)=>b.reward-a.reward);
    if(prey.length)return {type:'hunt',id:prey[0].id};
    if(i.essence>=V.trainingCost(i)&&e.refinement<20)return {type:'refine'};
    return {type:'cultivate'};
  }
  throw new Error(`No legal conservative evolution policy for ${i.phase}`);
}
function campaign(mortal,strategy='soul',options={}) {
  let s=mortal.immortal?.wormSlain?E.deserialize(E.serialize(mortal)):prologue(mortal,strategy).state,turns=0;
  while(turns++<1000) {
    if(options.stop?.(s))break;
    if(s.immortal.phase==='dead')break;
    if(s.immortal.phase==='ending'&&!options.endlessWorlds)break;
    if(options.endlessWorlds&&s.immortal.evolution?.endless&&s.immortal.phase==='world'&&BigInt(s.immortal.evolution.layer)>=5n+BigInt(options.endlessWorlds))break;
    const a=next(s.immortal);
    s=E.transition(s,{...a,type:`immortal-evolution-${a.type}`});
    if(options.reload)s=E.deserialize(E.serialize(s));
    options.onStep?.(s,a);
  }
  if(turns>=1000)throw new Error('Evolution policy exceeded turn limit');
  return {state:s,turns};
}
module.exports={next,campaign};
