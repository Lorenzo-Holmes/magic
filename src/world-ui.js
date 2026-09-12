(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.FSWorld);if(typeof module==='object'&&module.exports)module.exports=api;else root.FSWorldUI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(W){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const delta=n=>(n>0?'+':'')+n;
  function setup(run,button){
    if(!W.canCreate(run))return '<p class="intro">完成仙界正式结局后，第三卷才会允许建立一方天地。</p>';
    const defaults=W.defaults();
    return '<p class="eyebrow">第三篇 · 证道</p><p class="intro">五条法则将决定众生修行、天地灾劫与道统传承。创世后法则锁定；接下来不是三段短演示，而是一条有限的众生史，直到第一位飞升者出现并由你亲自选择证道终局。</p><div class="world-config">'+Object.entries(W.OPTIONS).map(([key,items])=>'<label><b>'+esc(W.LABELS[key])+'</b><select data-world-config="'+key+'" aria-label="'+esc(W.LABELS[key])+'">'+items.map(o=>'<option value="'+o.id+'"'+(o.id===defaults[key]?' selected':'')+'>'+esc(key==='dao'?W.sourceName(run):o.name)+'</option>').join('')+'</select><small>'+items.map(o=>esc(o.name)+'：'+esc(o.text)).join('<br>')+'</small></label>').join('')+'</div>'+button('world-create','立此五法 · 开辟天地',{classes:'primary full'})+'<p class="footnote">跨卷只读取仙界正式结局留下的法则与五槽摘要，不复制第二卷资源、日志或随机流。</p>';
  }
  function view(s,button){
    const e=W.event(s),rows=W.ruleSummary(s),formal=!!(s.story&&!s.story.sandbox),ending=s.story?.ending?W.ENDINGS.find(x=>x.id===s.story.ending):null;
    let content='';
    if(e){
      const progress=e.story?`众生史 · ${e.index} / ${e.total}`:`本纪第 ${s.cursor+1} 段 · 共三段`;
      content='<article class="event-sheet creation-event" data-world-event="'+e.type+'"><span class="eyebrow">'+esc(progress)+'</span><h3 class="event-title">'+esc(e.title)+'</h3><p class="story-lead">'+esc(e.text)+'</p><div class="event-choices">'+e.choices.map((c,i)=>button('world-resolve',esc(c.name)+'<span class="button-note">生机 '+delta(c.vitality)+' · 秩序 '+delta(c.order)+' · '+esc(c.text)+'</span>',{id:c.id,classes:(i===0?'primary':'secondary')+' full'})).join('')+'</div></article>';
    }else if(s.phase==='ending-choice'){
      content='<article class="event-sheet creation-ending-choice"><span class="eyebrow">第三篇终局 · 由你选择</span><h3 class="event-title">众生已经能自己抬头看天。</h3><p class="story-lead">生机与秩序只描述这个世界走过的路，不替你决定答案。现在明确选择：天道究竟要留下什么。</p><div class="dao-ending-grid">'+W.endingChoices(s).map((item,i)=>button('world-ending','<b>'+esc(item.name)+'</b><span class="button-note">'+esc(item.text)+'</span>',{id:item.id,classes:(i===0?'primary':'secondary')+' full'})).join('')+'</div></article>';
    }else if(formal&&s.phase==='ending'){
      content='<article class="event-sheet creation-ending"><span class="eyebrow">第三篇完 · 证道</span><h3 class="event-title">'+esc(ending?.name||'证道终局')+'</h3><p class="story-lead">'+esc(W.conclusion(s))+'</p>'+button('world-continue','续写下一纪 · 后日谈',{classes:'secondary full'})+'</article>';
    }else{
      content='<article class="event-sheet creation-ending"><span class="eyebrow">后日谈 · 本纪归卷</span><h3 class="event-title">天地仍在继续。</h3><p class="story-lead">'+esc(W.conclusion(s))+'</p>'+button('world-continue','续写下一纪',{classes:'primary full'})+'</article>';
    }
    const heading=formal?'第三篇 · 证道':s.story?.sandbox?'证道后日谈 · 第 '+esc(s.era)+' 纪':'我即天道 · 第 '+esc(s.era)+' 纪';
    return '<section class="creation-view world-phase-'+esc(s.phase)+'"><div class="creation-head"><span class="eyebrow">'+heading+'</span><h2>'+esc(W.name(s))+'</h2><p>'+(formal?'从第一位感灵者开始，看众生把一方天地真正活成自己的世界。':'你曾仰望的天地，如今正从掌心生长。')+'</p></div><div class="world-vitals"><div><span>天地生机</span><b>'+s.vitality+' <small>/ 100</small></b><meter min="0" max="100" value="'+s.vitality+'" aria-label="天地生机"></meter></div><div><span>众生秩序</span><b>'+s.order+' <small>/ 100</small></b><meter min="0" max="100" value="'+s.order+'" aria-label="众生秩序"></meter></div></div>'+content+
    '<section class="world-projection"><span class="eyebrow">古史 · 跨卷道源</span><h3>'+esc(s.projection.name)+'</h3><p>'+esc(s.projection.summary)+'</p></section><details class="world-laws"><summary>此界五法</summary>'+rows.map(r=>'<div><span>'+esc(r.label)+'</span><b>'+esc(r.name)+'</b><p>'+esc(r.text)+'</p></div>').join('')+'</details><details class="world-history"><summary>天地史册 · 最近 '+s.history.length+' 段</summary><ol>'+s.history.slice().reverse().map(r=>'<li><small>第 '+esc(r.era)+' 纪</small><b>'+esc(r.title)+'</b><p>'+esc(r.choice)+' · 生机 '+r.before.vitality+' → '+r.after.vitality+' · 秩序 '+r.before.order+' → '+r.after.order+'</p></li>').join('')+'</ol></details>'+button('world-return',s.story?'回故事总卷':'返回仙界行旅',{ui:true,classes:'secondary full'})+'</section>';
  }
  return Object.freeze({setup,view});
});
