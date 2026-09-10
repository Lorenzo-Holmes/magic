(function(root){
  'use strict';
  const V=root.FSUIV3;
  V.register('CaveWindow',{
    render(ctx){
      const {state,D,E,J,button,esc,fmt,powerFigure,quest,waiting,eventHtml='',contextHtml='',memoryHtml=''}=ctx;
      const realm=D.REALMS[state.realm], cultivate=E.actionPreview(state,'cultivate'), explore=E.actionPreview(state,'explore');
      const xp=realm.threshold?Math.min(100,state.xp/realm.threshold*100):100;
      const breakReady=E.canBreak(state);
      const stage=breakReady?'破境在即':waiting?'山中有事':state.vitality<40?'元气有损':'清修无事';
      const hotspot=(action,label,glyph,note,classes,opts={})=>button(action,`<span class="v3-building-icon"><i>${glyph}</i></span><b>${label}</b><small>${note}</small>`,{...opts,classes:`v3-building ${classes}`});
      return `<section class="v3-window v3-cave-window${waiting?' is-blocked':''}${breakReady?' is-break-ready':''}">
        <div class="v3-artspace" aria-label="洞府修炼场景">
          <img class="v3-layer v3-cave-bg" src="./assets/art/retreat-v2.1.webp" alt="水墨洞府山景" width="1536" height="1024">
          <div class="v3-layer v3-cave-mist" aria-hidden="true"></div>
          <div class="v3-layer v3-cave-ridge v3-cave-ridge-back" aria-hidden="true"></div>
          <div class="v3-layer v3-cave-ridge v3-cave-ridge-front" aria-hidden="true"></div>
          <header class="v3-top-hud">
            <div class="v3-profile"><span class="v3-realm-medallion">${esc(realm.name.slice(0,2))}</span><div><small>当前境界</small><strong>${esc(realm.name)}</strong><em>${stage}</em></div></div>
            <div class="v3-power"><small>战力</small>${powerFigure(E.power(state))}</div>
            <div class="v3-resources"><span>盘缠 <b>${fmt(state.journey?.silver||0)}</b></span><span>行粮 <b>${fmt(state.journey?.supplies||0)}</b></span></div>
            <div class="v3-top-actions">${button('audio-settings','音',{ui:true,classes:'v3-round-action',aria:'音景设置'})}${button('settings','册',{ui:true,classes:'v3-round-action',aria:'存档与设置'})}</div>
          </header>
          <div class="v3-cultivation-progress"><div><span>修为</span><b>${fmt(state.xp)} / ${fmt(realm.threshold)}</b><small>${state.age} 岁 · 元气 ${state.vitality}${state.journey.enabled&&state.realm<9?` · 根基 ${state.journey.foundation[state.realm]}/${J.required(state.realm)}`:''}</small></div><i><u style="width:${xp}%"></u></i></div>
          ${contextHtml?`<div class="v3-context-command">${contextHtml}</div>`:''}
          ${memoryHtml}
          <div class="v3-place-title"><span>洞府</span><b>${state.realm>=6?'云外小界':state.realm>=3?'听松别院':'听松草庐'}</b></div>
          ${waiting||breakReady?'':`<div class="v3-cave-buildings" aria-label="洞府功能">
            ${hotspot('act','静室','息',`${cultivate.xp?`+${cultivate.xp} 修为`:'静心吐纳'}`,'at-ashram',{kind:'cultivate'})}
            ${hotspot('atlas','山门','游','六地行旅','at-map',{ui:true})}
            ${hotspot('forge','炼器阁','炉','丹器百艺','at-forge',{ui:true})}
            ${hotspot('spirit-beast','灵兽居','兽','结契同行','at-beast',{ui:true})}
            ${hotspot('act','问机台','缘',state.realm>=4?'天地印证':`${explore.years} 年`,'at-fate',{kind:'explore'})}
          </div>`}
          <div class="v3-quest-strip"><span>此刻</span><p>${esc(quest)}</p></div>
          <div class="v3-foreground" aria-hidden="true"></div>
        </div>
        ${eventHtml?`<div class="v3-overlay-sheet v3-event-sheet">${eventHtml}</div>`:''}
      </section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
