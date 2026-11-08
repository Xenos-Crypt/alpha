// Westhaven Funfair: the fairground round Cirque Aurora, fenced in with gates on the boulevard.
//   a Ferris wheel (ride a gondola round, right over the city), a carousel of galloping horses,
//   a wave swinger whose chairs fly out as it spins, a drop tower, a bumper-car pavilion,
//   game stalls with prizes (hook-a-duck, hoopla, a shooting gallery, coconut shy),
//   a burger van and an ice-cream cart, strings of light bulbs, and people enjoying it all.
// Every ride is real: pay at the ride, you're seated and carried round, and you're set down
// at the entrance when it ends (or press E to get off early).
import * as THREE from 'three';

export const FAIR = { minX: 180, maxX: 405, minZ: -760, maxZ: -636, gates: [[237, 247], [365, 375]] };   // gates are on the north (boulevard) side
export const RIDES = {
  wheel: { name: 'Ferris wheel', price: 6, x: 372, z: -700, r: 15, hub: 18, turn: 48 },
  carousel: { name: 'Carousel', price: 4, x: 330, z: -690, r: 7, turn: 12, len: 36 },
  swings: { name: 'Wave Swinger', price: 5, x: 378, z: -655, len: 30 },
  drop: { name: 'Drop tower', price: 6, x: 392, z: -737, h: 40, len: 26 },
  slide: { name: 'Helter-skelter', price: 3, x: 198, z: -716, h: 12, len: 9 },
  ghost: { name: 'Ghost train', price: 4, x: 202, z: -674, len: 22 },
  bumpers: { name: 'Bumper cars', price: 4, x: 322, z: -655, w: 18, d: 12, len: 30 },
};

export function buildFunfair(ctx) {
  const { scene, colliders, interactables, makeTex, toast, stats } = ctx;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide })); return mats.get(k); };
  const B = (p, w, h, d, x, y, z, c, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > 0.6 || w > 2; m.receiveShadow = true; p.add(m); return m; };
  const C = (p, rt, rb, h, x, y, z, c, seg = 16, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c instanceof THREE.Material ? c : mat(c, o)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const solid = (x0, x1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const steel = mat(0xd9dde2, { metal: 0.7, rough: 0.35 }), white = mat(0xf6f1e7), red = mat(0xc8102e), gold = mat(0xf2c14e, { metal: 0.5, rough: 0.4 });
  const bulbs = [];   // glowing bulbs that chase and twinkle at night
  const bulbMats = [0xfff2c0, 0xff6b6b, 0x6bc5ff, 0x9dff6b, 0xffd23f].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }));
  const bulbGeo = new THREE.SphereGeometry(0.11, 6, 4);
  const bulb = (p, x, y, z, k = 0) => { const m = new THREE.Mesh(bulbGeo, bulbMats[k % bulbMats.length]); m.position.set(x, y, z); p.add(m); return m; };
  const root = new THREE.Group(); scene.add(root);
  const stripes = (a, b, n = 12) => { const t = makeTex(256, 64, g => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 256 / n, 0, 256 / n, 64); } }); t.wrapS = THREE.RepeatWrapping; return t; };
  const sign = (text, sub, w, bg = '#2b0f4a', fg = '#ffd23f') => { const t = makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = `bold ${sub ? 48 : 60}px Georgia, serif`; g.textAlign = 'center'; g.fillText(text, 256, sub ? 58 : 82, 490); if (sub) { g.font = 'italic 26px Georgia, serif'; g.fillStyle = '#fff'; g.fillText(sub, 256, 104, 490); } }); return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); };

  // ---------------- ground and fence ----------------
  { const { minX, maxX, minZ, maxZ } = FAIR;
    B(root, maxX - minX, 0.04, maxZ - minZ, (minX + maxX) / 2, 0.02, (minZ + maxZ) / 2, 0x6f8f4a, { rough: 1 });
    // paths: main avenue from each gate, and a loop past the rides
    for (const [x0, x1, z0, z1] of [[238, 246, -760, -737], [366, 374, -760, -718], [190, 400, -646, -640], [246, 366, -716, -710], [300, 306, -716, -646], [394, 400, -716, -646]]) B(root, x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.03, (z0 + z1) / 2, 0xcdb68a, { rough: 1 });
    const rail = mat(0x2a2f36, { metal: 0.6, rough: 0.4 });
    const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.5) return; const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2; root.add(g);
      for (const y of [0.25, 1.0, 1.75]) B(g, L, 0.06, 0.06, 0, y, 0, rail);
      for (let a = -L / 2; a <= L / 2 + 0.01; a += 2.5) { B(g, 0.08, 1.9, 0.08, a, 0.95, 0, rail); }
      for (let a = -L / 2 + 0.6; a < L / 2; a += 0.3) B(g, 0.025, 1.5, 0.025, a, 1.0, 0, rail);
      colliders.push({ minX: Math.min(x0, x1) - 0.15, maxX: Math.max(x0, x1) + 0.15, minZ: Math.min(z0, z1) - 0.15, maxZ: Math.max(z0, z1) + 0.15 }); };
    let x = minX; for (const [g0, g1] of FAIR.gates) { run(x, minZ, g0, minZ); x = g1; } run(x, minZ, maxX, minZ);
    run(maxX, minZ, maxX, -715); run(maxX, -645, maxX, maxZ); run(minX, maxZ, maxX, maxZ);   // the gap opens into the extension (fair-extras.js) run(minX, minZ, minX, maxZ);
    // gate arches with flashing bulbs
    for (const [g0, g1] of FAIR.gates) { const cx = (g0 + g1) / 2;
      for (const s of [-1, 1]) { C(root, 0.35, 0.4, 7, cx + s * 5.3, 3.5, minZ, red); C(root, 0.6, 0.6, 0.8, cx + s * 5.3, 7.3, minZ, gold); }
      B(root, 11.4, 1.6, 0.4, cx, 6.4, minZ, 0x2b0f4a);
      const s = sign('WESTHAVEN FUNFAIR', 'rides · games · Cirque Aurora', 10.6); s.position.set(cx, 6.4, minZ - 0.22); s.rotation.y = Math.PI; root.add(s);   // faces the road
      for (let i = 0; i <= 20; i++) bulbs.push(bulb(root, cx - 5.5 + i * 0.55, 7.35, minZ - 0.25, i));
    }
  }
  ctx.destinations?.push({ name: 'Westhaven Funfair', x: 242, z: FAIR.minZ - 4 });

  // ---------------- Ferris wheel ----------------
  const W = RIDES.wheel;
  const wheel = new THREE.Group(); wheel.position.set(W.x, W.hub, W.z); root.add(wheel);
  { for (const s of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(W.r, 0.22, 8, 64), steel); rim.position.z = s * 1.2; wheel.add(rim); const inner = new THREE.Mesh(new THREE.TorusGeometry(W.r * 0.55, 0.12, 6, 48), steel); inner.position.z = s * 1.2; wheel.add(inner); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; for (const s of [-1, 1]) { const sp = B(wheel, 0.12, W.r, 0.12, Math.cos(a) * W.r / 2, Math.sin(a) * W.r / 2, s * 1.2, steel); sp.rotation.z = a - Math.PI / 2; } B(wheel, 0.1, 0.1, 2.4, Math.cos(a) * W.r, Math.sin(a) * W.r, 0, steel); }
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; for (const s of [-1, 1]) bulbs.push(bulb(wheel, Math.cos(a) * (W.r + 0.3), Math.sin(a) * (W.r + 0.3), s * 1.2, i)); }
    C(wheel, 1.1, 1.1, 3.2, 0, 0, 0, gold).rotation.x = Math.PI / 2;
    // A-frame legs and the boarding platform
    for (const s of [-1, 1]) for (const lx of [-1, 1]) { const leg = B(root, 0.6, W.hub / Math.cos(0.32) + 1, 0.6, W.x + lx * Math.tan(0.32) * W.hub / 2, W.hub / 2, W.z + s * 2.2, mat(0xffffff, { metal: 0.5, rough: 0.4 })); leg.rotation.z = lx * 0.32; }   // an A-frame: legs splay out at the bottom
    for (const s of [-1, 1]) for (const lx of [-1, 1]) solid(W.x + lx * Math.tan(0.32) * W.hub - 0.8, W.x + lx * Math.tan(0.32) * W.hub + 0.8, W.z + s * 2.2 - 0.8, W.z + s * 2.2 + 0.8);
    B(root, 6, 0.8, 4, W.x, 0.4, W.z + 4.2, 0x8a6a4a); B(root, 6.2, 0.1, 4.2, W.x, 0.85, W.z + 4.2, red);
    const s = sign('THE WESTHAVEN EYE', 'Ferris wheel · 6 gold', 6); s.position.set(W.x, 3.2, W.z + 6.4); root.add(s);
  }
  const gondolas = [];
  for (let i = 0; i < 16; i++) { const g = new THREE.Group(); root.add(g);
    const col = [0xc8102e, 0x1f6fd1, 0xf2c14e, 0x2a9d8f][i % 4];
    B(g, 1.9, 0.1, 1.6, 0, -1.9, 0, 0x333333); B(g, 1.9, 0.9, 1.6, 0, -1.45, 0, col); B(g, 1.6, 0.05, 1.3, 0, -0.95, 0, mat(0xffffff, { rough: 0.2 }));
    for (const [x, z] of [[-0.85, -0.7], [0.85, -0.7], [-0.85, 0.7], [0.85, 0.7]]) B(g, 0.06, 1.0, 0.06, x, -0.5, z, steel);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.6, 4), mat(col)); roof.rotation.y = Math.PI / 4; roof.position.y = 0.2; g.add(roof);
    gondolas.push(g); }

  // ---------------- carousel ----------------
  const K = RIDES.carousel, car = new THREE.Group(); car.position.set(K.x, 0, K.z); root.add(car);
  const spin = new THREE.Group(); car.add(spin);
  C(car, K.r + 0.4, K.r + 0.4, 0.5, 0, 0.25, 0, 0x6d0f1f, 48); C(spin, K.r, K.r, 0.15, 0, 0.58, 0, mat(0xd9b38c), 48);
  C(spin, 0.6, 0.6, 5.6, 0, 3.2, 0, mat(0xffffff, { emissive: 0xffe9b0, ei: 0.3 }), 24);
  const roofTex = stripes('#c8102e', '#f6f1e7', 24); const canopy = new THREE.Mesh(new THREE.ConeGeometry(K.r + 0.6, 2.4, 24, 1, true), new THREE.MeshStandardMaterial({ map: roofTex, side: THREE.DoubleSide })); canopy.position.y = 7.2; spin.add(canopy);
  C(spin, K.r + 0.6, K.r + 0.6, 0.7, 0, 5.75, 0, gold, 48);
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; bulbs.push(bulb(spin, Math.cos(a) * (K.r + 0.62), 5.75, Math.sin(a) * (K.r + 0.62), i)); }
  const horses = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = i % 2 ? K.r - 1.4 : K.r - 3.2; const h = new THREE.Group(); h.position.set(Math.cos(a) * rr, 1.6, Math.sin(a) * rr); h.rotation.y = -a; spin.add(h);
    C(h, 0.05, 0.05, 6, 0, 1.4, 0, gold, 8);
    const col = [0xffffff, 0x2b1d14, 0xc9a26a, 0x8a8f96][i % 4];
    B(h, 0.45, 0.5, 1.4, 0, 0, 0, col); const neck = B(h, 0.3, 0.7, 0.35, 0, 0.45, 0.62, col); neck.rotation.x = -0.4; B(h, 0.3, 0.32, 0.6, 0, 0.75, 0.9, col);
    for (const [x, z] of [[-0.15, 0.5], [0.15, 0.5], [-0.15, -0.5], [0.15, -0.5]]) { const l = B(h, 0.1, 0.7, 0.1, x, -0.5, z, col); l.rotation.x = z > 0 ? 0.5 : -0.5; }
    B(h, 0.5, 0.08, 0.5, 0, 0.28, 0, red); B(h, 0.06, 0.1, 0.3, 0, -0.1, -0.75, 0x111111);
    horses.push({ h, a, rr, ph: i * 0.9 }); }
  colliders.push({ circleX: K.x, circleZ: K.z, circleRadius: K.r + 0.4, minX: K.x - K.r, maxX: K.x + K.r, minZ: K.z - K.r, maxZ: K.z + K.r });

  // ---------------- wave swinger ----------------
  const S = RIDES.swings, sw = new THREE.Group(); sw.position.set(S.x, 0, S.z); root.add(sw);
  C(sw, 3, 3.4, 0.6, 0, 0.3, 0, 0x2b0f4a, 32); C(sw, 0.5, 0.7, 11, 0, 5.8, 0, steel, 16);
  const swTop = new THREE.Group(); swTop.position.y = 11; sw.add(swTop);
  const swRoof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.2, 32, 1, true), new THREE.MeshStandardMaterial({ map: stripes('#1f6fd1', '#f2c14e', 20), side: THREE.DoubleSide })); swRoof.position.y = 1.2; swTop.add(swRoof);
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; bulbs.push(bulb(swTop, Math.cos(a) * 5.5, 0.1, Math.sin(a) * 5.5, i)); }
  const chairs = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, arm = new THREE.Group(); arm.position.set(Math.cos(a) * 4.8, 0, Math.sin(a) * 4.8); arm.rotation.y = -a; swTop.add(arm);
    const swing = new THREE.Group(); arm.add(swing);
    for (const s of [-1, 1]) B(swing, 0.02, 4.2, 0.02, 0, -2.1, s * 0.25, steel);
    B(swing, 0.5, 0.08, 0.6, 0, -4.2, 0, [0xc8102e, 0xf2c14e][i % 2]); B(swing, 0.08, 0.5, 0.6, -0.25, -3.95, 0, [0xc8102e, 0xf2c14e][i % 2]);
    chairs.push({ arm, swing, a }); }
  colliders.push({ circleX: S.x, circleZ: S.z, circleRadius: 3.4, minX: S.x - 3.4, maxX: S.x + 3.4, minZ: S.z - 3.4, maxZ: S.z + 3.4 });

  // ---------------- drop tower ----------------
  const D = RIDES.drop, dt0 = new THREE.Group(); dt0.position.set(D.x, 0, D.z); root.add(dt0);
  B(dt0, 4, 0.6, 4, 0, 0.3, 0, 0x2b0f4a); B(dt0, 1.8, D.h, 1.8, 0, D.h / 2, 0, mat(0xe6e9ec, { metal: 0.5 }));
  for (let y = 2; y < D.h; y += 3) bulbs.push(bulb(dt0, 0, y, 0.95, y));
  C(dt0, 1.4, 1.4, 1.2, 0, D.h + 0.6, 0, red); const tip = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 16), red); tip.position.y = D.h + 2.4; dt0.add(tip);
  const ring = new THREE.Group(); dt0.add(ring);
  C(ring, 2.4, 2.4, 0.5, 0, 0, 0, gold, 24); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B(ring, 0.6, 0.9, 0.5, Math.cos(a) * 2.6, -0.2, Math.sin(a) * 2.6, 0x1f6fd1).rotation.y = -a; }
  solid(D.x - 2.4, D.x + 2.4, D.z - 2.4, D.z + 2.4);
  { const s = sign('SKYDROP', '40 metres · 6 gold', 4.5); s.position.set(D.x, 3, D.z + 3.2); root.add(s); }

  // ---------------- bumper cars ----------------
  const BC = RIDES.bumpers, bp = new THREE.Group(); bp.position.set(BC.x, 0, BC.z); root.add(bp);
  B(bp, BC.w, 0.3, BC.d, 0, 0.15, 0, mat(0x3a3f46, { metal: 0.3, rough: 0.3 })); B(bp, BC.w + 0.6, 0.6, BC.d + 0.6, 0, 0.3, 0, 0xf2c14e).scale.y = 0.4;
  for (const [x, z] of [[-BC.w / 2, -BC.d / 2], [BC.w / 2, -BC.d / 2], [-BC.w / 2, BC.d / 2], [BC.w / 2, BC.d / 2]]) B(bp, 0.3, 5, 0.3, x, 2.5, z, steel);
  B(bp, BC.w + 1, 0.4, BC.d + 1, 0, 5.2, 0, 0x2b0f4a); B(bp, BC.w - 0.4, 0.05, BC.d - 0.4, 0, 4.95, 0, mat(0x6b6f76, { metal: 0.8 }));
  for (let i = 0; i < 30; i++) bulbs.push(bulb(bp, -BC.w / 2 + i * BC.w / 29, 5.45, -BC.d / 2 - 0.5, i));
  { const s = sign('DODGEMS', 'bumper cars · 4 gold', 5); s.position.set(0, 6.4, -BC.d / 2 - 0.55); bp.add(s); }
  const dodgems = [];
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(); bp.add(g); const col = [0xc8102e, 0x1f6fd1, 0xf2c14e, 0x2a9d8f, 0x8e44ad, 0xff7a00, 0x16a085][i];
    B(g, 1.4, 0.45, 2.0, 0, 0.55, 0, col); B(g, 1.6, 0.25, 2.2, 0, 0.42, 0, 0x111111); B(g, 1.1, 0.5, 0.6, 0, 0.9, -0.6, col); C(g, 0.03, 0.03, 4.0, 0, 2.7, -0.8, steel, 6);
    g.position.set(-6 + i * 2, 0.3, (i % 2 ? 3 : -3)); dodgems.push({ g, vx: Math.cos(i * 2.1) * 3, vz: Math.sin(i * 2.1) * 3 }); }
  for (const [x0, x1, z0, z1] of [[-BC.w / 2, BC.w / 2, -BC.d / 2, -BC.d / 2 + 0.3], [-BC.w / 2, BC.w / 2, BC.d / 2 - 0.3, BC.d / 2], [-BC.w / 2, -BC.w / 2 + 0.3, -BC.d / 2, BC.d / 2], [BC.w / 2 - 0.3, BC.w / 2, -BC.d / 2, BC.d / 2]]) solid(BC.x + x0, BC.x + x1, BC.z + z0, BC.z + z1);

  // ---------------- helter-skelter ----------------
  const HS = RIDES.slide, hs = new THREE.Group(); hs.position.set(HS.x, 0, HS.z); root.add(hs);
  { const tower = C(hs, 2.0, 2.6, HS.h, 0, HS.h / 2, 0, mat(0xffffff), 24); tower.material = new THREE.MeshStandardMaterial({ map: stripes('#c8102e', '#ffffff', 16) });
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3, 24), mat(0x1f6fd1)); top.position.y = HS.h + 1.5; hs.add(top); C(hs, 0.05, 0.05, 1.6, 0, HS.h + 3.6, 0, steel, 6); B(hs, 0.9, 0.5, 0.03, 0.45, HS.h + 4.1, 0, 0xf2c14e);
    // the spiral chute: short tilted segments wound round the tower
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2 * 3, y = HS.h - 0.5 - i / 64 * (HS.h - 1.2), seg = B(hs, 1.3, 0.12, 0.95, Math.cos(a) * 3.0, y, Math.sin(a) * 3.0, i % 2 ? 0xf2c14e : 0xff8c1a); seg.rotation.y = -a; seg.rotation.z = 0.22; }
    B(hs, 1.4, 0.15, 2.2, 3.0, 0.4, 1.0, 0xff8c1a); C(hs, 0.6, 0.6, 0.15, 3.0, 0.08, 2.2, mat(0x8a6a4a), 16);   // run-out and mat
    colliders.push({ circleX: HS.x, circleZ: HS.z, circleRadius: 2.7, minX: HS.x - 2.7, maxX: HS.x + 2.7, minZ: HS.z - 2.7, maxZ: HS.z + 2.7 });
    const sg = sign('HELTER-SKELTER', '3 gold', 4); sg.position.set(0, 3.0, -2.75); sg.rotation.y = Math.PI; hs.add(sg); }
  // ---------------- ghost train ----------------
  const GT = RIDES.ghost, gt = new THREE.Group(); gt.position.set(GT.x, 0, GT.z); root.add(gt);
  { B(gt, 16, 6, 10, 0, 3, 0, 0x1b1426); for (const [x, c] of [[-5, 0x6bff9d], [0, 0xb36bff], [5, 0xff6b6b]]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), mat(c, { emissive: c, ei: 2 })); e.position.set(x, 5.2, -5.05); gt.add(e); }
    for (const x of [-4.5, 4.5]) { B(gt, 3.0, 3.0, 0.15, x, 1.5, -5.1, 0x050505); B(gt, 3.4, 0.3, 0.3, x, 3.1, -5.1, 0x6d0f1f); }   // in and out doors
    const sg = sign('GHOST TRAIN', 'if you dare · 4 gold', 8, '#050505', '#7dff9d'); sg.position.set(0, 4.3, -5.12); sg.rotation.y = Math.PI; gt.add(sg);
    for (let i = 0; i < 6; i++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat(0xf6f6f6, { emissive: 0x99ffcc, ei: 0.4 })); g.position.set(-6 + i * 2.4, 6.5, -4); g.scale.set(1, 1.4, 1); gt.add(g); }   // ghosts on the roof
    // the track out front, from one door to the other
    B(gt, 13, 0.08, 1.4, 0, 0.06, -6.6, 0x3a3a3a); for (const x of [-4.5, 4.5]) B(gt, 1.4, 0.08, 1.6, x, 0.06, -5.8, 0x3a3a3a);
    solid(GT.x - 8, GT.x + 8, GT.z - 5, GT.z + 5); }
  const ghostCar = new THREE.Group(); { B(ghostCar, 1.2, 0.5, 1.8, 0, 0.4, 0, 0x6d0f1f); B(ghostCar, 1.2, 0.8, 0.2, 0, 0.8, -0.8, 0x6d0f1f); const sk = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), mat(0xf6f1e7)); sk.position.set(0, 1.4, -0.85); ghostCar.add(sk); } root.add(ghostCar);
  // path (fairground coords): out of the right door, along the front, in at the left door, through the dark and round again
  const ghostPath = t => { const L = [[GT.x + 4.5, GT.z - 4.4], [GT.x + 4.5, GT.z - 6.6], [GT.x - 4.5, GT.z - 6.6], [GT.x - 4.5, GT.z - 4.4], [GT.x - 4.5, GT.z + 2], [GT.x + 4.5, GT.z + 2]]; const n = L.length, s = (t % 1) * n, i = Math.floor(s), u = s - i, a = L[i], b = L[(i + 1) % n]; return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) }; };
  let ghostT = 0;

  // ---------------- game stalls and food ----------------
  const games = [
    { id: 'hookaduck', name: 'Hook-a-duck', icon: '🦆', x: 200, win: 0.6, prize: { name: 'Rubber duck', icon: '🦆' } },
    { id: 'hoopla', name: 'Hoopla', icon: '⭕', x: 214, win: 0.35, prize: { name: 'Goldfish in a bag', icon: '🐟' } },
    { id: 'shooting', name: 'Shooting gallery', icon: '🎯', x: 268, win: 0.3, prize: { name: 'Giant teddy bear', icon: '🧸' } },
    { id: 'coconutshy', name: 'Coconut shy', icon: '🥥', x: 282, win: 0.25, prize: { name: 'Coconut', icon: '🥥' } },
  ];
  for (const gm of games) { const g = new THREE.Group(); g.position.set(gm.x, 0, -652); root.add(g);
    B(g, 5, 3, 0.2, 0, 1.5, 1.4, 0x6d0f1f); for (const s of [-1, 1]) B(g, 0.2, 3, 3, s * 2.5, 1.5, 0, 0x6d0f1f);
    B(g, 5, 1.0, 0.8, 0, 0.5, -1.0, 0xf6f1e7); const aw = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.15, 3.6), new THREE.MeshStandardMaterial({ map: stripes('#c8102e', '#f6f1e7', 10) })); aw.position.set(0, 3.1, -0.2); aw.rotation.x = -0.15; g.add(aw);
    for (let i = 0; i < 6; i++) B(g, 0.4, 0.5, 0.35, -1.9 + i * 0.75, 2.2, 1.15, [0xc9a26a, 0xff8fb1, 0x6bc5ff, 0x9dff6b][i % 4]);   // prizes on the shelf
    const s = sign(gm.name.toUpperCase(), '3 gold a go', 3.6, '#6d0f1f', '#ffd23f'); s.position.set(0, 3.7, -1.6); g.add(s);
    solid(gm.x - 2.6, gm.x + 2.6, -652 - 0.6, -652 + 1.6);
    interactables.push({ pos: new THREE.Vector3(gm.x, 0, -654.6), r: 2.0, label: `Play ${gm.name} (3 gold)`, action: () => {
      if (ctx.games) return ctx.games.open(gm.id);   // the real mini-game
      if (stats.gold < 3) return toast('Not enough gold.'); stats.gold -= 3;
      if (Math.random() < gm.win) { ctx.giveItem?.(gm.prize); toast(`${gm.icon} You win! A ${gm.prize.name.toLowerCase()} goes in your bag.`); }
      else toast(`${gm.icon} ${['So close!', 'Unlucky! Have another go?', 'Nearly had it!', 'Not this time.'][Math.floor(Math.random() * 4)]}`); } });
  }
  // burger van and ice-cream cart
  { const g = new THREE.Group(); g.position.set(296, 0, -652); root.add(g); B(g, 5.5, 2.6, 2.4, 0, 1.6, 0, 0xffffff); B(g, 5.6, 0.4, 2.5, 0, 0.3, 0, 0x333333); B(g, 3, 1, 0.05, 0, 2.0, -1.22, 0x222222); B(g, 3.4, 0.1, 1.2, 0, 2.6, -1.8, red);
    const s = sign('BURGERS & HOT DOGS', '', 4, '#c8102e', '#fff'); s.position.set(0, 3.25, -1.23); g.add(s); solid(293, 299, -653.4, -650.6);
    interactables.push({ pos: new THREE.Vector3(296, 0, -655), r: 2, label: 'Buy fairground food', action: () => ctx.openShop?.('Burger van', [{ name: 'Cheeseburger', icon: '🍔', price: 6, hunger: 35 }, { name: 'Hot dog', icon: '🌭', price: 5, hunger: 25 }, { name: 'Chips', icon: '🍟', price: 3, hunger: 15 }, { name: 'Doughnuts', icon: '🍩', price: 4, hunger: 12, energy: 6 }, { name: 'Fizzy drink', icon: '🥤', price: 2, energy: 10 }]) }); }
  { const g = new THREE.Group(); g.position.set(352, 0, -673); root.add(g); B(g, 2.2, 1.1, 1.2, 0, 0.75, 0, 0xffc0d9); C(g, 0.3, 0.3, 0.1, -0.8, 0.3, 0.6, 0x222222); C(g, 0.3, 0.3, 0.1, 0.8, 0.3, 0.6, 0x222222);
    C(g, 0.03, 0.03, 2.2, 0, 2.2, 0, steel, 6); const um = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 12, 1, true), new THREE.MeshStandardMaterial({ map: stripes('#ff8fb1', '#ffffff', 12), side: THREE.DoubleSide })); um.position.y = 3.2; g.add(um);
    interactables.push({ pos: new THREE.Vector3(352, 0, -671.6), r: 1.8, label: 'Buy an ice cream', action: () => ctx.openShop?.('Ice-cream cart', [{ name: 'Ice-cream cone', icon: '🍦', price: 3, hunger: 8, energy: 5 }, { name: 'Lolly', icon: '🍭', price: 2, energy: 6 }, { name: 'Sundae', icon: '🍨', price: 5, hunger: 14, energy: 8 }]) }); }
  // light strings along the avenue
  for (let z = -756; z <= -740; z += 8) for (const s of [-1, 1]) { C(root, 0.08, 0.08, 4.5, 242 + s * 5, 2.25, z, 0x333333, 6); }
  for (const s of [-1, 1]) for (let k = 0; k < 18; k++) bulbs.push(bulb(root, 242 + s * 5, 4.4, -756 + k * 0.95, k));
  for (let x = 250; x < 362; x += 9) { C(root, 0.08, 0.08, 4.5, x, 2.25, -718, 0x333333, 6); for (let k = 0; k < 10; k++) bulbs.push(bulb(root, x + k * 0.9, 4.4 - Math.sin(k / 9 * Math.PI) * 0.6, -718, k)); }

  // ---------------- visitors ----------------
  const crowd = [];
  if (ctx.makePerson) {
    const loops = [[[242, -755], [242, -740], [300, -713], [360, -713], [372, -735], [372, -755]], [[195, -643], [300, -643], [303, -680], [303, -713], [250, -713]], [[397, -650], [397, -713], [330, -713], [303, -700], [303, -650]], [[250, -713], [350, -713], [350, -680], [320, -675], [303, -700]]];
    loops.forEach((pts, i) => { for (let k = 0; k < 3; k++) { const h = ctx.makePerson({ outfit: [0xc0392b, 0x2980b9, 0x8e44ad, 0x16a085, 0xf39c12, 0x2c3e50][(i * 3 + k) % 6], hair: [0x2b1d14, 0xc9a26a, 0x111111, 0x5a3b22][(i + k) % 4], pants: 0x2d3142 }); crowd.push({ h, pts, t: k * 9 + i * 4 });
      if (k !== 1) { const kid = ctx.makePerson({ child: true, outfit: [0xff6b9d, 0x4dabf7, 0xffd43b, 0x69db7c][(i + k) % 4], hair: [0x2b1d14, 0x111111, 0xc9a26a][(i + k) % 3], skin: [0xffdcc0, 0x8d5a3b, 0xd9a07a][(i + k) % 3], pants: 0x3b5bdb }); crowd.push({ h: kid, pts, t: k * 9 + i * 4 - 1.1 }); } } });
  }

  // ---------------- riding ----------------
  let riding = null, clock = 0;
  const v3 = new THREE.Vector3();
  function board(key, seat, len) {
    const R = RIDES[key];
    if (riding) return toast('You\'re already on a ride.');
    if (stats.gold < R.price) return toast(`The ${R.name.toLowerCase()} costs ${R.price} gold.`);
    stats.gold -= R.price;
    const spot = { x: 0, z: 0, seatY: 0, yaw: 0, ride: key, follow: seat, label: R.name };
    const p = seat(); Object.assign(spot, { x: p.x, z: p.z, seatY: p.y, yaw: p.yaw ?? 0 });
    riding = { key, spot, t: 0, len };
    ctx.seat(spot); toast(`🎡 Enjoy the ${R.name.toLowerCase()}! (Press E to get off.)`);
  }
  const gondolaPos = i => { const a = -wheelAngle + i / 16 * Math.PI * 2; return v3.set(W.x + Math.cos(a) * W.r, W.hub + Math.sin(a) * W.r, W.z); };
  let wheelAngle = 0, boardGondola = 0;
  interactables.push({ pos: new THREE.Vector3(W.x, 0, W.z + 6.6), r: 2.4, label: `Ride the Ferris wheel (${W.price} gold)`, action: () => {
    // the gondola nearest the bottom
    let best = 0, by = 1e9; for (let i = 0; i < 16; i++) { const y = gondolaPos(i).y; if (y < by) { by = y; best = i; } }
    boardGondola = best; board('wheel', () => { const p = gondolaPos(boardGondola); return { x: p.x, y: p.y - 1.75, z: p.z, yaw: Math.PI }; }, W.turn); } });
  interactables.push({ pos: new THREE.Vector3(K.x, 0, K.z + K.r + 1.4), r: 2.2, label: `Ride the carousel (${K.price} gold)`, action: () => board('carousel', () => { const h = horses[1]; h.h.updateWorldMatrix(true, false); const p = h.h.getWorldPosition(v3); return { x: p.x, y: p.y + 0.35, z: p.z, yaw: -spin.rotation.y - h.a + Math.PI }; }, K.len) });
  interactables.push({ pos: new THREE.Vector3(S.x, 0, S.z - 6.5), r: 2.2, label: `Ride the Wave Swinger (${S.price} gold)`, action: () => board('swings', () => { const c = chairs[0]; c.swing.updateWorldMatrix(true, false); const p = c.swing.localToWorld(v3.set(0, -4.1, 0)); return { x: p.x, y: p.y, z: p.z, yaw: -swTop.rotation.y - c.a + Math.PI }; }, S.len) });
  interactables.push({ pos: new THREE.Vector3(D.x, 0, D.z + 4.6), r: 2.2, label: `Ride the Skydrop tower (${D.price} gold)`, action: () => { dropT = 0; board('drop', () => ({ x: D.x, y: ring.position.y + 0.2, z: D.z + 2.6, yaw: 0 }), D.len); } });
  interactables.push({ pos: new THREE.Vector3(BC.x, 0, BC.z - BC.d / 2 - 1.6), r: 2.4, label: `Drive the bumper cars (${BC.price} gold)`, action: () => board('bumpers', () => { const d = dodgems[0].g; const p = d.getWorldPosition(v3); return { x: p.x, y: p.y + 0.6, z: p.z, yaw: Math.atan2(dodgems[0].vx, dodgems[0].vz) }; }, BC.len) });
  let dropT = 0;
  interactables.push({ pos: new THREE.Vector3(HS.x, 0, HS.z - 3.6), r: 2.0, label: `Ride the helter-skelter (${HS.price} gold)`, action: () => { let st = 0; board('slide', () => { st = Math.min(1, (riding?.t ?? 0) / HS.len); const a = st * Math.PI * 2 * 3, y = HS.h - 0.3 - st * (HS.h - 1.0); return { x: HS.x + Math.cos(a) * 3.0, y, z: HS.z + Math.sin(a) * 3.0, yaw: -a + Math.PI }; }, HS.len); } });
  interactables.push({ pos: new THREE.Vector3(GT.x, 0, GT.z - 7.8), r: 2.2, label: `Ride the ghost train (${GT.price} gold)`, action: () => { ghostT = 0; board('ghost', () => { const p = ghostPath(ghostT); return { x: p.x, y: 0.75, z: p.z, yaw: p.yaw }; }, GT.len); } });

  function update(dt, playerPos, night) {
    clock += dt;
    const near = Math.hypot(playerPos.x - 300, playerPos.z + 700) < 320;
    if (!near && !riding) return;
    // Ferris wheel
    wheelAngle += dt * Math.PI * 2 / W.turn; wheel.rotation.z = -wheelAngle;
    for (let i = 0; i < 16; i++) { gondolas[i].position.copy(gondolaPos(i)); gondolas[i].rotation.z = Math.sin(clock * 0.9 + i) * 0.04; }   // gondolas stay upright
    // carousel: turning, horses galloping up and down
    spin.rotation.y += dt * Math.PI * 2 / K.turn;
    for (const h of horses) h.h.position.y = 1.6 + Math.sin(clock * 2.6 + h.ph) * 0.35;
    // wave swinger: speeds up and slows in a cycle, chairs fly out with speed
    const sp = Math.max(0, Math.sin(clock * 0.12)) ** 0.5, swing = sp * 0.9;
    swTop.rotation.y += dt * sp * 1.7; swTop.position.y = 11 + sp * 1.2;
    for (const c of chairs) c.swing.rotation.z = swing;   // chairs swing outwards
    // drop tower: slow climb, pause, drop, brake
    dropT += dt; const cyc = dropT % 26; const yTop = D.h - 3;
    ring.position.y = cyc < 14 ? 1.2 + (yTop - 1.2) * (cyc / 14) : cyc < 17 ? yTop : cyc < 18.6 ? yTop - (yTop - 3) * ((cyc - 17) / 1.6) ** 2 : Math.max(1.2, 3 - (cyc - 18.6) * 0.6);
    // ghost train car going round, with frights inside
    ghostT += dt / GT.len; { const p = ghostPath(ghostT); ghostCar.position.set(p.x, 0.1, p.z); ghostCar.rotation.y = p.yaw; }
    if (riding?.key === 'ghost') { const st = Math.floor(riding.t / 4); if (st !== riding.scare && riding.t > 6) { riding.scare = st; toast(['👻 Something brushes past your face in the dark...', '💀 A skeleton lurches out of the wall!', '🕷️ A giant spider drops from the ceiling!', '🧟 Groaning... the zombies are awake!'][st % 4]); } }
    // dodgems bounce round the floor
    for (const d of dodgems) { const g = d.g; g.position.x += d.vx * dt; g.position.z += d.vz * dt;
      if (Math.abs(g.position.x) > BC.w / 2 - 1.3) { d.vx = -d.vx; g.position.x = Math.sign(g.position.x) * (BC.w / 2 - 1.3); }
      if (Math.abs(g.position.z) > BC.d / 2 - 1.4) { d.vz = -d.vz; g.position.z = Math.sign(g.position.z) * (BC.d / 2 - 1.4); }
      if (Math.random() < dt * 0.3) { const a = Math.random() * Math.PI * 2; d.vx = Math.cos(a) * 3.2; d.vz = Math.sin(a) * 3.2; }
      g.rotation.y += (Math.atan2(d.vx, d.vz) - g.rotation.y) * Math.min(1, dt * 4); }
    // bulbs: chase at night, glow softly by day
    const k = Math.floor(clock * 6);
    bulbMats.forEach((m, i) => { m.emissiveIntensity = night ? ((k + i) % bulbMats.length < 3 ? 2.6 : 0.6) : 0.5; });
    // the crowd
    for (const c of crowd) { c.t += dt * 1.3;   // metres walked round the loop
      const n = c.pts.length, segs = c.pts.map((a, i) => { const b = c.pts[(i + 1) % n]; return Math.hypot(b[0] - a[0], b[1] - a[1]); }), total = segs.reduce((x, y) => x + y, 0);
      let d = c.t % total, i = 0; while (d > segs[i]) { d -= segs[i]; i++; }
      const a = c.pts[i], b = c.pts[(i + 1) % n], u = d / segs[i];
      c.h.root.position.set(a[0] + (b[0] - a[0]) * u, 0.05, a[1] + (b[1] - a[1]) * u); c.h.root.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); ctx.animatePerson?.(c.h, true, dt); }
    // the rider
    if (riding) { riding.t += dt;
      if (!ctx.isSeated(riding.spot)) { riding = null; }
      else if (riding.t > riding.len) { ctx.unseat(riding.spot); toast(`That was fun! Back at the ${RIDES[riding.key].name.toLowerCase()} entrance.`); stats.energy = Math.min(100, stats.energy + 6); ctx.gainXp?.(4); riding = null; } }
  }
  return { update, get riding() { return riding; }, RIDES };
}
