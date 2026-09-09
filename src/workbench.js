(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSWorkbench=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const NAV=Object.freeze({
    left:[['practice','🧘','修炼'],['journal','📜','命册'],['build','🔮','道途'],['life','👤','人生'],['codex','📖','图谱'],['legacy','⏳','回响']],
    right:[['equipment','⚔️','行囊'],['sect','🏯','宗门'],['spirit-beast','🦊','灵兽'],['crafting','⚗️','丹器'],['secret-realm','🗺️','秘境'],['karma','🕸️','因果']]
  });
  function navigation(side,state,button){
    return `<nav class="workbench-nav nav-${side}" aria-label="${side==='left'?'修行与命途':'养成与历练'}">${NAV[side].map(([id,glyph,label])=>button('nav-panel',`<span class="nav-glyph" aria-hidden="true">${glyph}</span><span>${label}</span>`,{ui:true,id,classes:`workbench-tab${id==='practice'?' is-current':''}`,aria:id==='practice'?'返回当前修行':`打开${label}`,disabled:id==='secret-realm'&&(state.phase!=='playing'||!!state.immortal)})).join('')}</nav>`;
  }
  function resources(rows,identity){
    return `<section class="resource-overview" aria-label="此世资源速览"><div class="resource-identity"><span>${esc(identity.title)}</span><small>${esc(identity.detail)}</small></div><div class="resource-counters">${rows.map(r=>`<div class="resource-counter"><span><i aria-hidden="true">${esc(r.glyph)}</i>${esc(r.label)}</span><b>${esc(r.value)}</b><small>${esc(r.note)}</small></div>`).join('')}</div></section>`;
  }
  function meditation(){
    return `<div class="meditation-stage" role="img" aria-label="盘膝打坐的修士剪影"><div class="meditation-aura" aria-hidden="true"><i></i><span>乾</span><span>坤</span><span>坎</span><span>离</span></div><svg class="meditation-silhouette" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><g fill="#030408" stroke="none"><path d="M185 74c-13-13-5-32 12-34 23-3 35 18 21 34l-4 9h-23Z"/><path d="M162 113c0-28 15-46 38-46s40 18 40 47l-8 34-12 18h-39l-14-20Z"/><path d="M181 146v32l-29 10c-26 8-36 37-48 65l-19 21 18 16 30-29 26-40-14 80 55 25 55-25-14-80 27 41 29 28 18-16-19-21c-11-29-22-57-48-65l-29-10v-32Z"/><path d="M124 278c-22-15-47-8-64 10l-39 42c-12 12-10 29 9 36 34 12 80 9 122 3l47-11 49 11c42 6 88 9 122-3 19-7 21-24 9-36l-39-42c-17-18-42-25-64-10l-76 29Z"/><path d="m92 268-13 6-6-3-9-11-5 3 8 15 18 10 22-8-6-9-8 2Zm216 0 13 6 6-3 9-11 5 3-8 15-18 10-22-8 6-9 8 2Z"/></g></svg><span class="meditation-caption">静心 · 凝神 · 问道</span></div>`;
  }
  return Object.freeze({NAV,navigation,resources,meditation});
});
