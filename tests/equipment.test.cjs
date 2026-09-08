'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../src/equipment.js');
const E = require('../src/engine.js');

const clone = value => JSON.parse(JSON.stringify(value));

function enter(seed = 42) {
  let s = E.createRun(seed);
  for (const id of s.offer.slice(0, 3)) s = E.transition(s, { type:'select', id });
  s = E.transition(s, { type:'confirm-talents' });
  s = E.transition(s, { type:'preset', id:'balanced' });
  return E.transition(s, { type:'enter' });
}

test('四槽、十二格行囊、24件基础装备与三条三段本命神兵完整', () => {
  assert.deepEqual(Object.keys(G.SLOTS), ['weapon','artifact','robe','accessory']);
  assert.equal(G.MAX_INVENTORY, 12);
  assert.equal(G.ITEMS.filter(x => !x.special).length, 24);
  assert.equal(G.ITEMS.filter(x => x.special).length, 9);
  for (const path of ['sword','devour','body']) {
    const line = G.ITEMS.filter(x => x.special && x.path === path).sort((a,b)=>a.stage-b.stage);
    assert.deepEqual(line.map(x => x.stage), [0,1,2]);
    assert.equal(line[0].next, line[1].id); assert.equal(line[1].next, line[2].id); assert.equal(line[2].next, null);
  }
  for (const item of G.ITEMS) {
    assert.ok(G.SLOTS[item.slot]);
    assert.equal('durability' in item, false);
    assert.doesNotMatch(item.name, /\+\d+/);
  }
});

test('掉落只由种子与来源键决定，重复来源不二次领奖', () => {
  const a = G.addDrop(G.createState(), 314159, 'boss:threeeye', 'boss', 3, 'sword-break');
  const b = G.addDrop(G.createState(), 314159, 'boss:threeeye', 'boss', 3, 'sword-break');
  assert.deepEqual(a, b);
  assert.equal(a.inventory.length, 1);
  assert.equal(G.data(a.inventory[0]).special, true);
  assert.equal(G.data(a.inventory[0]).path, 'sword');
  assert.deepEqual(G.addDrop(a, 314159, 'boss:threeeye', 'boss', 3, 'sword-break'), a);
});

test('行囊达到十二格后新掉落自动化为器蕴而不扩容', () => {
  let s = G.createState();
  for (let i=0;i<12;i++) s = G.addDrop(s, 900+i, `proof:${i}`, 'proof', 4+i%4, '');
  assert.equal(s.inventory.length, 12); assert.equal(s.essence, 0);
  const next = G.addDrop(s, 9999, 'proof:overflow', 'proof', 8, '');
  assert.equal(next.inventory.length, 12); assert.ok(next.essence > 0); assert.equal(next.lastDrop.full, true);
});

test('鉴定、穿戴、温养与归炉均有硬边界且不修改输入', () => {
  let s = G.addDrop(G.createState(), 55, 'boss:test', 'boss', 3, 'body-charge');
  s = G.addDrop(s, 56, 'proof:extra', 'proof', 4, '');
  const raw = JSON.stringify(s), first = s.inventory[0].uid, second = s.inventory[1].uid;
  let n = G.identify(s, first); assert.equal(JSON.stringify(s), raw); assert.equal(n.inventory[0].identified, true);
  n = G.salvage(n, second); assert.ok(n.essence >= 1);
  n = G.equip(n, first); assert.equal(n.slots.weapon, first); assert.ok((G.effects(n).power || 0) > 0);
  assert.throws(() => G.salvage(n, first));
  const beforeRefine = n.essence; n = G.refine(n, first); assert.equal(n.inventory.find(x=>x.uid===first).refinement, 1); assert.equal(n.essence, beforeRefine - 1);
  n = G.unequip(n, 'weapon'); n = G.salvage(n, first); assert.equal(n.inventory.length, 0);
});

test('三条本命神兵都能以历练完成两次确定蜕变并停在第三段', () => {
  for (const root of G.SPECIAL_ROOTS) {
    let s = G.createState();
    s.inventory.push({ uid:`gear-${root.replace(/-/g,'')}`, id:root, identified:true, refinement:0, xp:500 });
    s.slots.weapon = s.inventory[0].uid; G.validate(s);
    const middle = G.evolve(s, s.inventory[0].uid), midDef = G.data(middle.inventory[0]);
    assert.equal(midDef.stage, 1);
    const end = G.evolve(middle, middle.inventory[0].uid), endDef = G.data(end.inventory[0]);
    assert.equal(endDef.stage, 2); assert.equal(endDef.next, null);
    assert.throws(() => G.evolve(end, end.inventory[0].uid));
  }
});

test('旧 v5 存档迁移只补空装备态，不伪造历史掉落或器蕴', () => {
  const current = E.createRun(77), old = clone(current); old.version = 5; delete old.equipment;
  const migrated = E.deserialize(JSON.stringify(old));
  assert.equal(migrated.version, E.VERSION);
  assert.deepEqual(migrated.equipment, G.createState());
});

test('装备动作进入主 reducer，保持 revision 与输入不可变', () => {
  const s = enter(88), source = clone(s);
  source.equipment = G.addDrop(source.equipment, source.seed, 'boss:fixture', 'boss', 3, 'sword-break');
  E.validate(source);
  const before = JSON.stringify(source), uid = source.equipment.inventory[0].uid;
  const identified = E.transition(source, { type:'equipment-identify', id:uid, revision:source.revision });
  assert.equal(JSON.stringify(source), before); assert.equal(identified.equipment.inventory[0].identified, true);
  assert.notEqual(String(identified.revision), String(source.revision));
  const worn = E.transition(identified, { type:'equipment-equip', id:uid, revision:identified.revision });
  assert.equal(worn.equipment.slots.weapon, uid); assert.ok(E.power(worn) > E.power(identified));
});
