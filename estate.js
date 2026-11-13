// The Reserve: a gated estate of four mega-mansions out east past the airfield road, modelled on the real
// Bel Air / Beverly Hills "giga-mansions" (924 Bel Air Road, the $100m Bel Air spec homes): each sits
// on its own walled plot with a gate, a circular drive and fountain, and you can walk into all of it:
//   ground floor  grand foyer with a double staircase, great room with fireplace, chef's kitchen and
//                 dining for twelve, a private cinema (recliners, a screen that plays films, a candy bar),
//                 a games room and bar (pool table) with a gym
//   upper floor   a gallery landing over the foyer, master suite with a freestanding bath, guest suites
//   garage wing   an "auto gallery" with roller doors and three cars you can take out
//   sports wing   an indoor basketball court (two of them) or an indoor pool and spa (the other two)
//   outside       an infinity pool with loungers and a hot tub; a tennis court where there's an indoor pool
// The stairs are real ramps and the upper floor is a real floor (groundAt), so you just walk up.
// The estate road turns off the airfield road through a guarded gatehouse and runs south past the plots.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeKit } from './leisure-kit.js';

const AVE_X = 1030, AVE_W = 10, AVE_Z0 = 140, AVE_Z1 = 792, LINK_Z = 300, LINK_X0 = 958, GATE_X = 995;
const FY0 = 0.15, FY1 = 4.6, ROOF = 9.0;
// each plot faces the avenue (west); rot is the house's turn (front = local +z)
const PLOTS = [
  { name: 'The Reserve No. 1 · Bel Vista', x: 1120, z: 225, wing: 'court', body: 0xf4f2ee, trim: 0x23272b, accent: 0xc9a24a },
  { name: 'The Reserve No. 2 · Villa Aurelia', x: 1120, z: 385, wing: 'pool', body: 0xe9dcc4, trim: 0x5a4632, accent: 0xb08d57 },
  { name: 'The Reserve No. 3 · The Glass Pavilion', x: 1120, z: 545, wing: 'pool', body: 0xdfe6ea, trim: 0x1d2329, accent: 0x7fb8d6 },
  { name: 'The Reserve No. 4 · Kingsmere House', x: 1120, z: 705, wing: 'court', body: 0xd8d0c0, trim: 0x2e3a2f, accent: 0xa0763c },
].map(p => ({ ...p, rot: -Math.PI / 2 }));

export function buildEstate(ctx) {
  const { scene, colliders, planeBlocks, poolZones, interactables, sitSpots, makeTex, toast, makeVehicle, civicBuildings, destinations } = ctx;
  const K = makeKit(ctx), { mat, sign, place, stander } = K;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const M = c => c instanceof THREE.Material ? c : mat(c);

  // ---------- static geometry, merged per material (one draw call per material per mansion) ----------
  let buckets = new Map();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function sb(w, h, d, x, y, z, c, ry = 0) {
    const m = M(c); let list = buckets.get(m); if (!list) buckets.set(m, list = []);
    const gg = boxGeo.clone(); _q.setFromEuler(_e.set(0, ry, 0)); _m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(w, h, d)); gg.applyMatrix4(_m); list.push(gg);
  }
  function scyl(rt, rb, h, x, y, z, c, seg = 16) {
    const m = M(c); let list = buckets.get(m); if (!list) buckets.set(m, list = []);
    const gg = new THREE.CylinderGeometry(rt, rb, h, seg); gg.translate(x, y, z); list.push(gg);
  }
  function flush() {
    for (const [m, list] of buckets) {
      const norm = list.map(g => g.index ? g.toNonIndexed() : g);
      for (const g of norm) { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); }
      const merged = mergeGeometries(norm, false); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m); mesh.receiveShadow = true; mesh.castShadow = !m.transparent; scene.add(mesh);
    }
    buckets = new Map();
  }
  const solidW = (x0, x1, z0, z1, level) => { const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }; if (level === 'g') c.baseYAt = () => FY0; else if (level === 'u') c.baseYAt = () => FY1; colliders.push(c); return c; };

  const floors = [], ramps = [], voids = [];   // walkable upper floors, stair ramps, holes in the upper floor
  const homes = [];

  // ================= the estate road, gatehouse and signs =================
  const asphalt = mat(0x2f3236, { rough: 0.95 }), white = mat(0xf2f2f2), kerb = mat(0xbdb8ad), stone = mat(0xd9d2c0, { rough: 0.8 });
  sb(AVE_W, 0.06, AVE_Z1 - AVE_Z0, AVE_X, 0.03, (AVE_Z0 + AVE_Z1) / 2, asphalt);                       // the avenue (north-south)
  for (let z = AVE_Z0 + 6; z < AVE_Z1 - 6; z += 9) sb(0.16, 0.01, 4, AVE_X, 0.065, z, white);
  sb(AVE_X - LINK_X0, 0.06, AVE_W, (AVE_X + LINK_X0) / 2, 0.03, LINK_Z, asphalt);                     // in from the airfield road
  for (let x = LINK_X0 + 6; x < AVE_X - 6; x += 9) sb(4, 0.01, 0.16, x, 0.065, LINK_Z, white);
  for (const z of [AVE_Z0, AVE_Z1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(12, 32), asphalt); c.rotation.x = -Math.PI / 2; c.position.set(AVE_X, 0.031, z); scene.add(c); }   // turning circles
  for (let z = AVE_Z0 + 10; z < AVE_Z1 - 10; z += 22) for (const sd of [-1, 1]) {
    const x = AVE_X + sd * (AVE_W / 2 + 2.5);
    if (sd > 0 && PLOTS.some(P => Math.abs(z - P.z) < 9)) continue;   // keep the plot gates clear
    if (Math.abs(z - LINK_Z) < 10) continue;
    scyl(0.18, 0.25, 3.2, x, 1.6, z, 0x5a4030, 6); sb(2.4, 2.6, 2.4, x, 4.1, z, 0x3f6a2f);
    if (sd < 0 && (z | 0) % 44 < 22) { sb(0.14, 5.5, 0.14, x, 2.75, z + 11, 0x2b2f33); sb(0.5, 0.18, 0.5, x, 5.5, z + 11, mat(0xfff1c4, { emissive: 0xfff1c4, ei: 1.4 })); }
  }
  // gatehouse on the way in, barrier arms each side
  sb(4, 3.4, 5, GATE_X, 1.7, LINK_Z - AVE_W / 2 - 3, stone); sb(4.8, 0.4, 5.8, GATE_X, 3.6, LINK_Z - AVE_W / 2 - 3, 0x2e3a2f);
  sb(3.6, 1.4, 0.06, GATE_X, 1.9, LINK_Z - AVE_W / 2 - 0.48, mat(0x9fd3ff, { opacity: 0.4, rough: 0.05 }));
  solidW(GATE_X - 2, GATE_X + 2, LINK_Z - AVE_W / 2 - 5.5, LINK_Z - AVE_W / 2 - 0.5);
  for (const sd of [-1, 1]) { const z = LINK_Z + sd * (AVE_W / 2 + 1.2); sb(1.6, 6.5, 1.6, GATE_X, 3.25, z, stone); solidW(GATE_X - 0.8, GATE_X + 0.8, z - 0.8, z + 0.8); }
  sb(0.9, 1.4, AVE_W + 3.2, GATE_X, 6.9, LINK_Z, 0x2e3a2f);
  { const f = sign('WELCOME TO THE RESERVE', 'private estate · residents and guests', 8, '#2e3a2f', '#e6d9a8'); place(f, GATE_X - 0.47, 6.9, LINK_Z, -Math.PI / 2); f.scale.y = 0.5;   // seen arriving from the airfield road (west)
    const b = sign('GOODBYE FROM THE RESERVE', 'thank you for visiting · drive safely', 8, '#2e3a2f', '#e6d9a8'); place(b, GATE_X + 0.47, 6.9, LINK_Z, Math.PI / 2); b.scale.y = 0.5; }
  const arms = [];
  for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(GATE_X + sd * 1.2, 1.1, LINK_Z + sd * (AVE_W / 2 - 0.3)); scene.add(piv);
    const arm = new THREE.Mesh(boxGeo, mat(0xe74c3c)); arm.scale.set(0.12, 0.12, AVE_W / 2 - 0.4); arm.position.z = -sd * (AVE_W / 4 - 0.2); piv.add(arm);
    for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(boxGeo, mat(0xffffff)); st.scale.set(0.13, 0.13, 0.4); st.position.z = -sd * (0.6 + k * 1.3); piv.add(st); }
    arms.push(piv); }
  stander(GATE_X + 0.6, LINK_Z - AVE_W / 2 - 1.4, 0, { outfit: 0x2c3e50, task: 'idle' });
  interactables.push({ pos: new THREE.Vector3(GATE_X - 1.2, 0, LINK_Z - AVE_W / 2 - 0.4), r: 2.2, label: 'Talk to the estate security', action: () => toast('🛂 "Afternoon. Four houses on The Reserve, all off this avenue: Bel Vista, Villa Aurelia, the Glass Pavilion and Kingsmere House. The owners are away, so have a look round. All four are for sale."') });
  destinations?.push({ name: 'The Reserve (mansion estate)', x: GATE_X - 15, z: LINK_Z });

  // ================= the mansions =================
  for (const P of PLOTS) homes.push(buildMansion(P));
  flush();

  function buildMansion(P) {
    const R = P.rot, cR = Math.cos(R), sR = Math.sin(R);
    const W = (lx, lz) => [P.x + lx * cR + lz * sR, P.z - lx * sR + lz * cR];   // local (x, z) -> world, as a group turned by R
    const wx = (lx, lz = 0) => W(lx, lz)[0], wz = (lz, lx = 0) => W(lx, lz)[1];
    const rect = (lx0, lx1, lz0, lz1) => { const a = W(lx0, lz0), b = W(lx1, lz1); return { minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minZ: Math.min(a[1], b[1]), maxZ: Math.max(a[1], b[1]) }; };
    const B = (w, h, d, lx, y, lz, c, ry = 0) => { const [x, z] = W(lx, lz); sb(w, h, d, x, y, z, c, ry + R); };
    const Cy = (rt, rb, h, lx, y, lz, c, seg) => { const [x, z] = W(lx, lz); scyl(rt, rb, h, x, y, z, c, seg); };
    const col = (lx0, lx1, lz0, lz1, level) => { const r = rect(lx0, lx1, lz0, lz1); return solidW(r.minX, r.maxX, r.minZ, r.maxZ, level); };
    const ry = a => a + R;   // a local facing angle in world terms
    const fX = sR, fZ = cR;   // the house's front direction in the world
    const body = mat(P.body, { rough: 0.7 }), trim = mat(P.trim, { rough: 0.6 }), accent = mat(P.accent, { metal: 0.5, rough: 0.35 });
    const glass = mat(0x9fc4d8, { opacity: 0.35, rough: 0.05, metal: 0.3 }), dark = mat(0x1c1f24);
    const marble = mat(0xf1eee8, { rough: 0.25 }), oak = mat(0x9a6b42, { rough: 0.55 }), carpet = mat(0x3b2a4a, { rough: 1 }), white2 = mat(0xf7f5f0);
    const ceil = mat(0xf3f1ec, { emissive: 0x77736a, ei: 0.5 }), lamp = mat(0xffffff, { emissive: 0xfff2d6, ei: 1.4 });
    const sit = (lx, lz, yaw, seatY, label) => { const [x, z] = W(lx, lz); sitSpots.push({ x, z, yaw: ry(yaw), seatY, label }); };
    const act = (lx, lz, r, label, action, y = 0) => { const [x, z] = W(lx, lz); const it = { pos: new THREE.Vector3(x, y, z), r, action }; if (typeof label === 'function') Object.defineProperty(it, 'label', { get: label, enumerable: true }); else it.label = label; interactables.push(it); return it; };

    // ---- a wall run along x (at lz) or along z (at lx): door gaps [a,b] (floor up to doorH) and
    //      windows [a,b,sill,top] that are real openings with glass in them (you can see out from inside) ----
    function run(alongX, pos, a0, a1, gaps = [], wins = [], { y0 = 0, h = ROOF - 0.2, level, m = body, t = 0.3, doorH = 2.7 } = {}) {
      const ops = [...gaps.map(([a, b]) => ({ a, b, lo: y0, hi: y0 + doorH, door: true })), ...wins.map(([a, b, lo, hi]) => ({ a, b, lo, hi }))];
      const xs = [...new Set([a0, a1, ...ops.flatMap(o => [o.a, o.b])])].filter(v => v >= a0 && v <= a1).sort((p, q) => p - q);
      const piece = (a, b, lo, hi, mm) => { if (hi - lo < 0.01) return; alongX ? B(b - a, hi - lo, mm === glass ? 0.06 : t, (a + b) / 2, (lo + hi) / 2, pos, mm) : B(mm === glass ? 0.06 : t, hi - lo, b - a, pos, (lo + hi) / 2, (a + b) / 2, mm); };
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1], mid = (a + b) / 2; if (b - a < 0.01) continue;
        const here = ops.filter(o => o.a <= mid && o.b >= mid).sort((p, q) => p.lo - q.lo);
        let y = y0;
        for (const o of here) { if (o.lo > y + 0.01) piece(a, b, y, o.lo, m); if (!o.door) { piece(a, b, o.lo, o.hi, glass); piece(a, b, o.lo - 0.08, o.lo, trim); } y = Math.max(y, o.hi); }
        if (y0 + h > y + 0.01) piece(a, b, y, y0 + h, m);
        if (!here.some(o => o.door)) alongX ? col(a, b, pos - t / 2, pos + t / 2, level) : col(pos - t / 2, pos + t / 2, a, b, level);
      }
    }
    const wallX = (lz, a0, a1, gaps, o = {}) => run(true, lz, a0, a1, gaps, o.wins, o);
    const wallZ = (lx, a0, a1, gaps, o = {}) => run(false, lx, a0, a1, gaps, o.wins, o);
    // a glass wall (solid to walk into, see-through) along x
    function glassX(lz, a0, a1, y0, h, gaps = []) {
      let a = a0;
      for (const [g0, g1] of [...gaps, [a1, a1]]) { if (g0 - a > 0.02) { B(g0 - a, h, 0.08, (a + g0) / 2, y0 + h / 2, lz, glass); col(a, g0, lz - 0.1, lz + 0.1, y0 > 2 ? 'u' : 'g'); for (let x = a; x <= g0 + 0.01; x += 3) B(0.1, h, 0.12, Math.min(x, g0), y0 + h / 2, lz, trim); } a = g1; }
    }

    // ---------------- plot: walls, gate, drive, fountain, gardens ----------------
    const PX = 80, PZ0 = -60, PZ1 = 80;
    const wallC = mat(0xcfc8b8, { rough: 0.9 });
    wallX(PZ0, -PX, PX, [], { h: 2.2, m: wallC, t: 0.5 }); wallZ(-PX, PZ0, PZ1, [], { h: 2.2, m: wallC, t: 0.5 }); wallZ(PX, PZ0, PZ1, [], { h: 2.2, m: wallC, t: 0.5 });
    wallX(PZ1, -PX, PX, [[-6, 6]], { h: 2.2, m: wallC, t: 0.5 });
    for (const x of [-6.6, 6.6]) { B(1.3, 3.2, 1.3, x, 1.6, PZ1, accent); col(x - 0.65, x + 0.65, PZ1 - 0.65, PZ1 + 0.65); }
    { const sg = sign(P.name.split(' · ')[1].toUpperCase(), P.name.split(' · ')[0], 5, '#1f2a22', '#e6d9a8'); const [x, z] = W(9.5, PZ1 + 0.3); place(sg, x, 1.6, z, ry(0)); sg.scale.y = 0.5; }
    // gate leaves (open as you come up)
    const gate = { leaves: [], open: 0, pos: new THREE.Vector3(W(0, PZ1)[0], 0, W(0, PZ1)[1]) };
    for (const sd of [-1, 1]) { const piv = new THREE.Group(); const [x, z] = W(sd * 6, PZ1); piv.position.set(x, 0, z); piv.rotation.y = ry(0); scene.add(piv);
      const leaf = new THREE.Group(); piv.add(leaf);
      for (const y of [0.25, 1.2, 2.3]) { const b = new THREE.Mesh(boxGeo, mat(0x161616, { metal: 0.6 })); b.scale.set(6, 0.08, 0.08); b.position.set(-sd * 3, y, 0); leaf.add(b); }
      for (let k = 0; k <= 12; k++) { const b = new THREE.Mesh(boxGeo, mat(0x161616, { metal: 0.6 })); b.scale.set(0.05, 2.2, 0.05); b.position.set(-sd * k * 0.5, 1.15, 0); leaf.add(b); }
      gate.leaves.push({ leaf, sd }); }
    gate.collider = col(-6, 6, PZ1 - 0.2, PZ1 + 0.2);
    // drive: from the gate to a circle with a fountain, branch to the garage
    const pave = mat(0xb9b2a4, { rough: 0.9 });
    B(9, 0.05, PZ1 - 46, 0, 0.025, (PZ1 + 46) / 2, pave);
    { const r = new THREE.Mesh(new THREE.RingGeometry(6, 14, 40), pave); r.rotation.x = -Math.PI / 2; const [x, z] = W(0, 40); r.position.set(x, 0.03, z); scene.add(r); }
    Cy(5.6, 5.8, 0.5, 0, 0.25, 40, 0x3f6a2f, 28); Cy(2.4, 2.8, 1.0, 0, 0.6, 40, stone, 20); Cy(2.1, 2.1, 0.08, 0, 1.12, 40, mat(0x3fa9d6, { emissive: 0x1d6f9a, ei: 0.4 }), 20); Cy(0.4, 0.6, 2.2, 0, 2.1, 40, stone, 10); Cy(1.0, 1.0, 0.15, 0, 3.1, 40, stone, 16);
    { const [x, z] = W(0, 40); colliders.push({ circleX: x, circleZ: z, circleRadius: 5.6, minX: x - 5.6, maxX: x + 5.6, minZ: z - 5.6, maxZ: z + 5.6 }); }
    B(22, 0.05, 8, -45, 0.025, 30, pave); B(26, 0.05, 12, -45, 0.025, 23, pave);   // to the garage doors
    B(6, 0.05, 10, 0, 0.025, 25, pave);                                             // up to the front door
    // lawns, hedges, trees
    for (const [x, z] of [[-70, 60], [-55, 70], [55, 70], [70, 55], [70, 20], [-72, 10], [-70, -40], [70, -45], [40, 60], [-30, 62]]) { Cy(0.25, 0.35, 3.5, x, 1.75, z, 0x5a4030, 6); B(3.6, 3.4, 3.6, x, 5, z, 0x3f6a2f); }
    for (let x = -28; x <= 28; x += 4) if (Math.abs(x) > 5) B(3.2, 1.1, 1.0, x, 0.55, 23, 0x3f6a2f);   // hedge in front of the house
    B(PX * 2 - 2, 0.02, PZ1 - PZ0 - 2, 0, 0.012, (PZ0 + PZ1) / 2, mat(0x5f8a3e, { rough: 1 }));

    // ---------------- the house: x -28..28, z -12..20 (front +z) ----------------
    const X0 = -28, X1 = 28, Z0 = -12, Z1 = 20;
    // floors and ceilings
    B(X1 - X0, FY0, Z1 - Z0, 0, FY0 / 2, (Z0 + Z1) / 2, marble);
    // upper slab (with the foyer/stair void x -7..7, z -1..20)
    B(X1 - 7, 0.3, Z1 - Z0, (X0 - 7) / 2, FY1 - 0.15, (Z0 + Z1) / 2, oak); B(X1 - 7, 0.3, Z1 - Z0, (X1 + 7) / 2, FY1 - 0.15, (Z0 + Z1) / 2, oak);
    B(14, 0.3, 11, 0, FY1 - 0.15, -6.5, oak);
    for (const [a, b] of [[X0, -7], [7, X1]]) B(b - a - 0.4, 0.04, Z1 - Z0 - 0.4, (a + b) / 2, FY1 - 0.32, (Z0 + Z1) / 2, ceil);   // ground-floor ceilings
    B(X1 - X0 - 0.4, 0.04, Z1 - Z0 - 0.4, 0, ROOF - 0.22, (Z0 + Z1) / 2, ceil);                                                    // upper ceiling
    B(X1 - X0 + 1.4, 0.5, Z1 - Z0 + 1.4, 0, ROOF + 0.05, (Z0 + Z1) / 2, trim);                                                   // flat roof with overhang
    B(X1 - X0 + 2, 0.12, 0.6, 0, FY1 + 0.05, Z1 + 0.5, accent);                                                                    // string course
    { const r = rect(X0, X1, Z0, Z1); planeBlocks?.push({ ...r, bottom: ROOF - 0.3, top: ROOF + 0.4 }); }
    floors.push(rect(X0, -7, Z0, Z1), rect(7, X1, Z0, Z1), rect(-7, 7, Z0, -1));
    voids.push(rect(-7, 7, -1, Z1));
    // exterior walls. Front: big windows both floors, a double front door
    const winX = [-24, -19, -14, -10.5, 10.5, 14, 19, 24];
    wallX(Z1, X0, X1, [[-2, 2]], { doorH: 3.4, wins: [...winX.flatMap(x => [[x - 1.3, x + 1.3, 0.8, 3.4], [x - 1.3, x + 1.3, 5.3, 7.9]]), [-2.5, 2.5, 4.0, 7.9]] });
    for (const x of winX) for (const y of [0.72, 5.22]) B(2.9, 0.15, 0.45, x, y, Z1 + 0.22, trim);           // sills
    for (const x of [-4, 4]) { Cy(0.35, 0.4, ROOF - 0.2, x, (ROOF - 0.2) / 2, Z1 + 3, white2, 14); const [cx, cz] = W(x, Z1 + 3); colliders.push({ circleX: cx, circleZ: cz, circleRadius: 0.4, minX: cx - 0.4, maxX: cx + 0.4, minZ: cz - 0.4, maxZ: cz + 0.4 }); }
    B(12, 0.5, 5, 0, ROOF - 0.45, Z1 + 2.5, trim); B(9, 0.3, 3, 0, 0.15, Z1 + 1.5, stone);                // portico and step
    // back: full-height glass onto the pool terrace, with sliding doors in the middle
    wallX(Z0, X0, -8, [], { wins: [-22, -16].flatMap(x => [[x - 2, x + 2, 0.7, 3.5], [x - 2, x + 2, 5.2, 8.0]]) }); wallX(Z0, 8, X1, [], { wins: [16, 22].flatMap(x => [[x - 2, x + 2, 0.7, 3.5], [x - 2, x + 2, 5.2, 8.0]]) });
    glassX(Z0, -8, 8, 0, 3.6, [[-3, 3]]); B(16, ROOF - 3.8, 0.3, 0, 3.6 + (ROOF - 3.8) / 2, Z0, body); col(-8, 8, Z0 - 0.15, Z0 + 0.15, 'u');
    // sides: west wall joins the garage, east wall joins the sports wing
    wallZ(X0, Z0, Z1, [[0, 2.6]]);
    wallZ(X1, Z0, Z1, [[-6, -3.4]]);
    // ground-floor rooms (level 'g' walls stop at the ceiling)
    const g = { h: FY1 - 0.3, level: 'g' };
    wallZ(-7, Z0, Z1, [[-6, -3.6], [12, 14.6]], g);
    wallZ(7, Z0, Z1, [[-6, -3.6], [12, 14.6]], g);
    wallX(2, X0, -7, [[-20, -12]], g);                         // living | kitchen (wide opening)
    wallX(4, 7, X1, [], g);                                    // cinema | games room
    // ---- foyer: marble, chandelier, round table, butler ----
    { const [x, z] = W(0, 14); const ch = new THREE.Group(); ch.position.set(x, ROOF - 2.2, z); scene.add(ch); const cm = mat(0xfff4d8, { emissive: 0xffe2a8, ei: 1.6 });
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, r = k % 2 ? 1.1 : 0.7; const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), cm); b.position.set(Math.cos(a) * r, -(k % 3) * 0.35, Math.sin(a) * r); ch.add(b); }
      const rod = new THREE.Mesh(boxGeo, accent); rod.scale.set(0.05, 2, 0.05); rod.position.y = 1.2; ch.add(rod); }
    Cy(1.1, 1.1, 0.08, 0, 0.95, 14, oak, 24); Cy(0.25, 0.4, 0.9, 0, 0.5, 14, oak, 10); Cy(0.25, 0.18, 0.5, 0, 1.25, 14, mat(0xffffff), 10); for (let k = 0; k < 7; k++) B(0.2, 0.2, 0.2, Math.cos(k) * 0.18, 1.6, 14 + Math.sin(k) * 0.18, [0xe84393, 0xffffff, 0xf9ca24][k % 3]);
    { const [x, z] = W(0, 14); colliders.push({ circleX: x, circleZ: z, circleRadius: 1.15, minX: x - 1.15, maxX: x + 1.15, minZ: z - 1.15, maxZ: z + 1.15 }); }
    { const [x, z] = W(3, 17.5); stander(x, z, ry(Math.PI), { outfit: 0x1a1a1a, task: 'idle' }); act(3, 17.5, 1.8, 'Talk to the butler', () => toast(`🤵 "Welcome to ${P.name.split(' · ')[1]}. The cinema is through on the right, the kitchen and great room on the left, the ${P.wing === 'court' ? 'basketball court' : 'indoor pool'} past the games room, and the cars are in the auto gallery. The stairs take you up to the suites."`)); }
    // ---- the double staircase: two ramps rising from z 9 to the landing at z -1 ----
    for (const sx of [-1, 1]) {
      const xa = sx * 4.6, xb = sx * 6.6, xm = (xa + xb) / 2;
      ramps.push({ ...rect(Math.min(xa, xb), Math.max(xa, xb), -1, 9), cx: P.x, cz: P.z, fX, fZ });
      for (let k = 0; k < 18; k++) { const t0 = k / 18, y = FY0 + (FY1 - FY0) * (k + 1) / 18; B(2, y, 10 / 18, xm, y / 2, 9 - (k + 0.5) * 10 / 18, marble); }
      // banister on the open side
      const len = Math.hypot(10, FY1 - FY0); B(0.08, 0.08, len, xa, (FY0 + FY1) / 2 + 1.0, 4, accent, 0); // (straight rail; the slope is shown by the steps)
      for (let k = 0; k <= 10; k += 2) { const y = FY0 + (FY1 - FY0) * k / 10; B(0.05, 1.0, 0.05, xa, y + 0.5, 9 - k, accent); }
      // you can't walk into the side of the high part of the stairs from the hall below
      col(Math.min(xa, xb) - 0.05, Math.max(xa, xb) + 0.05, -1, 4.5, 'g');
    }
    // gallery rail along the landing edge (upper level)
    B(9.2, 1.0, 0.08, 0, FY1 + 0.5, -1, glass); B(9.2, 0.08, 0.12, 0, FY1 + 1.05, -1, accent); col(-4.6, 4.6, -1.1, -0.9, 'u');
    for (const sx of [-1, 1]) { B(0.08, 1.0, 20, sx * 7, FY1 + 0.5, 9.5, glass); col(sx * 7 - 0.1, sx * 7 + 0.1, -1, Z1, 'u'); }
    // ---- great room: sofa, fireplace, piano, TV ----
    B(14, 0.02, 9, -17.5, FY0 + 0.01, 12, mat(0xb9a58c, { rough: 1 }));
    B(8, 0.5, 1.1, -18, FY0 + 0.25, 15.8, mat(0xe8e2d6)); B(8, 0.8, 0.3, -18, FY0 + 0.6, 16.4, mat(0xe8e2d6)); B(1.1, 0.5, 4, -22.4, FY0 + 0.25, 13.8, mat(0xe8e2d6));
    for (const x of [-21, -19, -17, -15]) sit(x, 15.6, Math.PI, FY0 + 0.5, 'Sit on the sofa');
    B(3, 0.4, 1.6, -18, FY0 + 0.2, 12.6, oak);
    B(0.6, 3.2, 4, X0 + 0.5, 1.6, 10, stone); B(0.3, 1.0, 2.4, X0 + 0.75, 0.75, 10, mat(0xff7a1c, { emissive: 0xff5a00, ei: 2 }));   // fireplace
    B(0.08, 1.4, 2.6, -7.25, 2.2, 8, dark); act(-8.5, 8, 1.6, 'Watch the TV', () => toast('📺 The news, then a cookery show. The sound system in here is incredible.'));
    B(1.6, 1.0, 2.2, -11, FY0 + 0.5, 17, mat(0x111111, { metal: 0.3, rough: 0.2 })); act(-11, 15.4, 1.4, 'Play the grand piano', () => toast('🎹 You play a few bars. It echoes up into the foyer.'));
    col(-12.6, -9.4, 15.8, 18.2, 'g'); col(-22.2, -13.8, 15.1, 16.6, 'g');
    // ---- chef's kitchen and dining for twelve ----
    B(6, 0.95, 2, -18, FY0 + 0.47, -3, white2); B(6.2, 0.06, 2.2, -18, FY0 + 0.98, -3, marble); col(-21, -15, -4, -2, 'g');
    for (const x of [-20, -18, -16]) { Cy(0.22, 0.22, 0.08, x, 0.8, -1.4, oak, 10); Cy(0.04, 0.04, 0.75, x, 0.4, -1.4, accent, 6); sit(x, -1.4, Math.PI, 0.8, 'Sit at the kitchen island'); }
    B(16, 0.95, 0.7, -19.5, FY0 + 0.47, Z0 + 0.65, white2); B(16, 0.06, 0.8, -19.5, FY0 + 0.98, Z0 + 0.7, marble); B(16, 0.9, 0.4, -19.5, 2.4, Z0 + 0.45, white2); col(-27.5, -11.5, Z0, Z0 + 1.0, 'g');
    B(1.2, 2.3, 0.8, -26.6, 1.25, -5, mat(0xc9ced4, { metal: 0.6 })); col(-27.2, -26, -5.4, -4.6, 'g');
    act(-20, -5, 2.2, 'Raid the chef\'s fridge', () => ctx.eat ? ctx.eat(30, 0, '🍱 Leftover sushi, a slice of cake and fresh orange juice.') : toast('🍱 You help yourself.'));
    B(1.6, 0.08, 6.5, -10.5, 0.82, -5, oak); for (const z of [-7.5, 2.5]) B(0.1, 0.8, 0.1, -10.5, 0.4, -5 + (z < 0 ? -3 : 3), oak); col(-11.3, -9.7, -8.25, -1.75, 'g');
    for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { const z = -7.6 + k * 1.3; B(0.5, 0.5, 0.5, -10.5 + sd * 1.1, 0.5, z, mat(0xe8e2d6)); B(0.08, 0.6, 0.5, -10.5 + sd * 1.35, 0.95, z, mat(0xe8e2d6)); sit(-10.5 + sd * 1.1, z, sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0.75, 'Sit at the dining table'); }
    // ---- cinema: dark, stepped rows of recliners, a big screen that plays films, star ceiling, candy bar ----
    B(20.6, 0.02, 15.6, 17.5, FY0 + 0.012, 12, carpet);
    B(0.1, FY1 - 0.4, 15.4, X1 - 0.2, (FY1 - 0.3) / 2, 12, mat(0x15121b));
    B(20.6, 0.06, 15.6, 17.5, FY1 - 0.36, 12, mat(0x0d0b14));
    for (let k = 0; k < 40; k++) B(0.06, 0.02, 0.06, 8 + (k * 7.3) % 19.5, FY1 - 0.38, 4.6 + (k * 3.7) % 15, mat(0xffffff, { emissive: 0xffffff, ei: 2 }));
    const scv = document.createElement('canvas'); scv.width = 384; scv.height = 192; const sx2 = scv.getContext('2d'); sx2.fillStyle = '#0a0a0a'; sx2.fillRect(0, 0, 384, 192);
    const stex = new THREE.CanvasTexture(scv); stex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 3.4), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }));
    { const [x, z] = W(X1 - 0.4, 12); screen.position.set(x, 2.1, z); screen.rotation.y = ry(-Math.PI / 2); scene.add(screen); }
    for (let r = 0; r < 3; r++) { const lx = 12 + r * 3.2, y = FY0 + r * 0.35; if (r) { B(2.8, r * 0.35, 13, lx, r * 0.175 + FY0 / 2, 12, carpet); col(lx - 1.45, lx + 1.45, 5.5, 18.5, 'g'); }
      for (let k = 0; k < 4; k++) { const lz = 7 + k * 3.2; B(1.0, 0.5, 1.0, lx, y + 0.25, lz, mat(0x5a1c22, { rough: 0.6 })); B(0.3, 0.9, 1.0, lx - 0.45, y + 0.7, lz, mat(0x5a1c22, { rough: 0.6 })); for (const d of [-0.55, 0.55]) B(1.0, 0.65, 0.18, lx, y + 0.33, lz + d, mat(0x3a1216)); sit(lx, lz, -Math.PI / 2, y + 0.55, 'Sit in a recliner'); } }
    B(3, 1.0, 0.8, 9, FY0 + 0.5, 19, mat(0xd63031)); B(3.2, 0.06, 1.0, 9, 1.07, 19, white2); col(7.5, 10.5, 18.5, 19.5, 'g');
    act(9, 17.6, 1.4, 'Grab popcorn at the candy bar', () => ctx.eat ? ctx.eat(8, 0, '🍿 A tub of popcorn and some pick-and-mix.') : toast('🍿 Popcorn.'));
    const film = { on: false, t: 0, title: '' };
    const FILMS = ['THE LAST HEIST', 'OCEAN OF STARS', 'MIDNIGHT IN WESTHAVEN', 'ROBOT SUMMER', 'THE LONG DRIVE HOME'];
    act(12, 4.9, 2.2, () => film.on ? 'Stop the film' : 'Start a film', () => { film.on = !film.on; film.t = 0; film.title = FILMS[Math.floor(Math.random() * FILMS.length)]; toast(film.on ? `🎬 Lights down. Now showing: ${film.title}. Take a seat.` : '🎬 Lights up.'); if (!film.on) { sx2.fillStyle = '#0a0a0a'; sx2.fillRect(0, 0, 384, 192); stex.needsUpdate = true; } });
    // ---- games room and bar, with a gym ----
    B(2.6, 0.8, 1.4, 17, FY0 + 0.4, -3, mat(0x1e6b3a)); B(2.8, 0.1, 1.6, 17, 0.85, -3, oak); col(15.6, 18.4, -3.8, -2.2, 'g');
    act(17, -1.4, 1.8, 'Play pool', () => { const pot = Math.random(); toast(pot < 0.15 ? '🎱 You pot the black. Game over… you win!' : pot < 0.6 ? '🎱 Clack. Two balls down.' : '🎱 You miss everything. Classic.'); });
    B(6, 1.1, 0.7, 24, FY0 + 0.55, 1.5, oak); B(6.2, 0.06, 0.9, 24, 1.2, 1.5, marble); B(6, 2, 0.3, 24, 2.4, 3.6, mat(0x2a1a10)); for (let k = 0; k < 9; k++) Cy(0.05, 0.05, 0.3, 21.4 + k * 0.6, 2.0 + (k % 2) * 0.5, 3.4, [0x6b8e23, 0x8b0000, 0xd4af37][k % 3], 6);
    col(21, 27, 1.1, 1.9, 'g'); for (const x of [22, 24, 26]) { Cy(0.22, 0.22, 0.08, x, 0.85, 0.6, mat(0xd63031), 10); sit(x, 0.6, 0, 0.85, 'Sit at the bar'); }
    act(24, 0.2, 1.6, 'Pour a drink at the bar', () => toast('🍹 A virgin mojito with lots of ice. Fancy.'));
    B(1, 1.2, 2.2, 10, FY0 + 0.6, -9, mat(0x2d3436)); B(0.8, 0.1, 1.8, 10, 1.25, -9, mat(0x111111)); col(9.5, 10.5, -10.1, -7.9, 'g');
    for (const x of [13, 14.6]) { B(1.4, 0.1, 0.1, x, 1.0, -10.6, mat(0xc0c4c8, { metal: 0.8 })); for (const d of [-0.6, 0.6]) Cy(0.18, 0.18, 0.06, x + d, 1.0, -10.6, mat(0x111111), 12); }
    act(11.5, -7.6, 1.8, 'Work out in the gym', () => { if (ctx.workout) ctx.workout(); else toast('🏋️ Twenty minutes on the treadmill and some weights. Feeling strong.'); });
    // ---- upper floor: landing, master suite (west), guest suites (east) ----
    const u = { y0: FY1, h: ROOF - FY1 - 0.2, level: 'u' };
    wallZ(-7, Z0, -1, [[-8, -5.6]], u); wallZ(7, Z0, -1, [[-8, -5.6]], u);
    wallZ(-7, -1, Z1, [], { ...u }); wallZ(7, -1, Z1, [], { ...u });
    wallX(4, X0, -7, [[-16, -13.6]], u); wallX(4, 7, X1, [[13.6, 16]], u); wallX(-4, 7, X1, [[19, 21.4]], u);
    // master bedroom (front west): bed, lounge chairs; master bath + closet (back west)
    B(4.2, 0.6, 4.6, -18, FY1 + 0.3, 16.5, mat(0xf3efe6)); B(4.4, 1.6, 0.25, -18, FY1 + 0.8, 18.9, mat(0x6b5a4a)); B(4.4, 0.25, 1.4, -18, FY1 + 0.72, 15, mat(0x8a6f9a)); col(-20.1, -15.9, 14.2, 19, 'u');
    act(-18, 13.4, 2.2, 'Sleep in the master bed', () => ctx.sleep ? ctx.sleep() : toast('😴 The best night\'s sleep of your life.'), FY1);
    for (const x of [-24, -12]) { B(1.0, 0.6, 1.0, x, FY1 + 0.3, 7, mat(0xd8cfc0)); sit(x, 7, 0, FY1 + 0.55, 'Sit in the armchair'); }
    { const [x, z] = W(-22, -6); const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 1.2, 6, 14), mat(0xffffff, { rough: 0.2 })); tub.rotation.z = Math.PI / 2; tub.rotation.y = ry(0); tub.scale.set(1, 1, 0.6); tub.position.set(x, FY1 + 0.45, z); scene.add(tub); }
    col(-23.5, -20.5, -6.8, -5.2, 'u'); act(-22, -4.2, 1.8, 'Take a bath', () => ctx.rest ? ctx.rest(18, '🛁 A long soak in the freestanding tub, looking out over the pool.') : toast('🛁 Bliss.'), FY1);
    B(4, 0.9, 0.6, -14, FY1 + 0.45, Z0 + 0.6, white2); B(4.2, 1.4, 0.06, -14, FY1 + 1.7, Z0 + 0.35, mat(0xcfe4ee, { metal: 0.9, rough: 0.05 })); col(-16, -12, Z0, Z0 + 0.9, 'u');
    act(-14, Z0 + 1.6, 1.4, 'Wash your hands', () => ctx.chore ? ctx.chore('handwash') : toast('🧼 Squeaky clean.'), FY1);
    for (let k = 0; k < 6; k++) B(0.6, 2.2, 0.5, -26.8, FY1 + 1.1, -10 + k * 1.0, mat([0x2c3e50, 0x8e44ad, 0xc0392b, 0xecf0f1][k % 4])); col(-27.3, -26.3, -10.5, -4.5, 'u');
    // guest suites
    for (const [lz, lab] of [[12, 'Sleep in the guest suite'], [-8, 'Sleep in the guest suite']]) { B(3.2, 0.55, 4, 20, FY1 + 0.28, lz, mat(0xf3efe6)); B(3.4, 1.3, 0.2, 20, FY1 + 0.7, lz + (lz > 0 ? 2.1 : -2.1), mat(0x6b5a4a)); col(18.4, 21.6, lz - 2, lz + 2, 'u'); act(20, lz + (lz > 0 ? -2.8 : 2.8), 2, lab, () => ctx.sleep ? ctx.sleep() : toast('😴 Zzz.'), FY1); }
    B(6, 0.02, 4, 0, FY1 + 0.01, -7, mat(0x8a6f9a, { rough: 1 })); for (const x of [-2, 2]) { B(1.2, 0.5, 1.2, x, FY1 + 0.25, -8, mat(0xd8cfc0)); sit(x, -8, Math.PI, FY1 + 0.5, 'Sit on the landing'); }
    // ceiling lights both floors
    for (let x = X0 + 4; x < X1; x += 7) for (let z = Z0 + 4; z < Z1; z += 7) { if (Math.abs(x) > 7.5) B(1.2, 0.05, 1.2, x, FY1 - 0.36, z, lamp); B(1.2, 0.05, 1.2, x, ROOF - 0.25, z, lamp); }

    // ---------------- garage wing (auto gallery): x -60..-28 ----------------
    const GX0 = -60, GH = 5.2;
    B(-28 - GX0, FY0, Z1 - Z0, (GX0 - 28) / 2, FY0 / 2, (Z0 + Z1) / 2, mat(0x8d949c, { rough: 0.3 }));
    wallX(Z0, GX0, X0, [], { h: GH }); wallZ(GX0, Z0, Z1, [], { h: GH });
    const bays = [-54, -45, -36];
    { let a = GX0; for (const bx of bays) { if (bx - 3.5 - a > 0.02) { B(bx - 3.5 - a, GH, 0.3, (a + bx - 3.5) / 2, GH / 2, Z1, body); col(a, bx - 3.5, Z1 - 0.15, Z1 + 0.15); } B(7, GH - 3.2, 0.3, bx, 3.2 + (GH - 3.2) / 2, Z1, body); a = bx + 3.5; } if (X0 - a > 0.02) { B(X0 - a, GH, 0.3, (a + X0) / 2, GH / 2, Z1, body); col(a, X0, Z1 - 0.15, Z1 + 0.15); } }
    B(-28 - GX0 + 1, 0.4, Z1 - Z0 + 1, (GX0 - 28) / 2, GH + 0.2, (Z0 + Z1) / 2, trim);
    B(-28 - GX0 - 0.4, 0.04, Z1 - Z0 - 0.4, (GX0 - 28) / 2, GH - 0.03, (Z0 + Z1) / 2, ceil);
    for (const bx of bays) { B(1.2, 0.05, 8, bx, GH - 0.06, 6, lamp); B(5.5, 0.01, 9, bx, FY0 + 0.01, 7, mat(0x6d747c, { rough: 0.2 })); }
    { const r = rect(GX0, X0, Z0, Z1); planeBlocks?.push({ ...r, bottom: GH, top: GH + 0.4 }); }
    // tool wall, a motorbike on a plinth, a display car on a turntable at the back
    B(10, 2.4, 0.2, -44, 1.8, Z0 + 0.3, mat(0xb03a2e)); for (let k = 0; k < 12; k++) B(0.08, 0.5, 0.06, -48.5 + k * 0.8, 1.8, Z0 + 0.45, mat(0xc0c4c8, { metal: 0.8 }));
    Cy(3, 3, 0.25, -36, 0.25, -5, mat(0x2b2f33, { metal: 0.5 }), 32);
    const rolls = bays.map(bx => { const door = new THREE.Mesh(boxGeo, mat(0xdfe3e6, { metal: 0.4, rough: 0.35 })); const [x, z] = W(bx, Z1 + 0.05); door.position.set(x, 1.6, z); door.rotation.y = R; door.scale.set(6.8, 3.2, 0.1); scene.add(door); return { door, bx, c: col(bx - 3.5, bx + 3.5, Z1 - 0.1, Z1 + 0.1), open: 0, pos: new THREE.Vector3(x, 0, z) }; });
    // three cars to take out (and a display car on the turntable)
    const cars = [];
    if (makeVehicle) {
      const pick = [['supercar', 0xc0392b], ['suv', 0x1d1d1d], ['sports', P.accent], ['supercar', 0xf1c40f]];
      bays.forEach((bx, k) => { const [style, c] = pick[(k + homes.length) % pick.length]; const v = makeVehicle('car', c, style); const [x, z] = W(bx, 7); v.group.position.set(x, v.group.position.y || 0.45, z); v.group.rotation.y = ry(0); cars.push(v); });
      const show = makeVehicle('car', 0xecf0f1, 'supercar'); const [x, z] = W(-36, -5); show.group.position.set(x, 0.75, z); show.group.rotation.y = ry(0.6); show.turntable = true; cars.push(show);
    }
    act(-45, 2, 2.5, 'Look round the auto gallery', () => toast('🏎️ Three cars ready to go and one on the turntable. Walk up to one and press E to get in: the roller doors open as you drive up.'));

    // ---------------- sports wing: x 28..62 ----------------
    const SX1 = 62, SZ0 = -16, SH = 9.5;
    B(SX1 - X1, FY0, Z1 - SZ0, (X1 + SX1) / 2, FY0 / 2, (SZ0 + Z1) / 2, P.wing === 'court' ? mat(0xc8935a, { rough: 0.45 }) : mat(0xe6edf0, { rough: 0.4 }));
    wallX(Z1, X1, SX1, [[44, 47]], { h: SH, wins: [34, 40, 52, 58].map(x => [x - 2, x + 2, 4.5, 8.5]) }); wallX(SZ0, X1, SX1, [], { h: SH, wins: [34, 40, 46, 52, 58].map(x => [x - 2, x + 2, 4.5, 8.5]) }); wallZ(SX1, SZ0, Z1, [], { h: SH, wins: [-10, -2, 6, 14].map(z => [z - 2.5, z + 2.5, 4.5, 8.5]) }); wallZ(X1, SZ0, Z0, [], { h: SH });
    B(SX1 - X1 + 1, 0.5, Z1 - SZ0 + 1, (X1 + SX1) / 2, SH + 0.25, (SZ0 + Z1) / 2, trim);
    B(SX1 - X1 - 0.4, 0.04, Z1 - SZ0 - 0.4, (X1 + SX1) / 2, SH - 0.03, (SZ0 + Z1) / 2, ceil);
    for (let x = X1 + 5; x < SX1; x += 8) for (let z = SZ0 + 5; z < Z1; z += 8) B(2.4, 0.06, 0.6, x, SH - 0.1, z, lamp);
    { const r = rect(X1, SX1, SZ0, Z1); planeBlocks?.push({ ...r, bottom: SH, top: SH + 0.5 }); }
    if (P.wing === 'court') {
      const line = mat(0xffffff);
      const cx = 45, cz = 2, L = 28, Wd = 15;
      for (const [w, d, x, z] of [[L, 0.08, cx, cz - Wd / 2], [L, 0.08, cx, cz + Wd / 2], [0.08, Wd, cx - L / 2, cz], [0.08, Wd, cx + L / 2, cz], [0.08, Wd, cx, cz]]) B(w, 0.01, d, x, FY0 + 0.006, z, line);
      { const [x, z] = W(cx, cz); const ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.83, 32), line.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(x, FY0 + 0.012, z); scene.add(ring); }
      for (const e of [-1, 1]) { const bx = cx + e * (L / 2 - 1.2); B(0.1, 1.05, 1.8, bx + e * 0.3, 3.45, cz, mat(0xffffff, { opacity: 0.85 })); { const [x, z] = W(bx - e * 0.1, cz); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), mat(0xff6b1a)); rim.rotation.x = Math.PI / 2; rim.position.set(x, 3.05, z); scene.add(rim); }
        B(0.2, 3.6, 0.2, bx + e * 1.0, 1.8, cz, mat(0x333333)); B(1.0, 0.15, 0.15, bx + e * 0.55, 3.3, cz, mat(0x333333));
        for (const d of [[-1, 0], [1, 0]]) { const [x, z] = W(cx + e * (L / 2 - 5.8), cz); void d; void x; void z; }
        const [fx, fz] = W(cx + e * (L / 2 - 5.8), cz); void fx; void fz; }
      let streak = 0;
      act(cx + (L / 2 - 5.8), cz, 2.2, 'Shoot free throws', () => { const made = Math.random() < 0.55 + Math.min(0.25, streak * 0.04); streak = made ? streak + 1 : 0; toast(made ? `🏀 Swish! ${streak} in a row.` : '🏀 Off the rim. Streak over.'); });
      act(cx - (L / 2 - 5.8), cz, 2.2, 'Play one-on-one with the house trainer', () => { const you = 5 + Math.floor(Math.random() * 7), him = 5 + Math.floor(Math.random() * 7); toast(you > him ? `🏀 You win ${you}–${him}! "Not bad at all."` : you === him ? `🏀 ${you}–${him}. Next basket wins… he takes it.` : `🏀 He wins ${him}–${you}. "Again tomorrow?"`); });
      { const [x, z] = W(cx - (L / 2 - 4), cz + 2); stander(x, z, ry(Math.PI / 2), { outfit: 0xe67e22, task: 'idle' }); }
      for (let r = 0; r < 3; r++) { B(14, 0.4 + r * 0.45, 0.8, cx, (0.4 + r * 0.45) / 2, SZ0 + 1.2 + r * 0.8, mat(0x2c3e50)); for (let k = 0; k < 6; k++) sit(cx - 6 + k * 2.4, SZ0 + 1.2 + r * 0.8, 0, FY0 + 0.4 + r * 0.45, 'Sit in the stands'); }
      col(cx - 7, cx + 7, SZ0 + 0.6, SZ0 + 3.6);
      B(2.7, 0.76, 1.5, 34, 0.76 / 2, 15, mat(0x1e5f8a)); B(2.8, 0.05, 1.55, 34, 0.78, 15, mat(0x1e5f8a)); B(0.02, 0.16, 1.6, 34, 0.86, 15, white2); col(32.6, 35.4, 14.2, 15.8);
      act(34, 13.4, 1.8, 'Play table tennis', () => toast(Math.random() < 0.5 ? '🏓 11–8 to you!' : '🏓 Lost 9–11. So close.'));
    } else {
      // indoor pool and spa
      const px0 = 33, px1 = 58, pz0 = -9, pz1 = 3;
      B(px1 - px0 + 3, 0.12, pz1 - pz0 + 3, (px0 + px1) / 2, FY0 + 0.06, (pz0 + pz1) / 2, mat(0xf2f0ea, { rough: 0.6 }));
      { const [x, z] = W((px0 + px1) / 2, (pz0 + pz1) / 2); const w = new THREE.Mesh(new THREE.PlaneGeometry(px1 - px0, pz1 - pz0), mat(0x2e9fd6, { emissive: 0x0f5f8a, ei: 0.5, opacity: 0.85, rough: 0.05 })); w.rotation.x = -Math.PI / 2; w.position.set(x, FY0 + 0.1, z); scene.add(w); }
      poolZones?.push(rect(px0, px1, pz0, pz1));
      for (let k = 0; k < 5; k++) { const lx = 35 + k * 5; B(0.8, 0.3, 2, lx, FY0 + 0.15, 8, white2); B(0.8, 0.5, 0.5, lx, FY0 + 0.45, 9, white2); sit(lx, 8, Math.PI, FY0 + 0.35, 'Lie on a lounger'); }
      B(4, 2.6, 3.5, 58, 1.3, 15, mat(0x9a6b42)); B(1.2, 2.2, 0.1, 58, 1.1, 13.2, mat(0x6b4a2a)); col(56, 60, 13.25, 16.75);
      act(56, 12, 1.8, 'Sit in the sauna', () => ctx.rest ? ctx.rest(12, '🧖 Fifteen minutes in the sauna, then the cold plunge. You feel brand new.') : toast('🧖 Hot!'));
      { const [x, z] = W(36, 12); const hot = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.7, 24), mat(0xf2f0ea)); hot.position.set(x, 0.35, z); scene.add(hot); const hw = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), mat(0x6fd3ff, { emissive: 0x2e9fd6, ei: 0.6 })); hw.rotation.x = -Math.PI / 2; hw.position.set(x, 0.72, z); scene.add(hw); }
      act(36, 14.4, 2, 'Get in the spa pool', () => ctx.rest ? ctx.rest(10, '♨️ Bubbles and warm water. You could stay all day.') : toast('♨️ Lovely.'));
      act((px0 + px1) / 2, pz1 + 1.6, 2.5, 'Read the pool rules', () => toast('🏊 Indoor pool, 25 m, 2 m deep at the far end. Walk in to swim.'));
    }

    // ---------------- outside the back: infinity pool, loungers, hot tub, (tennis) ----------------
    B(60, 0.1, 10, 0, 0.05, -17, mat(0xe2ddd2, { rough: 0.7 }));                        // terrace
    const qx0 = -14, qx1 = 14, qz0 = -32, qz1 = -22;
    B(qx1 - qx0 + 2, 0.4, qz1 - qz0 + 2, 0, 0.2 - 0.25, (qz0 + qz1) / 2, mat(0xe2ddd2));
    { const [x, z] = W(0, (qz0 + qz1) / 2); const w = new THREE.Mesh(new THREE.PlaneGeometry(qx1 - qx0, qz1 - qz0), mat(0x2e9fd6, { emissive: 0x0f5f8a, ei: 0.4, opacity: 0.88, rough: 0.05 })); w.rotation.x = -Math.PI / 2; w.position.set(x, 0.06, z); scene.add(w); }
    B(qx1 - qx0, 0.5, 0.3, 0, 0.0, qz0 - 0.2, mat(0x6fb7d9));                         // the vanishing edge
    poolZones?.push(rect(qx0, qx1, qz0, qz1));
    for (let k = 0; k < 6; k++) { const lx = -12.5 + k * 5; B(0.8, 0.3, 2, lx, 0.15, -19, white2); B(0.8, 0.5, 0.5, lx, 0.45, -18, white2); sit(lx, -19, 0, 0.35, 'Lie on a lounger'); if (k % 2) { Cy(0.03, 0.03, 2.4, lx + 2.5, 1.2, -19, mat(0xdddddd), 6); Cy(1.4, 0.05, 0.5, lx + 2.5, 2.5, -19, mat(P.accent), 12); } }
    { const [x, z] = W(20, -27); const hot = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.8, 24), stone); hot.position.set(x, 0.4, z); scene.add(hot); const hw = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), mat(0x6fd3ff, { emissive: 0x2e9fd6, ei: 0.6 })); hw.rotation.x = -Math.PI / 2; hw.position.set(x, 0.81, z); scene.add(hw); colliders.push({ circleX: x, circleZ: z, circleRadius: 2, minX: x - 2, maxX: x + 2, minZ: z - 2, maxZ: z + 2 }); }
    act(20, -24, 2.2, 'Relax in the hot tub', () => ctx.rest ? ctx.rest(10, '♨️ Warm bubbles under the open sky.') : toast('♨️ Ahh.'));
    // pool house with an outdoor kitchen
    B(10, 3.2, 6, -24, 1.6, -30, body); B(11, 0.4, 7, -24, 3.4, -30, trim); col(-29, -19, -33, -27); B(6, 1, 1, -24, 0.5, -26.4, oak);
    act(-24, -25.4, 1.8, 'Grill something at the outdoor kitchen', () => ctx.eat ? ctx.eat(25, 0, '🍔 Burgers on the grill by the pool.') : toast('🍔 Sizzle.'));
    { const [x, z] = W(-6, -20.5); stander(x, z, ry(0), { outfit: 0xffffff, task: 'idle' }); }
    if (P.wing === 'pool') {   // tennis court out back
      const tx = 45, tz = -38;
      B(36, 0.05, 18, tx, 0.025, tz, mat(0x3a7d5c, { rough: 0.8 })); B(24, 0.06, 11, tx, 0.03, tz, mat(0x2f6fa8, { rough: 0.8 }));
      for (const [w, d, x, z] of [[24, 0.08, tx, tz - 5.5], [24, 0.08, tx, tz + 5.5], [0.08, 11, tx - 12, tz], [0.08, 11, tx + 12, tz], [12.8, 0.08, tx, tz]]) B(w, 0.01, d, x, 0.065, z, mat(0xffffff));
      B(0.05, 1.0, 12, tx, 0.5, tz, mat(0xeeeeee, { opacity: 0.6 })); col(tx - 0.1, tx + 0.1, tz - 6, tz + 6);
      wallX(tz - 9, tx - 18, tx + 18, [], { h: 3, m: mat(0x2b3a2f, { opacity: 0.5 }), t: 0.08 }); wallX(tz + 9, tx - 18, tx + 18, [[tx - 2, tx + 2]], { h: 3, m: mat(0x2b3a2f, { opacity: 0.5 }), t: 0.08, doorH: 3.1 });
      wallZ(tx - 18, tz - 9, tz + 9, [], { h: 3, m: mat(0x2b3a2f, { opacity: 0.5 }), t: 0.08 }); wallZ(tx + 18, tz - 9, tz + 9, [], { h: 3, m: mat(0x2b3a2f, { opacity: 0.5 }), t: 0.08 });
      act(tx - 8, tz + 2, 2.5, 'Play tennis against the ball machine', () => toast(Math.random() < 0.5 ? '🎾 6–4 to you. Great serve.' : '🎾 The machine wins 6–3. It never gets tired.'));
    }

    // register for buying, the map and the indoor camera
    const hb = rect(GX0, SX1, SZ0, Z1);
    civicBuildings?.push({ type: 'mansion', name: P.name, x: (hb.minX + hb.maxX) / 2, z: (hb.minZ + hb.maxZ) / 2, ...hb, noDoor: true });

    // the front door: a double door that swings in as you come up (and stops against anyone in the way)
    const fd = { leaves: [], open: 0, pos: new THREE.Vector3(W(0, Z1)[0], 0, W(0, Z1)[1]) };
    for (const sd of [-1, 1]) { const [x, z] = W(sd * 2, Z1); const hinge = new THREE.Group(); hinge.position.set(x, 0, z); hinge.rotation.y = ry(0); scene.add(hinge);
      const leaf = new THREE.Mesh(boxGeo, mat(0x3a2414, { rough: 0.5 })); leaf.scale.set(2, 3.35, 0.12); leaf.position.set(-sd * 1, 1.7, 0); hinge.add(leaf);
      const h2 = new THREE.Mesh(boxGeo, accent); h2.scale.set(0.06, 0.6, 0.1); h2.position.set(-sd * 1.8, 1.2, 0.1); hinge.add(h2);
      fd.leaves.push({ hinge, sd, base: hinge.rotation.y }); }
    fd.collider = col(-2, 2, Z1 - 0.1, Z1 + 0.1);

    return { P, gate, fd, rolls, cars, screen, sx2, stex, film, center: new THREE.Vector3(P.x, 0, P.z) };
  }

  // ================= walking about: the upper floors and the stairs =================
  const inR = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  function groundAt(x, z, y = 0) {
    if (x < 1035 || x > 1290 || z < 130 || z > 800) return null;
    for (const r of ramps) if (inR(r, x, z)) {
      const lz = (x - r.cx) * r.fX + (z - r.cz) * r.fZ;   // along the house's front axis: the ramp runs from lz 9 (bottom) to -1 (top)
      const t = (9 - lz) / 10, h = FY0 + (FY1 - FY0) * Math.min(1, Math.max(0, t));
      if (y > h - 1.1) return h; }
    if (y > FY1 - 1.2) { if (voids.some(r => inR(r, x, z))) return null; if (floors.some(r => inR(r, x, z))) return FY1; }
    return null;
  }

  // ================= per frame: gates, doors, roller doors, the barrier, films =================
  const tmp = new THREE.Vector3();
  let filmDraw = 0;
  function update(dt, p, driving) {
    const who = driving ? driving.group.position : p;
    if (who.x < 900 || who.x > 1320 || who.z < 100 || who.z > 830) return;
    // barrier arms lift for anyone coming through
    const near = Math.abs(who.x - GATE_X) < 14 && Math.abs(who.z - LINK_Z) < 9;
    for (const a of arms) a.rotation.x = THREE.MathUtils.lerp(a.rotation.x, near ? -1.35 * Math.sign(a.position.z - LINK_Z) : 0, 1 - Math.exp(-4 * dt));
    K.update(dt, p, 70);
    for (const h of homes) {
      if (who.distanceTo(h.center) > 140) continue;
      // plot gate
      const gw = who.distanceTo(h.gate.pos) < (driving ? 16 : 6);
      h.gate.open += THREE.MathUtils.clamp((gw ? 1 : 0) - h.gate.open, -dt * 0.8, dt * 0.8);
      for (const l of h.gate.leaves) l.leaf.rotation.y = l.sd * h.gate.open * 1.5;
      const gi = colliders.indexOf(h.gate.collider); if (h.gate.open > 0.6 && gi >= 0) colliders.splice(gi, 1); else if (h.gate.open < 0.3 && gi < 0) colliders.push(h.gate.collider);
      // front door (swings inward)
      const dn = !driving && p.distanceTo(h.fd.pos) < 3.6 && p.y < 2;
      const want = dn ? 1 : 0;
      let next = h.fd.open + THREE.MathUtils.clamp(want - h.fd.open, -dt * 2, dt * 2);
      for (const l of h.fd.leaves) {   // each leaf swings inwards, and stops against anyone in its way
        const target = -l.sd * next * 1.4, cur = l.hinge.rotation.y - l.base;
        if (ctx.sweep) { const r = ctx.sweep(l.hinge.position.x, l.hinge.position.z, -l.sd * Math.cos(l.base), l.sd * Math.sin(l.base), 2, cur, target); l.hinge.rotation.y = l.base + r.angle; if (r.by && p.distanceTo(h.fd.pos) < 5) ctx.blocked?.(r.by); }
        else l.hinge.rotation.y = l.base + target;
      }
      h.fd.open = next;
      const fi = colliders.indexOf(h.fd.collider); if (h.fd.open > 0.5 && fi >= 0) colliders.splice(fi, 1); else if (h.fd.open < 0.2 && fi < 0) colliders.push(h.fd.collider);
      // garage roller doors: up for you or a car close by (inside or out)
      for (const r of h.rolls) {
        const close = who.distanceTo(r.pos) < (driving ? 11 : 4.5);
        r.open += THREE.MathUtils.clamp((close ? 1 : 0) - r.open, -dt * 0.9, dt * 0.9);
        r.door.scale.y = Math.max(0.15, 3.2 * (1 - r.open)); r.door.position.y = 3.2 - r.door.scale.y / 2;
        const ri = colliders.indexOf(r.c); if (r.open > 0.85 && ri >= 0) colliders.splice(ri, 1); else if (r.open < 0.6 && ri < 0) colliders.push(r.c);
      }
      for (const c of h.cars) if (c.turntable && c !== driving) c.group.rotation.y += dt * 0.25;
      // the cinema screen
      if (h.film.on && (filmDraw -= dt) <= 0) {
        filmDraw = 1 / 15; h.film.t += 1 / 15;
        const g = h.sx2, t = h.film.t; const hue = (t * 12) % 360;
        const grd = g.createLinearGradient(0, 0, 384, 192); grd.addColorStop(0, `hsl(${hue},55%,${18 + 8 * Math.sin(t * 0.7)}%)`); grd.addColorStop(1, `hsl(${(hue + 120) % 360},60%,12%)`); g.fillStyle = grd; g.fillRect(0, 0, 384, 192);
        for (let k = 0; k < 14; k++) { const x = (k * 53 + t * (20 + k * 3)) % 420 - 20, yy = 40 + (k * 37) % 120; g.fillStyle = `hsla(${(hue + k * 20) % 360},80%,70%,.6)`; g.beginPath(); g.arc(x, yy, 6 + (k % 4) * 3, 0, 7); g.fill(); }
        g.fillStyle = '#000'; g.fillRect(0, 150, 384, 42); g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
        g.fillText(t < 6 ? h.film.title : ['"We only get one shot at this."', '"Did you hear that?"', '"Follow the lights."', '"Not without you."', '"Hold on!"'][Math.floor(t / 5) % 5], 192, 176);
        h.stex.needsUpdate = true;
      }
    }
    void tmp;
  }
  return { groundAt, update, homes, plots: PLOTS };
}
