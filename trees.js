// Proper trees, drawn efficiently: every tree of the same shape is one instanced mesh, so the
// whole map's trees cost only a few draw calls (important on phones).
//   oak    – tapered trunk, three branches, a layered canopy of leaf clusters, darker underneath
//   pine   – trunk with four stacked tiers, lighter tips
//   birch  – slim pale trunk with dark marks, small airy leaf clusters
//   palm   – curved trunk in segments, drooping fronds, coconuts
//   cherry – a short dark trunk, spreading branches, a wide canopy of pink blossom
//   maple  – a small tree with a low layered canopy of deep red leaves
//   willow – a crown with long strands of leaves hanging down to the ground
//   cypress – a tall dark green column
//   beech  – a big rounded canopy of copper-purple leaves on a smooth grey trunk
// Each species has three shape variants, and every tree gets its own size, turn and leaf tint.
import * as THREE from 'three';
import { seasonalFoliage } from './seasons.js';
// leaf colour for the season (set by seasons.js): rgb tint + strength; trunks keep their colour
export const FOLIAGE_TINT = { value: new THREE.Vector4(0, 0, 0, 0) };
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

function paint(geo, color, shade = 0, y0 = 0, y1 = 1, keepUv = false) {
  // bake a colour into the vertices, darker towards the bottom of the shape (cheap fake lighting)
  geo = geo.index ? geo.toNonIndexed() : geo.clone(); const pos = geo.attributes.position, n = pos.count, cols = new Float32Array(n * 3), c = new THREE.Color(color);
  for (let i = 0; i < n; i++) { const t = THREE.MathUtils.clamp((pos.getY(i) - y0) / Math.max(0.001, y1 - y0), 0, 1), k = 1 - shade + shade * t; cols[i * 3] = c.r * k; cols[i * 3 + 1] = c.g * k; cols[i * 3 + 2] = c.b * k; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); if (geo.attributes.uv && !keepUv) geo.deleteAttribute('uv'); return geo;
}
const place = (geo, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s)); return geo.clone().applyMatrix4(m); };

// LEAVES. Canopies are made of leaf cards: flat squares painted with a picture of many small leaves (see leafAtlas
// below; the see-through parts are cut away), crossed in every direction so the crown looks full and leafy from
// any side. Their normals point out from the middle of the crown, so a crown is lit like one soft rounded mass
// (bright on top and on the sunny side, darker underneath) instead of showing every flat card.
// The picture has two halves: a round cluster of leaves (broadleaf trees) and a long frond (palms, pine boughs,
// willow strands).
const CLUSTER = [0, 0.5], FROND = [0.5, 1];
function leafCard(region, w, h, baseAtBottom) {
  const g = new THREE.PlaneGeometry(w, h); if (baseAtBottom) g.translate(0, h / 2, 0);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, region[0] + uv.getX(i) * (region[1] - region[0]));
  return g;
}
function aimNormals(geo, cx, cy, cz, flat = 0.25) {   // point the normals out from (cx, cy, cz), keeping a little of the card's own facing
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3(), f = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i) - cx, (p.getY(i) - cy) * 0.8 + 0.25, p.getZ(i) - cz).normalize(); f.set(n.getX(i), n.getY(i), n.getZ(i)); if (f.dot(v) < 0) f.negate(); v.lerp(f, flat).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return geo;
}
// a ball of crossed leaf cards around (x, y, z), radius r
function cluster(x, y, z, r, color, crown, cards = 4, shade = 0.3) {
  const out = [];
  for (let i = 0; i < cards; i++) {
    const g = leafCard(CLUSTER, r * 2.1, r * 2.1);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x + (rnd() - 0.5) * r * 0.5, y + (rnd() - 0.5) * r * 0.4, z + (rnd() - 0.5) * r * 0.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 1.6 + (i % 2) * 1.2, i / cards * Math.PI + rnd() * 0.5, (rnd() - 0.5) * 0.8)), new THREE.Vector3(1, 1, 1)));
    out.push(aimNormals(paint(g, color, shade, crown.y0, crown.y1, true), crown.x, crown.y, crown.z));
  }
  return out;
}
// a frond or bough: a pair of long cards in a shallow V, from (x, y, z) out along heading `a`, dipping by `droop`
function frond(x, y, z, a, len, wid, droop, color, crown, shade = 0.25) {
  const out = [];
  for (const roll of [-0.45, 0.45]) {
    const g = leafCard(FROND, wid, len, true);
    g.rotateY(roll); g.rotateX(Math.PI / 2 + droop); g.rotateY(a); g.translate(x, y, z);   // (droop > 0 dips the tip)
    out.push(aimNormals(paint(g, color, shade, crown.y0, crown.y1, true), crown.x, crown.y, crown.z, 0.35));
  }
  return out;
}
const tree = (wood, leaf) => ({ wood: mergeGeometries(wood), leaf: mergeGeometries(leaf) });

function oak(v) {
  const wood = [], leafs = [], bark = 0x6b4a2f;
  wood.push(paint(new THREE.CylinderGeometry(0.17, 0.32, 2.6, 7).translate(0, 1.3, 0), bark, 0.3, 0, 2.6));
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + v; wood.push(paint(place(new THREE.CylinderGeometry(0.06, 0.12, 1.5, 5).translate(0, 0.75, 0), Math.sin(a) * 0.15, 1.9, Math.cos(a) * 0.15, Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8), bark, 0.2, 1.9, 3.2)); }
  const leaf = [0x58a03c, 0x64ad44, 0x4f9238][v % 3], crown = { x: 0, y: 3.7, z: 0, y0: 2.3, y1: 5.6 };
  const n = 8 + v;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + v, top = i >= n - 2, r = top ? 0.4 * (i - n + 2) : 1.2 + rnd() * 0.4, y = top ? 4.4 - (i - n + 2) * 0.5 : 3.1 + rnd() * 0.8, s = top ? 1.3 : 1.0 + rnd() * 0.4;
    leafs.push(...cluster(Math.cos(a) * r, y, Math.sin(a) * r, s, leaf, crown));
  }
  return tree(wood, leafs);
}
function pine(v) {
  const tiers = 7 + (v % 2), top = 1.4 + (tiers - 1) * 0.75 + 0.5;
  const wood = [paint(new THREE.CylinderGeometry(0.05, 0.24, top, 6).translate(0, top / 2, 0), 0x5a3d26, 0.3, 0, top)], leafs = [];
  const col = [0x3a7a44, 0x35703c, 0x418249][v % 3], crown = { x: 0, y: 0.6, z: 0, y0: 1.2, y1: 7.2 };   // (normals from low down: every bough faces out and up, like a cone)
  // boughs in tiers, long and drooping at the bottom, short at the top
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, r = 2.3 * (1 - t) + 0.35, y = 1.4 + i * 0.75, k = Math.max(5, Math.round(10 - i));
    for (let j = 0; j < k; j++) leafs.push(...frond(0, y, 0, j / k * Math.PI * 2 + i * 0.7 + rnd() * 0.3, r, Math.max(0.7, r * 0.95), 0.35 + (1 - t) * 0.2 + rnd() * 0.1, col, crown));
  }
  leafs.push(...cluster(0, top, 0, 0.45, col, crown, 3, 0.15));   // the pointed top
  return tree(wood, leafs);
}
function birch(v) {
  const wood = [paint(new THREE.CylinderGeometry(0.1, 0.16, 3.8, 6).translate(0, 1.9, 0), 0xe8e4da, 0.15, 0, 3.8)], leafs = [];
  for (let i = 0; i < 4; i++) wood.push(paint(new THREE.CylinderGeometry(0.165, 0.165, 0.08, 6).translate(0, 0.5 + i * 0.75 + (v % 2) * 0.2, 0), 0x2b2b2b));   // bark marks
  const crown = { x: 0, y: 4, z: 0, y0: 2.8, y1: 5.3 }, col = [0x86bb52, 0x92c45c, 0x7cae4a][v % 3];
  for (let i = 0; i < 7; i++) { const a = i * 1.1 + v; leafs.push(...cluster(Math.cos(a) * 0.65, 3.2 + (i % 3) * 0.6, Math.sin(a) * 0.65, 0.75 + rnd() * 0.3, col, crown, 3)); }
  return tree(wood, leafs);
}
function palm(v) {
  const wood = [], leafs = [], bend = 0.12 + v * 0.05;
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < 6; i++) { const seg = new THREE.CylinderGeometry(0.17 - i * 0.012, 0.2 - i * 0.012, 1.0, 7).translate(0, 0.5, 0); wood.push(paint(place(seg, x, y, 0, 0, 0, -a), 0x8a6a46, 0.25, 0, 6)); x += Math.sin(a) * 1.0; y += Math.cos(a) * 1.0; a += bend; }
  for (let i = 0; i < 3; i++) wood.push(paint(place(new THREE.SphereGeometry(0.16, 6, 5), x + Math.cos(i * 2.1) * 0.25, y - 0.25, Math.sin(i * 2.1) * 0.25), 0x5a3a1a));
  const col = [0x4c9e4a, 0x58a84e, 0x449444][v % 3], crown = { x, y: y + 0.3, z: 0, y0: y - 1.6, y1: y + 0.6 };
  // each frond arches: the inner half rises a little, the outer half droops
  for (let i = 0; i < 11; i++) {
    const h = i / 11 * Math.PI * 2 + rnd() * 0.3, ca = Math.cos(h), sa = Math.sin(h);
    leafs.push(...frond(x, y, 0, h, 1.5, 1.7, -0.25, col, crown));
    leafs.push(...frond(x + sa * 1.45, y + 0.36, ca * 1.45, h, 1.8, 1.5, 0.75 + rnd() * 0.2, col, crown));
  }
  return tree(wood, leafs);
}
function cherry(v) {
  const wood = [], leafs = [], bark = 0x4a3328;
  wood.push(paint(new THREE.CylinderGeometry(0.15, 0.26, 1.7, 7).translate(0, 0.85, 0), bark, 0.3, 0, 1.7));
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + v; wood.push(paint(place(new THREE.CylinderGeometry(0.05, 0.11, 1.9, 5).translate(0, 0.95, 0), 0, 1.5, 0, Math.cos(a) * 1.0, 0, -Math.sin(a) * 1.0), bark, 0.2, 1.5, 3)); }
  const pink = [0xffc4dc, 0xffd0e4, 0xffb8d4][v % 3], crown = { x: 0, y: 3, z: 0, y0: 2, y1: 4.5 };
  for (let i = 0; i < 10; i++) { const a = i / 9 * Math.PI * 2 + v, top = i >= 9, r = top ? 0 : 1.7 + rnd() * 0.4; leafs.push(...cluster(Math.cos(a) * r, top ? 3.5 : 2.7 + rnd() * 0.5, Math.sin(a) * r, top ? 1.3 : 0.95 + rnd() * 0.35, pink, crown, 4, 0.3)); }
  return tree(wood, leafs);
}
function maple(v) {
  const wood = [paint(new THREE.CylinderGeometry(0.1, 0.18, 1.8, 6).translate(0, 0.9, 0), 0x5a3d2e, 0.3, 0, 1.8)], leafs = [];
  const red = [0xb3302a, 0xc0391c, 0xa2261b][v % 3], crown = { x: 0, y: 2.4, z: 0, y0: 1.3, y1: 3.6 };
  for (let t = 0; t < 3; t++) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + t * 0.6 + v, r = (1.4 - t * 0.45) * (0.9 + rnd() * 0.2); leafs.push(...cluster(Math.cos(a) * r, 1.8 + t * 0.62, Math.sin(a) * r, 0.78 - t * 0.1, red, crown, 3, 0.35)); }
  return tree(wood, leafs);
}
function willow(v) {
  const wood = [paint(new THREE.CylinderGeometry(0.22, 0.38, 3.4, 7).translate(0, 1.7, 0), 0x5e4a36, 0.3, 0, 3.4)], leafs = [];
  const leaf = [0x93b552, 0x9fbf5e, 0x88a948][v % 3], crown = { x: 0, y: 3.8, z: 0, y0: 0.8, y1: 5.8 };
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + v; leafs.push(...cluster(Math.cos(a) * 1.1, 4.4 + rnd() * 0.5, Math.sin(a) * 1.1, 1.3, leaf, crown, 3)); }
  // long strands hanging almost to the ground, all round the crown
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2 + v * 0.3, r = 1.6 + (i % 3) * 0.35, len = 3.0 + (i % 4) * 0.35;
    const g = leafCard(FROND, 1.3, len, true); g.rotateZ(Math.PI); g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * r, 4.9 - (i % 2) * 0.3, Math.sin(a) * r);
    leafs.push(aimNormals(paint(g, leaf, 0.4, crown.y0, crown.y1, true), 0, crown.y, 0, 0.3));
  }
  return tree(wood, leafs);
}
function cypress(v) {
  const wood = [paint(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6).translate(0, 0.8, 0), 0x4a3426, 0.3, 0, 1.6)], leafs = [];
  const col = [0x3a6e36, 0x356632, 0x40763a][v % 3], h = 6.5 + v * 0.6, crown = { x: 0, y: 0.9 + h / 2, z: 0, y0: 0.9, y1: 0.9 + h };
  const n = 9;
  for (let i = 0; i < n; i++) { const t = i / (n - 1), r = 0.85 * Math.sin(Math.PI * (0.12 + t * 0.82)) + 0.15; leafs.push(...cluster((rnd() - 0.5) * 0.2, 1.1 + t * (h - 0.6), (rnd() - 0.5) * 0.2, r, col, crown, 3, 0.35)); }
  return tree(wood, leafs);
}
function beech(v) {
  const wood = [paint(new THREE.CylinderGeometry(0.2, 0.36, 3, 8).translate(0, 1.5, 0), 0x8a8a84, 0.25, 0, 3)], leafs = [];
  const leaf = [0x6a3040, 0x7a3648, 0x88404a][v % 3], crown = { x: 0, y: 4.3, z: 0, y0: 2.6, y1: 6.6 };
  for (let i = 0; i < 12; i++) { const a = i / 10 * Math.PI * 2 + v, top = i >= 10, r = top ? 0.5 * (i - 10) : 1.6 + rnd() * 0.5; leafs.push(...cluster(Math.cos(a) * r, top ? 5.3 - (i - 10) * 0.4 : 3.4 + rnd() * 1.2, Math.sin(a) * r, top ? 1.5 : 1.15 + rnd() * 0.4, leaf, crown)); }
  return tree(wood, leafs);
}
const BUILD = { oak, pine, birch, palm, cherry, maple, willow, cypress, beech };

// The leaf picture (drawn once, in code): left half a round cluster of many small pointed leaves, right half a frond
// (a stem with leaflets both sides, tapering at the tip). Pale and nearly grey, so each tree's own colour shows.
let atlas = null;
function leafAtlas() {
  if (atlas) return atlas;
  if (typeof document === 'undefined') return (atlas = new THREE.Texture());
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const R = (() => { let s = 777; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const leafShape = (px, py, len, wid, ang, lum) => {
    x.save(); x.translate(px, py); x.rotate(ang);
    x.fillStyle = `rgb(${Math.min(255, lum * 248) | 0},${Math.min(255, lum * 252) | 0},${Math.min(255, lum * 242) | 0})`;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(wid, len * 0.45, 0, len); x.quadraticCurveTo(-wid, len * 0.45, 0, 0); x.fill();
    x.strokeStyle = `rgba(40,50,30,${0.25 + R() * 0.15})`; x.lineWidth = 0.8; x.beginPath(); x.moveTo(0, len * 0.08); x.lineTo(0, len * 0.9); x.stroke();   // the middle vein
    x.restore();
  };
  // cluster: twigs, then several hundred leaves filling a circle, darker towards the middle (leaves in shade)
  x.strokeStyle = 'rgb(90,75,55)'; x.lineWidth = 2;
  for (let i = 0; i < 10; i++) { const a = R() * 6.28; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95); x.stroke(); }
  for (let i = 0; i < 520; i++) {
    const a = R() * 6.28, d = Math.sqrt(R()) * 112, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d;
    leafShape(px, py, 13 + R() * 9, 5 + R() * 3, R() * 6.28, 0.72 + 0.22 * (d / 112) + R() * 0.12);
  }
  // frond: base at the bottom of the picture, tip at the top
  const cx = 384; x.strokeStyle = 'rgb(120,110,80)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, H); x.lineTo(cx, 6); x.stroke();
  for (let i = 0; i < 70; i++) {
    const t = i / 70, py = H - 8 - t * (H - 14), len = 12 + 46 * Math.pow(Math.sin(Math.PI * (0.15 + t * 0.85)), 0.7) * (1 - t * 0.35);
    for (const side of [-1, 1]) leafShape(cx, py, len, 4.5 + R() * 2, side * (2.2 + R() * 0.2), 0.75 + R() * 0.25);
  }
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
  return atlas;
}
const WIND = { value: 0 };
function leafMaterial() {
  const mat = new THREE.MeshStandardMaterial({ map: leafAtlas(), vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWind = WIND;
    // both sides of a leaf card use the crown's outward normal (otherwise the back of every card would be dark)
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'));
    // a gentle sway in the wind, more at the top of the crown; every tree out of step with its neighbours
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec2 wp = vec2(0.0);
        #ifdef USE_INSTANCING
          wp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
        #endif
        float sway = sin(uWind * 1.4 + wp.x * 0.31 + wp.y * 0.23 + position.y * 0.6) + 0.4 * sin(uWind * 3.3 + position.x * 2.0);
        float k = max(0.0, position.y - 1.2) * 0.022;
        transformed.x += sway * k; transformed.z += sway * k * 0.6; }`);
  };
  mat.customProgramCacheKey = () => 'leaf-cards-v1';
  seasonalFoliage(mat, FOLIAGE_TINT);
  return mat;
}
// shadows of leaf cards are leaf-shaped too: the shadow pass cuts away the same see-through parts
const leafDepth = () => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafAtlas(), alphaTest: 0.45, side: THREE.DoubleSide });

// Every tree also has a condition (100% when healthy). Driving into one knocks it down a bit —
// sturdy oaks and big trees take more, slim birches less — and at 0% it falls over, away from
// whatever hit it. A fallen tree no longer blocks the way and grows back after a while.
const STURDY = { oak: 1.25, pine: 1, birch: 0.7, palm: 0.85, cherry: 0.8, maple: 0.7, willow: 1.1, cypress: 0.9, beech: 1.3 };
const COLOURED = { cherry: 1, maple: 1, beech: 1 };
const REGROW = 240;   // seconds until a fallen tree stands again

export function createForest(scene, { onAdd, onFall, onRegrow } = {}) {
  const lists = new Map(), meshes = [], all = [];   // key "kind:variant" -> [tree]
  const CELL = 8, grid = new Map(), cellKey = (x, z) => Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
  const moving = new Set();
  let dirty = false;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });   // trunks and branches
  const leaves = leafMaterial(), depth = leafDepth();
  function add(x, y, z, { kind = 'oak', scale = 1, variant, species, owner } = {}) {
    if (!BUILD[kind]) kind = 'oak';
    const v = variant ?? Math.floor(rnd() * 3), key = kind + ':' + v;
    if (!lists.has(key)) lists.set(key, []);
    const g = 0.85 + rnd() * 0.3, s = scale * (0.85 + rnd() * 0.3);
    const t = { x, y, z, s, r: rnd() * Math.PI * 2, tint: COLOURED[kind] ? new THREE.Color(g, g, g) : new THREE.Color(g, 0.9 + rnd() * 0.2, g),   // (blossom and red/copper leaves only vary in brightness, not towards green)
                kind, species: species || kind, owner: owner || 'WLD', hp: 100, tilt: 0, fallDir: 0, down: 0, meshes: [], i: -1 };
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
    for (const m of meshes) { m.removeFromParent(); m.dispose(); }   // (the shapes themselves are kept in `built` and reused)
    meshes.length = 0;
    for (const [key, list] of lists) {
      const [kind, v] = key.split(':'), geo = built(kind, +v);
      const wood = new THREE.InstancedMesh(geo.wood, material, list.length), leaf = new THREE.InstancedMesh(geo.leaf, leaves, list.length);
      leaf.customDepthMaterial = depth;
      list.forEach((t, i) => { t.meshes = [wood, leaf]; t.i = i; const m = matrixOf(t); wood.setMatrixAt(i, m); leaf.setMatrixAt(i, m); wood.setColorAt(i, t.tint); leaf.setColorAt(i, t.tint); });
      for (const im of [wood, leaf]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.userData.noCull = true; im.userData.isForest = true; scene.add(im); meshes.push(im); }
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
    WIND.value += dt;
    for (const t of moving) {
      if (t.falling) { t.tilt = Math.min(Math.PI / 2 - 0.08, t.tilt + dt * (0.6 + t.tilt * 3)); if (t.tilt >= Math.PI / 2 - 0.08) t.falling = false; }
      else if (t.hp <= 0) { t.down += dt; if (t.down > REGROW) { t.hp = 100; t.tilt = 0; onRegrow?.(t); moving.delete(t); } }
      else if (t.shake > 0) { t.shake -= dt; t.tilt = Math.max(0, Math.sin(t.shake * 40) * 0.05 * t.shake); t.fallDir = 0; if (t.shake <= 0) { t.tilt = 0; moving.delete(t); } }
      if (t.meshes.length) { const m = matrixOf(t); for (const im of t.meshes) { im.setMatrixAt(t.i, m); im.instanceMatrix.needsUpdate = true; } }
    }
  }
  return { add, flush, update, nearest, damage, trees: all, get count() { return all.length; } };
}
export function pickKind(x, z) {   // a natural mix: mostly broadleaf, some pines and birches
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  return h < 0.58 ? 'oak' : h < 0.8 ? 'pine' : 'birch';
}

// every shape is built once and shared (the forest rebuilds its instanced meshes when trees are added)
const shapes = new Map();
function built(kind, v) { const k = kind + ':' + v; if (!shapes.has(k)) shapes.set(k, BUILD[kind](v)); return shapes.get(k); }

// one tree on its own (Create Mode places trees one by one): the same models the forest uses
let oneMat = null, oneLeaf = null, oneDepth = null;
export function treeMesh(kind, variant = 0) {
  if (!BUILD[kind]) kind = 'oak';
  const geo = built(kind, variant);
  oneMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }); oneLeaf ||= leafMaterial(); oneDepth ||= leafDepth();
  const g = new THREE.Group(), wood = new THREE.Mesh(geo.wood, oneMat), leaf = new THREE.Mesh(geo.leaf, oneLeaf);
  leaf.customDepthMaterial = oneDepth;
  for (const m of [wood, leaf]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  return g;
}
