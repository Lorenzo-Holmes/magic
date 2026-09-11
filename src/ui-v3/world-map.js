(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  // Authored anchors refer to this project's generated 704x1408 map, not the APK.
  const anchors=Object.freeze({forest:[150,728],village:[315,660],marsh:[508,820],peaks:[178,356],ruins:[520,456],canyon:[547,635]});
  V.register('WorldMapWindow',{
    render({state,J,E,button,esc,selectedRegion,journeyKit}){
      const region=J.REGIONS.find(r=>r.id===selectedRegion)||J.REGIONS[0],routes=J.ROUTES.filter(r=>r.region===region.id);
      const locked=region.min>state.realm,unavailable=state.phase!=='playing'||!!state.immortal||E.isBlocking(state)||!!state.secretRealm?.active;
      const year=E.actionPreview(state,'hunt').years,tooLate=state.age+year>=E.maxAge(state);
      const riskName=value=>value>=8?'险':value>=4?'慎':'缓';
      const riskClass=value=>value>=8?'danger':value>=4?'watch':'calm';
      const nodes=J.REGIONS.map(r=>{const [x,y]=anchors[r.id],selected=r.id===region.id;return `<div class="v3-map-node-wrap" style="left:${x}px;top:${y}px">${button('region',`${A.img(r.min>state.realm?'icon.lock':selected?'icon.marker-active':'icon.marker')}<b>${esc(r.name)}</b>`,{ui:true,id:r.id,classes:`v3-map-node${selected?' selected':''}${r.min>state.realm?' locked':''}`,pressed:selected,aria:`查看${r.name}`})}</div>`;}).join('');
      return `<section class="v3-window v3-world-window v4-atlas-window">${A.title(button,'山海图志','六境行旅',`<span>盘缠 ${state.journey.silver} · 行粮 ${state.journey.supplies} · 伤势 ${state.journey.wounds}/3</span>`)}<div class="v3-map-viewport v4-atlas-stage"><div class="v3-art-canvas">${A.img('scene.world','v3-canvas-background','六地山海图')}${nodes}</div><div class="v4-atlas-caption"><small>山海卷</small><strong>${esc(region.name)}</strong><span>${locked?'尚未得入':tooLate?'寿元将尽':'此境可行'}</span></div></div><div class="v3-map-controls v4-atlas-tools" aria-label="地图镜头"><span>拖动画卷 · 点选地志</span><button type="button" data-camera="overview" aria-label="展开或收起全图">全图</button><button type="button" data-camera="in" aria-label="放大地图">＋</button><button type="button" data-camera="out" aria-label="缩小地图">－</button><button type="button" data-camera="reset" aria-label="复位地图">复位</button></div>
        <div class="v3-map-drawer v4-atlas-dossier"><div class="v3-map-drawer-head v4-atlas-dossier-head"><div class="v4-region-seal" aria-hidden="true">${esc(region.name.slice(0,1))}</div><div class="v4-region-copy"><small>${locked?'境界尚未解锁':tooLate?'寿元不足以远行':'地方志 · 可行'}</small><h3>${esc(region.name)}</h3><p>择一条路，带足盘缠与行粮。</p></div><label>随身工具<select id="journey-kit">${J.KITS.map(k=>`<option value="${k.id}"${k.id===journeyKit?' selected':''}>${esc(k.name)}</option>`).join('')}</select></label></div><div class="v3-route-list v4-route-list">${routes.map((r,index)=>`<article class="v4-route-card" data-risk="${riskClass(r.risk)}"><div class="v4-route-index">${index+1}</div><div class="v4-route-copy"><div class="v4-route-heading"><b>${esc(r.name)}</b><span class="v4-risk-mark ${riskClass(r.risk)}">${riskName(r.risk)}</span></div><span>${esc(r.purpose)}</span><small>${year} 年 · 3 盘缠 · 至少 3 行粮</small></div>${button('journey-start','启程',{id:r.id,kind:journeyKit,classes:'v3-route-start v4-route-start',disabled:unavailable||locked||tooLate||state.journey.supplies<3||state.journey.silver<3||state.journey.wounds>=3})}</article>`).join('')}</div><div class="v3-map-secondary v4-atlas-secondary">${button('secret-realm','九州秘境',{ui:true,classes:'v3-map-secondary-action',disabled:unavailable})}${button('act','山野狩猎',{kind:'hunt',classes:'v3-map-secondary-action',disabled:unavailable})}</div></div></section>`;
    },
    bind(node){return A.bindCamera(node,{id:'world',viewport:'.v3-map-viewport',focusY:.425,interactive:true});}
  });
})(typeof globalThis!=='undefined'?globalThis:this);
