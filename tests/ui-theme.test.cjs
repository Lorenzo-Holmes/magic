'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/ui/components.js');
const luminance=h=>{const c=h.replace('#','').match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('语义起始色板在两种纯色表面保留正文/费用/禁用理由 4.5 对比度',()=>{
  const readVars=text=>Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
  const raw=readVars(fs.readFileSync('src/ui/tokens.css','utf8')),theme=fs.readFileSync('src/ui/theme.css','utf8');
  for(const block of [theme.slice(0,theme.indexOf('[data-surface="dark"]')),theme.slice(theme.indexOf('[data-surface="dark"]'),theme.indexOf('body[data-ui-foundation="v4"] {'))]){
    const vars={...raw,...readVars(block)},resolve=k=>vars[k].startsWith('var(')?resolve(vars[k].slice(4,-1)):vars[k];
    for(const text of ['primary','secondary','disabled','action','danger'])for(const surface of ['canvas','panel','inset','action']){
      const fg=resolve('--text-'+text),bg=resolve('--surface-'+surface);assert.ok(ratio(fg,bg)>=4.5,`${fg}/${bg}: ${ratio(fg,bg)}`);
    }
  }
});
test('面板只接受冻结类型与表面；标题转义且正文是受控模板',()=>{
  assert.match(C.panel('a','<p>BODY</p>',{surface:'light',title:'<evil>'}),/&lt;evil&gt;/);
  assert.throws(()=>C.panel('z',''));assert.throws(()=>C.panel('a','',{surface:'unknown'}));
});
test('共享按钮不改 action/revision 参数，图片/数字按钮不变成矩形操作',()=>{
  let captured;C.action((a,l,o)=>{captured={a,l,o};return l;},'equipment-equip','穿戴',{id:'gear-x',note:'<cost>',classes:'primary',disabled:true});
  assert.equal(captured.a,'equipment-equip');assert.equal(captured.o.id,'gear-x');assert.ok(captured.o.disabled);assert.match(captured.l,/&lt;cost&gt;/);
  assert.match(C.actionClasses('act',{classes:'primary full'}),/ui-button--primary/);
  assert.match(C.actionClasses('equipment-salvage',{}),/ui-button--danger/);
  for(const classes of ['v3-hud-tab','v3-map-node','pr-main-action','number-button'])assert.equal(C.actionClasses('x',{classes}),'');
});
test('旧灰度导航已退役，公共样式没有降低整个禁用控件的透明度',()=>{
  assert.ok(!fs.readFileSync('src/ui-v3/practice.css','utf8').includes('body.practice-focus .v3-hud'));
  const css=fs.readFileSync('src/ui/buttons.css','utf8');assert.match(css,/:disabled[\s\S]*opacity:1/);
  const list=require('../tools/shared-ui-files.cjs');const html=fs.readFileSync('index.html','utf8');
  for(const f of list){assert.ok(fs.existsSync(f));assert.ok(html.includes(f));}
});
