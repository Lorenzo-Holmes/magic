(function(root){
  'use strict';
  const V=root.FSUIV3;
  V.register('BaggageWindow',{
    render(ctx){
      const {state,E,G,K,button,esc,fmt}=ctx, filter=V.getState('bagFilter')||'all';
      const occupied=!!(state.journey?.active||state.secretRealm?.active);
      const canGear=!occupied&&!['talents','attributes'].includes(state.phase);
      const canPill=!occupied&&!state.immortal&&!['talents','attributes','dead'].includes(state.phase);
      const categories=[['all','全部'],['equipment','装备'],['pills','丹药'],['materials','材料'],['supplies','行装']];
      const rows=[];
      if(filter==='all'||filter==='equipment') for(const entry of state.equipment.inventory){
        const def=G.data(entry), worn=Object.values(state.equipment.slots).includes(entry.uid), name=entry.identified?def.name:'封灵器匣';
        const actions=[];
        if(!entry.identified)actions.push(button('equipment-identify','鉴定<small>不消耗资源</small>',{id:entry.uid,classes:'v3-item-action',disabled:!canGear}));
        else{
          if(!worn)actions.push(button('equipment-equip','穿戴',{id:entry.uid,classes:'v3-item-action',disabled:!canGear}));
          else actions.push(button('equipment-unequip','卸下',{id:def.slot,classes:'v3-item-action',disabled:!canGear}));
          if(entry.refinement<3)actions.push(button('equipment-refine',`温养<small>${entry.refinement+1} 器蕴</small>`,{id:entry.uid,classes:'v3-item-action',disabled:!canGear||state.equipment.essence<entry.refinement+1}));
          if(def.special&&def.next){const needed=def.stage===0?80:220;actions.push(button('equipment-evolve',`蜕变<small>历练 ${entry.xp}/${needed}</small>`,{id:entry.uid,classes:'v3-item-action',disabled:!canGear||entry.xp<needed}));}
          if(!worn)actions.push(button('equipment-salvage','归炉',{id:entry.uid,classes:'v3-item-action subtle',disabled:!canGear}));
        }
        rows.push(`<article class="v3-item-row"><div class="v3-item-icon rarity-${def?.rarity||0}"><i>${entry.identified?(G.SLOTS[def.slot]||'器').slice(0,1):'?'}</i></div><div class="v3-item-copy"><div><span>${entry.identified?`${V.rarityName(def.rarity)}品 · ${G.SLOTS[def.slot]}`:'未鉴定'}</span>${worn?'<em>已穿戴</em>':''}</div><h3>${esc(name)}</h3><p>${esc(entry.identified?def.description:'灵光封存，鉴定后才显露器物本相。')}</p></div><div class="v3-item-actions">${actions.join('')}</div></article>`);
      }
      if(filter==='all'||filter==='pills') for(const recipe of K.PILLS){
        const owned=state.crafting.pills[recipe.id]?.length||0;if(!owned&&filter==='all')continue;
        rows.push(`<article class="v3-item-row"><div class="v3-item-icon pill"><i>丹</i></div><div class="v3-item-copy"><div><span>丹药</span><em>持有 ${owned}</em></div><h3>${esc(recipe.name)}</h3><p>${esc(recipe.text)}</p></div><div class="v3-item-actions">${owned?button('craft-use','服用<small>消耗一枚</small>',{id:recipe.id,classes:'v3-item-action',disabled:!canPill}):'<span class="v3-empty-note">暂无</span>'}</div></article>`);
      }
      if(filter==='all'||filter==='materials') for(const material of K.MATERIALS){
        const n=state.crafting.materials[material.id]||0;if(!n&&filter==='all')continue;
        rows.push(`<article class="v3-item-row compact"><div class="v3-item-icon material"><i>材</i></div><div class="v3-item-copy"><div><span>炼制材料</span><em>× ${n}</em></div><h3>${esc(material.name)}</h3></div></article>`);
      }
      if(filter==='all'||filter==='supplies'){
        const j=state.journey;
        rows.push(`<article class="v3-item-row compact"><div class="v3-item-icon supply"><i>粮</i></div><div class="v3-item-copy"><div><span>行装</span><em>${j.supplies}/12</em></div><h3>行粮</h3><p>远行途中按段消耗。</p></div></article>`);
        rows.push(`<article class="v3-item-row compact"><div class="v3-item-icon supply"><i>药</i></div><div class="v3-item-copy"><div><span>行装</span><em>× ${j.medicine}</em></div><h3>伤药</h3><p>用于处理旅途伤势。</p></div></article>`);
      }
      const j=state.journey, year=E.actionPreview(state,'hunt').years;
      const can=state.phase==='playing'&&!state.immortal&&!occupied&&!E.isBlocking(state), canYear=state.age+year<E.maxAge(state);
      const prep=`<div class="v3-provision-panel"><span>盘缠 ${fmt(j.silver)}<small>伤势 ${j.wounds}/3</small></span>${button('journey-prepare','备六份粮<small>6 盘缠</small>',{id:'supplies',classes:'v3-provision-action',disabled:!can||j.supplies===12||j.silver<6})}${button('journey-prepare','买一份药<small>8 盘缠</small>',{id:'medicine',classes:'v3-provision-action',disabled:!can||j.medicine===9||j.silver<8})}${button('journey-prepare','敷药疗伤<small>1 伤药</small>',{id:'heal',classes:'v3-provision-action',disabled:!can||!j.wounds||!j.medicine})}${button('journey-prepare',`留庐静养<small>${year} 年寿元</small>`,{id:'rest',classes:'v3-provision-action',disabled:!can||!canYear||!j.wounds})}${button('journey-prepare',`帮工换钱<small>${year} 年 · +10</small>`,{id:'work',classes:'v3-provision-action',disabled:!can||!canYear||j.silver===9999})}</div>`;
      const tools=`<div class="v3-bag-tools">${button('forge','炼器阁',{ui:true,classes:'v3-bag-tool'})}${button('equipment','装备总览',{ui:true,classes:'v3-bag-tool'})}${button('crafting','丹器详册',{ui:true,classes:'v3-bag-tool'})}${button('spirit-beast','灵兽',{ui:true,classes:'v3-bag-tool'})}</div>`;
      return `<section class="v3-window v3-baggage-window"><header class="v3-window-title"><div><small>行囊</small><h2>纳物有序</h2></div><div><span>装备 ${state.equipment.inventory.length}/${G.MAX_INVENTORY}</span><span>器蕴 ${fmt(state.equipment.essence)}</span></div></header>${tools}<div class="v3-category-tabs">${categories.map(([id,label])=>button('v3-bag-filter',label,{ui:true,id,classes:`v3-category-tab${filter===id?' active':''}`,pressed:filter===id})).join('')}</div>${prep}<div class="v3-baggage-scroll">${rows.join('')||'<div class="v3-empty-bag"><i>囊</i><p>此类行囊尚空。</p></div>'}</div></section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
