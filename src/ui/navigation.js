(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FSUINavigation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const items=Object.freeze([['practice','修行','cave'],['atlas','山海','world'],['inventory','行囊','bag'],['character','人物','character']].map(([id,label,icon])=>Object.freeze({id,label,icon})));
  function render({button,art},current='practice') {
    if(!items.some(i=>i.id===current))throw Error('Unknown navigation destination');
    return `<nav class="ui-navigation v3-hud" data-ui-nav="unified" data-surface="dark" aria-label="主要功能">${items.map(i=>button('nav-panel',`${art.img('icon.'+i.icon,'ui-nav-icon')}<span>${i.label}</span>`,{ui:true,id:i.id,classes:`ui-nav-tab v3-hud-tab${current===i.id?' is-current':''}`,pressed:current===i.id,aria:i.label})).join('')}</nav>`;
  }
  return Object.freeze({items,render});
});
