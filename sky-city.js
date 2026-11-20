// SKYHAVEN: the sky city. A floating island 220 m across, 200 m up over the open land north-west of the airport,
// one of the country's six cities. It stays up because of the Gravity Core in the middle: a power grid run on
// gravity magic, whose four conduits run out to anchor pylons at the island's edge. The core is the most heavily
// defended place in the country: a wall round it, guards at its one gate, turrets on the wall. Anyone who goes in
// is shot on sight, no questions asked.
//
// You get there by airship from the Skyhaven Sky Port on the ground (x -720..-640, z -440..-360, checked clear of
// everything, with its own road in from the street to the north). Airships run up and down on a timetable.
//
// Layout on the island (all checked against one another with the world grid, so nothing stands in anything):
//   the core (r 0-24, walled), a ring boulevard (r 30-40), eight radial streets, towers in the blocks between
//   them (r 46-98), a parapet round the rim (r 108) and the airship dock pier on the side facing the sky port.
import * as THREE from 'three';
import { createWorldGrid } from './world-grid.js';

export const SKY = { x: -600, z: -560, y: 200, r: 110 };   // (200 m up: above 250 m counts as space)
export const SKY_PORT = { minX: -720, maxX: -640, minZ: -440, maxZ: -360, pad: { x: -670, z: -395 }, gate: { x: -660, z: -440 }, roadZ: -470 };
const CORE_R = 24, GATE_HALF = 0.11;   // the core's wall radius, and half the gate's opening (radians)

export function buildSkyCity(ctx) {
  const { scene, K, interactables, toast, makeTex } = ctx;
  const C = SKY, Y = SKY.y, root = new THREE.Group(); root.name = 'Skyhaven (sky city)'; scene.add(root);
  const ids = [], destinations = [], grid = createWorldGrid({ cell: 1 });
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1, emissive: o.em ?? 0, emissiveIntensity: o.ei ?? 1, transparent: !!o.op, opacity: o.op ?? 1 });
  const box = (p, w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const cols = ctx.colliders, solid = (minX, maxX, minZ, maxZ, base = Y) => cols.push({ minX, maxX, minZ, maxZ, baseYAt: () => base });
  const id = (cls, kind, mat3, owner, name, x, z) => ids.push({ cls, kind, mat: mat3, owner, seed: 'sky:' + name + ':' + Math.round(x) + ',' + Math.round(z), name, maker: 'Skyhaven City Council', pos: { x, z } });

  // ---------------------------------------------------------------- the island
  const stone = mat(0xe9e4da, { rough: 0.85 }), rock = mat(0x6f6a72, { rough: 1 }), crystal = mat(0x9b7bff, { em: 0x6a3cff, ei: 1.4 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(C.r, C.r - 2, 4, 96), stone); top.position.set(C.x, Y - 2, C.z); top.receiveShadow = true; root.add(top);
  const under = new THREE.Mesh(new THREE.ConeGeometry(C.r - 2, 80, 48, 4), rock); under.rotation.x = Math.PI; under.position.set(C.x, Y - 44, C.z); root.add(under);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 30 + (i % 3) * 22, v = new THREE.Mesh(new THREE.OctahedronGeometry(2 + (i % 4)), crystal); v.position.set(C.x + Math.cos(a) * r, Y - 14 - (i % 5) * 9 - (110 - r) * 0.25, C.z + Math.sin(a) * r); root.add(v); }
  id('LND', 'ISL', 'STN', 'GOV', 'Skyhaven floating island', C.x, C.z);
  // floating rocks below, held by the same magic
  const drifters = []; for (let i = 0; i < 10; i++) { const a = i * 0.63, r = 140 + (i % 3) * 25, m = new THREE.Mesh(new THREE.DodecahedronGeometry(4 + (i % 3) * 2), rock); m.position.set(C.x + Math.cos(a) * r, Y - 30 - (i % 4) * 12, C.z + Math.sin(a) * r); root.add(m); drifters.push({ m, a, r, y: m.position.y, s: 0.02 + (i % 3) * 0.01 }); }

  // ---------------------------------------------------------------- streets
  const paving = mat(0x3c4250, { rough: 0.8 }), kerb = mat(0xd8d2c4);
  const ring = new THREE.Mesh(new THREE.RingGeometry(30, 40, 96), paving); ring.rotation.x = -Math.PI / 2; ring.position.set(C.x, Y + 0.02, C.z); root.add(ring);
  const STREETS = 8, streetAngle = k => k / STREETS * Math.PI * 2 + Math.PI / STREETS;   // (offset so no street points at the dock)
  for (let k = 0; k < STREETS; k++) { const a = streetAngle(k), s = new THREE.Mesh(new THREE.PlaneGeometry(64, 8), paving); s.rotation.set(-Math.PI / 2, 0, -a); s.position.set(C.x + Math.cos(a) * 72, Y + 0.025, C.z + Math.sin(a) * 72); root.add(s); }
  // the dock faces the sky port
  const dockA = Math.atan2(SKY_PORT.pad.z - C.z, SKY_PORT.pad.x - C.x), dock = { a: dockA, c: Math.cos(dockA), s: Math.sin(dockA), r0: 104, r1: 134, half: 6 };
  const onStreet = (x, z, pad) => { const dx = x - C.x, dz = z - C.z, r = Math.hypot(dx, dz); if (r < 40 + pad) return true;
    for (let k = 0; k < STREETS; k++) { const a = streetAngle(k), along = dx * Math.cos(a) + dz * Math.sin(a), across = -dx * Math.sin(a) + dz * Math.cos(a); if (along > 0 && Math.abs(across) < 4 + pad) return true; }
    const along = dx * dock.c + dz * dock.s, across = -dx * dock.s + dz * dock.c; return along > 40 && Math.abs(across) < dock.half + 2 + pad; };   // a walk from the boulevard out to the dock
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(64, dock.half * 2), paving); w.rotation.set(-Math.PI / 2, 0, -dockA); w.position.set(C.x + dock.c * 72, Y + 0.024, C.z + dock.s * 72); root.add(w); }
  grid.place({ minX: C.x - 41, maxX: C.x + 41, minZ: C.z - 41, maxZ: C.z + 41 }, { name: 'core and boulevard', minY: Y, maxY: Y + 60 });

  // ---------------------------------------------------------------- towers
  const glass = mat(0x8fb8d8, { rough: 0.15, metal: 0.5, em: 0x2a4a6a, ei: 0.4 }), trim = mat(0xd4af37, { metal: 0.7, rough: 0.3 }), white = mat(0xf4f1ea, { rough: 0.5 });
  const NAMES = ['Zephyr Tower', 'Cirrus Court', 'Halo Spire', 'Stratos House', 'Nimbus Hall', 'Aurora Heights', 'Altair Lofts', 'Vega Exchange', 'Skyward Academy', 'Cloudline Market', 'Lumen Tower', 'Gale Terrace'];
  let built = 0;
  for (let gx = C.x - 100; gx <= C.x + 100; gx += 15) for (let gz = C.z - 100; gz <= C.z + 100; gz += 15) {
    const w = 9 + ((gx * 7 + gz * 3) & 3) * 1.5, d = 9 + ((gx * 3 + gz * 5) & 3) * 1.5, x0 = gx - w / 2, x1 = gx + w / 2, z0 = gz - d / 2, z1 = gz + d / 2;
    const corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
    if (corners.some(([x, z]) => Math.hypot(x - C.x, z - C.z) > 98 || Math.hypot(x - C.x, z - C.z) < 46 || onStreet(x, z, 1))) continue;
    if (onStreet(gx, gz, 1)) continue;
    const h = 14 + ((Math.abs(gx * 13 + gz * 7)) % 42), name = NAMES[built % NAMES.length] + (built >= NAMES.length ? ' ' + (Math.floor(built / NAMES.length) + 1) : '');
    if (grid.place({ minX: x0 - 1, maxX: x1 + 1, minZ: z0 - 1, maxZ: z1 + 1 }, { name, minY: Y, maxY: Y + h }) == null) continue;
    const g = new THREE.Group(); g.name = name; root.add(g);
    box(g, w, h, d, gx, Y + h / 2, gz, built % 3 ? glass : white);
    for (let y = 4; y < h - 1; y += 4) box(g, w + 0.2, 0.3, d + 0.2, gx, Y + y, gz, trim);   // floor bands
    box(g, w * 0.6, 2.5, d * 0.6, gx, Y + h + 1.25, gz, white);                             // rooftop plant room
    solid(x0, x1, z0, z1);
    id('BLD', h > 40 ? 'OFF' : 'APT', 'GLS.STL', 'GOV', name, gx, gz); built++;
  }

  // ---------------------------------------------------------------- the Gravity Core (power grid)
  const coreG = new THREE.Group(); coreG.name = 'Gravity Core'; root.add(coreG);
  const violet = mat(0xb48cff, { em: 0x7a3cff, ei: 2 }), dark = mat(0x23202c, { metal: 0.6, rough: 0.4 });
  { const p = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.5, 34, 16), dark); p.position.set(C.x, Y + 17, C.z); coreG.add(p); }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), violet); heart.position.set(C.x, Y + 38, C.z); coreG.add(heart);
  const rings = [6, 9, 12].map((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 8, 64), violet); t.position.set(C.x, Y + 38, C.z); t.rotation.x = i * 0.9; coreG.add(t); return t; });
  const glow = new THREE.PointLight(0x9b6bff, 3, 120, 1.5); glow.position.set(C.x, Y + 38, C.z); coreG.add(glow);
  // the power grid: four conduits from the core to anchor pylons at the rim (they hold the island up)
  const anchors = [];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 8, ax = C.x + Math.cos(a) * 103, az = C.z + Math.sin(a) * 103;
    if (Math.abs(Math.atan2(Math.sin(a - dockA), Math.cos(a - dockA))) < 0.2) continue;
    box(coreG, 2.4, 14, 2.4, ax, Y + 7, az, dark); const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), violet); tip.position.set(ax, Y + 15.5, az); coreG.add(tip); solid(ax - 1.2, ax + 1.2, az - 1.2, az + 1.2);
    const len = 103 - CORE_R, conduit = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 0.6), violet); conduit.position.set(C.x + Math.cos(a) * (CORE_R + len / 2), Y + 0.15, C.z + Math.sin(a) * (CORE_R + len / 2)); conduit.rotation.y = -a; coreG.add(conduit);
    anchors.push(tip); id('MCH', 'GRV', 'STL', 'GOV', `Gravity anchor pylon ${k + 1}`, ax, az); }
  id('MCH', 'GRV', 'STL', 'GOV', 'Skyhaven Gravity Core (power grid)', C.x, C.z);
  // its wall (one gate, facing the dock walk), guards and turrets
  const gateA = dockA + Math.PI;   // the gate faces away from the dock, so you never wander into it on the way in
  const wallM = mat(0x2d2a35, { metal: 0.5, rough: 0.4 });
  for (let i = 0; i < 64; i++) { const a = (i + 0.5) / 64 * Math.PI * 2, da = Math.atan2(Math.sin(a - gateA), Math.cos(a - gateA)); if (Math.abs(da) < GATE_HALF + 0.03) continue;
    const s = box(coreG, 2.4, 4, 0.5, C.x + Math.cos(a) * CORE_R, Y + 2, C.z + Math.sin(a) * CORE_R, wallM); s.rotation.y = -a + Math.PI / 2; }
  const turrets = [];
  for (let k = 0; k < 6; k++) { const a = gateA + (k + 0.5) / 6 * Math.PI * 2, tx = C.x + Math.cos(a) * CORE_R, tz = C.z + Math.sin(a) * CORE_R;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.4, 12), dark); base.position.set(tx, Y + 4.7, tz); coreG.add(base);
    const head = new THREE.Group(); head.position.set(tx, Y + 5.8, tz); coreG.add(head); box(head, 1.4, 0.9, 1.4, 0, 0, 0, dark); box(head, 0.25, 0.25, 2.6, 0, 0.1, 1.3, wallM);
    turrets.push({ head, x: tx, z: tz }); }
  const guards = [];
  for (const side of [-1, 1]) { const a = gateA + side * (GATE_HALF + 0.08), gx = C.x + Math.cos(a) * (CORE_R + 2.2), gz = C.z + Math.sin(a) * (CORE_R + 2.2);
    const h = K.stander(gx, gz, Math.atan2(Math.cos(gateA), Math.sin(gateA)), { outfit: 0x1c1c24, y: Y + 0.05 }); if (h) guards.push(h); }
  const warn = makeTex(512, 160, g => { g.fillStyle = '#2a0000'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#ff3b30'; g.textAlign = 'center'; g.font = 'bold 40px sans-serif'; g.fillText('GRAVITY CORE', 256, 56); g.font = 'bold 30px sans-serif'; g.fillStyle = '#fff'; g.fillText('RESTRICTED · KILL ON SIGHT', 256, 108); });
  { const a = gateA, m = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), new THREE.MeshBasicMaterial({ map: warn })); m.position.set(C.x + Math.cos(a) * (CORE_R + 0.35), Y + 3.4, C.z + Math.sin(a) * (CORE_R + 0.35)); m.rotation.y = Math.atan2(Math.cos(a), Math.sin(a)); coreG.add(m); }

  // ---------------------------------------------------------------- the rim, the dock and the airship
  for (let i = 0; i < 120; i++) { const a = (i + 0.5) / 120 * Math.PI * 2, da = Math.atan2(Math.sin(a - dockA), Math.cos(a - dockA)); if (Math.abs(da) < 0.07) continue;
    const s = box(root, 5.8, 1.1, 0.35, C.x + Math.cos(a) * 108, Y + 0.55, C.z + Math.sin(a) * 108, white); s.rotation.y = -a + Math.PI / 2; s.castShadow = false; }
  const pier = new THREE.Group(); pier.name = 'Skyhaven airship dock'; root.add(pier);
  { const len = dock.r1 - dock.r0 + 6, mid = (dock.r0 - 6 + dock.r1) / 2, px = C.x + dock.c * mid, pz = C.z + dock.s * mid;
    const deck = box(pier, len, 1.2, dock.half * 2, px, Y - 0.6, pz, stone); deck.rotation.y = -dockA;
    for (const s of [-1, 1]) { const r = box(pier, len, 1.1, 0.3, px - dock.s * s * (dock.half - 0.15), Y + 0.55, pz + dock.c * s * (dock.half - 0.15), trim); r.rotation.y = -dockA; }
    const end = box(pier, 0.3, 1.1, dock.half * 2, C.x + dock.c * (dock.r1 + 0.2), Y + 0.55, C.z + dock.s * (dock.r1 + 0.2), trim); end.rotation.y = -dockA; }
  id('BLD', 'DCK', 'STN', 'GOV', 'Skyhaven airship dock', C.x + dock.c * 120, C.z + dock.s * 120);
  const sign = makeTex(512, 128, g => { g.fillStyle = '#0d2a4a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.font = 'bold 54px Georgia, serif'; g.fillText('SKYHAVEN', 256, 66); g.font = '24px sans-serif'; g.fillStyle = '#cfe6ff'; g.fillText('city in the sky · airship dock', 256, 104); });
  { const x = C.x + dock.c * 102, z = C.z + dock.s * 102, m = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: sign })); m.position.set(x, Y + 5, z); m.rotation.y = Math.atan2(dock.c, dock.s); root.add(m); for (const s of [-1, 1]) box(root, 0.3, 5.9, 0.3, x - dock.s * s * 3.4, Y + 2.95, z + dock.c * s * 3.4, trim); }

  // the sky port on the ground: a fenced yard with a terminal, a landing pad and its own road in
  const P = SKY_PORT, port = new THREE.Group(); port.name = 'Skyhaven Sky Port'; scene.add(port);
  const tarmac = mat(0x34383d, { rough: 0.9 });
  { const road = box(port, 8, 0.06, P.minZ - P.roadZ, P.gate.x, 0.03, (P.roadZ + P.minZ) / 2, tarmac); road.castShadow = false; }
  { const yard = box(port, P.maxX - P.minX, 0.06, P.maxZ - P.minZ, (P.minX + P.maxX) / 2, 0.03, (P.minZ + P.maxZ) / 2, mat(0x8d9096, { rough: 0.95 })); yard.castShadow = false; }
  const padM = new THREE.Mesh(new THREE.CircleGeometry(18, 48), mat(0x2f3540)); padM.rotation.x = -Math.PI / 2; padM.position.set(P.pad.x, 0.08, P.pad.z); port.add(padM);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(16.5, 17.3, 48), mat(0xffd23f, { em: 0x996600, ei: 0.8 })); padRing.rotation.x = -Math.PI / 2; padRing.position.set(P.pad.x, 0.09, P.pad.z); port.add(padRing);
  // terminal (solid) at the north-west of the yard
  box(port, 30, 7, 14, -700, 3.5, -429, white); box(port, 30.6, 0.5, 14.6, -700, 7.25, -429, trim); cols.push({ minX: -715, maxX: -685, minZ: -436, maxZ: -422 });
  const tsign = makeTex(512, 96, g => { g.fillStyle = '#0d2a4a'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.font = 'bold 40px sans-serif'; g.fillText('SKYHAVEN SKY PORT', 256, 60); });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.25), new THREE.MeshBasicMaterial({ map: tsign })); m.position.set(-700, 5.5, -421.9); port.add(m); }
  // fence round the yard, open at the gate
  const fenceM = mat(0x5d636b, { metal: 0.6 });
  const fence = (x0, x1, z0, z1) => { const w = Math.max(0.12, x1 - x0), d = Math.max(0.12, z1 - z0); box(port, w, 2.2, d, (x0 + x1) / 2, 1.1, (z0 + z1) / 2, fenceM); cols.push({ minX: x0 - 0.1, maxX: x1 + 0.1, minZ: z0 - 0.1, maxZ: z1 + 0.1 }); };
  fence(P.minX, P.gate.x - 4, P.minZ, P.minZ); fence(P.gate.x + 4, P.maxX, P.minZ, P.minZ); fence(P.minX, P.maxX, P.maxZ, P.maxZ); fence(P.minX, P.minX, P.minZ, P.maxZ); fence(P.maxX, P.maxX, P.minZ, P.maxZ);
  id('BLD', 'GEN', 'STL.GLS', 'GOV', 'Skyhaven Sky Port terminal', -700, -429);
  destinations.push({ name: 'Skyhaven Sky Port (airships to the sky city)', x: P.gate.x, z: P.minZ - 3 });

  // the airship
  const ship = new THREE.Group(); ship.name = 'Skyhaven airship'; scene.add(ship);
  { const env = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat(0xdfe6ee, { metal: 0.3, rough: 0.4 })); env.scale.set(22, 7, 7); env.position.y = 13; ship.add(env);
    const stripe = new THREE.Mesh(new THREE.SphereGeometry(1.01, 32, 4, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.1), mat(0x1f6feb)); stripe.scale.set(22, 7, 7); stripe.position.y = 13; ship.add(stripe);
    for (const s of [-1, 1]) { const f = box(ship, 4, 0.3, 6, -19, 13 + s * 3, 0, mat(0x1f6feb)); f.rotation.x = s * 0.5; }
    box(ship, 12, 3, 4.4, 0, 3.3, 0, white); box(ship, 12.2, 0.3, 4.6, 0, 1.75, 0, trim);
    for (let i = -2; i <= 2; i++) box(ship, 1.6, 1, 0.1, i * 2.2, 3.6, 2.21, glass);
    for (const s of [-1, 1]) box(ship, 0.4, 7.5, 0.4, s * 4, 8.4, 0, trim); }
  id('VEH', 'AIR', 'STL.FAB', 'GOV', 'Skyhaven airship', P.pad.x, P.pad.z);
  const lowPos = new THREE.Vector3(P.pad.x, 0, P.pad.z), highPos = new THREE.Vector3(C.x + dock.c * (dock.r1 + 4), Y - 1.75, C.z + dock.s * (dock.r1 + 4));
  const air = { state: 'port', t: 20, from: lowPos, to: highPos, rider: false, doors: true };
  ship.position.copy(lowPos); ship.rotation.y = -dockA;
  const DOCK = 35, FLY = 55;
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const deckPoint = () => ship.position.clone().add(new THREE.Vector3(0, 1.95, 0));
  // board / leave
  const boardSpot = { pos: lowPos.clone().add(new THREE.Vector3(0, 0, 0)), r: 7, get label() { return air.rider ? 'Leave the airship' : air.state === 'port' ? 'Board the airship to Skyhaven' : air.state === 'sky' ? 'Board the airship down to the Sky Port' : 'The airship is flying (it comes back on the timetable)'; },
    action: () => { if (air.rider) { if (!air.doors) return toast('Wait until the airship has docked.'); air.rider = false; ctx.leave(air.state === 'sky' ? dockLanding() : padLanding()); return; }
      if (!air.doors) return toast('The airship is in the air. It docks again in about ' + Math.ceil(air.t) + ' seconds.');
      if (!ctx.canBoard()) return toast('You can\'t board right now.');
      air.rider = true; ctx.board(); toast(air.state === 'port' ? '🎈 All aboard for Skyhaven. Departure in ' + Math.ceil(air.t) + ' seconds.' : '🎈 All aboard for the Sky Port. Departure in ' + Math.ceil(air.t) + ' seconds.'); } };
  interactables.push(boardSpot);
  const dockLanding = () => new THREE.Vector3(C.x + dock.c * (dock.r1 - 4), Y, C.z + dock.s * (dock.r1 - 4));
  const padLanding = () => new THREE.Vector3(P.pad.x, 0.1, P.pad.z - 20);

  // people: walkers on the boulevard and the streets, standers at the dock
  const ringPts = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [C.x + Math.cos(a) * 35, C.z + Math.sin(a) * 35]; });
  for (let i = 0; i < 8; i++) K.walker(i % 2 ? ringPts(24) : ringPts(24).reverse(), { t: i * 25, speed: 1 + (i % 3) * 0.15, y: Y + 0.05, off: (i % 3 - 1) * 1.2 });
  for (let k = 0; k < STREETS; k += 2) { const a = streetAngle(k); K.walker([[C.x + Math.cos(a) * 42, C.z + Math.sin(a) * 42], [C.x + Math.cos(a) * 100, C.z + Math.sin(a) * 100]], { t: k * 9, y: Y + 0.05, off: 1.5 }); }
  for (const s of [-1, 1]) K.stander(C.x + dock.c * 100 - dock.s * s * 4, C.z + dock.s * 100 + dock.c * s * 4, 0, { y: Y + 0.05 });
  destinations.push({ name: 'Skyhaven (sky city)', x: C.x + dock.c * 100, z: C.z + dock.s * 100 });

  // ---------------------------------------------------------------- where you can stand, and the core's defence
  const onIsland = (x, z) => Math.hypot(x - C.x, z - C.z) <= C.r;
  const onPier = (x, z) => { const dx = x - C.x, dz = z - C.z, along = dx * dock.c + dz * dock.s, across = -dx * dock.s + dz * dock.c; return along >= 100 && along <= dock.r1 && Math.abs(across) <= dock.half; };
  function groundAt(x, z, bodyY) { if (bodyY == null || bodyY < Y - 8) return null; return onIsland(x, z) || onPier(x, z) ? Y : null; }
  let fireT = 0, warnT = 0, alarm = 0, t = 0;
  const shots = [];
  function shoot(from, to) { const g = new THREE.BufferGeometry().setFromPoints([from, to]), l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xff2b2b })); scene.add(l); shots.push({ l, t: 0.12 }); }
  function update(dt, p) {
    t += dt;
    for (const r of rings) { r.rotation.y += dt * 0.6; r.rotation.z += dt * 0.25; }
    heart.scale.setScalar(1 + Math.sin(t * 2) * 0.06); glow.intensity = 3 + Math.sin(t * 2) * 0.6;
    for (const a of anchors) a.rotation.y += dt;
    for (const d of drifters) { d.a += d.s * dt; d.m.position.set(C.x + Math.cos(d.a) * d.r, d.y + Math.sin(t * 0.5 + d.r) * 2, C.z + Math.sin(d.a) * d.r); d.m.rotation.y += dt * 0.1; }
    for (let i = shots.length - 1; i >= 0; i--) { shots[i].t -= dt; if (shots[i].t <= 0) { scene.remove(shots[i].l); shots[i].l.geometry.dispose(); shots.splice(i, 1); } }
    // the airship's timetable
    air.t -= dt;
    if (air.state === 'port' && air.t <= 0) { air.state = 'up'; air.t = FLY; air.doors = false; }
    else if (air.state === 'up') { const u = ease(1 - Math.max(0, air.t) / FLY); ship.position.lerpVectors(lowPos, highPos, u); ship.position.y += Math.sin(u * Math.PI) * 30; if (air.t <= 0) { air.state = 'sky'; air.t = DOCK; air.doors = true; ship.position.copy(highPos); if (air.rider) toast('🎈 Welcome to Skyhaven. Step off onto the dock when you\'re ready.'); } }
    else if (air.state === 'sky' && air.t <= 0) { air.state = 'down'; air.t = FLY; air.doors = false; }
    else if (air.state === 'down') { const u = ease(1 - Math.max(0, air.t) / FLY); ship.position.lerpVectors(highPos, lowPos, u); ship.position.y += Math.sin(u * Math.PI) * 30; if (air.t <= 0) { air.state = 'port'; air.t = DOCK; air.doors = true; ship.position.copy(lowPos); if (air.rider) toast('🎈 Back at the Sky Port.'); } }
    boardSpot.pos.copy(air.state === 'sky' ? dockLanding() : air.state === 'port' ? padLanding().setZ(P.pad.z - 6) : ship.position);
    if (air.rider) ctx.carry(deckPoint());
    if (!p || air.rider) return;
    // keep people on the island: a parapet round the rim (the dock pier is the one way off, onto the airship)
    if (p.y > Y - 3 && p.y < Y + 4) {
      const dx = p.x - C.x, dz = p.z - C.z, r = Math.hypot(dx, dz);
      if (r > 107.6 && r < 112 && !onPier(p.x, p.z)) { p.x = C.x + dx / r * 107.6; p.z = C.z + dz / r * 107.6; }
      if (onPier(p.x, p.z)) { const along = dx * dock.c + dz * dock.s, across = -dx * dock.s + dz * dock.c, a2 = Math.min(along, dock.r1 - 0.5), c2 = Math.max(-dock.half + 0.5, Math.min(dock.half - 0.5, across)); p.x = C.x + dock.c * a2 - dock.s * c2; p.z = C.z + dock.s * a2 + dock.c * c2; }
      // the core's wall: solid all round except the gate
      const a = Math.atan2(dz, dx), da = Math.atan2(Math.sin(a - gateA), Math.cos(a - gateA));
      if (Math.abs(r - CORE_R) < 0.8 && Math.abs(da) > GATE_HALF) { const k = r < CORE_R ? CORE_R - 0.8 : CORE_R + 0.8; p.x = C.x + dx / r * k; p.z = C.z + dz / r * k; }
      const inside = Math.hypot(p.x - C.x, p.z - C.z) < CORE_R - 0.3;
      // turrets watch anyone close to the wall, and fire on anyone inside it. No warnings inside: kill on sight.
      if (r < CORE_R + 14) for (const tu of turrets) tu.head.rotation.y = Math.atan2(p.x - tu.x, p.z - tu.z);
      warnT -= dt; if (!inside && r < CORE_R + 6 && warnT <= 0) { warnT = 12; toast('⚠️ The Gravity Core is behind that wall. Anyone who goes in is shot on sight.'); }
      if (inside) { alarm = 1; fireT -= dt; if (fireT <= 0) { fireT = 0.35; for (const tu of turrets) shoot(new THREE.Vector3(tu.x, Y + 5.9, tu.z), new THREE.Vector3(p.x, p.y + 1.2, p.z)); ctx.hurt(45, p); if (warnT < 30) { warnT = 30; toast('🚨 INTRUDER AT THE GRAVITY CORE. TURRETS FIRING.'); } } }
      else alarm = Math.max(0, alarm - dt);
    }
    K.update?.(dt, p, 260);
  }
  return { root, ids, destinations, groundAt, update, get rider() { return air.rider; }, airship: air, ship, onIsland, inCore: (x, z, y) => Math.abs(y - Y) < 6 && Math.hypot(x - C.x, z - C.z) < CORE_R, center: C,
    leave() { if (!air.rider) return; if (!air.doors) return toast('Wait until the airship has docked.'); air.rider = false; ctx.leave(air.state === 'sky' ? dockLanding() : padLanding()); },
    cityAt: (x, z, y) => (y > Y - 10 && (onIsland(x, z) || onPier(x, z))) || (x >= P.minX && x <= P.maxX && z >= P.minZ && z <= P.maxZ) };
}
