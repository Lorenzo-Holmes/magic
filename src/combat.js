(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSCombat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const EVENT_TYPES = Object.freeze(['encounter','player-hit','enemy-hit','crit','guard','trigger','devour','defeat','victory','drop']);
  const copy = value => JSON.parse(JSON.stringify(value));
  function requireThat(ok, message) { if (!ok) throw new Error(message); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function event(type, text, tone = 'normal') {
    requireThat(EVENT_TYPES.includes(type), '未知战斗回放事件。');
    return { type, text: String(text).slice(0, 180), tone };
  }
  function resolveCombat(input) {
    const data = copy(input || {}), enemy = data.enemy || {};
    requireThat(typeof enemy.name === 'string' && enemy.name.length > 0 && Number.isFinite(enemy.power) && enemy.power > 0, '战斗目标无效。');
    requireThat(Number.isFinite(data.playerPower) && data.playerPower > 0, '玩家战力无效。');
    requireThat(['fight','devour','boss'].includes(data.action), '战斗方式无效。');
    requireThat(Number.isFinite(data.chance) && data.chance >= 0 && data.chance <= 1, '胜率无效。');
    requireThat(Number.isFinite(data.roll) && data.roll >= 0 && data.roll < 1, '战斗随机值无效。');
    const ratio = data.playerPower / enemy.power;
    const win = ratio >= 2 || data.chance === 1 || data.roll < data.chance;
    const damage = ratio >= 2 ? 0 : win ? Math.max(0, Math.round(data.damageWin || 0)) : Math.max(0, Math.round(data.damageLose || 0));
    const reward = win ? Math.max(0, Math.round(data.reward || 0)) : 0;
    const replay = [event('encounter', `${enemy.name}现身。`, enemy.boss ? 'danger' : 'normal')];
    if (data.route) replay.push(event('trigger', `「${data.route}」先一步改变了战局。`, 'gold'));
    if (ratio >= 2) {
      replay.push(event('crit', `战力差距已经拉开，你一击压住${enemy.name}。`, 'gold'));
      replay.push(event('guard', '对方的反击没有形成有效伤害。', 'muted'));
    } else if (win) {
      replay.push(event('player-hit', `你抓住破绽，攻势落在${enemy.name}要害。`, 'gold'));
      if (damage > 0) replay.push(event('enemy-hit', `${enemy.name}的反击仍让你损失 ${damage} 点元气。`, 'danger'));
      else replay.push(event('guard', '你稳住架势，没有承受额外损伤。', 'muted'));
    } else {
      replay.push(event('player-hit', `你逼近${enemy.name}，但这一击没能终结战斗。`));
      replay.push(event('enemy-hit', `${enemy.name}反扑，你损失 ${damage} 点元气。`, 'danger'));
    }
    if (win && data.action === 'devour') replay.push(event('devour', `${enemy.name}的妖力开始被炼入自身。`, 'gold'));
    replay.push(win ? event('victory', ratio >= 2 ? '碾压结束。胜负在出手前就已经确定。' : '胜负已定，你站到了最后。', 'gold') : event('defeat', '这一战未成，你从死局中退了出来。', 'danger'));
    if (win && reward > 0) replay.push(event('drop', `战后所得：修为 +${reward}。`, 'gold'));
    return {
      version: VERSION,
      result: { win, ratio, chance: clamp(data.chance, 0, 1), damage, reward, action: data.action, enemyId: enemy.id || null },
      stateDelta: { vitality: damage ? -damage : 0, xp: reward, devours: win && data.action === 'devour' ? 1 : 0 },
      replayEvents: replay.slice(0, 10)
    };
  }
  function createReplay(resolution, id, extra = {}) {
    requireThat(resolution?.version === VERSION && Array.isArray(resolution.replayEvents), '战斗结算无效。');
    const events = resolution.replayEvents.map(copy);
    if (extra.dropText) events.push(event('drop', extra.dropText, 'rare'));
    const replay = {
      version: VERSION,
      id: String(id || '').slice(0, 96),
      enemy: String(extra.enemy || '').slice(0, 80),
      result: resolution.result.win ? 'victory' : 'defeat',
      events: events.slice(0, 10)
    };
    validateReplay(replay); return replay;
  }
  function validateReplay(replay) {
    if (replay === null) return true;
    requireThat(replay && replay.version === VERSION && typeof replay.id === 'string' && replay.id.length > 0 && replay.id.length <= 96, '战斗回放标识损坏。');
    requireThat(typeof replay.enemy === 'string' && replay.enemy.length <= 80, '战斗回放目标损坏。');
    requireThat(['victory','defeat'].includes(replay.result), '战斗回放结果损坏。');
    requireThat(Array.isArray(replay.events) && replay.events.length >= 2 && replay.events.length <= 10, '战斗回放事件数量损坏。');
    for (const item of replay.events) requireThat(item && EVENT_TYPES.includes(item.type) && typeof item.text === 'string' && item.text.length > 0 && item.text.length <= 180 && ['normal','gold','danger','muted','rare'].includes(item.tone), '战斗回放内容损坏。');
    return true;
  }
  return Object.freeze({ VERSION, EVENT_TYPES, resolveCombat, createReplay, validateReplay });
});
