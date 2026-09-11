(function(root,factory){const api=factory(root,root.FSArtManifestV4);if(typeof module==='object'&&module.exports)module.exports=api;else root.FSUIAppearance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root,manifest){
  'use strict';
  if(!manifest)throw Error('V4 appearance manifest must load before appearance.js');
  const KEY='feisheng.appearance.v1',VERSION=1;
  const characters=Object.freeze([
    Object.freeze({id:'jade-sword',name:'青衫剑修',standing:'character.jade-sword.standing',portrait:'character.jade-sword.portrait',seated:'character.jade-sword.seated'}),
    Object.freeze({id:'cloud-lotus',name:'流云仙修',standing:'character.cloud-lotus.standing',portrait:'character.cloud-lotus.portrait',seated:'character.cloud-lotus.seated'}),
    Object.freeze({id:'herbal-sage',name:'丹道仙师',standing:'character.herbal-sage.standing',portrait:'character.herbal-sage.portrait',seated:'character.herbal-sage.seated'}),
    Object.freeze({id:'jade-healer',name:'青莲医修',standing:'character.jade-healer.standing',portrait:'character.jade-healer.portrait',seated:'character.jade-healer.seated'})
  ]);
  const byId=Object.freeze(Object.fromEntries(characters.map(c=>[c.id,c]))),fallback=characters[0];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sessionId=fallback.id,pendingId=null,initialized=false;
  function load(storage=root.localStorage){if(initialized)return byId[sessionId]||fallback;initialized=true;try{const raw=storage?.getItem(KEY);if(raw){const value=JSON.parse(raw);if(value?.version===VERSION&&byId[value.portraitId])sessionId=value.portraitId;}}catch{/* Keep session fallback; gameplay storage is untouched. */}return byId[sessionId]||fallback;}
  function read(storage=root.localStorage){return initialized?(byId[sessionId]||fallback):load(storage);}
  function preview(id){if(!byId[id])throw Error('未知道身外观');pendingId=id;return byId[id];}
  function pending(){return pendingId?(byId[pendingId]||null):null;}
  function cancel(){pendingId=null;return read();}
  function confirm(storage=root.localStorage){const character=pending()||read(storage);sessionId=character.id;pendingId=null;let persisted=true;try{storage?.setItem(KEY,JSON.stringify({version:VERSION,portraitId:sessionId}));}catch{persisted=false;}return Object.freeze({character,persisted});}
  function resetForTests(){sessionId=fallback.id;pendingId=null;initialized=false;}
  function image(kind,className='',alt='',id=(pending()||read()).id){const character=byId[id]||fallback,key=character[kind],asset=manifest[key];if(!asset)throw Error(`Missing V4 ${kind} artwork: ${id}`);return `<img class="${esc(className)}" data-v4-art="${esc(key)}" src="./${asset.path}" width="${asset.width}" height="${asset.height}" alt="${esc(alt||character.name)}" decoding="async" draggable="false">`;}
  if(root.document)root.document.addEventListener('error',event=>{const image=event.target;if(image?.tagName!=='IMG'||!image.dataset.v4Art)return;image.classList.add('ui-v4-art-failed');image.parentElement?.setAttribute('data-art-fallback','true');},true);
  return Object.freeze({KEY,VERSION,characters,read,preview,pending,cancel,confirm,image,resetForTests});
});
