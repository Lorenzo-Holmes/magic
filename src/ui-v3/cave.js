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
      const progressStage=xp>=100?'修为圆满':xp>=75?'真元鼓荡':xp>=50?'灵气汇聚':xp>=25?'入定已深':'初入静修';
      const estimatedRounds=realm.threshold&&state.xp<realm.threshold?Math.ceil((realm.threshold-state.xp)/Math.max(1,cultivate.xp||1)):0;
      const retreat=state.event?.id==='quiet'&&state.event.retreat?state.event.retreat:null;
      const previousXp=retreat?Math.max(0,state.xp-retreat.gain):state.xp;
      const previousPercent=realm.threshold?Math.max(0,Math.min(100,previousXp/realm.threshold*100)):xp;
      const hasFoundation=state.journey.enabled&&state.realm<9;
      const foundation=hasFoundation?`${state.journey.foundation[state.realm]} / ${J.required(state.realm)}`:'旧法';
      const spirit=state.realm<2?'breath':state.realm<3?'sea':state.realm<4?'core':'spirit';
      const spiritName={breath:'引气归元',sea:'气海澄明',core:'金丹内照',spirit:'守神归一'}[spirit];
      const label=ready?'破境在即':blocked?'眼前有事':state.vitality<40?'元气有损':'静心修炼';
      let special='';
      if(state.secretRealm?.active)special=button('secret-realm','返回秘境',{ui:true,classes:'pr-condition-action'});
      else if(!blocked&&E.canChallengeBoss(state))special=button('challenge-boss','寻三眼妖王',{classes:'pr-condition-action'});
      else if(!blocked&&state.realm>=4&&state.realm<=8&&!state.realmProofs.includes(state.realm))special=button('seek-proof','寻天地印证',{classes:'pr-condition-action',disabled:!E.canSeekProof(state)});
      else if(!blocked&&hasFoundation&&!J.ready(state.journey,state.realm)&&xp>=100)special=button('atlas','修为已满 · 去山海稳固根基',{ui:true,classes:'pr-condition-action'});
      const primary=ready
        ?button('breakthrough',`<b>破境</b><small>${esc(next?.name||'下一境')}</small>`,{classes:'pr-main-action is-ready',aria:`破境至${next?.name||'下一境'}`})
        :button('act',`<b>闭关</b><small>一次 · +${fmt(cultivate.xp||0)}</small>`,{kind:'cultivate',classes:'pr-main-action',disabled:blocked,aria:`闭关一次，获得 ${cultivate.xp||0} 修为，消耗 ${cultivate.years} 年寿元`});
      const appearance=P.read();
      return `<section class="v3-window v3-cave-window practice-room${blocked?' is-blocked':''}${ready?' is-ready':''}" data-spirit="${spirit}">
        <header class="pr-header"><span class="pr-avatar">${P.image('portrait','',appearance.name,appearance.id)}</span><div class="pr-identity"><small>修行 · 听松静室</small><strong>${esc(realm.name)}</strong></div><div class="pr-power"><small>战力</small>${powerFigure(E.power(state))}</div>${A.utility(button)}</header>
        <div class="pr-resources"><span>道龄 <b>${state.age}</b> / ${E.maxAge(state)}</span><span>元气 <b>${state.vitality}</b> / 100</span></div>
        <div class="pr-stage">
          <div class="pr-picture">${A.img('scene.character','v3-cave-bg pr-landscape','云海静室')}<div class="pr-scene-wash" aria-hidden="true"></div></div>
          <div class="pr-seated-wrap" data-character="${appearance.id}">${P.image('seated','pr-seated',`${appearance.name}盘膝修炼`,appearance.id)}</div>
          <div class="pr-inner-scene" aria-hidden="true"><i class="pr-orbit"></i><i class="pr-orbit pr-orbit-second"></i><span class="pr-inner-core"></span><i class="pr-mote m1"></i><i class="pr-mote m2"></i><i class="pr-mote m3"></i></div>
          <div class="pr-room-tools"><details class="pr-affairs"><summary>修行事务</summary><div>${button('practice-pills','服丹',{ui:true,classes:'pr-affair',aria:'打开行囊丹药分类'})}${button('atlas','山门 · 出行',{ui:true,classes:'pr-affair'})}${button('forge','丹器阁',{ui:true,classes:'pr-affair'})}${button('spirit-beast','灵兽居',{ui:true,classes:'pr-affair'})}${button('journal','修行命册',{ui:true,classes:'pr-affair'})}</div></details></div>
          ${memoryHtml?`<div class="pr-memory">${memoryHtml}</div>`:''}
          <p class="pr-scene-caption">${label}<small>${spiritName} · 道在此身</small></p>
        </div>
        <div class="pr-progress"><div class="pr-progress-heading"><span>此境修为</span><b>${fmt(state.xp)} <small>/ ${fmt(realm.threshold)}</small></b><span>${Math.floor(xp)}%</span></div><div class="pr-progress-track" role="progressbar" aria-label="此境修为" aria-valuenow="${Math.floor(xp)}" aria-valuemin="0" aria-valuemax="100"><i${retreat?' class="is-fresh"':''} style="--pr-progress-from:${previousPercent}%;--pr-progress-to:${xp}%;width:${xp}%"></i></div><div class="pr-retreat-summary"><span><small>${retreat?'本次闭关':'闭关用时'}</small><b>${retreat?`${retreat.years} 年`:`每次 ${cultivate.years} 年`}</b></span><span><small>${retreat?'本次所得':'当前效率'}</small><b>${retreat?`+${fmt(retreat.gain)} 修为`:`+${fmt(cultivate.xp||0)} / 次`}</b></span><span><small>修炼阶段</small><b>${progressStage}</b></span></div><div class="pr-requirements"><span>${ready?'破境条件已满足':estimatedRounds?`按当前效率约 ${estimatedRounds} 次闭关圆满`:`下一境 · ${esc(next?.name||'渡劫')}`}</span><span>${hasFoundation?`根基 ${foundation}`:'经典破境'}</span></div>${special?`<div class="pr-special">${special}</div>`:''}</div>
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
