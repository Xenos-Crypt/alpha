// The funfair's second half and everything that goes with it:
//   - an extension east of the old fence, joined by an opening in the fence
//   - "Thunderbolt", a steel rollercoaster with a lift hill, a big drop and twists. Ride in the front car.
//   - a swinging pirate ship and the spinning teacups in the old fairground
//   - the Games Pavilion (a canopy of booths) plus two rows of stalls in the extension:
//     every game in fair-games.js has its own booth with someone running it, and a prize counter
//   - souvenir, sweet and balloon kiosks, candy floss
//   - Starlight Cinema: a picture house with a real screen inside (see interiors.js 'cinema')
import * as THREE from 'three';
import { GAMES } from './fair-games.js';

export const EXT = { minX: 405, maxX: 560, minZ: -716, maxZ: -644 };
export const CINEMA = { name: 'Starlight Cinema', x: 543, z: -680, w: 30, d: 40 };
export const COASTER = { name: 'Thunderbolt', price: 8, box: [436, 524, -708, -646], gate: [448, 456] };
export const SHIP = { name: 'Pirate ship', price: 5, x: 206, z: -748, pivot: 10.5, arm: 6.5, len: 32 };
export const CUPS = { name: 'Teacups', price: 3, x: 214, z: -697, r: 6, len: 28 };
// grass must not sprout through raised floors
export const NO_GRASS = [{ cx: CUPS.x, cz: CUPS.z, r: CUPS.r + 1 }, { minX: 262, maxX: 299, minZ: -706, maxZ: -664 }, { minX: 440, maxX: 462, minZ: -651, maxZ: -647 }];
const FIXED = ['hookaduck', 'hoopla', 'shooting', 'coconutshy'];   // these four already have stalls on the front row

export function buildFairExtras(ctx) {
  const { scene, colliders, interactables, makeTex, toast, stats } = ctx;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide })); return mats.get(k); };
  const B = (p, w, h, d, x, y, z, c, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > 0.6 || w > 2; m.receiveShadow = true; p.add(m); return m; };
  const C = (p, rt, rb, h, x, y, z, c, seg = 16, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c instanceof THREE.Material ? c : mat(c, o)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const solid = (x0, x1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const root = new THREE.Group(); scene.add(root);
  const steel = mat(0xd9dde2, { metal: 0.7, rough: 0.35 }), red = mat(0xc8102e), gold = mat(0xf2c14e, { metal: 0.5, rough: 0.4 }), rail = mat(0x2a2f36, { metal: 0.6, rough: 0.4 });
  const stripes = (a, b, n = 12) => { const t = makeTex(128, 32, g => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 128 / n, 0, 128 / n, 32); } }); t.wrapS = THREE.RepeatWrapping; return t; };
  const stripeMats = [['#c8102e', '#f6f1e7'], ['#1f6fd1', '#ffffff'], ['#1e9e4a', '#fff4c2'], ['#7b2cbf', '#ffd23f'], ['#ff7a00', '#ffffff'], ['#e11d74', '#ffe0ef']].map(([a, b]) => new THREE.MeshStandardMaterial({ map: stripes(a, b, 10) }));
  const label = (text, sub, w, bg = '#2b0f4a', fg = '#ffd23f') => { const t = makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = `bold ${sub ? 46 : 58}px Georgia, serif`; g.textAlign = 'center'; g.fillText(text, 256, sub ? 58 : 82, 490); if (sub) { g.font = 'italic 26px Georgia, serif'; g.fillStyle = '#fff'; g.fillText(sub, 256, 104, 490); } }); return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); };
  const bulbs = [], bulbMats = [0xfff2c0, 0xff6b6b, 0x6bc5ff, 0x9dff6b, 0xffd23f].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 })), bulbGeo = new THREE.SphereGeometry(0.11, 6, 4);
  const bulb = (p, x, y, z, k = 0) => { const m = new THREE.Mesh(bulbGeo, bulbMats[k % bulbMats.length]); m.position.set(x, y, z); p.add(m); bulbs.push(m); return m; };
  const people = [];   // stall-holders and ride operators
  const person = (x, z, yaw, outfit) => { if (!ctx.makePerson) return null; const h = ctx.makePerson({ outfit, hair: [0x2b1d14, 0x111111, 0x5a3b22, 0xc9a26a][people.length % 4], skin: [0xffdcc0, 0x8d5a3b, 0xd9a07a, 0x6b4430, 0xf0c8a0][people.length % 5], pants: 0x2d3142 }); h.root.position.set(x, 0.05, z); h.root.rotation.y = yaw; people.push({ h, ph: Math.random() * 6 }); return h; };

  // ---------------- extension ground, fence and paths ----------------
  { const { minX, maxX, minZ, maxZ } = EXT;
    B(root, maxX - minX, 0.04, maxZ - minZ, (minX + maxX) / 2, 0.02, (minZ + maxZ) / 2, 0x6f8f4a, { rough: 1 });
    for (const [x0, x1, z0, z1] of [[400, 528, -713, -709], [414, 428, -713, -648], [428, 460, -648, -645], [522, 528, -713, -660]]) B(root, x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.03, (z0 + z1) / 2, 0xcdb68a, { rough: 1 });
    const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.5) return; const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2; root.add(g);
      for (const y of [0.25, 1.0, 1.75]) B(g, L, 0.06, 0.06, 0, y, 0, rail);
      for (let a = -L / 2; a <= L / 2 + 0.01; a += 2.5) B(g, 0.08, 1.9, 0.08, a, 0.95, 0, rail);
      colliders.push({ minX: Math.min(x0, x1) - 0.15, maxX: Math.max(x0, x1) + 0.15, minZ: Math.min(z0, z1) - 0.15, maxZ: Math.max(z0, z1) + 0.15 }); };
    run(minX, minZ, maxX, minZ); run(maxX, minZ, maxX, maxZ); run(minX, maxZ, maxX, maxZ);
    // the coaster's own safety fence, with a gap at the station queue
    const [bx0, bx1, bz0, bz1] = COASTER.box, [g0, g1] = COASTER.gate;
    run(bx0, bz0, bx1, bz0); run(bx1, bz0, bx1, bz1); run(bx0, bz0, bx0, bz1); run(bx0, bz1, g0, bz1); run(g1, bz1, bx1, bz1);
    // an arch in the old fence line where the two halves join
    for (const s of [-1, 1]) C(root, 0.3, 0.35, 6, 405, 3, -711 + s * 4, red);
    B(root, 0.4, 1.4, 9, 405, 5.6, -711, 0x2b0f4a); for (const sx of [-0.22, 0.22]) { const s = label('THUNDERBOLT ⚡ CINEMA ⚡ GAMES', '', 8.4); s.position.set(405 + sx, 5.6, -711); s.rotation.y = sx < 0 ? -Math.PI / 2 : Math.PI / 2; root.add(s); }
    for (let i = 0; i <= 16; i++) bulb(root, 405, 6.4, -715 + i * 0.5, i);
    // lamp posts with bulb strings over the aisle
    for (let z = -706; z <= -652; z += 9) { C(root, 0.08, 0.08, 4.5, 414, 2.25, z, 0x333333, 6); C(root, 0.08, 0.08, 4.5, 428, 2.25, z, 0x333333, 6); for (let k = 0; k < 14; k++) bulb(root, 414 + k, 4.4 - Math.sin(k / 13 * Math.PI) * 0.6, z, k); }
  }

  // ---------------- Thunderbolt rollercoaster ----------------
  const P = [[446, 1.3, -652], [454, 1.3, -652], [462, 1.6, -652], [471, 5, -652], [484, 13, -652], [497, 22, -652], [509, 21.5, -655], [516, 16, -667], [511, 5.5, -682], [500, 3.6, -697], [482, 9, -702], [465, 15, -699], [452, 12, -690], [460, 8, -680], [478, 11, -676], [496, 7, -670], [478, 4.5, -663], [456, 3.2, -661], [442, 2.2, -658]];
  const curve = new THREE.CatmullRomCurve3(P.map(p => new THREE.Vector3(...p)), true, 'centripetal');
  const LEN = curve.getLength(), N = 640, up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), side = new THREE.Vector3();
  const samples = curve.getSpacedPoints(N), tans = samples.map((_, i) => curve.getTangentAt(i / N));
  let sTop = 0, yTop = 0; samples.forEach((p, i) => { if (p.y > yTop) { yTop = p.y; sTop = i / N * LEN; } });
  const coaster = { len: LEN, top: yTop, bounds: new THREE.Box3().setFromPoints(samples), low: samples.reduce((a, p) => p.y < a.y ? p : a) };
  { const railPts = [[], []], spine = [];
    for (let i = 0; i < N; i++) { side.crossVectors(tans[i], up).normalize(); railPts[0].push(samples[i].clone().addScaledVector(side, 0.55)); railPts[1].push(samples[i].clone().addScaledVector(side, -0.55)); spine.push(samples[i].clone().add(tmp.set(0, -0.35, 0))); }
    const railM = mat(0xff3b1f, { metal: 0.5, rough: 0.35 }), spineM = mat(0x1f3a8a, { metal: 0.5, rough: 0.4 });
    for (const pts of railPts) root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), N, 0.08, 6, true), railM));
    const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spine, true), N, 0.18, 8, true), spineM); sp.castShadow = true; root.add(sp);
    // cross ties and support columns (instanced: hundreds of them)
    const ties = new THREE.InstancedMesh(boxGeo, spineM, Math.ceil(N / 3)), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < N; i += 3) { o.position.copy(samples[i]).add(tmp.set(0, -0.2, 0)); o.lookAt(tmp.copy(o.position).add(tans[i])); o.scale.set(1.3, 0.1, 0.18); o.updateMatrix(); ties.setMatrixAt(k++, o.matrix); }
    ties.count = k; root.add(ties);
    const colGeo = new THREE.CylinderGeometry(0.22, 0.28, 1, 8), cols = new THREE.InstancedMesh(colGeo, mat(0xe8e8e8, { metal: 0.6, rough: 0.4 }), Math.ceil(N / 10)); k = 0;
    for (let i = 0; i < N; i += 10) { const p = samples[i], h = p.y - 0.45; if (h < 0.6) continue; o.position.set(p.x, h / 2, p.z); o.rotation.set(0, 0, 0); o.scale.set(1, h, 1); o.updateMatrix(); cols.setMatrixAt(k++, o.matrix); }
    cols.count = k; cols.castShadow = true; root.add(cols);
  }
  // station: a platform with a roof, the name in lights
  { const g = new THREE.Group(); g.position.set(452, 0, -649.6); root.add(g);
    B(g, 18, 1.0, 2.6, 0, 0.5, 0, 0x8a8f99); for (const x of [-8.5, 8.5]) for (const z of [-3.6, 1.2]) C(g, 0.12, 0.12, 4.4, x, 2.2, z, steel, 8);
    B(g, 18.6, 0.2, 5.6, 0, 4.4, -1.2, 0x1f3a8a); const s = label('THUNDERBOLT', 'the fastest coaster in Westhaven', 8, '#1f3a8a', '#ffd23f'); s.position.set(0, 5.4, 1.2); s.rotation.y = Math.PI; g.add(s);
    for (let i = 0; i <= 30; i++) bulb(g, -9 + i * 0.6, 4.25, 1.55, i);
    B(g, 1.2, 1.0, 1.4, -7, 0.5, 1.8, 0x8a8f99);   // steps up
    solid(443, 461, -650.9, -648.3); person(459, -648, Math.PI, 0x1f3a8a); }
  // the train: four cars
  const cars = [], carCol = [0xffd23f, 0xff3b1f, 0xffd23f, 0xff3b1f];
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); root.add(g);
    B(g, 1.35, 0.6, 2.0, 0, 0.3, 0, carCol[i], { metal: 0.3, rough: 0.4 }); B(g, 1.25, 0.5, 0.15, 0, 0.75, -0.55, 0x222222); B(g, 1.25, 0.5, 0.15, 0, 0.75, 0.35, 0x222222);
    if (i === 0) { const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 4), mat(0xff3b1f)); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.position.set(0, 0.35, 1.4); g.add(nose); }
    for (const s of [-0.32, 0.32]) B(g, 0.08, 0.55, 0.08, s, 0.95, 0.15, steel);   // lap bars
    cars.push(g); }
  const train = { s: 0, v: 0, state: 'dwell', dwell: 6, laps: 0 };
  const carAt = (s, g) => { const L = LEN, u = (((s % L) + L) % L) / L; const p = curve.getPointAt(u), t = curve.getTangentAt(u); g.position.copy(p).add(tmp.set(0, 0.05, 0)); g.lookAt(tmp.copy(g.position).add(t)); return { p, t }; };
  const placeTrain = () => cars.forEach((g, i) => carAt(train.s - i * 2.35, g));
  placeTrain();
  let coasterRider = null;
  interactables.push({ pos: new THREE.Vector3(452, 0, -646.6), r: 2.4,
    get label() { return coasterRider ? 'Thunderbolt' : train.state === 'dwell' ? `Ride Thunderbolt in the front car (${COASTER.price} gold)` : 'Thunderbolt: the train is out, wait for it to come back'; },
    action: () => {
      if (coasterRider) return;
      if (train.state !== 'dwell') return toast('⚡ The train is out on the track. It\'ll be back at the station in a few seconds.');
      if (stats.gold < COASTER.price) return toast(`Thunderbolt costs ${COASTER.price} gold.`);
      stats.gold -= COASTER.price; train.dwell = Math.max(train.dwell, 3);
      const follow = () => { cars[0].updateMatrixWorld(true); const p = cars[0].localToWorld(tmp.set(0, 0.55, -0.1)); const t = curve.getTangentAt((((train.s % LEN) + LEN) % LEN) / LEN); return { x: p.x, y: p.y + 0.4, z: p.z, yaw: Math.atan2(t.x, t.z) }; };
      const p = follow(), spot = { x: p.x, z: p.z, seatY: p.y, yaw: p.yaw, ride: 'coaster', follow, label: 'Thunderbolt' };
      coasterRider = { spot, lapAt: train.laps, shouted: 0 };
      ctx.seat(spot); toast('⚡ Lap bar down... hold on tight! (Press E to get off at the station.)');
    } });
  // the lift hill and drop announcements
  const coasterTick = dt => {
    if (train.state === 'dwell') { train.dwell -= dt; train.v = 0; if (train.dwell <= 0) { train.state = 'run'; } }
    else {
      const s = train.s, y = curve.getPointAt(Math.min(0.9999, s / LEN)).y;
      if (s < sTop) train.v = s < 6 ? Math.min(3.2, train.v + dt * 2) : 3.2;   // chain lift
      else train.v = Math.max(5, Math.sqrt(2 * 9.8 * Math.max(0, yTop + 0.8 - y)));
      if (s > LEN - 14) train.v = Math.max(2.2, train.v - dt * 9);   // brakes into the station
      train.s += train.v * dt;
      if (train.s >= LEN) { train.s = 0; train.state = 'dwell'; train.dwell = 9; train.laps++; }
    }
    placeTrain();
    if (coasterRider) {
      if (!ctx.isSeated(coasterRider.spot)) coasterRider = null;
      else {
        const s = train.s;
        if (train.state === 'run' && coasterRider.shouted === 0 && s > sTop - 18) { coasterRider.shouted = 1; toast('⛓️ Clack... clack... clack... up the lift hill. The whole city is below you!'); }
        if (coasterRider.shouted === 1 && s > sTop + 2) { coasterRider.shouted = 2; toast('😱 AAAAAAH! Down the big drop!'); }
        if (coasterRider.shouted === 2 && s > sTop + 60) { coasterRider.shouted = 3; toast('🌀 Round the twists, faster and faster!'); }
        if (train.laps > coasterRider.lapAt) { ctx.unseat(coasterRider.spot); coasterRider = null; toast('⚡ What a ride! Your legs are like jelly.'); stats.energy = Math.min(100, stats.energy + 8); ctx.gainXp?.(6); }
      }
    }
  };
  ctx.destinations?.push({ name: 'Thunderbolt rollercoaster', x: 452, z: -644 });

  // ---------------- simple timed rides: pirate ship and teacups ----------------
  let rider = null;
  const board = (R, follow, len) => {
    if (rider || coasterRider) return toast('You\'re already on a ride.');
    if (stats.gold < R.price) return toast(`The ${R.name.toLowerCase()} costs ${R.price} gold.`);
    stats.gold -= R.price; const p = follow();
    const spot = { x: p.x, z: p.z, seatY: p.y, yaw: p.yaw ?? 0, ride: R.name, follow, label: R.name };
    rider = { R, spot, t: 0, len }; ctx.seat(spot); toast(`🎡 Enjoy the ${R.name.toLowerCase()}! (Press E to get off.)`);
  };
  // pirate ship: a galleon swinging from an A-frame
  const ship = new THREE.Group(); ship.position.set(SHIP.x, SHIP.pivot, SHIP.z); root.add(ship);
  { for (const s of [-1, 1]) for (const lx of [-1, 1]) { const leg = C(root, 0.3, 0.38, SHIP.pivot / Math.cos(0.42) + 0.4, SHIP.x + lx * Math.tan(0.42) * SHIP.pivot / 2, SHIP.pivot / 2, SHIP.z + s * 3.2, 0x7b2cbf); leg.rotation.z = lx * 0.42; }
    C(root, 0.35, 0.35, 7, SHIP.x, SHIP.pivot, SHIP.z, gold).rotation.x = Math.PI / 2;
    const hull = new THREE.Group(); hull.position.y = -SHIP.arm; ship.add(hull);
    const shape = new THREE.Shape(); shape.moveTo(-7, 1.2); shape.quadraticCurveTo(-6.5, -0.4, -4, -1.1); shape.lineTo(4, -1.1); shape.quadraticCurveTo(6.5, -0.4, 7, 1.2); shape.lineTo(-7, 1.2);
    const hg = new THREE.ExtrudeGeometry(shape, { depth: 3.2, bevelEnabled: false }); hg.translate(0, 0, -1.6); const hm = new THREE.Mesh(hg, mat(0x6b3f1f)); hm.castShadow = true; hull.add(hm);
    B(hull, 13.6, 0.12, 3.0, 0, 1.15, 0, 0xc9a26a); for (let i = -5; i <= 5; i++) B(hull, 0.6, 0.5, 2.8, i * 1.1, 1.45, 0, 0x8b1a1a);   // benches
    for (const s of [-1, 1]) B(hull, 14, 0.3, 0.1, 0, 1.0, s * 1.62, 0xf2c14e);
    C(hull, 0.12, 0.12, 6, 0, 4.2, 0, 0x5a3b22, 8); const sail = B(hull, 0.05, 3, 3.6, 0, 4.6, 0, 0xf6f1e7); sail.rotation.y = Math.PI / 2;
    const flag = B(hull, 0.02, 0.6, 0.9, 0, 7.0, 0.45, 0x111111); flag.rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) C(ship, 0.09, 0.09, SHIP.arm, s * 2.2, -SHIP.arm / 2, 0, steel, 6).rotation.z = s * 0.3;
    solid(SHIP.x - 9.5, SHIP.x + 9.5, SHIP.z - 4, SHIP.z + 4);
    const s = label('THE JOLLY ROGER', 'swinging pirate ship', 4.8, '#111111', '#f2c14e'); s.position.set(SHIP.x, 2.6, SHIP.z + 4.3); root.add(s);
    person(SHIP.x + 4, SHIP.z + 4.8, Math.PI, 0x111111);
  }
  let shipT = 0, shipA = 0;
  interactables.push({ pos: new THREE.Vector3(SHIP.x, 0, SHIP.z + 5.2), r: 2.4, label: `Ride the pirate ship (${SHIP.price} gold)`, action: () => board(SHIP, () => { ship.updateMatrixWorld(true); const p = ship.localToWorld(tmp.set(5.5, -SHIP.arm + 1.6, 0.6)); return { x: p.x, y: p.y + 0.3, z: p.z, yaw: -Math.PI / 2 }; }, SHIP.len) });
  // teacups: a turntable with six cups that each spin
  const table = new THREE.Group(); table.position.set(CUPS.x, 0, CUPS.z); root.add(table); const cups = [];
  { const base = C(root, CUPS.r + 0.6, CUPS.r + 0.8, 0.35, CUPS.x, 0.17, CUPS.z, 0xf6f1e7, 32); base.receiveShadow = true; C(table, CUPS.r, CUPS.r, 0.12, 0, 0.4, 0, 0x7fc8e8, 32); C(table, 0.6, 0.8, 2.6, 0, 1.6, 0, 0xff8fb1, 16);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 14), mat(0xff8fb1)); pot.position.y = 3.4; table.add(pot);
    const cupCols = [0xff6b6b, 0x6bc5ff, 0xffd23f, 0x9dff6b, 0xc58fff, 0xff9f43];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.cos(a) * 3.9, 0.46, Math.sin(a) * 3.9); table.add(g);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 1.1, 20, 1, true), mat(cupCols[i], { side: THREE.DoubleSide })); cup.position.y = 0.6; g.add(cup); C(g, 0.8, 0.8, 0.1, 0, 0.1, 0, cupCols[i], 20);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 12), mat(cupCols[i])); handle.position.set(1.25, 0.65, 0); g.add(handle); C(g, 0.25, 0.25, 0.6, 0, 0.45, 0, 0xffffff, 10);
      cups.push(g); }
    colliders.push({ circleX: CUPS.x, circleZ: CUPS.z, circleRadius: CUPS.r + 0.6 });
    const s = label('TEACUPS', 'spin your own cup!', 3.6, '#ff8fb1', '#ffffff'); s.position.set(CUPS.x, 2.4, CUPS.z - CUPS.r - 1.4); s.rotation.y = Math.PI; root.add(s);
  }
  interactables.push({ pos: new THREE.Vector3(CUPS.x, 0, CUPS.z - CUPS.r - 1.6), r: 2.2, label: `Ride the teacups (${CUPS.price} gold)`, action: () => board(CUPS, () => { cups[0].updateMatrixWorld(true); const p = cups[0].localToWorld(tmp.set(0, 0.4, 0)); return { x: p.x, y: p.y + 0.5, z: p.z, yaw: -(table.rotation.y + cups[0].rotation.y) }; }, CUPS.len) });

  // ---------------- game booths: every game has its own ----------------
  const placed = [];
  const iconTex = new Map();
  const signTex = g => { const t = makeTex(256, 80, c => { c.fillStyle = '#2b0f4a'; c.fillRect(0, 0, 256, 80); c.fillStyle = '#ffd23f'; c.fillRect(0, 70, 256, 10); c.font = '40px sans-serif'; c.textAlign = 'left'; c.fillText(g.icon, 6, 50); c.font = 'bold 22px Georgia, serif'; c.fillStyle = '#ffd23f'; const words = g.name.replace(/\s*\(.*\)/, ''); c.fillText(words, 58, 34, 192); c.font = 'italic 15px Georgia, serif'; c.fillStyle = '#ffffff'; c.fillText(`${g.where} · ${g.price} gold`, 58, 58, 192); }); return t; };
  const iconOf = g => { if (!iconTex.has(g.icon)) iconTex.set(g.icon, makeTex(64, 64, c => { c.font = '52px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(g.icon, 32, 36); })); return iconTex.get(g.icon); };
  // rot: 0 = front faces +z. Footprint: x -2.2..2.2, z -1.5..1.2 in local space
  const footprint = (x, z, rot, hw = 2.2, back = 1.5, front = 1.2) => { const c = Math.cos(rot), s = Math.sin(rot); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [lx, lz] of [[-hw, -back], [hw, -back], [-hw, front], [hw, front]]) { const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); z0 = Math.min(z0, wz); z1 = Math.max(z1, wz); } solid(x0, x1, z0, z1); };
  const toWorld = (x, z, rot, lx, lz) => new THREE.Vector3(x + lx * Math.cos(rot) + lz * Math.sin(rot), 0, z - lx * Math.sin(rot) + lz * Math.cos(rot));
  let bi = 0;
  const booth = (x, z, rot, g, under = false) => {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot; root.add(grp); const k = bi++;
    if (g.where === 'Arcade') {   // an arcade cabinet rather than a stall
      const glow = mat([0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f][k % 4], { emissive: [0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f][k % 4], ei: 1.6 });
      B(grp, 2.4, 2.3, 1.6, 0, 1.15, -0.4, 0x15151c); B(grp, 2.0, 1.1, 0.04, 0, 1.6, 0.42, glow); B(grp, 2.2, 0.15, 0.7, 0, 1.0, 0.6, 0x2b2b33); B(grp, 2.4, 0.35, 0.3, 0, 2.45, 0.3, glow);
      const ic = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: iconOf(g), transparent: true })); ic.position.set(0, 1.6, 0.45); grp.add(ic);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshBasicMaterial({ map: signTex(g) })); sg.position.set(0, 2.98, 0.2); grp.add(sg);
      footprint(x, z, rot, 1.25, 1.25, 1.0);
    } else {
      const wall = [0x6d0f1f, 0x1f3a8a, 0x14532d, 0x4a1d6b, 0x7a3e00, 0x7a0f4a][k % 6];
      B(grp, 4.4, 2.8, 0.15, 0, 1.4, -1.45, wall); for (const s of [-1, 1]) B(grp, 0.15, 2.8, 2.7, s * 2.2, 1.4, -0.15, wall);
      B(grp, 4.4, 1.0, 0.7, 0, 0.5, 0.85, 0xf6f1e7); B(grp, 4.5, 0.08, 0.8, 0, 1.02, 0.85, 0xc9a26a);
      if (!under) { const aw = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 3.4), stripeMats[k % stripeMats.length]); aw.position.set(0, 3.0, -0.05); aw.rotation.x = -0.12; grp.add(aw); }
      for (let i = 0; i < 5; i++) { const pr = B(grp, 0.42, 0.5, 0.35, -1.6 + i * 0.8, 2.15, -1.25, [0xc9a26a, 0xff8fb1, 0x6bc5ff, 0x9dff6b, 0xffd23f][(i + k) % 5]); pr.castShadow = false; }
      const ic = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: iconOf(g), transparent: true })); ic.position.set(0, 1.45, -1.36); grp.add(ic);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.125), new THREE.MeshBasicMaterial({ map: signTex(g) })); sg.position.set(0, under ? 3.05 : 3.55, 1.0); sg.rotation.x = -0.08; grp.add(sg);
      footprint(x, z, rot);
      const w = toWorld(x, z, rot, 0.6, -0.4); person(w.x, w.z, rot, [0xc0392b, 0x2980b9, 0x8e44ad, 0x16a085, 0xf39c12, 0x2c3e50][k % 6]);
    }
    const front = toWorld(x, z, rot, 0, 2.1);
    interactables.push({ pos: front, r: 2.0, label: `Play ${g.name} (${g.price} gold)`, action: () => ctx.games?.open(g.id) });
    placed.push({ id: g.id, x: front.x, z: front.z });
  };
  const rest = GAMES.filter(g => !FIXED.includes(g.id));
  // the extension: two facing rows along the aisle
  const extRows = []; for (let z = -704; z <= -651; z += 6.5) extRows.push(z);
  const extGames = rest.filter(g => g.where !== 'Arcade').slice(0, extRows.length * 2), pavGames = rest.filter(g => !extGames.includes(g));
  extRows.forEach((z, i) => { if (extGames[i * 2]) booth(410.2, z, Math.PI / 2, extGames[i * 2]); if (extGames[i * 2 + 1]) booth(432.0, z, -Math.PI / 2, extGames[i * 2 + 1]); });
  // the Games Pavilion: a big striped canopy over four columns of booths
  { const x0 = 262, x1 = 299, z0 = -706, z1 = -664, H = 5.2;
    B(root, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0.05, (z0 + z1) / 2, 0x8a6a46, { rough: 0.9 });
    for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 4) for (const z of [z0, z1]) C(root, 0.18, 0.18, H, x, H / 2, z, red, 8);
    for (const x of [x0, x1]) for (let z = z0; z <= z1; z += (z1 - z0) / 4) C(root, 0.18, 0.18, H, x, H / 2, z, red, 8);
    const roofT = stripes('#c8102e', '#f6f1e7', 16); roofT.repeat.set(4, 1);
    for (const [cz, rx] of [[z0 + (z1 - z0) / 4, -0.22], [z1 - (z1 - z0) / 4, 0.22]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 1, 0.12, (z1 - z0) / 2 + 0.8), new THREE.MeshStandardMaterial({ map: roofT })); r.position.set((x0 + x1) / 2, H + 2.3, cz); r.rotation.x = rx; root.add(r); }
    const s = label('GAMES PAVILION', 'games from all round the world · prize counter inside', 12); s.position.set((x0 + x1) / 2, H + 1.0, z0 - 0.3); s.rotation.y = Math.PI; root.add(s);
    for (let i = 0; i <= 60; i++) bulb(root, x0 + i * (x1 - x0) / 60, H - 0.1, z0 - 0.15, i);
    for (let i = 0; i <= 60; i++) bulb(root, x0 + i * (x1 - x0) / 60, H - 0.1, z1 + 0.15, i);
    const cols = [[265.2, Math.PI / 2], [276.4, -Math.PI / 2], [281.6, Math.PI / 2], [295.8, -Math.PI / 2]], rows = []; for (let z = -701.5; z <= -668; z += 5.4) rows.push(z);
    let gi = 0;
    for (const z of rows) for (const [x, r] of cols) {
      if (gi === 0) { // the prize counter takes the first slot at the entrance
        const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = r; root.add(grp);
        B(grp, 4.4, 2.8, 0.15, 0, 1.4, -1.45, 0xffd23f); for (const s2 of [-1, 1]) B(grp, 0.15, 2.8, 2.7, s2 * 2.2, 1.4, -0.15, 0xffd23f); B(grp, 4.4, 1.1, 0.7, 0, 0.55, 0.85, 0x2b0f4a);
        for (let i = 0; i < 12; i++) { const pr = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat([0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f, 0xff5a3c, 0x8a5cff][i % 6])); pr.position.set(-1.8 + (i % 6) * 0.72, 1.6 + Math.floor(i / 6) * 0.6, -1.2); grp.add(pr); }
        const sg = label('PRIZE COUNTER', 'swap your tickets', 3.6, '#2b0f4a', '#ffd23f'); sg.position.set(0, 3.05, 1.0); grp.add(sg);
        footprint(x, z, r); const w = toWorld(x, z, r, 0.4, -0.4); person(w.x, w.z, r, 0xffd23f);
        const f = toWorld(x, z, r, 0, 2.1); interactables.push({ pos: f, r: 2.0, label: 'Prize counter: swap tickets for prizes', action: () => ctx.games?.openCounter() });
        gi++; continue;
      }
      const g = pavGames[gi - 1]; gi++; if (!g) continue; booth(x, z, r, g, true);
    }
  }
  // the four original stalls now run the real games too (funfair.js keeps the buildings)

  // ---------------- kiosks: souvenirs, sweets, balloons, candy floss ----------------
  const sell = (name, icon, price) => ({ name, icon, price, button: 'Buy', onBuy: () => { if (stats.gold < price) return false; ctx.giveItem?.({ name, icon }); } });
  const kiosks = [
    { x: 316, title: 'Fairground souvenirs', c: 0x1f6fd1, items: [sell('Westhaven Funfair T-shirt', '👕', 12), sell('Snow globe', '🔮', 8), sell('Fridge magnet', '🧲', 3), sell('Funfair cap', '🧢', 7), sell('Postcard', '🖼️', 1), sell('Light-up spinner', '✨', 5)] },
    { x: 332, title: 'Sweet shop', c: 0xe11d74, items: [{ name: 'Candy floss', icon: '🍭', price: 3, energy: 8 }, { name: 'Toffee apple', icon: '🍎', price: 3, hunger: 6, energy: 6 }, { name: 'Bag of pick-n-mix', icon: '🍬', price: 4, energy: 10 }, { name: 'Popcorn', icon: '🍿', price: 3, hunger: 8 }, { name: 'Churros', icon: '🥖', price: 4, hunger: 12 }, { name: 'Candied nuts', icon: '🥜', price: 3, hunger: 8 }] },
    { x: 348, title: 'Balloon seller', c: 0x1e9e4a, items: [sell('Red balloon', '🎈', 2), sell('Heart balloon', '💖', 3), sell('Unicorn balloon', '🦄', 5), sell('Star balloon', '⭐', 4), sell('Dinosaur balloon', '🦖', 5)] },
  ];
  for (const k of kiosks) { const g = new THREE.Group(); g.position.set(k.x, 0, -705); root.add(g);
    B(g, 3.2, 2.4, 2.2, 0, 1.2, 0, k.c); B(g, 2.2, 1.0, 0.05, 0, 1.6, -1.12, 0x222222); B(g, 3.4, 0.15, 0.6, 0, 1.0, -1.35, 0xf6f1e7);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 4), stripeMats[(k.x / 16) % stripeMats.length | 0]); roof.position.y = 3.05; roof.rotation.y = Math.PI / 4; g.add(roof);
    const sg = label(k.title.toUpperCase(), '', 3.0, '#2b0f4a', '#ffd23f'); sg.position.set(0, 2.15, -1.16); sg.rotation.y = Math.PI; g.add(sg);
    if (k.title === 'Balloon seller') for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat([0xff3b30, 0xffd23f, 0x22c55e, 0x3b82f6, 0xff2bd6, 0xffffff][i % 6], { rough: 0.25 })); b.position.set(-1.2 + (i % 4) * 0.8, 4.0 + Math.floor(i / 4) * 0.55 + (i % 2) * 0.2, -1.6 + Math.floor(i / 4) * 0.3); g.add(b); }
    solid(k.x - 1.7, k.x + 1.7, -706.2, -703.8); person(k.x + 0.6, -704.6, Math.PI, k.c);
    interactables.push({ pos: new THREE.Vector3(k.x, 0, -707.4), r: 2.0, label: k.title, action: () => ctx.openShop?.(k.title, k.items) }); }

  // ---------------- Starlight Cinema ----------------
  { const { x, z, w, d } = CINEMA, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, H = 13;
    B(root, w, H, d, x, H / 2, z, 0x2a1a3a, { rough: 0.8 });
    B(root, w + 0.6, 1.2, d + 0.6, x, H + 0.6, z, 0x8a6a2a, { metal: 0.4 });
    // art-deco front: marquee, canopy with bulbs, poster frames, glass doors
    B(root, 0.6, 3.6, 18, x0 - 0.3, 9.6, z, 0x111111);
    const mq = label('STARLIGHT CINEMA', 'now showing · every film, every night', 17, '#111111', '#ffd23f'); mq.position.set(x0 - 0.62, 9.6, z); mq.rotation.y = -Math.PI / 2; root.add(mq);
    B(root, 4, 0.4, 16, x0 - 2, 4.6, z, 0x8a6a2a, { metal: 0.4 }); for (let i = 0; i <= 40; i++) bulb(root, x0 - 4, 4.4, z - 8 + i * 0.4, i);
    for (const s of [-1, 1]) C(root, 0.15, 0.15, 4.5, x0 - 3.8, 2.25, z + s * 7.6, gold, 8);
    const poster = (t, c) => makeTex(128, 192, g => { g.fillStyle = c; g.fillRect(0, 0, 128, 192); g.fillStyle = '#fff'; g.font = 'bold 18px Georgia, serif'; g.textAlign = 'center'; g.fillText(t, 64, 150, 120); g.font = '60px sans-serif'; g.fillText(['🚀', '🐉', '💘', '🕵️'][t.length % 4], 64, 90); });
    ['STAR VOYAGE', 'DRAGON KING', 'LOVE IN PARIS', 'THE LAST CLUE'].forEach((t, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ map: poster(t, ['#1f3a8a', '#7a0f1f', '#a0306b', '#1a1a1a'][i]) })); p.position.set(x0 - 0.05, 2.0, z + (i < 2 ? -12 - i * 2.2 : 10 + (i - 2) * 2.2)); p.rotation.y = -Math.PI / 2; root.add(p); });
    B(root, 0.1, 2.8, 5, x0 - 0.05, 1.4, z, 0x9fd6ff, { metal: 0.6, rough: 0.1 });
    solid(x0, x1, z0, z1);
    ctx.civicBuildings?.push({ type: 'cinema', name: CINEMA.name, x, z, minX: x0, maxX: x1, minZ: z0, maxZ: z1 });
    ctx.destinations?.push({ name: CINEMA.name, x: x0 - 5, z });
    person(x0 - 2.5, z + 5, -Math.PI / 2, 0x7a0f1f);
  }

  // ---------------- visitors in the new half ----------------
  const crowd = [];
  if (ctx.makePerson) {
    const loops = [[[402, -711], [421, -711], [421, -650], [421, -711], [520, -711], [525, -672], [520, -711]], [[421, -650], [452, -646.5], [421, -650], [421, -690]], [[270.8, -708], [270.8, -664], [289, -664], [289, -708]], [[289, -708], [289, -664], [270.8, -664], [270.8, -708]], [[205, -708], [230, -708], [214, -689], [205, -708]]];
    loops.forEach((pts, i) => { for (let k = 0; k < 4; k++) { const h = ctx.makePerson({ outfit: [0xc0392b, 0x2980b9, 0x8e44ad, 0x16a085, 0xf39c12, 0x2c3e50, 0xe84393][(i * 4 + k) % 7], hair: [0x2b1d14, 0xc9a26a, 0x111111, 0x5a3b22][(i + k) % 4], skin: [0xffdcc0, 0x8d5a3b, 0xd9a07a, 0x6b4430][(i + k * 3) % 4], pants: [0x2d3142, 0x1f3a5a, 0x4a3a2a][k % 3] }); crowd.push({ h, pts, t: k * 11 + i * 5, speed: 1.1 + (k % 3) * 0.2 });
      if (k % 2 === 0) { const kid = ctx.makePerson({ child: true, outfit: [0xff6b9d, 0x4dabf7, 0xffd43b, 0x69db7c][(i + k) % 4], hair: [0x2b1d14, 0x111111, 0xc9a26a][(i + k) % 3], skin: [0xffdcc0, 0x8d5a3b, 0xd9a07a, 0x6b4430][(i + k * 3) % 4], pants: 0x3b5bdb }); crowd.push({ h: kid, pts, t: k * 11 + i * 5 - 1.1, speed: 1.1 + (k % 3) * 0.2, kid: true }); } } });
  }

  // ---------------- update ----------------
  let clock = 0;
  function update(dt, playerPos, night) {
    clock += dt;
    const near = Math.hypot(playerPos.x - 380, playerPos.z + 690) < 360;
    if (!near && !rider && !coasterRider) return;
    coasterTick(dt);
    // pirate ship: swings up higher and higher, then settles, on a cycle
    shipT += dt; { const c = shipT % 34, amp = c < 26 ? Math.min(1, c / 12) * 1.1 : Math.max(0, 1 - (c - 26) / 8) * 1.1; shipA = amp * Math.sin(shipT * Math.PI * 2 / 5.2); ship.rotation.z = shipA; }
    // teacups: turntable one way, cups the other
    table.rotation.y += dt * 0.7; cups.forEach((c, i) => { c.rotation.y -= dt * (1.6 + (i % 3) * 0.5); });
    const k = Math.floor(clock * 6); bulbMats.forEach((m, i) => { m.emissiveIntensity = night ? ((k + i) % bulbMats.length < 3 ? 2.6 : 0.6) : 0.5; });
    for (const c of crowd) { c.t += dt * c.speed;
      const n = c.pts.length, segs = c.pts.map((a, i) => { const b = c.pts[(i + 1) % n]; return Math.hypot(b[0] - a[0], b[1] - a[1]); }), total = segs.reduce((x, y) => x + y, 0);
      let d = c.t % total, i = 0; while (d > segs[i]) { d -= segs[i]; i++; }
      const a = c.pts[i], b = c.pts[(i + 1) % n], u = d / segs[i];
      c.h.root.position.set(a[0] + (b[0] - a[0]) * u, 0.05, a[1] + (b[1] - a[1]) * u); c.h.root.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); ctx.animatePerson?.(c.h, true, dt); }
    for (const p of people) if (Math.abs(p.h.root.position.x - playerPos.x) < 40 && Math.abs(p.h.root.position.z - playerPos.z) < 40) { const { armR } = p.h; if (armR) armR.pivot.rotation.x = -0.4 + Math.sin(clock * 2 + p.ph) * 0.35; }
    if (rider) { rider.t += dt;
      if (!ctx.isSeated(rider.spot)) rider = null;
      else if (rider.t > rider.len) { ctx.unseat(rider.spot); toast(`That was fun! Back at the ${rider.R.name.toLowerCase()}.`); stats.energy = Math.min(100, stats.energy + 6); ctx.gainXp?.(4); rider = null; } }
  }
  return { update, coaster, train, placed, get riding() { return rider || coasterRider; }, people, crowd };
}
