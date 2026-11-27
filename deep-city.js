// DEEPHAVEN: the underwater city, one of the country's six cities. A glass dome 144 m by 172 m on the sea floor of the
// west bay (20 m down), north of Driftwood Island and the ghost island (Boneharrow), held against the weight of the sea by space magic:
// the Space Core in the middle, a sphere of starlight with six star anchors round the dome's rim.
//
// You walk there: the Deephaven Lift on the west shore (a real lift you ride) takes you down, and a glass tunnel runs along the sea floor
// into the dome. Submarines dock at the port on the dome's north tip.
//
// Checked before placing (a scan of everything in the bay): nothing there reaches below 3 m deep (the islands, the
// moored ships and the resort's jetty sit on the surface; the naval base's piers and its fish are further west), the
// glass's top stays 2.5 m under the surface, the sea floor is at -20, the shore at the lift is empty land, and the
// tunnel runs north of Driftwood Island so it never passes under it. Inside, every building was placed through the world
// grid and fits under the glass.
import * as THREE from 'three';
import { createWorldGrid } from './world-grid.js';
import { createLift } from './lifts.js';
import { createSeaLife } from './deep-sea-life.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DEEP = { x: -128, z: 372, rx: 72, rz: 86, floor: -19.5, h: 17 };
export const DEEP_TUNNEL = { x0: -318, x1: -156, z: 445, half: 3 };
export const DEEP_LIFT = { x: -318, z: 445 };   // on the flat beach (the shore embankment rises west of x -322; the sea starts at x -300)

export function buildDeepCity(ctx) {
  const { scene, K, interactables, toast, makeTex } = ctx;
  const D = DEEP, Y = D.floor, T = DEEP_TUNNEL, root = new THREE.Group(); root.name = 'Deephaven (underwater city)'; scene.add(root);
  const ids = [], destinations = [], grid = createWorldGrid({ cell: 1 });
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1, emissive: o.em ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.op != null, opacity: o.op ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: o.op == null });
  // the city's buildings are merged into one mesh per material (a few draw calls instead of hundreds)
  const bucket = new Map(), add = (g, m) => { if (!bucket.has(m)) bucket.set(m, []); bucket.get(m).push(g.index ? g.toNonIndexed() : g); };
  const mbox = (w, h, d, x, y, z, m) => add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), m);
  const flush = name => { for (const [m, gs] of bucket) { const o = new THREE.Mesh(mergeGeometries(gs), m); o.castShadow = o.receiveShadow = true; o.name = name; root.add(o); } bucket.clear(); };
  const box = (p, w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const id = (cls, kind, mat3, owner, name, x, z) => ids.push({ cls, kind, mat: mat3, owner, seed: 'deep:' + name + ':' + Math.round(x) + ',' + Math.round(z), name, maker: 'Deephaven City Council', pos: { x, z } });
  const solid = (minX, maxX, minZ, maxZ) => ctx.colliders.push({ minX, maxX, minZ, maxZ, baseYAt: () => Y });
  const inDome = (x, z, m = 0) => ((x - D.x) / (D.rx - m)) ** 2 + ((z - D.z) / (D.rz - m)) ** 2 <= 1;
  const roof = (x, z) => { const q = 1 - ((x - D.x) / D.rx) ** 2 - ((z - D.z) / D.rz) ** 2; return q > 0 ? Y + D.h * Math.sqrt(q) : Y; };   // the glass's height over a spot

  // ---------------------------------------------------------------- the dome and the sea outside it
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat(0xcfd8d6, { rough: 0.9 })); floor.scale.set(D.rx, D.rz, 1); floor.rotation.x = -Math.PI / 2; floor.position.set(D.x, Y, D.z); floor.receiveShadow = true; root.add(floor);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7fe3ff, { rough: 0.05, metal: 0.2, op: 0.22, side: THREE.DoubleSide, em: 0x0a3a4a, ei: 0.4 }));
  glass.scale.set(D.rx, D.h, D.rz); glass.position.set(D.x, Y, D.z); glass.renderOrder = 2; root.add(glass);
  const ribs = mat(0xb9c7cf, { metal: 0.8, rough: 0.3 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI, false), pts = c.getPoints(24).map(p => new THREE.Vector3(Math.cos(a) * D.rx * p.x, D.h * p.y, Math.sin(a) * D.rz * p.x));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.18, 6), ribs); tube.position.set(D.x, Y, D.z); root.add(tube); }
  // the sea, seen from inside: a deep blue shell just outside the glass (only its inside faces are drawn, so from the
  // surface you see the dome in the water, and from inside you see deep water all round)
  const sea = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x06304a, side: THREE.BackSide, transparent: true, opacity: 0.92, depthWrite: false }));
  const SEA = { out: 24, h: -0.6 - (Y - 0.2) };   // the shell: 24 m out from the glass all round, its top 0.6 m under the surface
  sea.scale.set(D.rx + SEA.out, SEA.h, D.rz + SEA.out); sea.position.set(D.x, Y - 0.2, D.z); root.add(sea);
  // how high the shell is at a distance out from the glass (the fish keep under it); the narrower side is the tighter one
  const shellTop = out => Y - 0.2 + SEA.h * Math.sqrt(Math.max(0, 1 - ((D.rx + out) / (D.rx + SEA.out)) ** 2));
  let seaLife = null;   // the fish, coral and kelp (deep-sea-life.js): made the first time you come down
  id('BLD', 'DOM', 'GLS.STL', 'GOV', 'Deephaven dome', D.x, D.z);

  // ---------------------------------------------------------------- the Space Core
  const coreG = new THREE.Group(); coreG.name = 'Space Core'; root.add(coreG);
  const stars = makeTex(512, 256, g => { g.fillStyle = '#05021a'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${200 + (i % 55)},${200 + (i * 7) % 55},255,${0.4 + (i % 6) / 10})`; g.fillRect((i * 97) % 512, (i * 53) % 256, i % 9 ? 1 : 2, i % 9 ? 1 : 2); } const r = g.createRadialGradient(256, 128, 10, 256, 128, 160); r.addColorStop(0, 'rgba(140,90,255,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 256); });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 20), new THREE.MeshBasicMaterial({ map: stars })); orb.position.set(D.x, Y + 9, D.z); coreG.add(orb);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 8, 64), mat(0xc9b6ff, { em: 0x8a6aff, ei: 2 })); halo.position.copy(orb.position); coreG.add(halo);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 1.2, 32), mat(0x2b2f45, { metal: 0.6 })); plinth.position.set(D.x, Y + 0.6, D.z); coreG.add(plinth); solid(D.x - 4.5, D.x + 4.5, D.z - 4.5, D.z + 4.5);
  const light = new THREE.PointLight(0xa58bff, 2.4, 140, 1.2); light.position.copy(orb.position); coreG.add(light);
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 300 }, (_, i) => [Math.cos(i) * (5 + (i % 7)), Math.sin(i * 1.7) * 2.5, Math.sin(i) * (5 + (i % 7))]).flat(), 3)), new THREE.PointsMaterial({ color: 0xe6ddff, size: 0.18 }));
  motes.position.copy(orb.position); coreG.add(motes);
  const anchors = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = D.x + Math.cos(a) * (D.rx - 3), z = D.z + Math.sin(a) * (D.rz - 3), s = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: 0xd9ccff })); s.position.set(x, Y + 3, z); coreG.add(s);
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([s.position.clone(), orb.position.clone()]), new THREE.LineBasicMaterial({ color: 0x9d86ff, transparent: true, opacity: 0.5 })); coreG.add(beam); anchors.push(s);
    grid.place({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.5, maxZ: z + 1.5 }, { name: 'star anchor', minY: Y, maxY: Y + 5 }); }
  id('MCH', 'SPC', 'NON', 'GOV', 'Deephaven Space Core', D.x, D.z);
  grid.place({ minX: D.x - 17, maxX: D.x + 17, minZ: D.z - 17, maxZ: D.z + 17 }, { name: 'core plaza', minY: Y, maxY: Y + 14 });
  { const pl = new THREE.Mesh(new THREE.RingGeometry(5, 16, 48), mat(0xb7c9cc, { rough: 0.7 })); pl.rotation.x = -Math.PI / 2; pl.position.set(D.x, Y + 0.025, D.z); pl.receiveShadow = true; root.add(pl); }

  // ---------------------------------------------------------------- streets and buildings
  const path = mat(0x9fb3b8, { rough: 0.85 });
  const ringPath = new THREE.Mesh(new THREE.RingGeometry(0.79, 0.87, 64), path); ringPath.scale.set(D.rx, D.rz, 1); ringPath.rotation.x = -Math.PI / 2; ringPath.position.set(D.x, Y + 0.02, D.z); root.add(ringPath);
  { const s = box(root, 4, 0.04, D.rz * 2 - 4, D.x, Y + 0.02, D.z, path); s.castShadow = false; }   // the north-south way, from the sub port to the south end
  { const s = box(root, D.rx * 2 - 4, 0.04, 4, D.x, Y + 0.021, D.z, path); s.castShadow = false; }   // the east-west way, through the core plaza
  { const s = box(root, D.x - T.x1 - 8 + 8, 0.04, 4, (T.x1 + D.x) / 2, Y + 0.02, T.z, path); s.castShadow = false; }   // the way in from the tunnel
  grid.place({ minX: D.x - 2.5, maxX: D.x + 2.5, minZ: D.z - D.rz, maxZ: D.z + D.rz }, { name: 'north-south way', layer: 'ground', maxY: Y + 0.1 });
  grid.place({ minX: D.x - D.rx, maxX: D.x + D.rx, minZ: D.z - 2.5, maxZ: D.z + 2.5 }, { name: 'east-west way', layer: 'ground', maxY: Y + 0.1 });
  const pearl = mat(0xf2efe6, { rough: 0.4 }), coral = mat(0xff8f7a, { rough: 0.6 }), sea2 = mat(0x4fb3c8, { rough: 0.3, metal: 0.3 }), lamp = mat(0xbff6ff, { em: 0x7fe9ff, ei: 1.5 });
  const NAMES = ['Coral House', 'Pearl Hall', 'Tidewatch', 'Kelp Court', 'Nautilus Lofts', 'Lantern Market', 'Abyss Academy', 'Brine Exchange', 'Anemone Row', 'Starfall Clinic', 'Current House', 'Driftglass Studios', 'Reefside Apartments', 'Mariner Hall', 'Seaglass Court', 'Undertow Theatre', 'Bathysphere Labs', 'Shell Street Baths', 'Lagoon Lofts', 'Trench Tower', 'Siren Bakery', 'Moonpool Library'];
  let n = 0;
  for (let gx = D.x - D.rx + 5; gx <= D.x + D.rx - 5; gx += 8.5) for (let gz = D.z - D.rz + 5; gz <= D.z + D.rz - 5; gz += 8.5) {
    const w = 6 + ((gx * 3 + gz) & 1) * 1.5, d = 6 + ((gx + gz * 3) & 1) * 1.5, x0 = gx - w / 2, x1 = gx + w / 2, z0 = gz - d / 2, z1 = gz + d / 2;
    if (![[x0, z0], [x1, z0], [x0, z1], [x1, z1]].every(([x, z]) => inDome(x, z, 4))) continue;
    if (Math.abs(gz - T.z) < 6 && gx < D.x) continue;                      // the way in from the tunnel
    if (Math.abs(gz - D.z) < d / 2 + 3) continue;                              // the east-west way
    const ks = [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [gx, gz]].map(([x, z]) => Math.hypot((x - D.x) / D.rx, (z - D.z) / D.rz));
    if (Math.max(...ks) >= 0.76) continue;                                       // keep the ring path round the edge clear (people walk it)
    if (Math.abs(gx - D.x) < w / 2 + 3) continue;                                // and the north-south way
    const under = Math.min(roof(x0, z0), roof(x1, z0), roof(x0, z1), roof(x1, z1)) - Y - 1.2;   // room under the glass
    if (under < 4) continue;
    const h = Math.min(under, 4 + ((Math.abs(gx * 7 + gz * 11)) % 10)), name = NAMES[n % NAMES.length] + (n >= NAMES.length ? ' ' + (Math.floor(n / NAMES.length) + 1) : '');
    if (grid.place({ minX: x0 - 1, maxX: x1 + 1, minZ: z0 - 1, maxZ: z1 + 1 }, { name, minY: Y, maxY: Y + h }) == null) continue;
    if (n % 3 === 2) { add(new THREE.CylinderGeometry(w / 2, w / 2, h, 20).translate(gx, Y + h / 2, gz), n % 2 ? coral : pearl);
      add(new THREE.SphereGeometry(w / 2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(gx, Y + h, gz), sea2); }
    else { mbox(w, h, d, gx, Y + h / 2, gz, n % 2 ? pearl : coral); mbox(w + 0.3, 0.3, d + 0.3, gx, Y + h, gz, sea2); }
    for (const s of [-1, 1]) for (const zz of [z0 - 0.06, z1 + 0.06]) mbox(0.8, 0.8, 0.1, gx + s * w / 4, Y + Math.min(h - 1, 2.6), zz, lamp);
    if (h > 7) for (let y = 5.6; y < h - 0.8; y += 3) for (const zz of [z0 - 0.06, z1 + 0.06]) mbox(w * 0.7, 0.6, 0.1, gx, Y + y, zz, lamp);   // upper-floor windows
    solid(x0, x1, z0, z1);
    id('BLD', h > 8 ? 'APT' : 'GEN', 'GLS.CON', 'GOV', name, gx, gz); n++;
  }
  flush('Deephaven buildings');

  // ---------------------------------------------------------------- the tunnel and the lift
  const tg = new THREE.Group(); tg.name = 'Deephaven glass tunnel'; root.add(tg);
  const tlen = T.x1 - T.x0 + 2;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(T.half + 0.3, T.half + 0.3, tlen, 24, 1, true), mat(0x8fe9ff, { op: 0.25, side: THREE.DoubleSide, rough: 0.05 })); tube.rotation.z = Math.PI / 2; tube.position.set((T.x0 + T.x1) / 2, Y, T.z); tube.renderOrder = 2; tg.add(tube);
  const tseaM = new THREE.Mesh(new THREE.CylinderGeometry(T.half + 11, T.half + 11, tlen, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x06304a, side: THREE.BackSide, transparent: true, opacity: 0.92, depthWrite: false })); tseaM.rotation.z = Math.PI / 2; tseaM.position.copy(tube.position); tg.add(tseaM);
  { const f = box(tg, tlen, 0.2, T.half * 2, (T.x0 + T.x1) / 2, Y - 0.1, T.z, path); f.castShadow = false; }
  for (let x = T.x0 + 4; x < T.x1; x += 8) box(tg, 0.8, 0.12, 0.8, x, Y + T.half + 0.1, T.z, lamp);
  id('LND', 'TUN', 'GLS', 'GOV', 'Deephaven glass tunnel', (T.x0 + T.x1) / 2, T.z);
  // the lift at the bottom of the shaft, and the lift house up on the shore
  // the lobby at the bottom of the shaft (x -320.6 to -318): a small steel room the tunnel opens out of
  { const lm = mat(0x2b2f45, { metal: 0.6 }); box(tg, 2.6, 0.2, T.half * 2, -319.3, Y - 0.1, T.z, path); box(tg, 3, 0.3, T.half * 2 + 0.6, -319.3, Y + 4.1, T.z, lm);
    for (const sd of [-1, 1]) { box(tg, 3, 4, 0.3, -319.3, Y + 2, T.z + sd * (T.half + 0.15), lm); solid(-320.8, -317.8, T.z + sd * (T.half + 0.15) - 0.2, T.z + sd * (T.half + 0.15) + 0.2); }
    box(tg, 0.3, 4, T.half * 2, -320.65, Y + 2, T.z, lm); solid(-320.9, -320.4, T.z - T.half, T.z + T.half); }
  const L = DEEP_LIFT, house = new THREE.Group(); house.name = 'Deephaven Lift'; scene.add(house);
  const hm = mat(0xdfe8ec, { rough: 0.5 }), hg = mat(0x6fd3ea, { rough: 0.1, metal: 0.3, em: 0x0a3a4a, ei: 0.5 });
  box(house, 8, 4, 0.3, L.x, 2, L.z - 4, hm); box(house, 8, 4, 0.3, L.x, 2, L.z + 4, hm); box(house, 0.3, 4, 8.3, L.x - 4, 2, L.z, hm);   // open on the east side (the shore path)
  box(house, 8.6, 0.4, 8.6, L.x, 4.2, L.z, hg);
  ctx.colliders.push({ minX: L.x - 4.15, maxX: L.x + 4.15, minZ: L.z - 4.15, maxZ: L.z - 3.85 }, { minX: L.x - 4.15, maxX: L.x + 4.15, minZ: L.z + 3.85, maxZ: L.z + 4.15 }, { minX: L.x - 4.15, maxX: L.x - 3.85, minZ: L.z - 4.15, maxZ: L.z + 4.15 });
  for (const c of ctx.colliders.slice(-3)) c.baseYAt = () => 0;
  const hs = makeTex(512, 128, g => { g.fillStyle = '#062a3a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#9ff0ff'; g.textAlign = 'center'; g.font = 'bold 50px Georgia, serif'; g.fillText('DEEPHAVEN', 256, 64); g.font = '24px sans-serif'; g.fillStyle = '#fff'; g.fillText('lift to the underwater city', 256, 104); });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: hs })); m.position.set(L.x + 4.35, 3.4, L.z); m.rotation.y = Math.PI / 2; house.add(m); }
  id('BLD', 'GEN', 'GLS.STL', 'GOV', 'Deephaven Lift (shore)', L.x, L.z);
  destinations.push({ name: 'Deephaven Lift (to the underwater city)', x: L.x + 6, z: L.z });
  // a real lift: call it, step in, choose the floor and ride the 20 m down with it (lifts.js). Its doors face the shore path.
  const lift = createLift({ scene, colliders: ctx.colliders, x: L.x - 2, z: L.z, rot: Math.PI / 2, floors: [{ y: Y, name: 'Sea floor (Deephaven tunnel)' }, { y: 0, name: 'Shore' }], name: 'Deephaven Lift', toast, resume: ctx.resume });
  for (const sp of [...lift.spots, ...lift.cabSpots]) interactables.push(sp);

  // ---------------------------------------------------------------- the submarine port on the north tip
  const port = new THREE.Group(); port.name = 'Deephaven submarine port'; root.add(port);
  const pz = D.z - D.rz;
  box(port, 10, 5, 4, D.x, Y + 2.5, pz - 1, mat(0x2b2f45, { metal: 0.6 }));
  const sub = new THREE.Group(); sub.name = 'Deephaven submarine (docked)'; port.add(sub);
  { const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.4, 14, 8, 16), mat(0xf2c14e, { metal: 0.4, rough: 0.4 })); hull.rotation.z = Math.PI / 2; sub.add(hull); box(sub, 3, 2.6, 2, 2, 2.8, 0, mat(0xf2c14e)); for (let i = -2; i <= 2; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), hg); w.position.set(i * 2.6, 0.6, 2.42); sub.add(w); } }
  sub.position.set(D.x, Y + 3, pz - 9);
  id('VEH', 'SUB', 'STL', 'GOV', 'Deephaven submarine', D.x, pz - 9);
  id('BLD', 'DCK', 'STL', 'GOV', 'Deephaven submarine port', D.x, pz - 1);

  // people (made the first time you come down, not while the game loads): walkers round the ring path, along both
  // ways and through the tunnel, families, people chatting on the core plaza and waiting at the sub port
  const ringPts = (k, m) => Array.from({ length: m }, (_, i) => { const a = i / m * Math.PI * 2; return [D.x + Math.cos(a) * D.rx * k, D.z + Math.sin(a) * D.rz * k]; });
  const loop = (r, m) => Array.from({ length: m }, (_, i) => { const a = i / m * Math.PI * 2; return [D.x + Math.cos(a) * r, D.z + Math.sin(a) * r]; });
  let peopled = false;
  function populate() {
    peopled = true; const y = Y + 0.05;
    for (let i = 0; i < 12; i++) K.walker(i % 2 ? ringPts(0.83, 48) : ringPts(0.83, 48).reverse(), { t: i * 33, y, off: (i % 3 - 1) * 0.8, speed: 1 + (i % 4) * 0.1 });
    for (let i = 0; i < 2; i++) { const pts = i ? ringPts(0.83, 48) : ringPts(0.83, 48).reverse(), t = 80 + i * 200; K.walker(pts, { t, y, off: 0.5, speed: 1.05 }); K.walker(pts, { t: t - 0.25, y, off: -0.4, speed: 1.05 }); K.walker(pts, { child: true, t: t - 1.3, y, off: 1.2, speed: 1.05 }); }
    for (let i = 0; i < 4; i++) K.walker([[D.x + 1, D.z - D.rz + 6], [D.x + 1, D.z + D.rz - 6]], { y, off: i % 2 ? 0.8 : -0.8, t: i * 40 });
    for (let i = 0; i < 4; i++) K.walker([[D.x - D.rx + 6, D.z + 1], [D.x + D.rx - 6, D.z + 1]], { y, off: i % 2 ? 0.8 : -0.8, t: i * 35 });
    for (let i = 0; i < 6; i++) K.walker(i % 2 ? loop(18, 24) : loop(18, 24).reverse(), { t: i * 19, y, off: (i % 3 - 1) * 0.6 });
    for (let i = 0; i < 3; i++) K.walker([[T.x0 + 4, T.z + (i - 1) * 0.9], [D.x - 4, T.z + (i - 1) * 0.9]], { y, t: i * 60, speed: 1.1 + i * 0.1 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.5, x = D.x + Math.cos(a) * 12, z = D.z + Math.sin(a) * 12, f = Math.atan2(Math.sin(a + 1.6), Math.cos(a + 1.6));
      K.stander(x, z, f, { y, task: 'talk' }); if (k % 2 === 0) K.stander(x + Math.cos(a + 1.6) * 1.2, z + Math.sin(a + 1.6) * 1.2, f + Math.PI, { y, task: 'talk' }); }
    for (const s of [-1, 1]) K.stander(D.x + s * 3, D.z - D.rz + 5, 0, { y });
  }
  destinations.push({ name: 'Deephaven (underwater city)', x: D.x, z: D.z - 10 });

  // ---------------------------------------------------------------- where you can stand
  const inTunnel = (x, z) => x >= -320.5 && x <= T.x1 + 6 && Math.abs(z - T.z) <= T.half;
  const inside = (x, z, y) => y != null && y < Y + 12 && (inDome(x, z) || inTunnel(x, z));
  function groundAt(x, z, bodyY) { const g = lift.groundAt(x, z, bodyY); if (g != null) return g; return bodyY != null && bodyY < -8 && (inDome(x, z) || inTunnel(x, z)) ? Y : null; }
  // the glass and the tunnel walls keep you inside (main.js calls this every frame, straight after you move)
  const EDGE_X = D.x - D.rx * Math.sqrt(1 - ((T.z - D.z) / D.rz) ** 2);   // where the tunnel meets the glass
  function contain(p) {
    if (p && p.y < -8) {
      // the glass and the tunnel walls: you stay inside
      if (inTunnel(p.x, p.z) || Math.abs(p.z - T.z) <= T.half + 0.6 && p.x >= -321 && p.x <= EDGE_X) { p.z = Math.max(T.z - T.half + 0.5, Math.min(T.z + T.half - 0.5, p.z)); p.x = Math.max(-320.1, p.x); }   // (-320.1: the lift lobby's back wall)
      else if (!inDome(p.x, p.z, 0.6) && Math.hypot((p.x - D.x) / D.rx, (p.z - D.z) / D.rz) < 1.25 && p.y > Y - 1 && p.y < Y + D.h) { const dx = (p.x - D.x) / (D.rx - 0.6), dz = (p.z - D.z) / (D.rz - 0.6), k = Math.hypot(dx, dz); if (k > 1) { p.x = D.x + (p.x - D.x) / k; p.z = D.z + (p.z - D.z) / k; } }
    }
  }
  let t = 0;
  function update(dt, p) {
    t += dt; lift.update(dt, p);
    const down = p && (p.y < -5 || Math.hypot(p.x - DEEP_LIFT.x, p.z - DEEP_LIFT.z) < 30);
    if (down && !peopled) populate();
    if (down && !seaLife) seaLife = createSeaLife({ root, D, T, Y, top: shellTop });
    if (seaLife) { seaLife.group.visible = !!(p && p.y < -5); if (seaLife.group.visible) seaLife.update(dt); }
    orb.rotation.y += dt * 0.2; halo.rotation.x = Math.sin(t * 0.4) * 0.6; halo.rotation.y += dt * 0.5; motes.rotation.y -= dt * 0.15; light.intensity = 2.4 + Math.sin(t * 1.3) * 0.4;
    for (const a of anchors) a.rotation.y += dt * 1.5;
    sub.position.y = Y + 3 + Math.sin(t * 0.7) * 0.15;
    contain(p);
    K.update?.(dt, p || { x: D.x, z: D.z }, 160);
  }
  return { root, ids, destinations, groundAt, update, contain, inside, center: D, lift, get seaLife() { return seaLife; }, cityAt: (x, z, y) => inside(x, z, y) || Math.hypot(x - DEEP_LIFT.x, z - DEEP_LIFT.z) < 8 };
}
