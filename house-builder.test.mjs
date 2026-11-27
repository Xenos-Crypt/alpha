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

import { xf, layout, plotSize, wingOf, progressOf, stageAt, BUILD_MS, GAME_DAY_MS, clampSpec, SHAPES } from './house-builder.js';

test('building takes six months on the game calendar and carries on from the real clock', () => {
  assert.equal(BUILD_MS / GAME_DAY_MS, 180);
  const rec = { startAt: 1000, doneAt: 1000 + BUILD_MS };
  assert.equal(progressOf(rec, 1000), 0); assert.equal(progressOf(rec, 1000 + BUILD_MS / 2), 0.5); assert.equal(progressOf(rec, 1000 + BUILD_MS * 2), 1);
  assert.equal(stageAt(0.01).key, 'ground'); assert.equal(stageAt(0.3).key, 'walls'); assert.equal(stageAt(0.65).key, 'roof'); assert.equal(stageAt(0.95).key, 'inside');
  assert.equal(progressOf({ doneAt: 5 }), 1);   // (an old save without a start time: long finished)
});

test('plot coordinates turn into the world and back for every quarter turn', () => {
  for (let q = 0; q < 4; q++) { const X = xf({ x: 300, z: -40, rot: q * Math.PI / 2 });
    for (const [x, z] of [[0, 0], [5, -3], [-12, 20]]) { const [wx, wz] = X.toW(x, z), [lx, lz] = X.toL(wx, wz); assert.ok(Math.abs(lx - x) < 1e-9 && Math.abs(lz - z) < 1e-9); }
    const r = X.rect(-2, 2, -5, 5); assert.ok(r.maxX - r.minX === (q % 2 ? 10 : 4)); }
});

test('every shape and size fits its land, and on a Maple Fields plot', () => {
  for (const shape of Object.keys(SHAPES)) for (const w of [8, 14, 20]) for (const d of [8, 12, 16]) for (const ex of [{}, { garage: true, pool: true }]) {
    const s = clampSpec({ ...DESIGNS[0], shape, w, d, extras: ex }), sz = plotSize(s);
    assert.ok(sz.pw <= 38 && sz.pd <= 48, `${shape} ${w}x${d} needs ${sz.pw}x${sz.pd}`);
    const p = { x0: -sz.pw / 2, x1: sz.pw / 2, z0: -sz.pd / 2, z1: sz.pd / 2 }, L = layout(p, s);
    assert.ok(L.hx0 >= p.x0 + 2.9 && L.hx1 + (ex.garage ? 6.8 : 0) <= p.x1 && L.back <= p.z1 - 4, `${shape} ${w}x${d} spills off its land`);
    if (wingOf(s)) { assert.ok(L.wing.x0 >= L.hx0 && L.wing.x1 <= L.hx1 + 1e-9); assert.ok(L.dc - 0.65 >= L.wing.x0 && L.dc + 0.65 <= L.wing.x1 && L.dc >= L.hx0 + 4, 'the way into the wing misses the bathroom'); }
  }
});
