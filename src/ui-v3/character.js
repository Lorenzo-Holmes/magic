(function(root){
  'use strict';
  const V=root.FSUIV3;
  V.register('CharacterWindow',{
    render(ctx){
      const {state,D,E,G,button,esc,fmt}=ctx, realm=D.REALMS[state.realm], stats=E.stats(state);
      const slot=(id,label,cls)=>{
        const entry=G.equipped(state.equipment,id), def=G.data(entry), text=entry?(entry.identified?def?.name:'未鉴定器物'):'空槽';
        const rarity=entry&&entry.identified?` rarity-${def?.rarity||0}`:'';
        return button('equipment',`<i>${label.slice(0,1)}</i><span>${label}</span><b class="${rarity}">${esc(text)}</b>${entry?'<small>点按管理</small>':'<small>点按选择</small>'}`,{ui:true,classes:`v3-equip-slot ${cls}`,aria:`${label}：${text}`});
      };
      return `<section class="v3-window v3-character-window">
        <div class="v3-character-stage">
          <img class="v3-layer v3-character-bg" src="./assets/bg/realm-foundation.svg" alt="" width="540" height="960">
          <div class="v3-layer v3-character-wash" aria-hidden="true"></div>
          <header class="v3-character-headline"><div><small>人物 · 当前道身</small><h2>${esc(realm.name)}</h2><span>${state.age} 岁 · ${state.vitality} 元气</span></div><div><small>此世战力</small><strong>${fmt(E.power(state))}</strong></div></header>
          <div class="v3-character-figure" aria-hidden="true"><span class="v3-figure-aura"></span><svg class="v3-character-portrait" viewBox="0 0 260 520" role="presentation"><defs><linearGradient id="robeV3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1ead9"/><stop offset=".5" stop-color="#c8c5b7"/><stop offset="1" stop-color="#7c877c"/></linearGradient><linearGradient id="robeShadowV3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aeb6aa"/><stop offset="1" stop-color="#536157"/></linearGradient><linearGradient id="hairV3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111a16"/><stop offset="1" stop-color="#26332c"/></linearGradient></defs><ellipse cx="130" cy="468" rx="82" ry="18" fill="#080d09" opacity=".5"/><path d="M101 98 C81 123 80 180 88 230 L69 387 C63 424 80 459 106 474 L154 474 C181 459 197 423 191 387 L172 230 C180 180 179 123 159 98 Z" fill="url(#hairV3)" opacity=".92"/><path d="M99 170 C77 188 59 219 45 269 L15 367 C10 388 23 401 41 394 L98 338 Z" fill="url(#robeShadowV3)" stroke="#e3dac7" stroke-opacity=".35"/><path d="M161 170 C183 188 201 219 215 269 L245 367 C250 388 237 401 219 394 L162 338 Z" fill="url(#robeShadowV3)" stroke="#e3dac7" stroke-opacity=".35"/><path d="M94 158 C103 145 114 138 130 138 C146 138 157 145 166 158 L187 421 C189 450 169 474 143 481 L117 481 C91 474 71 450 73 421 Z" fill="url(#robeV3)" stroke="#f6eedc" stroke-opacity=".48"/><path d="M106 160 L130 199 L154 160" fill="none" stroke="#546257" stroke-width="6"/><path d="M93 252 C115 268 145 268 167 252" fill="none" stroke="#705b39" stroke-width="7"/><rect x="101" y="244" width="58" height="16" rx="4" fill="#a88b55"/><path d="M111 257 L97 447 M149 257 L163 447" fill="none" stroke="#677469" stroke-width="2" opacity=".5"/><ellipse cx="130" cy="104" rx="31" ry="38" fill="#d8cdbb"/><path d="M99 104 C99 62 117 50 132 52 C151 51 165 66 163 101 C151 88 142 79 128 76 C118 86 111 95 99 104 Z" fill="url(#hairV3)"/><path d="M101 92 C94 122 98 155 109 171 M159 90 C167 121 164 157 151 177" fill="none" stroke="#17211b" stroke-width="9" stroke-linecap="round"/><path d="M114 114 Q121 118 127 114 M133 114 Q140 118 146 114" fill="none" stroke="#6f6457" stroke-width="1.4"/><path d="M128 126 Q130 128 132 126" fill="none" stroke="#776b5c"/><path d="M119 139 Q130 143 141 139" fill="none" stroke="#8b7364" stroke-width="1.2"/><path d="M129 48 L130 21" stroke="#c6ad72" stroke-width="3"/><path d="M118 23 Q130 13 142 23" fill="none" stroke="#d9c184" stroke-width="4"/><g transform="translate(188 207) rotate(16)"><rect x="0" y="0" width="5" height="218" rx="2" fill="#c8ab69"/><rect x="-3" y="-10" width="11" height="28" rx="3" fill="#ddd0aa"/><path d="M-8 12 L13 12" stroke="#9c7440" stroke-width="4"/></g><path d="M75 302 C97 313 111 317 130 318 C150 318 164 313 185 302" fill="none" stroke="#f3ead8" stroke-opacity=".35" stroke-width="2"/></svg></div>
          <div class="v3-equip-ring">
            ${slot('weapon','兵器','slot-weapon')}${slot('artifact','法宝','slot-artifact')}${slot('robe','法衣','slot-robe')}${slot('accessory','佩饰','slot-accessory')}
          </div>
          <div class="v3-character-links">${button('journal','命册',{ui:true,classes:'v3-character-link'})}${button('build','大道',{ui:true,classes:'v3-character-link'})}${button('spirit-beast','灵兽',{ui:true,classes:'v3-character-link'})}${button('sect','宗门',{ui:true,classes:'v3-character-link'})}</div>
          <div class="v3-character-secondary">${button('life','人生',{ui:true,classes:'v3-character-sub-link'})}${button('karma','因果',{ui:true,classes:'v3-character-sub-link'})}${button('legacy','轮回',{ui:true,classes:'v3-character-sub-link'})}${button('codex','图谱',{ui:true,classes:'v3-character-sub-link'})}</div>
          <div class="v3-stat-ribbon" aria-label="基础属性">${[['根骨',stats.bone],['神识',stats.mind],['悟性',stats.insight],['气运',stats.luck]].map(([n,v])=>`<span><small>${n}</small><b>${esc(v)}</b></span>`).join('')}</div>
        </div>
      </section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
