(function(root){
  'use strict';
  const V=root.FSUIV3;
  V.register('WorldMapWindow',{
    render(ctx){
      const {state,J,E,button,esc,selectedRegion,journeyKit}=ctx, region=J.REGIONS.find(r=>r.id===selectedRegion)||J.REGIONS[0];
      const routes=J.ROUTES.filter(r=>r.region===region.id), locked=region.min>state.realm;
      const year=E.actionPreview(state,'hunt').years;
      const secondaryUnavailable=state.phase!=='playing'||!!state.immortal||E.isBlocking(state)||!!state.secretRealm?.active||!!state.journey?.active;
      const unavailable=secondaryUnavailable||state.age+year>=E.maxAge(state);
      const nodes=J.REGIONS.map(r=>{
        // The reference map keeps actionable map markers above the lower
        // information panel. Preserve the authored X coordinate while
        // projecting Y into the exposed map viewport so no marker can sit
        // beneath the drawer on short phones.
        const displayY=8+r.y*.5;
        const html=button('region',`<i></i><b>${esc(r.name)}</b>`,{ui:true,id:r.id,classes:`v3-map-node${r.id===region.id?' selected':''}${r.min>state.realm?' locked':''}`,pressed:r.id===region.id,aria:`查看${r.name}`});
        return `<div class="v3-map-node-wrap" style="left:${r.x}%;top:${displayY}%">${html}</div>`;
      }).join('');
      const secondary=`<div class="v3-map-secondary">${button('secret-realm','九州秘境',{ui:true,classes:'v3-map-secondary-action',disabled:secondaryUnavailable})}${button('act','山野狩猎',{kind:'hunt',classes:'v3-map-secondary-action',disabled:secondaryUnavailable})}</div>`;
      return `<section class="v3-window v3-world-window"><div class="v3-world-map"><img src="./assets/art/atlas-v2.1.webp" alt="六地山海图" width="1536" height="1024"><div class="v3-world-shade"></div><header class="v3-map-title"><small>山海</small><h2>${esc(region.name)}</h2><span>${esc(region.subtitle)}</span></header>${nodes}<div class="v3-map-drawer"><div class="v3-map-drawer-head"><div><small>${locked?'尚未解锁':'此境可行'}</small><h3>${esc(region.name)}</h3></div><label>随身<select id="journey-kit">${J.KITS.map(k=>`<option value="${k.id}"${k.id===journeyKit?' selected':''}>${esc(k.name)}</option>`).join('')}</select></label></div><div class="v3-route-list">${routes.map(r=>`<article><div><b>${esc(r.name)}</b><span>${esc(r.purpose)}</span><small>${r.risk>=8?'险路':r.risk>=4?'需留心':'较平缓'} · ${year} 年</small></div>${button('journey-start','启程',{id:r.id,kind:journeyKit,classes:'v3-route-start',disabled:unavailable||locked||state.journey.supplies<3||state.journey.silver<3||state.journey.wounds>=3})}</article>`).join('')}</div>${secondary}</div></div></section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
