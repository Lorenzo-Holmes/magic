(function (root, factory) {
  const Q = typeof module === 'object' && module.exports ? require('./quantity.js') : root.FSQuantity;
  if (typeof module === 'object' && module.exports) module.exports = factory(Q);
  else root.FSEvolution = factory(Q);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Q) {
  'use strict';
  const SLOTS = Object.freeze({ body:'肉身', blood:'血脉', soul:'神魂', ability:'神通', law:'法则' });
  const traits = [
    ['iron-shell','玄铁仙甲','body',.07,.04,0,0,'甲壳承伤，代替旧有肉身槽。'],
    ['flame-armor','赤焰仙鳞','body',.09,.03,0,0,'凡界赤鳞被仙气淬亮。'],
    ['rift-shell','裂空外骨','body',.11,.02,0,0,'缝隙如甲，抵住界外来风。'],
    ['star-hide','星纹道躯','body',.08,.05,0,0,'星纹将冲击分散进周身。'],
    ['old-blood','前尘灵血','blood',.06,0,.03,0,'凡界来路仍在血中流动。'],
    ['dragon-blood','古蛟仙血','blood',.09,0,.05,0,'妖蟒到蛟龙，饥饿仍在进化。'],
    ['insect-blood','虫皇残血','blood',.08,.01,.06,0,'虫群的生命痕迹汇成一脉。'],
    ['star-blood','星髓灵液','blood',.10,0,.04,0,'已死星辰留下的最后一滴暖意。'],
    ['void-sight','破妄仙瞳','soul',.08,0,0,.10,'九幽妖瞳终于能读懂仙界幻象。'],
    ['echo-soul','回声元神','soul',.07,.02,0,.03,'将残念编成新的神魂外衣。'],
    ['star-sight','观星仙识','soul',.09,0,0,.08,'在星光熄灭之前，看清其来路。'],
    ['space-sense','虚空感知','ability',.08,0,0,.05,'察觉空间薄弱之处，可与破妄仙瞳融合。'],
    ['heaven-stomach','吞天仙胃','ability',.08,0,.10,0,'凡界吞噬之道在此界长出新的胃。'],
    ['thunder-edge','雷霆仙剑','ability',.12,0,0,0,'雷与剑不再只是凡界的共鸣。'],
    ['wind-step','风痕遁法','ability',.07,.04,0,0,'在敌意触及之前，先移开半步。'],
    ['world-eye','界瞳','soul',.25,.02,0,.18,'融合：破妄仙瞳与虚空感知。看见的不再只是幻象。'],
    ['world-stomach','噬界仙胃','ability',.25,0,.16,0,'融合：吞天仙胃借吞噬法则改写边界。'],
    ['star-body','不灭星龙躯','body',.26,.08,0,0,'融合：赤焰仙鳞与古蛟仙血。'],
    ['star-sword','斩星雷剑','ability',.27,0,0,.06,'融合：雷霆仙剑与观星仙识。']
  ].map(([id,name,slot,power,guard,devour,illusion,text])=>({id,name,slot,power,guard,devour,illusion,text}));
  const LAW_NAMES = { devour:'吞噬',sword:'锋芒',body:'不灭',soul:'破妄',fortune:'命线',insight:'归一' };
  for (const [id,name] of Object.entries(LAW_NAMES)) traits.push({ id:`law-${id}`,name:`${name}法则纹`,slot:'law',power:.05,guard:0,devour:0,illusion:0,text:'替换此槽会切换核心法则；升级提高法则纹的承载势能。' });
  const TRAITS = Object.freeze(traits.map(Object.freeze));
  const RECIPES = Object.freeze([
    {id:'world-eye',name:'凝成界瞳',needs:['void-sight','space-sense'],result:'world-eye',cost:6},
    {id:'world-stomach',name:'熔铸噬界仙胃',needs:['heaven-stomach','law-devour'],result:'world-stomach',cost:8,catalyst:'law-devour'},
    {id:'star-body',name:'化为不灭星龙躯',needs:['flame-armor','dragon-blood'],result:'star-body',cost:6},
    {id:'star-sword',name:'炼成斩星雷剑',needs:['thunder-edge','star-sight'],result:'star-sword',cost:6}
  ]);
  const WORLDS = Object.freeze([
    {name:'下界仙域',rank:'初临仙域',scene:'nascent'},
    {name:'仙城废墟',rank:'真仙',scene:'nascent',gate:'镇墟古像',event:'千盏无主灯',text:'整座仙城没有屋顶。夜里，灯仍照着无人归来的门。你站在街心，听见每一盏灯都在等一个已经死去的名字。'},
    {name:'星海遗迹',rank:'玄仙',scene:'void',gate:'食星古鲸',event:'星辰的骨灰',text:'你踩在一颗星辰冷却后的骨架上。远处的鲸鸣穿过真空，不靠声音，而靠你身上每一寸仙骨同时震颤。'},
    {name:'法则裂谷',rank:'仙王',scene:'void',gate:'裂界螳皇',event:'被剪断的因果',text:'裂谷两侧是同一座山的过去与未来。中间什么也没有。每向前一步，你都必须决定哪一部分自己不再返回。'},
    {name:'世界边缘',rank:'噬界者',scene:'tribulation',gate:'界外吞世影',event:'一界之壳',text:'天地在脚下弯曲。你曾视作全部的世界，如今像一枚贴在夜色中的卵。壳外有东西在呼吸，它也饿了。'}
  ]);
  const AFFIXES = Object.freeze([
    {id:'mist',name:'灵雾漫流',enemy:.94,reward:1,text:'仙兽势能略弱，灵机流动平缓。'},
    {id:'vein',name:'仙脉喷薄',enemy:1,reward:1.2,text:'所有狩猎仙元收益提高 20%。'},
    {id:'fury',name:'法则躁动',enemy:1.18,reward:1.25,text:'仙兽与守界者势能提高 18%，仙元收益提高 25%。'},
    {id:'hollow',name:'寂静残界',enemy:1.06,reward:.95,text:'灵机稀薄；缓炼与调息仍然可用。'}
  ]);
  const CREATURES = Object.freeze([
    {id:'ruin-beetle',name:'废墟吞金甲',world:1,factor:.40,reward:40,kind:'beast',drops:['iron-shell','old-blood','space-sense'],text:'甲虫吞下断裂的铜钟，钟声却从它背壳内继续传来。'},
    {id:'bell-ghost',name:'无面钟灵',world:1,factor:.72,reward:65,kind:'illusion',drops:['void-sight','echo-soul','law-soul'],text:'每一声钟响都会替它换一张脸。只有你自己的脸，始终藏在最后。'},
    {id:'star-serpent',name:'吞星幼蛟',world:2,factor:.45,reward:55,kind:'beast',drops:['dragon-blood','star-hide','heaven-stomach'],text:'幼蛟拖着一串碎星游过。星光在它喉间明灭，像尚未消化的灯火。'},
    {id:'ash-phoenix',name:'星烬孤凰',world:2,factor:.82,reward:85,kind:'beast',drops:['star-blood','star-sight','thunder-edge'],text:'它不再有火，只剩一身温热的灰。灰里仍有一颗星辰不肯熄灭。'},
    {id:'void-mantis',name:'虚空螳螂',world:3,factor:.50,reward:75,kind:'beast',drops:['space-sense','rift-shell','insect-blood'],text:'前肢划过，空间缺了一角。它将那片空白含在口中，缓慢咀嚼。'},
    {id:'mirror-eel',name:'断因镜鳗',world:3,factor:1.0,reward:110,kind:'illusion',drops:['void-sight','wind-step','law-insight'],text:'你看见它时，倒影已经先咬住了你的影子。它吞食的不是肉身，而是尚未发生的选择。'},
    {id:'world-tick',name:'界壳寄生者',world:4,factor:.55,reward:95,kind:'beast',drops:['insect-blood','star-hide','law-devour'],text:'它伏在世界外壁，口器刺进千万山河。过去的人们，把那一口称作天灾。'},
    {id:'night-soul',name:'永夜残魂',world:4,factor:1.1,reward:140,kind:'illusion',drops:['star-sight','thunder-edge','law-fortune'],text:'无数早已消失的夜晚聚成一道影子。它看见你的光，便开始回忆自己如何熄灭。'}
  ]);
  const PHASES = ['world','world-event','world-encounter','evolve','world-cleared','ending','dead'];
  const byId = (items,id) => items.find(x=>x.id===id), clone = x=>JSON.parse(JSON.stringify(x));
  const need = (ok,message)=>{if(!ok)throw new Error(message);};
  const indexValid = n => typeof n === 'string' && n.length <= 2048 && /^[1-9]\d*$/.test(n);
  function random(i) { let x=i.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;i.rng=x>>>0;return i.rng/4294967296; }
  function enemyLaws(i) { const pool=Object.keys(LAW_NAMES),out=[];for(let n=0;n<2;n++)out.push(pool.splice(Math.floor(random(i)*pool.length),1)[0]);return out; }
  function note(i,text) { i.note=text;i.journal.push({day:i.days,text});i.journal=i.journal.slice(-40); }
  function effects(i) {
    const result={power:0,guard:0,devour:0,illusion:0};
    for(const slot of Object.values(i.evolution.slots)) if(slot) { const t=byId(TRAITS,slot.id); for(const k of Object.keys(result)) result[k]+=(t[k]||0)*slot.level; }
    return result;
  }
  function power(i, target=null) {
    const e=i.evolution,fx=effects(i);
    const bonus=(i.law==='sword'?.15:0)+(target?.kind==='illusion'?fx.illusion+(i.law==='soul'?.25:0):0);
    return Q.multiply(e.scale,(1+e.refinement*.2+fx.power)*(1+bonus)*(.65+i.health*.0035));
  }
  function pressure(e) { return e.endless ? 1.18+(BigInt(e.layer)>100n?.8:Number(BigInt(e.layer))*.008) : 1; }
  function enemy(i,id,route='direct') {
    const e=i.evolution,affix=byId(AFFIXES,e.affix), c=id==='gate'?{id:'gate',name:WORLDS[e.world].gate,factor:1.15,reward:100,kind:'beast',boss:true}:byId(CREATURES,id);
    need(c && (c.boss || c.world===e.world),'当前世界没有这个目标。');
    const lawScale=(e.enemyLaws.includes('sword')?1.08:1)*(e.enemyLaws.includes('body')?1.10:1);
    return {...c,kind:e.enemyLaws.includes('soul')?'illusion':c.kind,
      power:Q.multiply(e.scale,c.factor*affix.enemy*pressure(e)*lawScale*(c.boss&&route==='resonate'?(e.enemyLaws.includes(i.law)?.65:.7):1))};
  }
  function threat(i,target) { const r=Q.ratio(power(i,target),target.power);return {ratio:r,chance:r>=2?1:r<.55?0:Math.max(.12,Math.min(.98,.5+(r-1)*.65)),label:r>=2?'碾压 · 必胜':r>=1.2?'优势':r>=.85?'势均力敌':'凶险'}; }
  function trainingCost(i) { return Math.ceil((30+i.evolution.refinement*15)*(i.law==='insight'?.85:1)); }
  function recipes(i) { const ids=Object.values(i.evolution.slots).filter(Boolean).map(x=>x.id);return RECIPES.filter(r=>r.needs.every(id=>ids.includes(id))); }
  function eventChoices(i) {
    const out=[{id:'quiet',name:'收拢边缘灵机',essence:35,fragments:2,risk:0,note:'稳妥印证，不损元气'}, {id:'force',name:'强行纳入仙躯',essence:90,fragments:5,risk:24,note:'获得更多资源，损失 24 元气，可能死亡'}];
    if((i.evolution.slots.law?.level||0)>=2) out.push({id:'law',name:`以${LAW_NAMES[i.law]}法则回应`,essence:55,fragments:3,risk:0,note:'二阶法则纹路线，不损元气'});
    return out;
  }
  function create(i) {
    need(i.wormSlain && i.phase==='prologue-complete' && !i.evolution,'先完成噬灵虫复仇。');
    const ability={'devour-body':'heaven-stomach','dragon-blood':'heaven-stomach','thunder-sword':'thunder-edge','abyss-eye':'space-sense','golden-body':'wind-step','flame-scale':'thunder-edge','five-unity':'space-sense','fate-veil':'wind-step'}[i.mortalFusion];
    const item=id=>({id,level:1});
    return {version:1,world:1,layer:'1',scale:Q.from(i.basePower*(1+i.level*.45)),refinement:0,
      affix:AFFIXES[Math.floor(random(i)*AFFIXES.length)].id,enemyLaws:enemyLaws(i),proof:false,hunts:0,killCycle:0,
      target:null,offer:[],lastPrey:null,completed:false,endless:false,cleared:[],fusions:[],
      slots:{body:item(i.mortalFusion==='flame-scale'?'flame-armor':'iron-shell'),blood:item(i.mortalFusion==='dragon-blood'?'dragon-blood':'old-blood'),
        soul:item(i.mortalFusion==='abyss-eye'?'void-sight':'echo-soul'),ability:item(ability),law:item(`law-${i.law}`)}};
  }
  function nextWorld(i) {
    const e=i.evolution;
    e.world=e.world===4?1:e.world+1;e.layer=(BigInt(e.layer)+1n).toString();e.scale=Q.multiply(e.scale,4);
    e.refinement=0;e.proof=false;e.hunts=0;e.target=null;e.offer=[];e.lastPrey=null;
    e.affix=AFFIXES[Math.floor(random(i)*AFFIXES.length)].id;e.enemyLaws=enemyLaws(i);i.health=100;i.phase='world';
    note(i,`你越过界壁。${WORLDS[e.world].name}在前，已有力量随世界尺度四倍展开；新的守界者并不会因你的到来而退让。${byId(AFFIXES,e.affix).text}`);
  }
  function transition(state,action) {
    const i=clone(state);need(action && typeof action.type==='string','无效进化操作。');
    if(action.type==='enter') { i.evolution=create(i);i.phase='world';note(i,'你走出那片仙草。凡界融合没有被丢弃，它们成为肉身、血脉、神魂、神通与法则五处进化根基。每个槽位只能保留一种力量。');validate(i);return i; }
    validate(i);const e=i.evolution,field=()=>need(i.phase==='world','先处理眼前的事件或进化选择。');
    if(action.type==='explore') {field();need(!e.proof,'此界印证已经完成。');i.phase='world-event';note(i,WORLDS[e.world].text);}
    else if(action.type==='event') {
      need(i.phase==='world-event','当前没有世界事件。');const choice=eventChoices(i).find(c=>c.id===action.id);need(choice,'这条印证路线尚不可用。');
      i.health=Math.max(0,i.health-choice.risk);
      if(!i.health) {i.phase='dead';note(i,'你试图强纳一界灵机，却让仙躯先一步崩散。此界尚未获得印证。');}
      else {i.essence=Math.min(100000,i.essence+choice.essence);i.fragments=Math.min(10000,i.fragments+choice.fragments);e.proof=true;i.phase='world';note(i,`${WORLDS[e.world].event}：${choice.name}。此界印证已成，仙元 +${choice.essence}，碎片 +${choice.fragments}。`);}
    } else if(action.type==='rest') {field();need(i.health<100,'元气已满。');i.health=Math.min(100,i.health+35);note(i,'你暂时不与世界争。元气恢复 35，所有已经选定的进化仍在。');}
    else if(action.type==='cultivate') {field();need(i.essence<100000,'仙元已达携带上限。');i.essence=Math.min(100000,i.essence+20);note(i,'你缓慢滤出此界仙气。仙元 +20，无战斗风险。');}
    else if(action.type==='distill') {field();need(i.essence>=60 && i.fragments<10000,'需要 60 仙元与可用碎片空间。');i.essence-=60;i.fragments++;note(i,'你将 60 仙元压成一枚法则碎片。没有额外抽取，也不改变已有候选。');}
    else if(action.type==='refine') {field();const cost=trainingCost(i);need(e.refinement<20 && i.essence>=cost,'仙元不足，或当前界域已炼至上限。');i.essence-=cost;e.refinement++;note(i,`本界炼化 ${e.refinement}/20。已消耗 ${cost} 仙元；进入下一界时，炼化会转入新的尺度，不替你选择进化。`);}
    else if(action.type==='upgrade') {
      field();const slot=e.slots[action.id];need(slot && slot.level<5 && i.fragments>=slot.level+2,'该槽无法升级，或碎片不足。');
      i.fragments-=slot.level+2;slot.level++;note(i,`${byId(TRAITS,slot.id).name}升至 ${slot.level} 阶。槽位没有增加，已有特性随之增强。`);
    } else if(action.type==='fuse') {
      field();const r=recipes(i).find(r=>r.id===action.id);need(r && i.fragments>=r.cost,'融合条件未满足或碎片不足。');
      const out=byId(TRAITS,r.result);i.fragments-=r.cost;
      for(const id of r.needs) if(id!==r.catalyst) e.slots[byId(TRAITS,id).slot]=null;
      e.slots[out.slot]={id:out.id,level:1};if(!e.fusions.includes(r.id))e.fusions.push(r.id);
      note(i,`${r.name}。旧能力已融入新槽位${r.catalyst?'；法则作为引子保留':'，被消耗的其他槽位可以重新寻找力量'}。不额外叠加旧效果。`);
    } else if(action.type==='hunt') {
      field();enemy(i,action.id);need(action.id!=='gate' || e.proof&&e.hunts>=2,'需要此界印证与至少两次吞噬，才能锁定守界者。');
      e.target=action.id;i.phase='world-encounter';note(i,action.id==='gate'?`你终于站在${WORLDS[e.world].gate}之前。这一次，是它挡住了通往更大世界的门。`:byId(CREATURES,action.id).text);
    } else if(action.type==='retreat') {need(i.phase==='world-encounter','没有需要避开的目标。');e.target=null;i.phase='world';note(i,'你收起锋芒。没有丢掉这条路，只是决定稍后再走。');}
    else if(action.type==='devour') {
      need(i.phase==='world-encounter','当前没有可以吞噬的目标。');
      need(['direct','resonate'].includes(action.id),'请选择明确的吞噬方式。');
      need(action.id!=='resonate' || e.target==='gate' && i.law,'只有守界者能使用法则破局。');
      const target=enemy(i,e.target,action.id),t=threat(i,target),win=t.chance===1||random(i)<t.chance;
      need(t.chance>0,'势能仍然悬殊，先退开积累。');
      const harm=t.ratio>=2?0:Math.ceil((win?18:40)*Math.max(.3,1-effects(i).guard-(i.law==='body'?.25:0)));
      i.health=Math.max(0,i.health-harm);e.target=null;
      if(!win)i.losses=Math.min(1000000000,i.losses+1);
      if(!i.health) {i.phase='dead';note(i,'仙躯再次崩散。已经抵达的世界仍在；可以在此界重整旗鼓，不必重走凡界。');}
      else if(!win) {i.phase='world';note(i,`未能镇压${target.name}，损失 ${harm} 元气。没有领取吞噬奖励。`);}
      else {
        i.devours=Math.min(1000000000,i.devours+1);e.hunts=Math.min(100000,e.hunts+1);e.killCycle=(e.killCycle+1)%3;
        const gain=Math.round(target.reward*byId(AFFIXES,e.affix).reward*(1+effects(i).devour+(i.law==='devour'?.2:0)));
        i.essence=Math.min(100000,i.essence+gain);i.fragments=Math.min(10000,i.fragments+2+(i.law==='fortune'&&e.killCycle===0?1:0));
        if(target.boss) {
          if(!e.cleared.includes(e.world))e.cleared.push(e.world);
          if(e.world===4&&!e.endless) {i.phase='ending';e.completed=true;note(i,'你吞下了挡在世界边缘的影子。凡界的妖蟒、仙域的灵虫、如今的界外之影，都成为身后之物。第一轮仙界进化正式完成。无尽诸天已开放，但你也可以在这里收束这一世。');}
          else {i.phase='world-cleared';note(i,`${target.name}已成为一口仙元。${WORLDS[e.world].name}的界门不再闭合。选择踏出，才会进入下一界。`);}
        } else {
          e.lastPrey=target.id;e.offer=[...target.drops];i.phase='evolve';
          note(i,`吞噬${target.name}，仙元 +${gain}。三种力量尚未定形：留下其中一种，或全部化为碎片。它们不能同时占据你的身体。`);
        }
      }
    } else if(action.type==='choose') {
      need(i.phase==='evolve' && e.offer.includes(action.id),'当前没有这条进化候选。');
      const t=byId(TRAITS,action.id),old=e.slots[t.slot];
      if(old?.id===t.id) {if(old.level<5)old.level++;else i.fragments=Math.min(10000,i.fragments+1);}
      else e.slots[t.slot]={id:t.id,level:1};
      if(t.slot==='law')i.law=t.id.slice(4);
      e.offer=[];e.lastPrey=null;i.phase='world';note(i,`${SLOTS[t.slot]}留下一道「${t.name}」。${old&&old.id!==t.id?`原有「${byId(TRAITS,old.id).name}」已被替换，不再提供效果。`:'同类力量归入同一槽，不新增额外槽位。'}`);
    } else if(action.type==='dissolve') {need(i.phase==='evolve','没有尚未定形的候选。');i.fragments=Math.min(10000,i.fragments+2);e.offer=[];e.lastPrey=null;i.phase='world';note(i,'你没有留下新的器官或血脉。三份候选化作两枚碎片，现有五槽位保持不变。');}
    else if(action.type==='advance') {need(i.phase==='world-cleared','尚未打开此界界门。');nextWorld(i);}
    else if(action.type==='endless') {need(i.phase==='ending' && e.completed && !e.endless,'先完成正式仙界结局。');e.endless=true;nextWorld(i);}
    else if(action.type==='recover') {need(i.phase==='dead','当前无需重整仙躯。');i.health=100;e.refinement=0;e.target=null;e.offer=[];e.lastPrey=null;i.phase='world';note(i,'你在已经抵达的界域重整仙躯。保留五槽进化与世界层数，重修本界炼化；随机状态不会倒退，失败奖励不会补发。');}
    else throw new Error('未知进化操作。');
    i.steps=Math.min(1000000000,i.steps+1);i.days=Math.min(1000000000,i.days+1);validate(i);return i;
  }
  function validate(i) {
    const e=i?.evolution;
    need(e&&e.version===1&&PHASES.includes(i.phase),'进化状态无效。');Q.validate(e.scale);
    need(Number.isInteger(e.world)&&e.world>=1&&e.world<=4&&indexValid(e.layer),'世界索引损坏。');
    need(Array.isArray(e.enemyLaws)&&e.enemyLaws.length===2&&new Set(e.enemyLaws).size===2&&e.enemyLaws.every(id=>Object.hasOwn(LAW_NAMES,id)),'仙兽法则组合损坏。');
    need(typeof e.proof==='boolean'&&typeof e.completed==='boolean'&&typeof e.endless==='boolean'&&(!e.endless||e.completed),'世界进度损坏。');
    need(Number.isInteger(e.refinement)&&e.refinement>=0&&e.refinement<=20&&Number.isInteger(e.hunts)&&e.hunts>=0&&e.hunts<=100000&&Number.isInteger(e.killCycle)&&e.killCycle>=0&&e.killCycle<=2&&byId(AFFIXES,e.affix),'界域词条或炼化损坏。');
    need(e.slots && Object.keys(e.slots).length===5 && Object.keys(SLOTS).every(key=>e.slots[key]===null||byId(TRAITS,e.slots[key]?.id)?.slot===key&&Number.isInteger(e.slots[key].level)&&e.slots[key].level>=1&&e.slots[key].level<=5),'进化槽位损坏。');
    need(!e.slots.law||e.slots.law.id===`law-${i.law}`,'核心法则与法则槽不一致。');
    need(Array.isArray(e.offer)&&new Set(e.offer).size===e.offer.length&&e.offer.every(id=>byId(TRAITS,id)),'进化候选损坏。');
    need(i.phase==='evolve'?e.offer.length===3&&byId(CREATURES,e.lastPrey)?.world===e.world:e.offer.length===0&&e.lastPrey===null,'进化领取阶段不一致。');
    if(i.phase==='evolve')need(e.offer.every((id,n)=>id===byId(CREATURES,e.lastPrey).drops[n]),'候选与实际吞噬目标不一致。');
    need(i.phase==='world-encounter'?e.target==='gate'||byId(CREATURES,e.target)?.world===e.world:e.target===null,'世界遭遇不一致。');
    if(i.phase==='world-encounter'&&e.target==='gate')need(e.proof&&e.hunts>=2,'守界遭遇缺少印证或吞噬前置。');
    need(Array.isArray(e.cleared)&&new Set(e.cleared).size===e.cleared.length&&e.cleared.every(n=>[1,2,3,4].includes(n))&&Array.isArray(e.fusions)&&new Set(e.fusions).size===e.fusions.length&&e.fusions.every(id=>byId(RECIPES,id)),'进化历程损坏。');
    if(i.phase==='ending')need(e.completed&&!e.endless&&e.cleared.length===4,'正式结局前置条件缺失。');
    need(e.cleared.every((n,index)=>n===index+1),'已通过的世界顺序损坏。');
    if(e.completed)need(e.cleared.length===4,'正式进化尚未完成。');
    if(!e.endless && i.phase!=='ending')need(e.cleared.length===e.world-(i.phase==='world-cleared'?0:1),'当前世界与通关历程不一致。');
    need(i.wormSlain && i.law && (i.phase==='dead'?i.health===0:i.health>0),'仙界进化前置条件缺失。');
    return true;
  }
  return Object.freeze({SLOTS,TRAITS,RECIPES,WORLDS,AFFIXES,CREATURES,PHASES,create,validate,transition,power,enemy,threat,effects,trainingCost,recipes,eventChoices});
});
