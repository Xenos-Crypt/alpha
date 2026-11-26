// Highcliff Hills: a real hill west of town, with a road that winds round it at a gentle,
// realistic gradient (about 4%) up to a cul-de-sac of gated mansions on the summit.
// The ground actually rises: walking and driving go up and down the slope (groundAt).
import * as THREE from 'three';

export const HILL = { x: -590, z: 410, top: 24, flat: 46, base: 132 };
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
export function hillHeight(x, z) {
  const r = Math.hypot(x - HILL.x, z - HILL.z);
  if (r >= HILL.base) return 0;
  return HILL.top * (1 - smooth((r - HILL.flat) / (HILL.base - HILL.flat)));
}
// The spiral road: from the foot on the east side, one full turn anticlockwise, up to the summit.
const ROAD_W = 9, TURNS = 1;
export { ROAD_W };
export const ROAD_END_A = Math.PI / 4;   // the road reaches the summit between two mansions
export function roadPoint(t) {   // t: 0 (bottom) .. 1 (top)
  const a = ROAD_END_A + (t - 1) * TURNS * Math.PI * 2, r = THREE.MathUtils.lerp(HILL.base - 6, HILL.flat + 6, t);
  return { x: HILL.x + Math.cos(a) * r, z: HILL.z + Math.sin(a) * r, r, a };
}

export function buildHills({ doors, basement, scene, colliders, civicBuildings, interactables, makeTex, toast, destinations, playerPos, sitSpots, planeBlocks, chore, sleep }) {
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, map: o.map ?? null, transparent: o.opacity != null, opacity: o.opacity ?? 1, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1 })); return mats.get(k); };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, c, solid = false, ry = 0) => { const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return m; };

  // ---- terrain: a displaced grass grid
  const grass = makeTex(256, 256, g => { g.fillStyle = '#5f7a3e'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 5000; i++) { g.fillStyle = ['#6b8748', '#55703a', '#738f50'][i % 3]; g.fillRect((i * 73) % 256, (i * 97 + (i >> 8) * 19) % 256, 1, 3); } });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(18, 18);
  const size = HILL.base * 2 + 10, seg = 90;
  const tg = new THREE.PlaneGeometry(size, size, seg, seg); tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, hillHeight(pos.getX(i) + HILL.x, pos.getZ(i) + HILL.z) + 0.04);
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, mat(0xffffff, { map: grass, rough: 1 })); terrain.position.set(HILL.x, 0, HILL.z); terrain.receiveShadow = true; scene.add(terrain);

  // ---- the winding road (a ribbon that follows the ground, with kerbs, centre line and lamps)
  const N = 220, road = [], line = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = roadPoint(t), q = roadPoint(Math.min(1, t + 0.002)), dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    for (const s of [-1, 1]) { const x = p.x + nx * s * ROAD_W / 2, z = p.z + nz * s * ROAD_W / 2; road.push(x, hillHeight(x, z) + 0.12, z); }
    line.push(p.x, hillHeight(p.x, p.z) + 0.14, p.z);
  }
  const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(road, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  scene.add(new THREE.Mesh(rg, mat(0x34383c, { rough: 0.9 })));
  // dashed centre line
  for (let i = 0; i < N; i += 3) { const a = new THREE.Vector3(line[i * 3], line[i * 3 + 1], line[i * 3 + 2]), b = new THREE.Vector3(line[(i + 1) * 3], line[(i + 1) * 3 + 1], line[(i + 1) * 3 + 2]); const m = new THREE.Mesh(geo, mat(0xf2f2f2)); m.scale.set(0.18, 0.02, a.distanceTo(b)); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); scene.add(m); }
  // street lamps every so often on the outside of the bend
  for (let i = 8; i < N; i += 18) { const p = roadPoint(i / N), out = (p.r + ROAD_W / 2 + 1.2) / p.r, x = HILL.x + (p.x - HILL.x) * out, z = HILL.z + (p.z - HILL.z) * out, y = hillHeight(x, z);
    B(0.15, 5, 0.15, x, y + 2.5, z, 0x2b2f33); B(0.5, 0.2, 0.5, x, y + 5, z, mat(0xfff1c4, { emissive: 0xfff1c4, ei: 1.5 })); }
  // approach road from the east, and the cul-de-sac at the top
  const foot = roadPoint(0);
  { const y = 0.12; B(170, 0.1, ROAD_W, foot.x + 85, y, foot.z, 0x34383c); for (let x = foot.x + 6; x < foot.x + 170; x += 8) B(3, 0.02, 0.18, x, y + 0.06, foot.z, 0xf2f2f2); }
  { const top = roadPoint(1), len = top.r - 15, mx = HILL.x + Math.cos(ROAD_END_A) * (15 + len / 2), mz = HILL.z + Math.sin(ROAD_END_A) * (15 + len / 2);   // last stretch into the cul-de-sac
    const m = B(ROAD_W, 0.1, len + 2, mx, HILL.top + 0.12, mz, 0x34383c); m.rotation.y = Math.atan2(Math.cos(ROAD_END_A), Math.sin(ROAD_END_A)); }
  const cul = new THREE.Mesh(new THREE.CircleGeometry(16, 40), mat(0x34383c)); cul.rotation.x = -Math.PI / 2; cul.position.set(HILL.x, HILL.top + 0.12, HILL.z); scene.add(cul);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 30), mat(0x4f7a3a)); island.position.set(HILL.x, HILL.top + 0.2, HILL.z); scene.add(island);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 1.2, 20), mat(0xd9d2c0)); fountain.position.set(HILL.x, HILL.top + 0.8, HILL.z); scene.add(fountain);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 20), mat(0x3fa9d6, { emissive: 0x1d6f9a, ei: 0.4 })); water.position.set(HILL.x, HILL.top + 1.42, HILL.z); scene.add(water);
  colliders.push({ circleX: HILL.x, circleZ: HILL.z, circleRadius: 5, minX: HILL.x - 5, maxX: HILL.x + 5, minZ: HILL.z - 5, maxZ: HILL.z + 5 });

  // ---- mansions round the cul-de-sac, each behind a wall with an automatic gate and a drive
  const gates = [];
  const MANSIONS = [
    { name: 'Highcliff Manor', a: Math.PI * 0.5, body: 0xf2ede0, roof: 0x3a3f45, accent: 0xd4af37 },
    { name: 'Villa Serena', a: Math.PI * 1.0, body: 0xe8d2b0, roof: 0x8a4a2a, accent: 0xffffff },
    { name: 'The Glass House', a: Math.PI * 1.5, body: 0xdfe5ea, roof: 0x22262b, accent: 0x9fd3ff },
    { name: 'Oakridge Estate', a: 0, body: 0xd9d2c0, roof: 0x2f4a3a, accent: 0x7a5636 },
  ];
  const Y = HILL.top;
  // ---- inside the mansions: a real two-storey house you walk into (local frame: x -10..10, z -10..2, front +z).
  // Ground floor: entrance hall, living room with a TV, kitchen and dining, a cloakroom toilet, and stairs up the
  // east wall. Upper floor: the master bedroom with an en-suite (bath, shower, toilet, basin), a second bedroom and
  // a sitting area. Windows are glass in real openings; the stairs are a real ramp (groundAt below).
  const FY = 3.5, TOP = 7, houses = [];
  const STAIR = { x0: 8.4, x1: 9.8, z0: -5.5, z1: 1.0 }, VOID = { x0: 8.4, x1: 9.8, z0: -5.3, z1: -1.65 };
  function house(g, m, { body, accent, L }) {
    const inv = g.matrixWorld.clone().invert(), toW = (lx, lz, y = 0) => new THREE.Vector3(lx, y, lz).applyMatrix4(g.matrixWorld);
    const rectW = (a, b, c, d) => { const p = toW(a, c), q = toW(b, d); return { minX: Math.min(p.x, q.x), maxX: Math.max(p.x, q.x), minZ: Math.min(p.z, q.z), maxZ: Math.max(p.z, q.z) }; };
    const col = (a, b, c, d, base) => { const r = rectW(a, b, c, d); if (base != null) r.baseYAt = () => Y + base; colliders.push(r); return r; };
    const act = (lx, lz, r, label, action, y = 0) => { const it = { pos: toW(lx, lz, Y + y), r, label, action }; it.pos.y = Y + y; interactables.push(it); return it; };
    const sit = (lx, lz, yaw, seatY, label) => { const p = toW(lx, lz); sitSpots?.push({ x: p.x, z: p.z, yaw: yaw + g.rotation.y, seatY: Y + seatY, label }); };
    const glassP = mat(0x9fc4d8, { opacity: 0.3, rough: 0.05, metal: 0.3 }), inner = mat(0xf3efe6, { rough: 0.8 }), white = mat(0xf7f5f0, { rough: 0.3 }), wood = mat(0x7a5636, { rough: 0.6 }), dark = mat(0x2a2e33, { rough: 0.5 });
    const floorM = mat(0xe6e0d4, { rough: 0.35 }), oak = mat(0xa77b52, { rough: 0.55 }), ceil = mat(0xf4f1ea, { emissive: 0x5a5650, ei: 0.4 }), tile = mat(0xdfe6ea, { rough: 0.35 }), chrome = mat(0xd0d4da, { metal: 0.9, rough: 0.2 }), cream = mat(0xe9e4da, { rough: 0.8 });
    const screen = mat(0x050505, { rough: 0.15 }), glow = mat(0xfff1cf, { emissive: 0xffe2a0, ei: 1.3 }), mirror = mat(0xdde9ef, { metal: 0.25, rough: 0.08 });
    // a wall along local x (at z) or along local z (at x), one storey (yb..yt), with openings {a, b, y0, y1, glass}
    const wall = (alongX, at, a, b, yb, yt, opens = [], mm = body, base = yb) => {
      const piece = (p0, p1, y0, y1, mt) => { const c = (p0 + p1) / 2, len = p1 - p0, h = y1 - y0; if (len < 0.01 || h < 0.01) return; alongX ? L(len, h, mt === glassP ? 0.05 : 0.3, c, (y0 + y1) / 2, at, mt) : L(mt === glassP ? 0.05 : 0.3, h, len, at, (y0 + y1) / 2, c, mt); };
      const block = (p0, p1, w = 0.15) => alongX ? col(p0, p1, at - w, at + w, base) : col(at - w, at + w, p0, p1, base);
      let p = a;
      for (const o of [...opens].sort((u, v) => u.a - v.a)) {
        piece(p, o.a, yb, yt, mm); if (o.a - p > 0.01) block(p, o.a);
        piece(o.a, o.b, yb, o.y0, mm); piece(o.a, o.b, o.y1, yt, mm);
        if (o.glass) { piece(o.a, o.b, o.y0, o.y1, glassP); block(o.a, o.b, 0.1); } else if (o.y0 > yb + 0.3) block(o.a, o.b);
        p = o.b;
      }
      piece(p, b, yb, yt, mm); if (b - p > 0.01) block(p, b);
    };
    const W = (a, b, y0, y1) => ({ a, b, y0, y1, glass: true });
    // outside walls, both storeys (cream outside, the same plaster inside)
    wall(true, 2, -10, 10, 0, FY, [W(-7, -5, 0.7, 2.9), W(-3, -1.2, 0.7, 2.9), { a: -1, b: 1, y0: 0, y1: 3 }, W(1.2, 3, 0.7, 2.9), W(5, 7, 0.7, 2.9)]);
    wall(true, 2, -10, 10, FY, TOP, [W(-7, -5, 4.2, 6.4), W(-3, -1, 4.2, 6.4), W(1, 3, 4.2, 6.4), W(5, 7, 4.2, 6.4)]);
    wall(true, -10, -10, 10, 0, FY, [W(-6, -3, 0.7, 2.9), { a: -1, b: 1, y0: 0, y1: 2.8 }, W(3, 6, 1.2, 2.9)]);
    wall(true, -10, -10, 10, FY, TOP, [W(-8, -5.5, 4.4, 6.2), W(3, 7, 4.2, 6.4)]);
    wall(false, -10, -10, 2, 0, FY); wall(false, -10, -10, 2, FY, TOP, [W(-3, -0.2, 4.2, 6.4)]);
    wall(false, 10, -10, 2, 0, FY, [W(-9, -6.5, 0.9, 2.9)]); wall(false, 10, -10, 2, FY, TOP, [W(-9, -7, 4.2, 6.4), W(-0.8, 1.4, 4.2, 6.4)]);
    col(-16.45, -10.15, -10.5, -1.5);   // the garage wing is solid
    // floors and ceilings (with the stairwell left open)
    const slab = (y, h, mt, hole) => { const parts = hole ? [[-10, hole.x0, -10, 2], [hole.x1, 10, -10, 2], [hole.x0, hole.x1, -10, hole.z0], [hole.x0, hole.x1, hole.z1, 2]] : [[-10, 10, -10, 2]];
      for (const [a, b, c, d] of parts) if (b - a > 0.01 && d - c > 0.01) L(b - a - 0.02, h, d - c - 0.02, (a + b) / 2, y, (c + d) / 2, mt); };
    slab(0.03, 0.05, floorM); slab(FY - 0.22, 0.04, ceil, VOID); slab(FY - 0.1, 0.2, oak, VOID); slab(TOP - 0.04, 0.04, ceil);
    // the stairs up the east wall: 12 steps rising from the front to the back, a glass balustrade
    { const n = 12, run = (STAIR.z1 - STAIR.z0) / n, mx = (STAIR.x0 + STAIR.x1) / 2;
      for (let k = 0; k < n; k++) { const top = FY * (k + 1) / n; L(STAIR.x1 - STAIR.x0, top, run, mx, top / 2, STAIR.z1 - (k + 0.5) * run, white); }
      const len = Math.hypot(STAIR.z1 - STAIR.z0, FY), rail = new THREE.Group(); rail.position.set(STAIR.x0, FY / 2 + 0.5, (STAIR.z0 + STAIR.z1) / 2); rail.rotation.x = Math.atan2(FY, STAIR.z1 - STAIR.z0); g.add(rail);
      const r1 = new THREE.Mesh(geo, glassP); r1.scale.set(0.04, 1, len); rail.add(r1); const r2 = new THREE.Mesh(geo, accent); r2.scale.set(0.07, 0.07, len); r2.position.y = 0.52; rail.add(r2);
      col(STAIR.x0 - 0.05, STAIR.x1 + 0.05, STAIR.z0, -3.3, 0);   // you can't walk into the high part of the flight from below
      L(0.04, 1, VOID.z1 - VOID.z0, VOID.x0, FY + 0.5, (VOID.z0 + VOID.z1) / 2, glassP); L(0.07, 0.07, VOID.z1 - VOID.z0, VOID.x0, FY + 1.02, (VOID.z0 + VOID.z1) / 2, accent); col(VOID.x0 - 0.08, VOID.x0 + 0.08, VOID.z0, VOID.z1, FY); }
    // ---- ground floor
    // cloakroom toilet (back west corner)
    wall(false, -6.5, -10, -7, 0, FY - 0.25, [], inner, 0); wall(true, -7, -10, -6.5, 0, FY - 0.25, [{ a: -8.6, b: -7.6, y0: 0, y1: 2.2 }], inner, 0);
    L(3.4, 0.02, 2.9, -8.25, 0.07, -8.5, tile);
    L(0.4, 0.4, 0.5, -9.55, 0.2, -9.2, white); L(0.16, 0.38, 0.42, -9.82, 0.62, -9.2, white); L(0.46, 0.05, 0.5, -9.52, 0.43, -9.2, white); sit(-9.5, -9.2, Math.PI / 2, 0.45, 'Use the toilet');
    L(0.6, 0.12, 0.42, -7.3, 0.85, -9.7, white); L(0.15, 0.8, 0.15, -7.3, 0.4, -9.75, white); L(0.6, 0.7, 0.03, -7.3, 1.6, -9.83, mirror); act(-7.3, -9.05, 0.7, 'Wash your hands', () => chore ? chore('handwash') : toast('🧼 Squeaky clean.'));
    // living room (west): a TV on the west wall, a sofa facing it, a coffee table and a rug
    L(6, 0.02, 5, -6, 0.06, -2.5, mat(0x7b2f2f, { rough: 1 })); L(0.08, 1.25, 2.2, -9.8, 1.6, -2.5, screen); L(0.5, 0.5, 2.6, -9.6, 0.25, -2.5, wood); col(-9.85, -9.35, -3.8, -1.2, 0);
    L(1.0, 0.45, 3.2, -4.8, 0.3, -2.5, cream); L(0.25, 0.6, 3.2, -4.4, 0.75, -2.5, cream); col(-5.3, -4.3, -4.1, -0.9, 0); for (const dz of [-1, 0, 1]) sit(-4.85, -2.5 + dz, -Math.PI / 2, 0.45, 'Sit on the sofa');
    L(0.9, 0.35, 1.6, -6.8, 0.18, -2.5, wood); act(-6.6, -2.5, 1.6, 'Watch TV', () => toast('📺 The news, then a film. You put your feet up.'));
    // kitchen and dining (east): units under the back window, an island, a table for six
    L(6, 0.9, 0.6, 5, 0.45, -9.6, white); L(6.1, 0.06, 0.7, 5, 0.93, -9.6, dark); L(0.9, 2.1, 0.7, 1.4, 1.05, -9.55, chrome); col(1, 8, -10, -9.2, 0);
    L(3, 0.95, 1.1, 5, 0.48, -5.8, white); L(3.2, 0.06, 1.3, 5, 0.98, -5.8, dark); col(3.5, 6.5, -6.4, -5.2, 0);
    act(5, -8.6, 1.4, 'Open the fridge', () => toast('🧊 Champagne, fancy cheese and a lot of fizzy water.'));
    L(2.6, 0.08, 1.2, 4.5, 0.78, -1.5, wood); L(0.12, 0.74, 0.12, 4.5, 0.37, -1.5, wood); col(3.2, 5.8, -2.1, -0.9, 0); for (const dx of [-0.8, 0.8]) for (const dz of [-1, 1]) { L(0.45, 0.5, 0.45, 4.5 + dx, 0.25, -1.5 + dz * 0.95, wood); sit(4.5 + dx, -1.5 + dz * 0.95, dz > 0 ? Math.PI : 0, 0.5, 'Sit at the table'); }
    // ---- upper floor
    const U = FY;
    wall(false, -1, -10, 2, U, TOP, [{ a: -1.2, b: 0, y0: U, y1: U + 2.2 }], inner); wall(true, -4, -10, -1, U, TOP, [{ a: -3.4, b: -2.3, y0: U, y1: U + 2.2 }], inner);
    wall(true, -1.5, 5, 9.85, U, TOP, [{ a: 5.6, b: 6.6, y0: U, y1: U + 2.2 }], inner); wall(false, 5, -1.5, 2, U, TOP, [], inner);
    // master bedroom (west, front)
    L(2.3, 0.45, 2.4, -8.7, U + 0.3, -1, wood); L(2.2, 0.25, 2.3, -8.75, U + 0.6, -1, white); L(0.15, 1.2, 2.6, -9.8, U + 0.8, -1, dark); L(1.2, 0.05, 2.35, -8.2, U + 0.76, -1, accent);
    col(-9.85, -7.55, -2.2, 0.2, U); act(-6.8, -1, 1.8, 'Sleep in the bed', () => sleep ? sleep() : toast('😴 You sleep like a king.'), U);
    for (const dz of [-1.7, 1.7]) { L(0.5, 0.55, 0.45, -9.5, U + 0.28, -1 + dz, wood); const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glow); s.position.set(-9.5, U + 0.72, -1 + dz); g.add(s); }
    L(2.6, 2.4, 0.6, -6.7, U + 1.2, -3.6, wood); col(-8, -5.4, -3.9, -3.3, U); act(-6.7, -2.9, 1.2, 'Open the wardrobe', () => toast('👔 Rows of shirts, suits and shoes.'), U);
    L(4, 0.02, 3, -6.5, U + 0.01, -0.5, mat(0xcfc6b5, { rough: 1 }));
    // en-suite (west, back)
    L(8.8, 0.02, 5.8, -5.5, U + 0.012, -7, tile);
    L(3.4, 0.58, 0.95, -6.9, U + 0.29, -9.35, white); L(3.1, 0.03, 0.7, -6.9, U + 0.5, -9.35, mat(0x8cc7de, { opacity: 0.8, rough: 0.1 })); col(-8.6, -5.2, -9.85, -8.85, U);
    act(-6.9, -8.2, 1.4, 'Take a bath', () => chore ? chore('bath') : toast('🛁 A long hot bath.'), U);
    L(1.5, 0.12, 1.5, -1.95, U + 0.06, -9.1, white); L(0.05, 2.1, 1.5, -2.7, U + 1.17, -9.1, glassP); L(1.5, 2.1, 0.05, -1.95, U + 1.17, -8.35, glassP);
    act(-1.95, -9.1, 1.0, 'Take a shower', () => chore ? chore('shower') : toast('🚿 A hot shower.'), U);
    L(0.4, 0.4, 0.5, -9.55, U + 0.2, -5.2, white); L(0.16, 0.38, 0.42, -9.82, U + 0.62, -5.2, white); L(0.46, 0.05, 0.5, -9.52, U + 0.43, -5.2, white); sit(-9.5, -5.2, Math.PI / 2, U + 0.45, 'Use the toilet');
    L(2.2, 0.85, 0.5, -6.2, U + 0.43, -4.4, wood); L(2.3, 0.06, 0.55, -6.2, U + 0.88, -4.4, white); L(2.1, 0.9, 0.03, -6.2, U + 1.7, -4.17, mirror); col(-7.3, -5.1, -4.7, -4.1, U);
    act(-6.2, -5.1, 0.9, 'Wash your hands', () => chore ? chore('handwash') : toast('🧼 Squeaky clean.'), U);
    // second bedroom (east, front)
    L(1.8, 0.45, 2.2, 8.9, U + 0.3, 0.3, wood); L(1.7, 0.22, 2.1, 8.85, U + 0.58, 0.3, white); col(8, 9.85, -0.8, 1.4, U);
    act(7.4, 0.3, 1.6, 'Sleep in the guest bed', () => sleep ? sleep() : toast('😴 A good night\'s sleep.'), U);
    // sitting area on the landing: a sofa facing a TV on the back wall
    L(2.8, 0.02, 2.4, 2, U + 0.01, -7.2, mat(0x5a4a6a, { rough: 1 })); L(2.2, 1.2, 0.08, 2, U + 1.6, -9.8, screen);
    L(2.6, 0.45, 0.9, 2, U + 0.3, -6.2, cream); L(2.6, 0.6, 0.22, 2, U + 0.75, -5.8, cream); col(0.7, 3.3, -6.7, -5.7, U); for (const dx of [-0.8, 0.8]) sit(2 + dx, -6.2, Math.PI, U + 0.45, 'Sit on the sofa');
    // doors: the cloakroom downstairs; upstairs the master bedroom, its en-suite and the second bedroom
    for (const [a, b, y, c] of [[[-8.6, -7], [-7.6, -7], 0, 0xf2efe9], [[-1, -1.2], [-1, 0], U, 0x5a3b26], [[-3.4, -4], [-2.3, -4], U, 0xf2efe9], [[5.6, -1.5], [6.6, -1.5], U, 0x5a3b26]]) { const p = toW(...a), q = toW(...b); doors?.add({ a: [p.x, p.z], b: [q.x, q.z], y: Y + y, color: c }); }
    // a grand painting in the hall
    { const t = makeTex(256, 160, q => { const sky = q.createLinearGradient(0, 0, 0, 160); sky.addColorStop(0, '#5f86b0'); sky.addColorStop(1, '#f4cf9a'); q.fillStyle = sky; q.fillRect(0, 0, 256, 160); for (let k = 0; k < 3; k++) { q.fillStyle = ['#6f8a4a', '#4f6a3a', '#33482a'][k]; q.beginPath(); q.moveTo(0, 160); for (let xx = 0; xx <= 256; xx += 8) q.lineTo(xx, 95 + k * 20 - Math.sin(xx * 0.03 + k) * 12); q.lineTo(256, 160); q.fill(); } });
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); pm.position.set(-6.32, 1.8, -8.5); pm.rotation.y = Math.PI / 2; g.add(pm); L(0.05, 1.75, 2.65, -6.36, 1.8, -8.5, accent); }   // on the cloakroom's outside wall
    // lights on both floors
    for (const [lx, ly, lz] of [[-5, FY - 0.5, -3], [5, FY - 0.5, -4], [-5, TOP - 0.5, -4], [4, TOP - 0.5, -4]]) { const l = new THREE.PointLight(0xffe6c4, 7, 14, 1.6); l.position.set(lx, ly, lz); g.add(l); }
    // a glass lift down to the basement level, by the back window; cars come round to the cul-de-sac outside the gate
    { const c = toW(-3.5, -8.6), d = toW(0, 14); basement?.({ name: m.name, x: c.x, y: Y, z: c.z, face: g.rotation.y, drive: { x: d.x, y: Y + 0.15, z: d.z, ry: g.rotation.y + Math.PI / 2 } }); }
    planeBlocks?.push({ ...rectW(-10, 10, -10, 2), top: Y + TOP + 0.6 });   // indoors: first person, and the roof doesn't hide you
    houses.push({ inv });
  }
  for (const m of MANSIONS) {
    const g = new THREE.Group(); scene.add(g);
    const dist = 29, cx = HILL.x + Math.cos(m.a) * dist, cz = HILL.z + Math.sin(m.a) * dist, face = m.a + Math.PI;   // faces the fountain
    g.position.set(cx, Y, cz); g.rotation.y = Math.atan2(Math.cos(face), Math.sin(face)) ;
    // local frame: +z points to the fountain (front). Build in local space.
    const L = (w, h, d, x, y, z, c) => { const b = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c)); b.scale.set(w, h, d); b.position.set(x, y, z); g.add(b); return b; };
    const body = mat(m.body, { rough: 0.6 }), roof = mat(m.roof), accent = mat(m.accent, { metal: m.accent === 0xd4af37 ? 0.8 : 0.2, rough: 0.4 }), glass = mat(0x1d2f3a, { metal: 0.6, rough: 0.1 });
    L(21, 0.5, 13, 0, 7.25, -4, roof);                                                // the roof over the main house
    L(6.3, 4, 9, -13.3, 2, -6, body); L(6.9, 0.4, 9.6, -13.3, 4.2, -6, roof);         // the garage wing (closed up)
    g.updateMatrixWorld(true);
    house(g, m, { body, accent, L });
    for (const x of [-3, 3]) L(0.6, 6.5, 0.6, x, 3.25, 3.4, accent);                // columns
    L(8, 0.4, 3.2, 0, 6.6, 3.4, accent);                                            // portico
    L(3, 0.3, 2, 0, 0.15, 4, 0xbdb6a6);                                             // front steps
    // pool and patio behind
    L(10, 0.2, 5, 4, 0.1, -13, 0xd9d2c0); L(8, 0.05, 3.6, 4, 0.22, -13, mat(0x3fa9d6, { emissive: 0x1d6f9a, ei: 0.3 }));
    for (const x of [-3, 11]) { L(1.2, 0.4, 2, x, 0.3, -13, 0xffffff); }
    // garden wall with a gate and drive
    const wallC = mat(0xcfc8b8);
    L(30, 1.8, 0.4, 0, 0.9, -16, wallC); L(0.4, 1.8, 23, -15, 0.9, -4.5, wallC); L(0.4, 1.8, 23, 15, 0.9, -4.5, wallC);
    L(10.5, 1.8, 0.4, -9.75, 0.9, 7, wallC); L(10.5, 1.8, 0.4, 9.75, 0.9, 7, wallC);
    for (const x of [-4.5, 4.5]) { L(0.9, 2.6, 0.9, x, 1.3, 7, accent); L(1.1, 0.3, 1.1, x, 2.7, 7, wallC); }
    L(6, 0.06, 7, 0, 0.06, 4.5, 0x8a8478);                                          // drive
    for (let k = 0; k < 6; k++) { const hx = -12 + (k % 3) * 4.5, hz = 4 - Math.floor(k / 3) * 3; if (Math.abs(hx) > 4) L(1.4, 1.2, 1.4, hx, 0.6, hz, 0x3f6a2f); }   // hedges
    const gateL = new THREE.Group(), gateR = new THREE.Group(); gateL.position.set(-4, 0, 7); gateR.position.set(4, 0, 7); g.add(gateL, gateR);
    for (const [gg, s] of [[gateL, 1], [gateR, -1]]) { const bar = new THREE.Mesh(geo, mat(0x1a1a1a, { metal: 0.6 })); bar.scale.set(4, 0.08, 0.08); bar.position.set(s * 2, 2.1, 0); gg.add(bar); const bar2 = bar.clone(); bar2.position.y = 0.3; gg.add(bar2); for (let k = 0; k <= 10; k++) { const r = new THREE.Mesh(geo, mat(0x1a1a1a, { metal: 0.6 })); r.scale.set(0.06, 2.0, 0.06); r.position.set(s * k * 0.4, 1.2, 0); gg.add(r); } }
    // world-space colliders for the house and walls
    g.updateMatrixWorld(true);
    const wb = (lx0, lx1, lz0, lz1) => { const pts = [[lx0, lz0], [lx1, lz0], [lx0, lz1], [lx1, lz1]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld)); colliders.push({ minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)), minZ: Math.min(...pts.map(p => p.z)), maxZ: Math.max(...pts.map(p => p.z)) }); };
    wb(-15, 15, -16.2, -15.8); wb(-15.2, -14.8, -16, 7); wb(14.8, 15.2, -16, 7); wb(-15, -4.5, 6.8, 7.2); wb(4.5, 15, 6.8, 7.2);
    const houseBox = []; for (const [x, z] of [[-10, -10], [10, -10], [-10, 2], [10, 2]]) houseBox.push(new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld));
    const hb = { minX: Math.min(...houseBox.map(p => p.x)), maxX: Math.max(...houseBox.map(p => p.x)), minZ: Math.min(...houseBox.map(p => p.z)), maxZ: Math.max(...houseBox.map(p => p.z)) };
    const gateCollider = { ...(() => { const a = new THREE.Vector3(-4, 0, 7).applyMatrix4(g.matrixWorld), b = new THREE.Vector3(4, 0, 7).applyMatrix4(g.matrixWorld); return { minX: Math.min(a.x, b.x) - 0.2, maxX: Math.max(a.x, b.x) + 0.2, minZ: Math.min(a.z, b.z) - 0.2, maxZ: Math.max(a.z, b.z) + 0.2 }; })() };
    colliders.push(gateCollider);
    const gatePos = new THREE.Vector3(0, 0, 9).applyMatrix4(g.matrixWorld);
    gates.push({ gateL, gateR, open: 0, pos: gatePos, collider: gateCollider, name: m.name });
    civicBuildings?.push({ type: 'mansion', name: m.name, x: (hb.minX + hb.maxX) / 2, z: (hb.minZ + hb.maxZ) / 2, ...hb, noDoor: true });
    // a proper front door (double, swings as you come up the steps)
    const door = new THREE.Group(); door.position.set(-1, 0, 2.1); g.add(door); const leaf = new THREE.Mesh(geo, mat(0x4a2c18)); leaf.scale.set(2, 3, 0.12); leaf.position.set(1, 1.5, 0); door.add(leaf);
    gates.at(-1).door = door; gates.at(-1).doorPos = new THREE.Vector3(0, 0, 3).applyMatrix4(g.matrixWorld);
  }
  destinations?.push({ name: 'Highcliff Hills (mansions)', x: roadPoint(0).x + 25, z: roadPoint(0).z });
  const sign = makeTex(512, 128, g => { g.fillStyle = '#1f2a22'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#e6d9a8'; g.font = 'bold 54px serif'; g.textAlign = 'center'; g.fillText('HIGHCLIFF HILLS', 256, 70); g.font = '24px serif'; g.fillText('PRIVATE ESTATES · DRIVE SLOWLY', 256, 108); });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: sign, side: THREE.DoubleSide })); sm.position.set(foot.x + 14, 2.4, foot.z - ROAD_W / 2 - 2); sm.rotation.y = -Math.PI / 2; scene.add(sm);
  B(0.3, 2.4, 0.3, foot.x + 14, 1.2, foot.z - ROAD_W / 2 - 5.5, 0x2b2f33); B(0.3, 2.4, 0.3, foot.x + 14, 1.2, foot.z - ROAD_W / 2 + 1.5, 0x2b2f33);
  interactables.push({ pos: new THREE.Vector3(HILL.x + 6.5, HILL.top, HILL.z), r: 2.5, label: 'Toss a coin in the fountain', action: () => toast('🪙 Plink. The view from up here is worth millions.') });

  // ---- gates and front doors open as you (or your car) come up
  function update(dt, drivingPos) {
    const p = drivingPos || playerPos();
    for (const gt of gates) {
      const dG = Math.hypot(p.x - gt.pos.x, p.z - gt.pos.z), want = dG < (drivingPos ? 12 : 6) ? 1 : 0;
      gt.open += THREE.MathUtils.clamp(want - gt.open, -dt * 0.8, dt * 0.8);
      gt.gateL.rotation.y = -gt.open * 1.5; gt.gateR.rotation.y = gt.open * 1.5;
      const solid = gt.open < 0.6, i = colliders.indexOf(gt.collider);
      if (solid && i < 0) colliders.push(gt.collider); else if (!solid && i >= 0) colliders.splice(i, 1);
      const dD = Math.hypot(p.x - gt.doorPos.x, p.z - gt.doorPos.z);
      gt.door.rotation.y = THREE.MathUtils.lerp(gt.door.rotation.y, dD < 4 ? -1.3 : 0, Math.min(1, dt * 3));
    }
  }
  const _v = new THREE.Vector3();
  function groundAt(x, z, y = -1e9) {
    const dx = x - HILL.x, dz = z - HILL.z; if (dx * dx + dz * dz >= HILL.base * HILL.base) return null;
    if (y > Y - 2 && dx * dx + dz * dz < 45 * 45) for (const h of houses) {   // the mansions' stairs and upper floors
      const l = _v.set(x, Y, z).applyMatrix4(h.inv); if (l.x < -10 || l.x > 10 || l.z < -10 || l.z > 2) continue;
      if (l.x >= STAIR.x0 && l.x <= STAIR.x1 && l.z >= STAIR.z0 && l.z <= STAIR.z1) { const s = FY * Math.min(1, Math.max(0, (STAIR.z1 - l.z) / (STAIR.z1 - STAIR.z0))); if (y > Y + s - 1.1 && y < Y + s + 1.6) return Y + s; }
      if (y > Y + FY - 1.2) { if (l.x >= VOID.x0 && l.x <= VOID.x1 && l.z >= VOID.z0 && l.z <= VOID.z1) return Y; return Y + FY; }
      return Y + 0.05;
    }
    return hillHeight(x, z);
  }
  // where grass must not grow: the winding road, the approach road, the last stretch, the cul-de-sac, and each
  // mansion's drive, house, patio and pool (lawns inside the walls still grow)
  const roadPts = []; for (let i = 0; i <= 440; i++) roadPts.push(roadPoint(i / 440));
  const foot0 = roadPoint(0), top1 = roadPoint(1);
  const bare = [];   // world rects, from each mansion's local layout
  for (const h of houses) { const m = h.inv.clone().invert(), W = (a, b) => new THREE.Vector3(a, 0, b).applyMatrix4(m);
    for (const [a, b, c, d] of [[-3.5, 3.5, 1, 9.5], [-10.5, 10.5, -10.5, 2.5], [-17, -9.8, -11, -1], [-1.5, 9.5, -16, -10]]) { const p = W(a, c), q = W(b, d); bare.push({ minX: Math.min(p.x, q.x), maxX: Math.max(p.x, q.x), minZ: Math.min(p.z, q.z), maxZ: Math.max(p.z, q.z) }); } }
  function noGrass(x, z) {
    const dx = x - HILL.x, dz = z - HILL.z, r = Math.hypot(dx, dz);
    if (Math.abs(z - foot0.z) < ROAD_W / 2 + 1 && x > foot0.x - 2 && x < foot0.x + 172) return true;   // the approach road
    if (r > HILL.base + 2) return false;
    if (r < 17) return true;                                                                            // the cul-de-sac
    { const a = Math.atan2(dz, dx) - ROAD_END_A, along = Math.cos(a) * r, across = Math.abs(Math.sin(a) * r); if (along > 14 && along < top1.r + 2 && across < ROAD_W / 2 + 1) return true; }   // the last stretch in
    if (r >= HILL.flat && r <= HILL.base) for (const p of roadPts) if (Math.abs(p.x - x) < 6 && Math.abs(p.z - z) < 6 && Math.hypot(p.x - x, p.z - z) < ROAD_W / 2 + 1) return true;   // the winding road
    for (const b of bare) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
    return false;
  }
  return { update, groundAt, hill: HILL, noGrass };
}

// Sunset Ridge: a long ridge south of the nightlife strip. The road from the boulevard climbs
// over it (about 8% at the steepest) past a viewpoint car park at the crest.
export const RIDGE = { x: 960, z: 800, half: 200, width: 70, top: 10, roadFrom: 1093, roadTo: 560 };
// Sunset Ridge Tunnel runs through the ridge beside the scenic road over the top (see tunnel.js).
// x/half: the channel's centre line and half-width (on terrain grid lines, so the hole has clean edges);
// the road is in an open cutting from z0 to c0 and c1 to z1, and under the ridge from c0 to c1.
export const TUNNEL = { x: 930.25, half: 5.25, z0: 600, z1: 1000, c0: 740, c1: 860, ceiling: 6.3, roof: 7.2 };
export const inTunnelChannel = (x, z) => Math.abs(x - TUNNEL.x) < TUNNEL.half && z > TUNNEL.z0 && z < TUNNEL.z1;
export const tunnelCovered = z => z > TUNNEL.c0 && z < TUNNEL.c1;
export function ridgeHeight(x, z) {
  const u = (z - RIDGE.z) / RIDGE.half, w = Math.abs(x - RIDGE.x);
  if (Math.abs(u) >= 1 || w >= RIDGE.width) return 0;
  const along = Math.cos(u * Math.PI / 2) ** 2, across = w < 30 ? 1 : 1 - smooth((w - 30) / (RIDGE.width - 30));
  return RIDGE.top * along * across;
}
export function buildRidge({ scene, makeTex, interactables, sitSpots, toast, destinations }) {
  const grass = makeTex(256, 256, g => { g.fillStyle = '#6b7a3e'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { g.fillStyle = ['#778848', '#5f7036', '#82904e'][i % 3]; g.fillRect((i * 73) % 256, (i * 97 + (i >> 8) * 19) % 256, 1, 3); } });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(8, 22);
  const W = RIDGE.width * 2, L = RIDGE.half * 2, tg = new THREE.PlaneGeometry(W, L, 40, 100); tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, ridgeHeight(pos.getX(i) + RIDGE.x, pos.getZ(i) + RIDGE.z) + 0.03);
  // cut the open sections of the tunnel approach out of the ground (the covered part stays: it's the hill above the tunnel)
  { const idx = tg.index.array, keep = [];
    for (let i = 0; i < idx.length; i += 3) { let x = 0, z = 0; for (let k = 0; k < 3; k++) { x += pos.getX(idx[i + k]) / 3; z += pos.getZ(idx[i + k]) / 3; } x += RIDGE.x; z += RIDGE.z;
      if (inTunnelChannel(x, z) && !tunnelCovered(z)) continue; keep.push(idx[i], idx[i + 1], idx[i + 2]); }
    tg.setIndex(keep); }
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: grass, roughness: 1 })); terrain.position.set(RIDGE.x, 0, RIDGE.z); terrain.receiveShadow = true; scene.add(terrain);
  // road ribbon following the ground
  const ROAD = 9, N = 160, verts = [], idx = [];
  for (let i = 0; i <= N; i++) { const z = RIDGE.roadFrom + (RIDGE.roadTo - RIDGE.roadFrom) * i / N; for (const s of [-1, 1]) { const x = RIDGE.x + s * ROAD / 2; verts.push(x, ridgeHeight(x, z) + 0.1, z); } }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  scene.add(new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x34383c, roughness: 0.9, side: THREE.DoubleSide })));
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 });
  for (let z = RIDGE.roadFrom - 4; z > RIDGE.roadTo; z -= 9) { const a = new THREE.Vector3(RIDGE.x, ridgeHeight(RIDGE.x, z) + 0.13, z), b = new THREE.Vector3(RIDGE.x, ridgeHeight(RIDGE.x, z - 3.5) + 0.13, z - 3.5); const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 3.5), lineMat); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); scene.add(m); }
  // viewpoint lay-by at the crest
  const lay = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x55595c })); lay.position.set(RIDGE.x + 10.5, RIDGE.top + 0.05, RIDGE.z); scene.add(lay);
  for (const dz of [-6, 0, 6]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 2.2), new THREE.MeshStandardMaterial({ color: 0x6e6051 })); bench.position.set(RIDGE.x + 16, RIDGE.top + 0.35, RIDGE.z + dz); scene.add(bench); sitSpots?.push({ x: RIDGE.x + 16, z: RIDGE.z + dz, yaw: -Math.PI / 2, seatY: RIDGE.top + 0.95, label: 'Sit and watch the sunset' }); }
  interactables.push({ pos: new THREE.Vector3(RIDGE.x + 12, RIDGE.top, RIDGE.z), r: 3, label: 'Look out from Sunset Ridge', action: () => toast('🌇 The whole city spreads out below you, all the way to the shimmer of the dome.') });
  destinations?.push({ name: 'Sunset Ridge viewpoint', x: RIDGE.x + 10, z: RIDGE.z });
  return { groundAt(x, z, bodyY = null) { if (Math.abs(x - RIDGE.x) >= RIDGE.width || Math.abs(z - RIDGE.z) >= RIDGE.half) return null;
    if (inTunnelChannel(x, z) && (!tunnelCovered(z) || bodyY == null || bodyY < TUNNEL.roof - 0.4)) return 0;   // the tunnel road (or the cutting)
    const lay = Math.abs(x - RIDGE.x - 10.5) <= 6 && Math.abs(z - RIDGE.z) <= 12; return lay ? RIDGE.top + 0.15 : ridgeHeight(x, z); } };
}
