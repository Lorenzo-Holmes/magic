(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  V.register('ForgeWindow',{
    render(ctx){
      const {state,G,K,button,esc}=ctx, kind=V.getState('forgeKind')||'pill', recipeId=V.getState('forgeRecipe')||'qi';
      const weapon=G.equipped(state.equipment,'weapon'), weaponDef=G.data(weapon), path=weaponDef?.special?weaponDef.path:'';
      const materials=K.MATERIALS.map(m=>`<span>${A.img(A.item('materials',m.id))}<b>${esc(m.name)}</b><em>${state.crafting.materials[m.id]||0}</em></span>`).join('');
      const recipe=kind==='weapon'?(K.WEAPON_BY_ID[recipeId]||K.WEAPON_RECIPES[0]):(K.PILL_BY_ID[recipeId]||K.PILLS[0]);
      const canCraft=!['talents','attributes','dead'].includes(state.phase)&&!state.immortal&&!state.journey?.active&&!state.secretRealm?.active;
      const enough=recipe?Object.entries(recipe.needs).every(([id,n])=>(state.crafting.materials[id]||0)>=n):false;
      const needs=recipe?Object.entries(recipe.needs).map(([id,n])=>`${K.MATERIAL_BY_ID[id]?.name||id} ×${n}`).join(' · '):'';
      let controls='';
      if(kind==='pill'&&recipe){const owned=state.crafting.pills[recipe.id]?.length||0;controls=`<div class="v3-forge-methods">${K.METHODS.map(m=>button('craft-pill',`${esc(m.name)}<small>${m.variant}% 异丹</small>`,{id:recipe.id,kind:m.id,classes:'v3-forge-method',disabled:!canCraft||!enough||owned>=K.MAX_PILL})).join('')}</div>`;}
      if(kind==='weapon'&&recipe){const hasWeapon=!!(weapon?.identified&&weaponDef?.special),fit=hasWeapon&&(recipe.path==='any'||recipe.path===path);controls=button('craft-weapon',!hasWeapon?'先穿戴本命兵器':fit?'炼入本命':'兵器不契',{id:recipe.id,classes:'v3-forge-primary',disabled:!canCraft||!fit||!enough});}
      const choices=[...K.PILLS.map(r=>['pill',r.id,r.name]),...K.WEAPON_RECIPES.map(r=>['weapon',r.id,r.name])];
      const last=state.crafting.history.at(-1),lastText=last?.type==='pill'?`已炼成 ${K.PILL_BY_ID[last.id]?.name||'丹药'}`:last?.type==='forge'?'本命温养已结算':'';
      return `<section class="v3-window v3-forge-window">${A.img('scene.forge','v3-forge-bg','山中炼器大殿')}${A.title(button,'丹器阁',kind==='weapon'?'本命炼器':'丹炉炼制',`<span>${weaponDef?.special?`本命 · ${esc(weaponDef.name)}`:'尚无本命神兵'}</span>`)}<div class="v3-forge-scene">${button('practice','‹ 洞府',{ui:true,classes:'v3-back-cave'})}<div class="v3-furnace">${A.img('prop.furnace','v3-furnace-art','青玉丹炉')}${A.img('fx.fire','v3-furnace-fire')}</div>${lastText?`<p class="v3-forge-result" role="status">${esc(lastText)} · 已收入行囊</p>`:''}</div><div class="v3-material-rack" aria-label="丹器材料">${materials}</div><div class="v3-recipe-panel"><div class="v3-recipe-tabs">${choices.map(([k,id,name])=>button('v3-forge-select',name,{ui:true,id,kind:k,classes:`v3-recipe-tab${k===kind&&id===recipe.id?' active':''}`,pressed:k===kind&&id===recipe.id})).join('')}</div><div class="v3-recipe-detail"><small>${kind==='weapon'?'炼器法':'丹方'}</small><h3>${esc(recipe?.name||'未选择')}</h3><p>${esc(recipe?.text||'')}</p><b>${esc(needs)}</b>${controls}</div></div></section>`;
    }
  });
})(typeof globalThis!=='undefined'?globalThis:this);
