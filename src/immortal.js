(function (root, factory) {
  const data = typeof module === 'object' && module.exports ? require('./data.js') : root.FSData;
  const meta = typeof module === 'object' && module.exports ? require('./meta.js') : root.FSMeta;
  if (typeof module === 'object' && module.exports) module.exports = factory(data, meta);
  else root.FSImmortal = factory(data, meta);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, M) {
  'use strict';
  const VERSION = 2, PRESSURE = 1000000;
  const evolutionEngine = () => typeof module === 'object' && module.exports ? require('./evolution.js') : globalThis.FSEvolution;
  const LAWS = Object.freeze([
    { id: 'devour', name: '吞噬法则', description: '吞噬获得的仙元 +20%。仙气不再只是流过你的身体，而会留下能被消化的纹路。' },
    { id: 'sword', name: '锋芒法则', description: '仙界有效战力 +15%。凡界那一剑的锋芒，终于找到新的落点。' },
    { id: 'body', name: '不灭法则', description: '仙界战斗承伤 -25%。你不必比风更快，只需比伤口更顽强。' },
    { id: 'soul', name: '破妄法则', description: '对幻类仙兽的有效战力 +25%。倒影与本体之间，再也藏不住那条细缝。' },
    { id: 'fortune', name: '命线法则', description: '每第三次仙界吞噬额外获得一枚法则碎片。那些偶然，开始沿着同一根线靠近你。' },
    { id: 'insight', name: '归一法则', description: '重构仙躯所需仙元 -15%。理解此界的呼吸，比一味抵抗更接近长生。' }
  ]);
  const CREATURES = Object.freeze([
    { id: 'dew-beetle', name: '露甲仙蚁', factor: .24, reward: 22, level: 0, kind: 'beast', text: '草叶托着一滴仙露。小小甲虫伏在露下，把水中逸散的仙气一点一点拖走。' },
    { id: 'moss-deer', name: '苔角灵鹿', factor: .65, reward: 45, level: 1, kind: 'beast', text: '鹿角上长着一座微小的森林。它回头时，角上的露珠像一场雨落进草间。' },
    { id: 'glass-moth', name: '琉璃幻蛾', factor: 1.12, reward: 80, level: 2, kind: 'illusion', text: '蛾翼每扇动一次，地上便多出一个你的影子。只有最后一个影子没有跟着你呼吸。' },
    { id: 'jade-hare', name: '食星玉兔', factor: 1.65, reward: 120, level: 4, kind: 'beast', text: '它啃下半片星光，再把碎屑吐回夜空。你第一次觉得，那一口并非完全不可理解。' },
    { id: 'spirit-worm', name: '仙界噬灵虫', factor: 1.7, reward: 180, level: 3, kind: 'beast', boss: true, text: '还是那只虫。它甚至没有注意到你的归来，只顾把下一株仙草拖进腹中。它没有变强。' }
  ]);
  const PHASES = ['arrival', 'shelter', 'field', 'encounter', 'law', 'prologue-complete', 'dead'];
  const byId = (items, id) => items.find(item => item.id === id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
  function random(i) {
    let x = i.rng >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; i.rng = x >>> 0;
    return i.rng / 4294967296;
  }
  function record(i, text) { i.note = text; i.journal.push({ day: i.days, text }); i.journal = i.journal.slice(-40); }
  function createFromBridge(bridge) {
    M.validateMortalBridge(bridge);
    const base = Math.max(1, Math.floor(bridge.ascendedPower / PRESSURE));
    return { version: VERSION, phase: 'arrival', rng: ((bridge.sourceSeed ^ 0x5a17c39d) >>> 0) || 1,
      mortalPower: bridge.ascendedPower, basePower: base, wormPower: Math.max(2, Math.ceil(bridge.ascendedPower * 1.7 / PRESSURE)),
      lineage: bridge.lineage, mortalFusion: bridge.mortalFusion,
      health: 100, level: 0, essence: 0, fragments: 0, law: null, lawOffer: [], target: null,
      devours: 0, losses: 0, days: 0, steps: 0, wormSlain: false,
      note: '天门在背后闭合。你低头时，那只不起眼的噬灵虫正在啃食仙草。', journal: [], evolution: null };
  }
  function create(mortal) { return createFromBridge(M.createMortalBridge(mortal)); }
  function power(i, enemy = null) {
    const lawBonus = i.law === 'sword' ? .15 : i.law === 'soul' && enemy?.kind === 'illusion' ? .25 : 0;
    return Math.max(1, Math.floor(i.basePower * (1 + i.level * .45) * (1 + lawBonus) * (.65 + i.health * .0035)));
  }
  function enemy(i, id) {
    const creature = byId(CREATURES, id); requireThat(creature, '未知仙兽。');
    return { ...creature, power: creature.boss ? i.wormPower : Math.max(1, Math.round(i.basePower * creature.factor)) };
  }
  function threat(i, creature) {
    const ratio = power(i, creature) / creature.power;
    return { ratio, chance: ratio >= 2 ? 1 : ratio < .55 ? 0 : Math.max(.12, Math.min(.98, .5 + (ratio - 1) * .65)),
      label: ratio >= 2 ? '碾压 · 必胜' : ratio >= 1.2 ? '优势' : ratio >= .85 ? '势均力敌' : '凶险' };
  }
  function trainingCost(i) { return Math.ceil((20 + i.level * 15) * (i.law === 'insight' ? .85 : 1)); }
  function availableCreatures(i) { return CREATURES.filter(c => c.level <= i.level && (!c.boss || (i.law && !i.wormSlain))); }
  function makeLawOffer(i) {
    const offer = [i.lineage], pool = LAWS.filter(l => l.id !== i.lineage).map(l => l.id);
    while (offer.length < 3) offer.push(pool.splice(Math.floor(random(i) * pool.length), 1)[0]);
    return offer;
  }
  function transition(state, action) {
    validate(state); requireThat(action && typeof action.type === 'string', '无效仙界操作。');
    if (action.type.startsWith('evolution-')) {
      const next = evolutionEngine().transition(state, { ...action, type: action.type.slice(10) }); validate(next); return next;
    }
    const i = copy(state), type = action.type;
    if (type === 'approach') {
      requireThat(i.phase === 'arrival' && ['hide', 'test'].includes(action.id), '当前不能试探界压。');
      if (action.id === 'test') i.health = 70;
      i.phase = 'shelter';
      record(i, action.id === 'test' ? '你试着催动凡力，掌心却先被界压震裂。损失 30 点元气。那只虫没有追来——它根本没把你当作对手。' : '你压住了出手的冲动，退进石隙。数百亿凡力并未消失，只是此界用另一种尺度衡量力量。');
    } else if (type === 'adapt') {
      requireThat(i.phase === 'shelter', '你已经适应第一缕仙气。');
      i.phase = 'field'; i.essence += 25; i.health = Math.min(100, i.health + 20); i.days++;
      record(i, `你让「${byId(D.FUSIONS, i.mortalFusion)?.name || '本世道基'}」缓缓适应仙气，获得 25 仙元。此界的成长不再靠凡界闭关，而靠仙躯与法则。先从露甲仙蚁开始。`);
    } else if (type === 'rest') {
      requireThat(i.phase === 'field' && i.health < 100, '当前无需恢复元气。');
      i.health = Math.min(100, i.health + 35); i.days++;
      record(i, '你在仙草遮蔽的石隙里调息。元气恢复 35；没有额外仙元，不必冒险硬撑。');
    } else if (type === 'cultivate') {
      requireThat(i.phase === 'field', '先处理眼前的仙界遭遇。');
      i.essence = Math.min(100000, i.essence + 10); i.days += 3;
      record(i, '你花三日从界压中滤出一缕可用的仙气。仙元 +10。这条路很慢，但始终可走。');
    } else if (type === 'train') {
      requireThat(i.phase === 'field' && i.level < 8 && i.essence >= trainingCost(i), '仙元不足，或仙躯已达序章上限。');
      const cost = trainingCost(i); i.essence -= cost; i.level++; i.days++; i.health = Math.min(100, i.health + 25);
      const lines = ['凡界法力终于贴合新生仙脉。', '呼吸之间，仙气不再刺痛肺腑。', '你能看清仙草间每一次细小的灵机流动。', '昔日金丹中的光，开始在仙躯中重燃。', '那只虫的气息不再压得你低头。', '你已不必躲在石隙后观察它。', '该回去了。虫还在原处，变的只有你。', '第一轮仙躯重构完成；更多力量需要走出这片仙域。'];
      record(i, `仙躯重构 ${i.level}/8，消耗 ${cost} 仙元。${lines[i.level - 1]}`);
    } else if (type === 'hunt') {
      requireThat(i.phase === 'field' && availableCreatures(i).some(c => c.id === action.id), '当前无法寻找这头仙兽。');
      i.target = action.id; i.phase = 'encounter'; i.days++;
      record(i, enemy(i, action.id).text);
    } else if (type === 'retreat') {
      requireThat(i.phase === 'encounter', '没有需要避开的仙兽。');
      i.target = null; i.phase = 'field'; record(i, '你收敛气息，没有惊动它。这里不是凡界，活下来仍然是第一件事。');
    } else if (type === 'devour') {
      requireThat(i.phase === 'encounter', '没有可以吞噬的目标。');
      const target = enemy(i, i.target), t = threat(i, target);
      requireThat(t.chance > 0, '界压仍太强。先退去，重构仙躯再来。');
      const win = t.chance === 1 || random(i) < t.chance;
      const harm = t.ratio >= 2 ? 0 : Math.ceil((win ? 18 : 42) * (i.law === 'body' ? .75 : 1));
      i.health = Math.max(0, i.health - harm); i.target = null;
      if (!win) i.losses++;
      if (!i.health) { i.phase = 'dead'; record(i, '仙躯崩散。凡界飞升的成就并未失去，但这次仙界探索到此为止。你可以从飞升落点重试，或带着道痕转世。'); }
      else if (!win) { i.phase = 'field'; record(i, `你未能压住${target.name}，损失 ${harm} 元气后退回石隙。没有获得吞噬奖励。`); }
      else {
        const gain = Math.round(target.reward * (i.law === 'devour' ? 1.2 : 1));
        i.devours++; i.essence = Math.min(100000, i.essence + gain);
        i.fragments = Math.min(10000, i.fragments + (i.devours === 1 ? 3 : 1) + (i.law === 'fortune' && i.devours % 3 === 0 ? 1 : 0));
        i.phase = 'field';
        record(i, `吞噬${target.name}，仙元 +${gain}，法则碎片入手。${harm ? `损失 ${harm} 元气。` : '碾压无伤。'}它的力量第一次真正成为你在此界的一部分。`);
        if (!i.law) { i.phase = 'law'; i.lawOffer = makeLawOffer(i); }
        if (target.boss) { i.wormSlain = true; i.phase = 'prologue-complete'; record(i, '你把那只虫吞了。曾让你以为一切归零的存在，如今化为第一口真正属于仙界的修为。仙界序章完成。'); }
      }
    } else if (type === 'law') {
      requireThat(i.phase === 'law' && !i.law && i.lawOffer.includes(action.id) && i.fragments >= 1, '这枚法则当前不可选择。');
      i.law = action.id; i.lawOffer = []; i.fragments--; i.phase = 'field';
      record(i, `你留下「${byId(LAWS, i.law).name}」。候选受到凡界道途影响，但没有替你锁定职业。继续积累仙元，让仙躯承得住新的力量。`);
    } else throw new Error('未知仙界操作。');
    i.steps++; validate(i); return i;
  }
  function validate(i) {
    requireThat(i && typeof i === 'object' && !Array.isArray(i) && i.version === VERSION && (PHASES.includes(i.phase) || i.evolution && evolutionEngine().PHASES.includes(i.phase)), '仙界存档版本或阶段无效。');
    if (i.evolution) evolutionEngine().validate(i);
    for (const key of ['mortalPower','basePower','wormPower','rng']) requireThat(Number.isSafeInteger(i[key]) && i[key] > 0, '仙界力量数据损坏。');
    requireThat(i.rng <= 4294967295 && i.basePower === Math.max(1, Math.floor(i.mortalPower / PRESSURE)) && i.wormPower === Math.max(2, Math.ceil(i.mortalPower * 1.7 / PRESSURE)), '界压折算不一致。');
    for (const key of ['health','level','essence','fragments','devours','losses','days','steps']) requireThat(Number.isSafeInteger(i[key]) && i[key] >= 0 && i[key] <= 1000000000, '仙界状态损坏。');
    requireThat(i.health <= 100 && i.level <= 8 && i.essence <= 100000 && i.fragments <= 10000, '仙界资源越界。');
    requireThat(byId(LAWS, i.lineage) && byId(D.FUSIONS, i.mortalFusion), '凡界道基缺失。');
    requireThat(i.law === null || byId(LAWS, i.law), '法则数据损坏。');
    requireThat(Array.isArray(i.lawOffer) && new Set(i.lawOffer).size === i.lawOffer.length && i.lawOffer.every(id => byId(LAWS, id)), '法则签池损坏。');
    requireThat(i.phase === 'law' ? i.lawOffer.length === 3 && !i.law && i.fragments > 0 : i.lawOffer.length === 0, '法则阶段不一致。');
    requireThat(i.phase === 'encounter' ? byId(CREATURES, i.target) : i.target === null, '仙兽遭遇不一致。');
    requireThat(typeof i.wormSlain === 'boolean' && (i.phase !== 'prologue-complete' || i.wormSlain && i.law), '序章结局缺失。');
    requireThat(i.phase === 'dead' ? i.health === 0 : i.health > 0, '仙躯状态不一致。');
    requireThat(typeof i.note === 'string' && i.note.length <= 1500 && Array.isArray(i.journal) && i.journal.length <= 40 && i.journal.every(j => j && Number.isSafeInteger(j.day) && j.day >= 0 && typeof j.text === 'string' && j.text.length <= 1500), '仙界历程损坏。');
    return true;
  }
  function migrate(i) {
    if (i && i.version === 1) { i.version = 2; i.evolution = null; }
    return i;
  }
  return Object.freeze({ VERSION, PRESSURE, LAWS, CREATURES, create, createFromBridge, validate, transition, power, enemy, threat, trainingCost, availableCreatures, migrate });
});
