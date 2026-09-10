(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  V.register('CharacterWindow',{
    render({state,D,E,G,button,esc,fmt}){
      const realm=D.REALMS[state.realm],stats=E.stats(state);
      const slot=(id,label,defaultIcon)=>{
        const entry=G.equipped(state.equipment,id),def=G.data(entry),text=entry?def.name:'尚未穿戴';
        return button('v3-equipment-slot',`<span class="v3-slot-art">${A.img(entry?A.item('equipment',def.id,entry.identified):defaultIcon)}</span><span>${label}</span><b>${esc(text)}</b>`,{ui:true,id,classes:`v3-equip-slot slot-${id}${entry?' equipped':''}`,aria:`${label}：${text}，查看此槽装备`});
      };
      return `<section class="v3-window v3-character-window">${A.img('scene.character','v3-character-bg','云海道台')}
        ${A.title(button,'人物 · 此世道身',realm.name,`<span>${state.age} 岁 · 元气 ${state.vitality} · 战力 ${fmt(E.power(state))}</span>`)}
        <div class="v3-character-stage"><div class="v3-character-figure">${A.img('character.dao','v3-character-portrait','青白道袍修士')}</div><div class="v3-equip-ring">${slot('weapon','兵器','item.sword')}${slot('artifact','法宝','item.orb')}${slot('robe','法衣','item.robe')}${slot('accessory','佩饰','item.pendant')}</div></div>
        <div class="v3-character-lower"><div class="v3-character-links">${[['journal','命册'],['build','大道'],['spirit-beast','灵兽'],['sect','宗门']].map(([id,name])=>button(id,name,{ui:true,classes:'v3-character-link'})).join('')}</div><div class="v3-character-secondary">${[['life','人生'],['karma','因果'],['legacy','轮回'],['codex','图谱']].map(([id,name])=>button(id,name,{ui:true,classes:'v3-character-sub-link'})).join('')}</div><div class="v3-stat-ribbon" aria-label="基础属性">${[['根骨',stats.bone],['神识',stats.mind],['悟性',stats.insight],['气运',stats.luck]].map(([n,v])=>`<span><small>${n}</small><b>${esc(v)}</b></span>`).join('')}</div></div>
      </section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
