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
      const nodes=J.REGIONS.map(r=>{const [x,y]=anchors[r.id],selected=r.id===region.id;return `<div class="v3-map-node-wrap" style="left:${x}px;top:${y}px">${button('region',`${A.img(r.min>state.realm?'icon.lock':selected?'icon.marker-active':'icon.marker')}<b>${esc(r.name)}</b>`,{ui:true,id:r.id,classes:`v3-map-node${selected?' selected':''}${r.min>state.realm?' locked':''}`,pressed:selected,aria:`查看${r.name}`})}</div>`;}).join('');
      return `<section class="v3-window v3-world-window">${A.title(button,'山海 · 六地行旅','山河有路')}<div class="v3-map-viewport"><div class="v3-art-canvas">${A.img('scene.world','v3-canvas-background','六地山海图')}${nodes}</div></div><div class="v3-map-controls" aria-label="地图镜头"><span>拖动画卷 · 点选地点</span><button type="button" data-camera="overview" aria-label="展开或收起全图">全图</button><button type="button" data-camera="in" aria-label="放大地图">＋</button><button type="button" data-camera="out" aria-label="缩小地图">－</button><button type="button" data-camera="reset" aria-label="复位地图">复位</button></div>
        <div class="v3-map-drawer"><div class="v3-map-drawer-head"><div><small>${locked?'境界尚未解锁':tooLate?'寿元不足以远行':'此境可行'}</small><h3>${esc(region.name)}</h3></div><label>随身工具<select id="journey-kit">${J.KITS.map(k=>`<option value="${k.id}"${k.id===journeyKit?' selected':''}>${esc(k.name)}</option>`).join('')}</select></label></div><div class="v3-route-list">${routes.map(r=>`<article><div><b>${esc(r.name)}</b><span>${esc(r.purpose)}</span><small>${r.risk>=8?'险路':r.risk>=4?'需留心':'较平缓'} · ${year} 年 · 3 盘缠 · 至少 3 行粮</small></div>${button('journey-start','启程',{id:r.id,kind:journeyKit,classes:'v3-route-start',disabled:unavailable||locked||tooLate||state.journey.supplies<3||state.journey.silver<3||state.journey.wounds>=3})}</article>`).join('')}</div><div class="v3-map-secondary">${button('secret-realm','九州秘境',{ui:true,classes:'v3-map-secondary-action',disabled:unavailable})}${button('act','山野狩猎',{kind:'hunt',classes:'v3-map-secondary-action',disabled:unavailable})}</div></div></section>`;
    },
    bind(node){return A.bindCamera(node,{id:'world',viewport:'.v3-map-viewport',focusY:.425,interactive:true});}
  });
})(typeof globalThis!=='undefined'?globalThis:this);
