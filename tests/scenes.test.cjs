'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const S = require('../src/scenes.js');
const E = require('../src/engine.js');
const D = require('../src/data.js');
const files = require('../tools/production-files.cjs');
const root = path.resolve(__dirname, '..');
const run = (realm, phase = 'playing', event = null, flags = {}) => ({ realm, phase, event, flags });
test('视觉映射覆盖全部十境和七个独立场景', () => {
  assert.equal(S.REALM_SCENES.length, D.REALMS.length);
  assert.equal(Object.keys(S.STAGES).length, 7);
  const expected = ['mortal','mortal','foundation','goldcore','nascent','nascent','void','void','void','tribulation'];
  expected.forEach((id, realm) => assert.equal(S.resolve(run(realm)).id, id));
});
test('首页与开局始终为黑风岭，不泄漏后期存档的背景', () => {
  assert.equal(S.resolve(null).id, 'mortal');
  for (const phase of ['talents','attributes']) assert.equal(S.resolve(run(8, phase)).id, 'mortal');
  const ending = run(9, 'complete', null, { ascended: true });
  assert.equal(S.resolve(ending, true).id, 'mortal');
  assert.equal(S.resolve(ending, true).atmosphere, 'calm');
});
test('天门背景必须同时满足正式完成和飞升标记', () => {
  assert.equal(S.resolve(run(9, 'complete', null, { ascended: true })).id, 'ascension');
  assert.notEqual(S.resolve(run(9, 'complete')).id, 'ascension');
  assert.notEqual(S.resolve(run(9, 'dead', null, { ascended: true })).id, 'ascension');
  assert.equal(S.resolve(run(9, 'dead')).atmosphere, 'still');
});
test('妖蟒初遇和复仇具有不同强度，遗蜕与异变延续复仇气氛', () => {
  assert.equal(S.resolve(run(0, 'playing', { id: 'first-python' })).atmosphere, 'serpent-danger');
  for (const id of ['revenge','remains']) assert.equal(S.resolve(run(2, 'playing', { id })).atmosphere, 'serpent-prey');
  assert.equal(S.resolve(run(2, 'mutation')).atmosphere, 'serpent-prey');
  assert.equal(S.resolve(run(2, 'playing', { id: 'quiet' })).atmosphere, 'calm');
});
test('三眼妖王、融合、雷劫、飞升各自有气氛且不污染普通事件', () => {
  assert.equal(S.resolve(run(3, 'playing', { id: 'boss' })).atmosphere, 'demon-eye');
  assert.equal(S.resolve(run(3, 'fusion')).atmosphere, 'gold-fusion');
  for (const phase of ['draft','tribulation']) assert.equal(S.resolve(run(9, phase)).atmosphere, 'thunder');
  assert.equal(S.resolve(run(9, 'complete', null, { ascended: true })).atmosphere, 'ascension');
  assert.equal(S.resolve(run(3, 'playing', { id: 'quiet' })).atmosphere, 'calm');
});
test('15 类高阶事件完整映射云气、星尘、裂隙或灵气', () => {
  assert.equal(Object.keys(S.HIGH_ATMOSPHERES).length, D.HIGH_EVENTS.length);
  for (const event of D.HIGH_EVENTS) {
    assert.ok(S.HIGH_ATMOSPHERES[event.id], event.id);
    assert.equal(S.resolve(run(event.realm, 'playing', { id: 'high', scene: event.id })).atmosphere, S.HIGH_ATMOSPHERES[event.id]);
  }
});
test('六枚道痕的早期回响与高阶共鸣都有独立气氛映射', () => {
  assert.equal(Object.keys(S.TRACE_ATMOSPHERES).length, D.TRACES.length);
  for (const trace of D.TRACES) {
    assert.ok(trace.echo?.title && trace.echo?.text && trace.echo?.choice && trace.echo?.result, `${trace.id}: echo`);
    assert.ok(trace.resonance?.title && trace.resonance?.text && trace.resonance?.choice && trace.resonance?.result, `${trace.id}: resonance`);
    for (const id of ['trace-echo', 'trace-resonance']) {
      assert.equal(S.resolve(run(id === 'trace-echo' ? 0 : 4, 'playing', { id, trace: trace.id })).atmosphere, S.TRACE_ATMOSPHERES[trace.id]);
    }
  }
});
test('视觉查询不修改存档、随机种子、战力或数据结构', () => {
  const state = E.createRun(42), raw = E.serialize(state), before = E.power(state);
  Object.freeze(state.flags); Object.freeze(state);
  for (let i = 0; i < 100; i++) { S.resolve(state); S.resolve(state, true); }
  assert.equal(E.serialize(state), raw); assert.equal(E.power(state), before); assert.equal(E.VERSION, state.version);
});
test('全部正式背景存在、为轻量自包含 SVG 且进入生产白名单', () => {
  for (const scene of Object.values(S.STAGES)) {
    assert.match(scene.src, /^assets\/bg\/realm-[a-z]+\.svg$/);
    assert.ok(files.includes(scene.src));
    const source = fs.readFileSync(path.join(root, scene.src), 'utf8');
    assert.match(source, /viewBox="0 0 540 960"/);
    assert.match(source, /width="540" height="960"/);
    assert.doesNotMatch(source, /<script|<foreignObject|<image|@font-face|<animate/i);
    assert.doesNotMatch(source, /(?:href|src)=["'](?!#)|url\(["']?(?!#)/i);
    assert.ok(Buffer.byteLength(source) < 100000, scene.src);
  }
});
test('生产清单唯一且不携带截图、文档、字体或开发依赖', () => {
  assert.equal(files.length, 137 + require('../tools/shared-ui-files.cjs').length); assert.equal(new Set(files).size, files.length);
  assert.ok(files.includes('src/ink-theme.css'));
  assert.ok(files.includes('src/scene-ui.css'));
  assert.ok(files.includes('assets/ui-v3/scenes/cave.webp')&&files.includes('assets/ui-v3/scenes/world.webp'));
  assert.deepEqual(files.filter(file=>file.startsWith('assets/art/')), []);
  assert.ok(files.includes('src/ui-v3/practice.css'));
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
    assert.doesNotMatch(file, /\.\.|^\/|output|tests|docs|README|node_modules|\.(png|gif|mp4|woff2?|ttf)$/i);
  }
});
test('版本显示、轮回配置和存档版本统一', () => {
  const pkg = require('../package.json');
  assert.equal(S.VERSION, pkg.version);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(E.VERSION, 16);
  assert.equal(D.TRACES.length, 6);
  assert.ok(files.includes('src/meta.js'));
  assert.ok(files.includes('src/presentation.js'));
  assert.ok(files.includes('src/equipment.js'));
  assert.ok(files.includes('src/build.js'));
  assert.ok(files.includes('src/combat.js'));
  assert.ok(files.includes('src/secret-realm.js'));
  assert.ok(files.includes('src/sect.js'));
  assert.ok(files.includes('src/life.js'));
  assert.ok(files.includes('src/spirit-beast.js'));
  assert.ok(files.includes('src/crafting.js'));
  assert.ok(files.includes('src/karma.js'));
  assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes(`v${pkg.version}`));
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/app.js'), 'utf8'), /v0\.5\.[01]/);
});
function fakeWorld() {
  const images = [], layers = [0, 1].map(i => ({ src: '', classList: new Set(i ? [] : ['is-visible']), decode: async () => {} }));
  for (const layer of layers) layer.classList.remove = name => layer.classList.delete(name);
  const element = { dataset: { loadedScene: 'mortal' }, querySelectorAll: () => layers, ownerDocument: {
    baseURI: 'file:///D:/project/index.html', documentElement: { dataset: {} }, addEventListener() {},
    defaultView: { Image: class { constructor() { images.push(this); } } }
  } };
  return { element, images, layers, controller: S.attach(element) };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('异步背景切换先等新图解码，并丢弃迟到的旧场景', async () => {
  const f = fakeWorld();
  f.controller.update(run(2)); f.controller.update(run(3));
  assert.equal(f.element.dataset.loadedScene, 'mortal');
  f.images[0].onload(); await settle();
  assert.equal(f.element.dataset.loadedScene, 'mortal');
  f.images[1].onload(); await settle();
  assert.equal(f.element.dataset.loadedScene, 'goldcore');
  assert.equal(f.layers.filter(layer => layer.classList.has('is-visible')).length, 1);
});
test('加载失败保留上一张图；可以重试；回首页不被迟到资源覆盖', async () => {
  const f = fakeWorld();
  f.controller.update(run(6)); f.images[0].onerror(); await settle();
  assert.equal(f.element.dataset.loadedScene, 'mortal'); assert.equal(f.element.dataset.sceneError, 'void');
  f.controller.update(run(6)); f.images[1].onload(); await settle();
  assert.equal(f.element.dataset.loadedScene, 'void');
  f.controller.update(run(9)); f.controller.update(null, true);
  f.images[2].onload(); f.images[3].onload(); await settle();
  assert.equal(f.element.dataset.loadedScene, 'mortal');
});
