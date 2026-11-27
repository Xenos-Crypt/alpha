// MANSION BASEMENTS: under every mansion (yours, Highcliff Hills, The Reserve) a lift goes down to a basement
// level with everything a mansion has below ground:
//   a private cinema (recliners, a screen that plays programmes), a pub (bar, beer taps, a pool table, darts),
//   a gym, a three-lane bowling alley you can play, an indoor swimming pool you can swim in, and a big
//   underground car park full of cars of different makes: pick one and it's brought round to the front of the
//   house with you at the wheel.
// It's one basement level built far from the world (like the house interiors), shared by every mansion: you come
// back up in the mansion you went down from, and the cars come out at that mansion's front door.
import * as THREE from 'three';
import { CATALOGUE, applyStats } from './vehicle-catalogue.js';

export const BASEMENT = { x: -7600, z: 900, w: 80, d: 60, h: 4.2 };

export function createMansionBasements(ctx) {
  // ctx: { scene, colliders, interactables, sitSpots, poolZones, planeBlocks, makeVehicle, removeVehicle(v), toast,
  //        teleport(x, y, z, yaw), driveAway(v), workout(), gainXp(n), gold:{get,spend}, pause(), resume(), makeTex }
  const { scene, toast } = ctx, O = BASEMENT, H = O.h;
  const root = new THREE.Group(); root.position.set(O.x, 0, O.z); root.name = 'mansion basement'; scene.add(root);
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null }); if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; } mats.set(k, m); } return mats.get(k); };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, m, ry = 0, parent = root) => { const b = new THREE.Mesh(geo, m instanceof THREE.Material ? m : mat(m)); b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.y = ry; b.receiveShadow = true; parent.add(b); return b; };
  const Cy = (rt, rb, h, x, y, z, m, seg = 16) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m instanceof THREE.Material ? m : mat(m)); c.position.set(x, y, z); root.add(c); return c; };
  const col = (x0, x1, z0, z1) => ctx.colliders.push({ minX: O.x + Math.min(x0, x1), maxX: O.x + Math.max(x0, x1), minZ: O.z + Math.min(z0, z1), maxZ: O.z + Math.max(z0, z1) });
  const act = (x, z, r, label, action) => { const it = { pos: new THREE.Vector3(O.x + x, 0, O.z + z), r, action }; if (typeof label === 'function') Object.defineProperty(it, 'label', { get: label, enumerable: true }); else it.label = label; ctx.interactables.push(it); return it; };
  const sit = (x, z, yaw, seatY, label) => ctx.sitSpots.push({ x: O.x + x, z: O.z + z, yaw, seatY, label });
  const sign = (text, w, h, bg, fg, font = 'bold 60px Georgia, serif') => { const t = ctx.makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66, 490); }); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6 })); };
  const place = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m; };

  // ---------------- the shell: floor, ceiling, walls ----------------
  const X0 = -O.w / 2, X1 = O.w / 2, Z0 = -O.d / 2, Z1 = O.d / 2;
  const plaster = mat(0xe9e4da, { rough: 0.85 }), concrete = mat(0x9a9d9f, { rough: 0.95 }), ceilM = mat(0xf0eee8, { emissive: 0x4a4844, ei: 0.5 });
  B(O.w, 0.1, O.d, 0, -0.05, 0, concrete); B(O.w, 0.1, O.d, 0, H + 0.05, 0, ceilM);
  const wall = (alongX, at, a, b, gaps = [], m = plaster) => {
    let p = a;
    for (const [g0, g1] of [...gaps, [b, b]]) {
      if (g0 - p > 0.01) { alongX ? B(g0 - p, H, 0.3, (p + g0) / 2, H / 2, at, m) : B(0.3, H, g0 - p, at, H / 2, (p + g0) / 2, m); alongX ? col(p, g0, at - 0.15, at + 0.15) : col(at - 0.15, at + 0.15, p, g0); }
      if (g1 > g0) alongX ? B(g1 - g0, H - 2.6, 0.3, (g0 + g1) / 2, 2.6 + (H - 2.6) / 2, at, m) : B(0.3, H - 2.6, g1 - g0, at, 2.6 + (H - 2.6) / 2, (g0 + g1) / 2, m);
      p = g1;
    }
  };
  wall(true, Z1, X0, X1); wall(true, Z0, X0, X1); wall(false, X0, Z0, Z1); wall(false, X1, Z0, Z1);
  wall(true, 22, X0, -4, [[-24, -22]]); wall(true, 22, 4, X1, [[22, 24]]); wall(false, -4, 22, Z1); wall(false, 4, 22, Z1);   // the lift lobby opens onto the corridor; the library and music room open off it
  wall(true, 14, X0, X1, [[-32, -30], [-15, -11], [-4, 4], [9, 12], [24, 27]]);                   // doors into the cinema, pub, spine, gym, bowling
  for (const x of [-22, 22]) wall(false, x, 0, 14); wall(false, -4, 0, 14); wall(false, 4, 0, 14);
  wall(true, 0, X0, -4); wall(true, 0, 4, X1);
  wall(false, -4, Z0, 0, [[-13, -9]]); wall(false, 4, Z0, 0, [[-18, -8]]);                        // the pool hall and the car park off the spine
  // real doors in the doorways (the spine and the car park's wide entrance stay open)
  const door = (a, b, along, color, glass) => ctx.doors?.add({ a: along === 'x' ? [O.x + a, O.z + b[0]] : [O.x + b[0], O.z + a], b: along === 'x' ? [O.x + a + b[2], O.z + b[0]] : [O.x + b[0], O.z + a + b[2]], y: 0, h: 2.6, color, glass });
  door(-32, [14, 0, 2], 'x', 0x5a1820); door(-15, [14, 0, 4], 'x', 0x5a3820); door(9, [14, 0, 3], 'x', 0, true); door(24, [14, 0, 3], 'x', 0x2a5aa6);
  door(-24, [22, 0, 2], 'x', 0x4a2f1c); door(22, [22, 0, 2], 'x', 0x2a2e33); door(-13, [-4, 0, 4], 'z', 0, true);
  // corridor: a runner, wall lights, art
  B(78, 0.01, 6, 0, 0.012, 18, mat(0x3b3f45, { rough: 1 })); B(6, 0.01, 44, 0, 0.012, -8, mat(0x3b3f45, { rough: 1 }));
  for (let x = -36; x <= 36; x += 8) if (Math.abs(x) > 5) { B(0.5, 0.15, 0.08, x, 3, 21.8, mat(0xfff1cf, { emissive: 0xffe2a0, ei: 1.4 })); B(0.5, 0.15, 0.08, x, 3, 14.2, mat(0xfff1cf, { emissive: 0xffe2a0, ei: 1.4 })); }
  // ceiling light panels everywhere, and a few real lamps
  const panel = mat(0xffffff, { emissive: 0xfff3dc, ei: 1.1 });
  for (let x = X0 + 5; x < X1; x += 10) for (let z = Z0 + 5; z < Z1; z += 8) B(2.4, 0.05, 0.6, x, H - 0.05, z, panel);
  for (const [x, z] of [[-30, 7], [-13, 7], [13, 7], [31, 7], [-22, -15], [22, -15], [0, 18], [0, -12]]) { const l = new THREE.PointLight(0xffe9d0, 16, 26, 1.5); l.position.set(x, H - 0.6, z); root.add(l); }
  ctx.planeBlocks?.push({ minX: O.x + X0, maxX: O.x + X1, minZ: O.z + Z0, maxZ: O.z + Z1, top: H + 0.5 });   // indoors: first person

  // ---------------- the lift lobby ----------------
  const steel = mat(0xc0c6cc, { metal: 0.85, rough: 0.25 });
  B(8, 0.01, 8, 0, 0.012, 26, mat(0x1f2328, { rough: 0.3 }));
  B(2.2, 2.6, 0.08, 0, 1.3, Z1 - 0.2, steel); B(0.04, 2.5, 0.09, 0, 1.3, Z1 - 0.19, mat(0x555a60)); B(2.6, 0.2, 0.1, 0, 2.7, Z1 - 0.2, mat(0x2a2e33));
  B(0.12, 0.2, 0.05, 1.5, 1.2, Z1 - 0.18, mat(0x2a2e33)); B(0.06, 0.06, 0.03, 1.5, 1.22, Z1 - 0.16, mat(0xffd23f, { emissive: 0xffb000, ei: 1.2 }));
  place(sign('LOWER LEVEL', 4, 1, '#111111', '#d4af37'), 0, 3.4, Z1 - 0.2, Math.PI);
  let from = null;   // the mansion you came down from
  act(0, Z1 - 1.4, 1.8, () => `Take the lift up to ${from?.name || 'the house'}`, () => goUp());
  // signs at the corridor's doors
  for (const [t, x, z] of [['CINEMA', -31, 14.2], ['THE CELLAR BAR', -13, 14.2], ['GYM', 10.5, 14.2], ['BOWLING', 25.5, 14.2], ['POOL', -4.2, -11], ['CAR PARK', 4.2, -13]]) { const s = sign(t, 2.6, 0.65, '#1b1f24', '#f2e6c8', 'bold 56px sans-serif'); if (Math.abs(z) > 13) place(s, x, 3.15, z + 0.02, 0); else place(s, x + (x < 0 ? -0.02 : 0.02), 3.15, z, x < 0 ? Math.PI / 2 : -Math.PI / 2); }

  // ---------------- grand paintings along the corridor ----------------
  const painting = (seed, w, h) => ctx.makeTex(256, Math.round(256 * h / w), g => {
    const W = 256, Hh = Math.round(256 * h / w), r = k => { const v = Math.sin(seed * 91.7 + k * 12.9) * 43758.5; return v - Math.floor(v); };
    const kind = seed % 4;
    if (kind === 0) {   // a landscape: sky, a sun, hills, a lake
      const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, `hsl(${200 + r(1) * 40},60%,${55 + r(2) * 15}%)`); sky.addColorStop(1, `hsl(${20 + r(3) * 30},70%,75%)`); g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#fff3c8'; g.beginPath(); g.arc(W * (0.2 + r(4) * 0.6), Hh * 0.3, 14, 0, 7); g.fill();
      for (let k = 0; k < 3; k++) { g.fillStyle = `hsl(${100 + k * 15},${35 + k * 10}%,${30 + k * 8}%)`; g.beginPath(); g.moveTo(0, Hh); for (let x = 0; x <= W; x += 8) g.lineTo(x, Hh * (0.5 + k * 0.12) - Math.sin(x * 0.02 + r(k + 5) * 6) * 18); g.lineTo(W, Hh); g.fill(); }
      g.fillStyle = 'rgba(120,170,220,.8)'; g.fillRect(W * 0.1, Hh * 0.82, W * 0.8, Hh * 0.08);
    } else if (kind === 1) {   // a seascape at sunset
      const sky = g.createLinearGradient(0, 0, 0, Hh * 0.6); sky.addColorStop(0, '#2b3a67'); sky.addColorStop(1, '#f2a65a'); g.fillStyle = sky; g.fillRect(0, 0, W, Hh * 0.6);
      g.fillStyle = '#1f4e6e'; g.fillRect(0, Hh * 0.6, W, Hh * 0.4); for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(255,220,160,.5)'; g.fillRect(W * 0.45 + (r(k) - 0.5) * 60, Hh * 0.62 + k * 3, 20 + r(k + 1) * 30, 2); }
      g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(W / 2, Hh * 0.6, 22, Math.PI, 0); g.fill();
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.moveTo(W * 0.15, Hh * 0.7); g.lineTo(W * 0.3, Hh * 0.7); g.lineTo(W * 0.26, Hh * 0.75); g.lineTo(W * 0.18, Hh * 0.75); g.fill(); g.fillRect(W * 0.22, Hh * 0.55, 2, Hh * 0.15);
    } else if (kind === 2) {   // a portrait: a figure in dark clothes against a deep background
      g.fillStyle = `hsl(${r(1) * 360},30%,18%)`; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#d9b08c'; g.beginPath(); g.ellipse(W / 2, Hh * 0.36, 26, 32, 0, 0, 7); g.fill();
      g.fillStyle = `hsl(${r(2) * 360},40%,20%)`; g.beginPath(); g.ellipse(W / 2, Hh * 0.26, 30, 20, 0, Math.PI, 0); g.fill();
      g.fillStyle = `hsl(${r(3) * 360},45%,25%)`; g.beginPath(); g.moveTo(W * 0.2, Hh); g.quadraticCurveTo(W / 2, Hh * 0.5, W * 0.8, Hh); g.fill();
      g.fillStyle = '#f2efe9'; g.fillRect(W / 2 - 8, Hh * 0.62, 16, 10);
    } else {   // an abstract: big overlapping colour fields
      g.fillStyle = '#efe8da'; g.fillRect(0, 0, W, Hh); for (let k = 0; k < 7; k++) { g.fillStyle = `hsla(${r(k) * 360},65%,${40 + r(k + 9) * 30}%,.8)`; g.fillRect(r(k + 2) * W * 0.7, r(k + 3) * Hh * 0.7, 30 + r(k + 4) * 90, 20 + r(k + 5) * 70); }
      g.strokeStyle = '#1b1b1b'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, Hh * r(20)); g.bezierCurveTo(W * 0.3, 0, W * 0.6, Hh, W, Hh * r(21)); g.stroke();
    }
  });
  const gold = mat(0xc9a24a, { metal: 0.7, rough: 0.35 });
  const hang = (seed, x, z, ry, w = 4, h = 2.2, y = 1.9) => { const t = painting(seed, w, h); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); place(m, x, y, z, ry); const f = B(w + 0.3, h + 0.3, 0.06, x - Math.sin(ry) * 0.04, y, z - Math.cos(ry) * 0.04, gold); f.rotation.y = ry; return m; };
  [-34, -14, 14, 34].forEach((x, i) => hang(i + 1, x, 21.82, Math.PI)); [-37, -24, -7, 17, 34].forEach((x, i) => hang(i + 11, x, 14.18, 0));
  act(0, 18, 3, 'Look at the paintings', () => toast('🖼️ Landscapes, seascapes, an old family portrait and two big abstracts. Your own little gallery.'));

  // ---------------- the library (x -40..-4, z 22..30) ----------------
  B(35.6, 0.01, 7.6, -22, 0.013, 26, mat(0x6b4a2f, { rough: 0.6 }));
  const shelfWood = mat(0x4a2f1c, { rough: 0.6 }), BOOK = [0x8f2f2f, 0x2f5f8f, 0x3f6f3f, 0xb8902f, 0x5a3f6f, 0x2a2a2a, 0x7a4a2a, 0xd8d0c0];
  const bookcase = (x0, x1, z, face) => { const w = x1 - x0, x = (x0 + x1) / 2; B(w, H - 0.2, 0.45, x, (H - 0.2) / 2, z, shelfWood); col(x0, x1, z - 0.25, z + 0.25);
    for (let row = 0; row < 7; row++) { const y = 0.3 + row * 0.55; B(w - 0.1, 0.04, 0.42, x, y, z + face * 0.02, shelfWood); for (let bx = x0 + 0.1; bx < x1 - 0.12;) { const bw = 0.05 + ((bx * 31 + row * 7) % 5) * 0.015, bh = 0.32 + ((bx * 17 + row) % 4) * 0.04; B(bw, bh, 0.3, bx + bw / 2, y + 0.02 + bh / 2, z + face * 0.04, BOOK[Math.floor(Math.abs(bx * 13 + row * 3)) % BOOK.length]); bx += bw + 0.01; } } };
  bookcase(-39.7, -26, 29.6, -1); bookcase(-20, -4.3, 29.6, -1);                       // the north wall, floor to ceiling, round a fireplace
  B(4, 2.2, 0.6, -23, 1.1, 29.55, mat(0x8a8478, { rough: 0.8 })); B(2.4, 1.2, 0.2, -23, 0.8, 29.3, mat(0x1a1a1a)); const fire = B(2, 0.6, 0.1, -23, 0.55, 29.25, mat(0xff8a2a, { emissive: 0xff6a00, ei: 1.6 }));
  { const l = new THREE.PointLight(0xff9a4a, 4, 8, 1.6); l.position.set(-23, 1, 28.5); root.add(l); }
  hang(31, -23, 29.2, Math.PI, 3, 1.7, 3.2);                                            // a painting over the fireplace
  for (const x of [-30, -16]) { const g = new THREE.Group(); g.position.set(x, 0, 25.5); g.rotation.y = x < -23 ? 0.5 : -0.5; root.add(g); B(1, 0.45, 0.9, 0, 0.3, 0, mat(0x7a2a1c, { rough: 0.5 }), 0, g); B(1, 0.75, 0.22, 0, 0.75, -0.4, mat(0x7a2a1c, { rough: 0.5 }), 0, g); sit(x, 25.5, g.rotation.y, 0.5, 'Sit in the reading chair'); }
  B(2.4, 0.06, 1.2, -9, 0.78, 25, shelfWood); B(0.08, 0.76, 1.1, -10.1, 0.38, 25, shelfWood); B(0.08, 0.76, 1.1, -7.9, 0.38, 25, shelfWood); col(-10.2, -7.8, 24.4, 25.6); B(0.5, 0.45, 0.5, -9, 0.23, 24, mat(0x7a2a1c)); sit(-9, 24, 0, 0.5, 'Sit at the desk');
  Cy(0.35, 0.35, 0.02, -36, 1.3, 25, mat(0x2f5f8f), 20); { const globe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(0x3f7fbf)); globe.position.set(-36, 1.3, 25); root.add(globe); Cy(0.04, 0.2, 0.9, -36, 0.45, 25, shelfWood, 8); }
  B(0.06, 3.6, 0.5, -28, 1.8, 29.1, shelfWood).rotation.x = -0.2;   // a library ladder
  B(10, 0.01, 4, -23, 0.02, 26, mat(0x7b2f2f, { rough: 1 }));
  { const titles = ['an old atlas of the world before the Gates', 'a history of the Old Kingdom', 'a battered detective novel', 'a book of poems someone has underlined', 'a guide to every dungeon rank', 'a biography of a famous hunter', 'a cookbook from the Capital']; let k = 0;
    act(-33, 28.6, 2, 'Read a book', () => { toast(`📚 You take down ${titles[k++ % titles.length]} and read a few chapters by the fire.`); ctx.gainXp?.(1); }); act(-12, 28.6, 2, 'Read a book', () => { toast(`📚 You take down ${titles[k++ % titles.length]} and lose an hour in it.`); ctx.gainXp?.(1); }); }
  place(sign('LIBRARY', 2.2, 0.55, '#1b1f24', '#f2e6c8', 'bold 56px sans-serif'), -23, 3.15, 21.82, Math.PI);

  // ---------------- the music room (x 4..40, z 22..30) ----------------
  B(35.6, 0.01, 7.6, 22, 0.013, 26, mat(0x2a2422, { rough: 0.5 }));
  for (let x = 6; x < 40; x += 2.2) B(1.8, 2.4, 0.08, x, 2, 29.7, mat(x % 4.4 < 2.2 ? 0x3a2f4a : 0x2f3a4a, { rough: 1 }));   // soundproofing panels
  { const x = 10, z = 26; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.3; root.add(g);   // a concert grand piano
    B(1.6, 0.35, 2.4, 0, 0.9, 0, mat(0x0a0a0a, { rough: 0.15, metal: 0.3 }), 0, g); B(1.5, 0.06, 0.25, 0, 1.08, 1.12, mat(0xf2f2f2), 0, g); const lid = B(1.6, 0.03, 2.2, 0, 1.6, -0.1, mat(0x0a0a0a, { rough: 0.15 }), 0, g); lid.rotation.x = 0.45;
    for (const [a, b] of [[-0.65, -1], [0.65, -1], [0, 1]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), mat(0x0a0a0a)); leg.position.set(a, 0.38, b); g.add(leg); }
    B(0.9, 0.5, 0.4, 0, 0.25, 1.8, mat(0x0a0a0a), 0, g); col(x - 1.1, x + 1.1, z - 1.4, z + 1.4); sit(x + 0.53, z + 1.73, Math.PI + 0.3, 0.5, 'Sit at the piano');
    act(x + 0.6, z + 2.2, 1.6, 'Play the piano', () => { toast(['🎹 A slow piece in a minor key. The room goes quiet to listen.', '🎹 You play something bright and quick, and get every note right.', '🎹 Chopsticks. Then something better.'][Math.floor(Math.random() * 3)]); ctx.gainXp?.(1); }); }
  { const x = 22, z = 27.5; Cy(0.35, 0.35, 0.55, x, 0.3, z, mat(0xc0392b, { metal: 0.3 }), 18); for (const [a, b, r, y] of [[-0.6, -0.3, 0.22, 0.75], [0.6, -0.3, 0.22, 0.75], [-0.3, 0.4, 0.2, 0.6], [0.9, 0.5, 0.28, 0.5]]) Cy(r, r, 0.25, x + a, y, z + b, mat(0xc0392b, { metal: 0.3 }), 16);
    for (const [a, b] of [[-1, 0.3], [1.2, -0.2]]) { Cy(0.38, 0.38, 0.02, x + a, 1.2, z + b, mat(0xd4af37, { metal: 0.8, rough: 0.3 }), 18); Cy(0.015, 0.015, 1.2, x + a, 0.6, z + b, mat(0x888888), 6); }
    col(x - 1.4, x + 1.5, z - 0.9, z + 1.1); act(x, z - 1.6, 1.6, 'Play the drums', () => { toast('🥁 You lay down a beat that shakes the soundproofing.'); ctx.gainXp?.(1); }); }
  for (const [k, c] of [[0, 0xb5651d], [1, 0x1a1a1a], [2, 0xc0392b], [3, 0x2f5f8f]]) { const x = 28 + k * 1.3, z = 29.3; B(0.4, 0.9, 0.1, x, 1.35, z, mat(c, { rough: 0.3 })); B(0.08, 0.75, 0.05, x, 2.15, z, mat(0x3a2414)); B(0.5, 0.06, 0.3, x, 0.4, z, mat(0x2a2e33)); }   // guitars on a wall rack
  act(29.9, 28, 2, 'Play a guitar', () => { toast('🎸 You tune up and play the only riff you really know. It sounds great.'); ctx.gainXp?.(1); });
  { const g = new THREE.Group(); g.position.set(36, 0, 27); root.add(g); const arch = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 20, Math.PI * 0.9), mat(0xc9a24a, { metal: 0.6 })); arch.position.y = 1.0; arch.rotation.z = 0.7; g.add(arch); B(0.12, 1.8, 0.12, -0.4, 0.9, 0, mat(0xc9a24a, { metal: 0.6 }), 0, g); for (let k = 0; k < 9; k++) B(0.01, 1.2 - k * 0.08, 0.01, -0.3 + k * 0.08, 0.8, 0, mat(0xeeeeee), 0, g); col(35.2, 36.8, 26.4, 27.6);   // a harp
    act(36, 25.8, 1.4, 'Play the harp', () => { toast('🎼 A run of notes like water. You didn\'t know you could do that.'); ctx.gainXp?.(1); }); }
  { B(0.6, 1.1, 0.4, 16, 0.55, 29.3, mat(0x1a1a1a)); B(0.5, 0.5, 0.05, 16, 0.6, 29.08, mat(0x555555)); Cy(0.02, 0.02, 1.6, 17.5, 0.8, 27, mat(0x888888), 6); const mic = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x222222)); mic.position.set(17.5, 1.62, 27); root.add(mic);
    act(17.5, 26.2, 1.4, 'Sing into the mic', () => toast('🎤 One, two, one, two… Then a whole song, badly, at full volume.')); }   // an amp and a mic
  B(3, 0.45, 1, 33, 0.25, 23.2, mat(0x5a4a6a)); B(3, 0.6, 0.22, 33, 0.7, 22.8, mat(0x5a4a6a)); for (const dx of [-1, 0, 1]) sit(33 + dx, 23.3, Math.PI, 0.47, 'Sit on the sofa');
  place(sign('MUSIC ROOM', 2.4, 0.55, '#1b1f24', '#f2e6c8', 'bold 56px sans-serif'), 23, 3.15, 21.82, Math.PI);
  { const l = new THREE.PointLight(0xffd9b0, 10, 20, 1.5); l.position.set(-22, 3.4, 26); root.add(l); const l2 = new THREE.PointLight(0xd0c0ff, 10, 20, 1.5); l2.position.set(22, 3.4, 26); root.add(l2); }

  // ---------------- cinema (x -40..-22, z 0..14) ----------------
  const cineDark = mat(0x23181c, { rough: 0.9 });
  B(17.6, 0.01, 13.6, -31, 0.013, 7, mat(0x5a1820, { rough: 1 }));
  for (const [w, d, x, z] of [[17.4, 0.05, -31, 0.2], [17.4, 0.05, -31, 13.8], [0.05, 13.4, -39.8, 7], [0.05, 13.4, -22.2, 7]]) B(w, H - 0.2, d, x, H / 2, z, cineDark);   // dark panelling
  const idle = ctx.makeTex(512, 256, g => { const grd = g.createLinearGradient(0, 0, 512, 256); grd.addColorStop(0, '#14213d'); grd.addColorStop(1, '#3a0f2a'); g.fillStyle = grd; g.fillRect(0, 0, 512, 256); g.fillStyle = '#f2e6c8'; g.textAlign = 'center'; g.font = 'bold 40px Georgia, serif'; g.fillText('PRIVATE CINEMA', 256, 115); g.font = '22px sans-serif'; g.fillStyle = '#c9b88a'; g.fillText('Press E to pick something to watch', 256, 160); });
  const screenMat = new THREE.MeshBasicMaterial({ map: idle }); const screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.2), screenMat); screen.position.set(-39.7, 2.2, 7); screen.rotation.y = Math.PI / 2; root.add(screen);
  B(0.15, 4.5, 10.4, -39.75, 2.2, 7, mat(0x111111));
  const leather = mat(0x2c1a14, { rough: 0.5 });
  for (const [r, x] of [[0, -33], [1, -29], [2, -25.5]]) {
    if (r) B(2.6, 0.2 * r, 12, x, 0.1 * r, 7, mat(0x4a1018, { rough: 1 }));   // stepped rows
    for (const z of [3, 5.4, 7.8, 10.2]) { B(1, 0.45, 0.9, x, 0.2 * r + 0.3, z, leather); B(0.25, 0.75, 0.9, x + 0.5, 0.2 * r + 0.75, z, leather); for (const s of [-1, 1]) B(1, 0.25, 0.12, x, 0.2 * r + 0.6, z + s * 0.5, leather); sit(x, z, -Math.PI / 2, 0.2 * r + 0.5, 'Sit in a recliner'); }
    col(x - 0.5, x + 0.65, 2.4, 10.8);
  }
  B(4, 1.05, 0.7, -25, 0.53, 12.9, mat(0x8a1c24)); B(4.1, 0.06, 0.8, -25, 1.08, 12.9, mat(0xf2efe9)); for (let i = 0; i < 5; i++) Cy(0.12, 0.1, 0.3, -26.6 + i * 0.8, 1.26, 12.9, mat([0xffd23f, 0xd63031, 0xf2efe9][i % 3]), 10); col(-27, -23, 12.5, 13.3);
  act(-25, 11.8, 1.4, 'Get popcorn and a drink', () => toast('🍿 A bucket of popcorn and an ice-cold drink. Now pick something to watch.'));
  for (const z of [0.5, 13.5]) for (let x = -37; x <= -25; x += 4) B(0.5, 0.6, 0.1, x, 2.6, z + (z < 7 ? 0.1 : -0.1), mat(0xffd9a0, { emissive: 0xffb060, ei: 1.2 }));   // warm wall sconces
  { const l = new THREE.PointLight(0xffc890, 9, 18, 1.6); l.position.set(-28, 3.4, 7); root.add(l); }
  for (let z = 1.5; z < 13; z += 2.5) for (const x of [-39.6, -22.4]) B(0.05, 0.08, 0.3, x, 0.15, z, mat(0x3fa9ff, { emissive: 0x3f7fff, ei: 1.2 }));   // aisle lights
  const cinemaTv = { screen, at: new THREE.Vector3(O.x - 30, 0, O.z + 7), canSee: p => p.x < O.x - 22 && p.x > O.x - 40 && p.z > O.z && p.z < O.z + 14 };

  // ---------------- the pub (x -22..-4, z 0..14) ----------------
  B(17.6, 0.01, 13.6, -13, 0.013, 7, mat(0x6b4a2f, { rough: 0.6 }));
  for (const [w, d, x, z] of [[17.4, 0.05, -13, 0.2], [0.05, 13.4, -21.8, 7]]) B(w, 1.1, d, x, 0.55, z, mat(0x4a2f1c, { rough: 0.6 }));   // wood panelling up to the dado
  const barWood = mat(0x5a3820, { rough: 0.45 });
  B(11, 1.1, 0.8, -14.5, 0.55, 1.6, barWood); B(11.2, 0.08, 1.0, -14.5, 1.14, 1.6, mat(0x2a1a10, { rough: 0.3 })); col(-20, -9, 1.2, 2.0);
  B(11, 2.2, 0.35, -14.5, 2.0, 0.35, mat(0x3a2414)); for (const y of [1.4, 2.0, 2.6]) B(10.8, 0.04, 0.3, -14.5, y, 0.45, mat(0x6a4a2a));
  for (let i = 0; i < 27; i++) Cy(0.05, 0.06, 0.32, -19.6 + (i % 9) * 1.2 + (i / 9 | 0) * 0.2, 1.58 + (i / 9 | 0) * 0.6, 0.45, mat([0x2f6b2f, 0x6b2f1f, 0xc9a24a, 0x2f2f6b, 0xd8d8d8][i % 5], { opacity: 0.85, rough: 0.15 }), 8);
  for (const x of [-17, -15.5, -14, -12.5]) { Cy(0.03, 0.03, 0.45, x, 1.4, 1.3, mat(0xc9a24a, { metal: 0.8, rough: 0.3 }), 8); B(0.08, 0.16, 0.05, x, 1.68, 1.3, mat([0xd4af37, 0x1a1a1a, 0xc0392b, 0x2f6b2f][Math.abs(Math.round(x)) % 4])); }   // beer taps
  for (let x = -19; x <= -10; x += 1.5) { Cy(0.22, 0.22, 0.07, x, 0.8, 2.6, mat(0x7a1c1c, { rough: 0.6 }), 12); Cy(0.03, 0.03, 0.78, x, 0.39, 2.6, mat(0x2a2e33), 6); sit(x, 2.6, Math.PI, 0.82, 'Sit at the bar'); }
  act(-14.5, 3.3, 2.2, 'Pour a pint', () => { toast('🍺 You pull yourself a pint of the good stuff and lean on the bar. Cheers.'); ctx.drink?.(); });
  place(sign('THE CELLAR BAR', 4.5, 1.1, '#1a0f08', '#ffcf6a'), -14.5, 3.4, 0.55, 0);
  for (const [x, z] of [[-19, 9], [-14.5, 10.5]]) { Cy(0.55, 0.55, 0.05, x, 0.75, z, barWood, 18); Cy(0.06, 0.06, 0.73, x, 0.37, z, mat(0x2a2e33), 8); col(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const sx = x + Math.sin(a) * 0.95, sz = z + Math.cos(a) * 0.95; B(0.45, 0.45, 0.45, sx, 0.23, sz, barWood); sit(sx, sz, a + Math.PI, 0.47, 'Sit at a table'); } }
  { const px = -8.5, pz = 9; B(2.7, 0.75, 1.5, px, 0.4, pz, mat(0x3a2414)); B(2.5, 0.05, 1.3, px, 0.8, pz, mat(0x1d6b3a, { rough: 0.9 })); for (const [a, b] of [[-1.3, -0.7], [1.3, -0.7], [-1.3, 0.7], [1.3, 0.7]]) B(0.12, 0.12, 0.12, px + a, 0.86, pz + b, mat(0xc9a24a, { metal: 0.6 }));
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat([0xffd23f, 0xd63031, 0x2f2f9b, 0x111111, 0xf2f2f2][i % 5])); b.position.set(px + 0.5 + (i % 3) * 0.08, 0.86, pz - 0.1 + (i / 3 | 0) * 0.08); root.add(b); }
    col(px - 1.35, px + 1.35, pz - 0.75, pz + 0.75);
    act(px, pz - 1.4, 1.4, 'Play pool', () => { const won = Math.random() < 0.5; toast(won ? '🎱 You clear the table and sink the black. Winner!' : '🎱 You pot the black too early. Unlucky: rack them up again.'); if (won) ctx.gainXp?.(1); }); }
  { const dz = 5; Cy(0.25, 0.25, 0.04, -4.2, 1.73, dz, mat(0x1a1a1a), 20).rotation.z = Math.PI / 2; Cy(0.2, 0.2, 0.045, -4.19, 1.73, dz, mat(0xe8d8a8), 20).rotation.z = Math.PI / 2;
    act(-6.4, dz, 1.3, 'Play darts', () => { const s = [0, 0, 0].map(() => [1, 3, 5, 20, 19, 25, 50, 60, 18, 7][Math.floor(Math.random() * 10)]); const t = s.reduce((a, b) => a + b, 0); toast(`🎯 Three darts: ${s.join(', ')}. ${t} points${t >= 100 ? '. Ton up!' : '.'}`); }); }
  { const l = new THREE.PointLight(0xffb060, 10, 14, 1.6); l.position.set(-13, 3, 7); root.add(l); }

  // ---------------- the gym (x 4..22, z 0..14) ----------------
  B(17.6, 0.01, 13.6, 13, 0.013, 7, mat(0x2b2d30, { rough: 1 }));
  B(17, 2.2, 0.03, 13, 1.5, 0.2, mat(0xdde9ef, { metal: 0.3, rough: 0.08, emissive: 0x2a3438, ei: 0.3 }));   // mirror wall
  const black = mat(0x1a1c1f, { rough: 0.5 }), chrome = mat(0xc0c6cc, { metal: 0.85, rough: 0.25 });
  for (const x of [15, 17.5, 20]) { B(0.9, 0.2, 2, x, 0.12, 11.5, black); B(0.85, 0.03, 1.6, x, 0.24, 11.4, mat(0x111111)); for (const s of [-1, 1]) B(0.05, 1.2, 0.05, x + s * 0.42, 0.8, 10.6, chrome); B(0.9, 0.3, 0.12, x, 1.4, 10.6, black); col(x - 0.5, x + 0.5, 10.4, 12.6); }
  B(0.45, 0.45, 1.4, 8, 0.23, 6, black); B(1.8, 0.05, 0.05, 8, 1.15, 5.4, chrome); for (const s of [-1, 1]) { Cy(0.25, 0.25, 0.08, 8 + s * 0.9, 1.15, 5.4, black, 16).rotation.z = Math.PI / 2; B(0.06, 1.15, 0.06, 8 + s * 0.6, 0.58, 5.3, chrome); } col(7.7, 8.3, 5.2, 6.8);
  B(0.5, 1, 4, 21.4, 0.5, 6, black); for (let i = 0; i < 8; i++) for (const y of [0.6, 1.0]) { const d = Cy(0.08, 0.08, 0.3, 21.3, y + 0.05, 4.3 + i * 0.5, chrome, 10); d.rotation.x = Math.PI / 2; } col(21.1, 21.7, 4, 8);
  Cy(0.25, 0.25, 1.2, 6, 1.5, 11, mat(0x8a1c1c, { rough: 0.6 }), 14); Cy(0.01, 0.01, 1.8, 6, 3.3, 11, chrome, 4); col(5.7, 6.3, 10.7, 11.3);
  act(12, 7, 3.2, 'Work out', () => { toast('🏋️ Treadmill, bench press and the bag. You come out dripping and strong.'); ctx.workout?.(); });

  // ---------------- the bowling alley (x 22..40, z 0..14): three lanes, pins at the far (east) end ----------------
  B(2.8, 0.01, 13.6, 23.6, 0.013, 7, mat(0x2a2f5a, { rough: 1 }));
  const laneWood = mat(0xd8b07a, { rough: 0.25 }), gutter = mat(0x3a3f45, { metal: 0.4, rough: 0.4 }), pinM = mat(0xfafafa, { rough: 0.3 }), stripe = mat(0xc0392b);
  const LANES = [3.2, 7, 10.8], pins = [];
  const pinSpots = []; for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) pinSpots.push([row * 0.27, (k - row / 2) * 0.3]);
  LANES.forEach((z, li) => {
    B(14.6, 0.06, 1.1, 32.3, 0.03, z, laneWood); for (const s of [-1, 1]) B(14.6, 0.04, 0.24, 32.3, 0.02, z + s * 0.67, gutter);
    for (let k = 0; k < 7; k++) B(0.08, 0.005, 0.05, 28 + 0.0, 0.065, z - 0.45 + k * 0.15, stripe);   // aiming arrows
    const set = []; for (const [dx, dz] of pinSpots) { const g = new THREE.Group(); g.position.set(38 + dx, 0.06, z + dz); root.add(g); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.38, 10), pinM); p.position.y = 0.19; g.add(p); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), stripe); band.position.y = 0.3; g.add(band); set.push(g); }
    pins.push(set);
    B(0.3, 1.2, 1.6, 39.6, 0.6, z, mat(0x111111));   // the pinsetter's mouth
    B(0.6, 0.4, 0.35, 24.6, 0.4, z + 0.9, mat(0x2a2e33)); for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), mat([0x1f5fd6, 0xc0392b, 0x8e44ad][k])); b.position.set(24.4 + k * 0.2, 0.67, z + 0.9); root.add(b); }   // ball return
    const sc = sign(`LANE ${li + 1}`, 1.8, 0.45, '#0b1a3a', '#9fe0ff', 'bold 60px sans-serif'); place(sc, 26.5, 3.4, z, -Math.PI / 2);
    act(24.6, z, 1.1, `Bowl on lane ${li + 1}`, () => bowl(li));
  });
  col(25.2, 40, 1.4, 12.6);   // you stay behind the foul line (the lanes themselves)
  for (const z of [1.2, 12.8]) for (const x of [22.8, 23.8]) { B(0.8, 0.45, 0.8, x, 0.23, z, mat(0x2a5aa6, { rough: 0.6 })); sit(x, z, z < 7 ? 0 : Math.PI, 0.47, 'Sit by the lanes'); }
  { const l = new THREE.PointLight(0xcfe0ff, 12, 18, 1.5); l.position.set(33, 3.4, 7); root.add(l); }

  // ---------------- the pool hall (x -40..-4, z -30..0): a 22 x 10 m pool you can swim in ----------------
  const PX0 = -33, PX1 = -11, PZ0 = -20, PZ1 = -10, WATER = -0.12, DEEP = -1.7;
  const tileM = mat(0xe8eef0, { rough: 0.35 });
  B(PX0 - X0 - 0.3, 0.02, 30, (X0 + PX0) / 2, 0.012, -15, tileM); B(-4 - PX1 - 0.3, 0.02, 30, (PX1 - 4) / 2, 0.012, -15, tileM); B(PX1 - PX0, 0.02, 10, (PX0 + PX1) / 2, 0.012, -25, tileM); B(PX1 - PX0, 0.02, 10, (PX0 + PX1) / 2, 0.012, -5, tileM);
  B(PX1 - PX0, 0.02, PZ1 - PZ0, (PX0 + PX1) / 2, DEEP, (PZ0 + PZ1) / 2, mat(0x2f8fb8, { rough: 0.3 }));   // the pool floor
  for (const [w, d, x, z] of [[PX1 - PX0, 0.1, (PX0 + PX1) / 2, PZ0], [PX1 - PX0, 0.1, (PX0 + PX1) / 2, PZ1], [0.1, PZ1 - PZ0, PX0, (PZ0 + PZ1) / 2], [0.1, PZ1 - PZ0, PX1, (PZ0 + PZ1) / 2]]) B(w, -DEEP, d, x, DEEP / 2, z, mat(0x3fa9d6, { rough: 0.3 }));
  B(PX1 - PX0, 0.04, PZ1 - PZ0, (PX0 + PX1) / 2, WATER, (PZ0 + PZ1) / 2, mat(0x5fd3f3, { opacity: 0.65, rough: 0.05, metal: 0.1, emissive: 0x0b5f80, ei: 0.35 }));
  for (const z of [PZ0 - 0.15, PZ1 + 0.15]) B(PX1 - PX0 + 0.6, 0.05, 0.3, (PX0 + PX1) / 2, 0.03, z, mat(0xd6cdbb)); for (const x of [PX0 - 0.15, PX1 + 0.15]) B(0.3, 0.05, PZ1 - PZ0 + 0.6, x, 0.03, (PZ0 + PZ1) / 2, mat(0xd6cdbb));
  for (let k = 0; k < 5; k++) B(PX1 - PX0, 0.01, 0.08, (PX0 + PX1) / 2, DEEP + 0.02, PZ0 + 1 + k * 2, mat(0x1d5f80));   // lane lines on the floor
  for (let x = -36; x <= -8; x += 4) { const g = new THREE.Group(); g.position.set(x, 0, -6); root.add(g); B(0.75, 0.1, 2, 0, 0.35, 0, 0xffffff, 0, g); B(0.75, 0.5, 0.1, 0, 0.6, 0.95, 0xffffff, 0, g); sit(x, -6, Math.PI, 0.4, 'Lie on a lounger'); }
  ctx.poolZones?.push({ minX: O.x + PX0, maxX: O.x + PX1, minZ: O.z + PZ0, maxZ: O.z + PZ1, waterY: WATER });
  place(sign('SWIM AT YOUR OWN RISK · NO DIVING IN THE SHALLOW END', 7, 0.5, '#0b3a4a', '#e8fbff', 'bold 30px sans-serif'), (PX0 + PX1) / 2, 3.2, Z0 + 0.2, 0);
  { const l = new THREE.PointLight(0xcff4ff, 14, 26, 1.5); l.position.set(-22, 3.4, -15); root.add(l); }

  // ---------------- the car park (x 4..40, z -30..0): sixteen cars of different makes ----------------
  B(35.6, 0.01, 29.6, 22, 0.013, -15, mat(0x6a6e72, { rough: 1 }));
  const lineM = mat(0xf2f2f2, { rough: 0.6 });
  for (const zr of [-4.5, -25.5]) for (let x = 6; x <= 38; x += 4) B(0.1, 0.005, 5, x, 0.022, zr, lineM);
  for (const x of [10, 22, 34]) for (const z of [-11, -19]) { B(0.6, H, 0.6, x, H / 2, z, concrete); col(x - 0.3, x + 0.3, z - 0.3, z + 0.3); }
  for (let x = 8; x < 40; x += 6) B(2, 0.005, 0.3, x, 0.022, -15, mat(0xffd23f));   // the aisle's centre dashes
  place(sign('P  ·  RESIDENTS ONLY', 3.6, 0.8, '#1f4fa6', '#ffffff', 'bold 54px sans-serif'), 4.2, 3.3, -6, -Math.PI / 2);
  place(sign('PICK A CAR · PRESS E BY IT · IT COMES UP TO THE HOUSE', 6.5, 0.6, '#1f4fa6', '#ffffff', 'bold 30px sans-serif'), 4.2, 2.5, -13, -Math.PI / 2);
  const cars = CATALOGUE.filter(e => e.kind === 'car');
  const COLS = [0xd4af37, 0x111111, 0xc0392b, 0xf2f2f2, 0x2f6f8f, 0x22262b, 0x8a5cff, 0xff7a1f, 0x2d5d3a, 0xd0d0d8, 0x7a1c1c, 0x1f5fd6, 0xffd23f, 0x3a3f45, 0xb0c4de, 0x9b2335];
  const bays = []; for (const [zr, face] of [[-4.5, 0], [-25.5, Math.PI]]) for (let x = 8; x <= 36; x += 4) bays.push([x, zr, face]);
  bays.forEach(([x, z, face], i) => {
    const e = cars[i % cars.length], colour = COLS[i % COLS.length];
    const v = ctx.makeVehicle('car', colour, e.style); ctx.removeVehicle?.(v);   // a parked display car: you take a fresh one out
    v.group.position.set(O.x + x, 0.06, O.z + z); v.group.rotation.y = face; v.group.updateMatrixWorld(true);
    col(x - 1.1, x + 1.1, z - 2.3, z + 2.3);
    place(sign(e.name.toUpperCase(), 2.6, 0.5, '#ffffff', '#111111', 'bold 56px sans-serif'), x, 2.3, face ? Z0 + 0.17 : -0.17, face ? 0 : Math.PI);   // the make on the wall behind the bay
    act(x, z, 3.3, `Drive the ${e.name} out (${e.category})`, () => driveOut(e, colour));   // E anywhere round the car
  });

  // ---------------- going up and down ----------------
  const entrances = [];
  let inside = false;
  function goUp() {
    const f = from; inside = false; from = null;
    if (!f) return;
    ctx.teleport(f.out.x, f.out.y, f.out.z, f.out.yaw); toast(`🛗 Up to ${f.name}.`);
  }
  function driveOut(e, colour) {
    const f = from; if (!f) return;
    const v = ctx.makeVehicle('car', colour, e.style); applyStats(v, e); v.owned = true; v.ai = null;
    v.group.position.set(f.drive.x, f.drive.y, f.drive.z); v.group.rotation.y = f.drive.ry;
    inside = false; from = null;
    ctx.teleport(f.drive.x + Math.cos(f.drive.ry) * 2.2, f.drive.y, f.drive.z - Math.sin(f.drive.ry) * 2.2, null);
    ctx.driveAway(v);
    toast(`🔑 The ${e.name} is brought up from the car park and you're at the wheel. Have fun.`);
  }
  // add(spec): a lift in a mansion. spec: { name, x, y, z, face (the way the lift door looks), drive: { x, y, z, ry } }
  function add(spec) {
    const { x, y, z } = spec, f = spec.face ?? 0, fx = Math.sin(f), fz = Math.cos(f);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = f; scene.add(g);
    const glass = mat(0x9fc4d6, { opacity: 0.3, rough: 0.05, metal: 0.3 }), frame = mat(0x2a2e33, { metal: 0.6, rough: 0.35 });
    B(1.8, 0.12, 1.8, 0, 0.06, 0, frame, 0, g); B(1.8, 0.15, 1.8, 0, 2.6, 0, frame, 0, g);
    for (const [a, b] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) B(0.08, 2.5, 0.08, a, 1.3, b, frame, 0, g);
    B(1.7, 2.45, 0.04, 0, 1.3, -0.86, glass, 0, g); B(0.04, 2.45, 1.7, -0.86, 1.3, 0, glass, 0, g); B(0.04, 2.45, 1.7, 0.86, 1.3, 0, glass, 0, g);
    B(0.6, 2.4, 0.03, -0.42, 1.3, 0.87, steel, 0, g); B(0.6, 2.4, 0.03, 0.42, 1.3, 0.87, steel, 0, g);   // the doors (at the front)
    B(0.14, 0.22, 0.05, 1.0, 1.2, 0.85, frame, 0, g); B(0.06, 0.06, 0.03, 1.0, 1.22, 0.88, mat(0xffd23f, { emissive: 0xffb000, ei: 1.2 }), 0, g);
    const s = sign('LOWER LEVEL ▼', 1.6, 0.35, '#111111', '#d4af37', 'bold 52px sans-serif'); s.position.set(0, 2.85, 0.9); g.add(s);
    const c = { minX: x - 0.95, maxX: x + 0.95, minZ: z - 0.95, maxZ: z + 0.95, baseYAt: () => y }; ctx.colliders.push(c);
    const out = { x: x + fx * 1.6, y, z: z + fz * 1.6, yaw: null };
    const entry = { name: spec.name, out, drive: spec.drive };
    const it = { pos: new THREE.Vector3(out.x, y, out.z), r: 1.4, label: 'Take the lift down to the basement', action: () => goDown(entry) }; ctx.interactables.push(it);
    entrances.push(entry); return entry;
  }
  function goDown(entry) {
    from = entry; inside = true;
    ctx.teleport(O.x, 0.02, O.z + Z1 - 2.2, 0);
    toast(`🛗 Down to the lower level: cinema, bar, gym, bowling, the pool and the car park.`);
  }

  // ---------------- bowling: a little game ----------------
  // Five frames, two balls each. Aim (A / D or the mouse) where you stand on the lane, then press Space to bowl:
  // a meter swings for the hook, press Space again to let go. Strikes and spares score bonus balls, like the real thing.
  const ov = document.createElement('div'); ov.id = 'bowling'; ov.hidden = true;
  ov.innerHTML = `<style>#bowling{position:fixed;inset:0;z-index:45;background:rgba(8,10,14,.62);display:flex;align-items:center;justify-content:center;font:15px system-ui,sans-serif;color:#f4f1ea}#bowling[hidden]{display:none}
    #bowling .card{background:#1b2027;border-radius:16px;padding:14px 16px;width:min(620px,96vw)}#bowling h2{margin:0;font-size:19px}#bowling .msg{color:#ffd23f;font-weight:700;min-height:20px;margin:6px 0}
    #bowling canvas{width:100%;display:block;border-radius:10px;background:#20262e}#bowling table{border-collapse:collapse;margin:8px 0;width:100%}#bowling td{border:1px solid #3a424c;text-align:center;padding:3px;font-size:13px;min-width:40px}
    #bowling .row{display:flex;justify-content:space-between;align-items:center}#bowling button{background:#444c56;border:0;color:#fff;border-radius:9px;padding:7px 12px;cursor:pointer}</style>
    <div class="card"><div class="row"><h2>🎳 Bowling</h2><button type="button">Stop (Esc)</button></div><div class="msg"></div><canvas width="600" height="200"></canvas><table><tr class="f"></tr><tr class="s"></tr></table><div class="hint" style="color:#aab4bf;font-size:13px">A / D (or move the mouse) to line up · Space to bowl, Space again to set the hook</div></div>`;
  document.body.append(ov);
  const cv = ov.querySelector('canvas'), g2 = cv.getContext('2d'), msgEl = ov.querySelector('.msg');
  ov.querySelector('button').onclick = () => endBowl(false);
  let bw = null, raf = 0, last = 0;
  const FR = 5;
  function bowl(lane) {
    bw = { lane, frame: 0, rolls: [], standing: Array(10).fill(true), aim: 0, phase: 'aim', hook: 0, hookT: 0, ball: null, t: 0, ballN: 0, keys: {} };
    msgEl.textContent = ''; ov.hidden = false; ctx.pause?.(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); drawScore();
  }
  function endBowl(done) {
    if (ov.hidden) return; ov.hidden = true; cancelAnimationFrame(raf); ctx.resume?.();
    const lane = bw?.lane; if (lane != null) for (const p of pins[lane]) p.rotation.set(0, 0, 0);
    if (done) { const s = scoreOf(bw.rolls).total; toast(`🎳 Game over: ${s} points${s >= 120 ? '. Brilliant bowling!' : s >= 70 ? '. Nice game.' : '. Better luck next time.'}`); ctx.gainXp?.(s >= 100 ? 3 : 1); }
    bw = null;
  }
  addEventListener('keydown', e => { if (ov.hidden || !bw) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Escape') return endBowl(false); if (!bw.keys[e.code]) { bw.keys[e.code] = true; if (e.code === 'Space') space(); } }, true);
  addEventListener('keyup', e => { if (ov.hidden || !bw) return; e.preventDefault(); e.stopImmediatePropagation(); bw.keys[e.code] = false; }, true);
  cv.addEventListener('pointermove', e => { if (!bw || bw.phase !== 'aim') return; const r = cv.getBoundingClientRect(); bw.aim = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2.4)); });
  cv.addEventListener('pointerdown', () => space());
  // the lane on screen: the foul line at x 60, the head pin at x 520; across: y 100 +/- 50
  const PIN_XY = pinSpots.map(([dx, dz]) => [496 + dx * 110, 100 + dz * 100]);
  function space() {
    if (!bw) return;
    if (bw.phase === 'aim') { bw.phase = 'hook'; bw.hookT = 0; }
    else if (bw.phase === 'hook') { bw.phase = 'roll'; bw.ball = { x: 60, y: 100 + bw.aim * 40, vy: 0, curve: bw.hook * 42 }; }
    else if (bw.phase === 'over') endBowl(true);
  }
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!bw) return;
    if (bw.phase === 'aim') { if (bw.keys.KeyA || bw.keys.ArrowUp || bw.keys.KeyW) bw.aim = Math.max(-1, bw.aim - dt * 1.4); if (bw.keys.KeyD || bw.keys.ArrowDown || bw.keys.KeyS) bw.aim = Math.min(1, bw.aim + dt * 1.4); msgEl.textContent = `Frame ${bw.frame + 1} of ${FR}, ball ${bw.ballN + 1}: line up and press Space`; }
    if (bw.phase === 'hook') { bw.hookT += dt; bw.hook = Math.sin(bw.hookT * 3.2); msgEl.textContent = 'Press Space to let go: the closer to the middle, the straighter it rolls'; }
    if (bw.phase === 'roll') {
      const b = bw.ball, k = (b.x - 60) / 460; b.x += 300 * dt; b.y = b.y0 ?? (b.y0 = b.y); b.y = b.y0 + b.curve * k * k;
      if (b.y < 52 || b.y > 148) { b.gutter = true; b.y = Math.max(50, Math.min(150, b.y)); }
      if (b.x > 612) finishRoll();
      if (!b.gutter) PIN_XY.forEach(([px, py], i) => { if (bw.standing[i] && Math.abs(px - b.x) < 12 && Math.abs(py - b.y) < 16) knock(i, b.y - py); });
      msgEl.textContent = '…';
    }
    if (bw.phase === 'wait' && (bw.t -= dt) <= 0) nextBall();
    draw(); raf = requestAnimationFrame(loop);
  }
  function knock(i, off) {   // a pin goes down and takes the ones behind it with it, more often when hit square
    if (!bw.standing[i]) return; bw.standing[i] = false;
    const [px, py] = PIN_XY[i];
    PIN_XY.forEach(([qx, qy], j) => { if (bw.standing[j] && qx > px && qx - px < 40 && Math.abs(qy - (py - off * 0.6)) < 22 && Math.random() < 0.78) knock(j, off * 0.8); });
  }
  function finishRoll() {
    const down = bw.standing.filter(s => !s).length - (bw.prevDown || 0);
    bw.rolls.push(down); bw.prevDown = (bw.prevDown || 0) + down;
    const lane = pins[bw.lane]; bw.standing.forEach((s, i) => lane[i].rotation.set(0, 0, s ? 0 : 1.4));
    msgEl.textContent = bw.prevDown === 10 ? (bw.ballN === 0 ? 'STRIKE! 🎉' : 'Spare!') : bw.ball.gutter && down === 0 ? 'Gutter ball…' : `${down} down`;
    bw.phase = 'wait'; bw.t = 1.3; drawScore();
  }
  function nextBall() {
    const lastFrame = bw.frame === FR - 1;
    const strike = bw.ballN === 0 && bw.prevDown === 10, spare = bw.ballN === 1 && bw.prevDown === 10;
    if (lastFrame && (strike || spare) && !bw.bonus) { bw.bonus = strike ? 2 : 1; bw.standing.fill(true); bw.prevDown = 0; bw.ballN = 0; bw.phase = 'aim'; return; }
    if (bw.bonus) { bw.bonus--; if (bw.bonus <= 0) return over(); if (bw.prevDown === 10) { bw.standing.fill(true); bw.prevDown = 0; } bw.ballN = 1; bw.phase = 'aim'; return; }
    if (bw.ballN === 0 && !strike) { bw.ballN = 1; bw.phase = 'aim'; return; }
    if (lastFrame) return over();
    bw.frame++; bw.ballN = 0; bw.standing.fill(true); bw.prevDown = 0; bw.phase = 'aim'; for (const p of pins[bw.lane]) p.rotation.set(0, 0, 0);
  }
  function over() { bw.phase = 'over'; msgEl.textContent = `Game over: ${scoreOf(bw.rolls).total} points. Press Space.`; drawScore(); }
  function scoreOf(r) {   // standard bowling scoring over FR frames
    const frames = []; let i = 0, total = 0;
    for (let f = 0; f < FR && i < r.length; f++) {
      if (r[i] === 10) { const s = 10 + (r[i + 1] ?? 0) + (r[i + 2] ?? 0); total += s; frames.push({ marks: 'X', total }); i += 1; }
      else if (r[i] + (r[i + 1] ?? 0) === 10 && r[i + 1] != null) { total += 10 + (r[i + 2] ?? 0); frames.push({ marks: `${r[i]} /`, total }); i += 2; }
      else { total += r[i] + (r[i + 1] ?? 0); frames.push({ marks: `${r[i]} ${r[i + 1] ?? ''}`, total }); i += 2; }
    }
    return { frames, total };
  }
  function drawScore() {
    const { frames } = scoreOf(bw?.rolls || []);
    ov.querySelector('.f').innerHTML = Array.from({ length: FR }, (_, f) => `<td>${f + 1}<br>${frames[f]?.marks ?? ''}</td>`).join('');
    ov.querySelector('.s').innerHTML = Array.from({ length: FR }, (_, f) => `<td><b>${frames[f]?.total ?? ''}</b></td>`).join('');
  }
  function draw() {
    const g = g2; g.clearRect(0, 0, 600, 200);
    g.fillStyle = '#3a3f45'; g.fillRect(40, 40, 560, 120); g.fillStyle = '#d8b07a'; g.fillRect(40, 54, 560, 92);
    for (let k = 0; k < 7; k++) { g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(200, 66 + k * 11); g.lineTo(210, 70 + k * 11); g.lineTo(200, 74 + k * 11); g.fill(); }
    g.fillStyle = '#7a1c1c'; g.fillRect(58, 54, 3, 92);
    PIN_XY.forEach(([x, y], i) => { g.fillStyle = bw.standing[i] ? '#fafafa' : 'rgba(250,250,250,.2)'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); if (bw.standing[i]) { g.fillStyle = '#c0392b'; g.fillRect(x - 5, y - 1, 10, 2); } });
    const by = bw.phase === 'roll' || bw.phase === 'wait' ? bw.ball?.y : 100 + bw.aim * 40, bx = bw.phase === 'roll' || bw.phase === 'wait' ? bw.ball?.x : 50;
    if (by != null) { g.fillStyle = '#1f5fd6'; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.fill(); }
    if (bw.phase === 'aim' || bw.phase === 'hook') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(60, by); for (let k = 0; k <= 1.001; k += 0.1) g.lineTo(60 + 460 * k, by + (bw.phase === 'hook' ? bw.hook * 42 : 0) * k * k); g.stroke(); g.setLineDash([]); }
    if (bw.phase === 'hook') { g.fillStyle = '#3a424c'; g.fillRect(200, 172, 200, 12); g.fillStyle = '#3ddc97'; g.fillRect(290, 172, 20, 12); g.fillStyle = '#ffd23f'; g.fillRect(300 + bw.hook * 95 - 3, 168, 6, 20); }
  }

  // ---------------- per frame / for main.js ----------------
  return {
    add, entrances, cinemaTv,
    get inside() { return inside; },
    get bowling() { return !ov.hidden; },
    // the pool's floor is below the basement floor (everything else is the floor at 0)
    groundAt(x, z) { const lx = x - O.x, lz = z - O.z; if (lx < X0 || lx > X1 || lz < Z0 || lz > Z1) return null; return lx > PX0 && lx < PX1 && lz > PZ0 && lz < PZ1 ? DEEP : 0.02; },
  };
}
