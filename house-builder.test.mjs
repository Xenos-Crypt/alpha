import test from 'node:test';
import assert from 'node:assert/strict';
import { PLOTS, DESIGNS, priceOf, MATERIALS, ROOFS, WINDOWS } from './house-builder.js';

test('Maple Fields plots do not overlap and sit inside the dome', () => {
  for (const p of PLOTS) {
    assert.ok(p.x1 > p.x0 && p.z1 > p.z0);
    for (const [x, z] of [[p.x0, p.z0], [p.x1, p.z1], [p.x0, p.z1], [p.x1, p.z0]]) assert.ok(Math.hypot(x - 170, z - 150) < 1340, `${p.id} corner outside the dome`);
    for (const q of PLOTS) if (q !== p) assert.ok(p.x1 <= q.x0 || q.x1 <= p.x0, `${p.id} overlaps ${q.id}`);
  }
});

test('every ready-made design is valid and priced sensibly', () => {
  for (const d of DESIGNS) {
    assert.ok(MATERIALS[d.wall] && ROOFS[d.roof] && WINDOWS[d.windows], d.name);
    assert.ok(d.floors >= 1 && d.floors <= 3 && d.w >= 8 && d.w <= 20 && d.d >= 8 && d.d <= 16, d.name);
    const price = priceOf(d); assert.ok(price > 1500 && price < 22000, `${d.name}: ${price}`);
  }
});

test('bigger houses and extras cost more', () => {
  const base = { floors: 1, w: 10, d: 8, roof: 'gable', wall: 'brick', windows: 'small', extras: {} };
  assert.ok(priceOf({ ...base, floors: 2 }) > priceOf(base));
  assert.ok(priceOf({ ...base, extras: { pool: true } }) > priceOf(base));
  assert.ok(priceOf({ ...base, wall: 'glass' }) > priceOf({ ...base, wall: 'wood' }));
});
