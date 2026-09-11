(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FSUIShell=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render({route,main,nav,warning=''}) {
    if(!route.workspace)throw Error('Shared gameplay shell requires a run');
    return `<div class="shell game-shell ui-shell" data-ui-shell="v4"${route.v3Primary?' data-ui-generation="v3"':''} data-screen="${esc(route.view)}" data-context="${route.context}" data-surface="${route.surface}" data-scroll="${route.scroll}"><div class="content-shell">${main}${nav}${warning?`<div class="storage-warning ui-storage-warning" role="alert" data-surface="light">${esc(warning)}</div>`:''}</div></div>`;
  }
  function prepare(node) {
    // A light inset never inherits light text from a dark scene.
    for(const el of node.querySelectorAll('.v3-recipe-panel,.v3-overlay-sheet,.pr-encounter'))el.dataset.surface='light';
    for(const el of node.querySelectorAll('.v3-material-rack,.v3-forge-window>.v3-page-head'))el.dataset.surface='dark';
  }
  return Object.freeze({render,prepare});
});
