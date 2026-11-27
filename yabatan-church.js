// THE YABATAN CHURCH: a walled compound out on the frozen plain beyond the mountains, north-west of the dome,
// past the hunters' orange markers. Black stone walls with towers and braziers and one gate; inside, a gothic
// cathedral (walk in: pews of kneeling believers, a horned idol over the altar, red candles), a ritual circle in
// the courtyard where believers chant, and the cells: cages of captured monsters, an empty cage, a lab bench.
// Robed believers keep the gate, walk the courtyard and fill the pews; you can talk to them, but they don't say
// much. Monsters prowl outside the walls. (The Church's leaders, history and purpose are deliberately not shown.)
// The snowfield it stands on: the plain between the mountains and the river is laid here (west of the dungeon).
import * as THREE from 'three';

export const CHURCH = { x: -1508, z: -1349 };

export function buildYabatanChurch(ctx) {
  // ctx: { scene, colliders, interactables, sitSpots, planeBlocks, DOME, makePerson(look), animatePerson(h, moving, dt),
  //        makeFigure(type), makeMonster(type, level, pos), makeTex, toast, player(), warm(), gainXp(n) }
  const { scene, toast } = ctx, C = CHURCH;
  const root = new THREE.Group(); root.name = 'yabatan church'; scene.add(root);
  const mats = new Map(), M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide }); if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; } mats.set(k, m); } return mats.get(k); };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, c, solid = false, parent = root) => { const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > 2; m.receiveShadow = true; parent.add(m); if (solid) col(x - w / 2, x + w / 2, z - d / 2, z + d / 2); return m; };
  const Cy = (rt, rb, h, x, y, z, c, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c instanceof THREE.Material ? c : M(c)); m.position.set(x, y, z); m.castShadow = h > 2; root.add(m); return m; };
  const col = (x0, x1, z0, z1, base) => { const r = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }; if (base != null) r.baseYAt = () => base; ctx.colliders.push(r); return r; };
  const act = (x, z, r, label, action) => { const it = { pos: new THREE.Vector3(x, 0, z), r, label, action }; ctx.interactables.push(it); return it; };
  const pick = a => a[Math.floor(Math.random() * a.length)], caged = [];
  const black = M(0x24222a, { rough: 0.95 }), stone = M(0x3a3640, { rough: 0.9 }), iron = M(0x2a2a2e, { metal: 0.6, rough: 0.5 });
  const fireM = M(0xff5a1a, { emissive: 0xff3a00, ei: 2 }), redGlow = M(0x8a0a12, { emissive: 0xff1a2a, ei: 1.6 }), candle = M(0xf2e6c8, { emissive: 0xffb050, ei: 1.2 });

  // ---------------- the land: a snowfield from the mountains to the river, pines, rocks ----------------
  const D = ctx.DOME;
  { const snow = new THREE.Mesh(new THREE.RingGeometry(D.r + 400, 3010, 160, 1, 1.05, Math.PI * 2 - 1.95), M(0xeef3f7, { rough: 0.95 }));   // (leaves a gap to the east for the dungeon arena)
    snow.rotation.x = -Math.PI / 2; snow.position.set(D.x, -0.02, D.z); snow.receiveShadow = true; snow.userData.noCull = true; snow.frustumCulled = false; scene.add(snow); }
  { let seed = 99; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const spots = []; for (let i = 0; i < 900; i++) { const a = 1.05 + rnd() * (Math.PI * 2 - 1.95), r = D.r + 450 + rnd() * 1500, x = D.x + Math.cos(a) * r, z = D.z - Math.sin(a) * r; if (Math.hypot(x - C.x, z - C.z) < 110) continue; spots.push([x, z, 0.8 + rnd() * 1.2]); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 6.5, 7), M(0x2c4a34), spots.length), caps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 2.4, 7), M(0xffffff), spots.length);
    spots.forEach(([x, z, k], i) => { s.setScalar(k); trees.setMatrixAt(i, m4.compose(p.set(x, 3.25 * k + 1, z), q, s)); caps.setMatrixAt(i, m4.compose(p.set(x, 7 * k, z), q, s)); });
    for (const m of [trees, caps]) { m.frustumCulled = false; scene.add(m); } }

  // ---------------- the walls: 120 m square, towers at the corners, one gate (south) ----------------
  const H = 7, X0 = C.x - 60, X1 = C.x + 60, Z0 = C.z - 60, Z1 = C.z + 60;
  B(124, 0.05, 124, C.x, 0.03, C.z, M(0x4a4650, { rough: 1 }));   // trodden black ground inside
  const wallX = (z, a, b) => { B(b - a, H, 2, (a + b) / 2, H / 2, z, black, true); for (let x = a + 1; x < b; x += 3) B(1.4, 1.1, 2.1, x, H + 0.55, z, black); };
  const wallZ = (x, a, b) => { B(2, H, b - a, x, H / 2, (a + b) / 2, black, true); for (let z = a + 1; z < b; z += 3) B(2.1, 1.1, 1.4, x, H + 0.55, z, black); };
  wallX(Z0, X0, X1); wallZ(X0, Z0, Z1); wallZ(X1, Z0, Z1); wallX(Z1, X0, C.x - 6); wallX(Z1, C.x + 6, X1);
  for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) { Cy(4, 4.6, 14, x, 7, z, black, 10); col(x - 4.3, x + 4.3, z - 4.3, z + 4.3); const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 7, 10), stone); roof.position.set(x, 17.5, z); root.add(roof); Cy(0.8, 0.5, 0.6, x, 21.3, z, iron, 8); const f = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 7), fireM); f.position.set(x, 22.2, z); root.add(f); }
  // the gate: two towers, an arch, a raised portcullis, braziers, a carved name
  for (const s of [-1, 1]) { B(5, 11, 5, C.x + s * 8.5, 5.5, Z1, black, true); B(1, 2.2, 1, C.x + s * 7, 1.1, Z1 + 3.5, iron, true); const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 7), fireM); f.position.set(C.x + s * 7, 2.8, Z1 + 3.5); root.add(f); }
  B(12, 3, 2.4, C.x, 9.5, Z1, black); for (let k = -5; k <= 5; k += 1.25) B(0.15, 2.4, 0.15, C.x + k, 7.3, Z1, iron);
  { const t = ctx.makeTex(512, 96, g => { g.fillStyle = '#1a181e'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#b01a24'; g.font = 'bold 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('YABATAN CHURCH', 256, 50, 490); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 })); s.position.set(C.x, 9.6, Z1 + 1.25); root.add(s); }
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4, 5), iron); sp.position.set(C.x + s * (12 + k * 6), H + 1.6, Z1 + 0.6); root.add(sp); }   // spikes along the front

  // ---------------- the cathedral (x C.x±10, z C.z-50..C.z-10; doors to the south) ----------------
  const cx = C.x, cz0 = C.z - 50, cz1 = C.z - 10, CW = 20, CH = 16;
  const facade = M(0x2e2b35, { rough: 0.9 });
  B(CW, 0.1, cz1 - cz0, cx, 0.06, (cz0 + cz1) / 2, M(0x1c1a20, { rough: 0.6 }));   // floor
  B(0.8, CH, cz1 - cz0, cx - CW / 2, CH / 2, (cz0 + cz1) / 2, facade, true); B(0.8, CH, cz1 - cz0, cx + CW / 2, CH / 2, (cz0 + cz1) / 2, facade, true);
  B(CW, CH, 0.8, cx, CH / 2, cz0, facade, true);
  B(CW / 2 - 2.5, CH, 0.8, cx - CW / 4 - 1.25, CH / 2, cz1, facade, true); B(CW / 2 - 2.5, CH, 0.8, cx + CW / 4 + 1.25, CH / 2, cz1, facade, true); B(5, CH - 6.5, 0.8, cx, 6.5 + (CH - 6.5) / 2, cz1, facade);   // the doorway
  for (const s of [-1, 1]) { const door = B(2.4, 6.4, 0.2, cx + s * 1.3, 3.2, cz1 + 0.1, M(0x2a1410)); door.rotation.y = s * 1.2; door.position.x = cx + s * 2.3; door.position.z = cz1 + 1; }   // great doors standing open
  { const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, CW / 2 + 1.2, cz1 - cz0 + 1.5, 4, 1), stone); roof.rotation.set(Math.PI / 2, 0, Math.PI / 4); roof.scale.set(1, 1, 0.55); roof.position.set(cx, CH + 5, (cz0 + cz1) / 2); root.add(roof); }
  B(CW + 1.4, 0.6, cz1 - cz0 + 1.4, cx, CH + 0.3, (cz0 + cz1) / 2, black);
  for (let z = cz0 + 4; z < cz1; z += 6) for (const s of [-1, 1]) { B(1.4, CH * 0.8, 1.4, cx + s * (CW / 2 + 2.5), CH * 0.4, z, black, true); const fly = B(3.2, 0.7, 0.9, cx + s * (CW / 2 + 1.4), CH * 0.82, z, black); fly.rotation.z = -s * 0.5;
    B(0.2, 6, 1.8, cx + s * (CW / 2 + 0.42), 9, z + 3, redGlow); }   // buttresses, and tall red windows between them
  // the spire at the north end, with a red light at the top you can see from the mountains
  { const sx = cx, sz = cz0 + 4; B(8, 30, 8, sx, 15, sz, facade, true); const sp = new THREE.Mesh(new THREE.ConeGeometry(5.6, 26, 4), stone); sp.rotation.y = Math.PI / 4; sp.position.set(sx, 43, sz); root.add(sp);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), redGlow); beacon.position.set(sx, 57, sz); root.add(beacon); const l = new THREE.PointLight(0xff2030, 30, 140, 1.4); l.position.set(sx, 55, sz); root.add(l); }
  // the rose window over the doors
  { const rose = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), redGlow); rose.position.set(cx, 11.5, cz1 + 0.42); root.add(rose); for (let k = 0; k < 8; k++) { const r = B(0.18, 6.2, 0.1, cx, 11.5, cz1 + 0.47, iron); r.rotation.z = k * Math.PI / 8; } }
  // inside: pews, a red carpet, banners, candles, the altar and the idol
  B(3, 0.02, cz1 - cz0 - 2, cx, 0.12, (cz0 + cz1) / 2, M(0x5a0d12, { rough: 1 }));
  const pewWood = M(0x241812, { rough: 0.7 }), kneeling = [];
  for (let z = cz1 - 6; z > cz0 + 14; z -= 2.6) for (const s of [-1, 1]) {
    const x = cx + s * 5; B(6.5, 0.45, 0.6, x, 0.45, z, pewWood); B(6.5, 1, 0.15, x, 0.75, z + 0.35, pewWood); col(x - 3.25, x + 3.25, z - 0.3, z + 0.45, 0);
    for (const dx of [-2, 0, 2]) ctx.sitSpots?.push({ x: x + dx, z: z - 0.05, yaw: Math.PI, seatY: 0.7, label: 'Sit in a pew' });
    if (Math.random() < 0.55) { const h = believer(); h.root.position.set(x + pick([-2, 0, 2]), 0.08, z - 0.75); h.root.rotation.y = Math.PI; h.root.scale.y = 0.82; kneeling.push(h); }   // kneeling in prayer
  }
  for (let z = cz0 + 8; z < cz1 - 2; z += 6) for (const s of [-1, 1]) { const ban = B(0.08, 5, 2, cx + s * (CW / 2 - 0.5), 9, z, M(0x6a0a10, { rough: 0.9, side: THREE.DoubleSide })); B(0.1, 0.8, 0.8, cx + s * (CW / 2 - 0.45), 9.6, z, M(0x111111)); }
  B(8, 1.2, 3, cx, 0.6, cz0 + 9, black, true); B(8.2, 0.1, 3.2, cx, 1.25, cz0 + 9, M(0x5a0d12));   // the altar
  for (let k = 0; k < 14; k++) { const x = cx - 3.6 + (k % 7) * 1.2, z = cz0 + 8 + Math.floor(k / 7) * 2; Cy(0.06, 0.06, 0.3 + (k % 3) * 0.12, x, 1.45, z, candle, 6); const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 5), fireM); f.position.set(x, 1.7 + (k % 3) * 0.06, z); root.add(f); }
  { const idol = new THREE.Group(); idol.position.set(cx, 0, cz0 + 4.5); root.add(idol);   // a horned idol, twice the height of a man, eyes glowing
    B(4, 2, 3, 0, 1, 0, black, false, idol); B(3, 4.5, 2, 0, 4.25, 0, stone, false, idol); B(2, 1.8, 1.8, 0, 7.4, 0.1, stone, false, idol);
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 8), M(0xd8ccb0)); horn.position.set(s * 1.1, 9, 0.1); horn.rotation.z = -s * 0.6; idol.add(horn); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), redGlow); eye.position.set(s * 0.45, 7.6, 1.02); idol.add(eye);
      const arm = B(0.8, 3.5, 0.8, s * 2, 4.4, 0.4, stone, false, idol); arm.rotation.z = s * 0.35; }
    col(cx - 2, cx + 2, cz0 + 3, cz0 + 6); }
  for (const s of [-1, 1]) { const l = new THREE.PointLight(0xff3020, 10, 26, 1.6); l.position.set(cx + s * 5, 6, cz0 + 12); root.add(l); }
  for (const z of [cz1 - 8, cz1 - 22]) { const l = new THREE.PointLight(0xff7a50, 12, 30, 1.5); l.position.set(cx, 9, z); root.add(l); }
  ctx.planeBlocks?.push({ minX: cx - CW / 2, maxX: cx + CW / 2, minZ: cz0, maxZ: cz1, top: CH + 2 });   // indoors: first person
  const preacher = believer(0x1a0306); preacher.root.position.set(cx, 1.3, cz0 + 9.2); preacher.root.rotation.y = 0;
  col(cx - 4, cx + 4, cz0 + 7.5, cz0 + 10.5);
  act(cx, cz0 + 12, 2.5, 'Kneel before the altar', () => { toast(pick(['🕯️ You kneel. The candles gutter as if something breathed on them.', '🕯️ The idol\'s eyes seem to follow you. The believers around you start to chant.', '🕯️ You kneel among them. Nobody looks at you. Everybody is watching you.'])); ctx.warm?.(); });
  act(cx, cz0 + 11, 3.2, 'Speak to the preacher', () => toast(pick(['🩸 The preacher: "You came a long way through the cold. Most who come this far are looking for something."', '🩸 The preacher: "Strength is not given in there, under their dome. It is taken out here."', '🩸 The preacher: "Sit. Listen. When you are ready to ask the right question, we will be here."'])));
  act(cx + 6, cz1 - 3, 2, 'Ask about joining', () => toast('🩸 A believer looks you up and down. "Not yet. Come back when you are more than you are now."'));

  // ---------------- the courtyard: a ritual circle with a fire and chanting believers ----------------
  const rcx = C.x - 30, rcz = C.z + 25;
  { const ring = new THREE.Mesh(new THREE.RingGeometry(6, 6.6, 48), redGlow); ring.rotation.x = -Math.PI / 2; ring.position.set(rcx, 0.08, rcz); root.add(ring);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x1 = rcx + Math.cos(a) * 6.3, z1 = rcz + Math.sin(a) * 6.3, b = a + Math.PI * 2 / 6 * 2, x2 = rcx + Math.cos(b) * 6.3, z2 = rcz + Math.sin(b) * 6.3; const l = B(Math.hypot(x2 - x1, z2 - z1), 0.02, 0.3, (x1 + x2) / 2, 0.09, (z1 + z2) / 2, redGlow); l.rotation.y = -Math.atan2(z2 - z1, x2 - x1); }   // a star in the circle
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; B(1.2, 5, 1.2, rcx + Math.cos(a) * 9, 2.5, rcz + Math.sin(a) * 9, black, true); }   // obelisks
    Cy(1.2, 1.4, 0.6, rcx, 0.3, rcz, black, 10); const fire = new THREE.Mesh(new THREE.ConeGeometry(1, 2.6, 8), fireM); fire.position.set(rcx, 1.9, rcz); root.add(fire); col(rcx - 1.4, rcx + 1.4, rcz - 1.4, rcz + 1.4);
    const l = new THREE.PointLight(0xff5a20, 16, 30, 1.5); l.position.set(rcx, 3, rcz); root.add(l); }
  const chanting = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, h = believer(); h.root.position.set(rcx + Math.cos(a) * 4.4, 0.05, rcz + Math.sin(a) * 4.4); h.root.rotation.y = Math.atan2(rcx - h.root.position.x, rcz - h.root.position.z); chanting.push(h); }
  act(rcx, rcz + 7.5, 3, 'Warm yourself at the ritual fire', () => { ctx.warm?.(); toast('🔥 The believers make room for you at the fire without breaking their chant. You\'re warm again.'); });

  // ---------------- the cells (east): cages of captured monsters, an empty cage, a bench of vials ----------------
  const ex0 = C.x + 22, ex1 = C.x + 56, ez0 = C.z - 25, ez1 = C.z + 5;
  B(ex1 - ex0, 0.08, ez1 - ez0, (ex0 + ex1) / 2, 0.05, (ez0 + ez1) / 2, M(0x2a282c));
  B(ex1 - ex0, 5, 0.8, (ex0 + ex1) / 2, 2.5, ez0, black, true); B(0.8, 5, ez1 - ez0, ex1, 2.5, (ez0 + ez1) / 2, black, true); B(0.8, 5, ez1 - ez0, ex0, 2.5, (ez0 + ez1) / 2, black, true);
  B(ex1 - ex0 - 8, 5, 0.8, (ex0 + ex1) / 2 + 4, 2.5, ez1, black, true); B(ex1 - ex0 + 1, 0.5, ez1 - ez0 + 1, (ex0 + ex1) / 2, 5.25, (ez0 + ez1) / 2, stone);   // walls, an opening at the west end of the front, a flat roof
  ctx.planeBlocks?.push({ minX: ex0, maxX: ex1, minZ: ez0, maxZ: ez1, top: 6 });
  const CAGED = ['imp', 'demon', 'frostWolf', 'snowStalker', 'toxicCrawler', null];
  CAGED.forEach((type, k) => {
    const x = ex0 + 4 + k * 5.2, z = ez0 + 3.5;
    for (let i = 0; i <= 8; i++) B(0.08, 3.4, 0.08, x - 2 + i * 0.5, 1.7, z + 2, iron); for (const s of [-1, 1]) B(0.08, 3.4, 4, x + s * 2, 1.7, z, iron); B(4.1, 0.1, 4.1, x, 3.4, z, iron);
    col(x - 2.1, x + 2.1, z - 2.1, z + 2.1);
    if (type) { const f = ctx.makeFigure?.(type); if (f) { f.root.position.set(x, 0.1, z); f.root.rotation.y = Math.random() * 6; root.add(f.root); caged.push(f); } }
    else { B(0.9, 0.12, 0.6, x, 0.12, z, M(0x4a5a6a)); for (const s of [-1, 1]) Cy(0.08, 0.08, 0.06, x + s * 0.9, 0.9, z - 1.95, iron, 8); }   // an empty cage: a torn coat on the floor, shackles on the wall
  });
  B(6, 0.9, 1.2, ex1 - 6, 0.45, ez1 - 4, M(0x3a3640)); for (let k = 0; k < 9; k++) Cy(0.08, 0.08, 0.35, ex1 - 8.4 + k * 0.6, 1.08, ez1 - 4, M([0x3fbf5f, 0x9f2fbf, 0xff3a3a][k % 3], { emissive: [0x1a8f3a, 0x6a1a8f, 0xaa1a1a][k % 3], ei: 1.2 }), 8); col(ex1 - 9, ex1 - 3, ez1 - 4.6, ez1 - 3.4);
  B(2.2, 0.9, 1, ex0 + 6, 0.45, ez1 - 5, M(0x6a6e72, { metal: 0.4 })); for (const s of [-1, 1]) B(0.2, 0.1, 0.08, ex0 + 6 + s * 0.9, 0.95, ez1 - 5, M(0x5a4a3a));   // an operating table with straps
  { const l = new THREE.PointLight(0x7fff9f, 6, 22, 1.6); l.position.set((ex0 + ex1) / 2, 4.2, (ez0 + ez1) / 2); root.add(l); }
  act((ex0 + ex1) / 2, ez0 + 8, 6, 'Look into the cages', () => toast(pick(['⛓️ Monsters, caged and labelled in a hand you can\'t read. One cage is empty: a torn coat on the floor, shackles on the wall.', '⛓️ The creature in the cage stops pacing and stares at you. Somebody has been feeding it. Somebody has been studying it.', '⛓️ On the bench: vials that glow, a scalpel, and notes that stop mid-sentence.'])));

  // ---------------- believers: at the gate, walking the courtyard ----------------
  function believer(robe = 0x4a0a10) { const h = ctx.makePerson({ outfit: robe, pants: 0x140808, hair: 0x0a0a0a, shoes: 0x0a0a0a, skin: 0xc9a88a }); root.add(h.root); return h; }
  const guards = [-1, 1].map(s => { const h = believer(0x2a0508); h.root.position.set(C.x + s * 4.5, 0.05, Z1 + 2); return h; });
  const LINES = ['"Turn back, or come in. Don\'t stand in the gate."', '"The cold keeps the weak away. You made it here. Interesting."', '"We don\'t answer questions at the gate."', '"Walk softly. They are praying."', '"Inside the dome they told you we were monsters. Look around you. Who keeps the monsters in cages?"'];
  for (const g of guards) act(g.root.position.x, g.root.position.z + 1, 2.5, 'Talk to the gatekeeper', () => toast('🩸 The gatekeeper: ' + pick(LINES)));
  const walkers = []; const WALK = [[C.x - 45, C.z + 45], [C.x + 15, C.z + 45], [C.x + 15, C.z + 12], [C.x - 45, C.z + 12]];
  for (let k = 0; k < 5; k++) { const h = believer(); const i = k % WALK.length; h.root.position.set(WALK[i][0], 0.05, WALK[i][1]); walkers.push({ h, i: (i + 1) % WALK.length, speed: 1.2 + Math.random() * 0.4 }); }
  const talkWalker = { pos: new THREE.Vector3(), r: 2.2, label: 'Talk to a believer', action: () => toast('🩸 A believer, without stopping: ' + pick(LINES)) }; ctx.interactables.push(talkWalker);

  // ---------------- monsters prowling outside the walls ----------------
  const prowlers = []; let spawnT = 0;
  const PROWL = ['imp', 'imp', 'demon', 'frostWolf', 'demon', 'snowStalker'];
  function spawnProwlers(p) {
    for (let i = prowlers.length - 1; i >= 0; i--) { const e = prowlers[i]; if (!e.alive || e.root?.position.distanceTo(p) > 300) { if (e.alive && e.root) { e.alive = false; e.root.visible = false; e.gone = true; } prowlers.splice(i, 1); } }
    if (prowlers.length >= 6) return;
    const a = Math.random() * Math.PI * 2, r = 75 + Math.random() * 40, pos = new THREE.Vector3(C.x + Math.cos(a) * r, 0, C.z + Math.sin(a) * r);
    if (pos.distanceTo(p) < 35) return;
    const e = ctx.makeMonster?.(pick(PROWL), 8 + Math.floor(Math.random() * 8), pos); if (e) prowlers.push(e);
  }

  let t = 0;
  return {
    church: C,
    inside: p => p.x > X0 - 3 && p.x < X1 + 3 && p.z > Z0 - 3 && p.z < Z1 + 8,   // (and the gate outside the walls)
    update(dt) {
      const p = ctx.player(); if (Math.abs(p.x - C.x) > 450 || Math.abs(p.z - C.z) > 450) return;
      t += dt;
      for (const w of walkers) {
        const [tx, tz] = WALK[w.i], P = w.h.root.position, dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
        if (d < 0.5) w.i = (w.i + 1) % WALK.length; else { P.x += dx / d * w.speed * dt; P.z += dz / d * w.speed * dt; w.h.root.rotation.y = Math.atan2(dx, dz); }
        ctx.animatePerson(w.h, true, dt);
      }
      const near = walkers.reduce((b, w) => { const d = w.h.root.position.distanceTo(p); return d < b.d ? { d, w } : b; }, { d: 1e9 }); if (near.w) talkWalker.pos.copy(near.w.h.root.position);
      chanting.forEach((h, k) => { ctx.animatePerson(h, false, dt); h.root.position.y = 0.05 + Math.max(0, Math.sin(t * 2 + k)) * 0.05; });   // swaying as they chant
      for (const h of [...kneeling, ...guards, preacher]) ctx.animatePerson(h, false, dt);
      for (const f of caged) { f.root.rotation.y += Math.sin(t * 0.7 + f.root.position.x) * dt * 0.8; ctx.animatePerson(f, false, dt); }
      if ((spawnT -= dt) <= 0) { spawnT = 3; spawnProwlers(p); }
    },
  };
}
