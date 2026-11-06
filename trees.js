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

export function createForest(scene) {
  const lists = new Map(), meshes = [];   // key "kind:variant" -> [{x,y,z,s,r,tint}]
  let dirty = false;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  function add(x, y, z, { kind = 'oak', scale = 1, variant } = {}) {
    if (!BUILD[kind]) kind = 'oak';
    const v = variant ?? Math.floor(rnd() * 3), key = kind + ':' + v;
    if (!lists.has(key)) lists.set(key, []);
    const g = 0.85 + rnd() * 0.3;
    lists.get(key).push({ x, y, z, s: scale * (0.85 + rnd() * 0.3), r: rnd() * Math.PI * 2, tint: new THREE.Color(g, 0.9 + rnd() * 0.2, g) });
    dirty = true;
  }
  function flush() {
    if (!dirty) return;
    for (const m of meshes) { m.removeFromParent(); m.dispose(); }
    meshes.length = 0;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (const [key, list] of lists) {
      const [kind, v] = key.split(':'), geo = BUILD[kind](+v);
      const im = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((t, i) => { im.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.y, t.z), q.setFromAxisAngle(up, t.r), new THREE.Vector3(t.s, t.s, t.s))); im.setColorAt(i, t.tint); });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.userData.noCull = true; im.userData.isForest = true;
      scene.add(im); meshes.push(im);
    }
    dirty = false;
  }
  return { add, flush, get count() { let n = 0; for (const l of lists.values()) n += l.length; return n; } };
}
export function pickKind(x, z) {   // a natural mix: mostly broadleaf, some pines and birches
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  return h < 0.58 ? 'oak' : h < 0.8 ? 'pine' : 'birch';
}
