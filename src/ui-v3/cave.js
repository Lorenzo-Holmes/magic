(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt,P=root.FSUIAppearance;
  // This is a cultivation room, not the estate map. All numbers and actions
  // remain owned by the existing engine; the inner-scene effect is decorative.
  V.register('CaveWindow',{
    render(ctx){
      const {state,D,E,J,button,esc,fmt,powerFigure,quest,waiting,eventHtml='',memoryHtml='',tutorialHtml=''}=ctx;
      const realm=D.REALMS[state.realm],next=D.REALMS[state.realm+1];
      const cultivate=E.actionPreview(state,'cultivate'),explore=E.actionPreview(state,'explore');
      const occupied=!!(state.secretRealm?.active||state.journey?.active);
      const blocked=waiting||occupied,ready=!blocked&&E.canBreak(state);
      const xp=realm.threshold?Math.max(0,Math.min(100,state.xp/realm.threshold*100)):100;
      const hasFoundation=state.journey.enabled&&state.realm<9;
      const foundation=hasFoundation?`${state.journey.foundation[state.realm]} / ${J.required(state.realm)}`:'旧法';
      const spirit=state.realm<2?'breath':state.realm<3?'sea':state.realm<4?'core':'spirit';
      const spiritName={breath:'引气归元',sea:'气海澄明',core:'金丹内照',spirit:'守神归一'}[spirit];
      const label=ready?'破境在即':blocked?'眼前有事':state.vitality<40?'元气有损':'静心修炼';
      const special=[];
      if(state.secretRealm?.active)special.push(button('secret-realm','返回秘境',{ui:true,classes:'pr-condition-action'}));
      if(!blocked&&E.canChallengeBoss(state))special.push(button('challenge-boss','寻三眼妖王',{classes:'pr-condition-action'}));
      if(!blocked&&state.realm>=4&&state.realm<=8&&!state.realmProofs.includes(state.realm))special.push(button('seek-proof','寻天地印证',{classes:'pr-condition-action',disabled:!E.canSeekProof(state)}));
      if(!blocked&&hasFoundation&&!J.ready(state.journey,state.realm)&&xp>=100)special.push(button('atlas','修为已满 · 去山海稳固根基',{ui:true,classes:'pr-condition-action'}));
      const primary=ready
        ?button('breakthrough',`<b>破境</b><small>${esc(next?.name||'下一境')}</small>`,{classes:'pr-main-action is-ready',aria:`破境至${next?.name||'下一境'}`})
        :button('act',`<b>闭关</b><small>+${fmt(cultivate.xp||0)} 修为</small>`,{kind:'cultivate',classes:'pr-main-action',disabled:blocked,aria:`闭关修炼，获得 ${cultivate.xp||0} 修为，消耗 ${cultivate.years} 年寿元`});
      const appearance=P.read();
      return `<section class="v3-window v3-cave-window practice-room${blocked?' is-blocked':''}${ready?' is-ready':''}" data-spirit="${spirit}">
        <header class="pr-header"><span class="pr-avatar">${P.image('portrait','',appearance.name,appearance.id)}</span><div class="pr-identity"><small>修行 · 听松静室</small><strong>${esc(realm.name)}</strong></div><div class="pr-power"><small>战力</small>${powerFigure(E.power(state))}</div>${A.utility(button)}</header>
        <div class="pr-resources"><span>道龄 ${state.age} / ${E.maxAge(state)}</span><span>元气 ${state.vitality}</span><span>盘缠 ${fmt(state.journey.silver)}</span><span>行粮 ${fmt(state.journey.supplies)}</span></div>
        <div class="pr-stage">
          <div class="pr-picture">${A.img('scene.character','v3-cave-bg pr-landscape','云海静室')}<div class="pr-scene-wash" aria-hidden="true"></div></div>
          <div class="pr-seated-wrap" data-character="${appearance.id}">${P.image('seated','pr-seated',`${appearance.name}盘膝修炼`,appearance.id)}</div>
          <div class="pr-inner-scene" aria-hidden="true"><i class="pr-orbit"></i><i class="pr-orbit pr-orbit-second"></i><span class="pr-inner-core"></span><i class="pr-mote m1"></i><i class="pr-mote m2"></i><i class="pr-mote m3"></i></div>
          <div class="pr-inner-caption"><small>此境内景</small><span>${spiritName}</span></div>
          <div class="pr-room-tools">${button('practice-pills','服丹',{ui:true,classes:'pr-side-entry',aria:'打开行囊丹药分类'})}<details class="pr-affairs"><summary>洞府事务</summary><div>${button('atlas','山门 · 出行',{ui:true,classes:'pr-affair'})}${button('forge','丹器阁',{ui:true,classes:'pr-affair'})}${button('spirit-beast','灵兽居',{ui:true,classes:'pr-affair'})}${button('journal','修行命册',{ui:true,classes:'pr-affair'})}</div></details></div>
          ${memoryHtml?`<div class="pr-memory">${memoryHtml}</div>`:''}
          <p class="pr-scene-caption">${label}<small>动静有时 · 道在此身</small></p>
        </div>
        <div class="pr-progress"><div class="pr-progress-heading"><span>此境修为</span><b>${fmt(state.xp)} <small>/ ${fmt(realm.threshold)}</small></b><span>${Math.floor(xp)}%</span></div><div class="pr-progress-track" role="progressbar" aria-label="此境修为" aria-valuenow="${Math.floor(xp)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${xp}%"></i></div><div class="pr-requirements"><span>${ready?'修为与破境条件已满足':`下一境 · ${esc(next?.name||'渡劫')}`}</span>${hasFoundation?button('atlas',`此境根基 ${foundation}`,{ui:true,classes:'pr-foundation',aria:`此境根基 ${foundation}，查看山海路线`}):'<span>此世沿用旧版突破规则</span>'}</div>${special.length?`<div class="pr-special">${special.join('')}</div>`:''}</div>
        <div class="pr-action-dock"><div>${button('cultivate-to-ready','连续闭关',{classes:'pr-secondary-action',disabled:blocked||!E.canCultivateToReady(state)})}<small>遇事或圆满即止</small></div><div class="pr-primary-cell">${primary}<small>${ready?'结果以正式结算为准':`每次耗时 ${cultivate.years} 年`}</small></div><div>${button('act','寻机缘',{kind:'explore',classes:'pr-secondary-action',disabled:blocked})}<small>耗时 ${explore.years} 年</small></div></div>
        <footer class="pr-journal"><div><span>此刻</span><p>${esc(quest)}</p></div>${tutorialHtml?`<details class="pr-guide"><summary>指引</summary><div>${tutorialHtml}</div></details>`:''}</footer>
        ${eventHtml?`<div class="v3-overlay-sheet pr-encounter">${eventHtml}</div>`:''}
      </section>`;
    },
    bind(node){
      const image=node.querySelector?.('.pr-landscape');
      if(!image)return;
      const failed=()=>image.closest('.pr-stage').classList.add('pr-no-art');
      const escape=event=>{if(event.key==='Escape')node.querySelectorAll('.practice-room details[open]').forEach(item=>{item.open=false;item.querySelector('summary')?.focus();});};
      image.addEventListener('error',failed);node.addEventListener('keydown',escape);
      if(image.complete&&!image.naturalWidth)failed();
      return()=>{image.removeEventListener('error',failed);node.removeEventListener('keydown',escape);};
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
