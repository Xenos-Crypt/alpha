// Proper trees, drawn efficiently: every tree of the same shape is one instanced mesh, so the
// whole map's trees cost only a few draw calls (important on phones).
//   oak    – tapered trunk, three branches, a layered canopy of leaf clusters, darker underneath
//   pine   – trunk with four stacked tiers, lighter tips
//   birch  – slim pale trunk with dark marks, small airy leaf clusters
//   palm   – curved trunk in segments, drooping fronds, coconuts
// Each species has three shape variants, and every tree gets its own size, turn and leaf tint.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

function paint(geo, color, shade = 0, y0 = 0, y1 = 1) {
  // bake a colour into the vertices, darker towards the bottom of the shape (cheap fake lighting)
  geo = geo.index ? geo.toNonIndexed() : geo.clone(); const pos = geo.attributes.position, n = pos.count, cols = new Float32Array(n * 3), c = new THREE.Color(color);
  for (let i = 0; i < n; i++) { const t = THREE.MathUtils.clamp((pos.getY(i) - y0) / Math.max(0.001, y1 - y0), 0, 1), k = 1 - shade + shade * t; cols[i * 3] = c.r * k; cols[i * 3 + 1] = c.g * k; cols[i * 3 + 2] = c.b * k; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); if (geo.attributes.uv) geo.deleteAttribute('uv'); return geo;
}
const place = (geo, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s)); return geo.clone().applyMatrix4(m); };

function oak(v) {
  const parts = [], bark = 0x6b4a2f;
  parts.push(paint(new THREE.CylinderGeometry(0.17, 0.32, 2.6, 7).translate(0, 1.3, 0), bark, 0.3, 0, 2.6));
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + v; parts.push(paint(place(new THREE.CylinderGeometry(0.06, 0.12, 1.5, 5).translate(0, 0.75, 0), Math.sin(a) * 0.15, 1.9, Math.cos(a) * 0.15, Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8), bark, 0.2, 1.9, 3.2)); }
  const leaf = [0x3f6a35, 0x4a7a3c, 0x557f42][v % 3], blob = new THREE.DodecahedronGeometry(1, 0);
  const n = 7 + v;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + v, r = i === n - 1 ? 0 : 1.15 + rnd() * 0.35, y = i === n - 1 ? 4.3 : 3.2 + rnd() * 0.7, s = i === n - 1 ? 1.25 : 0.95 + rnd() * 0.45;
    parts.push(paint(place(blob, Math.cos(a) * r, y, Math.sin(a) * r, rnd() * 3, rnd() * 3, 0, s), leaf, 0.45, 2.3, 5.5));
  }
  return mergeGeometries(parts);
}
function pine(v) {
  const parts = [paint(new THREE.CylinderGeometry(0.13, 0.24, 1.8, 6).translate(0, 0.9, 0), 0x5a3d26, 0.3, 0, 1.8)];
  const tiers = 4 + (v % 2), col = [0x2f5a35, 0x2b5230, 0x355f3a][v % 3];
  for (let i = 0; i < tiers; i++) { const r = 1.9 - i * 0.38, h = 1.9 - i * 0.12, y = 1.2 + i * 1.05; parts.push(paint(new THREE.ConeGeometry(r, h, 8).translate(0, y + h / 2, 0).rotateY(i * 0.4), col, 0.5, y, y + h)); }
  return mergeGeometries(parts);
}
function birch(v) {
  const parts = [paint(new THREE.CylinderGeometry(0.1, 0.16, 3.6, 6).translate(0, 1.8, 0), 0xe8e4da, 0.15, 0, 3.6)];
  for (let i = 0; i < 4; i++) parts.push(paint(new THREE.CylinderGeometry(0.165, 0.165, 0.08, 6).translate(0, 0.5 + i * 0.75 + (v % 2) * 0.2, 0), 0x2b2b2b));   // bark marks
  const blob = new THREE.IcosahedronGeometry(0.75, 0);
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + v; parts.push(paint(place(blob, Math.cos(a) * 0.6, 3.3 + (i % 3) * 0.55, Math.sin(a) * 0.6, rnd() * 3, rnd() * 3, 0, 0.8 + rnd() * 0.4), 0x6f9a4a, 0.4, 2.8, 5)); }
  return mergeGeometries(parts);
}
function palm(v) {
  const parts = [], bend = 0.12 + v * 0.05;
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < 6; i++) { const seg = new THREE.CylinderGeometry(0.17 - i * 0.012, 0.2 - i * 0.012, 1.0, 7).translate(0, 0.5, 0); parts.push(paint(place(seg, x, y, 0, 0, 0, -a), 0x8a6a46, 0.25, 0, 6)); x += Math.sin(a) * 1.0; y += Math.cos(a) * 1.0; a += bend; }
  const frond = new THREE.BoxGeometry(0.5, 0.05, 2.6).translate(0, 0, 1.3);
  for (let i = 0; i < 8; i++) parts.push(paint(place(frond, x, y, 0, 0.55, i * Math.PI / 4, 0), 0x3f7e49, 0.3, y - 1, y + 0.3));
  for (let i = 0; i < 3; i++) parts.push(paint(place(new THREE.SphereGeometry(0.16, 6, 5), x + Math.cos(i * 2.1) * 0.25, y - 0.25, Math.sin(i * 2.1) * 0.25), 0x5a3a1a));
  return mergeGeometries(parts);
}
const BUILD = { oak, pine, birch, palm };

// Every tree also has a condition (100% when healthy). Driving into one knocks it down a bit —
// sturdy oaks and big trees take more, slim birches less — and at 0% it falls over, away from
// whatever hit it. A fallen tree no longer blocks the way and grows back after a while.
const STURDY = { oak: 1.25, pine: 1, birch: 0.7, palm: 0.85 };
const REGROW = 240;   // seconds until a fallen tree stands again

export function createForest(scene, { onAdd, onFall, onRegrow } = {}) {
  const lists = new Map(), meshes = [], all = [];   // key "kind:variant" -> [tree]
  const CELL = 8, grid = new Map(), cellKey = (x, z) => Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
  const moving = new Set();
  let dirty = false;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  function add(x, y, z, { kind = 'oak', scale = 1, variant } = {}) {
    if (!BUILD[kind]) kind = 'oak';
    const v = variant ?? Math.floor(rnd() * 3), key = kind + ':' + v;
    if (!lists.has(key)) lists.set(key, []);
    const g = 0.85 + rnd() * 0.3, s = scale * (0.85 + rnd() * 0.3);
    const t = { x, y, z, s, r: rnd() * Math.PI * 2, tint: new THREE.Color(g, 0.9 + rnd() * 0.2, g), kind, hp: 100, tilt: 0, fallDir: 0, down: 0, mesh: null, i: -1 };
    lists.get(key).push(t); all.push(t);
    const k = cellKey(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t);
    onAdd?.(t);
    dirty = true; return t;
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  function matrixOf(t) {   // standing, or tipped over towards fallDir by `tilt` radians, pivoting at the base
    q.setFromAxisAngle(up, t.r);
    if (t.tilt > 0) { axis.set(Math.cos(t.fallDir), 0, -Math.sin(t.fallDir)); qt.setFromAxisAngle(axis, t.tilt); q.premultiply(qt); }
    return m4.compose(pos.set(t.x, t.y, t.z), q, sc.set(t.s, t.s, t.s));
  }
  function flush() {
    if (!dirty) return;
    for (const m of meshes) { m.removeFromParent(); m.dispose(); }
    meshes.length = 0;
    for (const [key, list] of lists) {
      const [kind, v] = key.split(':'), geo = BUILD[kind](+v);
      const im = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((t, i) => { t.mesh = im; t.i = i; im.setMatrixAt(i, matrixOf(t)); im.setColorAt(i, t.tint); });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.userData.noCull = true; im.userData.isForest = true;
      scene.add(im); meshes.push(im);
    }
    dirty = false;
  }
  // the tree nearest to a point (within maxD metres), standing ones only
  function nearest(x, z, maxD = 1.6) {
    let best = null, bd = maxD;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const t of grid.get(cellKey(x + a * CELL, z + b * CELL)) || []) {
      if (t.hp <= 0) continue; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  // a hit at `speed` m/s coming from (fromX, fromZ): returns { before, after, fell }
  function damage(t, speed, fromX = t.x - 1, fromZ = t.z) {
    if (!t || t.hp <= 0 || speed < 2) return null;
    const before = t.hp;
    t.hp = Math.max(0, t.hp - speed * 2.4 / ((STURDY[t.kind] || 1) * Math.max(0.6, t.s)));
    if (t.hp <= 0) { t.fallDir = Math.atan2(t.x - fromX, t.z - fromZ); t.falling = true; t.down = 0; moving.add(t); onFall?.(t); }
    else { t.shake = 0.35; moving.add(t); }
    return { before, after: t.hp, fell: t.hp <= 0 };
  }
  function update(dt) {
    for (const t of moving) {
      if (t.falling) { t.tilt = Math.min(Math.PI / 2 - 0.08, t.tilt + dt * (0.6 + t.tilt * 3)); if (t.tilt >= Math.PI / 2 - 0.08) t.falling = false; }
      else if (t.hp <= 0) { t.down += dt; if (t.down > REGROW) { t.hp = 100; t.tilt = 0; onRegrow?.(t); moving.delete(t); } }
      else if (t.shake > 0) { t.shake -= dt; t.tilt = Math.max(0, Math.sin(t.shake * 40) * 0.05 * t.shake); t.fallDir = 0; if (t.shake <= 0) { t.tilt = 0; moving.delete(t); } }
      if (t.mesh) { t.mesh.setMatrixAt(t.i, matrixOf(t)); t.mesh.instanceMatrix.needsUpdate = true; }
    }
  }
  return { add, flush, update, nearest, damage, trees: all, get count() { return all.length; } };
}
export function pickKind(x, z) {   // a natural mix: mostly broadleaf, some pines and birches
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  return h < 0.58 ? 'oak' : h < 0.8 ? 'pine' : 'birch';
}
