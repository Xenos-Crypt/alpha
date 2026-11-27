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
  // west edge (x 984). The two pieces meet edge to edge, never overlapping (no flicker).
  B(root, 9, 0.06, ROAD_Z + 465.5, GX, 0.04, (ROAD_Z - 465.5) / 2, tarmac, false);
  B(root, 984 - (GX - 4.5), 0.06, 9, (984 + GX - 4.5) / 2, 0.04, -470, tarmac, false);
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
  // A modern villa. Ground floor: the walk-in rooms behind tall windows (real openings with glass in them, so you
  // see in and out), the front door under a canopy on two stone columns. Upper floor: set back, glazed across the
  // front, with a glass balcony; a thin roof slab overhangs both. (The upper floor is the outside of the house only.)
  const winF = [[978, 984], [987, 994], [1006, 1013], [1016, 1022]], winB = [[977, 987]], winW = [[-443, -439]];
  const byX = (a, b) => a[0] - b[0];
  const houseHall = hall({ x0: hx0, x1: hx1, z0: hz0, z1: hz1, H, wall: 0xf3eee4, floor: 0xf2efe9, floorKind: 'marble', roof: 0x2e2a27,
    gaps: { n: [...winF, [cx - 3, cx + 3]].sort(byX), s: [...winB, [cx - 7, cx + 7]].sort(byX), w: winW } });
  const glass = mat(0x9fc4d6, { opacity: 0.28, rough: 0.05, metal: 0.4 }), bronze = mat(0x3b3530, { rough: 0.4, metal: 0.6 }), stone = mat(0xb9ad98, { rough: 0.9 });
  const pane = (ax, az, bx, bz) => {   // glass filling an opening 3.2 m tall, with bronze frames and mullions every metre and a half
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az), len = alongX ? bx - ax : bz - az, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    B(root, alongX ? len : 0.05, 3.2, alongX ? 0.05 : len, mx, 1.6, mz, glass, false); solid(Math.min(ax, bx) - (alongX ? 0 : 0.1), Math.max(ax, bx) + (alongX ? 0 : 0.1), Math.min(az, bz) - (alongX ? 0.1 : 0), Math.max(az, bz) + (alongX ? 0.1 : 0));
    const n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) { const t = i / n; B(root, alongX ? 0.08 : 0.12, 3.2, alongX ? 0.12 : 0.08, ax + (bx - ax) * t, 1.6, az + (bz - az) * t, bronze, false); }
    for (const y of [0.04, 3.16]) B(root, alongX ? len : 0.12, 0.08, alongX ? 0.12 : len, mx, y, mz, bronze, false);
  };
  for (const [a, b] of winF) pane(a, hz0, b, hz0); for (const [a, b] of winB) pane(a, hz1, b, hz1); for (const [a, b] of winW) pane(hx0, a, hx0, b);
  // stone cladding on the corners and between the front windows, a dark plinth all round
  for (const x of [hx0 + 0.6, 985.5, 995.5, 1004.5, 1014.5, hx1 - 0.6]) B(root, x === hx0 + 0.6 || x === hx1 - 0.6 ? 1.5 : 1.2, H, 0.14, x, H / 2, hz0 - 0.2, stone, false);
  for (const [w, d, x, z] of [[hx1 - hx0 + 0.4, 0.5, cx, hz0 - 0.1], [hx1 - hx0 + 0.4, 0.5, cx, hz1 + 0.1], [0.5, hz1 - hz0, hx0 - 0.1, (hz0 + hz1) / 2], [0.5, hz1 - hz0, hx1 + 0.1, (hz0 + hz1) / 2]]) {
    const segs = d === 0.5 ? (z < (hz0 + hz1) / 2 ? [...winF, [cx - 3, cx + 3]] : [...winB, [cx - 7, cx + 7]]).sort(byX) : [];
    if (!segs.length) { B(root, w, 0.35, d, x, 0.175, z, 0x4a4440, false); continue; }
    let a = hx0 - 0.2; for (const [g0, g1] of [...segs, [hx1 + 0.2, hx1 + 0.2]]) { if (g0 - a > 0.05) B(root, g0 - a, 0.35, d, (a + g0) / 2, 0.175, z, 0x4a4440, false); a = g1; }
  }
  // the front door: a bronze frame, a canopy on two stone columns, lanterns either side, a stone landing
  B(root, 6.3, 0.2, 0.3, cx, 3.25, hz0 - 0.05, bronze, false); for (const sd of [-1, 1]) B(root, 0.15, 3.3, 0.3, cx + sd * 3.05, 1.65, hz0 - 0.05, bronze, false);
  B(root, 10, 0.35, 5, cx, 3.9, hz0 - 2.4, mat(0xf3eee4, { rough: 0.6 })); B(root, 10.1, 0.12, 5.1, cx, 3.7, hz0 - 2.4, bronze, false);
  for (const sd of [-1, 1]) { C(root, 0.32, 0.36, 3.7, cx + sd * 4.4, 1.85, hz0 - 4.4, stone, 16); solid(cx + sd * 4.4 - 0.36, cx + sd * 4.4 + 0.36, hz0 - 4.76, hz0 - 4.04);
    B(root, 0.3, 0.55, 0.3, cx + sd * 3.6, 2.4, hz0 - 0.3, bronze, false); B(root, 0.2, 0.4, 0.2, cx + sd * 3.6, 2.4, hz0 - 0.42, mat(0xfff1cf, { emissive: 0xffc870, ei: 1.6 }), false); }
  for (const [x, z] of [[cx - 3, hz0 - 3], [cx, hz0 - 3], [cx + 3, hz0 - 3], [cx - 1.5, hz0 - 1.4], [cx + 1.5, hz0 - 1.4]]) S(root, 0.12, x, 3.68, z, mat(0xffffff, { emissive: 0xffe2a0, ei: 1.5 }), 8);   // downlights under the canopy
  B(root, 11, 0.05, 5, cx, 0.065, hz0 - 2.4, stone, false);
  // the upper storey: set back from the front, glass across the front, a balcony with a glass rail, a roof slab
  const ux0 = 981, ux1 = 1019, uz0 = hz0 + 4, uz1 = hz1 - 2, UH = 4.2, uy = H + 0.5;
  const upWall = mat(0xf3eee4, { rough: 0.6 }), warm = mat(0x6d5a3e, { emissive: 0xffd08a, ei: 0.35, rough: 0.2 });
  B(root, ux1 - ux0, UH, 0.3, cx, uy + UH / 2, uz1, upWall); B(root, 0.3, UH, uz1 - uz0, ux0, uy + UH / 2, (uz0 + uz1) / 2, upWall); B(root, 0.3, UH, uz1 - uz0, ux1, uy + UH / 2, (uz0 + uz1) / 2, upWall);
  const upGlass = mat(0x7fa6bb, { opacity: 0.4, rough: 0.05, metal: 0.5 }), DOOR = [997.5, 1002.5];   // the glazing, with a doorway onto the balcony
  for (const [a, b] of [[ux0, DOOR[0]], [DOOR[1], ux1]]) B(root, b - a, UH, 0.06, (a + b) / 2, uy + UH / 2, uz0, upGlass, false);
  B(root, DOOR[1] - DOOR[0], UH - 2.6, 0.06, cx, uy + 2.6 + (UH - 2.6) / 2 + 0.25, uz0, upGlass, false);
  for (let x = ux0; x <= ux1 + 0.01; x += 2.375) if (x < DOOR[0] - 0.1 || x > DOOR[1] + 0.1) B(root, 0.1, UH, 0.12, x, uy + UH / 2, uz0, bronze, false);
  for (const x of DOOR) B(root, 0.14, UH, 0.16, x, uy + UH / 2, uz0, bronze, false); B(root, DOOR[1] - DOOR[0], 0.12, 0.16, cx, uy + 2.85, uz0, bronze, false);
  for (const [x0, x1] of [[ux0, 993], [1007, ux1]]) for (const z of [(uz0 + uz1) / 2 - 3, (uz0 + uz1) / 2 + 3]) { B(root, 0.06, 2.2, 3, x0 - 0.18, uy + 2.2, z, glass, false); B(root, 0.06, 2.2, 3, x1 + 0.18, uy + 2.2, z, glass, false); }   // side windows
  B(root, ux1 - ux0 + 0.2, 0.25, uz0 - hz0 + 0.2, cx, H + 0.62, (hz0 + uz0) / 2, mat(0xe8e2d6, { rough: 0.7 }));            // balcony floor (the ground floor's roof)
  B(root, ux1 - ux0, 1.05, 0.05, cx, H + 1.27, hz0 + 0.2, glass, false); B(root, ux1 - ux0 + 0.1, 0.06, 0.1, cx, H + 1.82, hz0 + 0.2, bronze, false);   // glass balcony rail
  B(root, hx1 - hx0 + 3, 0.35, hz1 - hz0 + 2, cx, uy + UH + 0.18, (hz0 + hz1) / 2, mat(0x2e2a27, { rough: 0.6 }));          // roof slab, overhanging
  B(root, hx1 - hx0 + 3.05, 0.18, 0.1, cx, uy + UH + 0.18, hz0 - 1.05, bronze, false);
  for (const sd of [-1, 1]) { const g = new THREE.Group(); g.position.set(cx + sd * 12, H + 0.75, hz0 + 1.6); root.add(g); B(g, 0.7, 0.45, 0.7, 0, 0.22, 0, stone); S(g, 0.55, 0, 0.85, 0, mat(0x3f7f3a, { rough: 0.9 }), 10); }   // planters on the balcony
  // a warm wash of light inside, so the rooms aren't grey (three lamps, no shadows)
  for (const x of [985, 1000, 1015]) { const l = new THREE.PointLight(0xffe6c4, 14, 22, 1.6); l.position.set(x, H - 0.6, (hz0 + hz1) / 2); root.add(l); }
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
  // ---- furnishing (old-layout coordinates through P; every piece checked against the ones above: the sofas at
  // x 1256-1260, the coffee table, the TV on the west wall, the island at x 1287.5-1292.5 z 219-221, the dining set at
  // x 1287-1293 z 229.8-232.4, the piano at 1274,234, the bed at x 1294.7-1297.3 z 234.9-237.1, the front door at
  // x 1272-1278 and the garden opening at x 1268-1282)
  {
    const seat = (x, z, yaw, label, y = 0.5) => ctx.sitSpots?.push({ x, z, seatY: y, yaw, label });
    const wood = mat(0x6b4a33, { rough: 0.6 }), dark = mat(0x2a2e33, { rough: 0.5 }), cream = 0xe9e4da, gold = mat(0xd4af37, { metal: 0.8, rough: 0.3 });
    const glow = mat(0xfff1cf, { emissive: 0xffe2a0, ei: 1.3 });
    // living room: a rug, two armchairs at the ends of the coffee table, a bookcase, a floor lamp, a sideboard under the TV
    { const [x, z] = P(1258, 225.2); B(root, 12, 0.02, 11, x, 0.03, z, mat(0x7b2f2f, { rough: 1 }), false); }
    for (const [ox, ry] of [[1263.2, -Math.PI / 2]]) { const [x, z] = P(ox, 225.2), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 1.1, 0.45, 1, 0, 0.3, 0, 0x8a6f55); B(g, 1.1, 0.75, 0.22, 0, 0.75, -0.42, 0x7a614a); for (const sd of [-1, 1]) B(g, 0.18, 0.6, 1, sd * 0.5, 0.55, 0, 0x7a614a); seat(x, z, ry, 'Sit in the armchair'); }
    { const [x, z] = P(1251.3, 225.2); B(root, 0.6, 0.6, 3.6, x, 0.3, z, wood); }
    { const [x, z] = P(1250.6, 214); B(root, 0.6, 3, 3, x, 1.5, z, wood); for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) B(root, 0.32, 0.38, 0.12 + (i * j) % 3 * 0.04, x + 0.1, 0.45 + i * 0.58, z - 1.2 + j * 0.45, [0x8f2f2f, 0x2f5f8f, 0x3f6f3f, 0xb8902f, 0x5a3f6f][(i + j) % 5], false); }
    { const [x, z] = P(1251.5, 230.8); C(root, 0.04, 0.04, 1.7, x, 0.85, z, gold, 6); C(root, 0.25, 0.35, 0.4, x, 1.8, z, glow, 12); C(root, 0.25, 0.25, 0.04, x, 0.02, z, gold, 12); }
    // kitchen along the east wall: base units, a worktop, wall cupboards, a tall fridge, and stools at the island
    { const [x, z] = P(1299.2, 216.5); B(root, 0.7, 0.9, 9, x, 0.45, z, mat(0xf5f5f5, { rough: 0.3 })); B(root, 0.75, 0.06, 9.1, x, 0.93, z, mat(0x222222, { rough: 0.1, metal: 0.3 })); B(root, 0.4, 0.8, 9, x + 0.15, 2.3, z, mat(0xf5f5f5, { rough: 0.3 }), false); B(root, 0.5, 0.05, 0.5, x - 0.05, 0.97, z + 1.5, mat(0x9aa3ad, { metal: 0.8 }), false); }
    { const [x, z] = P(1299.1, 222.4); B(root, 0.85, 2.1, 1, x, 1.05, z, mat(0xbfc5ca, { metal: 0.6, rough: 0.3 })); }
    for (const ox of [1288.5, 1290, 1291.5]) { const [x, z] = P(ox, 221.4); C(root, 0.22, 0.22, 0.08, x, 0.78, z, dark, 12); C(root, 0.04, 0.04, 0.75, x, 0.38, z, gold, 6); seat(x, z, Math.PI, 'Sit at the kitchen island', 0.82); }
    for (const ox of [1288.5, 1291.5]) { const [x, z] = P(ox, 220); C(root, 0.01, 0.01, 1.6, x, H - 0.8, z, dark, 4); S(root, 0.2, x, H - 1.7, z, glow, 10); }
    // the bedroom: walled off in the south-east corner with a doorway, nightstands, a wardrobe and a rug
    const bw = mat(0xf6f3ee, { rough: 0.8 });
    const wallP = (ax, az, bx, bz) => { const [x0, z0] = P(ax, az), [x1, z1] = P(bx, bz), w = Math.max(0.2, x1 - x0), d = Math.max(0.2, z1 - z0); ctx.camBlockers?.push(B(root, w, H - 0.1, d, (x0 + x1) / 2, (H - 0.1) / 2, (z0 + z1) / 2, bw)); solid(x0 - (w === 0.2 ? 0.1 : 0), x1 + (w === 0.2 ? 0.1 : 0), z0 - (d === 0.2 ? 0.1 : 0), z1 + (d === 0.2 ? 0.1 : 0)).baseYAt = () => 0; };
    wallP(1292, 234, 1293.2, 234); wallP(1294.8, 234, 1299.8, 234); wallP(1292, 234, 1292, 239.8);
    { const [x, z] = P(1296, 236.6); B(root, 3.6, 0.02, 3, x, 0.03, z, mat(0xcfc6b5, { rough: 1 }), false); }
    for (const ox of [1294.2, 1297.8]) { const [x, z] = P(ox, 237.3); B(root, 0.5, 0.55, 0.45, x, 0.28, z, wood); S(root, 0.12, x, 0.72, z, glow, 8); }
    { const [x, z] = P(1299.3, 235.6); B(root, 0.6, 2.3, 2, x, 1.15, z, wood); }
    // the bathroom (between the dining area and the bedroom): a bath, a shower, a toilet, a basin and mirror
    wallP(1283, 234, 1284.2, 234); wallP(1285.4, 234, 1292, 234); wallP(1283, 234, 1283, 239.8);
    ctx.doors?.add({ a: P(1284.2, 234), b: P(1285.4, 234), y: 0, color: 0xf2efe9 }); ctx.doors?.add({ a: P(1293.2, 234), b: P(1294.8, 234), y: 0, color: 0x5a3b26 });   // bathroom and bedroom doors
    // grand paintings: a big landscape on the bathroom wall over the dining table, and two in the lounge upstairs
    const grand = (cols, x, y, z, ry, w, h) => { const t = makeTex(256, Math.round(256 * h / w), g => { const H2 = Math.round(256 * h / w), sky = g.createLinearGradient(0, 0, 0, H2); sky.addColorStop(0, cols[0]); sky.addColorStop(1, cols[1]); g.fillStyle = sky; g.fillRect(0, 0, 256, H2);
        for (let k = 0; k < 3; k++) { g.fillStyle = cols[2 + k]; g.beginPath(); g.moveTo(0, H2); for (let xx = 0; xx <= 256; xx += 8) g.lineTo(xx, H2 * (0.55 + k * 0.13) - Math.sin(xx * 0.025 + k * 2) * 16); g.lineTo(256, H2); g.fill(); }
        g.fillStyle = 'rgba(255,245,210,.9)'; g.beginPath(); g.arc(190, H2 * 0.25, 13, 0, 7); g.fill(); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; root.add(m);
      const f = B(root, w + 0.35, h + 0.35, 0.06, x - Math.sin(ry) * 0.04, y, z - Math.cos(ry) * 0.04, gold, false); f.rotation.y = ry; };
    { const [x, z] = P(1288.6, 233.85); grand(['#6d8fb3', '#f2c48a', '#5e7a4a', '#3f5a33', '#2c3e2a'], x, 3.3, z, Math.PI, 5, 2.8); }
    {
      const tile = mat(0xdfe6ea, { rough: 0.35 }), white = mat(0xf8f8f5, { rough: 0.25 }), chrome = mat(0xd0d4da, { metal: 0.9, rough: 0.2 });
      { const [x, z] = P(1287.6, 237); B(root, 8.6, 0.02, 5.6, x, 0.07, z, tile, false); }   // tiled floor
      { const [x, z] = P(1288.9, 239.3); B(root, 3.6, 0.58, 0.95, x, 0.29, z, white); B(root, 3.3, 0.03, 0.7, x, 0.5, z, mat(0x8cc7de, { opacity: 0.8, rough: 0.1 }), false); C(root, 0.03, 0.03, 0.3, x + 1.55, 0.75, z + 0.3, chrome, 8); solid(x - 1.8, x + 1.8, z - 0.48, z + 0.48).baseYAt = () => 0;
        spot(x, z - 1.1, 1.4, 'Take a bath', () => ctx.chore ? ctx.chore('bath') : toast('🛁 A long hot bath.')); }
      { const [x, z] = P(1284, 239); B(root, 1.5, 0.12, 1.5, x, 0.12, z, white, false); B(root, 0.05, 2.1, 1.5, x + 0.75, 1.17, z, mat(0x9fd3ff, { opacity: 0.3, rough: 0.05 }), false); B(root, 1.0, 2.1, 0.05, x + 0.25, 1.17, z - 0.75, mat(0x9fd3ff, { opacity: 0.3, rough: 0.05 }), false);
        C(root, 0.15, 0.15, 0.04, x, 2.15, z + 0.2, chrome, 12); spot(x, z, 1.0, 'Take a shower', () => ctx.chore ? ctx.chore('shower') : toast('🚿 A hot shower.')); }
      { const [x, z] = P(1291.45, 235.6); B(root, 0.4, 0.4, 0.5, x, 0.2, z, white); B(root, 0.16, 0.38, 0.42, x + 0.27, 0.62, z, white); B(root, 0.5, 0.05, 0.44, x - 0.03, 0.43, z, mat(0xffffff));
        ctx.sitSpots?.push({ x: x - 0.05, z, yaw: -Math.PI / 2, seatY: 0.45, label: 'Use the toilet', toilet: true }); B(root, 0.12, 0.12, 0.12, x + 0.3, 0.75, z + 0.5, mat(0xf8f8f4)); }   // toilet, and a roll on the wall
      { const [x, z] = P(1287.6, 234.4); B(root, 1.1, 0.12, 0.5, x, 0.86, z, white); B(root, 0.2, 0.8, 0.2, x, 0.4, z, white); B(root, 1.0, 0.9, 0.04, x, 1.7, z - 0.22, mat(0xdde9ef, { metal: 0.25, rough: 0.08, emissive: 0x2a3438, ei: 0.4 }), false); B(root, 1.08, 0.98, 0.03, x, 1.7, z - 0.24, mat(0x3b3530, { metal: 0.6, rough: 0.4 }), false); C(root, 0.02, 0.02, 0.2, x, 1.0, z - 0.15, chrome, 6);
        spot(x, z + 0.6, 0.8, 'Wash your hands', () => ctx.chore ? ctx.chore('handwash') : toast('🧼 Squeaky clean.')); }
      { const [x, z] = P(1289.9, 234.25); B(root, 0.8, 0.05, 0.05, x, 1.2, z, chrome, false); B(root, 0.7, 0.6, 0.05, x, 0.92, z + 0.03, mat(0xf2efe9), false); }   // towel rail and towel
      const bl = new THREE.PointLight(0xffffff, 6, 8, 1.6); bl.position.set(...[P(1287.6, 237)].map(([x, z]) => [x, H - 0.8, z])[0]); root.add(bl);
      tag('PRD', 'FUR', 'CER', 'Bathroom suite: bath, shower, toilet and basin', ...P(1287.6, 237), 'Atelier Furniture');
    }
    // a study corner (south-west): desk, chair and a second bookcase
    { const [x, z] = P(1256, 238.6); B(root, 2, 0.06, 0.9, x, 0.76, z, wood); for (const [a, b] of [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]]) B(root, 0.06, 0.74, 0.06, x + a, 0.37, z + b, wood, false); B(root, 0.5, 0.35, 0.03, x, 1, z + 0.2, mat(0x050505, { emissive: 0x0d2a4a, ei: 0.6 }), false);
      B(root, 0.5, 0.45, 0.5, x, 0.25, z - 0.8, dark); B(root, 0.5, 0.6, 0.08, x, 0.75, z - 1.05, dark); seat(x, z - 0.8, 0, 'Sit at the desk', 0.5); }
    { const [x, z] = P(1250.6, 236); B(root, 0.6, 3, 3, x, 1.5, z, wood); }
    // plants by the front door and the garden opening, paintings on the walls
    for (const [ox, oz] of [[1264.5, 211.5], [1284, 211.5], [1266.5, 238.8], [1282.4, 238.8]]) { const [x, z] = P(ox, oz); C(root, 0.35, 0.28, 0.6, x, 0.3, z, mat(0xd8d2c4), 12); S(root, 0.6, x, 1.15, z, mat(0x3f7f3a, { rough: 0.9 }), 10); }
    const art = (cols, x, z, ry) => { const t = makeTex(128, 96, g => { g.fillStyle = cols[0]; g.fillRect(0, 0, 128, 96); for (let i = 0; i < 7; i++) { g.fillStyle = cols[1 + i % (cols.length - 1)]; g.beginPath(); g.arc(20 + i * 15, 30 + (i * 37) % 50, 10 + (i * 7) % 18, 0, 7); g.fill(); } }); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshStandardMaterial({ map: t })); m.position.set(x, 2.8, z); m.rotation.y = ry; root.add(m); B(root, ry ? 0.05 : 2.4, 1.8, ry ? 2.4 : 0.05, x + (ry ? -Math.sign(ry) * 0.03 : 0), 2.8, z + (ry ? 0 : 0.03), gold, false); };
    art(['#e8e2d6', '#2f5f8f', '#3f6f3f', '#b8902f'], ...P(1258, 239.75), Math.PI);
    art(['#2a2e33', '#d4af37', '#7b2f2f'], P(1250.25, 0)[0], P(0, 231)[1], Math.PI / 2); art(['#f2efe9', '#5a3f6f', '#2f5f8f'], P(1299.75, 0)[0], P(0, 228)[1], -Math.PI / 2);
    for (const [n, x, z, m] of [['Armchair', 1263.2, 225.2, 'LTH'], ['Bookcase', 1250.6, 214, 'WOD'], ['Kitchen units and fridge', 1299.2, 217, 'WOD.STL'], ['Bar stools', 1290, 221.4, 'STL'], ['Wardrobe', 1299.3, 235.6, 'WOD'], ['Study desk', 1256, 238.6, 'WOD'], ['Living-room rug', 1258, 225.2, 'TXT']])
      tag('PRD', 'FUR', m, n, ...P(x, z), 'Atelier Furniture');
  }
  spot(cx, hz0 - 1.5, 2.5, 'Your mansion', () => toast('🏛 Your mansion: marble floors, the pool out back, the garage to the east and your airstrip on the west side.'));
  // the forecourt and the supercar out front, two more in the garage
  { B(root, 32, 0.06, 31.5, cx, 0.04, -468.25, mat(0xd9d2c3, { rough: 0.8 }), false); tag('LND', 'ROD', 'STN', 'Mansion forecourt', cx, -468); }
  {   // a fountain in the middle of the forecourt: a stone basin, water, a tiered centre
    const fz = -474.5, stoneF = mat(0xd6cdbb, { rough: 0.8 }), water = mat(0x5fb7d8, { opacity: 0.8, rough: 0.05, metal: 0.2 });
    C(root, 3.2, 3.3, 0.6, cx, 0.3, fz, stoneF, 32); C(root, 2.9, 2.9, 0.05, cx, 0.58, fz, water, 32); C(root, 0.35, 0.5, 1.6, cx, 1.1, fz, stoneF, 12);
    C(root, 1.1, 0.8, 0.25, cx, 1.95, fz, stoneF, 24); C(root, 0.95, 0.95, 0.04, cx, 2.06, fz, water, 24); C(root, 0.12, 0.2, 0.7, cx, 2.4, fz, stoneF, 8);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; C(root, 0.03, 0.06, 0.45, cx + Math.cos(a) * 0.9, 1.85, fz + Math.sin(a) * 0.9, mat(0xbfe6f5, { opacity: 0.55, emissive: 0x2a6f8a, ei: 0.3 }), 5); }   // water falling off the top tier
    solid(cx - 3.2, cx + 3.2, fz - 3.2, fz + 3.2); tag('PRD', 'FNT', 'STN.WTR', 'Forecourt fountain', cx, fz);
  }
  const hedge = mat(0x2f5a2a, { rough: 1 });
  for (const [a, b] of [[976, 995], [1005, 1024]]) { B(root, b - a, 0.9, 0.9, (a + b) / 2, 0.45, hz0 - 1.3, hedge); solid(a, b, hz0 - 1.75, hz0 - 0.85); }
  for (const x of [975.5, 1024.5]) for (const z of [hz0 - 1.3]) { B(root, 0.9, 0.5, 0.9, x, 0.25, z, mat(0xd6cdbb)); S(root, 0.7, x, 1.15, z, hedge, 12); }
  for (let z = -360; z > -460; z -= 25) for (const sd of [-1, 1]) { const x = GX + sd * 6; C(root, 0.08, 0.1, 3.6, x, 1.8, z, bronze, 8); B(root, 0.4, 0.5, 0.4, x, 3.75, z, mat(0xfff1cf, { emissive: 0xffd28a, ei: 1.4 }), false); solid(x - 0.15, x + 0.15, z - 0.15, z + 0.15); }   // lamp posts along the drive
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
  // ---------------- upstairs: a staircase from the hall, a lounge, a master suite with its own bathroom, an office
  // and gym, and the balcony. The stairs are a real ramp and the floor a real floor (groundAt below), so you walk up.
  const FY1 = H + 0.75, upFloors = [], upVoids = [];
  const ST = { x0: 990.9, x1: 993.5, z0: -447, z1: -434 }, HOLE = { x0: 990.8, x1: 993.6, z0: -440.6, z1: -433.9 };   // the flight rises northwards from beside the front door
  const solidAt = (y, x0, x1, z0, z1) => { const c = solid(x0, x1, z0, z1); c.baseYAt = () => y; return c; };
  {
    // cut the stairwell out of the hall's roof and ceiling
    const cut = m => { if (!m) return; const w = m.scale.x, d = m.scale.z, mx = m.position.x, mz = m.position.z, x0 = mx - w / 2, x1 = mx + w / 2, z0 = mz - d / 2, z1 = mz + d / 2, blocked = ctx.camBlockers?.indexOf(m) ?? -1;
      const parts = [[x0, HOLE.x0, z0, z1], [HOLE.x1, x1, z0, z1], [HOLE.x0, HOLE.x1, z0, HOLE.z0], [HOLE.x0, HOLE.x1, HOLE.z1, z1]];
      for (const [a, b, c, e] of parts) if (b - a > 0.01 && e - c > 0.01) { const piece = B(m.parent, b - a, m.scale.y, e - c, (a + b) / 2, m.position.y, (c + e) / 2, m.material, false); if (blocked >= 0) ctx.camBlockers.push(piece); }
      if (blocked >= 0) ctx.camBlockers.splice(blocked, 1); m.parent.remove(m); };
    const near = (y, sy) => houseHall.children.find(m => Math.abs(m.position.y - y) < 0.02 && Math.abs(m.scale.y - sy) < 0.02 && m.scale.x > 30);
    cut(near(H + 0.25, 0.5)); cut(near(H - 0.03, 0.05));
    // the stairs: 18 solid marble steps, glass balustrades with a bronze handrail on both sides
    const marble = mat(0xf2efe9, { rough: 0.3 }), rail = mat(0x9fc4d6, { opacity: 0.3, rough: 0.05 }), N = 18, run = (ST.z1 - ST.z0) / N, mx = (ST.x0 + ST.x1) / 2;
    for (let k = 0; k < N; k++) { const top = FY1 * (k + 1) / N; B(root, ST.x1 - ST.x0, top, run, mx, top / 2, ST.z0 + (k + 0.5) * run, marble); B(root, ST.x1 - ST.x0 + 0.02, 0.03, 0.05, mx, top - 0.01, ST.z0 + (k + 1) * run - 0.03, bronze, false); }
    const len = Math.hypot(ST.z1 - ST.z0, FY1), ang = Math.atan2(FY1, ST.z1 - ST.z0);
    for (const x of [ST.x0, ST.x1]) { const g = new THREE.Group(); g.position.set(x, FY1 / 2 + 0.5, (ST.z0 + ST.z1) / 2); g.rotation.x = -ang; root.add(g); B(g, 0.04, 1.0, len, 0, 0, 0, rail, false); B(g, 0.07, 0.07, len, 0, 0.52, 0, bronze, false); }
    solidAt(0, ST.x0 - 0.05, ST.x1 + 0.05, -442.6, ST.z1);   // you can't walk into the high part of the flight from the hall below
    tag('PRD', 'STR', 'MRB.GLS', 'Marble staircase', mx, (ST.z0 + ST.z1) / 2);
    // upper floor: oak boards on a slab over the ground floor's roof (the balcony is the same height), a pale ceiling
    const oak = mat(0xa77b52, { rough: 0.55 }), ceil = mat(0xf4f1ea, { emissive: 0x6e6a62, ei: 0.35 });
    for (const [a, b, c, e] of [[ux0, HOLE.x0, uz0, uz1], [HOLE.x1, ux1, uz0, uz1], [HOLE.x0, HOLE.x1, uz0, HOLE.z0], [HOLE.x0, HOLE.x1, HOLE.z1, uz1]]) B(root, b - a, 0.25, e - c, (a + b) / 2, FY1 - 0.125 + 0.005, (c + e) / 2, oak, false);
    B(root, ux1 - ux0, 0.04, uz1 - uz0, cx, uy + UH - 0.03, (uz0 + uz1) / 2, ceil, false);
    upFloors.push({ minX: ux0, maxX: ux1, minZ: uz0, maxZ: uz1 }, { minX: ux0, maxX: ux1, minZ: hz0, maxZ: uz0 });   // the rooms, and the balcony
    upVoids.push({ minX: HOLE.x0, maxX: HOLE.x1, minZ: HOLE.z0, maxZ: HOLE.z1 - 0.3 });
    // a glass rail round the stairwell up here
    B(root, 0.05, 1.0, HOLE.z1 - HOLE.z0, HOLE.x0, FY1 + 0.5, (HOLE.z0 + HOLE.z1) / 2, rail, false); B(root, 0.05, 1.0, HOLE.z1 - HOLE.z0, HOLE.x1, FY1 + 0.5, (HOLE.z0 + HOLE.z1) / 2, rail, false); B(root, HOLE.x1 - HOLE.x0, 1.0, 0.05, mx, FY1 + 0.5, HOLE.z0, rail, false);
    for (const x of [HOLE.x0, HOLE.x1]) B(root, 0.07, 0.07, HOLE.z1 - HOLE.z0, x, FY1 + 1.02, (HOLE.z0 + HOLE.z1) / 2, bronze, false);
    solidAt(FY1, HOLE.x0 - 0.08, HOLE.x0 + 0.08, HOLE.z0, HOLE.z1); solidAt(FY1, HOLE.x1 - 0.08, HOLE.x1 + 0.08, HOLE.z0, HOLE.z1); solidAt(FY1, HOLE.x0, HOLE.x1, HOLE.z0 - 0.08, HOLE.z0 + 0.08);
    // walls up here: the back and sides, the glass front (with the balcony doorway), the ends of the balcony
    solidAt(FY1, ux0, ux1, uz1 - 0.15, uz1 + 0.15); solidAt(FY1, ux0 - 0.15, ux0 + 0.15, hz0, uz1); solidAt(FY1, ux1 - 0.15, ux1 + 0.15, hz0, uz1);
    solidAt(FY1, ux0, DOOR[0], uz0 - 0.08, uz0 + 0.08); solidAt(FY1, DOOR[1], ux1, uz0 - 0.08, uz0 + 0.08);
    for (const x of [ux0, ux1]) { B(root, 0.05, 1.05, uz0 - hz0, x, FY1 + 0.52, (hz0 + uz0) / 2, rail, false); }
    ctx.planeBlocks?.push({ minX: ux0, maxX: ux1, minZ: uz0, maxZ: uz1, top: uy + UH + 0.4 });   // indoors up here: first person, the roof doesn't hide you
    const wallU = (x0, x1, z0, z1) => { ctx.camBlockers?.push(B(root, x1 - x0, UH - 0.25, z1 - z0, (x0 + x1) / 2, FY1 + (UH - 0.25) / 2, (z0 + z1) / 2, upWall)); solidAt(FY1, x0, x1, z0, z1); };
    const upSpot = (x, z, r, label, action) => { const it = spot(x, z, r, label, action); it.pos.y = FY1; return it; };
    const upSeat = (x, z, yaw, label, h = 0.45, extra = {}) => ctx.sitSpots?.push({ x, z, yaw, seatY: FY1 + h, label, ...extra });
    const wood = mat(0x6b4a33, { rough: 0.6 }), dark = mat(0x2a2e33, { rough: 0.5 }), cream = mat(0xe9e4da, { rough: 0.8 }), white = mat(0xf8f8f5, { rough: 0.25 }), chrome = mat(0xd0d4da, { metal: 0.9, rough: 0.2 }), glow = mat(0xfff1cf, { emissive: 0xffe2a0, ei: 1.3 });
    const Y = FY1;
    // ---- the master bedroom (east, front): a big bed against the east wall, nightstands, a wardrobe wall, a reading chair
    wallU(1006.85, 1007.15, uz0, -438.6); wallU(1006.85, 1007.15, -437.2, uz1); ctx.doors?.add({ a: [1007, -438.6], b: [1007, -437.2], y: FY1, color: 0x5a3b26 });            // its wall, with a doorway from the lounge
    { const bx = 1017.3, bz = -438.5; B(root, 3.0, 0.45, 2.4, bx, Y + 0.3, bz, wood); B(root, 2.8, 0.25, 2.3, bx - 0.05, Y + 0.6, bz, white); B(root, 0.2, 1.3, 2.6, ux1 - 0.3, Y + 0.85, bz, mat(0x3b3530, { rough: 0.8 }));
      for (const dz of [-0.6, 0.6]) B(root, 0.4, 0.15, 0.6, bx + 1.1, Y + 0.8, bz + dz, cream); B(root, 1.6, 0.06, 2.35, bx - 0.75, Y + 0.76, bz, mat(0x7b2f2f, { rough: 0.9 }));
      for (const dz of [-1.7, 1.7]) { B(root, 0.55, 0.55, 0.45, ux1 - 0.55, Y + 0.28, bz + dz, wood); S(root, 0.12, ux1 - 0.55, Y + 0.72, bz + dz, glow, 8); }
      solidAt(FY1, bx - 1.5, bx + 1.6, bz - 1.2, bz + 1.2); upSpot(bx - 2.1, bz, 2, 'Sleep in your bed', () => ctx.sleep?.()); B(root, 5, 0.02, 4, bx - 1, Y + 0.01, bz, mat(0xcfc6b5, { rough: 1 }), false); }
    { B(root, 6, 2.6, 0.6, 1013, Y + 1.3, uz0 + 0.45, wood, true); for (let i = 0; i < 4; i++) B(root, 0.04, 2.4, 0.02, 1010.7 + i * 1.5, Y + 1.3, uz0 + 0.76, dark, false); solidAt(FY1, 1010, 1016, uz0, uz0 + 0.8);
      upSpot(1013, uz0 + 1.4, 1.4, 'Open the wardrobe', () => toast('👔 Suits, trainers and a row of watches. Everything you own, neatly hung.')); }   // a wall of wardrobes along the glass front
    { const g = new THREE.Group(); g.position.set(1009, Y, -442); g.rotation.y = 0.6; root.add(g); B(g, 0.9, 0.42, 0.9, 0, 0.3, 0, cream); B(g, 0.9, 0.7, 0.2, 0, 0.75, -0.38, cream); upSeat(1009, -442, 0.6, 'Sit in the reading chair'); }
    // ---- the en-suite (east, back): bath, shower, toilet, double basin
    wallU(1007.15, 1009.2, -432.15, -431.85); wallU(1010.4, ux1, -432.15, -431.85); ctx.doors?.add({ a: [1009.2, -432], b: [1010.4, -432], y: FY1, color: 0xf2efe9 });
    { B(root, ux1 - 1007.2, 0.02, uz1 - (-431.85), (1007.2 + ux1) / 2, Y + 0.012, (-431.85 + uz1) / 2, mat(0xdfe6ea, { rough: 0.35 }), false);
      const bx = 1014.8, bz = uz1 - 0.65; B(root, 3.4, 0.6, 1.0, bx, Y + 0.3, bz, white); B(root, 3.1, 0.03, 0.75, bx, Y + 0.52, bz, mat(0x8cc7de, { opacity: 0.8, rough: 0.1 }), false); C(root, 0.03, 0.03, 0.3, bx + 1.5, Y + 0.78, bz + 0.3, chrome, 8);
      solidAt(FY1, bx - 1.7, bx + 1.7, bz - 0.5, bz + 0.5); upSpot(bx, bz - 1.2, 1.4, 'Take a bath', () => ctx.chore ? ctx.chore('bath') : toast('🛁 A long hot bath.'));
      const sx = 1018, sz = uz1 - 0.9; B(root, 1.6, 0.12, 1.6, sx, Y + 0.12, sz, white, false); B(root, 0.05, 2.1, 1.6, sx - 0.8, Y + 1.17, sz, mat(0x9fd3ff, { opacity: 0.3, rough: 0.05 }), false); B(root, 1.2, 2.1, 0.05, sx - 0.2, Y + 1.17, sz - 0.8, mat(0x9fd3ff, { opacity: 0.3, rough: 0.05 }), false); C(root, 0.15, 0.15, 0.04, sx + 0.3, Y + 2.15, sz + 0.3, chrome, 12);
      upSpot(sx, sz, 1.0, 'Take a shower', () => ctx.chore ? ctx.chore('shower') : toast('🚿 A hot shower.'));
      const tx = 1007.55, tz = -425; B(root, 0.4, 0.4, 0.5, tx, Y + 0.2, tz, white); B(root, 0.16, 0.38, 0.42, tx - 0.27, Y + 0.62, tz, white); B(root, 0.5, 0.05, 0.44, tx + 0.03, Y + 0.43, tz, white);
      upSeat(tx + 0.05, tz, Math.PI / 2, 'Use the toilet', 0.45, { toilet: true });
      const vx = 1012.5, vz = -431.5; B(root, 2.6, 0.85, 0.55, vx, Y + 0.43, vz, wood); B(root, 2.7, 0.06, 0.6, vx, Y + 0.88, vz, white); for (const dx of [-0.65, 0.65]) { B(root, 0.5, 0.05, 0.35, vx + dx, Y + 0.92, vz, mat(0xeef2f4)); C(root, 0.02, 0.02, 0.22, vx + dx, Y + 1.0, vz - 0.22, chrome, 6); }
      B(root, 2.4, 1.0, 0.04, vx, Y + 1.75, vz - 0.28, mat(0xdde9ef, { metal: 0.25, rough: 0.08, emissive: 0x2a3438, ei: 0.4 }), false); solidAt(FY1, vx - 1.3, vx + 1.3, vz - 0.3, vz + 0.3);
      upSpot(vx, vz + 0.7, 1.0, 'Wash your hands', () => ctx.chore ? ctx.chore('handwash') : toast('🧼 Squeaky clean.'));
      tag('PRD', 'FUR', 'CER', 'En-suite: bath, shower, toilet and double basin', vx, -427, 'Atelier Furniture'); }
    // ---- the lounge (middle, at the top of the stairs): sofas round a TV on the back wall, a bar
    { B(root, 9, 0.02, 6, 1000, Y + 0.01, -427.5, mat(0x5a4a6a, { rough: 1 }), false);
      B(root, 4.4, 2.5, 0.1, 1000, Y + 1.9, uz1 - 0.25, mat(0x050505, { rough: 0.15 }), false);
      B(root, 3.0, 0.5, 0.5, 1000, Y + 0.25, uz1 - 0.45, wood); solidAt(FY1, 998.5, 1001.5, uz1 - 0.7, uz1);
      const sofa = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, Y, z); g.rotation.y = ry; root.add(g); B(g, 3.2, 0.45, 1.0, 0, 0.3, 0, cream); B(g, 3.2, 0.6, 0.25, 0, 0.75, -0.4, cream); for (const sd of [-1, 1]) B(g, 0.25, 0.55, 1.0, sd * 1.5, 0.5, 0, cream); };
      sofa(1000, -430.2, Math.PI); solidAt(FY1, 998.4, 1001.6, -430.7, -429.7); for (const dx of [-1, 0, 1]) upSeat(1000 + dx, -430, Math.PI, 'Sit on the sofa');
      B(root, 1.6, 0.35, 0.8, 1000, Y + 0.18, -427.6, mat(0x1a1a1a, { rough: 0.2, metal: 0.4 }));
      B(root, 0.6, 1.05, 3.2, 1005.6, Y + 0.53, -443, wood); B(root, 0.7, 0.06, 3.3, 1005.6, Y + 1.08, -443, white); solidAt(FY1, 1005.3, 1005.9, -444.6, -441.4);   // the bar
      for (let i = 0; i < 6; i++) C(root, 0.04, 0.05, 0.3, 1006.6, Y + 1.25 + (i % 2) * 0.35, -444.2 + Math.floor(i / 2) * 0.9, mat([0x6b2a1a, 0x2a5a2a, 0xc9a24a][i % 3], { opacity: 0.85, rough: 0.1 }), 8);
      B(root, 0.3, 1.2, 3, 1006.7, Y + 1.5, -443, wood, false);
      for (const dz of [-1, 0, 1]) { C(root, 0.2, 0.2, 0.06, 1004.8, Y + 0.78, -443 + dz, dark, 12); C(root, 0.03, 0.03, 0.75, 1004.8, Y + 0.38, -443 + dz, bronze, 6); upSeat(1004.8, -443 + dz, Math.PI / 2, 'Sit at the bar', 0.8); }
      upSpot(1005, -440.7, 1.2, 'Pour a drink', () => toast('🥃 You pour something old and expensive and look out over the estate.'));
      tag('PRD', 'FUR', 'LTH.GLS', 'Upstairs lounge and bar', 1000, -430, 'Atelier Furniture'); }
    // ---- the office and gym (west)
    { const dx = 983.2, dz = -441.5; B(root, 2.2, 0.06, 1.0, dx, Y + 0.76, dz, wood); for (const [a, b] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) B(root, 0.06, 0.74, 0.06, dx + a, Y + 0.37, dz + b, wood, false);
      B(root, 0.7, 0.42, 0.03, dx, Y + 1.1, dz + 0.35, mat(0x050505, { emissive: 0x0d2a4a, ei: 0.6 }), false); B(root, 0.55, 0.45, 0.55, dx, Y + 0.25, dz - 0.85, dark); B(root, 0.55, 0.65, 0.08, dx, Y + 0.78, dz - 1.12, dark);
      solidAt(FY1, dx - 1.1, dx + 1.1, dz - 0.5, dz + 0.5); upSeat(dx, dz - 0.85, 0, 'Sit at the desk', 0.5);
      B(root, 0.45, 2.6, 4, ux0 + 0.4, Y + 1.3, -437, wood); for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) B(root, 0.3, 0.36, 0.12 + (i * j) % 3 * 0.04, ux0 + 0.5, Y + 0.35 + i * 0.5, -438.6 + j * 0.5, [0x8f2f2f, 0x2f5f8f, 0x3f6f3f, 0xb8902f, 0x5a3f6f][(i + j) % 5], false);
      solidAt(FY1, ux0, ux0 + 0.65, -439, -435);
      B(root, 0.9, 0.2, 2.0, 984, Y + 0.12, -425.5, dark); B(root, 0.9, 0.04, 1.6, 984, Y + 0.24, -425.6, mat(0x111111)); for (const sd of [-1, 1]) B(root, 0.06, 1.1, 0.06, 984 + sd * 0.42, Y + 0.75, -424.6, chrome); B(root, 0.9, 0.1, 0.3, 984, Y + 1.3, -424.6, dark);   // treadmill
      solidAt(FY1, 983.5, 984.5, -426.6, -424.4);
      B(root, 0.4, 0.45, 1.4, 987.5, Y + 0.23, -425, dark); B(root, 1.6, 0.04, 0.04, 987.5, Y + 1.1, -424.2, chrome); for (const sd of [-1, 1]) C(root, 0.22, 0.22, 0.06, 987.5 + sd * 0.8, Y + 1.1, -424.2, dark, 16);   // bench and bar
      upSpot(986, -425, 1.6, 'Work out', () => { toast('🏋️ Half an hour on the treadmill and the bench. You feel strong.'); ctx.workout?.(); });
      B(root, 3, 0.02, 2.4, 985.5, Y + 0.01, -425.2, mat(0x333333, { rough: 1 }), false);
      tag('PRD', 'FUR', 'WOD.STL', 'Home office and gym', 985, -432, 'Atelier Furniture'); }
    // ---- the balcony: loungers and a table looking out over the forecourt
    for (const x of [985, 1015]) { const g = new THREE.Group(); g.position.set(x, Y, (hz0 + uz0) / 2); root.add(g); B(g, 0.75, 0.1, 2, 0, 0.35, 0, 0xffffff); B(g, 0.75, 0.5, 0.1, 0, 0.6, 0.95, 0xffffff); upSeat(x, (hz0 + uz0) / 2, Math.PI, 'Lie on the lounger', 0.4); }
    // warm lights upstairs and a stander-free quiet: it's your floor
    for (const x of [987, 1000, 1013]) { const l = new THREE.PointLight(0xffe6c4, 12, 20, 1.6); l.position.set(x, uy + UH - 0.6, (uz0 + uz1) / 2); root.add(l); }
    for (const x of [985, 995, 1005, 1015]) B(root, 2.4, 0.04, 0.5, x, uy + UH - 0.06, -434, glow, false);
  }
  // a glass lift down to the basement (cinema, bar, gym, bowling, pool, car park), beside the stairs; cars come up to the forecourt
  ctx.basement?.({ name: ctx.title ? 'your mansion' : 'the mansion', x: 995.4, y: 0, z: -444, face: Math.PI / 2, drive: { x: 989, y: 0.06, z: -466, ry: Math.PI / 2 } });
  // two paintings either side of the lounge TV upstairs
  for (const [x, c] of [[995, ['#2b3a67', '#f2a65a', '#1f4e6e', '#163a52', '#0e2a3c']], [1005, ['#a7c7e7', '#fbe3c4', '#7a8f5a', '#5f7346', '#3f5233']]]) {
    const t = makeTex(192, 256, g => { const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, c[0]); sky.addColorStop(1, c[1]); g.fillStyle = sky; g.fillRect(0, 0, 192, 256); for (let k = 0; k < 3; k++) { g.fillStyle = c[2 + k]; g.beginPath(); g.moveTo(0, 256); for (let xx = 0; xx <= 192; xx += 8) g.lineTo(xx, 150 + k * 30 - Math.sin(xx * 0.03 + k) * 14); g.lineTo(192, 256); g.fill(); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.9), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.position.set(x, FY1 + 2, uz1 - 0.2); m.rotation.y = Math.PI; root.add(m); B(root, 2.5, 3.2, 0.06, x, FY1 + 2, uz1 - 0.16, mat(0xd4af37, { metal: 0.8, rough: 0.3 }), false); }
  const upTV = { at: new THREE.Vector3(1000, FY1, -428), screen: (() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.35), new THREE.MeshBasicMaterial({ color: 0x050505 })); m.position.set(1000, FY1 + 1.9, uz1 - 0.31); m.rotation.y = Math.PI; root.add(m); return m; })() };
  const inR = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  const upstairsAt = (x, z, y) => {
    if (x < hx0 - 1 || x > hx1 + 1 || z < hz0 - 1 || z > hz1 + 1) return null;
    if (x >= ST.x0 && x <= ST.x1 && z >= ST.z0 && z <= ST.z1) { const h = FY1 * Math.min(1, Math.max(0, (z - ST.z0) / (ST.z1 - ST.z0))); if (y > h - 1.1 && y < h + 1.6) return h; }
    if (y > FY1 - 1.2) { if (upVoids.some(r => inR(r, x, z))) return null; if (upFloors.some(r => inR(r, x, z))) return FY1; }
    return null;
  };
  const paved = [{ minX: hx0 - 1, maxX: hx1 + 1, minZ: hz0 - 1.8, maxZ: hz1 + 1 }, { minX: garage.x0 - 1, maxX: garage.x1 + 1, minZ: garage.z0 - 1, maxZ: garage.z1 + 1 }, { minX: 983.5, maxX: 1016.5, minZ: -484.5, maxZ: -452 },
    { minX: GX - 5, maxX: GX + 5, minZ: -466, maxZ: ROAD_Z }, { minX: GX - 5, maxX: 984.5, minZ: -475, maxZ: -465 }, { minX: deck.minX - 0.5, maxX: deck.maxX + 0.5, minZ: deck.minZ - 0.5, maxZ: deck.maxZ + 4.5 }, { minX: tub[0] - 2.5, maxX: tub[0] + 2.5, minZ: tub[1] - 2.5, maxZ: tub[1] + 2.5 },
    { minX: rx - 17, maxX: rx + 17, minZ: rz0 - 1, maxZ: rz1 + 1 }, { minX: rx + 16, maxX: hgx1 + 1, minZ: hgz0 - 1, maxZ: hgz1 + 1 }];
  return {
    pools, cars, jet, bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    paved: (x, z) => x > X0 && x < X1 && z > Z0 && z < Z1 && paved.some(r => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ),
    home: { x: cx, z: hz0 - 3 },   // where you appear when you go home: the front door
    // you stand on the pool's deck (it's raised); inside the water you swim
    groundAt: (x, z, y = 0) => upstairsAt(x, z, y) ?? ((x >= deck.minX && x <= deck.maxX && z >= deck.minZ && z <= deck.maxZ && !(x > px0 && x < px1 && z > pz0 && z < pz1)) ? 0.45 : null),
    tv: upTV,   // the lounge TV upstairs (main.js plugs it into the TV system)
  };
}
