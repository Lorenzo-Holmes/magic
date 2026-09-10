(function(root){
  'use strict';
  const V=root.FSUIV3;
  const NAV=[['practice','洞府','府'],['atlas','山海','山'],['inventory','行囊','囊'],['character','人物','人']];
  function render(ctx,current='practice'){
    return `<nav class="v3-hud" aria-label="主要功能">${NAV.map(([id,label,glyph])=>ctx.button('nav-panel',`<i aria-hidden="true">${glyph}</i><span>${label}</span>`,{ui:true,id,classes:`v3-hud-tab${current===id?' is-current':''}`,aria:id==='practice'?'返回洞府':`打开${label}`,pressed:current===id})).join('')}</nav>`;
  }
  V.setHud(render);
})(typeof globalThis!=='undefined'?globalThis:this);
