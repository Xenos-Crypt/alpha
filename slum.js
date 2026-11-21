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
// Your home: a rented flat on the TOP floor of a run-down three-storey tenement facing the z 500 lane.
// Other tenants live on the two floors below; the landlord has the ground floor. You get up by a rickety
// outside staircase on the east side (two flights with a landing at the back) onto a narrow balcony.
export const FLOOR_H = 3.1, LEVELS = [0.15, 0.15 + FLOOR_H, 0.15 + 2 * FLOOR_H];   // ground, first, top
export const SLUM_HOME_Y = LEVELS[2];
export const SLUM_HOME = { x: 700, z: 511, minX: 695, maxX: 705, minZ: 507, maxZ: 515 };
const STAIR = { a0: 705.3, a1: 706.5, b1: 707.7, z0: 507, z1: 515, land1: 516.4, bal0: 505.6, balX0: 694.8 };
// Tenements: yours (no offset) and three more like it in other blocks, each facing its lane the same way. Offsets
// (dx, dz) chosen so each yard sits inside its block, clear of the shop, the tap and the fire-barrel corners.
export const TENEMENTS = [[0, 0], [-80, 0], [80, 0], [40, 50]];
export const SLUM_HOME_YARD = { minX: 693.5, maxX: 708.6, minZ: 503, maxZ: 517.2 };
const Z_TOP = 598, Z_BOTTOM = 447;

const inLane = (x, z) => (z >= Z_BOTTOM && z <= Z_TOP && LANES_X.some(c => Math.abs(x - c) <= LANE_W / 2)) ||
  (x >= SLUM.minX && x <= SLUM.maxX && LANES_Z.some(c => Math.abs(z - c) <= LANE_W / 2));
// the tenement's floors, stairs, landing and balcony: you're on one if your body is near its height, under it otherwise
function tenementAt(x, z, by) { for (const [dx, dz] of TENEMENTS) { const r = tenementOne(x - dx, z - dz, by); if (r != null) return r; } return null; }
function tenementOne(x, z, by) {
  const [G, M, T] = LEVELS, S = STAIR, on = h => by == null ? h < 0.5 : by > h - 0.7;   // (from underneath you can't pop up onto it)
  if (x >= S.a0 && x <= S.a1 && z >= S.z0 && z <= S.z1) { const h = G + (z - S.z0) / (S.z1 - S.z0) * (M - G); return on(h) ? h : G; }   // first flight: up towards the back
  if (x > S.a1 && x <= S.b1 && z >= S.z0 && z <= S.z1) { const h = M + (S.z1 - z) / (S.z1 - S.z0) * (T - M); return by != null && by > h - 1.1 ? h : G; }   // second flight: up towards the front
  if (x >= S.balX0 && x <= S.b1 && z > S.z1 && z <= S.land1) return by != null && by > M - 1.1 ? M : G;   // the second-floor gallery along the back (the stairs' landing)
  if (x >= S.balX0 && x <= S.b1 && z >= S.bal0 && z < S.z0) return by != null && by > T - 1.1 ? T : G;   // the balcony along the top floor
  const H = SLUM_HOME; if (x >= H.minX && x <= H.maxX && z >= H.minZ && z <= H.maxZ) return by != null && by > T - 1.1 ? T : G;   // your flat (the floors below are other people's)
  return null;
}
export function slumGroundAt(x, z, bodyY = null) {
  if (x < SLUM.minX || x > SLUM.maxX || z < 450 || z > Z_TOP) return null;
  const t = tenementAt(x, z, bodyY); if (t != null) return t;
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
  const home = SLUM_HOME_YARD, clearOf = [...TENEMENTS.map(([dx, dz]) => ({ minX: home.minX + dx, maxX: home.maxX + dx, minZ: home.minZ + dz, maxZ: home.maxZ + dz })), { minX: 712, maxX: 718, minZ: 503, maxZ: 512 }, { minX: 643, maxX: 652, minZ: 503, maxZ: 511 }, { minX: 763, maxX: 773, minZ: 539, maxZ: 547 }];   // your yard, the tap, the shop, the fire barrel corner
  const hits = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
  const shacks = [], roofSpots = [], wallSpots = [], doorSpots = [];
  // ---- a shack's downstairs room: four thin walls with a doorway, run-down things inside ----
  // Most have no door at all (a rag hung over the doorway, or nothing); some have a real hinged door (E) and glass in the
  // window. Inside: a stained mattress on the dirt, a broken plastic chair, a crate for a table, buckets, a cooker...
  const shackDoors = [], glassM = std('shackGlass', { color: 0x9fb8c4, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2 });
  const rag = std('rag', { color: 0x7a6a55, roughness: 1, side: THREE.DoubleSide }), foam = std('foam', { color: 0xb9ab8c }), stainedSheet = std('sheet', { color: 0x8f8a7c });
  const plastic = std('plastic', { color: 0xd8d4c8, roughness: 0.6 }), crate = std('crate', { color: 0x8a6d47 }), lampGlow = std('lamp', { color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.2 });
  function room(cx, cz, w, d, h, face, doorOff, winOff, hasDoor, wm) {
    const t = 0.08, y0 = curb, fx = [0, 1, 0, -1][face], fz = [-1, 0, 1, 0][face];
    // local frame: u along the front wall, v from the front wall inwards
    const alongX = fz !== 0, hu = alongX ? w / 2 : d / 2, hv = alongX ? d / 2 : w / 2;
    const Wp = (u, v) => alongX ? [cx + u, cz + fz * (hv - v)] : [cx + fx * (hv - v), cz + u];
    const piece = (u0, u1, v0, v1, ya, yb, m) => { const [ax, az] = Wp(u0, v0), [bx, bz] = Wp(u1, v1); box(Math.max(0.02, Math.abs(bx - ax)), yb - ya, Math.max(0.02, Math.abs(bz - az)), (ax + bx) / 2, y0 + (ya + yb) / 2, (az + bz) / 2, m); };
    const wallC = (u0, u1, v0, v1) => { const [ax, az] = Wp(u0, v0), [bx, bz] = Wp(u1, v1); return solid(ax, bx, az, bz); };
    const dw = 0.95, DH = 2.0;
    // front wall: around the doorway (and the window, which is a real opening with bars, glazed if it's a door shack)
    const holes = [{ c: doorOff, w: dw, y0: 0, y1: DH }]; if (winOff != null) holes.push({ c: winOff, w: 0.9, y0: 1.25, y1: 1.95 });
    holes.sort((a, b) => a.c - b.c); let u = -hu;
    for (const o of holes) { const a = o.c - o.w / 2, b = o.c + o.w / 2; if (a > u) piece(u, a, 0, t, 0, h, wm); if (o.y0 > 0) piece(a, b, 0, t, 0, o.y0, wm); piece(a, b, 0, t, o.y1, h, wm); u = b; }
    if (u < hu) piece(u, hu, 0, t, 0, h, wm);
    wallC(-hu, doorOff - dw / 2, 0, t); wallC(doorOff + dw / 2, hu, 0, t);
    piece(-hu, hu, 2 * hv - t, 2 * hv, 0, h, wm); wallC(-hu, hu, 2 * hv - t, 2 * hv);
    piece(-hu, -hu + t, t, 2 * hv - t, 0, h, wm); wallC(-hu, -hu + t, 0, 2 * hv); piece(hu - t, hu, t, 2 * hv - t, 0, h, wm); wallC(hu - t, hu, 0, 2 * hv);
    if (winOff != null && hasDoor) piece(winOff - 0.45, winOff + 0.45, t / 2 - 0.01, t / 2 + 0.01, 1.25, 1.95, glassM);
    // the doorway: a real door, a rag curtain, or just a hole
    if (hasDoor) {
      const [hx, hz] = Wp(doorOff - dw / 2, t / 2), g = new THREE.Group(), base = alongX ? 0 : -Math.PI / 2; g.position.set(hx, y0, hz); g.rotation.y = base; scene.add(g);   // hinge on one side; the leaf runs along the wall
      const leaf = new THREE.Mesh(boxGeo, R() < 0.5 ? plank : dark); leaf.scale.set(dw - 0.04, DH - 0.03, 0.05); leaf.position.set((dw - 0.04) / 2, DH / 2, 0); leaf.name = 'shack door'; g.add(leaf); leaf.castShadow = true;
      const col = wallC(doorOff - dw / 2, doorOff + dw / 2, -0.03, t);
      const D = { g, col, base, target: 0, swing: -1.4 * (alongX ? -fz : fx) };   // it swings inwards, into the room: the alleys outside are too narrow (outwards it went into the shack across the way)
      const [px, pz] = Wp(doorOff, 0); shackDoors.push(D);
      interactables.push({ pos: new THREE.Vector3(px, 0, pz), r: 1.6, door: true, col, get label() { return D.target ? 'Close the door' : 'Open the door'; }, action() { D.target = D.target ? 0 : 1; const i = colliders.indexOf(col); if (D.target && i >= 0) colliders.splice(i, 1); else if (!D.target && i < 0) colliders.push(col); } });
    } else if (R() < 0.5) { const [px, pz] = Wp(doorOff, t / 2); plane(dw - 0.1, 0.7, px, y0 + DH - 0.35, pz, rag, alongX ? 0 : Math.PI / 2); }
    // inside (v from t to 2hv - t), keeping the doorway's path clear
    const U0 = -hu + t + 0.05, U1 = hu - t - 0.05, V1 = 2 * hv - t - 0.05, P = (u, v, sw, sh, sd, y, m, ry = 0, rx = 0, rz = 0) => { const [x, z] = Wp(u, v); box(alongX ? sw : sd, sh, alongX ? sd : sw, x, y0 + y, z, m, rx, ry, rz); };
    const side = doorOff > 0 ? -1 : 1, farU = side > 0 ? U1 : U0;   // the far side from the door
    // a stained mattress on the floor along the back wall, a heap of blankets
    P(farU - side * 0.5, V1 - 1.0, 0.95, 0.16, 1.9, 0.08, foam); P(farU - side * 0.5, V1 - 1.4, 0.9, 0.06, 0.9, 0.19, stainedSheet, 0.2);
    if (R() < 0.6) P(farU - side * 0.4, V1 - 0.35, 0.6, 0.18, 0.4, 0.25, pick(cloth));
    // a broken plastic chair (leaning, one leg gone) and a crate for a table, with a lamp or a candle on it
    const cu = (U0 + U1) / 2 + side * 0.2, cv = Math.min(V1 - 0.6, 1.6);
    P(cu + side * 0.8, cv, 0.5, 0.4, 0.5, 0.2, crate); P(cu + side * 0.8, cv, 0.12, 0.12, 0.12, 0.46, R() < 0.5 ? lampGlow : plastic);
    const tilt = 0.25 + R() * 0.2; P(cu, cv, 0.42, 0.04, 0.42, 0.38, plastic, 0.3, 0, tilt); P(cu, cv + 0.2, 0.42, 0.4, 0.04, 0.6, plastic, 0.3, -0.15, tilt);
    for (const [a, b] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17]]) P(cu + a, cv + b, 0.04, 0.38, 0.04, 0.19, plastic, 0, 0, tilt * 0.5);
    { const [x, z] = Wp(cu + side * 0.8, cv); solid(x - 0.3, x + 0.3, z - 0.3, z + 0.3).baseYAt = () => y0; }
    // buckets and a jerrycan by the door side, a camping stove, a cardboard sheet on the dirt
    P(-farU * 0.7 + side * 0.0, V1 - 0.3, 0.3, 0.35, 0.3, 0.18, std('bucket' + (Math.abs(Math.round(cx)) % 3), { color: [0x2d7dd2, 0xe4572e, 0xf3a712][Math.abs(Math.round(cx)) % 3] }));
    if (R() < 0.6) P(-farU * 0.7 - side * 0.4, V1 - 0.3, 0.25, 0.4, 0.15, 0.2, std('jerry', { color: 0xc9a227 }));
    if (R() < 0.5) { P(farU - side * 0.35, 0.8, 0.5, 0.12, 0.35, 0.06, concrete); P(farU - side * 0.35, 0.8, 0.12, 0.08, 0.12, 0.16, dark); }
    if (R() < 0.4) P((U0 + U1) / 2, V1 / 2, 1.2, 0.01, 0.9, 0.005, ply);
    if (R() < 0.35) { P(farU - side * 0.4, V1 - 2.3, 0.6, 0.45, 0.45, 0.22, crate); P(farU - side * 0.4, V1 - 2.3, 0.5, 0.35, 0.3, 0.62, dark); }   // an old TV on a crate
    if (R() < 0.5) { const [x, z] = Wp(0, V1 / 2); cyl(0.005, 0.5, x, y0 + h - 0.25, z, wire, 4); put(new THREE.SphereGeometry(0.06, 6, 4), R() < 0.4 ? bulb : deadBulb, x, y0 + h - 0.52, z, 1, 1, 1); }
  }
  function shack(cx, cz, w, d, face) {
    // face: which way the door looks: 0 = -z, 1 = +x, 2 = +z, 3 = -x
    const wm = pick(wallMats), h = between(2.4, 3.1), y0 = curb, two = R() < 0.22;
    // the downstairs room is real: thin walls you can walk inside (built further down, once the door side is known)
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
    const winOff = doorOff > 0 ? doorOff - 1.6 : doorOff + 1.6, hasDoor = R() < 0.3, hasWin = along > 3.2;
    room(cx, cz, w, d, h, face, doorOff, hasWin ? winOff : null, hasDoor, wm);
    if (hasWin && !hasDoor) { box(fz ? 0.9 : 0.05, 0.7, fz ? 0.05 : 0.9, dx + sideX * winOff, y0 + 1.6, dz + sideZ * winOff, dark); for (let k = -1; k <= 1; k++) box(fz ? 0.03 : 0.07, 0.72, fz ? 0.07 : 0.03, dx + sideX * (winOff + k * 0.25) + fx * 0.02, y0 + 1.6, dz + sideZ * (winOff + k * 0.25) + fz * 0.02, bars); }
    wallSpots.push([dx, dz, ry, along]); doorSpots.push([dx + sideX * doorOff + fx * 0.6, dz + sideZ * doorOff + fz * 0.6]);
    if (two) solid(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2).baseYAt = () => y0 + h;   // the upstairs room isn't reachable
    shacks.push({ x: cx, z: cz, w, d, top, door: hasDoor, doorAt: [dx + sideX * doorOff, dz + sideZ * doorOff], out: [fx, fz] });
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

  // ---------------- the tenement: two floors of other people's flats under yours, an outside stair, a balcony ----------------
  const tenants = [];
  // ---- real flat doors and windows (not painted-on rectangles) ----
  // A door: a wooden frame proud of the wall, a panelled leaf on a hinge (so it can open), a handle and a concrete
  // step. A window: frame, glass, a cross bar, a sill, a curtain drawn half across behind the glass and a dark room
  // behind that; slum ground floors keep their security bars. Every door is recorded (flatDoors) with where it is
  // and which way it faces, for the owners and their locks.
  const flatDoors = [], flatWindows = [];
  const frameM = std('doorFrame', { color: 0x3b2f25 }), handleM = std('handle', { color: 0xb8a060, metalness: 0.6, roughness: 0.4 }), roomDark = std('roomDark', { color: 0x15130f, roughness: 1 });
  const leafMs = ['#6b4a2f', '#2f4a6b', '#7a2e2a', '#3d5a3a', '#5a5550'].map((c, i) => std('flatDoor' + i, { map: paintTex(c) }));
  const gbox = (parent, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(boxGeo, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
  function realDoor(x, y, z, nx, nz, who, W = 1.0) {
    const H = 2.05, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(nx, nz); scene.add(g);   // local +z = out of the wall
    gbox(g, 0.08, H + 0.08, 0.16, -W / 2 - 0.04, (H + 0.08) / 2, 0.03, frameM); gbox(g, 0.08, H + 0.08, 0.16, W / 2 + 0.04, (H + 0.08) / 2, 0.03, frameM); gbox(g, W + 0.16, 0.08, 0.16, 0, H + 0.04, 0.03, frameM);
    gbox(g, W + 0.3, 0.07, 0.4, 0, 0.035, 0.22, concrete);   // the step
    const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, 0.02); g.add(hinge);
    const lm = pick(leafMs), leaf = gbox(hinge, W - 0.02, H - 0.02, 0.05, W / 2, H / 2, 0, lm); leaf.name = 'flat door';
    for (const py of [0.55, 1.45]) gbox(hinge, W - 0.3, 0.6, 0.015, W / 2, py, 0.032, lm);   // raised panels
    gbox(hinge, 0.04, 0.04, 0.07, W - 0.12, 1.02, 0.05, handleM); gbox(hinge, 0.14, 0.03, 0.03, W - 0.17, 1.02, 0.08, handleM);
    gbox(hinge, 0.06, 0.06, 0.01, W - 0.12, 1.2, 0.03, dark);   // keyhole plate
    const D = { g, hinge, x, y, z, nx, nz, who, W, open: 0 }; flatDoors.push(D); return D;
  }
  function realWindow(x, y, z, nx, nz, w = 1.2, h = 0.9, bars = false) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(nx, nz); scene.add(g);
    gbox(g, w, h, 0.02, 0, 0, -0.005, roomDark);   // the room behind
    const curtain = gbox(g, w * 0.48, h * 0.92, 0.01, (R() < 0.5 ? -1 : 1) * w * 0.25, 0, 0.012, pick(cloth));
    const glass = gbox(g, w, h, 0.01, 0, 0, 0.03, glassM);
    for (const [ww, hh, px, py] of [[w + 0.1, 0.06, 0, h / 2 + 0.03], [w + 0.1, 0.06, 0, -h / 2 - 0.03], [0.06, h, -w / 2 - 0.02, 0], [0.06, h, w / 2 + 0.02, 0], [0.04, h, 0, 0], [w, 0.04, 0, 0]]) gbox(g, ww, hh, 0.07, px, py, 0.04, frameM);
    gbox(g, w + 0.2, 0.05, 0.16, 0, -h / 2 - 0.08, 0.08, concrete);   // sill
    if (bars) for (let k = -2; k <= 2; k++) gbox(g, 0.03, h + 0.04, 0.03, k * w / 5.2, 0, 0.1, std('bars2', { color: 0x4a4038, metalness: 0.5, roughness: 0.6 }));
    const W2 = { g, curtain, glass, x, y, z }; flatWindows.push(W2); return W2;
  }
  function buildTenement(dx, dz, mine) {
    const H0 = SLUM_HOME, H = { x: H0.x + dx, z: H0.z + dz, minX: H0.minX + dx, maxX: H0.maxX + dx, minZ: H0.minZ + dz, maxZ: H0.maxZ + dz };
    const S = { a0: STAIR.a0 + dx, a1: STAIR.a1 + dx, b1: STAIR.b1 + dx, balX0: STAIR.balX0 + dx, z0: STAIR.z0 + dz, z1: STAIR.z1 + dz, land1: STAIR.land1 + dz, bal0: STAIR.bal0 + dz };
    const [G, M, T] = LEVELS, W = H.maxX - H.minX, D = H.maxZ - H.minZ, cx = H.x, cz = (H.minZ + H.maxZ) / 2;
    const level = base => c => { c.baseYAt = () => base; return c; };
    // the two lower storeys: breeze block downstairs, faded paint on the first floor, stains everywhere
    box(W, FLOOR_H, D, cx, G + FLOOR_H / 2, cz, breeze); box(W + 0.1, FLOOR_H - 0.05, D + 0.1, cx, M + FLOOR_H / 2 - 0.05, cz, painted[1]);
    box(W + 0.4, 0.14, D + 0.4, cx, M - 0.02, cz, concrete); box(W + 0.3, 0.14, D + 0.3, cx, T - 0.04, cz, concrete);   // slab edges
    level(G)(solid(H.minX, H.maxX, H.minZ, H.maxZ)); level(2.9)(solid(H.minX, H.maxX, H.minZ, H.maxZ));   // you can't walk into other people's flats
    // doors and barred windows of the flats below: two on the ground floor (one is the landlord's), one up a floor
    realDoor(cx - 2.6, M, H.maxZ, 0, 1, 'Flat 3'); mine && tenants.push({ x: cx - 2.6, z: H.maxZ + 0.75, y: M, who: 'Flat 3' });   // Flat 3: door on the back gallery
    for (const [dx, y, who] of [[-2.6, G, 'Flat 1 (the landlord)'], [2.6, G, 'Flat 2']]) {
      realDoor(cx + dx, y, H.minZ, 0, -1, who);
      mine && tenants.push({ x: cx + dx, z: H.minZ - 0.9, y, who });
    }
    for (const [dx, y] of [[0, G], [-0.3, M], [2.6, M]]) realWindow(cx + dx, y + 1.6, H.minZ, 0, -1, 1.2, 0.9, y === G);   // ground floor windows keep their bars
    for (const [x, y] of [[H.minX, G], [H.minX, M]]) realWindow(x, y + 1.6, cz, -1, 0, 1.2, 0.9, y === G);
    for (const [x, y] of [[cx + 1.6, M], [cx + 2.6, G]]) realWindow(x, y + 1.6, H.maxZ, 0, 1, 1.0, 0.8, y === G);   // the back
    realDoor(H.maxX, M, H.maxZ - 0.9, 1, 0, 'Flat 4', 0.9); mine && tenants.push({ x: S.a0 + 0.6, z: S.z1 + 0.7, y: M, who: 'Flat 4 (door on the landing)' });
    for (let i = 0; i < 9; i++) box(0.5 + R() * 1.4, 0.4 + R() * 1.2, 0.02, cx + (R() - 0.5) * W * 0.9, G + 0.6 + R() * 4.5, H.minZ - 0.09, std('stain', { color: 0x3a3226, transparent: true, opacity: 0.45 }));   // damp stains down the front
    // the outside stair: two steep flights of rough planks on steel posts, with a landing at the back
    const flight = (x0, x1, za, ya, zb, yb) => { const n = 18; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, z = za + (zb - za) * t, y = ya + (yb - ya) * t; box(x1 - x0, 0.06, Math.abs(zb - za) / n + 0.02, (x0 + x1) / 2, y - 0.03, z, plank); }
      const len = Math.hypot(zb - za, yb - ya), ang = Math.atan2(yb - ya, zb - za); for (const x of [x0 + 0.04, x1 - 0.04]) box(0.08, 0.22, len, x, (ya + yb) / 2 - 0.15, (za + zb) / 2, bars, -ang, 0, 0); };
    flight(S.a0, S.a1, S.z0, G, S.z1, M); flight(S.a1, S.b1, S.z1, M, S.z0, T);
    box(S.b1 - S.balX0, 0.1, S.land1 - S.z1, (S.balX0 + S.b1) / 2, M - 0.05, (S.z1 + S.land1) / 2, plank);   // the second-floor gallery (and the stairs' landing)
    box(S.b1 - S.balX0, 0.1, S.z0 - S.bal0, (S.balX0 + S.b1) / 2, T - 0.05, (S.bal0 + S.z0) / 2, plank);   // the balcony
    for (const [x, z, h] of [[S.a0, S.z0, M], [S.b1, S.z0, T], [S.b1, S.land1, M], [S.a0, S.land1, M], [S.balX0, S.bal0, T], [S.b1, S.bal0, T], [702 + dx, S.bal0, T], [697 + dx, S.bal0, T]]) cyl(0.06, h, x, h / 2, z, bars, 6);   // rusty posts
    // railings (the gaps are missing bars: don't lean on it)
    const rail = (x0, z0, x1, z1, y) => { box(Math.abs(x1 - x0) || 0.05, 0.05, Math.abs(z1 - z0) || 0.05, (x0 + x1) / 2, y + 0.95, (z0 + z1) / 2, bars); const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.3); for (let i = 0; i <= n; i++) { if (R() < 0.15) continue; const t = i / n; box(0.03, 0.95, 0.03, x0 + (x1 - x0) * t, y + 0.47, z0 + (z1 - z0) * t, bars); } };
    rail(S.balX0, S.bal0, S.b1, S.bal0, T); rail(S.balX0, S.bal0, S.balX0, S.z0, T); rail(S.a0, S.land1, S.b1, S.land1, M); rail(S.b1, S.z1, S.b1, S.land1, M);
    level(T)(solid(S.balX0, S.b1, S.bal0 - 0.06, S.bal0 + 0.06)); level(T)(solid(S.balX0 - 0.06, S.balX0 + 0.06, S.bal0, S.z0));   // the balcony rails stop you falling off
    level(M)(solid(S.a0, S.b1, S.land1 - 0.06, S.land1 + 0.06));
    { const R2 = rng(515);
      const rail2 = (x0, z0, x1, z1, y) => { box(Math.abs(x1 - x0) || 0.05, 0.05, Math.abs(z1 - z0) || 0.05, (x0 + x1) / 2, y + 0.95, (z0 + z1) / 2, bars); box(Math.abs(x1 - x0) || 0.04, 0.04, Math.abs(z1 - z0) || 0.04, (x0 + x1) / 2, y + 0.5, (z0 + z1) / 2, bars); const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.3); for (let i = 0; i <= n; i++) { if (R2() < 0.1) continue; const t = i / n; box(0.03, 0.95, 0.03, x0 + (x1 - x0) * t, y + 0.47, z0 + (z1 - z0) * t, bars); } };
      // the second-floor gallery: rail along its back edge and its west end
      rail2(S.balX0, S.land1, S.a0, S.land1, M); rail2(S.balX0, S.z1, S.balX0, S.land1, M);
      level(M)(solid(S.balX0, S.a0, S.land1 - 0.06, S.land1 + 0.06)); level(M)(solid(S.balX0 - 0.06, S.balX0 + 0.06, S.z1, S.land1));
      // the top balcony: close the east end and the drop down onto the first flight
      rail2(S.b1, S.bal0, S.b1, S.z0, T); rail2(S.a0, S.z0, S.a1, S.z0, T);
      level(T)(solid(S.b1 - 0.06, S.b1 + 0.06, S.bal0, S.z0)); level(T)(solid(S.a0, S.a1, S.z0 - 0.06, S.z0 + 0.06));
      // handrails up both flights (between them and along the outside), with posts
      const stairRail = (x, za, ya, zb, yb) => { const len = Math.hypot(zb - za, yb - ya), ang = Math.atan2(yb - ya, zb - za); for (const hh of [0.95, 0.5]) box(0.05, 0.05, len, x, (ya + yb) / 2 + hh, (za + zb) / 2, bars, -ang, 0, 0); for (let i = 0; i <= 8; i++) { const t = i / 8; box(0.035, 0.95, 0.035, x, ya + (yb - ya) * t + 0.47, za + (zb - za) * t, bars); } };
      stairRail(S.a1, S.z0, G, S.z1, M); stairRail(S.a1 + 0.06, S.z1, M, S.z0, T); stairRail(S.b1, S.z1, M, S.z0, T);
    }
    solid(S.a1 - 0.05, S.a1 + 0.05, S.z0, S.z1); solid(S.b1 - 0.05, S.b1 + 0.08, S.z0, S.land1);   // between the flights, and the outside edge
    // the space under the first flight is closed off where it's too low to stand: solid to anyone below the steps,
    // never to someone on them (the block sits just under the steps at your spot)
    { const h = z => G + (Math.min(S.z1, Math.max(S.z0, z)) - S.z0) / (S.z1 - S.z0) * (M - G);
      colliders.push({ minX: S.a0, maxX: S.a1, minZ: S.z0 + 1.6, maxZ: S.z1, baseYAt: (x, z) => h(z) - 2.85 });
      box(S.a1 - S.a0 - 0.1, 2.0, 0.06, (S.a0 + S.a1) / 2, G + 1.0, S.z1 - 0.1, plank); }   // boards nailed across the back, under the landing
    // washing hung over the balcony rail, and a satellite dish someone found
    for (let i = 0; i < 6; i++) plane(between(0.4, 0.8), between(0.5, 0.9), S.balX0 + 0.8 + i * 1.6, T + 0.55, S.bal0 - 0.03, pick(cloth), 0);
    put(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), concrete, H.minX + 0.6, M + 2.5, H.minZ - 0.3, 1, 0.4, 1, -1.2, 0, 0);
    if (!mine) {   // the top-floor flat (yours is built in main.js): walls, a roof, a door onto the balcony; it's somebody's home, so shut
      box(W, FLOOR_H - 0.05, D, cx, T + FLOOR_H / 2 - 0.02, cz, pick(painted)); box(W + 0.6, 0.06, D + 0.6, cx, T + FLOOR_H + 0.1, cz, ironRoof, 0.06, 0, 0);
      realDoor(cx + 3.0, T, H.minZ, 0, -1, 'Top flat'); realWindow(cx - 1.5, T + 1.6, H.minZ, 0, -1, 1.4, 0.95); realWindow(cx + 0.9, T + 1.6, H.minZ, 0, -1, 0.9, 0.95);
      realWindow(H.minX, T + 1.6, cz, -1, 0, 1.2, 0.9); realWindow(H.maxX, T + 1.6, cz, 1, 0, 1.2, 0.9); realWindow(cx, T + 1.6, H.maxZ, 0, 1, 1.4, 0.9);
      level(T)(solid(H.minX, H.maxX, H.minZ, H.maxZ));
    }
    tag('BLD', 'APT', 'CON.MET', 'Built by hand, floor by floor (no permit)', 'Tenement block (3 storeys)', cx, cz);
    tag('PRD', 'FUR', 'WOD.STL', 'Scrap wood and steel', 'Outside staircase', S.a1, (S.z0 + S.z1) / 2);
  }
  for (const [dx, dz] of TENEMENTS) buildTenement(dx, dz, !dx && !dz);

  // your neighbours' doors: locked (it's their home), but you can knock
  { const replies = ['"Who is it? ...We\'re not buying anything."', '"Not now, the baby\'s asleep."', 'Nobody answers. A TV is on somewhere inside.', '"If it\'s about the noise, it wasn\'t us."', '"Mr Kassim sent you? Tell him the tap still leaks."'];
    for (const t of tenants) if (!t.who.includes('landlord')) interactables.push({ pos: new THREE.Vector3(t.x, t.y, t.z), r: 1.4, door: true, label: `Knock on ${t.who.replace(/ \(.*\)/, '')}'s door (locked)`, action: () => ctx.toast('🚪 ' + replies[Math.floor(Math.random() * replies.length)]) }); }

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
  // the tap's water: a stream from the spout into the bucket, and the surface in the bucket rising and rippling
  let pour = 0, tapAt = null;
  const waterM = new THREE.MeshStandardMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.1, emissive: 0x335566, emissiveIntensity: 0.3 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 1, 8, 1, true), waterM); stream.visible = false; stream.name = 'tap water'; scene.add(stream);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14), waterM); pool.visible = false; scene.add(pool);
  const drops = Array.from({ length: 6 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), waterM); d.visible = false; scene.add(d); return d; });
  for (const [x, z] of barrels) { cyl(0.32, 0.9, x, curb + 0.45, z, rubber, 12); const f = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 7), fire); f.position.set(x, curb + 1.1, z); scene.add(f); flames.push(f); colliders.push({ circleX: x, circleZ: z, circleRadius: 0.4, minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 }); tag('PRD', 'DEC', 'STL', 'An old oil drum', 'Fire barrel', x, z); }
  const glow = new THREE.PointLight(0xff8a3a, 2.4, 14, 2); glow.position.set(768, curb + 1.6, 543); scene.add(glow);

  // ---------------- the communal tap (the only water for the whole street) ----------------
  { const x = 715, z = 506; box(0.5, 0.12, 0.5, x, curb + 0.06, z, concrete); cyl(0.05, 1.0, x, curb + 0.55, z, bars, 6); box(0.25, 0.05, 0.05, x + 0.12, curb + 0.98, z, bars);
    for (let i = 0; i < 4; i++) cyl(0.2, 0.35, x + 0.6 + i * 0.55, curb + 0.18, z + 0.4, std('bucket' + (i % 3), { color: [0x2d7dd2, 0xe4572e, 0xf3a712][i % 3] }), 10);
    cyl(0.17, 0.32, x + 0.26, curb + 0.16, z, std('bucket0', { color: 0x2d7dd2 }), 10);   // a bucket under the spout
    interactables.push({ pos: new THREE.Vector3(x, 0, z), r: 1.8, label: 'Drink from the communal tap', action: () => { pour = 4; ctx.drink?.(); } });
    tapAt = { x: x + 0.26, z };
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
  const errands = []; let nextErrand = () => {};
  if (K) {
    const y = curb + 0.05;
    for (const [x, z] of barrels) for (let i = 0; i < 2; i++) { const a = i / 2 * Math.PI * 2 + R(); K.stander(x + Math.cos(a) * 1.1, z + Math.sin(a) * 1.1, Math.atan2(-Math.cos(a), -Math.sin(a)), { task: 'talk', y }); }
    K.stander(647.5, 503.4, 0, { y, task: 'talk' });   // Mama Ade at her hatch
    for (const t of tenants) K.stander(t.x, t.z, Math.PI, { y: t.y + 0.05, task: t.who.includes('landlord') ? 'phone' : 'talk' });   // the landlord and your neighbours
    // kids playing football in the main lane, people walking the lanes
    for (let i = 0; i < 4; i++) K.walker([[735 + i * 2, 498], [752, 501.5 - i * 0.5], [742 - i, 498.5]], { child: true, speed: 1.6 + R() * 0.4, t: R() * 20 });
    for (const x of [640, 720, 800]) { K.walker([[x - 1.5, 452], [x - 1.5, 594], [x + 1.5, 594], [x + 1.5, 452]], { speed: 0.9 + R() * 0.3, t: R() * 200 }); }
    for (const z of LANES_Z) K.walker([[602, z - 1.2], [838, z - 1.2], [838, z + 1.2], [602, z + 1.2]], { speed: 0.8 + R() * 0.3, t: R() * 400 });
    // people sat out front on crates and buckets
    for (const [x, z] of doorSpots) if (R() < 0.025) K.sitter(x, z, Math.atan2(x - 720, z - 520), curb + 0.45, { task: R() < 0.5 ? 'talk' : 'phone' });
    // Residents going about their day: from their door, along the alley to the lane, to the tap, Mama Ade's,
    // the fire barrel or a neighbour's door; they stop there a while, then walk home and rest at the door.
    const R3 = rng(9090), laneX = x => LANES_X.reduce((a, c) => Math.abs(c - x) < Math.abs(a - x) ? c : a);
    const tenement = { minX: 689, maxX: 712, minZ: 501, maxZ: 519 };
    const homes = doorSpots.filter(([x, z]) => { const lx = laneX(x), path = { minX: Math.min(x, lx), maxX: Math.max(x, lx), minZ: z - 0.5, maxZ: z + 0.5 }; return z > 449 && z < Z_TOP - 0.5 && !hits(path, tenement) && !clearOf.slice(1).some(c => hits(path, c)); });
    const spots = [{ name: 'tap', at: [715.4, 505.2], laneZ: 500, task: 'idle' }, { name: 'shop', at: [647.5, 502.8], laneZ: 500, task: 'talk' }, { name: 'barrel', at: [768, 544.8], laneZ: 550, task: 'talk' }];
    const yAt = (x, z) => (inLane(x, z) ? 0 : curb) + 0.05;
    const routeTo = (home, dest) => { const [hx, hz] = home, lx = laneX(hx), side = (R3() - 0.5) * 1.6;
      if (dest.at) { const [dx, dz] = dest.at; return [[hx, hz], [lx + side, hz], [lx + side, dest.laneZ + side * 0.5], [dx, dest.laneZ + side * 0.5], [dx, dz]]; }
      const [x2, z2] = dest.home, lx2 = laneX(x2), zh = Math.abs(hz - 500) < Math.abs(hz - 550) ? 500 : 550;
      return [[hx, hz], [lx + side, hz], [lx + side, zh + side * 0.5], [lx2 + side, zh + side * 0.5], [lx2 + side, z2], [x2, z2]]; };
    const count = Math.min(40, homes.length);
    for (let i = 0; i < count; i++) {
      const home = homes[Math.floor(R3() * homes.length)], h = K.person(home[0], home[1], 0, { y: yAt(home[0], home[1]) }); if (!h) continue;
      errands.push({ h, home, path: null, i: 0, wait: R3() * 5, task: 'idle', speed: 1.1 + R3() * 0.5, away: false });
    }
    function nextTrip(e) {
      if (e.away) { e.path = e.path.slice().reverse(); e.away = false; e.task = 'idle'; return; }   // walk home
      const r = R3(), dest = r < 0.75 ? spots[Math.floor(R3() * spots.length)] : { home: homes[Math.floor(R3() * homes.length)], task: 'talk' };
      e.path = routeTo(e.home, dest); e.away = true; e.task = dest.task;
    }
    nextErrand = nextTrip;
    bot.people(K);
  }

  const neglected = [];   // road cells left broken for good: the council never comes
  for (const l of lanes) { const long = l.maxZ - l.minZ > l.maxX - l.minX; for (let t = 3; t < (long ? l.maxZ - l.minZ : l.maxX - l.minX); t += 6) neglected.push([long ? (l.minX + l.maxX) / 2 + (R() - 0.5) * 2 : l.minX + t, long ? l.minZ + t : (l.minZ + l.maxZ) / 2 + (R() - 0.5) * 2, Math.round(between(8, 60))]); }

  let ft = 0;
  const yAt2 = (x, z) => (inLane(x, z) ? 0 : curb) + 0.05;
  // walk a resident along their route; stop and do something at each end
  function stepErrand(e, dt) {
    const h = e.h, p = h.root.position;
    if (e.wait > 0) { e.wait -= dt; ctx.animatePerson?.(h, false, dt); if (e.task === 'talk' && h.armR) h.armR.pivot.rotation.x = -0.4 + Math.sin(ft * 2.2 + e.speed * 9) * 0.35; return; }
    if (!e.path || e.i >= e.path.length) { if (e.path) e.wait = e.away ? 4 + Math.random() * 8 : 4 + Math.random() * 12; nextErrand(e); e.i = 1; return; }
    const [tx, tz] = e.path[e.i], dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), step = e.speed * dt;
    if (d <= step) { p.x = tx; p.z = tz; e.i++; } else { p.x += dx / d * step; p.z += dz / d * step; h.root.rotation.y = Math.atan2(dx, dz); }
    p.y = yAt2(p.x, p.z); ctx.animatePerson?.(h, true, dt);
  }

  return {
    bounds: SLUM, home: SLUM_HOME, homeY: SLUM_HOME_Y, landlordAt: tenants[0], lanes, neglected, shacks,
    // standing inside a shack's room (for the camera: indoors is first-person)
    insideShack: p => shacks.some(k => Math.abs(p.x - k.x) < k.w / 2 - 0.1 && Math.abs(p.z - k.z) < k.d / 2 - 0.1 && p.y < curb + 3.2),
    people: () => K?.people || [], errands,
    groundAt: slumGroundAt,
    destinations: [{ name: 'Cinder Row (slum)', x: 720, z: 520 }, { name: "Mama Ade's corner shop (Cinder Row)", x: 647.5, z: 503 }],
    update(dt, p) {
      if (!p || Math.abs(p.x - 720) > 260 || Math.abs(p.z - 520) > 220) return;
      ft += dt; flames.forEach((f, i) => { const s = 0.85 + 0.25 * Math.sin(ft * 9 + i * 2.1) + 0.1 * Math.sin(ft * 23 + i); f.scale.set(s, s * 1.2, s); });
      glow.intensity = 2.1 + 0.6 * Math.sin(ft * 11) * Math.sin(ft * 7.3);
      K?.update?.(dt, p);
      for (const D of shackDoors) { const want = D.target * D.swing; if (Math.abs(D.g.rotation.y - D.base - want) > 0.001) D.g.rotation.y += (D.base + want - D.g.rotation.y) * Math.min(1, dt * 6); }
      // water pours when you use the tap, and now and then when a neighbour fills a bucket
      if (tapAt) { if (pour <= 0 && Math.random() < dt / 40) pour = 5; pour -= dt; const on = pour > 0, top = curb + 0.96, bottom = curb + 0.3;
        stream.visible = pool.visible = on; for (const d of drops) d.visible = on;
        if (on) { const wob = 1 + Math.sin(ft * 40) * 0.08; stream.scale.set(wob, top - bottom, wob); stream.position.set(tapAt.x, (top + bottom) / 2, tapAt.z); pool.position.set(tapAt.x, bottom + 0.005 + Math.sin(ft * 25) * 0.004, tapAt.z);
          drops.forEach((d, i) => { const k = (ft * 2.5 + i / drops.length) % 1, a = i * 1.7; d.position.set(tapAt.x + Math.cos(a) * 0.08 * k, bottom + 0.12 * Math.sin(k * Math.PI), tapAt.z + Math.sin(a) * 0.08 * k); }); } }
      for (const e of errands) stepErrand(e, dt);
      // people are solid: you bump into them instead of walking through
      for (const h of K?.people || []) { const q = h.root.position; if (!h.root.visible || Math.abs(q.y - p.y) > 1.6) continue; const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d < 0.65 && d > 1e-4) { p.x = q.x + dx / d * 0.65; p.z = q.z + dz / d * 0.65; } }
    },
  };
}

// ---------------- RENT: your flat is rented from the landlord on the ground floor ----------------
// Rent is due every 7 game days and you pay him in person (walk up to him outside Flat 1).
// Miss it and arrears build up with a late fee; a full week behind and he padlocks your door: you
// can't get in or sleep at home until you pay everything you owe. The admin doesn't rent (they own an estate).
export const RENT = { amount: 60, every: 7, lateFee: 10, landlord: 'Mr Kassim' };
export function createRent(ctx) {
  // ctx: { day: () => game days, gold: { get, add }, toast, interactables, at: {x, z, y}, exempt: () => bool }
  let st = null;
  const fresh = () => ({ dueDay: Math.floor(ctx.day()) + RENT.every, owed: 0, late: false, locked: false, paid: 0 });
  const S = () => (st ||= fresh());
  const owing = () => S().owed + (ctx.day() >= S().dueDay ? RENT.amount : 0);
  function tick() {
    if (ctx.exempt?.()) return;
    const s = S(), d = ctx.day();
    if (d >= s.dueDay && !s.late) { s.late = true; ctx.toast(`🏚️ Rent day. ${RENT.landlord} wants ${RENT.amount} gold for your flat. Pay him outside Flat 1.`); }
    if (d >= s.dueDay + RENT.every) { s.owed += RENT.amount + RENT.lateFee; s.dueDay += RENT.every; s.late = false; ctx.toast(`🏚️ You missed the rent. You now owe ${RENT.landlord} ${s.owed} gold (late fees included).`); }
    if (!s.locked && s.owed > 0) { /* a whole week of rent missed */ s.locked = true; ctx.toast(`🔒 ${RENT.landlord} has padlocked your door. Pay what you owe (${owing()} gold) to get back in.`); }
  }
  function pay() {
    const due = owing(); if (due <= 0) return ctx.toast(`${RENT.landlord}: "You're paid up until day ${S().dueDay}. Don't be late."`);
    if (ctx.gold.get() < due) return ctx.toast(`${RENT.landlord}: "${due} gold. You've got ${Math.floor(ctx.gold.get())}? Come back when you have it."`);
    ctx.gold.add(-due); const s = S(); s.paid += due; s.owed = 0; if (ctx.day() >= s.dueDay) s.dueDay += RENT.every; s.late = false;
    const was = s.locked; s.locked = false;
    ctx.toast(`🏚️ Paid ${due} gold rent. ${was ? 'He takes the padlock off your door. ' : ''}Next rent is due on day ${s.dueDay}.`);
  }
  if (ctx.at) ctx.interactables.push({ pos: new THREE.Vector3(ctx.at.x, ctx.at.y, ctx.at.z), r: 2.2,
    get label() { if (ctx.exempt?.()) return `Talk to ${RENT.landlord}`; const due = owing(); return due > 0 ? `Pay rent to ${RENT.landlord} (${due} gold)` : `${RENT.landlord} (rent paid until day ${S().dueDay})`; },
    action: () => ctx.exempt?.() ? ctx.toast(`${RENT.landlord}: "You're not one of my tenants."`) : pay() });
  return {
    tick, pay, owing,
    lockedOut: () => !ctx.exempt?.() && !!S().locked,
    status: () => ({ ...S(), owing: owing() }),
    snapshot: () => S(),
    restore(v) { st = v && typeof v === 'object' ? { ...fresh(), ...v } : null; },
  };
}
