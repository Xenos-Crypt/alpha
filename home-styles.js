// HOMES THAT FIT WHO YOU ARE
// - Everyone starts poor, so the ordinary home is run-down: grimy, cracked walls, boarded-up windows, a blue tarp
//   over a leaking roof, rubbish bags by the door, weeds in the garden, a water stain on the bedroom ceiling (the
//   one the opening film mentions). There's no car on the drive: you start with no vehicle.
// - The admin's home is a mansion on new land east of The Reserve: a walk-in house with marble floors, an
//   infinity pool and hot tub, a garage with a supercar you can drive, and a private airstrip with a hangar and
//   a private jet. A private road links it to The Reserve's avenue.
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

// ---------------- the admin's mansion, on new land ----------------
export function buildAdminEstate(ctx) {
  const { scene, K, makeTex, toast, curb } = ctx;
  const root = new THREE.Group(); root.name = "admin's estate"; scene.add(root);
  // everything on the estate has an ID (world-ids.js); the cars and the jet get theirs as vehicles
  const bot = makeBotany(ctx, 'Xenos Estate'), EST = 'Westhaven Builders';
  const tag = (cls, kind, mat, name, x, z, maker = EST) => bot.fixture(cls, kind, mat, maker, name, x, z, 'ADM');
  const { B, C, S, mat, solid, sign, place, spot, stander, sitter, hall } = K;
  const X0 = 1215, X1 = 1580, Z0 = 110, Z1 = 820;   // the new land, east of The Reserve
  const floors = [];

  // new ground: lawn, a private road from the north end of The Reserve's avenue, and a walled boundary
  const lawnTex = makeTex(128, 128, g => { g.fillStyle = '#5f8f3e'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + Math.random() * 40},${110 + Math.random() * 50},${40 + Math.random() * 30},0.5)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 3); } });
  lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping; lawnTex.repeat.set(60, 110);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set((X0 + X1) / 2, 0.02, (Z0 + Z1) / 2); lawn.receiveShadow = true; root.add(lawn);
  const tarmac = mat(0x3c4247, { rough: 0.9 });
  B(root, X0 + 60 - 1025, 0.06, 9, (1025 + X0 + 60) / 2, 0.04, 125, tarmac, false);   // private road east from the avenue
  B(root, 9, 0.06, 100, X0 + 60, 0.04, 175, tarmac, false);                         // and south to the house
  const wallC = mat(0xe8e2d6, { rough: 0.8 });
  for (const [w, d, x, z] of [[X1 - X0, 0.5, (X0 + X1) / 2, Z1], [0.5, Z1 - Z0, X1, (Z0 + Z1) / 2]]) { B(root, w, 2.2, d, x, 1.1, z, wallC); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2); }
  tag('LND', 'LWN', 'GRS', 'Estate lawn', (X0 + X1) / 2, (Z0 + Z1) / 2);
  tag('LND', 'ROD', 'ASP', 'Private road to the estate', (1025 + X0 + 60) / 2, 125);
  tag('LND', 'ROD', 'ASP', 'Estate drive', X0 + 60, 175);
  tag('LND', 'FEN', 'STN', 'Estate boundary wall', (X0 + X1) / 2, Z1);
  tag('LND', 'GAT', 'STN', 'Estate gate posts and name sign', X0 + 60, 128);
  // gate posts and a name sign at the drive
  for (const s of [-1, 1]) B(root, 0.8, 3, 0.8, X0 + 60 + s * 6, 1.5, 128, 0xd6c8a8);
  place(sign(ctx.title || 'PRIVATE ESTATE', 'residence · airstrip', 6, '#111111', '#d4af37', 'Georgia, serif'), X0 + 60, 3.6, 128, 0);

  // ---------------- the mansion: walk in on marble floors ----------------
  const hx0 = 1250, hx1 = 1300, hz0 = 210, hz1 = 240, H = 6;
  hall({ x0: hx0, x1: hx1, z0: hz0, z1: hz1, H, wall: 0xf6f3ee, floor: 0xf2efe9, floorKind: 'marble', roof: 0x2a2e33, gaps: { n: [[1272, 1278]], s: [[1268, 1282]] } });
  // a second storey on top, a glass front and gold trim, so it reads as a mansion from outside
  B(root, hx1 - hx0 + 6, 5, hz1 - hz0 - 6, (hx0 + hx1) / 2, H + 3, (hz0 + hz1) / 2, mat(0xf6f3ee, { rough: 0.6 }));
  B(root, hx1 - hx0 + 8, 0.4, hz1 - hz0 - 2, (hx0 + hx1) / 2, H + 5.7, (hz0 + hz1) / 2, 0x2a2e33);
  for (let x = hx0 + 2; x < hx1 - 1; x += 4) B(root, 3, 3.6, 0.1, x, H + 3, hz1 - 2.95, mat(0x3c6e8f, { rough: 0.05, metal: 0.5 }), false);
  B(root, hx1 - hx0 + 6.2, 0.18, 0.2, (hx0 + hx1) / 2, H + 0.6, hz1 + 0.05, 0xd4af37);
  tag('BLD', 'MAN', 'MRB.GLS', 'The mansion', (hx0 + hx1) / 2, (hz0 + hz1) / 2);
  for (const [n, x, z, m, mk] of [['Sofa', 1258, 222, 'LTH', 'Atelier Furniture'], ['Sofa', 1258, 228.5, 'LTH', 'Atelier Furniture'], ['Coffee table', 1258, 225.2, 'GLS', 'Atelier Furniture'], ['Wall TV', hx0 + 0.3, 225.2, 'GLS', 'Cryptic'],
    ['Kitchen island', 1290, 220, 'MRB', 'Atelier Furniture'], ['Dining table and six chairs', 1290, 231, 'WOD', 'Atelier Furniture'], ['Grand piano', 1274, 234, 'WOD', 'Atelier Furniture'], ['Chandelier', 1275, 225, 'GLS.GLD', 'Atelier Furniture'], ['Bed', 1296, 236, 'WOD', 'Atelier Furniture']])
    tag('PRD', 'FUR', m, n, x, z, mk);
  // inside: a lounge, a kitchen island, a dining table, a grand piano, a huge TV, a chandelier and a bed
  const sofa = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 3.2, 0.45, 1.1, 0, 0.35, 0, 0xf2efe9); B(g, 3.2, 0.7, 0.25, 0, 0.75, -0.45, 0xe9e4da); };
  sofa(1258, 222, 0); sofa(1258, 228.5, Math.PI); B(root, 1.6, 0.4, 1, 1258, 0.25, 225.2, mat(0x1a1a1a, { rough: 0.2, metal: 0.4 }));
  B(root, 0.15, 2.4, 4.2, hx0 + 0.3, 2.6, 225.2, mat(0x050505, { rough: 0.1, emissive: 0x0d2a4a, ei: 0.6 }), false);   // the TV
  sitter(1258, 222.4, 0, 0.6, { task: 'talk' });
  B(root, 5, 1, 1.4, 1290, 0.5, 220, mat(0xf5f5f5, { rough: 0.15 })); B(root, 5.2, 0.08, 1.6, 1290, 1.04, 220, mat(0x222222, { rough: 0.1, metal: 0.3 }));   // kitchen island
  B(root, 6, 0.1, 1.6, 1290, 0.85, 231, 0x5a3b26); for (let i = 0; i < 6; i++) B(root, 0.5, 0.9, 0.5, 1287.5 + i % 3 * 2.5, 0.45, 229.8 + Math.floor(i / 3) * 2.4, 0xd8d2c4);   // dining
  { const g = new THREE.Group(); g.position.set(1274, 0, 234); root.add(g); B(g, 1.6, 0.35, 2.2, 0, 0.9, 0, mat(0x0a0a0a, { rough: 0.1, metal: 0.3 })); for (const [x, z] of [[-0.6, -0.9], [0.6, -0.9], [0, 0.9]]) C(g, 0.06, 0.06, 0.8, x, 0.4, z, 0x0a0a0a, 6); }   // grand piano
  { const ch = new THREE.Group(); ch.position.set(1275, H - 1.2, 225); root.add(ch); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; S(ch, 0.12, Math.cos(a) * 1.1, Math.sin(i) * 0.15, Math.sin(a) * 1.1, mat(0xfff4d6, { emissive: 0xffe6a8, ei: 1.2 }), 6); } C(ch, 0.03, 0.03, 1.2, 0, 0.6, 0, 0xd4af37, 6); }
  { const bx = 1296, bz = 236; B(root, 2.6, 0.5, 2.2, bx, 0.35, bz, 0xf2efe9); B(root, 2.6, 1, 0.2, bx, 0.9, bz + 1.05, 0x2a2e33);
    spot(bx - 2, bz, 2, 'Sleep in your bed', () => ctx.sleep?.()); }
  spot(1275, hz0 - 1.5, 2.5, 'Your mansion', () => toast('🏛 Your mansion: marble floors, a pool out back, the garage to the east and your airstrip beyond it.'));
  // the drive and the supercar out front, two more in the garage
  B(root, 14, 0.06, 26, 1275, 0.04, 195, mat(0xd9d2c3, { rough: 0.8 }), false);
  const garage = { x0: 1306, x1: 1326, z0: 212, z1: 238 };
  hall({ x0: garage.x0, x1: garage.x1, z0: garage.z0, z1: garage.z1, H: 4, wall: 0xf6f3ee, floor: 0xcfd4d8, floorKind: 'tiles', roof: 0x2a2e33, gaps: { n: [[1309, 1323]] } });
  tag('LND', 'ROD', 'STN', 'Mansion forecourt', 1275, 195);
  tag('BLD', 'GAR', 'STN', 'Garage', (garage.x0 + garage.x1) / 2, (garage.z0 + garage.z1) / 2);
  const cars = [];
  if (ctx.makeVehicle) {
    for (const [style, col, x, z, ry] of [['supercar', 0xd4af37, 1275, 200, Math.PI], ['supercar', 0xc0392b, 1312, 228, Math.PI], ['sports', 0x111111, 1320, 228, Math.PI]]) {
      const v = ctx.makeVehicle('car', col, style); v.group.position.set(x, 0.06, z); v.group.rotation.y = ry; v.ownedId = 'admin-' + style + '-' + x; cars.push(v);
    }
  }
  // infinity pool, hot tub and loungers behind the house
  const px0 = 1252, px1 = 1298, pz0 = 246, pz1 = 258;
  B(root, px1 - px0 + 1.4, 0.45, pz1 - pz0 + 1.4, (px0 + px1) / 2, 0.22, (pz0 + pz1) / 2, mat(0xeae6dd, { rough: 0.6 }));
  B(root, px1 - px0, 0.05, pz1 - pz0, (px0 + px1) / 2, 0.43, (pz0 + pz1) / 2, mat(0x29b6e0, { rough: 0.05, metal: 0.2, opacity: 0.85 }), false);
  C(root, 1.8, 1.8, 0.6, 1305, 0.3, 252, mat(0xeae6dd)); C(root, 1.6, 1.6, 0.05, 1305, 0.6, 252, mat(0x5fd3f3, { opacity: 0.85, emissive: 0x0b5f80, ei: 0.4 }));
  for (let x = px0 + 2; x < px1; x += 5) { const g = new THREE.Group(); g.position.set(x, 0, pz1 + 3); root.add(g); B(g, 0.75, 0.1, 2, 0, 0.35, 0, 0xffffff); B(g, 0.75, 0.55, 0.1, 0, 0.65, -0.95, 0xffffff); }
  tag('LND', 'POL', 'WTR.TIL', 'Infinity pool', (px0 + px1) / 2, (pz0 + pz1) / 2); tag('LND', 'POL', 'WTR.TIL', 'Hot tub', 1305, 252);
  for (let x = px0 + 2; x < px1; x += 5) tag('PRD', 'LNG', 'PLS', 'Pool lounger', x, pz1 + 3, 'Atelier Furniture');
  const pools = [{ minX: px0, maxX: px1, minZ: pz0, maxZ: pz1 }, { minX: 1303.4, maxX: 1306.6, minZ: 250.4, maxZ: 253.6 }];

  // ---------------- the private airstrip, hangar and jet ----------------
  const rx = 1440, rz0 = 180, rz1 = 790;
  B(root, 32, 0.06, rz1 - rz0, rx, 0.05, (rz0 + rz1) / 2, mat(0x2f3439, { rough: 0.9 }), false);
  for (let z = rz0 + 10; z < rz1 - 10; z += 18) B(root, 0.8, 0.02, 9, rx, 0.09, z, 0xffffff, false);   // centre line
  for (const s of [-1, 1]) for (let z = rz0; z <= rz1; z += 20) S(root, 0.18, rx + s * 16.5, 0.25, z, mat(0xffffff, { emissive: s > 0 ? 0x2b8a3e : 0xc92a2a, ei: 1 }), 6);   // edge lights
  for (let i = 0; i < 8; i++) B(root, 1.4, 0.02, 12, rx - 12 + i * 3.4, 0.09, rz0 + 8, 0xffffff, false);   // threshold stripes
  // the hangar
  const hgx0 = 1470, hgx1 = 1510, hgz0 = 200, hgz1 = 240;
  hall({ x0: hgx0, x1: hgx1, z0: hgz0, z1: hgz1, H: 10, wall: 0xdfe3e6, floor: 0xbfc5ca, floorKind: 'tech', roof: 0x9aa3ab, gaps: { w: [[hgz0 + 4, hgz1 - 4]] } });
  place(sign('PRIVATE HANGAR', 'authorised aircraft only', 6, '#111111', '#d4af37', 'sans-serif'), hgx0 - 0.3, 8.5, (hgz0 + hgz1) / 2, -Math.PI / 2);
  B(root, 30, 0.06, 40, (rx + hgx0) / 2 + 1, 0.05, 220, mat(0x2f3439, { rough: 0.9 }), false);   // taxiway to the runway
  tag('LND', 'RWY', 'ASP', 'Private runway', rx, (rz0 + rz1) / 2); tag('PRD', 'DEC', 'GLS', 'Runway edge lights', rx + 16.5, rz0);
  tag('BLD', 'HGR', 'STL', 'Private hangar', (hgx0 + hgx1) / 2, (hgz0 + hgz1) / 2); tag('LND', 'ROD', 'ASP', 'Taxiway', (rx + hgx0) / 2 + 1, 220);
  let jet = null;
  if (ctx.makeAircraft) { jet = ctx.makeAircraft({ name: 'Private jet', color: 0xf7f7f7, accent: 0xd4af37, maxSpeed: 92, takeoff: 34, turn: 0.8, jet: true, home: [rx, rz0 + 22] }); jet.ownedId = 'admin-jet'; }
  stander(hgx0 - 4, 226, -Math.PI / 2, { outfit: 0x1c2a4a, task: 'talk' });
  spot(hgx0 - 4, 222, 2, 'Your private jet', () => toast('✈️ Your private jet is waiting on the runway. Walk up to it to fly. Take off down the runway (south).'));

  bot.people(K);   // the friend on the sofa and the pilot
  return {
    pools, cars, jet,
    home: { x: 1275, z: hz0 - 3 },   // where you appear when you go home: the front door
    groundAt: () => null,
  };
}
