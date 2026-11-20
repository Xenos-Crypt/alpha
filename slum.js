// CINDER ROW: the slum on the edge of Poison Land, where everyone except the admin starts out.
// Everyone begins broke, so this is home: packed shacks of rusty corrugated iron, plywood and breeze block,
// dirt yards, rubbish, laundry lines, fire barrels and a tangle of stolen power lines. The lanes carry on
// from Poison Land's streets (so they join the road network) but they are unpaved-looking, potholed and
// muddy, and the council never fixes them: road crews skip them (road-wear.js `neglect`). Nobody here owns
// a car. Your own house is one of the run-down plots facing the middle lane.
// Everything gets an ID (world-ids.js) through botany.js's fixture/people helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeBotany } from './botany.js';

export const SLUM = { name: 'Cinder Row', minX: 596, maxX: 844, minZ: 448, maxZ: 598 };
// lanes: north-south ones carry on from Poison Land's streets (same centres), two run east-west
export const LANES_X = [600, 640, 680, 720, 760, 800, 840], LANES_Z = [500, 550], LANE_W = 6;
// your home: a run-down house facing the z 500 lane, with a dirt yard in front
export const SLUM_HOME = { x: 700, z: 515, minX: 694, maxX: 706, minZ: 510, maxZ: 520 };
export const SLUM_HOME_YARD = { minX: 689, maxX: 711, minZ: 503, maxZ: 526 };
const Z_TOP = 598, Z_BOTTOM = 447;

const inLane = (x, z) => (z >= Z_BOTTOM && z <= Z_TOP && LANES_X.some(c => Math.abs(x - c) <= LANE_W / 2)) ||
  (x >= SLUM.minX && x <= SLUM.maxX && LANES_Z.some(c => Math.abs(z - c) <= LANE_W / 2));
export function slumGroundAt(x, z) {
  if (x < SLUM.minX || x > SLUM.maxX || z < 450 || z > Z_TOP) return null;
  return inLane(x, z) ? 0 : 0.15;   // lanes at road level, the packed-dirt plots raised like a pavement
}

// a small seeded random, so the slum (and so every shack's ID) comes out the same every time
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function createSlum(ctx) {
  const { scene, makeTex, colliders, interactables, K } = ctx, curb = ctx.curb ?? 0.15;
  const R = rng(20261120), pick = a => a[Math.floor(R() * a.length)], between = (a, b) => a + R() * (b - a);
  const bot = makeBotany(ctx, SLUM.name);
  const tag = (cls, kind, mat, maker, name, x, z, owner = 'RES') => bot.fixture(cls, kind, mat, maker, name, x, z, owner);
  const solid = (x0, x1, z0, z1) => { const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }; colliders.push(c); return c; };

  // ---------------- textures ----------------
  const mudTex = makeTex(256, 256, g => {
    g.fillStyle = '#6e5a43'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${70 + R() * 50},${55 + R() * 40},${35 + R() * 30},0.5)`; g.fillRect(R() * 256, R() * 256, 2 + R() * 5, 2 + R() * 4); }
    for (let i = 0; i < 40; i++) { g.fillStyle = pick(['rgba(30,30,30,.5)', 'rgba(220,220,210,.6)', 'rgba(40,90,160,.5)', 'rgba(180,40,40,.5)']); g.fillRect(R() * 256, R() * 256, 2 + R() * 4, 1 + R() * 2); }   // litter
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(45,38,30,.45)'; g.beginPath(); g.ellipse(R() * 256, R() * 256, 10 + R() * 22, 6 + R() * 12, R() * 3, 0, 7); g.fill(); }   // damp patches
  });
  mudTex.wrapS = mudTex.wrapT = THREE.RepeatWrapping;
  // potholes, mud, puddles, cracks and rubbish laid over the lane (the lane itself stays dark, so it counts as road)
  const grimeTex = makeTex(256, 512, g => {
    g.clearRect(0, 0, 256, 512);
    for (let i = 0; i < 26; i++) { const cx = R() * 256, cy = R() * 512, n = 5 + Math.floor(R() * 8); for (let k = 0; k < n; k++) { g.fillStyle = `rgba(${95 + R() * 30},${78 + R() * 20},${55 + R() * 15},${0.25 + R() * 0.3})`; g.beginPath(); g.ellipse(cx + (R() - 0.5) * 40, cy + (R() - 0.5) * 40, 4 + R() * 14, 3 + R() * 9, R() * 3, 0, 7); g.fill(); } }   // mud washed over it, in clumps
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${80 + R() * 40},${70 + R() * 30},${50 + R() * 20},${0.3 + R() * 0.3})`; g.fillRect(R() * 256, R() * 512, 1 + R() * 2, 1 + R() * 2); }   // grit
    for (let i = 0; i < 9; i++) { const x = R() * 256, y = R() * 512, r = 5 + R() * 11; g.fillStyle = 'rgba(14,12,10,.85)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, R() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(70,85,95,.55)'; g.beginPath(); g.ellipse(x, y, r * 0.7, r * 0.45, 0, 0, 7); g.fill(); }   // potholes full of water
    g.strokeStyle = 'rgba(10,10,10,.8)'; g.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { let x = R() * 256, y = R() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 30; y += (R() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }   // cracks
    for (let i = 0; i < 70; i++) { g.fillStyle = pick(['rgba(230,230,220,.8)', 'rgba(30,30,30,.8)', 'rgba(40,110,190,.7)', 'rgba(200,60,40,.7)', 'rgba(90,160,60,.7)']); g.fillRect(R() * 256, R() * 512, 2 + R() * 5, 1 + R() * 3); }   // wrappers, bottles, bags
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(25,20,35,.35)'; g.beginPath(); g.ellipse(R() * 256, R() * 512, 12 + R() * 16, 6 + R() * 9, R() * 3, 0, 7); g.fill(); }   // oil stains
  });
  grimeTex.wrapS = grimeTex.wrapT = THREE.RepeatWrapping;
  const ironTex = makeTex(128, 128, g => {   // rusty corrugated iron
    for (let x = 0; x < 128; x++) { const v = 0.75 + 0.25 * Math.sin(x / 128 * Math.PI * 16); g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(150 * v)},${Math.round(150 * v)})`; g.fillRect(x, 0, 1, 128); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${130 + R() * 60},${55 + R() * 30},${20 + R() * 15},${0.35 + R() * 0.4})`; g.beginPath(); g.ellipse(R() * 128, R() * 128, 4 + R() * 16, 3 + R() * 22, 0, 0, 7); g.fill(); }
  });
  ironTex.wrapS = ironTex.wrapT = THREE.RepeatWrapping;
  const plyTex = makeTex(128, 128, g => { g.fillStyle = '#9c8058'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(80,58,35,${0.2 + R() * 0.3})`; g.beginPath(); const y = R() * 128; g.moveTo(0, y); g.bezierCurveTo(40, y + 6, 80, y - 6, 128, y + R() * 4); g.stroke(); } g.fillStyle = 'rgba(40,30,20,.6)'; g.fillRect(63, 0, 2, 128); g.fillStyle = 'rgba(30,40,30,.35)'; g.fillRect(0, 100, 128, 28); });
  const blockTex = makeTex(128, 128, g => { g.fillStyle = '#8f8d86'; g.fillRect(0, 0, 128, 128); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { g.fillStyle = `rgb(${150 + R() * 30},${148 + R() * 30},${140 + R() * 25})`; g.fillRect(c * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); } g.fillStyle = 'rgba(60,70,40,.4)'; g.fillRect(0, 96, 128, 32); });
  const paintTex = (base) => makeTex(128, 128, g => { g.fillStyle = base; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(165,155,140,.8)'; g.beginPath(); g.ellipse(R() * 128, R() * 128, 1.5 + R() * 5, 1 + R() * 3.5, R() * 3, 0, 7); g.fill(); } g.fillStyle = 'rgba(60,45,30,.35)'; g.fillRect(0, 100, 128, 28); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(70,55,40,.35)'; g.fillRect(R() * 128, 0, 3 + R() * 6, 50 + R() * 50); } });
  const tagTex = makeTex(256, 128, g => {   // spray-painted tags
    g.clearRect(0, 0, 256, 128);
    const words = ['C-ROW', 'NO WATER', 'KING ZEE', 'WE HERE', 'RENT IS THEFT', '4EVA', 'ASH BOYS', 'FIX THE ROAD'];
    for (let i = 0; i < 3; i++) { g.save(); g.translate(20 + R() * 120, 30 + i * 36); g.rotate((R() - 0.5) * 0.3); g.font = `bold ${22 + R() * 14}px Impact, sans-serif`; g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,10,.8)'; const w = pick(words); g.strokeText(w, 0, 0); g.fillStyle = pick(['#ff3fa4', '#3fd2ff', '#ffe23f', '#7dff5a', '#ff7a2f']); g.fillText(w, 0, 0); g.restore(); }
  });

  const mats = new Map();
  const mat = (key, make) => { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); };
  const std = (key, o) => mat(key, () => new THREE.MeshStandardMaterial({ roughness: 0.92, ...o }));
  const iron = std('iron', { map: ironTex, color: 0xb8aaa0, metalness: 0.3, roughness: 0.75 });
  const ironRoof = std('ironRoof', { map: ironTex, color: 0x9c8b7c, metalness: 0.35, roughness: 0.7, side: THREE.DoubleSide });
  const ply = std('ply', { map: plyTex });
  const breeze = std('breeze', { map: blockTex });
  const painted = ['#c97b84', '#6fa3b8', '#8fb07a', '#d7b56d', '#b48ac2', '#e08f5a'].map((c, i) => std('paint' + i, { map: paintTex(c) }));
  const wallMats = [iron, iron, ply, breeze, ...painted];
  const dark = std('dark', { color: 0x1b1714 }), plank = std('plank', { color: 0x5b4632 }), bars = std('bars', { color: 0x2d2b29, metalness: 0.5, roughness: 0.6 });
  const tarp = std('tarp', { color: 0x1d6fb5, roughness: 0.6, side: THREE.DoubleSide }), tarpG = std('tarpG', { color: 0x4a7a3a, roughness: 0.6, side: THREE.DoubleSide });
  const rubber = std('rubber', { color: 0x161616 }), bag = std('bag', { color: 0x141414, roughness: 0.35 }), tank = std('tank', { color: 0x202326, roughness: 0.6 });
  const pole = std('pole', { color: 0x4a3a2a }), wire = std('wire', { color: 0x0e0e0e }), concrete = std('concrete', { color: 0x8c877c });
  const fire = std('fire', { color: 0xff8a2a, emissive: 0xff6a10, emissiveIntensity: 1.6 }), bulb = std('bulb', { color: 0xfff1c4, emissive: 0xffe0a0, emissiveIntensity: 1.4 }), deadBulb = std('deadBulb', { color: 0x666052 });
  const tagMat = std('tags', { map: tagTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  const cloth = ['#d9483b', '#f2c94c', '#2d9cdb', '#ffffff', '#6fcf97', '#bb6bd9', '#f2994a'].map((c, i) => std('cloth' + i, { color: c, roughness: 0.95, side: THREE.DoubleSide }));

  // ---------------- merged static geometry (one draw call per material) ----------------
  const buckets = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1), planeGeo = new THREE.PlaneGeometry(1, 1), tyreGeo = new THREE.TorusGeometry(0.32, 0.12, 4, 8), tyreGeo2 = new THREE.TorusGeometry(0.34, 0.13, 4, 8);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const put = (geo, m, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { let l = buckets.get(m); if (!l) buckets.set(m, l = []); const g = geo.clone(); _q.setFromEuler(_e.set(rx, ry, rz)); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); g.applyMatrix4(_m); l.push(g); };
  const box = (w, h, d, x, y, z, m, rx, ry, rz) => put(boxGeo, m, x, y, z, w, h, d, rx, ry, rz);
  const cyl = (r, h, x, y, z, m, seg = 10, rx = 0, rz = 0) => put(new THREE.CylinderGeometry(r, r, 1, seg), m, x, y, z, 1, h, 1, rx, 0, rz);
  const plane = (w, h, x, y, z, m, ry = 0, rx = 0) => put(planeGeo, m, x, y, z, w, h, 1, rx, ry, 0);
  // a thin rod from a to b (wires, laundry lines)
  const rod = (a, b, r, m) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(); if (len < 0.01) return; let l = buckets.get(m); if (!l) buckets.set(m, l = []); const g = new THREE.CylinderGeometry(r, r, len, 4); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); l.push(g); };
  function flush() {
    for (const [m, list] of buckets) {
      const norm = list.map(g => g.index ? g.toNonIndexed() : g);
      for (const g of norm) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      const merged = mergeGeometries(norm, false); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m); mesh.receiveShadow = true; mesh.castShadow = !m.transparent && m !== tagMat; mesh.name = 'Cinder Row'; scene.add(mesh);
    }
    buckets.clear();
  }

  // ---------------- lanes (real road meshes, one per lane, so the city counts them as roads) ----------------
  const laneMat = new THREE.MeshStandardMaterial({ color: 0x27231f, roughness: 0.98 });
  const grimeMat = new THREE.MeshStandardMaterial({ map: grimeTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const lanes = [];
  const lane = (x0, x1, z0, z1, name) => {
    const w = x1 - x0, d = z1 - z0, m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), laneMat); m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); m.receiveShadow = true; m.name = 'slum lane'; scene.add(m);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grimeMat.clone()); gm.material.map = grimeTex.clone(); gm.material.map.needsUpdate = true; gm.material.map.repeat.set(w / 6, d / 12); gm.rotation.x = -Math.PI / 2; gm.position.set((x0 + x1) / 2, 0.045, (z0 + z1) / 2); gm.receiveShadow = true; scene.add(gm);
    lanes.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, name });
  };
  for (const x of LANES_X) lane(x - LANE_W / 2, x + LANE_W / 2, Z_BOTTOM, Z_TOP, `Cinder Row lane ${x}`);
  for (const z of LANES_Z) lane(SLUM.minX + 1, SLUM.maxX - 1, z - LANE_W / 2, z + LANE_W / 2, z === 500 ? 'Cinder Row (main lane)' : 'Cinder Row (back lane)');

  // ---------------- the plots: packed dirt, raised a kerb's height ----------------
  const xs = LANES_X.slice(0, -1).map((x, i) => [x + LANE_W / 2, LANES_X[i + 1] - LANE_W / 2]);
  const zs = [[450, LANES_Z[0] - LANE_W / 2], [LANES_Z[0] + LANE_W / 2, LANES_Z[1] - LANE_W / 2], [LANES_Z[1] + LANE_W / 2, Z_TOP]];
  const blocks = [];
  for (const [x0, x1] of xs) for (const [z0, z1] of zs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, curb, z1 - z0), std('mud' + x0 + z0, { map: (() => { const t = mudTex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 8, (z1 - z0) / 8); return t; })() }));
    m.position.set((x0 + x1) / 2, curb / 2, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    blocks.push({ x0, x1, z0, z1 });
    tag('LND', 'SRF', 'DRT', 'Nobody (never paved)', 'Packed-dirt plot', (x0 + x1) / 2, (z0 + z1) / 2, 'WLD');
  }

  // ---------------- shacks ----------------
  const home = SLUM_HOME_YARD, clearOf = [home, { minX: 712, maxX: 718, minZ: 503, maxZ: 512 }, { minX: 643, maxX: 652, minZ: 503, maxZ: 511 }, { minX: 763, maxX: 773, minZ: 539, maxZ: 547 }];   // your yard, the tap, the shop, the fire barrel corner
  const hits = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
  const shacks = [], roofSpots = [], wallSpots = [], doorSpots = [];
  function shack(cx, cz, w, d, face) {
    // face: which way the door looks: 0 = -z, 1 = +x, 2 = +z, 3 = -x
    const wm = pick(wallMats), h = between(2.4, 3.1), y0 = curb, two = R() < 0.22;
    box(w, h, d, cx, y0 + h / 2, cz, wm);
    let top = y0 + h;
    if (two) { const w2 = w * between(0.6, 0.85), d2 = d * between(0.6, 0.85), h2 = between(2.2, 2.6), ox = (R() - 0.5) * (w - w2), oz = (R() - 0.5) * (d - d2); box(w2, h2, d2, cx + ox, top + h2 / 2, cz + oz, pick(wallMats)); top += h2; roofSpots.push([cx + ox, top, cz + oz, w2, d2]);
      box(0.08, 0.08, 2.4, cx + ox + w2 / 2 + 0.6, y0 + h + 0.2, cz + oz, plank, 0.9, 0, 0); }   // a rough ladder up
    // a corrugated roof sheet, overhanging and tilted, sometimes patched with a tarp and weighed down with tyres
    const tilt = between(0.05, 0.12) * (R() < 0.5 ? 1 : -1);
    box(w + 0.5, 0.06, d + 0.5, cx, y0 + h + 0.12, cz, ironRoof, tilt, 0, 0);
    if (R() < 0.35) plane(w * 0.6, d * 0.6, cx + (R() - 0.5) * w * 0.3, y0 + h + 0.2, cz, R() < 0.6 ? tarp : tarpG, 0, -Math.PI / 2 + tilt);
    if (R() < 0.6) for (let i = 0; i < 2; i++) put(tyreGeo, rubber, cx + (R() - 0.5) * w * 0.7, y0 + h + 0.3, cz + (R() - 0.5) * d * 0.7, 1, 1, 1, Math.PI / 2, 0, 0);
    if (!two && R() < 0.3) { cyl(0.55, 1.1, cx + w * 0.25, y0 + h + 0.7, cz - d * 0.2, tank, 12); }   // a black water tank on the roof
    // door and a barred window on the side that faces the lane
    const fx = [0, 1, 0, -1][face], fz = [-1, 0, 1, 0][face], ry = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][face];
    const half = face % 2 ? w / 2 : d / 2, along = face % 2 ? d : w;
    const dx = cx + fx * (half + 0.03), dz = cz + fz * (half + 0.03);
    const sideX = fz !== 0 ? 1 : 0, sideZ = fx !== 0 ? 1 : 0, doorOff = (R() - 0.5) * (along - 2.2);
    box(fz ? 0.95 : 0.06, 2.0, fz ? 0.06 : 0.95, dx + sideX * doorOff, y0 + 1.0, dz + sideZ * doorOff, R() < 0.5 ? plank : dark);
    const winOff = doorOff > 0 ? doorOff - 1.6 : doorOff + 1.6;
    if (along > 3.2) { box(fz ? 0.9 : 0.05, 0.7, fz ? 0.05 : 0.9, dx + sideX * winOff, y0 + 1.6, dz + sideZ * winOff, dark); for (let k = -1; k <= 1; k++) box(fz ? 0.03 : 0.07, 0.72, fz ? 0.07 : 0.03, dx + sideX * (winOff + k * 0.25) + fx * 0.02, y0 + 1.6, dz + sideZ * (winOff + k * 0.25) + fz * 0.02, bars); }
    wallSpots.push([dx, dz, ry, along]); doorSpots.push([dx + sideX * doorOff + fx * 0.6, dz + sideZ * doorOff + fz * 0.6]);
    solid(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
    shacks.push({ x: cx, z: cz, w, d, top });
    tag('BLD', 'SHK', wm === iron ? 'MET.WOD' : wm === ply ? 'WOD' : 'CON.WOD', 'Built by hand (no permit)', `Shack, ${two ? 'two storeys' : 'one room'}`, cx, cz);
  }
  for (const b of blocks) {
    // packed solid: back-to-back rows of shacks with narrow alleys between the pairs (and the odd cross alley),
    // so every shack has a door onto a lane or an alley
    let z = b.z0 + 0.3, row = 0;
    while (z < b.z1 - 3.4) {
      const facing = row % 2 === 0 ? 0 : 2, d = between(3.4, 5.0);
      if (z + d > b.z1 - 0.3) break;
      let x = b.x0 + 0.3;
      while (x < b.x1 - 3) {
        const w = between(3.2, 5.6); if (x + w > b.x1 - 0.3) break;
        const cx = x + w / 2, cz = z + d / 2;
        const fp = { minX: cx - w / 2 - 0.4, maxX: cx + w / 2 + 0.4, minZ: cz - d / 2 - 0.4, maxZ: cz + d / 2 + 0.4 };
        if (!clearOf.some(c => hits(fp, c))) shack(cx, cz, w, d, facing);
        x += w + (R() < 0.18 ? between(1.3, 1.8) : between(0.08, 0.35));   // a gap now and then: a cross alley
      }
      z += d + (facing === 0 ? between(0.1, 0.3) : between(1.6, 2.3));   // back-to-back, then an alley
      row++;
    }
  }
  // graffiti on lane-facing walls
  for (const [x, z, ry, along] of wallSpots) if (R() < 0.35) { const fx = Math.sin(ry), fz = Math.cos(ry); plane(Math.min(along - 0.4, 3.2), 1.2, x + fx * 0.05, curb + 1.3 + R() * 0.4, z + fz * 0.05, tagMat, ry); }

  // ---------------- your yard: a rickety fence of odd planks and a dirt path ----------------
  { const y = curb, { minX, maxX, minZ, maxZ } = SLUM_HOME_YARD;
    const fence = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.32); for (let i = 0; i <= n; i++) { if (R() < 0.18) continue; const t = i / n, hh = between(0.8, 1.3); box(0.18, hh, 0.04, x0 + (x1 - x0) * t, y + hh / 2, z0 + (z1 - z0) * t, R() < 0.5 ? plank : ply, 0, x0 === x1 ? Math.PI / 2 : 0, (R() - 0.5) * 0.25); } box(Math.abs(x1 - x0) || 0.05, 0.06, Math.abs(z1 - z0) || 0.05, (x0 + x1) / 2, y + 0.7, (z0 + z1) / 2, plank); };
    fence(minX, minZ, SLUM_HOME.x - 1.4, minZ); fence(SLUM_HOME.x + 1.4, minZ, maxX, minZ);   // front, with a gap for the path
    fence(minX, minZ, minX, maxZ); fence(maxX, minZ, maxX, maxZ); fence(minX, maxZ, maxX, maxZ);
    tag('LND', 'FEN', 'WOD', 'Scrap wood', 'Rickety fence round your yard', SLUM_HOME.x, minZ, 'PLR');
  }

  // ---------------- street life: power lines, lamps, laundry, rubbish, fire barrels ----------------
  // wooden poles along the lanes, leaning, with a tangle of wires (half of them stolen connections)
  const poles = [];
  for (const x of [640, 720, 800]) for (let z = 458; z < Z_TOP; z += 22) { const px = x + LANE_W / 2 + 0.6, lean = (R() - 0.5) * 0.12; cyl(0.12, 7, px, curb + 3.5, z, pole, 6, 0, lean); poles.push(new THREE.Vector3(px + Math.sin(lean) * -3.5, curb + 6.8, z)); }
  for (let i = 1; i < poles.length; i++) { const a = poles[i - 1], b = poles[i]; if (Math.abs(a.x - b.x) > 1) continue; for (let k = 0; k < 3; k++) rod(a.clone().setY(a.y - k * 0.25), b.clone().setY(b.y - k * 0.25 - 0.5), 0.015, wire); }
  // stolen connections: wires from the poles down to nearby roofs
  for (const s of shacks) if (R() < 0.4) { let best = null, bd = 30; for (const p of poles) { const dd = Math.hypot(p.x - s.x, p.z - s.z); if (dd < bd) { bd = dd; best = p; } } if (best) rod(best, new THREE.Vector3(s.x, s.top + 0.1, s.z), 0.012, wire); }
  // a few lamps: bare bulbs on the poles, most of them dead
  const lights = [];
  poles.forEach((p, i) => { const on = i % 4 === 1; box(0.6, 0.05, 0.05, p.x - 0.3, p.y - 0.6, p.z, pole); put(new THREE.SphereGeometry(0.12, 8, 6), on ? bulb : deadBulb, p.x - 0.6, p.y - 0.75, p.z, 1, 1, 1); if (on && lights.length < 3) lights.push([p.x - 0.6, p.y - 0.9, p.z]); });
  for (const [x, y, z] of lights) { const l = new THREE.PointLight(0xffd59a, 3, 22, 2); l.position.set(x, y, z); scene.add(l); }
  tag('PRD', 'LMP', 'WOD.CPR', 'Strung up by residents', 'Leaning power poles and stolen wires', 720, 520);
  // laundry lines between shacks, heavy with washing
  for (let i = 0; i + 1 < shacks.length; i++) { const a = shacks[i], b = shacks[i + 1]; const dd = Math.hypot(a.x - b.x, a.z - b.z); if (dd < 4 || dd > 9 || R() < 0.45) continue;
    const A = new THREE.Vector3(a.x, curb + 2.2, a.z), Bv = new THREE.Vector3(b.x, curb + 2.2, b.z); rod(A, Bv, 0.01, wire);
    const n = Math.floor(dd / 0.7); for (let k = 1; k < n; k++) { if (R() < 0.3) continue; const t = k / n, ww = between(0.35, 0.7), hh = between(0.4, 0.9); plane(ww, hh, A.x + (Bv.x - A.x) * t, A.y - hh / 2 - 0.04, A.z + (Bv.z - A.z) * t, pick(cloth), Math.atan2(Bv.x - A.x, Bv.z - A.z) + Math.PI / 2); } }
  // rubbish heaps on the corners, tyres, crates, an old fridge
  const dump = (x, z, n) => { for (let i = 0; i < n; i++) { const r = between(0.25, 0.5); put(new THREE.SphereGeometry(1, 8, 6), bag, x + (R() - 0.5) * 2.2, curb + r * 0.6, z + (R() - 0.5) * 2.2, r, r * 0.75, r); }
    for (let i = 0; i < 3; i++) box(between(0.3, 0.7), between(0.2, 0.5), between(0.3, 0.6), x + (R() - 0.5) * 2.4, curb + 0.2, z + (R() - 0.5) * 2.4, pick([ply, plank, concrete]), 0, R() * 3, 0); tag('PRD', 'TRS', 'PLS', 'Everyone (no bin collection)', 'Rubbish heap', x, z); };
  for (const b of blocks) { if (R() < 0.8) dump(b.x0 + 1.4, b.z0 + 1.4 + R() * 2, 4 + Math.floor(R() * 5)); if (R() < 0.5) dump(b.x1 - 1.4, b.z1 - 1.6, 3 + Math.floor(R() * 4)); }
  for (let i = 0; i < 18; i++) { const b = pick(blocks), x = between(b.x0 + 1, b.x1 - 1), z = R() < 0.5 ? b.z0 + 0.4 : b.z1 - 0.4; if (clearOf.some(c => hits({ minX: x - 1, maxX: x + 1, minZ: z - 1, maxZ: z + 1 }, c))) continue; for (let k = 0; k < 3; k++) put(tyreGeo2, rubber, x, curb + 0.13 + k * 0.26, z, 1, 1, 1, Math.PI / 2, 0, 0); }
  box(0.7, 1.6, 0.7, 662, curb + 0.8, 547 - 0.5, concrete, 0, 0, 0.3);   // a dumped fridge on its side
  // fire barrels: people stand round them at night
  const barrels = [[768, 543], [633, 452], [807, 596 - 1.2], [690, 553.6]];
  const flames = [];
  for (const [x, z] of barrels) { cyl(0.32, 0.9, x, curb + 0.45, z, rubber, 12); const f = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 7), fire); f.position.set(x, curb + 1.1, z); scene.add(f); flames.push(f); colliders.push({ circleX: x, circleZ: z, circleRadius: 0.4, minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 }); tag('PRD', 'DEC', 'STL', 'An old oil drum', 'Fire barrel', x, z); }
  const glow = new THREE.PointLight(0xff8a3a, 2.4, 14, 2); glow.position.set(768, curb + 1.6, 543); scene.add(glow);

  // ---------------- the communal tap (the only water for the whole street) ----------------
  { const x = 715, z = 506; box(0.5, 0.12, 0.5, x, curb + 0.06, z, concrete); cyl(0.05, 1.0, x, curb + 0.55, z, bars, 6); box(0.25, 0.05, 0.05, x + 0.12, curb + 0.98, z, bars);
    for (let i = 0; i < 4; i++) cyl(0.2, 0.35, x + 0.6 + i * 0.55, curb + 0.18, z + 0.4, std('bucket' + (i % 3), { color: [0x2d7dd2, 0xe4572e, 0xf3a712][i % 3] }), 10);
    interactables.push({ pos: new THREE.Vector3(x, 0, z), r: 1.8, label: 'Drink from the communal tap', action: () => ctx.drink?.() });
    tag('PRD', 'TAP', 'STL', 'Westhaven Water and Power', 'Communal standpipe', x, z, 'GOV'); }

  // ---------------- Mama Ade's corner shop: cheap food through a hatch ----------------
  { const x = 647.5, z = 507; box(5, 2.8, 4, x, curb + 1.4, z, painted[3]); box(5.6, 0.06, 4.6, x, curb + 2.95, z, ironRoof, -0.08, 0, 0); box(2.2, 0.9, 0.06, x, curb + 1.5, z - 2.03, dark); box(2.4, 0.08, 0.6, x, curb + 1.0, z - 2.3, plank);
    solid(x - 2.5, x + 2.5, z - 2, z + 2);
    if (K?.sign && K?.place) K.place(K.sign("MAMA ADE'S", 'food · airtime · water', 3.6, '#f3d250', '#1d1d1d', 'Impact, sans-serif'), x, curb + 2.5, z - 2.06, Math.PI);
    interactables.push({ pos: new THREE.Vector3(x, 0, z - 3), r: 2, label: "Mama Ade's corner shop", action: () => ctx.openShop?.("Mama Ade's", [
      { name: 'Bread roll', icon: '🥖', price: 1, hunger: 12 }, { name: 'Sachet of water', icon: '💧', price: 1, energy: 6 }, { name: 'Bowl of rice and beans', icon: '🍛', price: 3, hunger: 35 },
      { name: 'Fried plantain', icon: '🍌', price: 2, hunger: 18 }, { name: 'Strong tea', icon: '☕', price: 1, energy: 12 }]) });
    tag('BLD', 'KSK', 'CON.MET', 'Built by hand (no permit)', "Mama Ade's corner shop", x, z, 'RES'); }

  // ---------------- the sign at the way in from Poison Land ----------------
  { const x = 723.8, z = 452; for (const dx of [-1.3, 1.3]) cyl(0.07, 2.6, x + dx, curb + 1.3, z, pole, 6);
    if (K?.sign && K?.place) K.place(K.sign('CINDER ROW', 'no help comes here', 3, '#3b2f25', '#f1e6c8', 'Impact, sans-serif'), x, curb + 2.3, z, Math.PI);
    tag('PRD', 'SGN', 'WOD', 'Painted by residents', 'Hand-painted Cinder Row sign', x, z); }

  flush();

  // ---------------- people: no cars, just people getting by ----------------
  if (K) {
    const y = curb + 0.05;
    for (const [x, z] of barrels) for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + R(); K.stander(x + Math.cos(a) * 1.1, z + Math.sin(a) * 1.1, Math.atan2(-Math.cos(a), -Math.sin(a)), { task: 'talk', y }); }
    for (let i = 0; i < 3; i++) K.stander(715 + 0.6 + i * 0.7, 506 + 1.2, Math.PI, { y });   // queueing at the tap
    K.stander(647.5, 503.4, 0, { y, task: 'talk' });   // Mama Ade at her hatch
    // kids playing football in the main lane, people walking the lanes
    for (let i = 0; i < 4; i++) K.walker([[735 + i * 2, 498], [752, 501.5 - i * 0.5], [742 - i, 498.5]], { child: true, speed: 1.6 + R() * 0.4, t: R() * 20 });
    for (const x of [640, 720, 800]) { K.walker([[x - 1.5, 452], [x - 1.5, 594], [x + 1.5, 594], [x + 1.5, 452]], { speed: 0.9 + R() * 0.3, t: R() * 200 }); }
    for (const z of LANES_Z) K.walker([[602, z - 1.2], [838, z - 1.2], [838, z + 1.2], [602, z + 1.2]], { speed: 0.8 + R() * 0.3, t: R() * 400 });
    // people sat out front on crates and buckets
    for (const [x, z] of doorSpots) if (R() < 0.12) K.sitter(x, z, Math.atan2(x - 720, z - 520), curb + 0.45, { task: R() < 0.5 ? 'talk' : 'phone' });
    bot.people(K);
  }

  const neglected = [];   // road cells left broken for good: the council never comes
  for (const l of lanes) { const long = l.maxZ - l.minZ > l.maxX - l.minX; for (let t = 3; t < (long ? l.maxZ - l.minZ : l.maxX - l.minX); t += 6) neglected.push([long ? (l.minX + l.maxX) / 2 + (R() - 0.5) * 2 : l.minX + t, long ? l.minZ + t : (l.minZ + l.maxZ) / 2 + (R() - 0.5) * 2, Math.round(between(8, 60))]); }

  let ft = 0;
  return {
    bounds: SLUM, home: SLUM_HOME, lanes, neglected, shacks,
    groundAt: slumGroundAt,
    destinations: [{ name: 'Cinder Row (slum)', x: 720, z: 520 }, { name: "Mama Ade's corner shop (Cinder Row)", x: 647.5, z: 503 }],
    update(dt, p) {
      if (!p || Math.abs(p.x - 720) > 260 || Math.abs(p.z - 520) > 220) return;
      ft += dt; flames.forEach((f, i) => { const s = 0.85 + 0.25 * Math.sin(ft * 9 + i * 2.1) + 0.1 * Math.sin(ft * 23 + i); f.scale.set(s, s * 1.2, s); });
      glow.intensity = 2.1 + 0.6 * Math.sin(ft * 11) * Math.sin(ft * 7.3);
      K?.update?.(dt, p);
    },
  };
}
