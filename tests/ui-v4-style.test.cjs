'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('V4 migrated styles load after the legacy adapter in a stable order',()=>{
  const html=read('index.html');
  const order=['src/ui/legacy-adapter.css','src/ui/immortal-v4.css','src/ui/creation-v4.css','src/ui/systems-v4.css','src/ui/motion-v4.css'];
  let previous=-1;for(const file of order){const index=html.indexOf(file);assert.ok(index>previous,`${file} must load after the previous V4 layer`);previous=index;}
});

test('migrated immortal and creation pages no longer receive retired legacy scene overrides',()=>{
  const adapter=read('src/ui/legacy-adapter.css'),legacy=read('src/ui-v3-legacy.css');
  assert.doesNotMatch(adapter,/:is\(\.immortal-view,\.creation-view/);
  assert.doesNotMatch(legacy,/body\[data-art-ui="v3"\] \.immortal-view\{background/);
  assert.doesNotMatch(legacy,/body\[data-art-ui="v3"\] \.creation-view\{background/);
});

test('all V4 CSS url assets resolve from their stylesheet directory',()=>{
  const files=['src/ui/atlas-v4.css','src/ui/forge-v4.css','src/ui/immortal-v4.css','src/ui/creation-v4.css','src/ui/systems-v4.css'];
  for(const file of files){const source=read(file);for(const match of source.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){const target=path.resolve(root,path.dirname(file),match[1]);assert.ok(fs.existsSync(target),`${file}: missing ${match[1]}`);}}
});

test('V4 motion has semantic levels and a complete reduced-motion override',()=>{
  const tokens=read('src/ui/tokens.css'),motion=read('src/ui/motion-v4.css');
  for(const token of ['--ui-motion-1','--ui-motion-2','--ui-motion-3','--ui-ambient-breathe','--ui-ambient-orbit','--ui-ambient-fire'])assert.ok(tokens.includes(token),token);
  assert.match(motion,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(motion,/animation:none!important/);assert.match(motion,/transition:none!important/);
});
