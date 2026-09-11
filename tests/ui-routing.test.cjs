'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/ui/route-model.js'),N=require('../src/ui/navigation.js'),C=require('../src/ui/components.js'),S=require('../src/ui/shell.js');
const s={phase:'playing',journey:{active:null},log:[],immortal:null,world:null};
test('V4 路由纯查询：凡界、仙界、创世与回看互不丢失',()=>{
  const state={...s,phase:'complete',immortal:{phase:'world',journal:[]},world:{phase:'playing',era:'1',cursor:0}};
  const raw=JSON.stringify(state),base={state,home:false,worldVisible:true};
  assert.equal(R.resolve(base).context,'creation');
  assert.equal(R.resolve({...base,pageTab:'inventory'}).view,'panel-inventory');
  assert.equal(R.resolve(base).inWorld,true);
  assert.equal(R.resolve({...base,worldVisible:false}).context,'immortal');
  assert.equal(R.resolve({...base,mortalSummary:true}).context,'mortal');
  assert.equal(R.resolve({...base,home:true}).workspace,false);
  assert.equal(JSON.stringify(state),raw);
});
test('V4 行旅优先，导航不能替换强制行旅内容；两类装备页不混淆引擎',()=>{
  const state={...s,journey:{active:{nonce:'x',step:2}}};
  for(const pageTab of ['practice','character','forge','inventory','atlas']){
    const r=R.resolve({state,home:false,pageTab});assert.equal(r.view,'journey-x-2');assert.equal(r.v3Primary,false);assert.equal(r.navCurrent,'atlas');
  }
  assert.throws(()=>R.resolve({state:s,pageTab:'unknown'}));
});
test('V4 首页/开局无游戏底栏，五个主要窗口都有正确 surface',()=>{
  for(const phase of ['talents','attributes'])assert.equal(R.resolve({state:{...s,phase},home:false}).workspace,false);
  for(const [pageTab,surface]of [['practice','light'],['forge','dark'],['atlas','light'],['inventory','light'],['character','light']]){
    const r=R.resolve({state:s,home:false,pageTab});assert.equal(r.surface,surface);assert.ok(r.workspace&&r.v3Primary);
  }
});
test('统一导航保留四个稳定 ID、可访问名称和唯一选中项',()=>{
  const calls=[],button=(a,l,o)=>{calls.push({a,l,o});return `<button>${l}</button>`;},art={img:(id)=>`<img data-art="${id}">`};
  const html=N.render({button,art},'inventory');assert.match(html,/data-ui-nav="unified"/);
  assert.deepEqual(calls.map(c=>c.o.id),['practice','atlas','inventory','character']);
  assert.deepEqual(calls.map(c=>c.o.aria),['修行','山海','行囊','人物']);
  assert.equal(calls.filter(c=>c.o.pressed).length,1);assert.ok(calls[2].o.pressed);
  assert.throws(()=>N.render({button,art},'x'));
});
test('新旧导航入口都委托同一个渲染器，不再拼字形导航',()=>{
  const sandbox={FSUINavigation:{render:()=>'<nav>ONE</nav>'},FSUIComponents:C,FSArt:{},FSUIV3:{setHud(fn){this.fn=fn;}}};
  vm.runInNewContext(fs.readFileSync('src/workbench.js','utf8'),sandbox);
  vm.runInNewContext(fs.readFileSync('src/ui-v3/hud.js','utf8'),sandbox);
  assert.equal(sandbox.FSWorkbench.navigation('left',s,()=>''),'<nav>ONE</nav>');
  assert.equal(sandbox.FSUIV3.fn({button:()=>''},'practice'),'<nav>ONE</nav>');
});
test('仙界手记只读仙界 journal，回看凡界与创世读取各自记录',()=>{
  const state={log:[{age:86,title:'MORTAL',text:'OLD'}],immortal:{journal:[{day:7,text:'IMMORTAL'}]},world:{history:[{era:'2',title:'WORLD',choice:'CHOICE'}]}};
  const i=C.journal(state,'immortal',()=>''),m=C.journal(state,'mortal',()=>''),w=C.journal(state,'creation',()=> '');
  assert.ok(i.includes('IMMORTAL')&&!i.includes('MORTAL</b>'));assert.ok(m.includes('MORTAL')&&!m.includes('IMMORTAL'));
  assert.ok(w.includes('WORLD')&&!w.includes('OLD'));
});
test('共享 shell 转义标识，不在生成视图时推进任何数据',()=>{
  const route=R.resolve({state:s,home:false}),original=JSON.stringify(route);
  const html=S.render({route,main:'<main>BODY</main>',nav:'<nav>NAV</nav>',warning:'<script>bad</script>'});
  assert.match(html,/data-ui-shell="v4"/);assert.ok(html.includes('&lt;script&gt;'));assert.equal(JSON.stringify(route),original);
  assert.throws(()=>S.render({route:{workspace:false}}));
});
