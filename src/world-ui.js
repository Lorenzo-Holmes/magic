(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.FSWorld);if(typeof module==='object'&&module.exports)module.exports=api;else root.FSWorldUI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(W){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const delta=n=>(n>0?'+':'')+n;
  function setup(run,button){
    if(!W.canCreate(run))return '<p class="intro">完成仙界正式结局，并在「大道争锋」凝成此世大道后，即可建立一方天地。</p>'+button('dao','查看此世大道',{ui:true,classes:'secondary full'});
    const defaults=W.defaults();
    return '<p class="intro">五条法则将决定众生修行、天地灾劫与道统传承。创世后法则锁定，世界的后续选择由你继续书写。</p><div class="world-config">'+Object.entries(W.OPTIONS).map(([key,items])=>'<label><b>'+esc(W.LABELS[key])+'</b><select data-world-config="'+key+'" aria-label="'+esc(W.LABELS[key])+'">'+items.map(o=>'<option value="'+o.id+'"'+(o.id===defaults[key]?' selected':'')+'>'+esc(key==='dao'?run.dao.formed.name:o.name)+'</option>').join('')+'</select><small>'+items.map(o=>esc(o.name)+'：'+esc(o.text)).join('<br>')+'</small></label>').join('')+'</div>'+button('world-create','立此五法 · 开辟天地',{classes:'primary full'})+'<p class="footnote">凡界与仙界成就继续保留。你的大道将成为一条古史投影，供后来者追寻。</p>';
  }
  function view(s,button){
    const e=W.event(s),rows=W.ruleSummary(s);
    return '<section class="creation-view"><div class="creation-head"><span class="eyebrow">我即天道 · 第 '+esc(s.era)+' 纪</span><h2>'+esc(W.name(s))+'</h2><p>你曾仰望的天地，如今正从掌心生长。</p></div><div class="world-vitals"><div><span>天地生机</span><b>'+s.vitality+' <small>/ 100</small></b><meter min="0" max="100" value="'+s.vitality+'" aria-label="天地生机"></meter></div><div><span>众生秩序</span><b>'+s.order+' <small>/ 100</small></b><meter min="0" max="100" value="'+s.order+'" aria-label="众生秩序"></meter></div></div>'+
    (e?'<article class="event-sheet creation-event" data-world-event="'+e.type+'"><span class="eyebrow">本纪第 '+(s.cursor+1)+' 段 · 共三段</span><h3 class="event-title">'+esc(e.title)+'</h3><p class="story-lead">'+esc(e.text)+'</p><div class="event-choices">'+e.choices.map((c,i)=>button('world-resolve',esc(c.name)+'<span class="button-note">生机 '+delta(c.vitality)+' · 秩序 '+delta(c.order)+' · '+esc(c.text)+'</span>',{id:c.id,classes:(i===0?'primary':'secondary')+' full'})).join('')+'</div></article>':
    '<article class="event-sheet creation-ending"><span class="eyebrow">创世已成 · 本纪归卷</span><h3 class="event-title">我即天道。</h3><p class="story-lead">'+esc(W.conclusion(s))+'</p>'+button('world-continue','续写下一纪',{classes:'primary full'})+'</article>')+
    '<section class="world-projection"><span class="eyebrow">古史 · 功法源头</span><h3>'+esc(s.projection.name)+'</h3><p>'+esc(s.projection.summary)+'</p></section><details class="world-laws"><summary>此界五法</summary>'+rows.map(r=>'<div><span>'+esc(r.label)+'</span><b>'+esc(r.name)+'</b><p>'+esc(r.text)+'</p></div>').join('')+'</details><details class="world-history"><summary>天地史册 · 最近 '+s.history.length+' 段</summary><ol>'+s.history.slice().reverse().map(r=>'<li><small>第 '+esc(r.era)+' 纪</small><b>'+esc(r.title)+'</b><p>'+esc(r.choice)+' · 生机 '+r.before.vitality+' → '+r.after.vitality+' · 秩序 '+r.before.order+' → '+r.after.order+'</p></li>').join('')+'</ol></details>'+button('world-return','返回仙界行旅',{ui:true,classes:'secondary full'})+'</section>';
  }
  return Object.freeze({setup,view});
});
