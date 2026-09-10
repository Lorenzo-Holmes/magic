(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FSJourney=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1,HISTORY_LIMIT=18;
  const REGIONS=Object.freeze([
    {id:'forest',name:'黑风林',min:0,risk:0,x:22,y:67,subtitle:'林深有药，夜行有兽',material:'spirit-herb'},
    {id:'marsh',name:'芦花渡',min:0,risk:2,x:77,y:78,subtitle:'水路、旧债与失落的船',material:'spirit-dew'},
    {id:'village',name:'青石集',min:0,risk:1,x:34,y:44,subtitle:'以物易物，听人说山外',material:'beast-bone'},
    {id:'peaks',name:'断剑山',min:1,risk:5,x:22,y:20,subtitle:'残碑有字，剑气未散',material:'thunder-sand'},
    {id:'ruins',name:'栖霞故寺',min:2,risk:8,x:69,y:24,subtitle:'破阵寻典，旧事未平',material:'star-iron'},
    {id:'canyon',name:'赤砂界隙',min:4,risk:11,x:84,y:51,subtitle:'越过天险，触及另一方天地',material:'void-dust'}
  ]);
  const ROUTES=Object.freeze([
    {id:'forest-herbs',region:'forest',name:'寻药入山',stat:'insight',risk:0,kind:'medicine',purpose:'带回伤药与青露灵草',scenes:[['背阴药坡','药草长在湿滑岩壁下。你要辨认根茎，也要留心脚下。'],['空心老树','树洞里有新鲜爪痕，药香却从深处传来。'],['守药獾','一只山獾伏在最后一株灵草旁，正盯着你的行囊。']]},
    {id:'forest-tracks',region:'forest',name:'循迹猎妖',stat:'bone',risk:8,kind:'material',purpose:'妖骨与较多实战修为',scenes:[['溪边兽印','两行足印在溪边交错，体型较大的那只还未走远。'],['风倒木','倒木后传来低吼。绕路会耗尽这段白昼。'],['双目赤光','猎物终于现身，身后的灌木却还在晃动。']]},
    {id:'forest-cave',region:'forest',name:'勘察旧窟',stat:'mind',risk:5,kind:'lore',purpose:'较多根基阅历与遗刻线索',scenes:[['碎石洞口','落石压住半扇旧门，缝里吹出潮冷的风。'],['壁上残刻','壁画被烟熏黑，只能辨出几个修行姿势。'],['地下回响','深处的回声迟了半拍，像是还有人在走动。']]},
    {id:'marsh-ferry',region:'marsh',name:'护送摆渡',stat:'bone',risk:4,kind:'silver',purpose:'稳定盘缠，修复渡口人情',scenes:[['老艄公','药商托你护送一船药箱，船钱等抵岸再结。'],['暗流','水下的旧桥桩划破船底，必须立刻处置。'],['芦荡追舟','另一条小船从芦荡追来，来人没有点灯。']]},
    {id:'marsh-reeds',region:'marsh',name:'采露寻莲',stat:'insight',risk:1,kind:'medicine',purpose:'伤药与灵泉露',scenes:[['晨雾','露水还没有散，深浅不明的泥地隔开莲丛。'],['水蛛结网','细丝连着莲茎，一动便会惊动水下的东西。'],['枯荷深处','最后一朵青莲长在沉船桅杆旁。']]},
    {id:'marsh-wreck',region:'marsh',name:'探访沉舟',stat:'mind',risk:9,kind:'lore',purpose:'旧船图纸与较多阅历',scenes:[['断桅','退潮露出了舱门，能下水的时间不长。'],['锈锁','一只铁匣锁在船梁上，边缘有细小符纹。'],['船主遗物','匣中不是金银，而是一份未送达的路引。']]},
    {id:'village-trade',region:'village',name:'行商换物',stat:'luck',risk:0,kind:'silver',purpose:'积攒盘缠，补充出行开支',scenes:[['早市','摊主愿意交换山货，但品相需要自己辨认。'],['真假货','两块铁石纹理相同，重量却差得很远。'],['最后一单','收市前，有人拿一袋灵材换你的货物。']]},
    {id:'village-news',region:'village',name:'访人问道',stat:'mind',risk:2,kind:'lore',purpose:'以见闻稳固根基',scenes:[['茶棚旧客','老客谈到山中禁道，却刻意略去一个名字。'],['缺页县志','书铺掌柜只肯让你翻看一炷香的时间。'],['陌生来信','线索指向城外小亭，有人邀你天黑前相见。']]},
    {id:'village-work',region:'village',name:'接取委托',stat:'bone',risk:5,kind:'material',purpose:'妖骨材料与交付报酬',scenes:[['药铺托付','药铺缺人运送重箱，山路却刚刚塌过。'],['破桥','绳桥中段的木板朽坏，货物不能碰水。'],['山口截路','有人堵住山口，说这些货本不该送到镇上。']]},
    {id:'peaks-stele',region:'peaks',name:'拓印剑碑',stat:'insight',risk:3,kind:'lore',purpose:'剑意阅历，额外稳固根基',scenes:[['登山石阶','剑碑藏在绝顶，石阶已有半截悬在雾中。'],['残字','碑文被劈去一角，剩下的剑痕仍有余意。'],['风中剑鸣','拓纸忽然震动，你必须将纷乱剑意理顺。']]},
    {id:'peaks-duel',region:'peaks',name:'问剑山门',stat:'bone',risk:10,kind:'material',purpose:'雷砂与实战修为',scenes:[['守门剑客','剑客不问姓名，只问你是否愿意接三剑。'],['第二剑','他改变了起手，锋芒从你惯用的一侧袭来。'],['收锋','最后一剑含而不发，进退都需要判断。']]},
    {id:'peaks-cache',region:'peaks',name:'寻访剑冢',stat:'mind',risk:7,kind:'silver',purpose:'旧剑匣与丰厚盘缠',scenes:[['无名坟','乱石之间插着断剑，地面有新翻的痕迹。'],['埋剑匣','泥土下的匣盖刻着相扣的机关。'],['失主','一道身影立在山径上，似乎已等候许久。']]},
    {id:'ruins-library',region:'ruins',name:'取回残经',stat:'insight',risk:6,kind:'lore',purpose:'残经见闻与根基',scenes:[['塌檐','藏经阁被山火烧过，残梁随时可能落下。'],['经卷','纸张一碰就碎，只能在原地记下要义。'],['守经阵','最后一卷经书仍受旧阵保护。']]},
    {id:'ruins-furnace',region:'ruins',name:'重访废炉',stat:'bone',risk:9,kind:'material',purpose:'坠星铁屑与丹器材料',scenes:[['冷炉','炉口封死多年，内部却仍有金铁相撞之声。'],['余火','破开炉封后，一缕余火沿地面流来。'],['丹傀','守炉丹傀认不出新主人，正在缓缓站起。']]},
    {id:'ruins-echo',region:'ruins',name:'追索钟声',stat:'mind',risk:5,kind:'medicine',purpose:'灵药与寺中旧事',scenes:[['无人钟楼','每到正午，断裂的古钟仍会响起。'],['旧影','台阶上出现湿脚印，一直通向后殿。'],['钟腹','你终于看清钟腹中封存的药匣。']]},
    {id:'canyon-bridge',region:'canyon',name:'越界寻路',stat:'bone',risk:10,kind:'lore',purpose:'界外见闻与根基',scenes:[['悬桥','桥索跨过看不见底的裂隙，风正从下方吹来。'],['界风','走到桥心，风向突然逆转，行囊被扯向深处。'],['彼岸','彼岸山石的纹路与你所知的天地完全不同。']]},
    {id:'canyon-stars',region:'canyon',name:'拾取星砂',stat:'luck',risk:8,kind:'material',purpose:'虚空尘与稀有丹器材料',scenes:[['砂暴','星砂只在风暴边缘显露，停留太久便失去退路。'],['裂石','星光陷在滚烫石缝里，取出时不能惊动地脉。'],['回程','天色正在暗下，原路已被流砂掩埋。']]},
    {id:'canyon-spring',region:'canyon',name:'寻找地泉',stat:'mind',risk:7,kind:'medicine',purpose:'疗伤所需的界泉灵药',scenes:[['干河床','河床下传来水声，表面却寸草不生。'],['倒流泉','泉水向高处流，你必须找出水脉的入口。'],['地泉','水脉深处悬着一滴凝固的泉露。']]}
  ]);
  const KITS=Object.freeze([{id:'rope',name:'绳索',stat:'bone',note:'攀援、护送与交锋更稳'},{id:'chart',name:'罗盘',stat:'mind',note:'勘察、问道与辨阵更稳'},{id:'pouch',name:'药囊',stat:'insight',note:'识药、拓碑与读经更稳'},{id:'token',name:'路引',stat:'luck',note:'交易与寻宝更稳'}]);
  const copy=v=>JSON.parse(JSON.stringify(v));
  const check=(v,m)=>{if(!v)throw Error(m);};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const byId=(list,id)=>list.find(x=>x.id===id);
  function hash(seed,text){let h=(seed>>>0)^2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return(h^(h>>>16))>>>0;}
  function createState(enabled=false){return{version:VERSION,enabled:!!enabled,supplies:9,silver:24,medicine:2,wounds:0,foundation:Array(9).fill(0),surveys:[],discoveries:[],serial:0,active:null,history:[],last:null};}
  function required(realm){return 2+Math.floor(Math.min(8,realm)/3);}
  function ready(j,realm){return !j.enabled||realm>=9||j.foundation[realm]>=required(realm);}
  function key(a){return `${a.realm}:${a.routeId}`;}
  function seal(a){return hash(a.seed,JSON.stringify([a.routeId,a.nonce,a.realm,a.stats,a.gear,a.kit]));}
  function available(realm){return REGIONS.filter(r=>r.min<=realm);}
  function preview(j){
    if(!j.active)return null;
    const a=j.active,r=byId(ROUTES,a.routeId),region=byId(REGIONS,r.region),kit=byId(KITS,a.kit);
    const penalty=region.risk+r.risk+a.step*4+j.wounds*8;
    const match=kit?.stat===r.stat?12:0;
    const options=[
      {id:'careful',name:'步步为营',cost:2,chance:clamp(91-penalty*.65+match*.35,28,94),gain:1,harm:1,note:'多用一份行粮，保住退路'},
      {id:'clever',name:'因势化解',cost:1,chance:clamp(56+a.stats[r.stat]*2.3+match-penalty,15,94),gain:1.5,harm:1,note:`以${{bone:'根骨',mind:'神识',insight:'悟性',luck:'气运'}[r.stat]}与随身工具应对`},
      {id:'bold',name:'险中取宝',cost:1,chance:clamp(40+a.stats.bone*1.8+a.gear*3+match*.3-penalty,12,88),gain:2.5,harm:2,note:'所得更丰，失手伤势更重'}
    ].map(o=>({...o,id:`${a.nonce}:${a.step}:${o.id}`,chance:Math.round(o.chance),enabled:j.supplies>=o.cost}));
    return{route:r,region,scene:r.scenes[a.step],step:a.step+1,options,first:!j.surveys.includes(key(a))};
  }
  function start(input,context,routeId,kitId){
    validate(input);const j=copy(input),r=byId(ROUTES,routeId),region=r&&byId(REGIONS,r.region);
    check(!j.active,'请先结束当前行旅。');check(r&&region.min<=context.realm&&context.realm<9,'尚不能前往此地。');
    check(byId(KITS,kitId),'请选择一件随身工具。');check(j.supplies>=3&&j.silver>=3,'出行至少需要三份行粮和三枚盘缠。');check(j.wounds<3,'伤势过重，请先回草庐疗伤。');check(j.serial<1000000,'本世行旅记录已达上限。');
    j.silver-=3;j.serial++;
    j.active={routeId,nonce:j.serial,realm:context.realm,seed:context.seed,stats:copy(context.stats),gear:context.gear,kit:kitId,step:0,successes:0,pending:0,stepOutcome:null,seal:0};j.active.seal=seal(j.active);j.last=null;validate(j);return j;
  }
  function finish(j,ending){
    const a=j.active,r=byId(ROUTES,a.routeId),region=byId(REGIONS,r.region),ratio=ending==='complete'?1:ending==='retreat'?.8:.4;
    const points=Math.floor(a.pending*ratio),first=!j.surveys.includes(key(a));
    const baseFoundation=ending==='complete'&&a.successes>=2&&first?(r.kind==='lore'?3:2):0;
    const foundation=Math.min(6-j.foundation[a.realm],baseFoundation);
    if(baseFoundation){j.foundation[a.realm]+=foundation;j.surveys.push(key(a));if(!j.discoveries.includes(r.id))j.discoveries.push(r.id);}
    const silver=points*(r.kind==='silver'?3:1),medicine=r.kind==='medicine'?Math.floor(points/4):0;
    j.silver=clamp(j.silver+silver,0,9999);j.medicine=clamp(j.medicine+medicine,0,9);
    const row={serial:a.nonce,routeId:r.id,realm:a.realm,ending,successes:a.successes,points,silver,medicine,foundation,material:region.material,materialCount:r.kind==='material'?Math.floor(points/2):Math.floor(points/5),xpPercent:Math.min(24,points*(r.kind==='lore'?1:2)),first:baseFoundation>0};
    j.history.push(row);j.history=j.history.slice(-HISTORY_LIMIT);j.last=row;j.active=null;validate(j);return{state:j,settlement:row};
  }
  function resolve(input,id){
    validate(input);const j=copy(input),p=preview(j);check(p,'当前没有进行中的行旅。');const o=p.options.find(o=>o.id===id);check(o&&o.enabled,'此选择已失效或行粮不足。');
    const a=j.active,roll=hash(a.seed,`${a.nonce}|${a.routeId}|${a.step}`)%100;
    j.supplies-=o.cost;const won=roll<o.chance;
    if(won){a.successes++;a.pending+=Math.round(3*o.gain);}else{j.wounds=clamp(j.wounds+o.harm,0,3);a.pending=Math.max(0,a.pending-2);}
    a.stepOutcome={title:p.scene[0],won,chance:o.chance,cost:o.cost,gain:won?Math.round(3*o.gain):0,harm:won?0:o.harm};
    a.step++;
    if(j.wounds===3)return finish(j,'failed');
    if(a.step===3)return finish(j,'complete');
    validate(j);return{state:j,settlement:null,outcome:{won,chance:o.chance,harm:won?0:o.harm}};
  }
  function retreat(input){validate(input);check(input.active,'当前没有行旅可撤退。');return finish(copy(input),'retreat');}
  function prepare(input,kind){
    validate(input);const j=copy(input);check(!j.active,'请先带着行囊回到草庐。');
    if(kind==='supplies'){check(j.silver>=6&&j.supplies<12,'补给需要六枚盘缠，行粮上限十二份。');j.silver-=6;j.supplies=Math.min(12,j.supplies+6);}
    else if(kind==='medicine'){check(j.silver>=8&&j.medicine<9,'伤药需要八枚盘缠。');j.silver-=8;j.medicine++;}
    else if(kind==='heal'){check(j.wounds>0&&j.medicine>0,'需要伤药才能立即处理伤势。');j.medicine--;j.wounds=Math.max(0,j.wounds-2);}
    else if(kind==='rest'){check(j.wounds>0,'当前没有需要静养的伤势。');j.wounds--;}
    else if(kind==='work'){check(j.silver<9999,'盘缠已满。');j.silver=Math.min(9999,j.silver+10);}
    else throw Error('未知的草庐准备。');
    validate(j);return j;
  }
  function validRow(row){return row&&byId(ROUTES,row.routeId)&&['complete','retreat','failed'].includes(row.ending)&&Number.isInteger(row.serial)&&row.serial>0&&Number.isInteger(row.realm)&&row.realm>=0&&row.realm<9&&['successes','points','silver','medicine','foundation','materialCount','xpPercent'].every(k=>Number.isInteger(row[k])&&row[k]>=0&&row[k]<=100)&&row.successes<=3&&typeof row.first==='boolean'&&row.material===byId(REGIONS,byId(ROUTES,row.routeId).region).material;}
  function validate(j){
    check(j&&j.version===VERSION&&typeof j.enabled==='boolean','行旅存档版本不兼容。');
    for(const[k,max]of Object.entries({supplies:12,silver:9999,medicine:9,wounds:3,serial:1000000}))check(Number.isInteger(j[k])&&j[k]>=0&&j[k]<=max,'行旅资源损坏。');
    check(Array.isArray(j.foundation)&&j.foundation.length===9&&j.foundation.every(n=>Number.isInteger(n)&&n>=0&&n<=6),'根基记录损坏。');
    check(Array.isArray(j.surveys)&&j.surveys.length<=162&&new Set(j.surveys).size===j.surveys.length&&j.surveys.every(x=>typeof x==='string'&&/^[0-8]:/.test(x)&&byId(ROUTES,x.slice(2))),'行旅阅历损坏。');
    check(Array.isArray(j.discoveries)&&j.discoveries.length<=18&&new Set(j.discoveries).size===j.discoveries.length&&j.discoveries.every(x=>byId(ROUTES,x)),'山海见闻损坏。');
    check(Array.isArray(j.history)&&j.history.length<=HISTORY_LIMIT&&j.history.every(validRow)&&(j.last===null||validRow(j.last)),'行旅结算损坏。');
    if(j.active){const a=j.active,r=byId(ROUTES,a.routeId);check(r&&Number.isInteger(a.realm)&&a.realm>=byId(REGIONS,r.region).min&&a.realm<9&&a.nonce===j.serial&&a.nonce>0&&Number.isInteger(a.seed)&&a.seed>0&&a.seed<=4294967295,'行旅入口损坏。');check(byId(KITS,a.kit)&&a.stats&&Object.keys(a.stats).length===4&&['bone','mind','insight','luck'].every(k=>Number.isFinite(a.stats[k])&&a.stats[k]>=0&&a.stats[k]<=1000)&&Number.isInteger(a.gear)&&a.gear>=0&&a.gear<=4&&a.seal===seal(a),'行旅准备记录损坏。');check(Number.isInteger(a.step)&&a.step>=0&&a.step<3&&Number.isInteger(a.successes)&&a.successes>=0&&a.successes<=a.step&&Number.isInteger(a.pending)&&a.pending>=0&&a.pending<=24&&j.wounds<3,'行旅进度损坏。');check(a.step===0?a.stepOutcome===null:(a.stepOutcome&&a.stepOutcome.title===r.scenes[a.step-1][0]&&typeof a.stepOutcome.won==='boolean'&&['chance','cost','gain','harm'].every(k=>Number.isInteger(a.stepOutcome[k])&&a.stepOutcome[k]>=0&&a.stepOutcome[k]<=100)),'行旅反馈损坏。');}
    else check(j.active===null,'行旅字段损坏。');
    return true;
  }
  return Object.freeze({VERSION,HISTORY_LIMIT,REGIONS,ROUTES,KITS,createState,required,ready,available,preview,start,resolve,retreat,prepare,validate,hash});
});
