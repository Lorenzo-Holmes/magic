'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../src/engine.js');
const D = require('../src/data.js');
const G = require('../src/equipment.js');
const K = require('../src/crafting.js');
const J = require('../src/journey.js');
const B = require('../src/build.js');
const modules = ['core', 'hud', 'cave', 'character', 'baggage', 'world-map', 'forge'];

function runtime() {
  const sandbox = vm.createContext({ console });
  sandbox.window=sandbox;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/ui/navigation.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/ui-v3/manifest.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/ui-v4/manifest.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/ui-v3/art.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/ui/appearance.js'),'utf8'),sandbox);
  for (const name of modules) {
    const filename = path.join(__dirname, '../src/ui-v3', `${name}.js`);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  }
  return sandbox.FSUIV3;
}
function entered() {
  let state = E.createRun(12, null, { journey: true });
  for (const id of state.offer.slice(0, 3)) state = E.transition(state, { type: 'select', id });
  state = E.transition(state, { type: 'confirm-talents' });
  return E.transition(state, { type: 'enter' });
}
function context(V, state) {
  const buttons = [];
  return { state, D, E, G, K, J, B, esc: V.esc, fmt: String,
    selectedRegion: 'forest', journeyKit: 'rope', quest: '当前目标', waiting: E.isBlocking(state), buttons,
    powerFigure: value => `<b>${value}</b>`,
    button(action, label, options = {}) {
      buttons.push({ action, label, ...options });
      return `<button data-${options.ui ? 'ui' : 'action'}="${V.esc(action)}"${options.disabled ? ' disabled' : ''}>${label}</button>`;
    }
  };
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
const fullMaterials = state => { for (const item of K.MATERIALS) state.crafting.materials[item.id] = 9; return state; };
function addWeapon(state, identified = true) {
  const entry = { uid: 'gear-v3test', id: 'azure-embryo', identified, refinement: 0, xp: 80 };
  state.equipment.inventory.push(entry);
  if (identified) state.equipment.slots.weapon = entry.uid;
  return state;
}

test('V3 五个窗口与 HUD 读取同一引擎存档，渲染不改变状态或随机流', () => {
  const V = runtime(), state = freeze(entered()), before = JSON.stringify(state);
  assert.equal(V.diagnostics().registeredWindows.length, 5);
  for (const id of V.diagnostics().registeredWindows) {
    assert.match(V.render(id, context(V, state)), /v3-window/);
    V.commit({}, { state });
  }
  assert.match(V.renderHud(context(V, state), 'practice'), /v3-hud/);
  assert.equal(JSON.stringify(state), before);
});

test('V3 同窗口重绘释放旧绑定，重复 commit 不重复绑定，离开旧章节不保留窗口', () => {
  const V = runtime(), calls = [], node = {};
  V.register('LifecycleTest', {
    render: () => '<section></section>',
    bind() { calls.push('bind'); return () => calls.push('cleanup'); },
    update() { calls.push('update'); },
    dispose() { calls.push('dispose'); }
  });
  V.render('LifecycleTest', {}); V.commit(node); V.commit(node);
  assert.deepEqual(calls, ['bind', 'update', 'update']);
  V.render('LifecycleTest', {}); V.commit(node); V.deactivate(); V.deactivate();
  assert.deepEqual(calls, ['bind', 'update', 'update', 'cleanup', 'dispose', 'bind', 'update', 'cleanup', 'dispose']);
  assert.equal(V.diagnostics().activeWindow, null);
  assert.equal(V.diagnostics().mounted, false);
});

test('V3 不吞掉绑定和清理错误，未知窗口与重复注册明确失败', () => {
  const V = runtime();
  assert.throws(() => V.render('missing', {}), /Unknown/);
  assert.throws(() => V.register('CaveWindow', { render: () => '' }), /Duplicate/);
  V.register('Broken', { render: () => '', bind() { throw new Error('bind failed'); } });
  V.render('Broken', {});
  assert.throws(() => V.commit({}), /bind failed/);
  assert.equal(V.diagnostics().activeWindow, null);
  let released = 0;
  V.register('BrokenCleanup', { render: () => '', bind: () => () => { throw new Error('cleanup'); }, dispose() { released++; } });
  V.render('BrokenCleanup', {}); V.commit({});
  assert.throws(() => V.deactivate(), /cleanup failed/);
  assert.equal(released, 1);
  V.deactivate(); assert.equal(released, 1);
});

test('V3 仅接受明确的界面偏好，品质索引夹取为完整名称', () => {
  const V = runtime();
  for (const filter of ['all', 'equipment', 'pills', 'materials', 'supplies']) V.setState('bagFilter', filter);
  V.setState('bagSelected','equipment:gear-abc123');V.setState('bagSelected','');
  assert.throws(() => V.setState('__proto__', {}), /Invalid/);
  assert.throws(() => V.setState('bagFilter', 'unknown'), /Invalid/);
  assert.throws(() => V.setState('bagSelected', 'equipment:<script>'), /Invalid/);
  assert.throws(() => V.setState('forgeKind', 'unknown'), /Invalid/);
  assert.equal(V.rarityName(2.8), '玄');
  assert.equal(V.rarityName(Infinity), '凡');
  assert.equal(V.rarityName(99), '天');
});

test('V3 通用炼器法仍要求已穿戴且已鉴定的本命兵器', () => {
  for (const equipped of [false, true]) {
    const V = runtime(), state = fullMaterials(entered());
    if (equipped) addWeapon(state);
    V.setState('forgeKind', 'weapon'); V.setState('forgeRecipe', 'star-refine');
    const ctx = context(V, state); V.render('ForgeWindow', ctx);
    const forge = ctx.buttons.find(button => button.action === 'craft-weapon');
    assert.equal(forge.disabled, !equipped);
    if (!equipped) assert.match(forge.label, /先穿戴/);
  }
});

test('V3 失效的炼器方子回退到现存配方，秘境期间不能炼制', () => {
  const V = runtime(), state = fullMaterials(entered());
  V.setState('forgeKind', 'weapon'); V.setState('forgeRecipe', 'no-such-recipe');
  assert.doesNotThrow(() => V.render('ForgeWindow', context(V, state)));
  V.setState('forgeKind', 'pill'); V.setState('forgeRecipe', 'qi');
  state.secretRealm.active = { floor: 1 };
  const ctx = context(V, state); V.render('ForgeWindow', ctx);
  assert.ok(ctx.buttons.filter(button => button.action === 'craft-pill').every(button => button.disabled));
});

test('V3 行囊直达卸下和神兵蜕变，费用及阈值可见', () => {
  const V = runtime(), state = addWeapon(entered());
  state.equipment.essence = 2;
  const ctx = context(V, state); V.render('BaggageWindow', ctx);
  const action = name => ctx.buttons.find(button => button.action === name);
  assert.equal(action('equipment-unequip').id, 'weapon');
  assert.equal(action('equipment-evolve').id, 'gear-v3test');
  assert.equal(action('equipment-evolve').disabled, false);
  assert.match(action('equipment-evolve').label, /80\/80/);
  assert.match(action('equipment-refine').label, /1 器蕴/);
  const prepare = id => ctx.buttons.find(button => button.action === 'journey-prepare' && button.id === id);
  assert.match(prepare('supplies').label, /6 盘缠/);
  assert.match(prepare('medicine').label, /8 盘缠/);
  assert.match(prepare('heal').label, /1 伤药/);
  assert.ok(prepare('rest').label.includes(`${E.actionPreview(state, 'hunt').years} 年`));
});

test('V3 受秘境占用时行囊只读，寿元不足时不显示可启程', () => {
  const V = runtime(), state = addWeapon(entered());
  state.crafting.pills.qi = [false]; state.secretRealm.active = { floor: 1 };
  let ctx = context(V, state); V.render('BaggageWindow', ctx);
  assert.ok(ctx.buttons.filter(button => !button.ui).every(button => button.disabled));
  state.secretRealm.active = null; state.age = E.maxAge(state) - E.actionPreview(state, 'hunt').years;
  ctx = context(V, state); V.render('WorldMapWindow', ctx);
  assert.ok(ctx.buttons.filter(button => button.action === 'journey-start').every(button => button.disabled));
});

test('V3 行囊筛选和炼器预览只改变界面，不改存档', () => {
  const V = runtime(), state = entered(), original = E.serialize(state);
  for (const filter of ['all', 'equipment', 'pills', 'materials', 'supplies']) {
    V.setState('bagFilter', filter); V.render('BaggageWindow', context(V, state));
  }
  assert.equal(E.serialize(state), original);
});

test('修行室只有一个主操作，不再渲染五个建筑或整屏洞府照片',()=>{
  const V=runtime(),s=entered(),ctx=context(V,s),before=E.serialize(s);
  const html=V.render('CaveWindow',ctx);
  assert.match(html,/practice-room/);assert.doesNotMatch(html,/v3-building|v3-prop-anchor|scene\.cave/);
  const primary=ctx.buttons.filter(b=>b.classes?.includes('pr-main-action'));
  assert.equal(primary.length,1);assert.equal(primary[0].action,'act');assert.equal(primary[0].kind,'cultivate');
  assert.ok(ctx.buttons.some(b=>b.action==='practice-pills'&&b.ui));
  assert.ok(ctx.buttons.some(b=>b.action==='forge'&&b.ui));
  assert.equal(E.serialize(s),before);
});

test('修行室以引擎条件决定破境主操作，修为满但根基不足不伪造可破境',()=>{
  const V=runtime(),s=entered();s.flags.pythonSeen=true;s.xp=D.REALMS[0].threshold;
  let ctx=context(V,s);V.render('CaveWindow',ctx);
  assert.equal(E.canBreak(s),false);assert.ok(!ctx.buttons.some(b=>b.action==='breakthrough'));
  s.journey.foundation[0]=J.required(0);assert.equal(E.canBreak(s),true);
  ctx=context(V,s);V.render('CaveWindow',ctx);
  assert.equal(ctx.buttons.filter(b=>b.classes?.includes('pr-main-action')).length,1);
  assert.ok(ctx.buttons.some(b=>b.action==='breakthrough'));
});

test('遭遇或秘境占用时禁用修炼及寻机缘，保留真实返回入口',()=>{
  const V=runtime(),s=E.transition(entered(),{type:'cultivate-to-ready'});
  assert.equal(E.isBlocking(s),true);let ctx=context(V,s);V.render('CaveWindow',ctx);
  assert.ok(ctx.buttons.filter(b=>!b.ui).every(b=>b.disabled));
  const occupied=entered();occupied.secretRealm.active={floor:1};ctx=context(V,occupied);V.render('CaveWindow',ctx);
  assert.ok(ctx.buttons.filter(b=>!b.ui).every(b=>b.disabled));
  assert.ok(ctx.buttons.some(b=>b.action==='secret-realm'&&b.ui));
});
