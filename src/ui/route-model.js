(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FSUIRoute=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const panels=['atlas','inventory','character','forge'];
  function resolve({state,home=true,pageTab='practice',worldVisible=true,mortalSummary=false}={}) {
    if(!['practice',...panels].includes(pageTab))throw Error('Unknown page tab');
    const workspace=!!(!home&&state&&!['talents','attributes'].includes(state.phase));
    const inJourney=!!(workspace&&state.journey?.active);
    const inWorld=!!(workspace&&!inJourney&&pageTab==='practice'&&state.world&&worldVisible&&!mortalSummary);
    const inImmortal=!!(workspace&&state.immortal&&!mortalSummary);
    const panel=!!(workspace&&!inJourney&&!inWorld&&panels.includes(pageTab));
    const v3Primary=!!(workspace&&!inWorld&&!inJourney&&(panel||(pageTab==='practice'&&state.phase==='playing'&&!inImmortal)));
    const context=inWorld?'creation':inImmortal?'immortal':'mortal';
    const view=home?'home':inJourney?`journey-${state.journey.active.nonce}-${state.journey.active.step}`:panel?`panel-${pageTab}`:inWorld?`creation-${state.world.phase}-${state.world.era}-${state.world.cursor}`:inImmortal?`immortal-${state.immortal.phase}`:state?.phase||'home';
    return Object.freeze({workspace,inJourney,inWorld,inImmortal,panel,v3Primary,context,view,navCurrent:inJourney?'atlas':pageTab==='forge'?'practice':pageTab,surface:v3Primary&&['practice','forge'].includes(pageTab)?'dark':'light',scroll:v3Primary?'stage':'document'});
  }
  return Object.freeze({resolve});
});
