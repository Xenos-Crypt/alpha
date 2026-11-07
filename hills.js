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

export function buildHills({ scene, colliders, civicBuildings, interactables, makeTex, toast, destinations, playerPos }) {
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
  for (const m of MANSIONS) {
    const g = new THREE.Group(); scene.add(g);
    const dist = 29, cx = HILL.x + Math.cos(m.a) * dist, cz = HILL.z + Math.sin(m.a) * dist, face = m.a + Math.PI;   // faces the fountain
    g.position.set(cx, Y, cz); g.rotation.y = Math.atan2(Math.cos(face), Math.sin(face)) ;
    // local frame: +z points to the fountain (front). Build in local space.
    const L = (w, h, d, x, y, z, c) => { const b = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c)); b.scale.set(w, h, d); b.position.set(x, y, z); g.add(b); return b; };
    const body = mat(m.body, { rough: 0.6 }), roof = mat(m.roof), accent = mat(m.accent, { metal: m.accent === 0xd4af37 ? 0.8 : 0.2, rough: 0.4 }), glass = mat(0x1d2f3a, { metal: 0.6, rough: 0.1 });
    L(20, 7, 12, 0, 3.5, -4, body); L(21, 0.5, 13, 0, 7.25, -4, roof);              // main house, two storeys
    L(9, 4, 9, -12, 2, -6, body); L(9.6, 0.4, 9.6, -12, 4.2, -6, roof);              // wing
    for (const x of [-6, -2, 2, 6]) { L(2, 2.2, 0.1, x, 1.8, 2.05, glass); L(2, 2.2, 0.1, x, 5.3, 2.05, glass); }
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
    colliders.push({ ...hb });
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
  function groundAt(x, z) { const dx = x - HILL.x, dz = z - HILL.z; if (dx * dx + dz * dz >= HILL.base * HILL.base) return null; return hillHeight(x, z); }
  return { update, groundAt, hill: HILL };
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
