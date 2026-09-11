(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  V.register('BaggageWindow',{
    render(ctx){
      const {state,E,G,K,button,esc,fmt}=ctx, filter=V.getState('bagFilter')||'all';
      const occupied=!!(state.journey?.active||state.secretRealm?.active);
      const canGear=!occupied&&!['talents','attributes'].includes(state.phase);
      const canPill=!occupied&&!state.immortal&&!['talents','attributes','dead'].includes(state.phase);
      const categories=[['all','全部'],['equipment','装备'],['pills','丹药'],['materials','材料'],['supplies','行装']];
      const entries=[];
      const add=(key,kind,name,icon,meta,description,quantity,actions='')=>entries.push({key,kind,name,icon,meta,description,quantity,actions});

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
        add(`equipment:${entry.uid}`,'equipment',name,A.item('equipment',def.id,entry.identified),entry.identified?`${V.rarityName(def.rarity)}品 · ${G.SLOTS[def.slot]}`:'灵光未启',entry.identified?def.description:'灵光封存，鉴定后才显露器物本相。',worn?'已穿戴':entry.identified?G.REFINE_NAMES[entry.refinement]:'未鉴定',actions.join(''));
      }
      if(filter==='all'||filter==='pills') for(const recipe of K.PILLS){
        const owned=state.crafting.pills[recipe.id]?.length||0;if(!owned&&filter==='all')continue;
        add(`pills:${recipe.id}`,'pills',recipe.name,A.item('pills',recipe.id),'丹药',recipe.text,`× ${owned}`,owned?button('craft-use','服用<small>消耗一枚</small>',{id:recipe.id,classes:'v3-item-action',disabled:!canPill}):'<span class="v3-empty-note">尚未炼得</span>');
      }
      if(filter==='all'||filter==='materials') for(const material of K.MATERIALS){
        const n=state.crafting.materials[material.id]||0;if(!n&&filter==='all')continue;
        add(`materials:${material.id}`,'materials',material.name,A.item('materials',material.id),'炼制材料','用于丹器与本命兵器炼制。',`× ${n}`,'');
      }
      if(filter==='all'||filter==='supplies'){
        const j=state.journey;
        add('supplies:rice','supplies','行粮','item.rice','行装','远行途中按段消耗。',`${j.supplies}/12`,'');
        add('supplies:medicine','supplies','伤药','item.medicine','行装','用于处理旅途伤势。',`× ${j.medicine}`,'');
      }

      const requested=V.getState('bagSelected')||'', selected=entries.find(x=>x.key===requested)||entries[0]||null;
      const cells=entries.map(item=>button('v3-bag-select',`<span class="v4-treasure-icon">${A.img(item.icon)}</span><b>${esc(item.name)}</b><small>${esc(item.quantity)}</small>`,{ui:true,id:item.key,classes:`v4-treasure-cell kind-${item.kind}${selected?.key===item.key?' selected':''}`,pressed:selected?.key===item.key,aria:`查看${item.name}`})).join('');
      const detail=selected?`<aside class="v4-item-sheet" aria-live="polite"><div class="v4-sheet-icon">${A.img(selected.icon)}</div><div class="v4-sheet-copy"><small>${esc(selected.meta)}</small><h3>${esc(selected.name)}</h3><p>${esc(selected.description)}</p><b>${esc(selected.quantity)}</b></div><div class="v3-item-actions">${selected.actions||'<span class="v3-empty-note">此物无需直接操作。</span>'}</div></aside>`:`<aside class="v4-item-sheet empty"><p>此类行囊尚空。</p></aside>`;

      const j=state.journey, year=E.actionPreview(state,'hunt').years;
      const can=state.phase==='playing'&&!state.immortal&&!occupied&&!E.isBlocking(state), canYear=state.age+year<E.maxAge(state);
      const needsPrep=j.wounds>0||j.supplies<6||j.silver<9;
      const prep=`<details class="v4-bag-prep"${needsPrep?' open':''}><summary><span>整备行装</span><b>盘缠 ${fmt(j.silver)} · 行粮 ${j.supplies}/12 · 伤药 ${j.medicine}</b></summary><div class="v3-provision-panel">${button('journey-prepare','备六份粮<small>6 盘缠</small>',{id:'supplies',classes:'v3-provision-action',disabled:!can||j.supplies===12||j.silver<6})}${button('journey-prepare','买一份药<small>8 盘缠</small>',{id:'medicine',classes:'v3-provision-action',disabled:!can||j.medicine===9||j.silver<8})}${button('journey-prepare','敷药疗伤<small>1 伤药</small>',{id:'heal',classes:'v3-provision-action',disabled:!can||!j.wounds||!j.medicine})}${button('journey-prepare',`留庐静养<small>${year} 年寿元</small>`,{id:'rest',classes:'v3-provision-action',disabled:!can||!canYear||!j.wounds})}${button('journey-prepare',`帮工换钱<small>${year} 年 · +10</small>`,{id:'work',classes:'v3-provision-action',disabled:!can||!canYear||j.silver===9999})}</div></details>`;
      const tools=`<div class="v3-bag-tools">${button('forge','炼器阁',{ui:true,classes:'v3-bag-tool'})}${button('equipment','装备总览',{ui:true,classes:'v3-bag-tool'})}${button('crafting','丹器详册',{ui:true,classes:'v3-bag-tool'})}${button('spirit-beast','灵兽',{ui:true,classes:'v3-bag-tool'})}</div>`;

      return `<section class="v3-window v3-baggage-window v4-baggage-window">${A.title(button,'行囊 · 随身宝匣','纳物有序',`<span>装备 ${state.equipment.inventory.length}/${G.MAX_INVENTORY} · 器蕴 ${fmt(state.equipment.essence)}</span>`)}${tools}<div class="v3-category-tabs">${categories.map(([id,label])=>button('v3-bag-filter',label,{ui:true,id,classes:`v3-category-tab${filter===id?' active':''}`,pressed:filter===id})).join('')}</div><div class="v4-bag-main"><div class="v4-treasure-grid" role="list" aria-label="宝匣物品">${cells||'<p class="v4-bag-empty">此类行囊尚空。</p>'}</div>${detail}</div>${prep}</section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
