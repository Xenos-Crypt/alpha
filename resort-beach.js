// ANTHOS BAY: the beach made big, mixing the best-known beaches of the world into one.
// The sand now runs 60 m further out to sea on the east side (x 60–300), so the beach is about four times
// deeper. What's on it, and where each idea comes from:
//   - a black-and-white wave mosaic promenade (Copacabana, Brazil) and beach soccer
//   - pastel lifeguard towers (South Beach, Miami) and red-and-yellow surf flags (Bondi, Australia)
//   - a row of colourful beach huts (Brighton, England)
//   - granite boulders at the end of the bay (Anse Source d'Argent, Seychelles; Boulders Beach, South Africa)
//   - overwater bungalows on a jetty (Maldives)
//   - a resort hotel with an infinity pool and cabanas, beach houses on stilts
//   - a beach club with daybeds and bean bags (Bali; Pampelonne, France)
//   - gelato, smoothie and cocktail, coconut and fruit, grilled corn and churros kiosks
//   - sea turtles on the sand and in the shallows (Turtle Beach, Malaysia), fish in the shallows, crabs,
//     dolphins offshore, and sharks further out (keep between the flags!)
//   - surfers riding in, jet skis, kayaks, paddleboards, a banana boat, swimmers
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';
import { makeBotany } from './botany.js';

export function buildResortBeach(ctx, { x0 = 60, x1 = 300, z0 = 187, shore = 250, seaY = 0.03 } = {}) {
  const K = makeKit(ctx), { B, C, S, mat, solid, sign, place, spot, stander, sitter, walker } = K;
  const { scene, makeTex, toast, stats } = ctx, root = new THREE.Group(); root.name = 'Anthos Bay'; scene.add(root);
  const SAND = 0.065, DECK = 1.25;
  const floors = [];   // walkable rectangles: { minX, maxX, minZ, maxZ, y }
  const floor = (a, b, c, d, y) => floors.push({ minX: Math.min(a, b), maxX: Math.max(a, b), minZ: Math.min(c, d), maxZ: Math.max(c, d), y });
  // a slope along z, from height ya at z = za to yb at z = zb, so you walk up onto decks instead of popping up
  const ramp = (a, b, za, zb, ya, yb) => floors.push({ minX: Math.min(a, b), maxX: Math.max(a, b), minZ: Math.min(za, zb), maxZ: Math.max(za, zb), y: (x, z) => ya + (yb - ya) * Math.min(1, Math.max(0, (z - za) / (zb - za))) });
  const pools = [];    // swimmable rectangles handed back to the game
  // every thing here gets an ID (world-ids.js): built things, people, animals and boats
  const bot = makeBotany(ctx, 'Anthos Bay'), PARKS = 'Westhaven Parks & Gardens', BUILD = 'Westhaven Builders';
  const fx = (cls, kind, mat, maker, name, x, z, owner = 'GOV') => bot.fixture(cls, kind, mat, maker, name, x, z, owner);
  const moving = (cls, kind, mat, owner, seed, maker, name, obj) => bot.thing({ cls, kind, mat, owner, seed: 'bay:' + seed, maker, name: name + ', Anthos Bay', get pos() { const q = obj.position; return { x: q.x, z: q.z }; } });

  // ---------------- the new sand, wet edge, shallows and surf ----------------
  const sandTex = makeTex(256, 256, g => { g.fillStyle = '#e6cf9c'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${150 + Math.random() * 90},${120 + Math.random() * 70},${70 + Math.random() * 50},0.35)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); } });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(30, 8);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, shore - z0 + 2), new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set((x0 + x1) / 2, SAND, (z0 + shore) / 2 - 1); sand.receiveShadow = true; root.add(sand);
  floor(x0, x1, z0 - 0.5, shore, SAND);
  fx('LND', 'BCH', 'SND', PARKS, 'Beach sand (the bay)', (x0 + x1) / 2, (z0 + shore) / 2);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 3.5), mat(0xb59a6a, { rough: 0.45 })); wet.rotation.x = -Math.PI / 2; wet.position.set((x0 + x1) / 2, SAND + 0.01, shore - 1.6); root.add(wet);   // 1 cm above the dry sand: at 4 mm the wet edge flickered through it
  const shallowTex = makeTex(8, 64, g => { const grd = g.createLinearGradient(0, 0, 0, 64); grd.addColorStop(0, 'rgba(110,232,215,0.9)'); grd.addColorStop(0.6, 'rgba(60,190,205,0.45)'); grd.addColorStop(1, 'rgba(31,111,168,0)'); g.fillStyle = grd; g.fillRect(0, 0, 8, 64); });
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 30), new THREE.MeshStandardMaterial({ map: shallowTex, transparent: true, depthWrite: false, roughness: 0.08 }));
  shallow.rotation.x = -Math.PI / 2; shallow.position.set((x0 + x1) / 2, seaY + 0.02, shore + 15); root.add(shallow);
  const foamTex = makeTex(256, 32, g => { g.clearRect(0, 0, 256, 32); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.5})`; g.beginPath(); g.arc(Math.random() * 256, 8 + Math.random() * 16, 1 + Math.random() * 4, 0, 7); g.fill(); } });
  foamTex.wrapS = THREE.RepeatWrapping; foamTex.repeat.set(14, 1);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 2.6), new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.85 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set((x0 + x1) / 2, SAND + 0.02, shore + 0.6); root.add(foam);   // 1 cm above the wet sand: at 6 mm the two flickered through each other at a distance

  // ---------------- granite boulders closing the west end of the bay (Seychelles, Boulders Beach) ----------------
  const granite = [mat(0xa8958a, { rough: 0.9 }), mat(0x8f7f78, { rough: 0.9 }), mat(0xb9a597, { rough: 0.85 })];
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let z = z0 - 1; z < shore + 16; z += 3.2) {
    const s = 1.6 + rnd() * 2.2, m = new THREE.Mesh(rockGeo, granite[Math.floor(rnd() * 3)]);
    m.scale.set(s * (1 + rnd() * 0.6), s * (0.7 + rnd() * 0.5), s); m.position.set(x0 + 1.5 + rnd() * 2, s * 0.35, z); m.rotation.set(rnd(), rnd() * 6, rnd()); m.castShadow = true; root.add(m);
    if (z < shore) K.circle?.(m.position.x, z, s * 0.9);
    fx('LND', 'BOU', 'GRN', 'nature', 'Granite boulder', m.position.x, z, 'WLD');
  }
  for (const [x, z, s] of [[x0 + 8, shore - 6, 2.4], [x0 + 12, shore + 4, 1.8], [x0 + 6, shore + 10, 2.8], [x1 - 6, shore - 4, 2.2], [x1 - 4, shore + 6, 3]]) {
    const m = new THREE.Mesh(rockGeo, granite[1]); m.scale.set(s * 1.4, s, s * 1.2); m.position.set(x, s * 0.3, z); m.castShadow = true; root.add(m);
  }

  // ---------------- Copacabana wave mosaic promenade (back of the old beach) ----------------
  const waveTex = makeTex(256, 64, g => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#1c1c1c'; g.beginPath(); g.moveTo(0, 32);
    for (let x = 0; x <= 256; x += 2) g.lineTo(x, 32 + Math.sin(x / 256 * Math.PI * 4) * 16); g.lineTo(256, 64); g.lineTo(0, 64); g.fill(); });
  waveTex.wrapS = THREE.RepeatWrapping; waveTex.repeat.set(60, 1);
  const prom = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 1.7), new THREE.MeshStandardMaterial({ map: waveTex, roughness: 0.8 }));
  prom.rotation.x = -Math.PI / 2; prom.position.set((x0 + x1) / 2, 0.035, 166.05); root.add(prom);
  fx('LND', 'PRM', 'STN', BUILD, 'Wave mosaic promenade', (x0 + x1) / 2, 166);

  // ---------------- Anthos Bay Resort: hotel, infinity pool, cabanas ----------------
  {
    const hx0 = 68, hx1 = 128, hz0 = 189, hz1 = 201, H = 13;
    B(root, hx1 - hx0, H, hz1 - hz0, (hx0 + hx1) / 2, H / 2, (hz0 + hz1) / 2, mat(0xf4f1ea, { rough: 0.6 }));
    for (let f = 1; f <= 4; f++) { B(root, hx1 - hx0 + 0.6, 0.25, 1.4, (hx0 + hx1) / 2, f * 3 - 0.1, hz1 + 0.6, 0xdedad2); B(root, hx1 - hx0 - 1, 1.6, 0.06, (hx0 + hx1) / 2, f * 3 + 0.7, hz1 + 1.28, mat(0x7fc8e8, { rough: 0.1, metal: 0.3, opacity: 0.6 })); }
    for (let x = hx0 + 2; x < hx1 - 1; x += 3.4) for (let f = 0; f < 4; f++) B(root, 2.2, 2, 0.1, x, f * 3 + 1.6, hz1 + 0.02, mat(0x2a5d7a, { rough: 0.1, metal: 0.4 }), false);
    solid(hx0, hx1, hz0, hz1); fx('BLD', 'HTL', 'CON.GLS', BUILD, 'Anthos Bay Resort (hotel)', (hx0 + hx1) / 2, (hz0 + hz1) / 2, 'REQ');
    place(sign('ANTHOS BAY RESORT', 'rooms · spa · infinity pool', 9, '#0e4a63', '#ffffff'), (hx0 + hx1) / 2, H + 1.2, hz1 + 0.2, 0);
    spot((hx0 + hx1) / 2, hz1 + 2.5, 2.5, 'Anthos Bay Resort reception', () => ctx.openShop?.('Anthos Bay Resort', [
      { name: 'Day pass: pool and lounger', icon: '🏖️', price: 15, energy: 30 }, { name: 'Spa massage', icon: '💆', price: 40, energy: 60 },
      { name: 'Seafood platter', icon: '🦞', price: 22, hunger: 60 }, { name: 'Fresh juice', icon: '🧃', price: 4, energy: 10 }]));
    // infinity pool with a stone rim, then sun loungers and white cabanas
    const px0 = 74, px1 = 122, pz0 = 205, pz1 = 213;
    B(root, px1 - px0 + 1.2, 0.5, pz1 - pz0 + 1.2, (px0 + px1) / 2, 0.25, (pz0 + pz1) / 2, mat(0xe8e2d6, { rough: 0.7 }));
    B(root, px1 - px0, 0.06, pz1 - pz0, (px0 + px1) / 2, 0.47, (pz0 + pz1) / 2, mat(0x2fb5d6, { rough: 0.05, metal: 0.2, opacity: 0.85 }), false);
    pools.push({ minX: px0, maxX: px1, minZ: pz0, maxZ: pz1 }); fx('LND', 'POL', 'TIL', BUILD, 'Infinity pool, Anthos Bay Resort', (px0 + px1) / 2, (pz0 + pz1) / 2, 'REQ');
    for (let x = px0; x <= px1; x += 4) { const g = new THREE.Group(); g.position.set(x, 0, pz1 + 3.2); root.add(g); B(g, 0.7, 0.1, 1.9, 0, 0.35, 0, 0xffffff); B(g, 0.7, 0.5, 0.1, 0, 0.6, -0.9, 0xffffff); if (x % 8 === 2) sitter(x, pz1 + 3.4, Math.PI, 0.45, { task: 'talk' }); fx('PRD', 'LNG', 'PLS', 'MarketWay Retail', 'Sun lounger', x, pz1 + 3.2, 'REQ'); }
    for (const x of [130, 135.5, 141]) { const g = new THREE.Group(); g.position.set(x, 0, 207); root.add(g); for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) C(g, 0.06, 0.06, 2.6, dx, 1.3, dz, 0xffffff, 6);
      B(g, 4.3, 0.1, 4.3, 0, 2.6, 0, 0xffffff); B(g, 3.2, 0.4, 2.2, 0, 0.3, 0, 0xf2efe8); for (const s of [-1, 1]) B(g, 0.05, 2.4, 4, s * 2.1, 1.4, 0, mat(0xffffff, { opacity: 0.55 }), false); sitter(x, 207.4, Math.PI, 0.55, { task: 'eat' }); fx('PRD', 'CAB', 'FAB.WOD', 'MarketWay Retail', 'Cabana', x, 207, 'REQ'); }
  }

  // ---------------- Brighton beach huts ----------------
  const hutCols = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xff922b, 0xb197fc, 0x63e6be, 0xf783ac];
  for (let i = 0, x = 160; x < 232; x += 3.6, i++) {
    const g = new THREE.Group(); g.position.set(x, 0, 191.5); root.add(g);
    B(g, 2.8, 2.4, 2.4, 0, 1.2 + SAND, 0, hutCols[i % hutCols.length]); B(g, 1.1, 1.9, 0.06, 0, 1.0 + SAND, 1.22, 0xffffff);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 4), mat(0xf4f1ea)); roof.position.set(0, 2.95 + SAND, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.85; roof.castShadow = true; g.add(roof);
    solid(x - 1.4, x + 1.4, 190.3, 192.7); fx('BLD', 'HUT', 'WOD', BUILD, 'Beach hut', x, 191.5, 'REQ');
    if (i % 3 === 1) sitter(x + 0.6, 193.6, 0, 0.45, { task: 'talk' });
  }
  spot(196, 194.5, 3, 'Rent a beach hut for the day', () => ctx.openShop?.('Beach huts', [{ name: 'Beach hut for the day', icon: '🛖', price: 12, energy: 20 }, { name: 'Deckchair', icon: '🪑', price: 3, energy: 6 }]));

  // ---------------- beach houses on stilts ----------------
  for (const [i, x] of [246, 259, 272, 285].entries()) {
    const g = new THREE.Group(); g.position.set(x, 0, 203); root.add(g);
    for (const [dx, dz] of [[-4, -3.5], [4, -3.5], [-4, 3.5], [4, 3.5]]) C(g, 0.15, 0.15, 1.3, dx, 0.65, dz, 0x6b4a30, 6);
    B(g, 9, 0.25, 8, 0, 1.3, 0, 0xc9a26a); B(g, 7, 3, 5.6, 0, 2.9, -0.8, [0xf4f1ea, 0xdff3ff, 0xfff1d6, 0xe8f7e4][i]);
    B(g, 6.4, 2.2, 0.06, 0, 2.6, 2.02, mat(0x8fd3f0, { rough: 0.05, metal: 0.3, opacity: 0.7 }), false);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 1.6, 4), mat(0x6b4a30, { rough: 1 })); roof.position.set(0, 5.2, -0.8); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.9); roof.castShadow = true; g.add(roof);
    { const r = B(g, 1.6, 0.1, 3.2, 3.2, 0.72, 5.6, 0xc9a26a); r.rotation.x = -Math.atan2(1.36, 3); }   // a ramp down to the sand
    solid(x - 3.5, x + 3.5, 203 - 3.6, 203 + 2); fx('BLD', 'HSE', 'WOD.GLS', BUILD, 'Beach house on stilts', x, 203, 'RES');
    floor(x - 4.5, x + 4.5, 203 + 2, 203 + 4, 1.42); ramp(x + 2.4, x + 4, 203 + 4, 203 + 7.1, 1.42, SAND);
    if (i % 2 === 0) sitter(x - 2, 206, 0, 1.9, { task: 'talk' });
  }

  // ---------------- beach club: daybeds, bean bags, DJ ----------------
  {
    const cx = 140, cz = 224;
    B(root, 22, 0.3, 12, cx, 0.15, cz, mat(0xb08a5a, { rough: 0.9 })); floor(cx - 11, cx + 11, cz - 6, cz + 6, 0.32);
    const beanCols = [0xff6b6b, 0xffffff, 0x4dabf7, 0xffd43b, 0x63e6be];
    for (let i = 0; i < 10; i++) { const b = S(root, 0.55, cx - 9 + (i % 5) * 4.2, 0.55, cz - 3 + Math.floor(i / 5) * 5.5, beanCols[i % 5], 10); b.scale.y = 0.55; if (i % 3 === 0) sitter(cx - 9 + (i % 5) * 4.2, cz - 2.6 + Math.floor(i / 5) * 5.5, Math.PI, 0.75, { task: 'talk' }); }
    for (const dx of [-7, 0, 7]) { const g = new THREE.Group(); g.position.set(cx + dx, 0.3, cz + 4); root.add(g); B(g, 2.4, 0.45, 2.2, 0, 0.22, 0, 0xffffff); for (const [a, b] of [[-1.1, -1], [1.1, -1], [-1.1, 1], [1.1, 1]]) C(g, 0.05, 0.05, 2.2, a, 1.1, b, 0xc9a26a, 6); B(g, 2.5, 0.06, 2.3, 0, 2.2, 0, mat(0xffffff, { opacity: 0.8 }), false); }
    fx('BLD', 'CLB', 'WOD', BUILD, 'Sunset Beach Club', cx, cz, 'REQ');
    for (let i = 0; i < 10; i++) fx('PRD', 'FUR', 'FAB', 'MarketWay Retail', 'Bean bag', cx - 9 + (i % 5) * 4.2, cz - 3 + Math.floor(i / 5) * 5.5, 'REQ');
    for (const dx of [-7, 0, 7]) fx('PRD', 'LNG', 'WOD.FAB', 'MarketWay Retail', 'Daybed', cx + dx, cz + 4, 'REQ');
    B(root, 2.6, 1.1, 1.2, cx, 0.85, cz - 5, 0x222222); stander(cx, cz - 5.6, 0, { task: 'swing', outfit: 0x111111, y: 0.35 });
    place(sign('SUNSET BEACH CLUB', 'daybeds · cocktails · DJ at sunset', 6, '#2b1d14', '#ffd23f', 'sans-serif'), cx, 2.4, cz - 6.2, Math.PI);
    spot(cx, cz - 7, 2.2, 'Sunset Beach Club', () => ctx.openShop?.('Sunset Beach Club', [{ name: 'Daybed for the afternoon', icon: '🛏️', price: 18, energy: 35 }, { name: 'Mojito', icon: '🍸', price: 7, energy: 10 },
      { name: 'Piña colada', icon: '🍹', price: 7, energy: 10 }, { name: 'Fish tacos', icon: '🌮', price: 9, hunger: 35 }, { name: 'Sparkling water', icon: '💧', price: 2, energy: 4 }]));
  }

  // ---------------- beach soccer (Copacabana) ----------------
  {
    const cx = 190, cz = 216, line = mat(0xffffff);
    for (const [w, d, x, z] of [[28, 0.12, cx, cz - 8], [28, 0.12, cx, cz + 8], [0.12, 16, cx - 14, cz], [0.12, 16, cx + 14, cz], [0.12, 16, cx, cz]]) B(root, w, 0.02, d, x, SAND + 0.01, z, line, false);
    for (const s of [-1, 1]) { const gx = cx + s * 14; C(root, 0.06, 0.06, 2, gx, 1, cz - 2.5, 0xffffff, 6); C(root, 0.06, 0.06, 2, gx, 1, cz + 2.5, 0xffffff, 6); B(root, 0.1, 0.1, 5, gx, 2, cz, 0xffffff); }
    for (const [dx, dz] of [[-6, -3], [-3, 2], [4, -2], [7, 3], [0, 5]]) stander(cx + dx, cz + dz, dx > 0 ? -Math.PI / 2 : Math.PI / 2, { task: 'swing' });
    S(root, 0.12, cx + 1, SAND + 0.12, cz, 0xffffff, 10);
    fx('LND', 'PCH', 'SND', PARKS, 'Beach soccer pitch', cx, cz); for (const s of [-1, 1]) fx('PRD', 'PLY', 'STL', PARKS, 'Beach soccer goal', cx + s * 14, cz); fx('PRD', 'PLY', 'PLS', 'MarketWay Retail', 'Football', cx + 1, cz);
  }

  // ---------------- kiosks: gelato, smoothies and cocktails, coconuts and fruit, corn and churros ----------------
  const kiosk = (x, z, roofCol, name, sub, items, colour) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    B(g, 3, 1.1, 2, 0, 0.6, 0, roofCol); B(g, 3.2, 0.08, 2.2, 0, 1.18, 0, 0xffffff);
    for (const [a, b] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) C(g, 0.05, 0.05, 1.5, a, 1.9, b, 0xffffff, 6);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.8, 4), mat(roofCol)); top.position.y = 3.0; top.rotation.y = Math.PI / 4; g.add(top);
    place(sign(name, sub, 3.4, colour, '#ffffff', 'sans-serif'), x, 2.4, z + 1.15, 0);
    stander(x, z - 0.4, 0, { task: 'cook' }); solid(x - 1.6, x + 1.6, z - 1.1, z + 1.1); fx('BLD', 'KSK', 'WOD', BUILD, 'Kiosk: ' + name, x, z, 'REQ');
    spot(x, z + 2, 1.8, name, () => ctx.openShop?.(name, items));
  };
  kiosk(102, 231, 0xff8fb1, 'GELATERIA', 'Italian gelato · sorbet', [{ name: 'Pistachio gelato', icon: '🍨', price: 3, energy: 8 }, { name: 'Strawberry sorbet', icon: '🍧', price: 3, energy: 8 }, { name: 'Ice cream cone', icon: '🍦', price: 2, energy: 6 }, { name: 'Affogato', icon: '☕', price: 4, energy: 12 }], '#d6336c');
  kiosk(162, 233, 0xffd43b, 'CORN & CHURROS', 'grilled corn · churros · fries', [{ name: 'Grilled corn', icon: '🌽', price: 2, hunger: 12 }, { name: 'Churros with chocolate', icon: '🥖', price: 4, hunger: 14 }, { name: 'Chips', icon: '🍟', price: 3, hunger: 18 }], '#e67700');
  kiosk(208, 232, 0x63e6be, 'SMOOTHIES & COCKTAILS', 'fresh blends · mocktails', [{ name: 'Mango smoothie', icon: '🥭', price: 4, energy: 14 }, { name: 'Watermelon juice', icon: '🍉', price: 3, energy: 12 }, { name: 'Virgin mojito', icon: '🍹', price: 4, energy: 10 }, { name: 'Iced lemonade', icon: '🍋', price: 2, energy: 8 }], '#0b7285');
  kiosk(248, 230, 0x8ce99a, 'COCONUT & FRUIT', 'fresh coconut · mango · pineapple', [{ name: 'Fresh coconut', icon: '🥥', price: 3, energy: 14 }, { name: 'Pineapple on a stick', icon: '🍍', price: 2, energy: 8 }, { name: 'Mango with chilli', icon: '🥭', price: 3, energy: 10 }, { name: 'Fruit bowl', icon: '🍓', price: 5, hunger: 15, energy: 10 }], '#2b8a3e');

  // ---------------- pastel lifeguard towers (South Beach) and surf flags (Bondi) ----------------
  for (const [x, c] of [[95, 0xffb3c7], [178, 0x99e9f2], [262, 0xffe066]]) {
    const z = 241;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C(root, 0.08, 0.08, 2.4, x + dx, 1.2, z + dz, 0xffffff, 6);
    B(root, 2.8, 1.8, 2.6, x, 3.3, z, c); B(root, 3.2, 0.2, 3, x, 4.3, z, 0xffffff); B(root, 1.4, 0.9, 0.05, x, 3.4, z + 1.31, mat(0x9fd3ff, { opacity: 0.6 }), false);
    const ramp = B(root, 0.8, 0.08, 3.4, x, 1.2, z - 2.6, 0xd9b07a); ramp.rotation.x = 0.55;
    stander(x, z + 0.2, 0, { outfit: 0xe63946, y: 2.45, task: 'talk' }); solid(x - 1.3, x + 1.3, z - 1.3, z + 1.3); fx('BLD', 'LFG', 'WOD', BUILD, 'Lifeguard tower', x, z);
  }
  const flagMat = makeTex(64, 64, g => { g.fillStyle = '#e03131'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fcc419'; g.fillRect(0, 32, 64, 32); });
  for (const fx2 of [120, 150, 200, 230]) { C(root, 0.04, 0.04, 3.2, fx2, 1.6, shore - 3, 0x888888, 5); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: flagMat, side: THREE.DoubleSide })); fl.position.set(fx2 + 0.46, 2.85, shore - 3); root.add(fl); fx('PRD', 'SGN', 'FAB', PARKS, 'Surf flag (swim between the flags)', fx2, shore - 3); }
  spot(178, 238.5, 2, 'Talk to the lifeguard', () => toast(['🏊 "Swim between the red and yellow flags. Rips pull you out anywhere else."', '🦈 "Shark spotted past the buoys this morning. Stay in the shallows."', '🐢 "Please don\'t touch the turtles. They\'re nesting."'][Math.floor(Math.random() * 3)]));

  // ---------------- jetty and overwater bungalows (Maldives) ----------------
  const jx = 150, jz1 = 306;
  const deckMat = mat(0xb5895a, { rough: 0.85 });
  B(root, 3, 0.2, jz1 - shore + 2, jx, DECK - 0.1, (shore + jz1) / 2, deckMat); floor(jx - 1.5, jx + 1.5, shore - 1, jz1, DECK);
  // a wooden ramp up from the sand to the jetty
  { const len = 7, r = B(root, 3, 0.15, Math.hypot(len, DECK), jx, DECK / 2, shore - 1 - len / 2, deckMat); r.rotation.x = Math.atan2(DECK, len); ramp(jx - 1.5, jx + 1.5, shore - 1 - len, shore - 1, SAND, DECK); }
  for (let z = shore + 2; z < jz1; z += 4) for (const s of [-1, 1]) C(root, 0.12, 0.12, 2.4, jx + s * 1.4, 0, z, 0x5a3d26, 6);
  fx('LND', 'JTY', 'WOD', BUILD, 'Jetty to the overwater bungalows', jx, (shore + jz1) / 2); fx('LND', 'RMP', 'WOD', BUILD, 'Ramp up to the jetty', jx, shore - 4.5);
  for (const [bx, bz] of [[jx - 9, 270], [jx + 9, 270], [jx - 9, 288], [jx + 9, 288], [jx, jz1 + 6]]) {
    const g = new THREE.Group(); g.position.set(bx, 0, bz); root.add(g);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) C(g, 0.15, 0.15, 2.6, dx, 0, dz, 0x5a3d26, 6);
    B(g, 7.5, 0.25, 7.5, 0, DECK - 0.12, 0, deckMat); B(g, 4.6, 2.6, 4.2, 0, DECK + 1.3, -0.6, 0xf4ede0);
    B(g, 3.4, 1.8, 0.06, 0, DECK + 1.2, 1.52, mat(0x8fd3f0, { rough: 0.05, opacity: 0.7 }), false);
    const thatch = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.4, 4), mat(0xc9a86a, { rough: 1 })); thatch.position.set(0, DECK + 3.8, -0.6); thatch.rotation.y = Math.PI / 4; thatch.castShadow = true; g.add(thatch);
    B(g, 1.6, 0.1, 0.8, 0, DECK + 0.3, 3.2, 0xffffff); sitter(bx, bz + 3.2, 0, DECK + 0.4, { task: 'talk' });
    solid(bx - 2.3, bx + 2.3, bz - 2.7, bz + 1.5); fx('BLD', 'BNG', 'WOD.HAY', BUILD, 'Overwater bungalow', bx, bz, 'REQ');
    floor(bx - 3.75, bx + 3.75, bz - 3.75, bz + 3.75, DECK);
    if (Math.abs(bx - jx) > 1) floor(Math.min(bx, jx), Math.max(bx, jx), bz - 0.9, bz + 0.9, DECK);   // walkway to the jetty
    if (Math.abs(bx - jx) > 1) B(root, Math.abs(bx - jx), 0.2, 1.8, (bx + jx) / 2, DECK - 0.1, bz, deckMat);
  }
  spot(jx, shore + 1, 2.4, 'Overwater bungalows', () => ctx.openShop?.('Overwater bungalows', [{ name: 'Bungalow for the night', icon: '🛖', price: 60, energy: 100 }, { name: 'Breakfast on the deck', icon: '🥐', price: 9, hunger: 40 }, { name: 'Snorkel hire', icon: '🤿', price: 5, energy: 5 }]));

  // ---------------- parasols, towels and sunbathers on the new sand ----------------
  const parasolCols = [['#e63946', '#ffffff'], ['#1f6fd1', '#ffd23f'], ['#22c55e', '#ffffff'], ['#ff922b', '#ffffff'], ['#7b2cbf', '#ffd6e8']];
  const parasolMats = parasolCols.map(([a, b]) => { const t = makeTex(128, 16, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 16, 0, 16, 16); } }); return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 }); });
  const towelCols = [0xe63946, 0x1f6fd1, 0xffd23f, 0x22c55e, 0xff8fb1, 0xffffff];
  let k = 0;
  for (let x = 66; x < 296; x += 9) {
    if (x > 272 || (x > 144 && x < 156)) continue;   // keep the east end and the jetty clear
    const z = 244 + ((x * 7) % 4);
    C(root, 0.04, 0.04, 2.4, x, 1.2, z, 0xeeeeee, 6);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 8, 1, true), parasolMats[k % parasolMats.length]); top.position.set(x, 2.45, z); root.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), mat(towelCols[k % towelCols.length])); towel.rotation.x = -Math.PI / 2; towel.position.set(x + 1.2, SAND + 0.03, z + 0.6); root.add(towel);   // towels reach onto the wet sand and under the foam's landward swing: keep them 2 cm / 1 cm above so they don't flicker
    if (k % 2 === 0) sitter(x + 1.2, z + 0.6, Math.PI, 0.12, { task: k % 4 ? 'talk' : 'eat' });
    fx('PRD', 'PAR', 'FAB.STL', 'MarketWay Retail', 'Beach parasol', x, z, 'RES'); fx('PRD', 'TWL', 'FAB', 'Loomhouse Textiles', 'Beach towel', x + 1.2, z + 0.6, 'RES');
    k++;
  }
  walker([[70, shore - 2], [290, shore - 2]], { speed: 0.9 }); walker([[288, shore - 3], [72, shore - 3]], { speed: 1.0 });
  walker([[80, 232], [140, 236], [240, 236], [280, 232]], { speed: 1.1 });

  // ---------------- wildlife ----------------
  // sea turtles: a few crawling slowly up the sand, a few swimming in the shallows
  const turtleMat = mat(0x5c6b3a, { rough: 0.8 }), shellMat = mat(0x6b5134, { rough: 0.7 });
  const makeTurtle = s => { const g = new THREE.Group(); const shell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), shellMat); shell.scale.set(1, 0.38, 1.25); shell.position.y = 0.18; g.add(shell);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), turtleMat); head.position.set(0, 0.16, 0.72); g.add(head);
    const fl = []; for (const [x, z, r] of [[-0.5, 0.35, 0.5], [0.5, 0.35, -0.5], [-0.35, -0.5, 0.3], [0.35, -0.5, -0.3]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.18), turtleMat); f.position.set(x, 0.1, z); f.rotation.y = r; g.add(f); fl.push(f); }
    g.scale.setScalar(s); root.add(g); return { g, fl }; };
  const turtles = [];
  for (const [x, z, swim] of [[96, 247, 0], [134, 246, 0], [222, 248, 0], [118, 256, 1], [196, 258, 1], [240, 262, 1]]) { const t = makeTurtle(swim ? 1.1 : 0.9); t.g.position.set(x, swim ? seaY + 0.01 : SAND, z); turtles.push({ ...t, x, z, swim, ph: rnd() * 6, dir: swim ? rnd() * 6 : Math.PI }); }
  // fish: small bright fish swimming in the shallows, between the sea and the clear top water
  const fishCount = 70, fish = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.3, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), fishCount);
  const fishCols = [0xffd43b, 0x4dabf7, 0xff6b6b, 0x63e6be, 0xffffff]; const fc = new THREE.Color();
  const fishState = Array.from({ length: fishCount }, (_, i) => { fish.setColorAt(i, fc.set(fishCols[i % fishCols.length])); return { cx: 80 + (i % 7) * 30, cz: shore + 6 + (i % 4) * 2.5, r: 1.2 + (i % 5) * 0.4, ph: i * 0.7, sp: 0.8 + (i % 3) * 0.4 }; });
  fish.frustumCulled = false; root.add(fish);
  // crabs scuttling sideways by the rocks
  const crabs = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0xe8590c)); b.scale.set(1.4, 0.6, 1); g.add(b); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(0xd9480f)); c.position.set(s * 0.17, 0.02, 0.1); g.add(c); } g.position.set(x0 + 7 + i * 1.5, SAND + 0.05, 200 + i * 8); root.add(g); crabs.push({ g, x: g.position.x, z: g.position.z, ph: i }); }
  // dolphins arcing out of the water offshore, sharks' fins further out
  const finGeo = new THREE.ConeGeometry(0.35, 0.9, 3); finGeo.translate(0, 0.45, 0);
  const sharkMat = mat(0x5f6b73, { rough: 0.6 }), sharks = [[200, 345, 18], [110, 360, 22]].map(([cx, cz, r], i) => { const f = new THREE.Mesh(finGeo, sharkMat); f.scale.set(0.5, 1, 1.4); root.add(f); return { f, cx, cz, r, ph: i * 3 }; });
  const dolphinGeo = new THREE.CapsuleGeometry(0.35, 1.6, 4, 8).rotateX(Math.PI / 2), dolphinMat = mat(0x7c8f9c, { rough: 0.4 });
  const dolphins = [0, 1, 2].map(i => { const d = new THREE.Mesh(dolphinGeo, dolphinMat); root.add(d); return { d, x: 120 + i * 3, z: 330 + i * 2, ph: i * 0.6 }; });

  // ---------------- water sports: surfers, jet skis, kayaks, paddleboards, a banana boat, swimmers ----------------
  const board = c => new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.7, 4, 10).rotateX(Math.PI / 2).scale(1, 0.25, 1), mat(c));
  const rider = (x, z, o = {}) => { const h = K.person(x, z, Math.PI, o); return h; };
  const surfers = [[100, 0xff3b30], [175, 0xffd23f], [230, 0x1f6fd1]].map(([x, c], i) => { const b = board(c); root.add(b); const h = rider(x, shore + 30, { outfit: [0x111111, 0x0b7285, 0xe03131][i] }); return { b, h, x, ph: i * 4 }; });
  const jetSkiGeo = new THREE.BoxGeometry(0.9, 0.45, 2.4);
  const jetSkis = [[230, 300, 14], [120, 310, 18]].map(([cx, cz, r], i) => { const g = new THREE.Group(); g.add(new THREE.Mesh(jetSkiGeo, mat([0xffd43b, 0xe03131][i], { rough: 0.3 }))); root.add(g); const h = K.person(cx, cz, 0, { outfit: 0x111111 }); return { g, h, cx, cz, r, ph: i * 2 }; });
  const kayaks = [[90, 272, 0xff922b], [205, 278, 0x22b8cf], [258, 268, 0xfab005]].map(([x, z, c], i) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 2.6, 4, 8).rotateX(Math.PI / 2).scale(1, 0.4, 1), mat(c)); root.add(b); const h = K.person(x, z, 0, {}); return { b, h, x, z, ph: i * 2 }; });
  const paddlers = [[130, 264], [245, 266]].map(([x, z], i) => { const b = board(0xffffff); b.scale.set(1.2, 1, 1.4); root.add(b); const h = K.person(x, z, 0, { outfit: 0xf783ac }); return { b, h, x, z, ph: i * 3 }; });
  const banana = new THREE.Group(); { const tube = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 5, 4, 10).rotateX(Math.PI / 2), mat(0xffd43b, { rough: 0.5 })); banana.add(tube); root.add(banana); }
  const bananaRiders = [0, 1, 2].map(i => K.person(0, 0, 0, { outfit: [0xe03131, 0x1971c2, 0x2f9e44][i] }));
  const swimmers = [];
  for (let i = 0; i < 12; i++) { const x = 115 + i * 10, z = shore + 4 + (i % 3) * 2.5; if (x > 140 && x < 160) continue; const h = K.person(x, z, Math.PI, { child: i % 4 === 0 }); if (h) swimmers.push({ h, x, z, ph: i }); }

  // IDs for everything that moves here: the wildlife, the boards and boats, and every person
  turtles.forEach((t, i) => moving('CRE', 'REP', 'CHE', 'WLD', 'turtle:' + i, 'wild', 'Green sea turtle (Chelonia mydas)', t.g));
  fishState.forEach((f, i) => bot.thing({ cls: 'CRE', kind: 'FSH', mat: 'POM', owner: 'WLD', seed: 'bay:fish:' + i, maker: 'wild', name: 'Reef fish, Anthos Bay shallows', pos: { x: f.cx, z: f.cz } }));
  crabs.forEach((c, i) => moving('CRE', 'CRU', 'GRA', 'WLD', 'crab:' + i, 'wild', 'Shore crab', c.g));
  sharks.forEach((s, i) => moving('CRE', 'FSH', 'CAR', 'WLD', 'shark:' + i, 'wild', 'Blacktip reef shark (Carcharhinus melanopterus)', s.f));
  dolphins.forEach((d, i) => moving('CRE', 'MAM', 'TUR', 'WLD', 'dolphin:' + i, 'wild', 'Bottlenose dolphin (Tursiops truncatus)', d.d));
  surfers.forEach((s, i) => moving('VEH', 'SRF', 'FIB', 'RES', 'surfboard:' + i, 'Harbour Shipyards', 'Surfboard', s.b));
  jetSkis.forEach((j, i) => moving('VEH', 'JSK', 'FIB.STL', 'RES', 'jetski:' + i, 'Harbour Shipyards', 'Jet ski', j.g));
  kayaks.forEach((k2, i) => moving('VEH', 'KYK', 'PLS', 'RES', 'kayak:' + i, 'Harbour Shipyards', 'Kayak', k2.b));
  paddlers.forEach((pd, i) => moving('VEH', 'SRF', 'FIB', 'RES', 'paddleboard:' + i, 'Harbour Shipyards', 'Paddleboard', pd.b));
  moving('VEH', 'BAN', 'PLS', 'REQ', 'banana', 'Harbour Shipyards', 'Banana boat', banana);
  bot.people(K);   // the swimmers, surfers, sunbathers, staff and players each have an ID

  // the shark warning: swim too far out and the lifeguards call you in (and the shark may bite)
  let warned = 0;
  const o = new THREE.Object3D();
  let t = 0;
  function update(dt, p, swimming) {
    t += dt;
    if (p.x < x0 - 160 || p.x > x1 + 160 || p.z < 120 || p.z > 420) return;
    foam.position.z = shore + 0.6 + Math.sin(t * 0.55) * 1.1; foam.material.opacity = 0.6 + Math.sin(t * 0.55) * 0.25; foamTex.offset.x = t * 0.012;
    K.update(dt, p, 160);
    for (const tu of turtles) {
      if (tu.swim) { tu.dir += dt * 0.15; tu.x += Math.sin(tu.dir) * dt * 0.6; tu.z = Math.max(shore + 4, Math.min(shore + 14, tu.z + Math.cos(tu.dir) * dt * 0.6)); tu.g.position.set(tu.x, seaY + 0.02, tu.z); tu.g.rotation.y = tu.dir; }
      else { const step = Math.max(0, Math.sin(t * 1.4 + tu.ph)); tu.z = Math.max(shore - 8, tu.z - step * dt * 0.08); if (tu.z <= shore - 8) tu.z = shore - 1; tu.g.position.set(tu.x, SAND, tu.z); tu.g.rotation.y = Math.PI; }
      tu.fl.forEach((f, i) => { f.rotation.x = Math.sin(t * (tu.swim ? 2 : 1.4) + tu.ph + i) * 0.4; });
    }
    fishState.forEach((f, i) => { const a = t * f.sp + f.ph; o.position.set(f.cx + Math.cos(a) * f.r, seaY + 0.008, f.cz + Math.sin(a) * f.r); o.rotation.set(0, -a, 0); o.updateMatrix(); fish.setMatrixAt(i, o.matrix); });
    fish.instanceMatrix.needsUpdate = true;
    for (const c of crabs) { c.g.position.x = c.x + Math.sin(t * 0.9 + c.ph) * 1.2; }
    for (const s of sharks) { const a = t * 0.12 + s.ph; s.f.position.set(s.cx + Math.cos(a) * s.r, seaY, s.cz + Math.sin(a) * s.r); s.f.rotation.y = -a; }
    for (const d of dolphins) { const ph = (t * 0.35 + d.ph) % 4; const jump = ph < 1; d.x += dt * 4; if (d.x > 290) d.x = 70; d.d.position.set(d.x, jump ? seaY + Math.sin(ph * Math.PI) * 1.8 - 0.3 : -2, d.z); d.d.rotation.x = jump ? -Math.cos(ph * Math.PI) * 0.8 : 0; d.d.rotation.y = Math.PI / 2; }
    for (const s of surfers) { const ph = ((t * 0.06 + s.ph * 0.1) % 1); const z = shore + 34 - ph * 28, x = s.x + Math.sin(ph * 6) * 4; s.b.position.set(x, seaY + 0.05, z); s.b.rotation.y = Math.sin(ph * 6) * 0.3;
      if (s.h) { s.h.root.position.set(x, seaY + 0.1, z); s.h.root.rotation.y = Math.PI + Math.sin(ph * 6) * 0.3; } }
    for (const j of jetSkis) { const a = t * 0.35 + j.ph; const x = j.cx + Math.cos(a) * j.r, z = j.cz + Math.sin(a) * j.r; j.g.position.set(x, seaY + 0.2, z); j.g.rotation.y = -a; if (j.h) { j.h.root.position.set(x, seaY + 0.1, z); j.h.root.rotation.y = -a; } }
    for (const k2 of kayaks) { const x = k2.x + Math.sin(t * 0.1 + k2.ph) * 6, z = k2.z + Math.cos(t * 0.08 + k2.ph) * 2; k2.b.position.set(x, seaY + 0.08, z); k2.b.rotation.y = Math.PI / 2 + Math.cos(t * 0.1 + k2.ph) * 0.2; if (k2.h) { k2.h.root.position.set(x, seaY - 0.45, z); k2.h.root.rotation.y = Math.PI / 2; } }
    for (const pd of paddlers) { const x = pd.x + Math.sin(t * 0.07 + pd.ph) * 8; pd.b.position.set(x, seaY + 0.05, pd.z); pd.b.rotation.y = Math.PI / 2; if (pd.h) { pd.h.root.position.set(x, seaY + 0.1, pd.z); pd.h.root.rotation.y = Math.PI / 2; } }
    { const a = t * 0.22, bx = 180 + Math.cos(a) * 40, bz = 320 + Math.sin(a) * 14; banana.position.set(bx, seaY + 0.3, bz); banana.rotation.y = -a + Math.PI;
      bananaRiders.forEach((h, i) => { if (!h) return; const off = (i - 1) * 1.6; h.root.position.set(bx + Math.sin(-a + Math.PI) * off, seaY + 0.1, bz + Math.cos(-a + Math.PI) * off); h.root.rotation.y = -a + Math.PI; }); }
    for (const s of swimmers) { s.h.root.position.set(s.x + Math.sin(t * 0.3 + s.ph) * 2, -0.95 + Math.sin(t * 1.4 + s.ph) * 0.08, s.z + Math.cos(t * 0.25 + s.ph) * 1.2); }
    if (swimming) {
      const near = sharks.reduce((m, s) => Math.min(m, Math.hypot(p.x - s.f.position.x, p.z - s.f.position.z)), Infinity);
      if (near < 40 && t - warned > 12) { warned = t; toast('🦈 Lifeguard: "Shark! Get back between the flags, now!"'); }
      if (near < 5 && stats) { stats.hp = Math.max(1, stats.hp - 20 * dt); }
    }
  }

  return {
    pools,
    // the height of the new sand, decks, the jetty and the pool rim; null anywhere else
    groundAt(x, z) { if (x < x0 - 1 || x > x1 + 6 || z < z0 - 1 || z > jz1 + 12) return null; let y = null; for (const f of floors) if (x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ) y = Math.max(y ?? -1, typeof f.y === 'function' ? f.y(x, z) : f.y); return y; },
    update,
  };
}
