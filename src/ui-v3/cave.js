(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  V.register('CaveWindow',{
    render(ctx){
      const {state,D,E,J,button,esc,fmt,powerFigure,quest,waiting,eventHtml='',contextHtml='',memoryHtml='',tutorialHtml=''}=ctx;
      const realm=D.REALMS[state.realm],cultivate=E.actionPreview(state,'cultivate'),explore=E.actionPreview(state,'explore');
      const xp=realm.threshold?Math.min(100,state.xp/realm.threshold*100):100,breakReady=E.canBreak(state);
      const blocked=waiting||!!state.secretRealm?.active;
      const stage=breakReady?'破境在即':waiting?'山中有事':state.vitality<40?'元气有损':'清修无事';
      const prop=(action,label,id,x,y,width,note,opts={})=>`<div class="v3-prop-anchor" style="left:${x}px;top:${y}px;width:${width}px">${button(action,`${A.img(id,'v3-prop-image')}<b>${label}</b><small>${note}</small>`,{...opts,classes:'v3-building',aria:`${label}，${note}`})}</div>`;
      return `<section class="v3-window v3-cave-window${blocked?' is-blocked':''}">
        <div class="v3-cave-viewport"><div class="v3-art-canvas">
          ${A.img('scene.cave','v3-cave-bg v3-canvas-background','洞府云山与修炼石台')}
          ${blocked?'':prop('atlas','山门','prop.gate',180,640,195,'六地行旅',{ui:true})+prop('forge','丹器阁','prop.forge',524,540,195,'丹器百艺',{ui:true})+prop('act','问机台','prop.astrolabe',180,928,205,`${explore.years} 年`,{kind:'explore'})+prop('spirit-beast','灵兽居','prop.beast',524,906,205,'结契同行',{ui:true})+prop('act','静室','prop.platform',356,1110,246,`+${cultivate.xp||0} 修为`,{kind:'cultivate'})}
          ${A.img('fx.cloud','v3-cave-cloud','')}
        </div></div>
        <header class="v3-top-hud"><div class="v3-profile">${A.img('icon.character','v3-profile-portrait')}<div><small>${stage}</small><strong>${esc(realm.name)}</strong><span>${state.age} 岁 · 元气 ${state.vitality}</span></div></div><div class="v3-power"><small>战力</small>${powerFigure(E.power(state))}</div>${A.utility(button)}</header>
        <div class="v3-cultivation-progress"><div><span>修为 ${fmt(state.xp)} / ${fmt(realm.threshold)}</span><span>盘缠 ${fmt(state.journey?.silver||0)} · 行粮 ${fmt(state.journey?.supplies||0)}</span></div><i role="progressbar" aria-label="修为" aria-valuenow="${Math.round(xp)}" aria-valuemin="0" aria-valuemax="100"><u style="width:${xp}%"></u></i></div>
        ${contextHtml?`<div class="v3-context-command">${contextHtml}</div>`:''}
        <div class="v3-place-title"><span>洞府</span><b>${state.realm>=6?'云外小界':state.realm>=3?'听松别院':'听松草庐'}</b></div>
        ${memoryHtml?`<div class="v3-memory-box">${memoryHtml}</div>`:''}
        ${tutorialHtml?`<details class="v3-tutorial"><summary>修行批注</summary>${tutorialHtml}</details>`:''}
        <div class="v3-quest-strip"><span>此刻</span><p>${esc(quest)}</p></div>
        ${eventHtml?`<div class="v3-overlay-sheet v3-event-sheet">${eventHtml}</div>`:''}
      </section>`;
    },
    bind(node){return A.bindCamera(node,{id:'cave',viewport:'.v3-cave-viewport',containOnShort:true});}
  });
})(typeof globalThis!=='undefined'?globalThis:this);
