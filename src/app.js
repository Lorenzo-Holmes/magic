(function () {
  'use strict';
  const D = window.FSData, E = window.FSEngine, S = window.FSScenes, M = window.FSMeta, F = window.FSFormat, P = window.FSPresentation;
  const world = S.attach(document.getElementById('world'));
  const sound = window.FSAudio.create();
  window.FSSound = sound; // Readable audio diagnostics; no gameplay state is exposed.
  const KEY = 'feisheng.run.v1', BACKUP = 'feisheng.backup.v1', META_KEY = 'feisheng.meta.v1';
  const app = document.getElementById('app');
  const notice = document.getElementById('notice');
  const feedbackLayer = document.createElement('div');
  feedbackLayer.className = 'feedback-layer'; feedbackLayer.setAttribute('aria-hidden', 'true'); document.body.appendChild(feedbackLayer);
  const majorLayer = document.createElement('div');
  majorLayer.className = 'major-event-layer'; majorLayer.setAttribute('aria-hidden', 'true'); document.body.appendChild(majorLayer);
  const dialog = document.createElement('dialog');
  dialog.className = 'scroll-dialog'; dialog.setAttribute('aria-label', '命册与设置'); document.body.appendChild(dialog);
  let state = null, meta = M.createMeta(), home = true, mortalSummary = false, runStorageWarning = '', metaStorageWarning = '', noticeTimer, majorTimer, previousView = '', pendingImport = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = value => Number(value || 0).toLocaleString('zh-CN');
  const find = (items, id) => items.find(item => item.id === id);
  const remaining = () => 20 - Object.values(state.stats).reduce((a, b) => a + b, 0);
  const warningText = () => [runStorageWarning, metaStorageWarning].filter(Boolean).join(' ');
  function announce(text, visible = true) {
    notice.textContent = text; notice.classList.toggle('visible', visible); clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.remove('visible'), 4500);
  }
  function showFeedback(value) {
    if (!value) return;
    for (const item of value.rewards || []) {
      const node = document.createElement('div');
      node.className = `reward-toast reward-${item.tone || 'growth'}`;
      node.innerHTML = `<span>${esc(item.label)}</span><b>${esc(item.value)}</b>`;
      feedbackLayer.appendChild(node);
      while (feedbackLayer.children.length > 4) feedbackLayer.firstElementChild?.remove();
      setTimeout(() => node.remove(), 1350);
    }
    if (!value.major) return;
    clearTimeout(majorTimer);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const major = value.major;
    majorLayer.dataset.kind = major.kind;
    majorLayer.innerHTML = `<div class="major-event-card"><span>${esc(major.eyebrow)}</span><strong>${esc(major.title)}</strong><small>${esc(major.subtitle)}</small></div>`;
    majorLayer.classList.add('visible');
    const close = () => { majorLayer.classList.remove('visible'); majorLayer.replaceChildren(); delete majorLayer.dataset.kind; };
    if (reduced) { close(); return; }
    majorTimer = setTimeout(close, Math.max(1500, Math.min(3000, major.duration || 1900)));
  }
  // Browser QA can inspect the presentation shell without exposing gameplay mutation hooks.
  window.FSPresentationUI = Object.freeze({ diagnostics: () => ({ rewardToasts: feedbackLayer.children.length, majorVisible: majorLayer.classList.contains('visible'), majorKind: majorLayer.dataset.kind || null }) });
  function save() {
    try { localStorage.setItem(KEY, E.serialize(state)); runStorageWarning = ''; }
    catch { runStorageWarning = '浏览器未允许保存。请在「命册」中导出存档，关闭页面后进度可能丢失。'; }
  }
  function saveMeta() {
    try { localStorage.setItem(META_KEY, M.serialize(meta)); metaStorageWarning = ''; }
    catch { metaStorageWarning = '轮回册暂时无法写入；本世仍可继续，但图谱与道痕可能在关闭页面后丢失。'; }
  }
  function persist() {
    save();
    meta = M.observe(meta, state);
    saveMeta();
  }
  try { const raw = localStorage.getItem(META_KEY); if (raw) meta = M.deserialize(raw); }
  catch { meta = M.createMeta(); metaStorageWarning = '轮回册损坏或存储不可用，已保留本世存档并重建空白图谱。'; }
  try { const raw = localStorage.getItem(KEY); if (raw) state = E.deserialize(raw); }
  catch { runStorageWarning = '旧存档无法读取或存储不可用。原数据未被删除；可先在设置中导出原始存档。'; }
  if (state) {
    // If the browser stopped after the new-life save succeeded but before the
    // ledger cleared its one-use mark, reconcile the two local keys once.
    meta = M.reconcile(meta, state);
    meta = M.observe(meta, state);
    saveMeta();
  }
  function button(action, label, options = {}) {
    const { id, choice, kind, delta, disabled = false, classes = '', ui = false, aria = '', pressed } = options;
    const attrs = `${id ? ` data-id="${esc(id)}"` : ''}${choice ? ` data-choice="${esc(choice)}"` : ''}${kind ? ` data-kind="${esc(kind)}"` : ''}${delta ? ` data-delta="${delta}"` : ''}`;
    return `<button type="button" class="${classes}" data-${ui ? 'ui' : 'action'}="${action}"${attrs}${state ? ` data-revision="${state.revision}"` : ''}${aria ? ` aria-label="${esc(aria)}"` : ''}${pressed !== undefined ? ` aria-pressed="${pressed}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
  }
  const small = text => `<span class="button-note">${esc(text)}</span>`;
  function powerFigure(value) {
    return button('number-detail', esc(F.short(value)), { ui: true, id: String(value), classes: 'number-button', aria: `战力 ${F.full(value)}，查看完整数字` });
  }
  function quantityFigure(q) {
    return button('quantity-detail', esc(window.FSQuantity.format(q)), { ui: true, id: `${q.m}|${q.e}`, classes: 'number-button cosmic-number', aria: '查看势能的科学计数表示' });
  }
  function tutorialNote() {
    if (home || !state || meta.tutorialHidden || meta.totals.ascended > 0) return '';
    const id = state.phase === 'talents' ? 'talents' : state.event?.id === 'first-python' ? 'python'
      : state.phase === 'fusion' ? 'fusion' : state.phase === 'tribulation' ? 'tribulation'
      : state.phase === 'playing' && state.flags.pythonSeen ? 'path' : null;
    if (!id || (meta.tutorialSeen || []).includes(id)) return '';
    const notes = {
      talents: '高品质不一定适合这一世。天命、属性、异变与融合之间能否相互成就，比单张品质更重要。',
      python: '现在的你不可能赢。先活下来；筑基以后它仍然是 150 战力，变强的会是你。',
      path: '「本世道途」不是锁定的职业。它解释你的真实选择；连续闭关只修炼，突破与事件仍由你决定。',
      fusion: '融合会保留这次异变对应的进化方向。选择后继续经历机缘，再用这一世的能力面对三眼妖王。',
      tribulation: '三重天劫逐一选择。融合路线最稳定；专属路线可以留下不同称号。先看当前胜率，不必硬渡。'
    };
    return `<aside class="tutorial-note" data-note="${id}" aria-label="命册批注"><span>命册批注</span><p>${notes[id]}</p><div>${button('dismiss-note', '记下了', { ui: true, id, classes: 'text-button' })}${button('tutorial-off', '关闭批注', { ui: true, classes: 'text-button' })}</div></aside>`;
  }
  function ornament() {
    return `<div class="dao-art" aria-hidden="true"><div class="dao-ring"></div><div class="dao-ring second"></div><span class="dao-glyph">升</span><i class="star s1"></i><i class="star s2"></i><i class="star s3"></i><span class="seal">逆天<br>而行</span></div>`;
  }
  function mountain() {
    return `<svg class="mountains" viewBox="0 0 560 210" aria-hidden="true"><path d="M0 175 52 137 75 148 150 37 201 96 240 76 290 131 337 94 383 143 445 66 516 149 560 123V210H0Z" fill="currentColor" opacity=".20"/><path d="M0 198 105 143 129 171 217 96 240 130 273 113 327 181 402 141 456 183 520 144 560 178V210H0Z" fill="currentColor" opacity=".33"/><path d="m106 112 44-75 19 86m48-27 19 56m166-41 43-45 21 59" fill="none" stroke="currentColor" opacity=".4"/></svg>`;
  }
  function rail() {
    const level = state ? state.realm : 0;
    return `<aside class="story-rail"><div class="rail-heading"><span class="seal small-seal">道</span><span>一卷命册 · 万般道途</span></div><h1>我欲<br><em>飞升</em></h1><p class="rail-poem">山外有山，天外有天。<br>此刻不可撼动的庞然大物，<br>终有一日，只是你的一口修为。</p>${ornament()}<div class="road"><span class="${level >= 0 ? 'lit' : ''}">凡</span><i></i><span class="${level >= 2 ? 'lit' : ''}">筑基</span><i></i><span class="${level >= 3 ? 'lit' : ''}">金丹</span><i></i><span class="${level >= 5 ? 'lit' : ''}">化神</span><i></i><span class="${level >= 8 ? 'lit' : ''}">大乘</span><i></i><span class="${state?.flags?.ascended ? 'lit' : ''}">飞升</span></div><p class="rail-foot">凡界卷 · 直到天门洞开<br>飞升是终点，也是下一池塘的起点。</p>${mountain()}</aside>`;
  }
  function header() {
    return `<header class="topbar">${button('home', '<span class="brand-mark">升</span><span>我欲飞升</span>', { ui: true, classes: 'brand', aria: '返回首页，不删除进度' })}<span class="chapter-badge">${state?.immortal && !home && !mortalSummary ? '仙界 · 进化篇' : '凡界 · 轮回篇'}</span><div class="topbar-actions">${button('audio-settings', '音景', { ui: true, classes: 'text-button', aria: '音乐、音效与音量设置' })}${button('codex', '图谱', { ui: true, classes: 'text-button' })}${button('journal', '命册', { ui: true, classes: 'text-button' })}</div></header>`;
  }
  function metaStrip() {
    const summary = M.summary(meta), trace = summary.nextTrace;
    return `<div class="meta-strip"><div><span>轮回已录</span><b>${summary.ended} 世 · ${summary.ascended} 次飞升</b></div><div><span>命途图谱</span><b>${summary.discovered} / ${summary.total}</b></div><div><span>下一世道痕</span><b>${trace ? esc(trace.name) : '尚未凝练'}</b></div></div>`;
  }
  function homeView() {
    const text = state ? `${state.immortal ? `仙界 · 第 ${state.immortal.days} 日` : ['talents', 'attributes'].includes(state.phase) ? '命数未定' : `${D.REALMS[state.realm].name} · ${state.age} 岁`} · 本地存档` : '无须登录 · 文字修仙 · 单人离线';
    const inherited = meta.nextTrace ? find(D.TRACES, meta.nextTrace) : null;
    return `<section class="home-view"><p class="eyebrow">文字修仙 · 吞噬进化 · 轮回道痕</p><div class="mobile-art">${ornament()}</div><h2 class="home-title">命由天定。<br><em>道，由我吞。</em></h2><p class="home-copy">从凡人吞掉旧敌，再到仙界吞掉曾经不敢碰的虫。<br>飞升不是清空；走完一世，还能给下一世留下一道痕。</p>${inherited ? `<div class="inheritance-call"><span>下一世将继承</span><b>${esc(inherited.name)}</b><p>${esc(inherited.description)}</p></div>` : ''}<div class="home-actions">${state ? button('continue', `续写此生${small(text)}`, { ui: true, classes: 'primary large', aria: '继续已有存档' }) : button('new', `此生，从何而起？${small(inherited ? `携「${inherited.name}」入世` : '窥探天命 · 此世可至飞升')}`, { ui: true, classes: 'primary large' })}${state ? button('new', inherited ? `转世 · 携「${esc(inherited.name)}」再活一世` : '再活一世', { ui: true, classes: 'secondary' }) : ''}</div>${metaStrip()}<div class="chapter-note"><span>轮 回</span><div><strong>一世一痕</strong><p>飞升或陨落后，从这一世真实走成的道中凝练一枚道痕。它只服务下一世，不永久堆叠战力。</p></div></div><div class="home-bottom"><span>${state ? esc(text) : '不充值 · 无广告 · 无外部资源'}</span><span>${button('codex', '命途图谱', { ui: true, classes: 'text-button' })}${button('settings', '存档与说明', { ui: true, classes: 'text-button' })}</span></div></section>`;
  }
  function talentCard(t, mode) {
    const selected = mode === 'select' && state.selected.includes(t.id);
    const label = `<div class="talent-meta"><span>${t.exclusiveTrace ? '前世 · ' : ''}${esc(t.path)}</span><span class="rarity">${D.RARITIES[t.rarity].name}品</span></div><h3>${esc(t.name)}</h3><p>${esc(t.description)}</p><span class="card-bottom">${mode === 'pick' ? '择此道 →' : selected ? '已纳入命格 ✓' : '点选此命'}</span>`;
    return button(mode, label, { id: t.id, classes: `talent rarity-${t.rarity}${selected ? ' selected' : ''}`, pressed: mode === 'select' ? selected : undefined, aria: `${t.name}，${D.RARITIES[t.rarity].name}品。${t.description}${selected ? ' 已选择' : ''}` });
  }
  function talentsView() {
    const inherited = find(D.TRACES, state.carriedTrace);
    return `<section><p class="eyebrow">第一步 · 窥探天命</p><div class="section-heading"><h2>此生命数，<br><em>择三而行。</em></h2><span class="count"><b>${state.selected.length}</b> / 3</span></div><p class="intro">八道先天气运，选择三道。品质并非唯一答案，能相互成就的天命更重要。</p>${inherited ? `<div class="trace-banner"><span>前世道痕 · ${esc(inherited.path)}</span><b>${esc(inherited.name)}</b><p>本次八选三固定出现「${esc(find(D.TALENTS, inherited.talentId).name)}」。它是可拒绝的玄品前世天命，占正常选择位；重抽仍保留这一张。</p></div>` : ''}<div class="talent-grid">${state.offer.map(id => talentCard(find(D.TALENTS, id), 'select')).join('')}</div><div class="setup-actions">${button('reroll-opening', `再窥天命 · 余 ${state.openingRerolls} 次`, { classes: 'secondary', disabled: !state.openingRerolls })}${button('confirm-talents', `命已择定 →`, { classes: 'primary', disabled: state.selected.length !== 3 })}</div><p class="footnote">重抽会清空本次选择。每局至少一张玄品以上；前世天命只在携对应道痕时出现，不会进入普通随机池。</p></section>`;
  }
  function attributesView() {
    return `<section><p class="eyebrow">第二步 · 塑骨凝神</p><div class="section-heading"><h2>命有定数。<br><em>人却未必。</em></h2><span class="count"><b>${remaining()}</b><small>待分配</small></span></div><p class="intro">共 20 点，每项 1～10 点。先天天命加成将在入世后叠加，不占这 20 点。</p><div class="preset-row">${[['balanced', '均衡'], ['body', '肉身'], ['sage', '悟道'], ['lucky', '气运']].map(([id, name]) => button('preset', name, { id, classes: 'chip' })).join('')}</div><div class="attributes">${D.STATS.map(stat => `<div class="attribute-row"><div><h3>${stat.name}</h3><p>${stat.note}</p></div><div class="stepper">${button('stat', '−', { id: stat.id, delta: -1, disabled: state.stats[stat.id] <= 1, aria: `减少${stat.name}` })}<output aria-label="${stat.name}点数">${state.stats[stat.id]}</output>${button('stat', '+', { id: stat.id, delta: 1, disabled: state.stats[stat.id] >= 10 || !remaining(), aria: `增加${stat.name}` })}</div></div>`).join('')}</div><div class="chosen-line"><span>先天气运</span>${state.innate.map(id => `<b class="rarity-${find(D.TALENTS, id).rarity}">${find(D.TALENTS, id).name}</b>`).join('')}</div>${button('enter', `入世${small('灵根与出身将在此刻显现')}`, { classes: 'primary large full', disabled: remaining() !== 0 })}</section>`;
  }
  function hud() {
    const r = D.REALMS[state.realm], xp = r.threshold ? Math.min(100, state.xp / r.threshold * 100) : 100;
    const full = !!r.threshold && state.xp >= r.threshold;
    const proofMissing = state.realm >= 4 && state.realm <= 8 && !state.realmProofs.includes(state.realm);
    const stage = state.realm === 0 ? '未入仙途'
      : state.realm === 2 && !state.flags.pythonSlain ? '因果未了'
      : state.realm === 3 && !state.flags.bossSlain ? '妖王未伏'
      : full && proofMissing ? '待天地印证'
      : full ? '待突破'
      : state.xp / r.threshold < .34 ? '初期' : state.xp / r.threshold < .67 ? '中期' : '后期';
    const meterTitle = state.realm === 2 && !state.flags.pythonSlain ? '筑基修为 · 赤鳞因果待了'
      : state.realm === 3 && !state.flags.bossSlain ? '金丹修为 · 为妖王一战蓄势'
      : proofMissing ? `${r.name}修为 · 尚欠一次天地印证`
      : state.realm >= 4 ? `${r.name}修为 · 天地印证已成` : '修为';
    return `<section class="status-panel realm-focus" aria-label="人物状态"><div class="realm-line"><div><span class="eyebrow">当前境界</span><h2>${r.name}<small>${stage}</small></h2></div><div class="power"><span>此世战力</span><strong id="power-value">${powerFigure(E.power(state))}</strong></div></div><div class="meter-label"><span>${meterTitle}</span><b>${fmt(state.xp)} / ${fmt(r.threshold)}</b></div><div class="meter" role="progressbar" aria-label="修为" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(xp)}"><i style="width:${xp}%"></i></div><div class="life-row"><span>寿元 <b>${state.age} / ${E.maxAge(state)}</b> 岁</span><span class="${state.vitality < 40 ? 'danger-text' : ''}">元气 <b>${state.vitality} / 100</b></span></div></section>`;
  }
  function pathBanner() {
    const profile = M.classifyPath(state);
    if (!profile.id) return '';
    return `<section class="path-banner" aria-label="本世道途"><div><span>本世道途 · ${esc(profile.stage)}</span><b>${esc(profile.name)}</b></div><p>${profile.signals.map(esc).join(' · ') || '当前倾向仍在形成'}</p><small>${esc(profile.next)}</small>${button('codex', '查看图谱', { ui: true, classes: 'text-button' })}</section>`;
  }
  function enemyView(enemy, first = false, revenge = false) {
    const t = E.threat(state, enemy), p = E.power(state, enemy);
    return `<div class="enemy-card ${revenge ? 'prey' : ''}"><div class="enemy-top"><span>${first ? '不可招惹' : revenge ? '旧敌重逢' : enemy.beast ? '妖兽踪迹' : '不速之客'}</span><b class="${t.ratio < .85 ? 'danger-text' : 'gold-text'}">${t.label}</b></div><h3>${enemy.name}</h3><p>${enemy.text}</p><div class="versus"><div><small>敌方战力</small><strong>${fmt(enemy.power)}</strong></div><span>对</span><div><small>你的有效战力</small><strong>${fmt(p)}</strong></div></div>${first ? '<p class="enemy-note">战力悬殊，先活下来。记住它，不必此刻逞强。</p>' : revenge ? `<p class="enemy-note">初见时你的战力是 ${fmt(state.firstPower)}。<br>它没有变强。你已经不是当年的你。</p>` : `<p class="enemy-note">${t.ratio >= 2 ? '碾压必胜，不损失元气。' : t.ratio < .55 ? '不可挑战；可以无伤避开。' : `预计胜率 ${Math.round(t.chance * 100)}% · 可能负伤，元气耗尽会死亡。`}</p>`}</div>`;
  }
  function eventView() {
    const event = state.event || { id: 'quiet', title: '道途未尽', text: '选择你的下一步。' }, python = find(D.ENEMIES, 'python');
    let title = event.title || '黑风岭', body = '', choices = '';
    if (event.id === 'first-python') {
      title = '山路尽头，一身赤鳞。'; body = enemyView(python, true);
      choices = button('resolve', '藏入石隙，避其锋芒', { choice: 'flee', classes: 'secondary full' });
      if (E.stats(state).mind >= 8) choices += button('resolve', `辨识退路${small('神识 ≥ 8 · 从容离开')}`, { choice: 'observe', classes: 'primary full' });
    } else if (event.id === 'revenge') {
      title = '还是那条妖蟒。'; body = `<p class="story-lead">它盘踞山路的姿势，与当年毫无分别。<br>只是这一次，你没有停下脚步。</p>${enemyView(python, false, true)}`;
      choices = button('resolve', `吞了它${small('碾压必胜 · 夺取首次异变')}`, { choice: 'devour', classes: 'primary full large' }) + button('resolve', '一掌镇杀，再取遗蜕', { choice: 'kill', classes: 'text-button full' });
    } else if (event.id === 'remains') {
      title = '赤鳞落地，因果未散。'; body = '<p class="story-lead">妖蟒已死，遗蜕中的妖血还未冷却。<br>现在，将这份力量化为己用。</p>';
      choices = button('resolve', '炼化遗蜕 · 夺取异变', { choice: 'devour', classes: 'primary full' });
    } else if (event.id === 'trace-echo' || event.id === 'trace-resonance') {
      const trace = find(D.TRACES, event.trace), passage = event.id === 'trace-echo' ? trace?.echo : trace?.resonance;
      title = `${trace.name} · ${passage.title}`;
      body = `<div class="trace-event"><span>${event.id === 'trace-echo' ? '前世回响 · 黑风岭' : '道痕共鸣 · 元婴初成'}</span><p>${esc(passage.text)}</p><small>这段回响不直接增加战力，只让上一世与这一世产生一次可见联系。</small></div>`;
      choices = button('resolve', `${esc(passage.choice)}${small('记住此痕 · 继续今生')}`, { choice: 'remember', classes: 'trace-route full' });
    } else if (event.id === 'hunt') {
      const enemy = find(D.ENEMIES, event.enemy), t = E.threat(state, enemy);
      title = '狩猎 · 山中有物'; body = enemyView(enemy);
      choices = button('resolve', '收敛气息，离开', { choice: 'flee', classes: 'secondary full' });
      if (t.ratio >= .55) {
        choices += button('resolve', t.ratio >= 2 ? '一念镇杀' : '迎战', { choice: 'fight', classes: 'secondary full' });
        if (enemy.beast && state.flags.pythonSeen) choices += button('resolve', `吞噬${small(t.ratio >= 2 ? '必胜 · 不损元气' : '先战斗后吞噬 · 可能负伤')}`, { choice: 'devour', classes: 'primary full' });
      }
    } else if (event.id === 'ruin') {
      title = '石门之后'; body = '<p class="story-lead">荒草掩着半座洞府。<br>灵气从石门缝隙中缓缓逸出，门上阵纹却未完全熄灭。</p>';
      choices = button('resolve', E.stats(state).mind >= 8 ? `神识探查 · 看破阵眼${small('神识达到 8 · 更多修为，无伤')}` : `谨慎探查${small('少量修为，无伤')}`, { choice: 'probe', classes: 'primary full' }) + button('resolve', `肉身破阵${small('更多修为 · 消耗元气，可能死亡')}`, { choice: 'force', classes: 'secondary full' }) + button('resolve', '记下位置，离开', { choice: 'leave', classes: 'text-button full' });
    } else if (event.id === 'swordsman') {
      title = '残剑有灵'; body = '<p class="story-lead">白骨旁立着一柄断剑。<br>你伸手时，一缕即将消散的残魂问：<br>「后来者，你可愿代我，再看一眼青云？」</p>';
      choices = button('resolve', `接剑 · 领悟青云剑诀${small('基础战力 +12% · 激活剑道天命')}`, { choice: 'learn', classes: 'primary full' }) + button('resolve', `不承剑道，只参道意${small('获得修为')}`, { choice: 'meditate', classes: 'secondary full' });
    } else if (event.id === 'advanced') {
      const scene = find(D.ADVANCED_EVENTS, event.scene), options = E.advancedChoices(state, event.scene);
      title = scene.title; body = `<p class="story-lead">${esc(scene.text)}</p><div class="build-hint"><span>此处会读取你的 Build</span><b>${options.filter(o => o.id !== 'leave').length} 条可行路线</b></div>`;
      choices = options.map((option, index) => button('resolve', `${esc(option.name)}${small(option.note)}`, { choice: option.id, classes: `${index === 0 && option.id !== 'leave' ? 'primary' : option.id === 'leave' ? 'text-button' : 'secondary'} full` })).join('');
    } else if (event.id === 'high') {
      const scene = find(D.HIGH_EVENTS, event.scene), options = E.highChoices(state, event.scene);
      title = `${D.REALMS[state.realm].name} · ${scene.title}`;
      body = `<p class="story-lead">${esc(scene.text)}</p><div class="build-hint"><span>天地印证 · 当前 Build</span><b>${options.length} 条路线</b></div>`;
      choices = options.map((option, index) => button('resolve', `${esc(option.name)}${small(option.note)}`, { choice: option.id, classes: `${index ? 'secondary' : 'primary'} full` })).join('');
    } else if (event.id === 'boss') {
      const boss = find(D.ENEMIES, 'threeeye'), routes = E.bossChoices(state);
      title = '三眼妖王 · 第三眼开';
      body = `<p class="story-lead">第三只眼睁开的瞬间，山林被分成真假两层。<br>这一次，战力只是底子。真正决定你如何破局的，是这一世已经长成的道。</p>${enemyView(boss)}<div class="build-hint"><span>可用破局路线</span><b>${routes.length} 条</b></div>`;
      choices = routes.map((route, index) => {
        const effective = { ...boss, power: Math.round(boss.power * route.enemyFactor) }, t = E.threat(state, effective), viable = t.ratio >= .55;
        const note = viable ? `${route.note} · 破局后威胁：${t.label}` : `${route.note} · 当前仍无胜算`;
        return button('resolve', `${esc(route.name)}${small(note)}`, { choice: route.id, classes: `${index ? 'secondary' : 'primary'} full`, disabled: !viable });
      }).join('');
    } else {
      body = `<p class="story-lead">${esc(event.text)}</p>${event.gain ? `<div class="gain-badge">修为 <strong>+${fmt(event.gain)}</strong></div>` : ''}`;
      if (event.id === 'arrival') body += `<div class="identity"><span>${find(D.ROOTS, state.root).name}</span><span>${find(D.ORIGINS, state.origin).name}</span></div><p class="footnote">${find(D.ROOTS, state.root).text}</p>`;
    }
    const place = state.realm >= 8 ? '凡界 · 天外' : state.realm >= 6 ? '凡界 · 虚空' : state.realm >= 4 ? '凡界 · 诸域' : '黑风岭';
    return `<section class="event-sheet" aria-label="当前事件"><div class="event-kicker"><span>第 ${state.actions || 1} 段道途</span><span>${state.age} 岁 · ${place}</span></div><h3 class="event-title">${esc(title)}</h3>${body}<div class="event-choices">${choices}</div></section>`;
  }
  function actionsView() {
    if (E.isBlocking(state)) return '';
    if (E.canBreak(state)) return `<div class="break-call"><p>修为已满，桎梏将破。</p>${button('breakthrough', `破境 · ${D.REALMS[state.realm + 1].name}${small('必获三选一天命 · 元气恢复')}`, { classes: 'primary large full' })}</div>`;
    const boss = E.canChallengeBoss(state) ? `<div class="boss-call"><p>两处金丹机缘已足以锁定妖王踪迹。</p>${button('challenge-boss', `寻三眼妖王${small('金丹关 · 让 Build 决定破局方式')}`, { classes: 'primary large full' })}</div>` : '';
    const proof = state.realm >= 4 && state.realm <= 8 && !state.realmProofs.includes(state.realm)
      ? `<div class="proof-call"><span>破境还缺一步</span><b>下一次历练必遇天地印证，事件由你亲自选择</b>${button('seek-proof', '寻天地印证', { classes: 'secondary full', disabled: !E.canSeekProof(state) })}</div>` : '';
    const batch = state.realm < 9 ? button('cultivate-to-ready', `闭关至当前桎梏${small('自动停在强制遭遇、修为圆满或寿元警戒之前')}`, { classes: 'secondary full batch-cultivate', disabled: !E.canCultivateToReady(state) }) : '';
    return `${boss}${proof}<div class="action-trio">${[['cultivate', '闭关', '稳定修为'], ['explore', '历练', state.realm >= 4 ? '天地印证' : state.realm >= 2 ? 'Build 条件机缘' : '奇遇与功法'], ['hunt', '狩猎', '吞噬与风险']].map(([kind, name, text]) => { const p = E.actionPreview(state, kind); return button('act', `<strong>${name}</strong><span>${text}</span><small>${p.xp ? `修为 +${p.xp} · ` : ''}${p.years} 年</small>`, { kind, classes: `action-tile ${kind === 'cultivate' ? 'quiet-action' : ''}` }); }).join('')}</div>${batch}`;
  }
  function playingView() {
    const quest = !state.flags.pythonSeen ? '初入黑风岭 · 尝试一次行动'
      : state.realm === 0 ? '引气入体 · 修为满后破境'
      : state.realm === 1 ? '筑基之后 · 回来讨还赤鳞因果'
      : state.realm === 2 ? (state.flags.pythonSlain ? '将吞来的力量炼进金丹' : '故地重返 · 赤鳞因果')
      : state.realm === 3 ? (state.flags.bossSlain ? '妖眼已闭 · 向元婴迈进' : `金丹炼道 · 已历 ${state.advancedResolved} 处机缘`)
      : state.realm >= 4 && state.realm <= 8 ? `${D.REALMS[state.realm].name} · ${state.realmProofs.includes(state.realm) ? '天地印证已成' : '去看一眼更大的世界'}`
      : '渡劫将至';
    return `<section>${hud()}<p class="quest"><span class="quest-dot"></span>${quest}</p>${pathBanner()}${eventView()}${actionsView()}<div class="play-bottom">${button('journal', '查看命格与历程', { ui: true, classes: 'text-button' })}<span>每次选择自动存档</span></div></section>`;
  }
  function draftView() {
    const redraws = Math.max(0, 1 + (E.effects(state).redraw || 0) - state.redrawUsed);
    return `<section class="breakthrough-view"><p class="eyebrow">灵气如潮 · 桎梏已破</p><h2 class="breakthrough-title">${D.REALMS[state.realm].name}</h2><p class="breakthrough-sub">你已踏入新的生命层级。</p><div class="break-stats"><div><span>战力</span><strong>${fmt(state.draft.before)} <i>→</i> ${fmt(state.draft.after)}</strong></div><div><span>寿元上限</span><strong>${E.maxAge(state)} <small>年</small></strong></div></div><div class="section-heading"><h3>大道垂青，择一悟之。</h3><span class="eyebrow">三选一</span></div><div class="draft-grid">${state.offer.map(id => talentCard(find(D.TALENTS, id), 'pick')).join('')}</div>${button('reroll-draft', `再悟一次 · 本世余 ${redraws} 次`, { classes: 'secondary full', disabled: !redraws })}<p class="footnote">选择即获得，无需再次抽取。刷新不会改变签池。</p></section>`;
  }
  function mutationView() {
    return `<section><p class="eyebrow">第一次吞噬异变</p><h2 class="mutation-title">它的血，<br><em>成了你的道。</em></h2><p class="intro">赤鳞妖蟒化作一团精纯妖血。<br>修为 +${fmt(state.lastGain)}。现在，选择留下哪一种力量；它将在金丹时继续进化。</p><div class="mutation-list">${D.MUTATIONS.map((m, i) => button('mutate', `<span class="mutation-index">零${['一', '二', '三'][i]}</span><div><span class="eyebrow">${m.slot}异变</span><h3>${m.name}</h3><p>${m.description}</p><small>${m.next}</small></div><b>→</b>`, { id: m.id, classes: 'mutation-card', aria: `选择${m.name}：${m.description}` })).join('')}</div><p class="footnote">选择后不会结算：继续修至金丹，首次异变会成为融合候选之一。</p></section>`;
  }
  function fusionView() {
    return `<section class="fusion-view"><p class="eyebrow">金丹初成 · 第一次能力融合</p><h2 class="mutation-title">万法入炉，<br><em>只留一条道。</em></h2><p class="intro">突破带来的天命、吞噬留下的异变、灵根与功法开始互相牵引。以下三种融合都由你这一世已经拥有的条件推导而来。</p><div class="fusion-grid">${state.fusionOffer.map((id, i) => { const f = find(D.FUSIONS, id); return button('pick-fusion', `<span class="fusion-number">${['一', '二', '三'][i]}</span><div><span class="eyebrow">${f.path}</span><h3>${f.name}</h3><p>${f.description}</p><small>成因：${f.requirement}</small></div>`, { id, classes: 'fusion-card', aria: `融合为${f.name}：${f.description}` }); }).join('')}</div><p class="footnote">融合不是额外抽卡，而是已有 Build 的一次质变。选择后进入金丹事件与三眼妖王阶段。</p></section>`;
  }
  function tribulationView() {
    const data = E.tribulationChoices(state), fusion = find(D.FUSIONS, state.fusions[0]), trace = find(D.TRACES, state.carriedTrace);
    const progress = ['第一劫', '第二劫', '第三劫'][state.tribulationStage];
    return `<section class="tribulation-view"><p class="eyebrow">渡劫 · ${progress}</p><div class="tribulation-sky" aria-hidden="true"><span>劫</span><i></i><i></i><i></i></div><h2 class="tribulation-title">${data.name}</h2><p class="intro">修为已经没有下一格可以填。现在，凡界最后要检验的不是你积攒了多少数字，而是这一世究竟炼成了什么。</p><div class="tribulation-status"><span>本世核心</span><b>${fusion?.name || '未成融合'}</b><span>当前战力</span><b>${fmt(E.power(state))}</b>${trace ? `<span>前世道痕</span><b>${esc(trace.name)}</b>` : ''}</div>${pathBanner()}<div class="tribulation-options">${data.options.map((option, index) => { const obstacle = { power: Math.round(state.tribulationBase * [1, 1.08, 1.16][state.tribulationStage] * option.enemyFactor) }; const t = E.threat(state, obstacle); return button('tribulation-step', `${esc(option.name)}${small(`${option.note} · 此路：${t.label}${t.chance < 1 ? ` · 约 ${Math.round(t.chance * 100)}%` : ' · 必过'}`)}`, { id: option.id, classes: `${option.trace ? 'trace-route' : option.id === 'fusion' ? 'primary' : 'secondary'} full`, disabled: t.ratio < .55 }); }).join('')}</div><p class="footnote">失败不会重抽天劫；若仍有元气，会留在当前这一劫继续选择。前世道痕只在对应天劫开启一次额外路线，不直接增加当前战力。</p></section>`;
  }
  function endingTitlePanel() {
    const titles = M.endingTitles(state), profile = M.classifyPath(state);
    if (!titles.length) return `<div class="ending-title"><span>此世道途</span><b>${esc(profile.name)}</b><p>${esc(profile.signals.join(' · ') || '道途未竟，仍留下可以带走的痕迹。')}</p></div>`;
    const [primary, ...other] = titles;
    return `<div class="ending-title"><span>飞升称号</span><b>${esc(primary.name)}</b><p>${esc(primary.description)}</p>${other.length ? `<small>同时达成：${other.map(title => esc(title.name)).join(' · ')}</small>` : ''}</div>`;
  }
  function traceChoicePanel() {
    const candidates = M.traceCandidates(state), selected = meta.nextTraceSource === state.seed ? meta.nextTrace : null;
    if (!candidates.length) return '';
    return `<section class="trace-choice"><div class="section-heading"><div><span class="eyebrow">轮回道痕 · 三择一</span><h3>这一世，留下什么？</h3></div><span class="count"><b>${selected ? '1' : '0'}</b> / 1</span></div><p class="intro">道痕不会永久累加战力，只影响下一世的天命签池，并在对应天劫开启一次专属路线。开始下一世时会被消耗。</p><div class="trace-grid">${candidates.map(trace => {
      const active = selected === trace.id;
      return button('carry-trace', `<span>${esc(trace.path)}道痕 · 契合 ${trace.score}</span><h3>${esc(trace.name)}</h3><p>${esc(trace.description)}</p><small>${esc(trace.reason)}</small><b>${active ? '已凝练，等待下一世' : '凝练此痕 →'}</b>`, { ui: true, id: trace.id, classes: `trace-card${active ? ' selected' : ''}`, pressed: active, aria: `凝练${trace.name}：${trace.description}` });
    }).join('')}</div>${selected ? `<p class="trace-ready">下一次转世将携带「${esc(find(D.TRACES, selected).name)}」。重新选择会替换它。</p>` : ''}</section>`;
  }
  function endingView() {
    const ascended = state.phase === 'complete' && state.flags.ascended, mutation = find(D.MUTATIONS, state.mutations[0]), fusion = find(D.FUSIONS, state.fusions?.[0]);
    if (ascended) {
      const worm = Math.ceil(state.ascendedPower * 1.7);
      return `<section class="ending-view ascension-ending">
        <p class="eyebrow">凡界篇 · 正式通关</p><span class="ending-seal ascended-seal">天门已开</span><h2>你已飞升。</h2>
        <p class="intro">天门洞开，劫云从脚下散去。凡界众生抬头，只能看到一道越来越远的光。你终于完成了这一世最初写下的两个字：飞升。</p>${endingTitlePanel()}
        <div class="revenge-comparison"><div><span>最初旧敌 · 赤鳞妖蟒</span><strong>150</strong></div><i>→</i><div><span>飞升时 · 你的战力</span><strong>${fmt(state.ascendedPower)}</strong></div></div>
        <p class="comparison-note">${mutation ? `首次异变「${mutation.name}」` : ''}${fusion ? ` → 金丹融合「${fusion.name}」` : ''}。五次天地印证、三重天劫，凡界主线已完整闭环。</p>
        <div class="immortal-preview"><span class="eyebrow">仙界 · 一息之后</span><h3>路边有什么东西动了一下。</h3><p>一只不起眼的仙界噬灵虫正在啃食仙草。你下意识扫了一眼它的气息。</p><div class="versus"><div><small>你的战力</small><strong>${fmt(state.ascendedPower)}</strong></div><span>对</span><div><small>仙界噬灵虫</small><strong>${fmt(worm)}</strong></div></div><b>凶险</b><p>你忽然明白：所谓飞升，不过是换了一个更大的池塘。</p></div>
        <div class="chapter-entry"><p>凡界已经完成。可以带着道痕转世，也可以保留这一世继续进入仙界。</p>${state.immortal ? button('immortal-continue', '继续仙界道途', { ui: true, classes: 'primary full' }) : button('immortal-enter', `踏入仙界${small('保留凡界成就 · 开启噬灵虫序章')}`, { classes: 'primary full' })}</div>
        <div class="result-grid"><div><span>凡界境界</span><b>渡劫飞升</b></div><div><span>飞升战力</span><b>${fmt(state.ascendedPower)}</b></div><div><span>飞升年龄</span><b>${state.age} 岁</b></div><div><span>吞噬次数</span><b>${state.devours}</b></div></div>
        <div class="chosen-line"><span>本世先天</span>${state.innate.map(id => `<b>${find(D.TALENTS, id).name}</b>`).join('')}</div>${fusion ? `<div class="chosen-line"><span>大道核心</span><b class="gold-text">${fusion.name}</b></div>` : ''}${traceChoicePanel()}
        <div class="ending-actions">${button('share', '生成飞升命格图', { ui: true, classes: 'primary full' })}${button('new', '转世重修 · 换一条道', { ui: true, classes: 'secondary full' })}${button('codex', '查看命途图谱', { ui: true, classes: 'secondary full' })}${button('journal', '翻阅这一世', { ui: true, classes: 'text-button full' })}</div>
        <p class="chapter-disclaimer">凡界结局不会因新增篇章消失。仙界为独立可选后续，进入后仍可回看此页。<br>无付费、无广告、无联网排行。</p></section>`;
    }
    return `<section class="ending-view"><p class="eyebrow">一世道途 · 到此为止</p><span class="ending-seal">此世终</span><h2>${esc(state.ending)}</h2><p class="intro">${esc(state.log[state.log.length - 1]?.text || '这一世没能走到天门之前。')}</p>${endingTitlePanel()}<div class="result-grid"><div><span>终止境界</span><b>${D.REALMS[state.realm].name}</b></div><div><span>最终战力</span><b>${fmt(E.power(state))}</b></div><div><span>此刻年龄</span><b>${state.age} 岁</b></div><div><span>吞噬次数</span><b>${state.devours}</b></div></div>${traceChoicePanel()}<div class="ending-actions">${button('share', '生成此世命格图', { ui: true, classes: 'primary full' })}${button('new', '再活一世 · 换一条道', { ui: true, classes: 'secondary full' })}${button('codex', '查看命途图谱', { ui: true, classes: 'secondary full' })}${button('journal', '翻阅此世命册', { ui: true, classes: 'text-button full' })}</div><p class="chapter-disclaimer">失败同样会形成道痕并保留完整历程。可以导出存档或直接重开。</p></section>`;
  }
  function immortalView() {
    if (state.immortal.evolution) return evolutionView();
    const I = window.FSImmortal, i = state.immortal, law = I.LAWS.find(l => l.id === i.law);
    const titles = { arrival: '此界，重新学会弱小。', shelter: '凡力未失，仙躯未成。', field: '向仙气深处去。', encounter: '仙草之间，亦有生死。', law: '这一口，尝到了法则。', 'prologue-complete': '你又把它吞了。', dead: '仙躯崩散，道基犹存。' };
    const act = (type, label, opts = {}) => button(`immortal-${type}`, label, { classes: 'secondary full', ...opts });
    let content = '';
    if (i.phase === 'arrival') {
      content = `<div class="pressure-note"><p>凡界的修为没有被清零。此界以更重的灵压和新的仙躯刻度衡量力量：凡力 ÷ ${fmt(I.PRESSURE)}。</p><dl><dt>原有凡界战力</dt><dd>${fmt(i.mortalPower)}</dd><dt>折算后的初始势能</dt><dd>${fmt(i.basePower)}</dd><dt>噬灵虫的仙界势能</dt><dd>${fmt(i.wormPower)}</dd></dl><p>换了刻度，强弱却仍然分明。你可以先退开，也可以亲自试探这片天地的重量。</p></div><div class="immortal-actions">${act('approach', '收敛气息，退进石隙', { id: 'hide', classes: 'primary full' })}${act('approach', `试探界压${small('必定受伤 30 · 不会因此死亡')}`, { id: 'test' })}</div>`;
    } else if (i.phase === 'shelter') {
      content = `<p class="intro">先让凡界道基承得住第一缕仙气，再从弱小的仙兽开始。仙元用于重构仙躯；法则碎片用于凝练新的能力。</p>${act('adapt', `引仙气重构道基${small('仙元 +25 · 元气恢复 20')}`, { classes: 'primary full' })}`;
    } else if (i.phase === 'field') {
      const cost = I.trainingCost(i);
      content = `<div class="immortal-goal"><span>此地旧敌</span><b>仙界噬灵虫 · ${fmt(i.wormPower)}</b><p>重构仙躯、凝练一枚法则后再回去。有效势能达到敌方两倍时可以碾压无伤。</p></div>
        <div class="immortal-actions">${act('train', `${i.level < 8 ? `重构仙躯 · 第 ${i.level + 1} 重` : '序章仙躯已成'}${small(`需要 ${cost} 仙元 · 现有 ${i.essence}`)}`, { classes: 'primary full', disabled: i.level >= 8 || i.essence < cost })}
        ${act('rest', `藏身调息${small('恢复 35 元气 · 无仙元收益')}`, { disabled: i.health === 100 })}${act('cultivate', `缓炼仙气${small('3 日 · 仙元 +10 · 无战斗风险')}`, { disabled: i.essence >= 100000 })}</div>
        <h3 class="immortal-subtitle">在这一片仙草中狩猎</h3><div class="immortal-actions">${I.availableCreatures(i).map(c => { const e = I.enemy(i, c.id), t = I.threat(i, e); return act('hunt', `${esc(c.name)}${small(`势能 ${fmt(e.power)} · ${t.label} · 吞噬基础仙元 ${c.reward}`)}`, { id: c.id, classes: `${c.boss ? 'trace-route' : 'secondary'} full` }); }).join('')}</div>`;
    } else if (i.phase === 'encounter') {
      const target = I.enemy(i, i.target), t = I.threat(i, target);
      content = `<div class="enemy-card"><h3>${esc(target.name)}</h3><div class="versus"><div><small>仙兽势能</small><strong>${fmt(target.power)}</strong></div><span>对</span><div><small>你的有效势能</small><strong>${fmt(I.power(i, target))}</strong></div></div><p>${t.label} · ${t.chance === 1 ? '必胜，不损元气' : `胜率约 ${Math.round(t.chance * 100)}%；失败损失元气，耗尽则仙躯崩散`}</p></div><div class="immortal-actions">${act('devour', `吞噬${target.name}`, { classes: 'primary full', disabled: !t.chance })}${act('retreat', '收敛锋芒，暂且退去')}</div>`;
    } else if (i.phase === 'law') {
      content = `<p class="intro">三道法则从碎片中浮现。耗费一枚碎片，选择一道。凡界道途让其中一道与你共鸣，但选择仍然自由。</p><div class="immortal-actions">${i.lawOffer.map(id => { const l = I.LAWS.find(l => l.id === id); return act('law', `<span class="eyebrow">${id === i.lineage ? '凡界道途共鸣' : '此界新路'}</span><h3>${esc(l.name)}</h3><p>${esc(l.description)}</p>`, { id, classes: 'secondary full law-card' }); }).join('')}</div>`;
    } else if (i.phase === 'prologue-complete') {
      content = `<div class="revenge-comparison"><div><span>初临时的你</span><strong>${fmt(i.basePower)}</strong></div><i>→</i><div><span>吞虫时的你</span><strong>${fmt(I.power(i))}</strong></div></div><p class="story-lead">它仍然只有 ${fmt(i.wormPower)} 势能。那一刻你终于确认：飞升没有抹去过去，只让你的饥饿有了更远的方向。</p><p class="intro">仙界序章已完成。接下来可以走出仙域，将凡界融合带入五槽进化。</p>${act('evolution-enter', `走出仙域 · 开始五槽进化${small('肉身、血脉、神魂、神通、法则 · 各留一种力量')}`, { classes: 'primary full' })}`;
    } else if (i.phase === 'dead') {
      content = `${act('retry', `从飞升落点重试${small('重置本次仙界探索 · 保留凡界成就')}`, { classes: 'primary full' })}`;
    }
    return `<section class="immortal-view"><p class="eyebrow">仙界序章 · 下界仙域</p><h2>${titles[i.phase]}</h2>
      <div class="immortal-stats"><div><span>仙界势能</span><b>${powerFigure(I.power(i))}</b></div><div><span>仙躯 · 元气</span><b>${i.level} 重 · ${i.health}/100</b></div><div><span>仙元</span><b>${fmt(i.essence)}</b></div><div><span>法则碎片</span><b>${fmt(i.fragments)}</b></div></div>
      <div class="chosen-line"><span>凡界道途</span><b>${esc(M.PATHS[i.lineage].name)}</b>${law ? `<span>此界法则</span><b>${esc(law.name)}</b>` : ''}</div>
      <section class="event-sheet"><div class="event-kicker"><span>仙界第 ${i.days} 日</span><span>${i.devours} 次吞噬</span></div><p class="story-lead">${esc(i.note)}</p>${content}</section>
      <div class="immortal-actions">${button('immortal-journal', '翻阅仙界命册', { ui: true, classes: 'secondary full' })}${button('mortal-summary', '回看凡界结局 · 凝练道痕', { ui: true, classes: 'secondary full' })}${button('new', '另起一世', { ui: true, classes: 'text-button full' })}</div></section>`;
  }
  function evolutionView() {
    const V = window.FSEvolution, Q = window.FSQuantity, i = state.immortal, e = i.evolution;
    const world = V.WORLDS[e.world], affix = V.AFFIXES.find(a => a.id === e.affix);
    const trait = id => V.TRAITS.find(t => t.id === id);
    const act = (type, label, opts = {}) => button(`immortal-evolution-${type}`, label, { classes: 'secondary full', ...opts });
    const bonusText = (t, level = 1) => [t.power ? `势能 +${Math.round(t.power * level * 100)}%` : '', t.guard ? `承伤减免 ${Math.round(t.guard * level * 100)}%` : '', t.devour ? `吞噬仙元 +${Math.round(t.devour * level * 100)}%` : '', t.illusion ? `对幻类势能 +${Math.round(t.illusion * level * 100)}%` : ''].filter(Boolean).join(' · ');
    let content = '', title = world.name;
    if (i.phase === 'world') {
      content = `<div class="immortal-goal"><span>此界目标 · ${world.rank}</span><b>${e.proof ? '天地印证已成' : '尚缺天地印证'} · ${Math.min(e.hunts,2)}/2 次吞噬</b><p>完成印证与两次吞噬，才能锁定守界者。点击「五槽进化」可升级、替换与融合；本界炼化只增加当前界域的势能。</p></div>
        <div class="immortal-actions">${act('explore', `${world.event}${small('亲自选择此界印证路线')}`, { classes:'primary full',disabled:e.proof })}
        ${act('refine', `本界炼化 · ${e.refinement}/20${small(`需要 ${V.trainingCost(i)} 仙元 · 每重增加 20% 基础势能`)}`, { disabled:e.refinement>=20||i.essence<V.trainingCost(i) })}
        ${act('rest', `藏身调息${small('元气恢复 35 · 不消耗仙元')}`, { disabled:i.health>=100 })}
        ${act('cultivate', `缓炼仙气${small('无风险 · 仙元 +20')}`, { disabled:i.essence>=100000 })}${act('distill', `凝聚一枚碎片${small('消耗 60 仙元')}`, { disabled:i.essence<60||i.fragments>=10000 })}</div>
        <h3 class="immortal-subtitle">可寻之物</h3><div class="immortal-actions">${V.CREATURES.filter(c=>c.world===e.world).map(c=>{const t=V.enemy(i,c.id),risk=V.threat(i,t);return act('hunt',`${esc(c.name)}${small(`${Q.format(t.power)} 势能 · ${risk.label} · 三种吞噬候选`)}`,{id:c.id});}).join('')}
        ${act('hunt', `寻${world.gate}${small('守界者 · 胜利后开放下一界')}`, {id:'gate',classes:'trace-route full',disabled:!e.proof||e.hunts<2})}</div>`;
    } else if (i.phase === 'world-event') {
      title = world.event;
      content = `<div class="immortal-actions">${V.eventChoices(i).map(c=>act('event',`${esc(c.name)}${small(`${c.note} · 仙元 +${c.essence} · 碎片 +${c.fragments}`)}`,{id:c.id,classes:c.id==='law'?'primary full':'secondary full'})).join('')}</div>`;
    } else if (i.phase === 'world-encounter') {
      const target = V.enemy(i,e.target), options = e.target==='gate' ? [['direct','正面镇压'],['resonate',`以${window.FSImmortal.LAWS.find(l=>l.id===i.law).name}破局`]] : [['direct','吞噬并夺取进化']];
      title = target.name;
      content = `<div class="enemy-card"><div class="cosmic-versus"><div><small>目标势能</small><b>${esc(Q.format(target.power))}</b></div><div><small>你的有效势能</small><b>${esc(Q.format(V.power(i,target)))}</b></div></div></div><div class="immortal-actions">${options.map(([id,name])=>{const t=V.threat(i,V.enemy(i,e.target,id));return act('devour',`${name}${small(`${id==='resonate'?`此法门削弱守界势能 ${e.enemyLaws.includes(i.law)?35:30}% · `:''}${t.label} · ${t.chance===1?'必胜无伤':`约 ${Math.round(t.chance*100)}% 胜率，可能死亡`}`)}`,{id,classes:id==='resonate'?'primary full':'secondary full',disabled:t.chance===0});}).join('')}${act('retreat','收敛锋芒，暂退')}</div>`;
    } else if (i.phase === 'evolve') {
      title = '它的力量，只留一道。';
      content = `<div class="immortal-actions">${e.offer.map(id=>{const t=trait(id),old=e.slots[t.slot],same=old?.id===id;return act('choose',`<span class="eyebrow">${V.SLOTS[t.slot]} · ${same?'同类叠合':'替换此槽'}</span><h3>${esc(t.name)}</h3><p>${esc(t.text)}</p><p>${esc(bonusText(t,same?Math.min(5,old.level+1):1))}</p><small>${old?`当前：${esc(trait(old.id).name)} ${old.level} 阶`:'当前：空槽'}</small>${small(same?(old.level<5?`叠合至 ${old.level+1} 阶`:'已经五阶，化为 1 枚碎片'):old?`替换 ${trait(old.id).name}，旧效果不再叠加`:'将此力量留在空槽')}`,{id,classes:'secondary full law-card'});}).join('')}${act('dissolve',`全部化为两枚碎片${small('保留现有五槽，不选择新力量')}`)}</div>`;
    } else if (i.phase === 'world-cleared') {
      title = '界门，又开了一次。';
      content = `${act('advance',`踏入下一界${small('已有尺度扩大四倍 · 开始下一次天地印证')}`,{classes:'primary full'})}`;
    } else if (i.phase === 'ending') {
      title = '世界吞噬者。';
      content = `<p class="story-lead">你曾经不敢碰一条妖蟒。后来，你吞了它。<br>你飞升以后，连一只虫都难以面对。后来，你也吞了它。<br>如今站在世界之外，你终于知道，那份饥饿从来没有终点。</p><div class="ending-title"><span>第一轮仙界进化 · 正式完成</span><b>我欲飞升</b><p>从凡人到噬界者，这一轮主线在此收束。无尽是可选后续，不是未完成的结局。</p></div>${act('endless',`踏入无尽诸天${small('世界词条重组 · 数量级继续增长 · 保留五槽')}`,{classes:'primary full'})}`;
    } else if (i.phase === 'dead') {
      title = '这一界，还没有结束。';
      content = act('recover',`在此界重整仙躯${small('保留层数和五槽 · 清空本界炼化 · 不倒退随机数')}`,{classes:'primary full'});
    }
    const slots = `<details class="evolution-build"><summary>五槽进化 · ${Object.values(e.slots).filter(Boolean).length}/5 <span>查看、升级与融合</span></summary><div class="slot-list">${Object.entries(V.SLOTS).map(([key,name])=>{const item=e.slots[key],t=item&&trait(item.id);return `<div class="slot-row"><span>${name}</span><div><b>${t?esc(t.name):'空槽'}${item?` · ${item.level} 阶`:''}</b><p>${t?esc(bonusText(t,item.level)):'可从下一次吞噬选择新的力量。'}</p></div>${act('upgrade',item&&item.level<5?`升级 · ${item.level+2} 碎片`:'无法升级',{id:key,disabled:i.phase!=='world'||!item||item.level>=5||i.fragments<item.level+2})}</div>`;}).join('')}</div><h3>融合线索</h3><div class="immortal-actions">${V.RECIPES.map(r=>{const available=V.recipes(i).some(x=>x.id===r.id);return act('fuse',`${esc(r.name)}${small(`${r.needs.map(id=>trait(id).name).join(' + ')} · ${r.cost} 碎片${r.catalyst?' · 法则引子保留':''}`)}`,{id:r.id,disabled:i.phase!=='world'||!available||i.fragments<r.cost});}).join('')}</div></details>`;
    return `<section class="immortal-view evolution-view"><p class="eyebrow">${e.endless?'无尽诸天':'仙界进化'} · 第 ${esc(e.layer)} 界 · ${world.rank}</p><h2>${title}</h2>
      <div class="world-road">${V.WORLDS.map((w,n)=>`<span class="${n===0||e.cleared.includes(n)?'lit':''}">${w.name}</span>`).join('')}</div>
      <div class="immortal-stats"><div><span>当前势能 · 数量级</span><b>${quantityFigure(V.power(i))}</b></div><div><span>元气 · 本界炼化</span><b>${i.health}/100 · ${e.refinement} 重</b></div><div><span>仙元</span><b>${fmt(i.essence)}</b></div><div><span>碎片</span><b>${fmt(i.fragments)}</b></div></div>
      <p class="world-affix">${esc(affix.name)} · ${esc(affix.text)}<br>仙兽法则：${e.enemyLaws.map(id=>window.FSImmortal.LAWS.find(l=>l.id===id).name).map(esc).join(' × ')}。锋芒使敌势能 +8%，不灭 +10%，破妄形成幻象；同源法则使你的守界破局更强。</p>${slots}
      <section class="event-sheet"><p class="story-lead">${esc(i.note)}</p>${content}</section>
      <div class="immortal-actions">${button('immortal-journal','翻阅仙界命册',{ui:true,classes:'secondary full'})}${button('mortal-summary','回看凡界 · 凝练道痕',{ui:true,classes:'secondary full'})}${button('new','另起一世',{ui:true,classes:'text-button full'})}</div></section>`;
  }
  function render() {
    const inImmortal = !!(state?.immortal && !mortalSummary);
    const shown = mortalSummary && state?.immortal ? { ...state, immortal: null } : state;
    sound.scene(shown, home);
    const view = home ? 'home' : inImmortal ? `immortal-${state.immortal.phase}` : state.phase;
    const scene = world.update(shown, home);
    const warning = warningText();
    const vista = home ? '' : `<div class="world-vista" aria-hidden="true"><span>${esc(scene.title)}</span><small>${esc(scene.subtitle)}</small></div>`;
    const body = home ? homeView() : inImmortal ? immortalView() : state.phase === 'talents' ? talentsView() : state.phase === 'attributes' ? attributesView() : state.phase === 'playing' ? playingView() : state.phase === 'draft' ? draftView() : state.phase === 'mutation' ? mutationView() : state.phase === 'fusion' ? fusionView() : state.phase === 'tribulation' ? tribulationView() : endingView();
    app.innerHTML = `<div class="shell">${rail()}<div class="content-shell">${header()}<main id="main" tabindex="-1" data-view="${view}">${vista}${tutorialNote()}${body}</main><footer class="app-footer"><span>我欲飞升 · v${S.VERSION}</span><span>本地运行 / 无付费抽取</span></footer>${warning ? `<div class="storage-warning" role="alert">${esc(warning)}</div>` : ''}</div></div>`;
    if (view !== previousView) { window.scrollTo({ top: 0, behavior: 'instant' }); previousView = view; }
  }
  function modal(title, body) {
    if (title === '存档与说明') body = `<div class="settings-extra"><h3>命册批注</h3><p class="intro">首次飞升后自动关闭；也可以提前关闭。战力主显示使用万、亿，点按数字查看完整值。</p>${button('tutorial-reset', '重新阅读批注', { ui: true, classes: 'secondary full', disabled: meta.totals.ascended > 0 })}</div>${body}`;
    dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2>${button('close-dialog', '×', { ui: true, classes: 'icon-button', aria: '关闭窗口' })}</div>${body}`;
    if (!dialog.open) dialog.showModal();
  }
  function codex() {
    const summary = M.summary(meta), sections = M.codexSections(meta);
    modal('命途图谱', `<div class="codex-summary"><div><span>已结束轮回</span><b>${summary.ended}</b></div><div><span>成功飞升</span><b>${summary.ascended}</b></div><div><span>已发现</span><b>${summary.discovered} / ${summary.total}</b></div></div>${summary.nextTrace ? `<div class="trace-banner"><span>等待下一世</span><b>${esc(summary.nextTrace.name)}</b><p>${esc(summary.nextTrace.description)}</p></div>` : ''}<p class="intro">图谱只记录你真正见过的天命、异变、融合、机缘、破局、称号与道痕。未发现条目保留线索，不提供付费解锁。</p><div class="codex-sections">${sections.map((section, index) => `<details class="codex-section"${index < 3 ? ' open' : ''}><summary><span>${esc(section.name)}</span><b>${section.discovered} / ${section.total}</b></summary><div class="codex-grid">${section.entries.map(item => `<article class="codex-entry${item.discovered ? ' discovered' : ' locked'}"><h4>${esc(item.name)}</h4>${item.detail ? `<p>${esc(item.detail)}</p>` : ''}<small>${esc(item.discovered ? item.hint : `线索：${item.hint}`)}</small></article>`).join('')}</div></details>`).join('')}</div>`);
  }
  function journal() {
    if (state?.immortal && !home && !mortalSummary) {
      modal('仙界命册', `<ol class="history">${state.immortal.journal.slice().reverse().map(j => `<li><small>仙界第 ${j.day} 日</small><p>${esc(j.text)}</p></li>`).join('')}</ol>${button('settings', '存档与说明', { ui: true, classes: 'secondary full' })}`); return;
    }
    if (!state) { settings(); return; }
    const a = E.stats(state), root = find(D.ROOTS, state.root);
    const proofs = (state.realmProofs || []).map(r => D.REALMS[r].name).join('、') || '尚未开始';
    const profile = M.classifyPath(state), inherited = find(D.TRACES, state.carriedTrace);
    modal('此世命册', `<div class="journal-status"><strong>${D.REALMS[state.realm].name} · ${state.age} 岁</strong><span>${root?.name || '灵根未显'} / ${find(D.ORIGINS, state.origin)?.name || '尚未入世'}</span></div><div class="journal-stats">${D.STATS.map(stat => `<div><span>${stat.name}</span><b>${a[stat.id]}</b><small>基础 ${state.stats[stat.id]}</small></div>`).join('')}</div><h3>本世道途</h3><div class="journal-path"><b>${esc(profile.name)} · ${esc(profile.stage)}</b><span>${profile.signals.map(esc).join(' · ') || '倾向尚未形成'}</span><p>${esc(profile.next)}</p>${inherited ? `<small>前世所携：${esc(inherited.name)}。本世结束后不会自动继续继承。</small>` : ''}</div><h3>天命、异变与融合</h3><div class="journal-talents">${state.talents.map(id => { const t = find(D.TALENTS, id); return `<p><b class="rarity-${t.rarity}">${t.name}</b><span>${t.description}</span></p>`; }).join('') || '<p>尚未选择先天天命。</p>'}<p><b>基础吞灵诀</b><span>${state.flags.pythonSeen ? '已领悟。击败妖兽后可以吞噬，非稀有天赋专属。' : '将在黑风岭初遇后领悟。'}</span></p>${state.sword ? '<p><b>青云剑诀</b><span>基础战力 +12%，激活剑道天命与高阶事件路线。</span></p>' : ''}${state.mutations.map(id => { const m = find(D.MUTATIONS, id); return `<p><b>${m.name} · ${m.slot}</b><span>${m.description}</span></p>`; }).join('')}${(state.fusions || []).map(id => { const f = find(D.FUSIONS, id); return `<p><b class="gold-text">${f.name} · ${f.path}</b><span>${f.description}</span></p>`; }).join('')}${E.synergies(state).filter(s => !(state.fusions || []).some(id => find(D.FUSIONS, id)?.name === s.name)).map(s => `<p><b class="gold-text">${s.name} · 已共鸣</b><span>${s.text}</span></p>`).join('')}</div><h3>关键因果</h3><p class="intro">赤鳞妖蟒：${state.flags.pythonSlain ? '已吞噬' : state.flags.pythonSeen ? `已记因果，初见战力 ${fmt(state.firstPower)}` : '尚未相遇'}。<br>三眼妖王：${state.flags.bossSlain ? `已镇杀${state.bossRoute ? ` · ${esc(M.BOSS_ROUTES.find(route => route.id === state.bossRoute)?.name || state.bossRoute)}` : ''}` : state.flags.bossSeen ? '已经现世' : '尚未现世'}。</p>${state.realm >= 4 ? `<h3>天地印证与天劫</h3><p class="intro">已完成：${proofs}。${state.flags.ascended ? '<br>三重天劫：全部已渡。' : state.phase === 'tribulation' ? `<br>当前天劫：${state.tribulationStage + 1} / 3。` : ''}${state.tribulationRoutes?.length ? `<br>已用路线：${state.tribulationRoutes.map(id => esc(M.TRIBULATION_ROUTES.find(route => route.id === id)?.name || '旧版路线')).join('、')}` : ''}</p>` : ''}<h3>此世历程</h3><ol class="history">${state.log.slice().reverse().map(l => `<li><small>${l.age} 岁 · ${D.REALMS[l.realm]?.name || ''}</small><b>${esc(l.title)}</b><p>${esc(l.text)}</p></li>`).join('') || '<li>此世尚未入山。</li>'}</ol>${button('codex', '打开命途图谱', { ui: true, classes: 'secondary full' })}${button('settings', '存档、导入与玩法说明', { ui: true, classes: 'secondary full' })}`);
  }
  function settings() {
    modal('存档与说明', `<p class="intro">游戏使用当前浏览器本地存储。本世存档与轮回册分开保存：前者记录凡界、仙界与无尽进化，后者记录图谱、称号、历世结果和下一世待继承道痕。同一网址下可续玩，不会自动跨浏览器或设备同步。</p><div class="settings-actions">${button('export', '导出当前存档 JSON', { ui: true, classes: 'secondary full', disabled: !state })}${button('export-meta', '导出轮回册 JSON', { ui: true, classes: 'secondary full' })}${button('export-raw', '导出浏览器原始存档', { ui: true, classes: 'text-button full' })}<label class="file-label secondary">导入本世存档<input id="import-save" type="file" accept=".json,application/json"></label><label class="file-label secondary">导入轮回册<input id="import-meta" type="file" accept=".json,application/json"></label></div><h3>怎么玩</h3><p class="intro">凡界以天命、异变、融合和天地印证形成六大道途；飞升后进入仙界，完成界压适应、法则选择和噬灵虫复仇，再以肉身、血脉、神魂、神通、法则五槽继续吞噬、替换、升级和融合。正式阶段结局之后可继续无尽诸天。</p><h3>轮回</h3><p class="intro">一世结束后可凝练一枚道痕。下一世八选三会固定加入一张对应的玄品前世天命，同时保留两段前世回声和一条天劫路线；这些影响只服务下一世，不永久累加基础战力。</p><p class="footnote">v${S.VERSION} · ${state ? `本世种子 ${state.seed} · ` : ''}存档格式 v${E.VERSION} · 轮回册格式 v${M.VERSION}<br>全部生产资源本地运行；没有付费抽取、广告或联网排行。</p>`);
  }
  function audioSettings() {
    const a = sound.settings(), status = sound.diagnostics();
    modal('声境设置', `<p class="intro">山野、云上、界外、天门四层环境音乐，配合九类关键音效。声音由本地程序合成，不下载录音文件。</p><div class="audio-controls">${button('audio-music', `环境音乐：${a.music ? '开' : '关'}`, { ui: true, classes: 'secondary full', pressed: a.music })}${button('audio-effects', `关键音效：${a.effects ? '开' : '关'}`, { ui: true, classes: 'secondary full', pressed: a.effects })}<label for="audio-volume">总音量 <output id="audio-volume-label">${Math.round(a.volume * 100)}%</output></label><input id="audio-volume" aria-label="总音量" type="range" min="0" max="80" step="1" value="${Math.round(a.volume * 100)}"></div><p class="footnote">首次点按后启声；页面隐藏或失焦时暂停，返回后恢复。静音也会停止播放。设置单独保存在此浏览器，不改变本世存档。</p><p class="audio-status">${status.supported ? `当前声境：${window.FSAudio.BANDS[status.band].name}` : '当前浏览器不支持声音，文字游戏不受影响。'}${status.warning ? `<br>${esc(status.warning)}` : ''}</p>`);
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function share() {
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 1040;
    const c = canvas.getContext('2d');
    if (!c) { announce('浏览器不支持命格图导出。可直接截图当前结算页面。'); return; }
    c.fillStyle = '#101c1d'; c.fillRect(0, 0, 720, 1040);
    c.strokeStyle = '#766447'; c.lineWidth = 2; c.strokeRect(30, 30, 660, 980);
    c.textAlign = 'center'; c.fillStyle = '#c8ad79'; c.font = '24px serif'; c.fillText('我 欲 飞 升  ·  此 世 命 格', 360, 108);
    c.fillStyle = '#efe5cd'; c.font = 'bold 60px serif'; c.fillText(state.flags.ascended ? '我已飞升' : state.ending, 360, 221);
    c.font = '28px serif'; c.fillText(`${D.REALMS[state.realm].name} · ${state.age} 岁 · 战力 ${fmt(E.power(state))}`, 360, 300);
    c.fillStyle = '#91aaa0'; c.font = '24px serif';
    c.fillText(`${find(D.ROOTS, state.root).name} / ${find(D.ORIGINS, state.origin).name}`, 360, 355);
    c.strokeStyle = '#475a53'; c.beginPath(); c.moveTo(94, 404); c.lineTo(626, 404); c.stroke();
    c.fillStyle = '#c8ad79'; c.font = '24px serif'; c.fillText('先 天 命 格', 360, 462);
    c.fillStyle = '#efe5cd'; c.font = '32px serif';
    state.innate.forEach((id, i) => c.fillText(find(D.TALENTS, id).name, 360, 523 + i * 54));
    c.fillStyle = '#c8ad79'; c.font = '28px serif';
    c.fillText(state.mutations.length ? `首次异变 · ${find(D.MUTATIONS, state.mutations[0]).name}` : '此世尚未完成首次异变', 360, 718);
    if (state.fusions?.length) c.fillText(`金丹融合 · ${find(D.FUSIONS, state.fusions[0]).name}`, 360, 763);
    c.fillStyle = '#a8b5a8'; c.font = '24px serif';
    if (state.flags.ascended) c.fillText(`赤鳞妖蟒 150 → 飞升战力 ${fmt(state.ascendedPower)}`, 360, 825);
    else if (state.flags.bossSlain) c.fillText(`妖蟒 150 → 三眼妖王 24,000`, 360, 825);
    c.font = '22px serif'; c.fillText(state.flags.ascended ? '天门已开。这一世，真的飞升了。' : '吞掉旧敌，再把所得炼成自己的道。', 360, 883);
    c.font = '18px serif'; c.fillStyle = '#829187'; c.fillText(state.flags.ascended ? `凡界篇 v${S.VERSION} · 仙界是下一片更大的池塘` : `凡界道途未尽 · v${S.VERSION}`, 360, 945);
    canvas.toBlob(blob => { if (blob) { download(blob, '我欲飞升-道途命格.png'); announce('命格图已发起下载；浏览器限制下载时，可截图结算页面。'); } }, 'image/png');
  }
  function begin() {
    let seed;
    try { seed = crypto.getRandomValues(new Uint32Array(1))[0]; } catch { seed = Date.now() >>> 0; }
    // Create the run before consuming the selected trace so an unexpected
    // validation failure cannot erase the player's one-use inheritance.
    const next = E.createRun(seed, { carriedTrace: meta.nextTrace, sourceSeed: meta.nextTraceSource });
    const inherited = M.consumeTrace(meta);
    meta = inherited.meta;
    state = next; home = false; mortalSummary = false; dialog.close(); persist(); render();
  }
  function confirmNew() {
    if (!state && !warningText()) { begin(); return; }
    const inherited = find(D.TRACES, meta.nextTrace);
    modal('另起一世？', `<p class="intro">重新开始会替换当前进行中的本世存档。轮回册不会清空；${inherited ? `已凝练的「${esc(inherited.name)}」会被这一世继承并消耗。` : '当前没有等待继承的道痕。'}需要保留当前进度时，请先导出存档。</p>${button('export', '先导出当前存档', { ui: true, classes: 'secondary full', disabled: !state })}${button('confirm-new', inherited ? `确认转世 · 携「${esc(inherited.name)}」入世` : '确认重开 · 替换当前存档', { ui: true, classes: 'primary full' })}${button('close-dialog', '保留此世', { ui: true, classes: 'text-button full' })}`);
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('button'); if (!el || el.disabled) return;
    if (el.dataset.ui) {
      switch (el.dataset.ui) {
        case 'quantity-detail': {
          const [m,e] = el.dataset.id.split('|');
          modal('势能的数量级', `<p class="exact-number">${esc(window.FSQuantity.format({m:Number(m),e},true))}</p><p class="intro">保留 12 位有效数字与精确的十进制指数。超出普通数值范围后继续使用科学计数，不把它转成 Infinity，也不宣称无限整数精度。</p>`); break;
        }
        case 'immortal-continue': mortalSummary = false; home = false; render(); break;
        case 'mortal-summary': mortalSummary = true; render(); break;
        case 'immortal-journal':
          if (state?.immortal) modal('仙界命册', `<ol class="history">${state.immortal.journal.slice().reverse().map(j => `<li><small>仙界第 ${j.day} 日</small><p>${esc(j.text)}</p></li>`).join('')}</ol>${button('settings', '存档与说明', { ui: true, classes: 'secondary full' })}`);
          break;
        case 'audio-settings': audioSettings(); break;
        case 'audio-music': sound.update({ music: !sound.settings().music }); audioSettings(); break;
        case 'audio-effects': sound.update({ effects: !sound.settings().effects }); audioSettings(); break;
        case 'number-detail': modal('完整战力', `<p class="exact-number">${esc(F.full(Number(el.dataset.id)))}</p><p class="intro">主显示只改变排版，不改变战力计算或存档精度。</p>`); break;
        case 'dismiss-note':
          meta.tutorialSeen = [...new Set([...(meta.tutorialSeen || []), el.dataset.id])]; saveMeta(); render(); break;
        case 'tutorial-off': meta.tutorialHidden = true; saveMeta(); render(); break;
        case 'tutorial-reset': meta.tutorialHidden = false; meta.tutorialSeen = []; saveMeta(); dialog.close(); render(); break;
        case 'home': home = true; render(); break;
        case 'new': confirmNew(); break;
        case 'confirm-new':
          try { const old = localStorage.getItem(KEY); if (old) localStorage.setItem(BACKUP, old); } catch { /* Storage warning is surfaced by save(). */ }
          begin(); break;
        case 'continue': if (state) { home = false; mortalSummary = false; render(); } break;
        case 'journal': journal(); break;
        case 'codex': codex(); break;
        case 'settings': settings(); break;
        case 'carry-trace':
          if (!state) break;
          try {
            meta = M.selectTrace(meta, state, el.dataset.id); saveMeta(); render();
            sound.cue('trace');
            announce(`已凝练「${find(D.TRACES, el.dataset.id).name}」。它将在下一世被继承并消耗。`);
          } catch (error) { announce(error.message || '这枚道痕尚未形成。'); }
          break;
        case 'close-dialog': pendingImport = null; dialog.close(); break;
        case 'confirm-import':
          if (!pendingImport) { announce('没有待载入的数据。'); break; }
          if (pendingImport.type === 'run') {
            try { const old = localStorage.getItem(KEY); if (old) localStorage.setItem(BACKUP, old); } catch { /* Import can still work in memory. */ }
            state = pendingImport.data; pendingImport = null; home = false; mortalSummary = false; dialog.close(); persist(); render(); announce('本世存档已载入。');
          } else {
            meta = pendingImport.data; pendingImport = null; dialog.close(); saveMeta(); render(); announce('轮回册已载入。');
          }
          break;
        case 'share': share(); break;
        case 'export': if (state) { download(new Blob([E.serialize(state)], { type: 'application/json' }), '我欲飞升-存档.json'); announce('存档已发起下载。'); } break;
        case 'export-meta': download(new Blob([M.serialize(meta)], { type: 'application/json' }), '我欲飞升-轮回册.json'); announce('轮回册已发起下载。'); break;
        case 'export-raw':
          try { const raw = localStorage.getItem(KEY); if (!raw) announce('浏览器中没有原始存档。'); else download(new Blob([raw], { type: 'application/json' }), '我欲飞升-原始存档.json'); } catch { announce('浏览器拒绝访问本地存储。'); } break;
      }
      return;
    }
    if (!el.dataset.action || !state) return;
    try {
      const action = { type: el.dataset.action, id: el.dataset.id, choice: el.dataset.choice, kind: el.dataset.kind, revision: el.dataset.revision };
      if (el.dataset.delta) action.delta = Number(el.dataset.delta);
      const before = state.phase, beforeState = state;
      state = E.transition(state, action);
      const feedback = P.enrich(P.feedback(beforeState, state, action), {
        realm: D.REALMS[state.realm]?.name,
        fusion: state.fusions?.length > beforeState.fusions?.length ? find(D.FUSIONS, state.fusions.at(-1))?.name : '',
        mutation: state.mutations?.length > beforeState.mutations?.length ? find(D.MUTATIONS, state.mutations.at(-1))?.name : ''
      });
      if (action.type.startsWith('immortal-')) mortalSummary = false;
      try { sound.cue(window.FSAudio.cueFor(beforeState, state, action)); } catch { /* Audio must never interrupt a game action. */ }
      const noteId = document.querySelector('.tutorial-note')?.dataset.note;
      if (noteId && !['select', 'stat', 'preset', 'reroll-opening'].includes(action.type)) {
        meta.tutorialSeen = [...new Set([...(meta.tutorialSeen || []), noteId])];
      }
      clearTimeout(noticeTimer); notice.classList.remove('visible'); notice.textContent = '';
      persist(); render();
      showFeedback(feedback);
      if (['select', 'stat', 'preset'].includes(action.type)) {
        const target = [...document.querySelectorAll('[data-action]')].find(b => b.dataset.action === action.type && b.dataset.id === action.id && b.dataset.delta === el.dataset.delta);
        target?.focus({ preventScroll: true });
      } else document.getElementById('main').focus({ preventScroll: true });
      if (before !== state.phase && state.phase === 'draft') announce(`突破成功，踏入${D.REALMS[state.realm].name}。请选择一道天命。`, false);
      else if (before !== state.phase && state.phase === 'tribulation') announce('渡劫开始。三重劫尽，天门才会真正打开。', false);
      else if (before !== state.phase && state.phase === 'complete' && state.flags.ascended) announce('飞升成功。凡界篇已正式通关。', false);
    } catch (error) { announce(error.message || '此操作未能完成，存档未改变。'); }
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'audio-volume') return;
    const settings = sound.update({ volume: Number(event.target.value) / 100 });
    document.getElementById('audio-volume-label').textContent = `${Math.round(settings.volume * 100)}%`;
  });
  document.addEventListener('change', async event => {
    if (!['import-save', 'import-meta'].includes(event.target.id)) return;
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 200000) throw new Error('文件过大，请选择游戏导出的 JSON 文件。');
      if (event.target.id === 'import-save') {
        const incoming = E.deserialize(await file.text());
        pendingImport = { type: 'run', data: incoming };
        modal('载入这段道途？', `<p class="intro">即将载入：${D.REALMS[incoming.realm].name} · ${incoming.age} 岁。<br>确认后会替换当前本世进度；轮回册保留不变。</p>${button('confirm-import', '确认载入 · 替换当前进度', { ui: true, classes: 'primary full' })}${button('close-dialog', '取消 · 保留此世', { ui: true, classes: 'secondary full' })}`);
      } else {
        const incoming = M.deserialize(await file.text()), summary = M.summary(incoming);
        pendingImport = { type: 'meta', data: incoming };
        modal('载入这本轮回册？', `<p class="intro">即将载入：${summary.ended} 世记录，图谱 ${summary.discovered} / ${summary.total}。<br>确认后会替换当前轮回册；正在进行的本世存档不会改变。</p>${button('confirm-import', '确认载入 · 替换轮回册', { ui: true, classes: 'primary full' })}${button('close-dialog', '取消 · 保留当前轮回册', { ui: true, classes: 'secondary full' })}`);
      }
    } catch (error) { announce(`导入失败：${error.message}。原数据未改变。`); }
    finally { event.target.value = ''; }
  });
  render();
})();
