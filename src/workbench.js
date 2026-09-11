(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSWorkbench=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const NAV=Object.freeze({left:[['practice','修','修行'],['atlas','游','山海'],['inventory','器','行囊'],['character','人','人物']],right:[]});
  function navigation(side,state,button,current='practice'){
    if(side==='right')return globalThis.FSUIComponents.journal(state,state.immortal?'immortal':'mortal',button);
    // Compatibility shim; no second navigation renderer or letter-glyph skin.
    return globalThis.FSUINavigation.render({button,art:globalThis.FSArt},current);
  }
  function resources(rows,identity){
    return '<section class="resource-overview" aria-label="此世资源速览"><div class="resource-identity"><span>'+esc(identity.title)+'</span><small>'+esc(identity.detail)+'</small></div><div class="resource-counters">'+rows.map(r=>'<div class="resource-counter"><span>'+esc(r.label)+'</span><b>'+esc(r.value)+'</b><small>'+esc(r.note)+'</small></div>').join('')+'</div></section>';
  }
  function meditation(){
    return '<div class="meditation-stage" role="img" aria-label="盘膝打坐的修士剪影"><img class="retreat-painting" src="./assets/art/retreat-v2.1.webp" width="1536" height="1024" alt=""><span class="meditation-caption">草庐 · 听松</span></div>';
  }
  return Object.freeze({NAV,navigation,resources,meditation});
});
