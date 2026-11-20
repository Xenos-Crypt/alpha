// DEEPHAVEN: the underwater city, one of the country's six cities. A glass dome on the sea floor of the west bay
// (20 m down), between Driftwood Island and the ghost island, held against the weight of the sea by space magic:
// the Space Core in the middle, a sphere of starlight with six star anchors round the dome's rim.
//
// You walk there: the Deephaven Lift on the west shore takes you down, and a glass tunnel runs along the sea floor
// into the dome. Submarines dock at the port on the dome's north tip.
//
// Checked before placing: nothing in the bay reaches below 3 m deep there (the islands sit on the surface, the
// buoys and fish are further north), the sea floor is at -20, the shore at the lift is empty land, and the tunnel
// runs north of Driftwood Island so it never passes under it. Inside, every building was placed through the world
// grid and fits under the glass.
import * as THREE from 'three';
import { createWorldGrid } from './world-grid.js';

export const DEEP = { x: -155, z: 492, rx: 38, rz: 58, floor: -19.5, h: 15.5 };
export const DEEP_TUNNEL = { x0: -318, x1: -170, z: 445, half: 3 };
export const DEEP_LIFT = { x: -324, z: 445 };

export function buildDeepCity(ctx) {
  const { scene, K, interactables, toast, makeTex } = ctx;
  const D = DEEP, Y = D.floor, T = DEEP_TUNNEL, root = new THREE.Group(); root.name = 'Deephaven (underwater city)'; scene.add(root);
  const ids = [], destinations = [], grid = createWorldGrid({ cell: 1 });
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1, emissive: o.em ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.op != null, opacity: o.op ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: o.op == null });
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
  sea.scale.set(D.rx + 14, D.h + 4.2, D.rz + 14); sea.position.set(D.x, Y - 0.2, D.z); root.add(sea);
  const fish = []; const fishM = mat(0xffb347, { em: 0x663300, ei: 0.4 });
  for (let i = 0; i < 26; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 6), fishM); f.rotation.z = Math.PI / 2; root.add(f); fish.push({ f, a: i * 0.5, r: 1.06 + (i % 4) * 0.05, y: 2 + (i % 6) * 2, s: 0.08 + (i % 5) * 0.02 }); }
  id('BLD', 'DOM', 'GLS.STL', 'GOV', 'Deephaven dome', D.x, D.z);

  // ---------------------------------------------------------------- the Space Core
  const coreG = new THREE.Group(); coreG.name = 'Space Core'; root.add(coreG);
  const stars = makeTex(512, 256, g => { g.fillStyle = '#05021a'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${200 + (i % 55)},${200 + (i * 7) % 55},255,${0.4 + (i % 6) / 10})`; g.fillRect((i * 97) % 512, (i * 53) % 256, i % 9 ? 1 : 2, i % 9 ? 1 : 2); } const r = g.createRadialGradient(256, 128, 10, 256, 128, 160); r.addColorStop(0, 'rgba(140,90,255,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 256); });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 20), new THREE.MeshBasicMaterial({ map: stars })); orb.position.set(D.x, Y + 8, D.z); coreG.add(orb);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 8, 64), mat(0xc9b6ff, { em: 0x8a6aff, ei: 2 })); halo.position.copy(orb.position); coreG.add(halo);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 1.2, 32), mat(0x2b2f45, { metal: 0.6 })); plinth.position.set(D.x, Y + 0.6, D.z); coreG.add(plinth); solid(D.x - 4.5, D.x + 4.5, D.z - 4.5, D.z + 4.5);
  const light = new THREE.PointLight(0xa58bff, 2.4, 90, 1.4); light.position.copy(orb.position); coreG.add(light);
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 300 }, (_, i) => [Math.cos(i) * (5 + (i % 7)), Math.sin(i * 1.7) * 2.5, Math.sin(i) * (5 + (i % 7))]).flat(), 3)), new THREE.PointsMaterial({ color: 0xe6ddff, size: 0.18 }));
  motes.position.copy(orb.position); coreG.add(motes);
  const anchors = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = D.x + Math.cos(a) * (D.rx - 3), z = D.z + Math.sin(a) * (D.rz - 3), s = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: 0xd9ccff })); s.position.set(x, Y + 3, z); coreG.add(s);
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([s.position.clone(), orb.position.clone()]), new THREE.LineBasicMaterial({ color: 0x9d86ff, transparent: true, opacity: 0.5 })); coreG.add(beam); anchors.push(s);
    grid.place({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.5, maxZ: z + 1.5 }, { name: 'star anchor', minY: Y, maxY: Y + 5 }); }
  id('MCH', 'SPC', 'NON', 'GOV', 'Deephaven Space Core', D.x, D.z);
  grid.place({ minX: D.x - 12, maxX: D.x + 12, minZ: D.z - 12, maxZ: D.z + 12 }, { name: 'core plaza', minY: Y, maxY: Y + 14 });

  // ---------------------------------------------------------------- streets and buildings
  const path = mat(0x9fb3b8, { rough: 0.85 });
  const ringPath = new THREE.Mesh(new THREE.RingGeometry(0.79, 0.87, 64), path); ringPath.scale.set(D.rx, D.rz, 1); ringPath.rotation.x = -Math.PI / 2; ringPath.position.set(D.x, Y + 0.02, D.z); root.add(ringPath);
  { const s = box(root, 4, 0.04, D.rz * 2 - 4, D.x, Y + 0.02, D.z, path); s.castShadow = false; }   // the north-south way, from the sub port to the south end
  { const s = box(root, D.x - T.x1 - 8 + 8, 0.04, 4, (T.x1 + D.x) / 2, Y + 0.02, T.z, path); s.castShadow = false; }   // the way in from the tunnel
  grid.place({ minX: D.x - 2.5, maxX: D.x + 2.5, minZ: D.z - D.rz, maxZ: D.z + D.rz }, { name: 'north-south way', layer: 'ground', maxY: Y + 0.1 });
  const pearl = mat(0xf2efe6, { rough: 0.4 }), coral = mat(0xff8f7a, { rough: 0.6 }), sea2 = mat(0x4fb3c8, { rough: 0.3, metal: 0.3 }), lamp = mat(0xbff6ff, { em: 0x7fe9ff, ei: 1.5 });
  const NAMES = ['Coral House', 'Pearl Hall', 'Tidewatch', 'Kelp Court', 'Nautilus Lofts', 'Lantern Market', 'Abyss Academy', 'Brine Exchange', 'Anemone Row', 'Starfall Clinic', 'Current House', 'Driftglass Studios'];
  let n = 0;
  for (let gx = D.x - D.rx + 5; gx <= D.x + D.rx - 5; gx += 8.5) for (let gz = D.z - D.rz + 5; gz <= D.z + D.rz - 5; gz += 8.5) {
    const w = 6 + ((gx * 3 + gz) & 1) * 1.5, d = 6 + ((gx + gz * 3) & 1) * 1.5, x0 = gx - w / 2, x1 = gx + w / 2, z0 = gz - d / 2, z1 = gz + d / 2;
    if (![[x0, z0], [x1, z0], [x0, z1], [x1, z1]].every(([x, z]) => inDome(x, z, 4))) continue;
    if (Math.abs(gz - T.z) < 6) continue;
    const ks = [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [gx, gz]].map(([x, z]) => Math.hypot((x - D.x) / D.rx, (z - D.z) / D.rz));
    if (Math.max(...ks) >= 0.76) continue;                                       // keep the ring path round the edge clear (people walk it)            // keep the ring path clear (people walk it)
    if (Math.abs(gx - D.x) < w / 2 + 3) continue;                                // and the north-south way
    const under = Math.min(roof(x0, z0), roof(x1, z0), roof(x0, z1), roof(x1, z1)) - Y - 1.2;   // room under the glass
    if (under < 4) continue;
    const h = Math.min(under, 4 + ((Math.abs(gx * 7 + gz * 11)) % 7)), name = NAMES[n % NAMES.length] + (n >= NAMES.length ? ' ' + (Math.floor(n / NAMES.length) + 1) : '');
    if (grid.place({ minX: x0 - 1, maxX: x1 + 1, minZ: z0 - 1, maxZ: z1 + 1 }, { name, minY: Y, maxY: Y + h }) == null) continue;
    const g = new THREE.Group(); g.name = name; root.add(g);
    if (n % 3 === 2) { const c = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 20), n % 2 ? coral : pearl); c.position.set(gx, Y + h / 2, gz); c.castShadow = true; g.add(c);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), sea2); cap.position.set(gx, Y + h, gz); g.add(cap); }
    else { box(g, w, h, d, gx, Y + h / 2, gz, n % 2 ? pearl : coral); box(g, w + 0.3, 0.3, d + 0.3, gx, Y + h, gz, sea2); }
    for (const s of [-1, 1]) box(g, 0.8, 0.8, 0.1, gx + s * w / 4, Y + Math.min(h - 1, 2.6), z0 - 0.06, lamp);
    solid(x0, x1, z0, z1);
    id('BLD', h > 8 ? 'APT' : 'GEN', 'GLS.CON', 'GOV', name, gx, gz); n++;
  }

  // ---------------------------------------------------------------- the tunnel and the lift
  const tg = new THREE.Group(); tg.name = 'Deephaven glass tunnel'; root.add(tg);
  const tlen = T.x1 - T.x0 + 2;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(T.half + 0.3, T.half + 0.3, tlen, 24, 1, true), mat(0x8fe9ff, { op: 0.25, side: THREE.DoubleSide, rough: 0.05 })); tube.rotation.z = Math.PI / 2; tube.position.set((T.x0 + T.x1) / 2, Y, T.z); tube.renderOrder = 2; tg.add(tube);
  const tseaM = new THREE.Mesh(new THREE.CylinderGeometry(T.half + 6, T.half + 6, tlen, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x06304a, side: THREE.BackSide, transparent: true, opacity: 0.92, depthWrite: false })); tseaM.rotation.z = Math.PI / 2; tseaM.position.copy(tube.position); tg.add(tseaM);
  { const f = box(tg, tlen, 0.2, T.half * 2, (T.x0 + T.x1) / 2, Y - 0.1, T.z, path); f.castShadow = false; }
  for (let x = T.x0 + 4; x < T.x1; x += 8) box(tg, 0.8, 0.12, 0.8, x, Y + T.half + 0.1, T.z, lamp);
  id('LND', 'TUN', 'GLS', 'GOV', 'Deephaven glass tunnel', (T.x0 + T.x1) / 2, T.z);
  // the lift at the bottom of the shaft, and the lift house up on the shore
  box(tg, 4, 4, 4, T.x0 - 2.5, Y + 2, T.z, mat(0x2b2f45, { metal: 0.6 }));
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
  interactables.push({ pos: new THREE.Vector3(L.x, 0, L.z), r: 3.5, label: 'Take the lift down to Deephaven', action: () => ctx.move(T.x0 + 1.5, Y, T.z, -Math.PI / 2, '⬇️ Down to the sea floor. Follow the glass tunnel east to Deephaven.') });
  interactables.push({ pos: new THREE.Vector3(T.x0 + 1, Y, T.z), r: 3, label: 'Take the lift up to the shore', action: () => ctx.move(L.x + 5.5, 0.1, L.z, Math.PI / 2, '⬆️ Back up on the shore.') });

  // ---------------------------------------------------------------- the submarine port on the north tip
  const port = new THREE.Group(); port.name = 'Deephaven submarine port'; root.add(port);
  const pz = D.z - D.rz;
  box(port, 10, 5, 4, D.x, Y + 2.5, pz - 1, mat(0x2b2f45, { metal: 0.6 }));
  const sub = new THREE.Group(); sub.name = 'Deephaven submarine (docked)'; port.add(sub);
  { const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.4, 14, 8, 16), mat(0xf2c14e, { metal: 0.4, rough: 0.4 })); hull.rotation.z = Math.PI / 2; sub.add(hull); box(sub, 3, 2.6, 2, 2, 2.8, 0, mat(0xf2c14e)); for (let i = -2; i <= 2; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), hg); w.position.set(i * 2.6, 0.6, 2.42); sub.add(w); } }
  sub.position.set(D.x, Y + 3, pz - 9);
  id('VEH', 'SUB', 'STL', 'GOV', 'Deephaven submarine', D.x, pz - 9);
  id('BLD', 'DCK', 'STL', 'GOV', 'Deephaven submarine port', D.x, pz - 1);

  // people
  const ringPts = (k, m) => Array.from({ length: m }, (_, i) => { const a = i / m * Math.PI * 2; return [D.x + Math.cos(a) * D.rx * k, D.z + Math.sin(a) * D.rz * k]; });
  for (let i = 0; i < 6; i++) K.walker(i % 2 ? ringPts(0.83, 32) : ringPts(0.83, 32).reverse(), { t: i * 20, y: Y + 0.05, off: (i % 3 - 1) * 0.8 });
  K.walker([[D.x + 1, D.z - D.rz + 5], [D.x + 1, D.z + D.rz - 5]], { y: Y + 0.05, off: 0.8 });
  K.walker([[T.x0 + 4, T.z - 1], [T.x1 + 4, T.z - 1]], { y: Y + 0.05 });
  destinations.push({ name: 'Deephaven (underwater city)', x: D.x, z: D.z - 10 });

  // ---------------------------------------------------------------- where you can stand
  const inTunnel = (x, z) => x >= T.x0 - 0.5 && x <= T.x1 + 6 && Math.abs(z - T.z) <= T.half;
  const inside = (x, z, y) => y != null && y < Y + 12 && (inDome(x, z) || inTunnel(x, z));
  function groundAt(x, z, bodyY) { return bodyY != null && bodyY < -8 && (inDome(x, z) || inTunnel(x, z)) ? Y : null; }
  let t = 0;
  function update(dt, p) {
    t += dt;
    orb.rotation.y += dt * 0.2; halo.rotation.x = Math.sin(t * 0.4) * 0.6; halo.rotation.y += dt * 0.5; motes.rotation.y -= dt * 0.15; light.intensity = 2.4 + Math.sin(t * 1.3) * 0.4;
    for (const a of anchors) a.rotation.y += dt * 1.5;
    for (const f of fish) { f.a += f.s * dt; const x = D.x + Math.cos(f.a) * (D.rx + 6) * f.r, z = D.z + Math.sin(f.a) * (D.rz + 6) * f.r; f.f.position.set(x, Y + f.y, z); f.f.rotation.y = -f.a; }
    sub.position.y = Y + 3 + Math.sin(t * 0.7) * 0.15;
    if (p && p.y < -8) {
      // the glass and the tunnel walls: you stay inside
      if (inTunnel(p.x, p.z) || Math.abs(p.z - T.z) <= T.half + 0.6 && p.x >= T.x0 - 0.5 && p.x <= T.x1 + 6) { p.z = Math.max(T.z - T.half + 0.5, Math.min(T.z + T.half - 0.5, p.z)); p.x = Math.max(T.x0 + 0.5, p.x); }
      else if (!inDome(p.x, p.z, 0.6) && p.x > T.x1 - 2) { const dx = (p.x - D.x) / (D.rx - 0.6), dz = (p.z - D.z) / (D.rz - 0.6), k = Math.hypot(dx, dz); if (k > 1) { p.x = D.x + (p.x - D.x) / k; p.z = D.z + (p.z - D.z) / k; } }
    }
    K.update?.(dt, p || { x: D.x, z: D.z }, 160);
  }
  return { root, ids, destinations, groundAt, update, inside, center: D, cityAt: (x, z, y) => inside(x, z, y) || Math.hypot(x - DEEP_LIFT.x, z - DEEP_LIFT.z) < 8 };
}
