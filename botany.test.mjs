// Every plant and animal in the parks is a real, named species, and each one gets a proper ID.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANTS, ANIMALS, TREE_SHAPE, LIFE, makeBotany, plantId } from './botany.js';

test('every plant has a common name, a botanical name, a family and a genus code', () => {
  for (const [k, s] of Object.entries(PLANTS)) {
    assert.match(s.code, /^[A-Z]{3}$/, k); assert.ok(['FLW', 'SHR', 'TRE', 'PLM'].includes(s.kind), k);
    assert.ok(s.common && s.botanical && s.family.endsWith('ceae') && s.origin, k);
  }
  for (const k of Object.keys(TREE_SHAPE)) assert.ok(PLANTS[k], k);
});

test('every animal has a scientific name and a class', () => {
  for (const [k, a] of Object.entries(ANIMALS)) { assert.match(a.code, /^[A-Z]{3}$/, k); assert.ok(['BRD', 'MAM', 'REP', 'INS'].includes(a.kind), k); assert.match(a.scientific, /^[A-Z][a-z]+ [a-z×]/, k); }
});

test('a planted bed records every plant, gets an ID, and puts up labels', () => {
  const interactables = [], before = LIFE.plants.length;
  const bot = makeBotany({ interactables }, 'Test Park');
  bot.bed('tApeldoorn', 0, 28, 0, 2, 'the test bed', { plants: [[1, 1], [2, 1], [3, 1]] });
  assert.equal(LIFE.plants.length - before, 3);
  assert.ok(LIFE.things.some(t => t.cls === 'LND' && t.kind === 'BED' && t.mat === 'TUL'));
  assert.equal(interactables.length, 2);   // one label stake every 14 m
  assert.match(interactables[0].label, /Tulipa 'Apeldoorn'/);
  const id = plantId(LIFE.plants[before]);
  assert.match(id, /^PLT-FLW-TUL-GOV-[0-9A-Z]{6}$/);
  assert.notEqual(id, plantId(LIFE.plants[before + 1]));
});
