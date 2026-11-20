// HOMES THAT FIT WHO YOU ARE
// - Everyone starts poor, so the ordinary home is run-down: grimy, cracked walls, boarded-up windows, a blue tarp
//   over a leaking roof, rubbish bags by the door, weeds in the garden, a water stain on the bedroom ceiling (the
//   one the opening film mentions). There's no car on the drive: you start with no vehicle.
// - The admin's mansion stands on empty land south of Northhaven (checked clear of everything, inside the dome):
//   a walk-in house with marble floors, an infinity pool and hot tub, a garage with supercars, and a private
//   airstrip with a hangar and a jet. Its drive joins Northhaven's south road.
import * as THREE from 'three';
import { makeBotany } from './botany.js';

// ---------------- the run-down home ----------------
export function makeRundown(ctx) {
  const { scene, makeTex, home, curb } = ctx, fy = ctx.floorY ?? curb;   // fy: the floor your home is on (the top floor of the tenement)
  const root = new THREE.Group(); root.name = 'run-down home'; scene.add(root);
  // every bit of the mess has an ID too (world-ids.js)
  const bot = makeBotany(ctx, 'your home'), tag = (cls, kind, mat, maker, name, x, z, owner = 'PLR') => bot.fixture(cls, kind, mat, maker, name, x, z, owner);
  tag('LND', 'STN', 'PNT', 'Weather and age', 'Grime, cracks and peeling paint on the walls', home.x, home.minZ);
  tag('PRD', 'DEC', 'WOD', 'Westhaven Builders', 'Planks nailed over the front windows', home.x, home.minZ - 0.1);
  tag('PRD', 'TRP', 'PLS', 'MarketWay Retail', 'Blue tarp over the roof leak', home.x + 1.5, home.z - 2.7);
  for (const dx of [-1.6, 1.6]) tag('PRD', 'TRS', 'RBR', 'Old car tyre', 'Tyre weighing the tarp down', home.x + 1.5 + dx, home.z - 4.1);
  for (const dx of [2.6, 3.2, 2.9]) tag('PRD', 'TRS', 'PLS', 'Household rubbish', 'Rubbish bag by the door', home.x + dx, home.minZ - 1);
  tag('PRD', 'FUR', 'PLS', 'MarketWay Retail', 'Broken plastic chair', home.x - 4.2, home.minZ - 2.2);
  tag('LND', 'WED', 'PLT', 'Nature', 'Weeds through the front garden', home.x, home.minZ - 3);
  if (ctx.bedroom) tag('LND', 'STN', 'WTR', 'The roof leak', 'Hand-shaped water stain on the bedroom ceiling', ctx.bedroom.x, ctx.bedroom.z);
  // grime, cracks and peeling paint drawn on a see-through texture laid over each outside wall
  const grime = makeTex(256, 128, g => {
    g.clearRect(0, 0, 256, 128);
    for (let i = 0; i < 26; i++) { const x = Math.random() * 256, w = 4 + Math.random() * 14; const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, 'rgba(60,50,35,0.45)'); grd.addColorStop(1, 'rgba(60,50,35,0)'); g.fillStyle = grd; g.fillRect(x, 0, w, 60 + Math.random() * 68); }   // drip streaks
    g.fillStyle = 'rgba(70,80,50,0.35)'; g.fillRect(0, 104, 256, 24);   // damp and moss along the bottom
    g.strokeStyle = 'rgba(30,25,20,0.7)'; g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { let x = Math.random() * 256, y = Math.random() * 60; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 22; y += 6 + Math.random() * 8; g.lineTo(x, y); } g.stroke(); }   // cracks
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(180,170,150,0.8)'; const x = Math.random() * 240, y = Math.random() * 100; g.beginPath(); g.ellipse(x, y, 5 + Math.random() * 9, 3 + Math.random() * 6, Math.random(), 0, 7); g.fill(); }   // flaking paint
  });
  const grimeMat = new THREE.MeshStandardMaterial({ map: grime, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const W = home.maxX - home.minX, D = home.maxZ - home.minZ, H = 3;
  const wall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), grimeMat); m.position.set(x, fy + H / 2, z); m.rotation.y = ry; root.add(m); };
  wall(W, home.x, home.minZ - 0.03, Math.PI); wall(W, home.x, home.maxZ + 0.03, 0); wall(D, home.minX - 0.03, (home.minZ + home.maxZ) / 2, -Math.PI / 2); wall(D, home.maxX + 0.03, (home.minZ + home.maxZ) / 2, Math.PI / 2);
  // boarded-up windows: rough planks nailed across
  const plank = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 });
  const winX = (W / 2 + 1) / 2;   // the front windows sit halfway between the door and each corner
  for (const wx of [home.x - winX, home.x + winX]) for (const [dy, rz] of [[0.25, 0.18], [-0.2, -0.12], [0.05, 0.4]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.04), plank); p.position.set(wx, fy + 1.55 + dy, home.minZ - 0.08); p.rotation.z = rz; p.castShadow = true; root.add(p);
  }
  // a blue tarp weighed down over a leak in the roof
  const tarp = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x1c6fb8, roughness: 0.6, side: THREE.DoubleSide }));
  tarp.position.set(home.x + 1.5, fy + 3.2, home.z - 1.2); tarp.rotation.set(-Math.PI / 2 - 0.05, 0, 0.05); root.add(tarp);
  for (const dx of [-1.6, 1.6]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.25), new THREE.MeshStandardMaterial({ color: 0x8a8a8a })); t.position.set(home.x + 1.5 + dx, fy + 3.3, home.z - 2.6); root.add(t); }   // tyres holding it down
  // rubbish bags by the door, a broken chair, weeds through the garden
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35 });
  for (const [dx, dz, s] of [[2.0, -0.5, 0.3], [2.5, -0.8, 0.26], [2.3, -1.05, 0.22]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(s, 9, 7), bagMat); b.scale.y = 0.8; b.position.set(home.x + dx, fy + s * 0.7, home.minZ + dz); root.add(b); }   // bags piled on the balcony
  const chair = new THREE.Group(); chair.position.set(home.x - 3.2, fy, home.minZ - 0.7); chair.rotation.set(0, 0.6, 0); root.add(chair);   // a cracked plastic chair on the balcony
  for (const [w, h, d, x, y, z] of [[0.5, 0.05, 0.5, 0, 0.45, 0], [0.5, 0.5, 0.05, 0, 0.7, -0.22], [0.04, 0.45, 0.04, 0.22, 0.22, 0.22]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0xd8d2c4 })); m.position.set(x, y, z); chair.add(m); }
  const weedMat = new THREE.MeshStandardMaterial({ color: 0x6b7a2a, roughness: 1 }), weedGeo = new THREE.ConeGeometry(0.12, 0.55, 4);
  const weeds = new THREE.InstancedMesh(weedGeo, weedMat, 90), o = new THREE.Object3D();
  for (let i = 0; i < 90; i++) { o.position.set(home.x - 6 + Math.random() * 12, curb + 0.25, home.minZ - 3.8 + Math.random() * 3.5); /* weeds in the strip of dirt out front */ if (Math.abs(o.position.x - home.x) < 1.2) o.position.x += 2.4; o.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4); o.scale.setScalar(0.6 + Math.random()); o.updateMatrix(); weeds.setMatrixAt(i, o.matrix); }
  root.add(weeds);
  // the water stain shaped like a hand, on the bedroom ceiling
  if (ctx.bedroom) {
    const stain = makeTex(128, 128, g => { g.clearRect(0, 0, 128, 128); g.fillStyle = 'rgba(120,95,50,0.45)'; g.beginPath(); g.ellipse(64, 74, 26, 30, 0, 0, 7); g.fill(); for (let f = 0; f < 5; f++) { g.save(); g.translate(64, 60); g.rotate(-0.9 + f * 0.42); g.beginPath(); g.ellipse(0, -34, 7, 20, 0, 0, 7); g.fill(); g.restore(); } g.strokeStyle = 'rgba(90,70,35,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 70, 40, 0, 7); g.stroke(); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: stain, transparent: true, depthWrite: false }));
    m.position.set(ctx.bedroom.x, fy + 2.97, ctx.bedroom.z); m.rotation.x = Math.PI / 2; root.add(m);
  }
  return root;
}

// ---------------- the admin's mansion, on empty land south of Northhaven ----------------
export function buildAdminEstate(ctx) {
  const { scene, K, makeTex, toast, curb } = ctx;
  const root = new THREE.Group(); root.name = "admin's estate"; scene.add(root);
  // everything on the estate has an ID (world-ids.js); the cars and the jet get theirs as vehicles
  const bot = makeBotany(ctx, 'Xenos Estate'), EST = 'Westhaven Builders';
  const tag = (cls, kind, mat, name, x, z, maker = EST) => bot.fixture(cls, kind, mat, maker, name, x, z, 'ADM');
  const { B, C, S, mat, solid, sign, place, spot, stander, sitter, hall } = K;
  // The land: empty, flat ground south of Northhaven and east of Fort Halberd, inside the dome, checked clear
  // of every building, wall, road and landmark (with a 20 m gap). The drive joins Northhaven's south road.
  const X0 = 820, X1 = 1060, Z0 = -810, Z1 = -350, GX = 960, ROAD_Z = -320;   // (the corner of Northhaven's junction at x 952-968: the drive fills the gap there)
  const DX = -275, DZ = -660;   // the house, garage and pools keep their old layout, moved here
  const floors = [];

  // ground: lawn, the drive in from Northhaven, and a wall all the way round with the gate in the north wall
  const lawnTex = makeTex(128, 128, g => { g.fillStyle = '#5f8f3e'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + Math.random() * 40},${110 + Math.random() * 50},${40 + Math.random() * 30},0.5)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 3); } });
  lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping; lawnTex.repeat.set(40, 76);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set((X0 + X1) / 2, 0.02, (Z0 + Z1) / 2); lawn.receiveShadow = true; root.add(lawn);
  const tarmac = mat(0x3c4247, { rough: 0.9 });
  // the drive: from the road, through the gate, south to z -465.5; then east along z -470 to the forecourt's
  // west edge (x 993). The two pieces meet edge to edge, never overlapping (no flicker).
  B(root, 9, 0.06, ROAD_Z + 465.5, GX, 0.04, (ROAD_Z - 465.5) / 2, tarmac, false);
  B(root, 993 - (GX - 4.5), 0.06, 9, (993 + GX - 4.5) / 2, 0.04, -470, tarmac, false);
  const wallC = mat(0xe8e2d6, { rough: 0.8 });
  const wall = (x0, x1, z0, z1) => { const w = Math.max(0.5, x1 - x0), d = Math.max(0.5, z1 - z0), x = (x0 + x1) / 2, z = (z0 + z1) / 2; B(root, w, 2.2, d, x, 1.1, z, wallC); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };
  wall(X0, GX - 6, Z1, Z1); wall(GX + 6, X1, Z1, Z1); wall(X0, X1, Z0, Z0); wall(X0, X0, Z0, Z1); wall(X1, X1, Z0, Z1);
  tag('LND', 'LWN', 'GRS', 'Estate lawn', (X0 + X1) / 2, (Z0 + Z1) / 2);
  tag('LND', 'ROD', 'ASP', 'Estate drive', GX, -410);
  tag('LND', 'FEN', 'STN', 'Estate boundary wall', (X0 + X1) / 2, Z0);
  tag('LND', 'GAT', 'STN', 'Estate gate posts and name sign', GX, Z1);
  for (const sd of [-1, 1]) B(root, 0.8, 3, 0.8, GX + sd * 6, 1.5, Z1, 0xd6c8a8);
  place(sign(ctx.title || 'PRIVATE ESTATE', 'residence · airstrip', 6, '#111111', '#d4af37', 'Georgia, serif'), GX, 3.6, Z1 + 0.5, 0);   // facing the road (north), so it reads the right way round

  // ---------------- the mansion: walk in on marble floors ----------------
  const hx0 = 1250 + DX, hx1 = 1300 + DX, hz0 = 210 + DZ, hz1 = 240 + DZ, H = 6, cx = (hx0 + hx1) / 2;
  hall({ x0: hx0, x1: hx1, z0: hz0, z1: hz1, H, wall: 0xf6f3ee, floor: 0xf2efe9, floorKind: 'marble', roof: 0x2a2e33, gaps: { n: [[cx - 3, cx + 3]], s: [[cx - 7, cx + 7]] } });
  B(root, hx1 - hx0 + 6, 5, hz1 - hz0 - 6, cx, H + 3, (hz0 + hz1) / 2, mat(0xf6f3ee, { rough: 0.6 }));
  B(root, hx1 - hx0 + 8, 0.4, hz1 - hz0 - 2, cx, H + 5.7, (hz0 + hz1) / 2, 0x2a2e33);
  for (let x = hx0 + 2; x < hx1 - 1; x += 4) B(root, 3, 3.6, 0.1, x, H + 3, hz0 + 2.95, mat(0x3c6e8f, { rough: 0.05, metal: 0.5 }), false);   // glass front (faces the forecourt)
  B(root, hx1 - hx0 + 6.2, 0.18, 0.2, cx, H + 0.6, hz0 - 0.05, 0xd4af37);
  tag('BLD', 'MAN', 'MRB.GLS', 'The mansion', cx, (hz0 + hz1) / 2);
  const P = (x, z) => [x + DX, z + DZ];
  for (const [n, x, z, m, mk] of [['Sofa', 1258, 222, 'LTH', 'Atelier Furniture'], ['Sofa', 1258, 228.5, 'LTH', 'Atelier Furniture'], ['Coffee table', 1258, 225.2, 'GLS', 'Atelier Furniture'], ['Wall TV', 1250.3, 225.2, 'GLS', 'Cryptic'],
    ['Kitchen island', 1290, 220, 'MRB', 'Atelier Furniture'], ['Dining table and six chairs', 1290, 231, 'WOD', 'Atelier Furniture'], ['Grand piano', 1274, 234, 'WOD', 'Atelier Furniture'], ['Chandelier', 1275, 225, 'GLS.GLD', 'Atelier Furniture'], ['Bed', 1296, 236, 'WOD', 'Atelier Furniture']])
    tag('PRD', 'FUR', m, n, ...P(x, z), mk);
  const sofa = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 3.2, 0.45, 1.1, 0, 0.35, 0, 0xf2efe9); B(g, 3.2, 0.7, 0.25, 0, 0.75, -0.45, 0xe9e4da); };
  sofa(...P(1258, 222), 0); sofa(...P(1258, 228.5), Math.PI); B(root, 1.6, 0.4, 1, ...[P(1258, 225.2)].map(([x, z]) => [x, 0.25, z])[0], mat(0x1a1a1a, { rough: 0.2, metal: 0.4 }));
  B(root, 0.15, 2.4, 4.2, hx0 + 0.3, 2.6, P(0, 225.2)[1], mat(0x050505, { rough: 0.1, emissive: 0x0d2a4a, ei: 0.6 }), false);   // the TV
  sitter(...P(1258, 222.4), 0, 0.6, { task: 'talk' });
  { const [x, z] = P(1290, 220); B(root, 5, 1, 1.4, x, 0.5, z, mat(0xf5f5f5, { rough: 0.15 })); B(root, 5.2, 0.08, 1.6, x, 1.04, z, mat(0x222222, { rough: 0.1, metal: 0.3 })); }   // kitchen island
  { const [x, z] = P(1290, 231); B(root, 6, 0.1, 1.6, x, 0.85, z, 0x5a3b26); for (let i = 0; i < 6; i++) B(root, 0.5, 0.9, 0.5, x - 2.5 + i % 3 * 2.5, 0.45, z - 1.2 + Math.floor(i / 3) * 2.4, 0xd8d2c4); }   // dining
  { const [x, z] = P(1274, 234), g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); B(g, 1.6, 0.35, 2.2, 0, 0.9, 0, mat(0x0a0a0a, { rough: 0.1, metal: 0.3 })); for (const [a, b] of [[-0.6, -0.9], [0.6, -0.9], [0, 0.9]]) C(g, 0.06, 0.06, 0.8, a, 0.4, b, 0x0a0a0a, 6); }   // grand piano
  { const [x, z] = P(1275, 225), ch = new THREE.Group(); ch.position.set(x, H - 1.2, z); root.add(ch); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; S(ch, 0.12, Math.cos(a) * 1.1, Math.sin(i) * 0.15, Math.sin(a) * 1.1, mat(0xfff4d6, { emissive: 0xffe6a8, ei: 1.2 }), 6); } C(ch, 0.03, 0.03, 1.2, 0, 0.6, 0, 0xd4af37, 6); }
  { const [bx, bz] = P(1296, 236); B(root, 2.6, 0.5, 2.2, bx, 0.35, bz, 0xf2efe9); B(root, 2.6, 1, 0.2, bx, 0.9, bz + 1.05, 0x2a2e33); spot(bx - 2, bz, 2, 'Sleep in your bed', () => ctx.sleep?.()); }
  spot(cx, hz0 - 1.5, 2.5, 'Your mansion', () => toast('🏛 Your mansion: marble floors, the pool out back, the garage to the east and your airstrip on the west side.'));
  // the forecourt and the supercar out front, two more in the garage
  { const [x, z] = P(1275, 195); B(root, 14, 0.06, 26, x, 0.04, z, mat(0xd9d2c3, { rough: 0.8 }), false); tag('LND', 'ROD', 'STN', 'Mansion forecourt', x, z); }
  const garage = { x0: 1306 + DX, x1: 1326 + DX, z0: 212 + DZ, z1: 238 + DZ };
  hall({ x0: garage.x0, x1: garage.x1, z0: garage.z0, z1: garage.z1, H: 4, wall: 0xf6f3ee, floor: 0xcfd4d8, floorKind: 'tiles', roof: 0x2a2e33, gaps: { n: [[garage.x0 + 3, garage.x1 - 3]] } });
  tag('BLD', 'GAR', 'STN', 'Garage', (garage.x0 + garage.x1) / 2, (garage.z0 + garage.z1) / 2);
  const cars = [];
  if (ctx.makeVehicle) for (const [style, col, x, z] of [['supercar', 0xd4af37, 1275, 200], ['supercar', 0xc0392b, 1312, 228], ['sports', 0x111111, 1320, 228]]) {
    const v = ctx.makeVehicle('car', col, style); v.group.position.set(x + DX, 0.06, z + DZ); v.group.rotation.y = Math.PI; v.ownedId = 'admin-' + style + '-' + x; cars.push(v);
  }
  // infinity pool, hot tub and loungers behind the house (between it and the north wall)
  const px0 = 1252 + DX, px1 = 1298 + DX, pz0 = 246 + DZ, pz1 = 258 + DZ, tub = P(1305, 252);
  B(root, px1 - px0 + 1.4, 0.45, pz1 - pz0 + 1.4, (px0 + px1) / 2, 0.22, (pz0 + pz1) / 2, mat(0xeae6dd, { rough: 0.6 }));
  B(root, px1 - px0, 0.05, pz1 - pz0, (px0 + px1) / 2, 0.43, (pz0 + pz1) / 2, mat(0x29b6e0, { rough: 0.05, metal: 0.2, opacity: 0.85 }), false);
  C(root, 1.8, 1.8, 0.6, tub[0], 0.3, tub[1], mat(0xeae6dd)); C(root, 1.6, 1.6, 0.05, tub[0], 0.6, tub[1], mat(0x5fd3f3, { opacity: 0.85, emissive: 0x0b5f80, ei: 0.4 }));
  for (let x = px0 + 2; x < px1; x += 5) { const g = new THREE.Group(); g.position.set(x, 0, pz1 + 3); root.add(g); B(g, 0.75, 0.1, 2, 0, 0.35, 0, 0xffffff); B(g, 0.75, 0.55, 0.1, 0, 0.65, -0.95, 0xffffff); }
  tag('LND', 'POL', 'WTR.TIL', 'Infinity pool', (px0 + px1) / 2, (pz0 + pz1) / 2); tag('LND', 'POL', 'WTR.TIL', 'Hot tub', ...tub);
  for (let x = px0 + 2; x < px1; x += 5) tag('PRD', 'LNG', 'PLS', 'Pool lounger', x, pz1 + 3, 'Atelier Furniture');
  // waterY: where the water's surface is (the pool sits up on its deck, so you swim at that height, not the sea's)
  const pools = [{ minX: px0, maxX: px1, minZ: pz0, maxZ: pz1, waterY: 0.44 }, { minX: tub[0] - 1.6, maxX: tub[0] + 1.6, minZ: tub[1] - 1.6, maxZ: tub[1] + 1.6, waterY: 0.6 }];
  const deck = { minX: px0 - 0.7, maxX: px1 + 0.7, minZ: pz0 - 0.7, maxZ: pz1 + 0.7 };

  // ---------------- the private airstrip (west side), hangar and jet ----------------
  const rx = 870, rz0 = -800, rz1 = -480;
  B(root, 32, 0.06, rz1 - rz0, rx, 0.05, (rz0 + rz1) / 2, mat(0x2f3439, { rough: 0.9 }), false);
  for (let z = rz0 + 10; z < rz1 - 10; z += 18) B(root, 0.8, 0.02, 9, rx, 0.09, z, 0xffffff, false);   // centre line
  for (const sd of [-1, 1]) for (let z = rz0; z <= rz1; z += 20) S(root, 0.18, rx + sd * 16.5, 0.25, z, mat(0xffffff, { emissive: sd > 0 ? 0x2b8a3e : 0xc92a2a, ei: 1 }), 6);   // edge lights
  for (let i = 0; i < 8; i++) B(root, 1.4, 0.02, 12, rx - 12 + i * 3.4, 0.09, rz0 + 8, 0xffffff, false);   // threshold stripes
  const hgx0 = 892, hgx1 = 932, hgz0 = -790, hgz1 = -750;
  hall({ x0: hgx0, x1: hgx1, z0: hgz0, z1: hgz1, H: 10, wall: 0xdfe3e6, floor: 0xbfc5ca, floorKind: 'tech', roof: 0x9aa3ab, gaps: { w: [[hgz0 + 4, hgz1 - 4]] } });
  place(sign('PRIVATE HANGAR', 'authorised aircraft only', 6, '#111111', '#d4af37', 'sans-serif'), hgx0 - 0.3, 8.5, (hgz0 + hgz1) / 2, -Math.PI / 2);
  B(root, hgx0 - (rx + 16), 0.06, 40, (rx + 16 + hgx0) / 2, 0.05, (hgz0 + hgz1) / 2, mat(0x2f3439, { rough: 0.9 }), false);   // taxiway
  tag('LND', 'RWY', 'ASP', 'Private runway', rx, (rz0 + rz1) / 2); tag('PRD', 'DEC', 'GLS', 'Runway edge lights', rx + 16.5, rz0);
  tag('BLD', 'HGR', 'STL', 'Private hangar', (hgx0 + hgx1) / 2, (hgz0 + hgz1) / 2); tag('LND', 'ROD', 'ASP', 'Taxiway', (rx + 16 + hgx0) / 2, (hgz0 + hgz1) / 2);
  let jet = null;
  if (ctx.makeAircraft) { jet = ctx.makeAircraft({ name: 'Private jet', color: 0xf7f7f7, accent: 0xd4af37, maxSpeed: 92, takeoff: 34, turn: 0.8, jet: true, home: [rx, rz0 + 22] }); jet.ownedId = 'admin-jet'; }
  stander(hgx0 - 3, (hgz0 + hgz1) / 2 + 4, -Math.PI / 2, { outfit: 0x1c2a4a, task: 'talk' });
  spot(hgx0 - 3, (hgz0 + hgz1) / 2, 2, 'Your private jet', () => toast('✈️ Your private jet is waiting on the runway. Walk up to it to fly. Take off up the runway, northwards.'));

  bot.people(K);   // the friend on the sofa and the pilot
  return {
    pools, cars, jet, bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    home: { x: cx, z: hz0 - 3 },   // where you appear when you go home: the front door
    // you stand on the pool's deck (it's raised); inside the water you swim
    groundAt: (x, z) => (x >= deck.minX && x <= deck.maxX && z >= deck.minZ && z <= deck.maxZ && !(x > px0 && x < px1 && z > pz0 && z < pz1)) ? 0.45 : null,
  };
}
