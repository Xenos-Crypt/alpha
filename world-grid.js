// WORLD GRID: one map of the ground that knows what stands where, so nothing gets built inside anything else.
//
// The ground is cut into square cells along the x and z axes (1 m by default). Everything that takes up room
// has a footprint (a rectangle on the ground) and a height range, and covers every cell under its footprint:
// a post covers one cell, a 40 x 20 m hall covers 800. Each cell has two layers:
//   - GROUND: roads, rails, paths, lawns, pavements. They may share cells with each other (a path meets a road).
//   - SOLID:  buildings, walls, fences, trees, posts, benches, platforms. Two solid things may never share a cell
//             at the same height. A solid thing may stand on ground only if it is meant to (a lamp on a pavement),
//             and never on a road or a rail unless it is high enough to pass over (a bridge).
//
// createWorldGrid() is the placement map: check() before you place, place() to claim the cells (it refuses and
// says what is in the way), free() to give them back.
// auditScene() looks at a whole scene and lists every place where two things overlap: what they are, where,
// and by how much. It changes nothing. Open the game with ?audit to run it after the world has loaded.

export const GROUND = 'ground', SOLID = 'solid';

export function createWorldGrid({ cell = 1 } = {}) {
  const cells = new Map(), items = new Map(); let next = 1;
  const key = (i, k) => i * 1000003 + k;
  function* cellsOf(r) {
    const i0 = Math.floor(r.minX / cell), i1 = Math.ceil(r.maxX / cell) - 1, k0 = Math.floor(r.minZ / cell), k1 = Math.ceil(r.maxZ / cell) - 1;
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) yield key(i, k);
  }
  // what is already in the way of a footprint r = {minX,maxX,minZ,maxZ} on a layer, between heights minY and maxY
  function check(r, { layer = SOLID, minY = 0, maxY = 3 } = {}) {
    const hits = new Set();
    for (const c of cellsOf(r)) for (const id of cells.get(c) || []) {
      const it = items.get(id); if (!it || hits.has(it)) continue;
      if (layer === GROUND && it.layer === GROUND) continue;                       // ground meets ground freely
      if (it.layer === GROUND && layer === SOLID && (it.allowOn || maxY <= it.maxY + 0.05)) continue;   // standing on pavement, or flat on it
      if (layer === GROUND && it.layer === SOLID && it.minY >= maxY + 2.2) continue;   // a bridge or roof high above
      if (layer === SOLID && it.layer === SOLID && (it.minY >= maxY || it.maxY <= minY)) continue;   // one above the other
      hits.add(it);
    }
    return [...hits];
  }
  function place(r, o = {}) {
    const hits = o.force ? [] : check(r, o);
    if (hits.length) { console.warn(`[world-grid] "${o.name || 'something'}" can't go at x ${r.minX.toFixed(1)}-${r.maxX.toFixed(1)}, z ${r.minZ.toFixed(1)}-${r.maxZ.toFixed(1)}: ${hits.map(h => h.name).join(', ')} is there`); return null; }
    const id = next++, it = { id, ...r, layer: o.layer || SOLID, minY: o.minY ?? 0, maxY: o.maxY ?? 3, name: o.name || 'something', allowOn: !!o.allowOn };
    items.set(id, it); for (const c of cellsOf(r)) { let l = cells.get(c); if (!l) cells.set(c, l = []); l.push(id); }
    return id;
  }
  function free(id) { const it = items.get(id); if (!it) return; items.delete(id); for (const c of cellsOf(it)) { const l = cells.get(c); if (l) { const i = l.indexOf(id); if (i >= 0) l.splice(i, 1); } } }
  function at(x, z) { return (cells.get(key(Math.floor(x / cell), Math.floor(z / cell))) || []).map(id => items.get(id)).filter(Boolean); }
  return { cell, check, place, free, at, get size() { return items.size; } };
}

// ---------------------------------------------------------------- the audit
// A box for every visible thing in the scene, then every pair of things from different builds that overlap
// by a real amount (not two walls meeting at a corner, not a lamp on the pavement).
export function auditScene(THREE, scene, opts = {}) {
  const skip = opts.skip || new Set(), areaName = opts.areaName || (() => ''), roads = opts.roads || [];
  const boxes = [], bb = new THREE.Box3(), tmp = new THREE.Matrix4(); let coarse = 0;
  const top = o => { let q = o; while (q.parent && q.parent !== scene) q = q.parent; return q; };
  const visible = o => { for (let q = o; q && q !== scene; q = q.parent) if (!q.visible || skip.has(q) || /hover/i.test(q.name)) return false; return true; };   // (hover pads ride under trams and trains)
  const label = o => {
    const names = []; for (let q = o; q && q !== scene; q = q.parent) if (q.name && !/^(Group|Mesh|Object3D)$/.test(q.name)) names.push(q.name);
    const g = o.geometry, p = g.boundingBox, s = p ? [p.max.x - p.min.x, p.max.y - p.min.y, p.max.z - p.min.z].map(v => +v.toFixed(1)).join('x') : '';
    const col = o.material?.color?.getHexString?.() || '';
    return (names.length ? names.slice(0, 2).join(' < ') + ' · ' : '') + `${g.type.replace('Geometry', '')} ${s} #${col}`;
  };
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry || !visible(o)) return;
    const g = o.geometry; if (/Plane|Circle|Ring|Shape/.test(g.type)) return;   // flat sheets take no room
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.transparent && m.opacity < 0.5) return;                            // glass-like haze, fence fabric
    if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingBox || g.boundingBox.isEmpty()) return;
    const add = mw => {
      bb.copy(g.boundingBox).applyMatrix4(mw);
      const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, d = bb.max.z - bb.min.z;
      if (Math.max(w, d) > 400 || w * h * d < 0.02) return;                       // the land and sky; crumbs
      if (Math.abs(bb.min.x + bb.max.x) < 0.02 && Math.abs(bb.min.z + bb.max.z) < 0.02) return;   // parts parked at the origin (templates)
      // round shapes (mountains, rocks, tree crowns, heads) fill far less than their box: they only count as
      // soft, and soft things are left out of the solid-against-solid test
      let soft = /Cone|Sphere|Icosahedron|Dodecahedron|Octahedron|Tetrahedron|Capsule|Torus|Lathe/.test(g.type);
      // so do turned boxes (a box at 45 degrees fills half its upright box), and big merged meshes (a whole street
      // in one mesh: its box is the whole street, so it says nothing about where the walls are)
      const gb = g.boundingBox, own = (gb.max.x - gb.min.x) * (gb.max.y - gb.min.y) * (gb.max.z - gb.min.z) * Math.abs(mw.determinant());
      if (g.type === 'BoxGeometry' && own / (w * h * d) < 0.7) soft = true;
      if (g.type !== 'BoxGeometry' && Math.max(w, d) > 40) { coarse++; soft = true; }
      if (g.type === 'BufferGeometry' && (m?.vertexColors || g.attributes.color) && Math.max(w, h, d) < 9) soft = true;   // trees and bushes (merged, coloured per vertex)
      const rail = g.type === 'BoxGeometry' && Math.max(w, d) > 12 && Math.min(w, d) < 0.25 && h < 0.15 && (m?.metalness ?? 0) >= 0.7;
      boxes.push({ o, owner: top(o), rail, soft, minX: bb.min.x, maxX: bb.max.x, minY: bb.min.y, maxY: bb.max.y, minZ: bb.min.z, maxZ: bb.max.z, vol: w * h * d });
    };
    if (o.isInstancedMesh) { for (let i = 0; i < Math.min(o.count, 4000); i++) { o.getMatrixAt(i, tmp); add(tmp.premultiply(o.matrixWorld)); } }
    else add(o.matrixWorld);
  });
  // a spatial hash (8 m buckets) so only nearby boxes are compared
  const B = 8, hash = new Map();
  boxes.forEach((b, n) => { for (let i = Math.floor(b.minX / B); i <= Math.floor(b.maxX / B); i++) for (let k = Math.floor(b.minZ / B); k <= Math.floor(b.maxZ / B); k++) { const kk = i * 100003 + k; let l = hash.get(kk); if (!l) hash.set(kk, l = []); l.push(n); } });
  const clashes = [], seen = new Set();
  const solid = b => !b.rail && !b.soft && b.maxY - b.minY >= 0.35;
  for (const l of hash.values()) for (let x = 0; x < l.length; x++) for (let y = x + 1; y < l.length; y++) {
    const a = boxes[l[x]], b = boxes[l[y]]; if (a.owner === b.owner) continue;
    const pk = l[x] < l[y] ? l[x] * 4194304 + l[y] : l[y] * 4194304 + l[x]; if (seen.has(pk)) continue; seen.add(pk);
    const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX), oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ), oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    if (ox <= 0.1 || oz <= 0.1) continue;
    let kind = null;
    if (a.rail !== b.rail) {                                                      // a rail running into something standing on it
      const r = a.rail ? a : b, s = a.rail ? b : a;
      if (solid(s) && s.minY < r.maxY + 0.3 && s.maxY > r.maxY + 0.5 && ox * oz > 0.3) kind = 'track through';
    } else if (solid(a) && solid(b) && oy > 0.1) {
      const vol = ox * oy * oz, small = Math.min(a.vol, b.vol), same = a.o.material?.color && b.o.material?.color && a.o.material.color.equals(b.o.material.color);
      if (same && Math.max(a.vol, b.vol) < 1500) continue;                            // rocks in a pile, bricks of one wall
      const [sm, bg] = a.vol < b.vol ? [a, b] : [b, a];
      if (sm.minX >= bg.minX - 0.05 && sm.maxX <= bg.maxX + 0.05 && sm.minZ >= bg.minZ - 0.05 && sm.maxZ <= bg.maxZ + 0.05 && sm.maxY > bg.maxY + 0.3 && sm.minY <= bg.minY + 0.3) continue;   // a chimney or tower rising out of its roof
      if (vol > 4 || (vol > 0.3 && vol / small > 0.25)) kind = 'overlap';
    } else if (a.soft !== b.soft && oy > 0.5) {                                      // a tree or rock growing inside a building
      const sf = a.soft ? a : b, hd = a.soft ? b : a;
      if (solid(hd) && hd.o.geometry.type === 'BoxGeometry' && hd.vol > 60 && sf.vol < 400 && ox * oy * oz > 0.3 * sf.vol) kind = sf.o.geometry.type === 'CapsuleGeometry' ? 'person inside a building' : 'inside a building';
    }
    if (!kind) continue;
    const cx = (Math.max(a.minX, b.minX) + Math.min(a.maxX, b.maxX)) / 2, cz = (Math.max(a.minZ, b.minZ) + Math.min(a.maxZ, b.maxZ)) / 2;
    clashes.push({ kind, x: +cx.toFixed(1), z: +cz.toFixed(1), area: areaName(cx, cz), size: [ox, Math.max(oy, 0), oz].map(v => +v.toFixed(1)), a: label(a.o), b: label(b.o) });
  }
  // things standing in the road (a road is a flat strip; only things with a real footprint count, not poles)
  for (const r of roads) {
    const rw = r.maxX - r.minX, rd = r.maxZ - r.minZ; if (Math.min(rw, rd) > 20 || Math.max(rw, rd) < 3 * Math.min(rw, rd)) continue;   // roads are long strips (squares are yards and car parks)
    const i0 = Math.floor(r.minX / B), i1 = Math.floor(r.maxX / B), k0 = Math.floor(r.minZ / B), k1 = Math.floor(r.maxZ / B), hitHere = new Set();
    if ((i1 - i0 + 1) * (k1 - k0 + 1) > 20000) continue;
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) for (const n of hash.get(i * 100003 + k) || []) {
      const s = boxes[n]; if (hitHere.has(s.owner) || !solid(s) || s.minY > 2.2 || s.maxY < 0.6) continue;
      const ox = Math.min(r.maxX, s.maxX) - Math.max(r.minX, s.minX), oz = Math.min(r.maxZ, s.maxZ) - Math.max(r.minZ, s.minZ);
      if (ox <= 0.5 || oz <= 0.5 || ox * oz < 1.5) continue;
      hitHere.add(s.owner); const cx = (Math.max(r.minX, s.minX) + Math.min(r.maxX, s.maxX)) / 2, cz = (Math.max(r.minZ, s.minZ) + Math.min(r.maxZ, s.maxZ)) / 2;
      clashes.push({ kind: 'in the road', x: +cx.toFixed(1), z: +cz.toFixed(1), area: areaName(cx, cz), size: [+ox.toFixed(1), 0, +oz.toFixed(1)], a: label(s.o), b: 'road' });
    }
  }
  // the invisible walls (colliders) too: two solid footprints that cover the same ground. This is how things
  // that are drawn merged into one big mesh (Cinder Row's shacks) get checked one by one.
  const cols = (opts.colliders || []).filter(c => !c.baseYAt && c.maxX - c.minX > 0.05 && c.maxZ - c.minZ > 0.05 && (c.maxX - c.minX) * (c.maxZ - c.minZ) < 20000), ch = new Map();
  cols.forEach((c, n) => { for (let i = Math.floor(c.minX / B); i <= Math.floor(c.maxX / B); i++) for (let k = Math.floor(c.minZ / B); k <= Math.floor(c.maxZ / B); k++) { const kk = i * 100003 + k; let l = ch.get(kk); if (!l) ch.set(kk, l = []); l.push(n); } });
  const cseen = new Set();
  for (const l of ch.values()) for (let x = 0; x < l.length; x++) for (let y = x + 1; y < l.length; y++) {
    const pk = Math.min(l[x], l[y]) * 4194304 + Math.max(l[x], l[y]); if (cseen.has(pk)) continue; cseen.add(pk);
    const a = cols[l[x]], b = cols[l[y]];
    const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX), oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ); if (ox <= 0.3 || oz <= 0.3) continue;
    const aa = (a.maxX - a.minX) * (a.maxZ - a.minZ), ba = (b.maxX - b.minX) * (b.maxZ - b.minZ), o = ox * oz;
    if (o < 1 || o < 0.25 * Math.min(aa, ba) || Math.max(aa, ba) > 400) continue;   // (big ones are lakes and plazas drawn as several squares)
    if (o > 0.97 * Math.min(aa, ba)) continue;                                         // one inside the other: a chimney on its factory, a kiosk on its plaza
    if (Math.abs(a.minX - b.minX) < 0.6 && Math.abs(a.maxX - b.maxX) < 0.6 && Math.abs(a.minZ - b.minZ) < 0.6 && Math.abs(a.maxZ - b.maxZ) < 0.6) continue;   // the same thing listed twice
    if (o > 0.9 * Math.min(aa, ba) && Math.min(aa, ba) / Math.max(aa, ba) > 0.4 && (ox < 0.6 || oz < 0.6)) continue;   // two copies of one wall
    const cx = (Math.max(a.minX, b.minX) + Math.min(a.maxX, b.maxX)) / 2, cz = (Math.max(a.minZ, b.minZ) + Math.min(a.maxZ, b.maxZ)) / 2;
    const dims = c => `${(c.maxX - c.minX).toFixed(1)}x${(c.maxZ - c.minZ).toFixed(1)} at (${((c.minX + c.maxX) / 2).toFixed(0)}, ${((c.minZ + c.maxZ) / 2).toFixed(0)})`;
    clashes.push({ kind: 'solid footprints overlap', x: +cx.toFixed(1), z: +cz.toFixed(1), area: areaName(cx, cz), size: [+ox.toFixed(1), 0, +oz.toFixed(1)], a: 'collider ' + dims(a), b: 'collider ' + dims(b) });
  }
  // the same two things touching in several pieces count once (per 4 m patch)
  const once = new Map(); for (const c of clashes) { const k = [c.kind, c.a, c.b].join('|') + '|' + Math.round(c.x / 4) + ',' + Math.round(c.z / 4); if (!once.has(k)) once.set(k, c); }
  clashes.length = 0; clashes.push(...once.values());
  const byArea = {}; for (const c of clashes) (byArea[c.area || '?'] ||= []).push(c);
  return { boxes: boxes.length, coarse, clashes, byArea, summary: Object.entries(byArea).map(([k, v]) => [k, v.length]).sort((p, q) => q[1] - p[1]) };
}
