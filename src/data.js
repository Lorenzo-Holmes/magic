(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.FSData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STATS = [
    { id: 'bone', name: '根骨', note: '战力、寿元与承伤' },
    { id: 'insight', name: '悟性', note: '闭关修为与参悟' },
    { id: 'luck', name: '气运', note: '天命品质与机缘' },
    { id: 'mind', name: '神识', note: '探查危险与秘藏' }
  ];
  const REALMS = [
    { name: '凡人', cap: 80, threshold: 100, multiplier: 1, years: 4 },
    { name: '炼气', cap: 120, threshold: 500, multiplier: 6, years: 7 },
    { name: '筑基', cap: 200, threshold: 2500, multiplier: 50, years: 10 },
    { name: '金丹', cap: 500, threshold: 12000, multiplier: 500, years: 18 },
    { name: '元婴', cap: 1000, threshold: 60000, multiplier: 5000, years: 35 },
    { name: '化神', cap: 3000, threshold: 300000, multiplier: 50000, years: 70 },
    { name: '炼虚', cap: 8000, threshold: 1500000, multiplier: 500000, years: 140 },
    { name: '合体', cap: 20000, threshold: 8000000, multiplier: 5000000, years: 280 },
    { name: '大乘', cap: 50000, threshold: 45000000, multiplier: 50000000, years: 560 },
    { name: '渡劫', cap: 100000, threshold: null, multiplier: 500000000, years: 0 }
  ];
  const RARITIES = [
    { name: '凡', weight: 46 }, { name: '良', weight: 32 },
    { name: '玄', weight: 17 }, { name: '仙', weight: 4 }, { name: '神', weight: 1 }
  ];
  // Effects use additive bonuses unless the engine explicitly documents otherwise.
  const TALENTS = [
    { id: 'strong', name: '身强体壮', rarity: 0, path: '肉身', description: '根骨 +2。寿元上限与战力随之提升。', effects: { bone: 2 } },
    { id: 'bright', name: '心思通透', rarity: 0, path: '修炼', description: '悟性 +2。每次闭关获得更多修为。', effects: { insight: 2 } },
    { id: 'fortunate', name: '小有福缘', rarity: 0, path: '气运', description: '气运 +2。提高稀有天命与机缘权重。', effects: { luck: 2 } },
    { id: 'aware', name: '耳聪目明', rarity: 0, path: '神魂', description: '神识 +2。更容易看破洞府机关。', effects: { mind: 2 } },
    { id: 'appetite', name: '胃口不错', rarity: 0, path: '吞噬', description: '吞噬修为 +10%。灵虫也不放过。', effects: { devour: 0.10 } },
    { id: 'hunter', name: '山野猎手', rarity: 0, path: '肉身', description: '对野兽、妖兽的有效战力 +15%。', effects: { beastPower: 0.15 } },
    { id: 'iron', name: '铜皮铁骨', rarity: 1, path: '肉身', description: '战斗元气损失 -20%。', effects: { guard: 0.20 } },
    { id: 'study', name: '举一反三', rarity: 1, path: '修炼', description: '闭关修为 +18%。', effects: { cultivate: 0.18 } },
    { id: 'spirit', name: '噬灵', rarity: 1, path: '吞噬', description: '吞噬修为 +25%。所有人均可基础吞噬。', effects: { devour: 0.25 } },
    { id: 'swordheart', name: '剑心', rarity: 1, path: '剑道', description: '习得《青云剑诀》后，战力 +25%。', effects: { swordPower: 0.25 } },
    { id: 'sense', name: '神识外放', rarity: 1, path: '神魂', description: '神识 +3。洞府可提前辨识危险。', effects: { mind: 3 } },
    { id: 'vital', name: '绵长气息', rarity: 1, path: '肉身', description: '闭关额外恢复 12 点元气。寿元上限 +12 年。', effects: { rest: 12, lifespan: 12 } },
    { id: 'dragonbone', name: '龙筋虎骨', rarity: 2, path: '肉身', description: '根骨 +3，全局战力 +15%。', effects: { bone: 3, power: 0.15 } },
    { id: 'seed', name: '天生道种', rarity: 2, path: '修炼', description: '闭关、历练与吞噬所得修为 +15%。', effects: { xp: 0.15 } },
    { id: 'blood', name: '炼血', rarity: 2, path: '吞噬', description: '吞噬修为 +35%，吞噬恢复 10 点元气。', effects: { devour: 0.35, devourHeal: 10 } },
    { id: 'swordbone', name: '天生剑骨', rarity: 2, path: '剑道', description: '习得剑诀后战力 +45%；与雷灵根形成雷剑体。', effects: { swordPower: 0.45 } },
    { id: 'fortune', name: '鸿运当头', rarity: 2, path: '气运', description: '气运 +4，历练修为 +15%。', effects: { luck: 4, explore: 0.15 } },
    { id: 'scarred', name: '经脉残缺', rarity: 2, path: '修炼', description: '闭关修为 -20%；每次破境后额外增加 8% 战力。', effects: { cultivate: -0.20, breakPower: 0.08 } },
    { id: 'stomach', name: '吞灵之胃', rarity: 3, path: '吞噬', description: '吞噬修为 +55%，吞噬额外恢复 15 点元气。', effects: { devour: 0.55, devourHeal: 15 } },
    { id: 'destiny', name: '天命之子', rarity: 3, path: '气运', description: '气运 +5；本世多获得 1 次悟道重抽。', effects: { luck: 5, redraw: 1 } },
    { id: 'goldbody', name: '金刚不坏', rarity: 3, path: '肉身', description: '全局战力 +20%，战斗元气损失 -25%。', effects: { power: 0.20, guard: 0.25 } },
    { id: 'morningdao', name: '朝闻道', rarity: 4, path: '修炼', description: '所有修为 +40%；行动消耗寿元 +25%。', effects: { xp: 0.40, ageCost: 0.25 } },
    { id: 'taotie', name: '饕餮之种', rarity: 4, path: '吞噬', description: '吞噬修为 +75%；与吞灵之胃融合为吞天魔胃。', effects: { devour: 0.75 } },
    { id: 'rebirth', name: '滴血重生', rarity: 4, path: '肉身', description: '本世首次战斗濒死时，恢复至 40 点元气。不抵消寿尽。', effects: { extraLife: 1 } }
  ];
  const ROOTS = [
    { id: 'mixed', name: '五行杂灵根', text: '灵气杂而不纯，却无五行之限。', effects: { cultivate: -0.08, explore: 0.15 } },
    { id: 'wood', name: '木灵根', text: '草木亲近你，闭关时元气恢复更快。', effects: { rest: 6 } },
    { id: 'metal', name: '金灵根', text: '金气锋锐。习得剑诀后战力 +15%。', effects: { swordPower: 0.15 } },
    { id: 'water', name: '水灵根', text: '上善若水。闭关修为 +10%。', effects: { cultivate: 0.10 } },
    { id: 'thunder', name: '雷灵根', text: '雷息伏于骨。全局战力 +8%，可与天生剑骨共鸣。', effects: { power: 0.08 } }
  ];
  const ORIGINS = [
    { id: 'herb', name: '药农之子', text: '你认得草木，却不愿困在一亩药田。', effects: { insight: 1 } },
    { id: 'orphan', name: '山野孤儿', text: '山里教会你的第一件事，是活下去。', effects: { bone: 1 } },
    { id: 'scribe', name: '落第书生', text: '半卷残书说，世间有不老之人。', effects: { mind: 1 } },
    { id: 'servant', name: '宗门杂役', text: '你扫过天阶，却从未获准踏上去。', effects: { luck: 1 } }
  ];
  const TRACES = [
    {
      id: 'devour', name: '噬界残痕', path: '吞噬', talentPath: '吞噬',
      description: '上一世未曾餍足的饥饿，留在轮回最深处。下一世开局至少出现一道吞噬天命。',
      hint: '吞噬更多妖兽，并以吞噬能力处理关键敌人与天劫。',
      echo: {
        title: '饥饿古井', text: '逃离妖蟒后，你在石隙尽头发现一口无水古井。井底只有一缕像活物般盘旋的残灵，你的胃先于记忆认出了它。',
        choice: '俯身饮尽井中残灵', result: '残灵入腹，没有带回前世修为，只让这一世更早记起：世间万物都可能成为养分。'
      },
      resonance: {
        title: '万物一口', text: '踏入元婴时，天地灵机第一次同时涌入感知。噬界残痕从万千气息中指出了那些可以被炼化的部分。',
        choice: '让残痕辨认天地之味', result: '你没有凭空得到力量，只是看见了一条前世曾走过、这一世仍需亲自走完的吞噬之路。'
      },
      tribulationStage: 2,
      route: { id: 'trace-devour', name: '借噬界残痕吞天门余光', note: '前世道痕路线 · 仅此一世', enemyFactor: 0.43 }
    },
    {
      id: 'sword', name: '剑心余烬', path: '剑道', talentPath: '剑道',
      description: '剑意没有随肉身消散。下一世开局至少出现一道剑道天命。',
      hint: '习得青云剑诀，以剑道路线破局并叩问天门。',
      echo: {
        title: '前世断剑', text: '石阶旁插着一截无主断剑。你尚未学剑，指尖却已经记得它应当如何出鞘。',
        choice: '以指代剑，续上旧式', result: '剑式只亮了一瞬便归于沉寂。你没有继承前世修为，却更早知道锋芒应该指向何处。'
      },
      resonance: {
        title: '天外剑鸣', text: '元婴凝成的一刻，云海之外有一声剑鸣回应你。那不是今生的剑，而是前世余烬在更大天地中的回声。',
        choice: '听完这一声剑鸣', result: '回声归于寂静。你仍需在这一世重新握剑，但已经知道天门并非不可斩开。'
      },
      tribulationStage: 2,
      route: { id: 'trace-sword', name: '以前世余烬一剑叩门', note: '前世道痕路线 · 仅此一世', enemyFactor: 0.43 }
    },
    {
      id: 'body', name: '不灭骨印', path: '肉身', talentPath: '肉身',
      description: '一副曾与天雷正面相抗的骨骼，留下无法磨灭的印记。下一世开局至少出现一道肉身天命。',
      hint: '提高根骨，以肉身路线承伤、破幻或渡过雷劫。',
      echo: {
        title: '无名骨碑', text: '一块无字石碑埋在山腹。你靠近时，碑中传来与自己心跳完全一致的震动。',
        choice: '以掌印回应骨鸣', result: '余震洗过四肢百骸，没有赐下神力，只让这一世的身体更早学会在重压下不退。'
      },
      resonance: {
        title: '山河同脉', text: '元婴初成，脚下山脉的震动与骨印短暂重合。群峰像一副更庞大的骨架，在云下缓慢呼吸。',
        choice: '以此身听山河脉动', result: '共鸣很快散去。山河没有成为你的力量，却提醒你：肉身也能承载远超肉身尺度的道。'
      },
      tribulationStage: 0,
      route: { id: 'trace-body', name: '唤醒不灭骨印承雷', note: '前世道痕路线 · 仅此一世', enemyFactor: 0.43 }
    },
    {
      id: 'soul', name: '照幽灵纹', path: '神魂', talentPath: '神魂',
      description: '照见过虚妄的神识，在轮回中仍保留一线清明。下一世开局至少出现一道神魂天命。',
      hint: '提高神识，选择蛇瞳或九幽妖瞳，并看破妖眼与心魔。',
      echo: {
        title: '前世回声', text: '薄雾里有人用你的声音念出一个尚未发生的结局。那不是预言，而是被轮回磨去名字的一次亲历。',
        choice: '回望声音来处', result: '回声散去，只留下无法复述的轮廓。你没有取回记忆，却知道虚妄并非无迹可寻。'
      },
      resonance: {
        title: '诸妄留隙', text: '元婴睁眼时，远山、云海与自己的影子同时出现一线错位。照幽灵纹告诉你，所有幻象都必须在某处留下缝隙。',
        choice: '记住那一道错位', result: '天地重新重合。你仍需靠今生神识看破敌人，但前世留下了一种不轻信眼前所见的本能。'
      },
      tribulationStage: 1,
      route: { id: 'trace-soul', name: '以照幽灵纹照破心魔', note: '前世道痕路线 · 仅此一世', enemyFactor: 0.42 }
    },
    {
      id: 'fortune', name: '天命余辉', path: '气运', talentPath: '气运',
      description: '一世机缘化为余辉，仍愿在下一次投生时照你一瞬。下一世开局至少出现一道气运天命。',
      hint: '积累高气运，选择天命护体，并以命数处理妖王或天门。',
      echo: {
        title: '旧签无字', text: '枯枝上挂着一枚褪色木签。正面无字，背面却有一道与你掌纹相接的细线。',
        choice: '将残签收入袖中', result: '木签化作灰烬，命数重新回到不可测之中。你只记住：偶然也可以被走成一条路。'
      },
      resonance: {
        title: '命数回环', text: '元婴成形时，几条本不相连的因果在神识中短暂交汇。天命余辉没有替你选择，只照亮了它们相遇的位置。',
        choice: '看清因果交汇之处', result: '光点随即熄灭。命数不会替你修行，但你知道下一次偶然出现时，应当伸手抓住。'
      },
      tribulationStage: 2,
      route: { id: 'trace-fortune', name: '借天命余辉推开仙门', note: '前世道痕路线 · 仅此一世', enemyFactor: 0.43 }
    },
    {
      id: 'insight', name: '悟道残卷', path: '修炼', talentPath: '修炼',
      description: '已经想通的道理不会完全遗失。下一世开局至少出现一道修炼天命。',
      hint: '提高悟性，以参悟和五行归一路线处理天地机缘与心魔。',
      echo: {
        title: '无字残页', text: '半张宣纸贴在岩壁上，风吹不动，雨也不湿。你看见的不是字，而是字曾经留下的位置。',
        choice: '依纸背压痕重写一遍', result: '笔画写成便自行消失。你没有得到答案，却比这一世原本更早提出了正确的问题。'
      },
      resonance: {
        title: '道理重现', text: '元婴凝成后，过去难以理解的天地变化忽然排成一页无字文章。悟道残卷只保留结构，答案仍需今生填写。',
        choice: '以今生所悟补全一行', result: '那一行随云气散去。前世没有替你作答，只证明已经想通的道理并不会完全消失。'
      },
      tribulationStage: 1,
      route: { id: 'trace-insight', name: '翻开悟道残卷明心见道', note: '前世道痕路线 · 仅此一世', enemyFactor: 0.43 }
    }
  ];
  const ENEMIES = [
    { id: 'worm', name: '食气灵虫', power: 7, beast: true, text: '石缝里有灵虫啃食苔藓，腹中透出一点青光。', fraction: 0.17 },
    { id: 'wolf', name: '独眼山狼', power: 17, beast: true, text: '狼影伏在灌木后。它也把你当成猎物。', fraction: 0.23 },
    { id: 'rat', name: '食气鼠妖', power: 75, beast: true, text: '鼠妖怀抱灵石，獠牙间逸出灰白妖气。', fraction: 0.20 },
    { id: 'boar', name: '铁鬃妖豕', power: 110, beast: true, text: '岩壁被獠牙撞碎。你听见沉重的鼻息。', fraction: 0.26 },
    { id: 'rogue', name: '黑风邪修', power: 205, beast: false, text: '他盯上了你的灵根。袍下血符正在燃烧。', fraction: 0.34 },
    { id: 'python', name: '赤鳞妖蟒', power: 150, beast: true, text: '赤鳞如火，妖气压得草木低伏。', fraction: 0.17 },
    { id: 'corpse', name: '筑基尸傀', power: 900, beast: false, text: '死去多年的修士忽然抬头，胸口还钉着一枚残破镇尸钉。', fraction: 0.19 },
    { id: 'fox', name: '青眼狐妖', power: 1400, beast: true, text: '青色妖火在林间一盏盏亮起。真正的狐影反而藏在最暗处。', fraction: 0.22 },
    { id: 'thunderling', name: '雷角蛟幼体', power: 2200, beast: true, text: '幼蛟盘在雷击木上，额角不断迸出细碎电光。', fraction: 0.28 },
    { id: 'bloodcult', name: '血煞魔修', power: 12000, beast: false, text: '血雾贴地翻滚。来人以活人精血淬炼金丹，气息腥甜得令人作呕。', fraction: 0.18 },
    { id: 'demonape', name: '搬山魔猿', power: 18000, beast: true, text: '山石在它掌下像泥块一样崩裂。它盯着你丹田中的金光，露出獠牙。', fraction: 0.22 },
    { id: 'threeeye', name: '三眼妖王', power: 24000, beast: true, boss: true, text: '第三只眼缓缓睁开。你看见的山、风与自己，都开始出现第二重影子。', fraction: 0 },
    { id: 'blackdragon', name: '黑水蛟', power: 180000, beast: true, text: '黑河倒卷，一条蛟影从水底抬头。它吐息时，整段河面都结出幽蓝霜纹。', fraction: 0.24 },
    { id: 'nascentlord', name: '元婴老怪', power: 310000, beast: false, text: '肉身尚未出现，婴火已经先一步照亮群山。那道神识正从百里之外锁定你。', fraction: 0.28 },
    { id: 'hundredeye', name: '百目魔君', power: 2700000, beast: false, text: '黑袍之下，一只又一只眼睛同时睁开。每一只都在念你的名字。', fraction: 0.25 },
    { id: 'ancientbeast', name: '上古凶兽残魂', power: 4300000, beast: true, text: '它只剩一缕残魂，却让山川灵脉同时震颤。真正的本体或许早已死去万年。', fraction: 0.30 },
    { id: 'voidbeast', name: '虚空吞灵兽', power: 38000000, beast: true, text: '空间像纸一样被咬去一角。那头东西没有固定形状，只有不断扩大的饥饿。', fraction: 0.27 },
    { id: 'riftlord', name: '裂界道人', power: 55000000, beast: false, text: '道人脚下每走一步，空间都会裂开一道无法愈合的细缝。', fraction: 0.30 },
    { id: 'fusiondemon', name: '合体魔尊', power: 620000000, beast: false, text: '法相与肉身已经不分彼此。魔尊抬手时，远处山峰像被无形巨掌攥碎。', fraction: 0.28 },
    { id: 'worldgiant', name: '山河巨灵', power: 780000000, beast: true, text: '它以群峰为骨，以江河为血。你第一次面对一头近乎等同于地貌本身的生灵。', fraction: 0.31 },
    { id: 'primedragon', name: '太古龙魂', power: 2400000000, beast: true, text: '龙魂横贯天穹。凡人只能看到一场延绵千里的赤金色云霞。', fraction: 0.28 },
    { id: 'outergod', name: '天外邪神投影', power: 3600000000, beast: false, text: '星空裂开一道竖瞳。那并非本体，只是某个更高存在投向此界的一道影子。', fraction: 0.32 }
  ];
  const MUTATIONS = [
    { id: 'redscale', name: '赤鳞', slot: '肉身', phrase: '臂上生出一线赤鳞。曾经的恐惧，成了你的甲。', description: '全局战力 +12%，战斗元气损失 -16%。', effects: { power: 0.12, guard: 0.16 }, next: '金丹时可熔为赤焰龙鳞' },
    { id: 'serpenteye', name: '蛇瞳', slot: '神魂', phrase: '瞳中闪过一道竖线。幽暗之处，开始有了轮廓。', description: '神识 +3，历练修为 +20%。', effects: { mind: 3, explore: 0.20 }, next: '金丹时可熔为九幽妖瞳' },
    { id: 'serpentblood', name: '妖蟒血', slot: '血脉', phrase: '妖血融入心脉。你的饥饿，第一次有了方向。', description: '吞噬修为 +30%，根骨 +2。', effects: { devour: 0.30, bone: 2 }, next: '金丹时可熔为蛟龙血脉' }
  ];
  const FUSIONS = [
    { id: 'flame-scale', name: '赤焰龙鳞', path: '肉身融合', description: '赤鳞吞纳金丹真火。战力 +28%，承伤再减 18%。', effects: { power: 0.28, guard: 0.18 }, requirement: '持有赤鳞' },
    { id: 'abyss-eye', name: '九幽妖瞳', path: '神魂融合', description: '蛇瞳照见虚妄之后。神识 +5，对幻术类强敌有效战力 +25%。', effects: { mind: 5, bossPower: 0.25, explore: 0.12 }, requirement: '持有蛇瞳' },
    { id: 'dragon-blood', name: '蛟龙血脉', path: '血脉融合', description: '妖蟒血在金丹中返祖。根骨 +4，吞噬修为 +45%，对妖兽战力 +20%。', effects: { bone: 4, devour: 0.45, beastPower: 0.20 }, requirement: '持有妖蟒血' },
    { id: 'thunder-sword', name: '雷剑体', path: '剑道融合', description: '雷灵根、剑骨与剑诀同鸣。战力 +35%，对三眼妖王额外 +20%。', effects: { power: 0.35, bossPower: 0.20 }, requirement: '雷灵根 × 天生剑骨 × 青云剑诀' },
    { id: 'devour-body', name: '吞天魔胃', path: '吞噬融合', description: '饕餮之种与吞灵之胃归于一炉。战力 +25%，吞噬收益再 +50%。', effects: { power: 0.25, devour: 0.50 }, requirement: '饕餮之种 × 吞灵之胃' },
    { id: 'golden-body', name: '金刚真身', path: '肉身融合', description: '将已有炼体法门压入金丹。战力 +25%，承伤再减 20%。', effects: { power: 0.25, guard: 0.20 }, requirement: '高根骨或高阶炼体天命' },
    { id: 'five-unity', name: '五行归一', path: '修炼融合', description: '杂而不乱，五气归丹。所有修为 +20%，战力 +18%。', effects: { xp: 0.20, power: 0.18 }, requirement: '五行杂灵根或高悟性' },
    { id: 'fate-veil', name: '天命护体', path: '气运融合', description: '将一路机缘炼作护身命数。战力 +18%，对妖王有效战力 +15%。', effects: { power: 0.18, bossPower: 0.15 }, requirement: '高气运' }
  ];
  const ADVANCED_EVENTS = [
    { id: 'sealed-cave', title: '封山古洞', text: '一座古洞府被阵纹封死。阵眼仍在呼吸，像一颗埋在山里的心脏。' },
    { id: 'thunder-pool', title: '雷池残痕', text: '昨夜天雷劈开山脊，石坑里积着一池尚未散尽的雷浆。' },
    { id: 'fox-den', title: '青灯狐影', text: '七盏青灯在林间自行移动。每一盏灯后，都像站着同一只狐妖。' },
    { id: 'sword-cliff', title: '断剑崖', text: '万千断剑插在崖壁里。风穿过剑孔时，像有人在极远处出剑。' },
    { id: 'blood-altar', title: '废弃血坛', text: '石坛上血迹早已发黑，阵纹中却仍残着一缕躁动精气。' },
    { id: 'mirror-lake', title: '照心湖', text: '湖面没有倒映天空，只映出另一个正在做不同选择的你。' },
    { id: 'bone-field', title: '白骨坡', text: '坡上埋着成百上千具妖兽白骨。最深处的骨骼仍在缓慢吞吐灵气。' },
    { id: 'fallen-star', title: '坠星铁', text: '夜里有流火坠山。天明后，只剩一块拳头大小、却让周围岩石下陷的黑铁。' }
  ];
  const HIGH_EVENTS = [
    { id: 'nascent-battlefield', realm: 4, title: '南荒古战场', text: '埋了千年的兵戈仍悬在半空。无主元婴在残旗之间游荡，像一盏盏不肯熄灭的灯。' },
    { id: 'nascent-sea', realm: 4, title: '无尽海雷潮', text: '海面被雷云压成墨色。每一道落雷都足以劈死寻常金丹，却在你眼里变成可以炼化的天火。' },
    { id: 'nascent-shell', realm: 4, title: '无主元婴', text: '一枚失去肉身的元婴蜷缩在古塔顶层。它睁眼时，开口说出了你前世并不存在的名字。' },
    { id: 'soul-city', realm: 5, title: '万魂旧城', text: '整座废城没有活人，却有百万道残念在夜里同时点灯。你的神识第一次覆盖了一整座城。' },
    { id: 'soul-rift', realm: 5, title: '天外裂隙', text: '天空裂开细缝，陌生星光落在掌心。那股灵气不属于此界，却正在尝试与你的元神共鸣。' },
    { id: 'dao-stele', realm: 5, title: '古宗道碑', text: '碑上没有文字。只有靠近时，脑海中才会浮现无数已经失传的修行路线。' },
    { id: 'void-nest', realm: 6, title: '虚空兽巢', text: '你跨出此界边缘，在没有上下左右的黑暗里发现了一座以空间碎片搭成的巢。' },
    { id: 'space-river', realm: 6, title: '空间暗河', text: '一条看不见的河从虚空深处流过。偶尔有另一个时代的碎片从水面浮起，又迅速消失。' },
    { id: 'ancient-gate', realm: 6, title: '上古界门', text: '界门只剩半扇。门后没有风景，只有另一片世界早已熄灭的余温。' },
    { id: 'world-form', realm: 7, title: '山河法相', text: '你盘坐七日，第一次让自己的法相覆盖整片山脉。河流在掌纹间改道，云层从肩侧经过。' },
    { id: 'demon-sky', realm: 7, title: '天外魔影', text: '一尊魔影越过界壁俯视众生。过去需要整个宗门抵挡的灾厄，如今只与你一人对视。' },
    { id: 'old-sect', realm: 7, title: '故宗钟鸣', text: '你曾仰望过的山门再次敲响警钟。只是这一次，护山大阵在你的神识中小得像一盏灯。' },
    { id: 'star-corpse', realm: 8, title: '星海残骸', text: '一颗死去的星辰从天外坠落，残骸中仍有足以焚毁大陆的余火。你伸手接住了它。' },
    { id: 'heaven-stele', realm: 8, title: '天道残碑', text: '碑上只刻着一句：此界众生，不得长生。你盯着那行字看了很久。' },
    { id: 'immortal-shadow', realm: 8, title: '仙门投影', text: '云海深处短暂出现一座门。门后有人影经过，却连低头看此界一眼都没有。' }
  ];
  return { STATS, REALMS, RARITIES, TALENTS, ROOTS, ORIGINS, TRACES, ENEMIES, MUTATIONS, FUSIONS, ADVANCED_EVENTS, HIGH_EVENTS };
});
