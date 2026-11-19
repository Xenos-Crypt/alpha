import test from 'node:test';
import assert from 'node:assert/strict';
import { pickDaily, levelAfterDeath, lootChance, dayKey, DEATH_WAIT_MS } from './system.js';

const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id }));

test('daily quests: three different ones, the same all day, different on other days', () => {
  const a = pickDaily(pool, '2026-11-19'), b = pickDaily(pool, '2026-11-19');
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map(q => q.id)).size, 3);
  assert.deepEqual(a, b);
  const days = new Set(['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'].map(d => pickDaily(pool, d).map(q => q.id).join()));
  assert.ok(days.size > 1);
});

test('death drops two levels only above level 10', () => {
  assert.equal(levelAfterDeath(4), 4);
  assert.equal(levelAfterDeath(10), 10);
  assert.equal(levelAfterDeath(11), 9);
  assert.equal(levelAfterDeath(30), 28);
});

test('the wait after death is 24 hours', () => assert.equal(DEATH_WAIT_MS, 86400000));

test('belongings: usually looted after a full day away', () => {
  assert.equal(lootChance(0), 0);
  assert.ok(lootChance(1) < 0.15);
  assert.ok(lootChance(24) > 0.85);
});

test('day key uses the local date', () => assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05'));
