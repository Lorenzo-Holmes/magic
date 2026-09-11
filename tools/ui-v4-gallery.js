(function(){
  'use strict';
  const C=window.FSUIComponents;
  function button(a,label,o={}){return `<button type="button" class="${C.actionClasses(a,o)}"${o.disabled?' disabled':''}${o.demo?` data-demo="${o.demo}"`:''}>${label}</button>`;}
  document.getElementById('gallery').innerHTML=['light','dark'].map(surface=>{
    const actions=[['primary','一界之元','亲自选择此界印证路线'],['secondary','本界炼化 · 1/20','需要 45 仙元 · 每重增加 20% 基础势能'],['quiet','翻开命册','不会推进道龄'],['danger','归炉此物','保留原游戏确认流程']];
    const demo=['normal','hover','focus','pressed','disabled'].map(d=>C.action(button,'demo',d==='disabled'?'凝聚一枚碎片':'缓炼仙气',{variant:'secondary',note:d==='disabled'?'需要 60 仙元 · 当前不足':'无风险 · 仙元 +20',disabled:d==='disabled',demo:d})).join('');
    return `<section class="gallery-surface" data-surface="${surface}"><h2>${surface==='light'?'雾白 · 浅表面':'青黛 · 深表面'}</h2>`+
      C.panel('a','<p>当人物场景为深色时，纸面事件仍使用明确的浅表面文字，不继承白字。</p>',{surface:'light',title:'事件 / 结算'})+
      C.panel('b',`<div class="gallery-grid">${actions.map(([variant,title,note])=>C.action(button,'demo',title,{variant,note})).join('')}</div>`,{surface,title:'功能面板 · 四级动作'})+
      C.panel('c','<span>分类签 · 丹药 / 材料 / 行装</span>',{surface})+C.panel('d','<span>小牌 · 已穿戴</span>',{surface})+
      `<h3>普通 / 悬停 / 聚焦 / 按下 / 禁用</h3><div class="gallery-grid">${demo}</div>`+
      `<section class="ui-panel ui-panel--b ui-panel-error" data-surface="${surface}"><p role="alert">当前资源不足。按钮名称、费用和原因必须可读。</p></section></section>`;
  }).join('');
})();
