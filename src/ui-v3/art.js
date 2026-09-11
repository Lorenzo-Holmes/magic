(function (root) {
  'use strict';
  const manifest = root.FSArtManifest;
  if (!manifest) throw new Error('V3 artwork manifest must load before the art runtime');
  const retired = new Set(['character.dao','prop.platform','prop.forge','prop.gate','prop.beast','prop.astrolabe','prop.pine','prop.pond']);
  const runtimeIds = Object.freeze(Object.keys(manifest).filter(id=>!retired.has(id)));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function asset(id) {
    const entry = manifest[id];
    if(retired.has(id))throw new Error(`Retired artwork: ${id}`);
    if (!entry || !/^assets\/ui-v3\/[a-z-]+\/[a-z0-9-]+\.webp$/.test(entry.path)) throw new Error(`Unknown artwork: ${id}`);
    return entry;
  }
  function img(id, className = '', alt = '') {
    const a = asset(id);
    return `<img class="${escape(className)}" data-art="${escape(id)}" src="./${a.path}" width="${a.width}" height="${a.height}" alt="${escape(alt)}" decoding="async" draggable="false">`;
  }
  // Category sharing is intentional. These are presentation IDs, never new items.
  const equipment = Object.freeze({
    'iron-sword':'sword','spirit-saber':'blade','jade-spear':'spear','star-bow':'spear',
    'thunder-hammer':'blade','frost-blade':'blade','spirit-mirror':'orb','jade-bell':'pendant',
    'compass':'orb','soul-lamp':'bottle','thunder-seal':'talisman','dao-scroll':'scroll',
    'hemp-robe':'robe','cloud-robe':'robe','scale-mail':'robe','star-cloak':'hat',
    'thunder-vest':'robe','void-robe':'robe','jade-ring':'ring','beast-tooth':'pendant',
    'spirit-bead':'orb','fate-knot':'pendant','eye-charm':'pendant','dao-pin':'pendant',
    'azure-embryo':'sword','thunder-edge':'sword','heaven-rend':'sword',
    'devour-embryo':'talisman','taotie-banner':'talisman','world-eater-banner':'talisman',
    'mountain-embryo':'spear','earth-pillar':'spear','sky-bearing-staff':'spear'
  });
  const pills = Object.freeze({qi:'pill',spring:'bottle',blood:'blood-pill',mind:'purple-bottle',sword:'pill',body:'blood-pill',fortune:'pill',void:'orb',thunder:'orb',star:'pill'});
  const materials = Object.freeze({'spirit-herb':'herb','beast-bone':'white-stone','spirit-dew':'dew','thunder-sand':'gold','star-iron':'iron','blood-essence':'berry','void-dust':'purple-crystal','dao-ash':'stone'});
  function item(kind, id, identified = true) {
    if (!identified) return 'item.chest';
    const map = kind === 'equipment' ? equipment : kind === 'pills' ? pills : materials;
    if (!map[id]) throw new Error(`Missing ${kind} artwork mapping: ${id}`);
    return `item.${map[id]}`;
  }
  function utility(button) {
    return `<div class="v3-utility">${button('audio-settings',img('icon.audio'),{ui:true,classes:'v3-icon-button',aria:'音景设置'})}${button('settings',img('icon.settings'),{ui:true,classes:'v3-icon-button',aria:'存档与设置'})}</div>`;
  }
  function title(button, eyebrow, name, extra = '') {
    return `<header class="v3-page-head"><div><small>${escape(eyebrow)}</small><h2>${escape(name)}</h2>${extra}</div>${utility(button)}</header>`;
  }
  const cameras = new Map();
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function cameraGeometry(width, height, designWidth, designHeight, zoom = 1, focusY = .5) {
    const scale = Math.max(width / designWidth, height / designHeight) * clamp(zoom, 1, 2.5);
    return { scale, x:(width-designWidth*scale)/2, y:clamp(height/2-designHeight*focusY*scale,height-designHeight*scale,0) };
  }
  // Artwork AND landmarks share one camera transform. Button labels on the map
  // counter-scale so zoom never makes their CSS-pixel hit targets too small.
  function bindCamera(rootNode, options) {
    const viewport = rootNode.querySelector?.(options.viewport);
    const canvas = viewport?.querySelector('.v3-art-canvas');
    if (!viewport || !canvas) return;
    const saved = cameras.get(options.id);
    let zoom = saved?.zoom || 1, panX = saved?.panX || 0, panY = saved?.panY || 0, drag = null, geometry;
    function paint() {
      const r = viewport.getBoundingClientRect();
      if (!r.width || !r.height) return;
      geometry = cameraGeometry(r.width,r.height,704,1408,zoom,options.focusY ?? .5);
      const contain=options.containOnShort&&r.height<570;
      if(contain){geometry.scale=Math.min(r.width/704,r.height/1408);geometry.x=(r.width-704*geometry.scale)/2;geometry.y=0;}
      const x = contain?geometry.x:clamp(geometry.x+panX,r.width-704*geometry.scale,0);
      const y = contain?geometry.y:clamp(geometry.y+panY,r.height-1408*geometry.scale,0);
      canvas.style.transform = `translate(${x}px,${y}px) scale(${geometry.scale})`;
      canvas.style.setProperty('--camera-scale',geometry.scale);
      viewport.dataset.cameraScale = String(geometry.scale);
      viewport.dataset.cameraReady = 'true';
      cameras.set(options.id,{zoom,panX,panY});
    }
    function down(event) {
      if (!options.interactive || event.target.closest('button') || event.button > 0) return;
      drag = {x:event.clientX,y:event.clientY,panX,panY,id:event.pointerId};
      viewport.setPointerCapture(event.pointerId);
    }
    function move(event) {
      if (!drag || drag.id !== event.pointerId) return;
      panX=drag.panX+event.clientX-drag.x; panY=drag.panY+event.clientY-drag.y; paint();
    }
    function up() { drag=null; }
    function control(event) {
      const button=event.target.closest('[data-camera]'); if (!button) return;
      if(button.dataset.camera==='overview'){const expanded=viewport.closest('.v3-world-window').classList.toggle('is-overview');button.textContent=expanded?'路线':'全图';zoom=1;panX=panY=0;}
      else if(button.dataset.camera==='reset'){zoom=1;panX=panY=0;}
      else zoom=clamp(zoom+(button.dataset.camera==='in'?.25:-.25),1,2.5);
      paint();
    }
    const observer = typeof root.ResizeObserver === 'function' ? new root.ResizeObserver(paint) : null;
    observer?.observe(viewport); root.addEventListener?.('resize',paint);
    if(options.interactive){viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);rootNode.addEventListener('click',control);}
    paint();
    return () => { observer?.disconnect();root.removeEventListener?.('resize',paint);viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',up);rootNode.removeEventListener?.('click',control); };
  }
  if (root.document) root.document.addEventListener('error', event => {
    const image=event.target;
    if(image?.tagName !== 'IMG' || !image.dataset.art) return;
    image.classList.add('v3-art-failed');
    image.parentElement?.setAttribute('data-art-fallback','true');
    // Labels and real actions remain usable; a failed decorative image does not
    // manufacture another URL, fetch external assets, or mutate the save.
  },true);
  root.FSArt=Object.freeze({asset,img,item,utility,title,bindCamera,cameraGeometry,equipment,pills,materials,runtimeIds});
})(typeof globalThis !== 'undefined' ? globalThis : this);
