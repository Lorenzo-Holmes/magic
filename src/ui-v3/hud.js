(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  V.setHud(({button},current)=>`<nav class="v3-hud" aria-label="主要功能">${[['practice','修行','cave'],['atlas','山海','world'],['inventory','行囊','bag'],['character','人物','character']].map(([id,label,icon])=>button('nav-panel',`${A.img(`icon.${icon}`)}<span>${label}</span>`,{ui:true,id,classes:`v3-hud-tab${current===id?' is-current':''}`,pressed:current===id,aria:label})).join('')}</nav>`);
})(typeof globalThis!=='undefined'?globalThis:this);
