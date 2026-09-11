(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FSUIComponents=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const variants=new Set(['primary','secondary','quiet','danger']);
  function actionClasses(action,options={}) {
    const classes=options.classes||'';
    if(/(?:^|\s)(?:ui-nav-tab|v3-hud-tab|v3-map-node|v3-building|v3-equip-slot|number-button|brand|icon-button|v3-icon-button|pr-main-action)(?:\s|$)/.test(classes))return '';
    const variant=options.variant||(/(^|\s)primary(\s|$)|v3-context-primary|v3-forge-primary/.test(classes)?'primary':/equipment-salvage/.test(action)?'danger':/text-button|pr-affair|v3-bag-tool|v3-character/.test(classes)?'quiet':'secondary');
    if(!variants.has(variant))throw Error('Unknown UI action variant');
    return `ui-button ui-button--${variant}`;
  }
  function action(button,type,title,options={}) {
    const {note='',...rest}=options;
    return button(type,`<span class="ui-button-label">${esc(title)}</span>${note?`<small class="ui-button-note">${esc(note)}</small>`:''}`,rest);
  }
  function panel(kind,html,{surface='light',title=''}={}) {
    if(!['a','b','c','d'].includes(kind)||!['light','dark'].includes(surface))throw Error('Invalid UI panel');
    return `<section class="ui-panel ui-panel--${kind}" data-surface="${surface}">${title?`<h3>${esc(title)}</h3>`:''}${html}</section>`;
  }
  function journal(state,context,button) {
    const type=context==='creation'?'creation':context==='immortal'?'immortal':'mortal';
    const entries=type==='creation'?(state.world?.history||[]).slice(-3).reverse().map(j=>({when:`第 ${j.era} 纪`,title:j.title,text:j.choice})):
      type==='immortal'?(state.immortal?.journal||[]).slice(-3).reverse().map(j=>({when:`仙界第 ${j.day} 日`,title:'道途留痕',text:j.text})):
      (state.log||[]).slice(-3).reverse().map(j=>({when:`${j.age} 岁`,title:j.title,text:j.text}));
    const label={mortal:'此生手记',immortal:'仙界手记',creation:'天地史册'}[type];
    return `<details class="ui-recent-journal ui-panel ui-panel--b" data-surface="light" data-journal-source="${type}"><summary>${label}<span>最近 ${entries.length} 段</span></summary><ol>${entries.map(j=>`<li><small>${esc(j.when)}</small><b>${esc(j.title)}</b><p>${esc(j.text)}</p></li>`).join('')||'<li>此界尚无新记录。</li>'}</ol>${type!=='creation'?button(type==='immortal'?'immortal-journal':'journal','翻开命册',{ui:true,classes:'text-button'}):''}</details>`;
  }
  return Object.freeze({esc,actionClasses,action,panel,journal});
});
