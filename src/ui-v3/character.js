(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt,P=root.FSUIAppearance;
  V.register('CharacterWindow',{
    render({state,D,E,G,button,esc,fmt}){
      const realm=D.REALMS[state.realm],stats=E.stats(state),appearance=P.read();
      const rootData=D.ROOTS?.find(x=>x.id===state.root),origin=D.ORIGINS?.find(x=>x.id===state.origin);
      const daoName=state.dao?.formed?.name||'大道未凝', lifespan=E.maxAge(state);
      const slot=(id,label,defaultIcon)=>{
        const entry=G.equipped(state.equipment,id),def=G.data(entry),text=entry?def.name:'尚未穿戴';
        return button('v3-equipment-slot',`<span class="v3-slot-art">${A.img(entry?A.item('equipment',def.id,entry.identified):defaultIcon)}</span><span>${label}</span><b>${esc(text)}</b>`,{ui:true,id,classes:`v3-equip-slot slot-${id}${entry?' equipped':''}`,aria:`${label}：${text}，查看此槽装备`});
      };
      const chooser=`<div class="ui-appearance-current"><span>${P.image('portrait','',appearance.name,appearance.id)}<b>${appearance.name}</b></span>${button('appearance-open','更换形象',{ui:true,classes:'ui-appearance-open',aria:'预览并更换道身外观'})}</div>`;
      const facts=[['灵根',rootData?.name||'未显'],['出身',origin?.name||'未定'],['道途',daoName],['道龄',`${state.age} / ${lifespan}`]];
      return `<section class="v3-window v3-character-window v4-character-window">${A.img('scene.character','v3-character-bg','云海道台')}
        ${A.title(button,'人物 · 此世仙籍',realm.name,`<span>${appearance.name} · 元气 ${state.vitality} · 战力 ${fmt(E.power(state))}</span>`)}
        <div class="v3-character-stage"><div class="v3-character-figure">${P.image('standing','v4-character-standing',appearance.name,appearance.id)}</div><div class="v3-equip-ring">${slot('weapon','兵器','item.sword')}${slot('artifact','法宝','item.orb')}${slot('robe','法衣','item.robe')}${slot('accessory','佩饰','item.pendant')}</div></div>
        <div class="v3-character-lower"><section class="v4-character-dossier" aria-label="此世仙籍">${facts.map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</section>${chooser}<div class="v3-character-links">${[['journal','命册'],['build','大道']].map(([id,name])=>button(id,name,{ui:true,classes:'v3-character-link'})).join('')}</div><details class="v4-character-archive"><summary>更多此世</summary><div class="v3-character-secondary">${[['spirit-beast','灵兽'],['sect','宗门'],['life','人生'],['karma','因果'],['legacy','轮回'],['codex','图谱']].map(([id,name])=>button(id,name,{ui:true,classes:'v3-character-sub-link'})).join('')}</div></details><div class="v3-stat-ribbon" aria-label="基础属性">${[['根骨',stats.bone],['神识',stats.mind],['悟性',stats.insight],['气运',stats.luck]].map(([n,v])=>`<span><small>${n}</small><b>${esc(v)}</b></span>`).join('')}</div></div>
      </section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
