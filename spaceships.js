// SPACESHIPS, and ORBITAL FORGE, the company that builds them.
//
// Orbital Forge's works stand next to the space centre, on the east side of the Capital (x 495-655, z 735-825):
// a headquarters with the showroom, an assembly hangar where a ship is being built, and four launch pads. The
// land was checked empty first (the Capital Central railway runs past on its viaduct at x 460; the road in passes
// under it). Buy a ship in the showroom and it waits for you on a launch pad.
//
// Flying one is like a helicopter that never runs out of sky: Space climbs, Shift descends, W/S forward and back,
// A/D turn. Take off and land anywhere; climb past 250 m and you're in space. The ceiling is the Aegis dome itself.
// A pilot's licence keeps it legal, as for planes.
import * as THREE from 'three';

export const SHIPYARD = { minX: 495, maxX: 655, minZ: 735, maxZ: 825, roadZ: 780, roadFromX: 447, pads: [[560, 800], [590, 800], [620, 800], [530, 800]] };

// the ships you can buy (prices in gold); the stats mean the same as for every other vehicle
export const SHIP_MODELS = {
  skiff: { name: 'Orbital Forge Skiff', price: 25000, mph: 300, accel: 70, brakes: 70, handling: 82, climb: 22, desc: 'A small two-seat ship. Takes off anywhere and climbs into space. Pilot licence needed.' },
  voyager: { name: 'Orbital Forge Voyager', price: 60000, mph: 400, accel: 80, brakes: 74, handling: 72, climb: 30, desc: 'A long-range cruiser with a cabin for six. Pilot licence needed.' },
  starhawk: { name: 'Orbital Forge Starhawk', price: 120000, mph: 520, accel: 95, brakes: 80, handling: 78, climb: 40, desc: 'The flagship: delta wings, three engines, the fastest thing in the sky. Pilot licence needed.' },
};

// a ship's body. Returns { group, glow: [engine glows], lights }
export function buildShipMesh(model, color = 0xe8edf2) {
  const g = new THREE.Group();
  const hullM = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 }), dark = new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.7, roughness: 0.4 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1b3550, metalness: 0.8, roughness: 0.05, transparent: true, opacity: 0.85 });
  const glowM = () => new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.85 });
  const S = model === 'starhawk' ? 1.5 : model === 'voyager' ? 1.25 : 1;
  const len = 8 * S, rad = 1.2 * S, y = 1.9 * S;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.9, len, 20), hullM); body.rotation.x = Math.PI / 2; body.position.y = y; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(rad, 3 * S, 20), hullM); nose.rotation.x = Math.PI / 2; nose.position.set(0, y, len / 2 + 1.5 * S); g.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassM); canopy.scale.set(1, 0.7, 1.8); canopy.position.set(0, y + rad * 0.55, len / 2 - 1.2 * S); g.add(canopy);
  // wings: straight on the skiff, swept on the voyager, a full delta on the starhawk
  const wingShape = new THREE.Shape(); const span = (model === 'starhawk' ? 6.5 : model === 'voyager' ? 5 : 3.6) * S, root = len * 0.6, sweep = model === 'skiff' ? 0.5 : model === 'voyager' ? 2.2 : root * 0.85;
  wingShape.moveTo(0, root / 2); wingShape.lineTo(span, root / 2 - sweep); wingShape.lineTo(span, root / 2 - sweep - 1.2 * S); wingShape.lineTo(0, -root / 2);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.18 * S, bevelEnabled: false }), hullM); w.rotation.x = Math.PI / 2; w.scale.x = s; w.position.set(0, y - 0.2 * S, 0); g.add(w);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(span * 0.7, 0.05, 0.3 * S), new THREE.MeshStandardMaterial({ color: 0x1f6feb })); stripe.position.set(s * span * 0.45, y - 0.08 * S, root / 2 - sweep * 0.45 - 0.5 * S); g.add(stripe); }
  // tail fin
  { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15 * S, 2.2 * S, 2.4 * S), hullM); fin.position.set(0, y + rad + 0.8 * S, -len / 2 + 1.2 * S); fin.rotation.x = -0.35; g.add(fin); }
  // engines and their glow
  const glow = [], n = model === 'starhawk' ? 3 : 2;
  for (let i = 0; i < n; i++) { const x = n === 3 ? (i - 1) * 1.4 * S : (i ? 1 : -1) * 0.9 * S, yy = n === 3 && i === 1 ? y + 0.6 * S : y - 0.2 * S;
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * S, 0.7 * S, 1.6 * S, 16), dark); e.rotation.x = Math.PI / 2; e.position.set(x, yy, -len / 2 - 0.5 * S); g.add(e);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.5 * S, 2.2 * S, 16, 1, true), glowM()); f.rotation.x = -Math.PI / 2; f.position.set(x, yy, -len / 2 - 2.3 * S); g.add(f); glow.push(f); }
  // landing legs
  for (const [lx, lz] of [[-1.1, 1.6], [1.1, 1.6], [-1.3, -2.2], [1.3, -2.2]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * S, 0.1 * S, y, 8), dark); l.position.set(lx * S, y / 2, lz * S); g.add(l); const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * S, 0.3 * S, 0.1, 12), dark); foot.position.set(lx * S, 0.05, lz * S); g.add(foot); }
  const lights = [new THREE.PointLight(0x7fd4ff, 0, 18, 2)]; lights[0].position.set(0, y, -len / 2 - 3 * S); g.add(lights[0]);
  return { group: g, glow, lights, size: S };
}

// the works: HQ and showroom, hangar, launch pads, fence and the road in
export function buildShipyard({ scene, colliders, interactables, makeTex, openShop, destinations, makePerson }) {
  const ids = [];
  const Y = SHIPYARD, root = new THREE.Group(); root.name = 'Orbital Forge spaceship works'; scene.add(root);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1, transparent: o.op != null, opacity: o.op ?? 1, emissive: o.em ?? 0 });
  const box = (w, h, d, x, y, z, m, solid = false) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; root.add(o); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return o; };
  const id = (cls, kind, m3, name, x, z) => ids.push({ cls, kind, mat: m3, owner: 'REQ', seed: 'orbital:' + name, name, maker: 'Orbital Forge', pos: { x, z } });
  const white = mat(0xeef1f4, { rough: 0.4 }), steel = mat(0x8b949e, { metal: 0.6, rough: 0.35 }), glass = mat(0x8fc6e8, { op: 0.35, metal: 0.5, rough: 0.05 }), tarmac = mat(0x2f3338, { rough: 0.9 }), concrete = mat(0x9da1a6, { rough: 0.95 });
  // the road in from the Capital (it passes under the railway viaduct)
  { const r = box(Y.minX - Y.roadFromX, 0.06, 10, (Y.minX + Y.roadFromX) / 2, 0.03, Y.roadZ, tarmac); r.castShadow = false; }
  // the yard
  { const y = box(Y.maxX - Y.minX, 0.05, Y.maxZ - Y.minZ, (Y.minX + Y.maxX) / 2, 0.035, (Y.minZ + Y.maxZ) / 2, concrete); y.castShadow = false; }
  // fence round it, open at the road
  const fenceM = mat(0x4b5563, { metal: 0.5 });
  const fence = (x0, x1, z0, z1) => box(Math.max(0.15, x1 - x0), 2.4, Math.max(0.15, z1 - z0), (x0 + x1) / 2, 1.2, (z0 + z1) / 2, fenceM, true);
  fence(Y.minX, Y.maxX, Y.minZ, Y.minZ); fence(Y.minX, Y.maxX, Y.maxZ, Y.maxZ); fence(Y.maxX, Y.maxX, Y.minZ, Y.maxZ);
  fence(Y.minX, Y.minX, Y.minZ, Y.roadZ - 6); fence(Y.minX, Y.minX, Y.roadZ + 6, Y.maxZ);
  // HQ and showroom: solid walls, a glass front facing the yard with the door in the middle
  const HQ = { x: 517, z: 750, w: 34, d: 22, h: 9 };
  box(HQ.w, HQ.h, 0.4, HQ.x, HQ.h / 2, HQ.z - HQ.d / 2, white, true);
  for (const s of [-1, 1]) box(0.4, HQ.h, HQ.d, HQ.x + s * HQ.w / 2, HQ.h / 2, HQ.z, white, true);
  for (const s of [-1, 1]) box(HQ.w / 2 - 2, 4.5, 0.15, HQ.x + s * (HQ.w / 4 + 1), 2.25, HQ.z + HQ.d / 2, glass, true);
  box(HQ.w, HQ.h - 4.5, 0.4, HQ.x, 4.5 + (HQ.h - 4.5) / 2, HQ.z + HQ.d / 2, white);
  box(HQ.w + 1, 0.5, HQ.d + 1, HQ.x, HQ.h + 0.25, HQ.z, steel);
  box(HQ.w - 0.8, 0.08, HQ.d - 0.8, HQ.x, 0.08, HQ.z, mat(0xd8dde2, { rough: 0.3 }));
  const sign = makeTex(1024, 160, g => { g.fillStyle = '#0b1220'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#7fd4ff'; g.textAlign = 'center'; g.font = 'bold 72px sans-serif'; g.fillText('ORBITAL FORGE', 512, 86); g.font = '30px sans-serif'; g.fillStyle = '#fff'; g.fillText('spaceships designed and built in A.T.', 512, 132); });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.5), new THREE.MeshBasicMaterial({ map: sign })); m.position.set(HQ.x, 6.8, HQ.z + HQ.d / 2 + 0.22); root.add(m); }
  // a model ship on a turntable in the showroom
  const display = buildShipMesh('starhawk', 0xf2f4f7); display.group.scale.setScalar(0.45); display.group.position.set(HQ.x, 0.6, HQ.z - 2); root.add(display.group);
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.5, 32), steel); t.position.set(HQ.x, 0.3, HQ.z - 2); root.add(t); colliders.push({ minX: HQ.x - 3.6, maxX: HQ.x + 3.6, minZ: HQ.z - 5.6, maxZ: HQ.z + 1.6 }); }
  if (makePerson) { const h = makePerson({ outfit: 0x1f6feb, hair: 0x2b1d14 }); h.root.position.set(HQ.x + 9, 0.1, HQ.z + 4); h.root.rotation.y = Math.PI; root.add(h.root); }
  id('BLD', 'OFF', 'STL.GLS', 'Orbital Forge headquarters and showroom', HQ.x, HQ.z);
  // assembly hangar, open to the yard, a half-built ship inside
  const HG = { x: 590, z: 752, w: 60, d: 30, h: 16 };
  box(HG.w, HG.h, 0.5, HG.x, HG.h / 2, HG.z - HG.d / 2, steel, true);
  for (const s of [-1, 1]) box(0.5, HG.h, HG.d, HG.x + s * HG.w / 2, HG.h / 2, HG.z, steel, true);
  box(HG.w + 1, 0.6, HG.d + 1, HG.x, HG.h + 0.3, HG.z, mat(0x5b6470, { metal: 0.6 }));
  const wip = buildShipMesh('voyager', 0xb9c2cc); wip.group.position.set(HG.x, 0, HG.z); wip.group.rotation.y = Math.PI / 2; root.add(wip.group);
  for (const s of [-1, 1]) { box(0.3, 10, 0.3, HG.x + s * 9, 5, HG.z + 6, mat(0xf2c14e), true); box(0.3, 10, 0.3, HG.x + s * 9, 5, HG.z - 6, mat(0xf2c14e), true); }
  box(18.6, 0.4, 0.4, HG.x, 10, HG.z + 6, mat(0xf2c14e)); box(18.6, 0.4, 0.4, HG.x, 10, HG.z - 6, mat(0xf2c14e));   // a gantry over the ship
  colliders.push({ minX: HG.x - 7, maxX: HG.x + 7, minZ: HG.z - 3, maxZ: HG.z + 3 });
  id('BLD', 'HGR', 'STL', 'Orbital Forge assembly hangar', HG.x, HG.z);
  // launch pads
  const padTex = makeTex(256, 256, g => { g.fillStyle = '#2b2f33'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#7fd4ff'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke(); g.fillStyle = '#7fd4ff'; g.font = 'bold 90px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OF', 128, 132); });
  Y.pads.forEach(([x, z], i) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.16, 40), [steel, new THREE.MeshStandardMaterial({ map: padTex }), steel]); p.position.set(x, 0.1, z); root.add(p); id('LND', 'RMP', 'CON', `Orbital Forge launch pad ${i + 1}`, x, z); });
  // the gate sign over the road
  { const gx = Y.minX + 0.2; for (const s of [-1, 1]) box(0.4, 6, 0.4, gx, 3, Y.roadZ + s * 5.6, steel, true); box(0.4, 0.4, 11.6, gx, 6, Y.roadZ, steel);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: makeTex(768, 120, g => { g.fillStyle = '#0b1220'; g.fillRect(0, 0, 768, 120); g.fillStyle = '#7fd4ff'; g.textAlign = 'center'; g.font = 'bold 56px sans-serif'; g.fillText('ORBITAL FORGE WORKS', 384, 78); }) }));
    m.position.set(gx - 0.25, 5, Y.roadZ); m.rotation.y = -Math.PI / 2; root.add(m); }
  let next = 0;
  interactables.push({ pos: new THREE.Vector3(HQ.x - 9, 0.1, HQ.z + 4), r: 4, label: 'Browse spaceships (Orbital Forge)', action: () => openShop('Orbital Forge', ['Spaceship'], v => { const [x, z] = Y.pads[next++ % Y.pads.length]; v.group.position.set(x, 0.18, z); v.group.rotation.y = Math.PI; }) });
  destinations?.push({ name: 'Orbital Forge (spaceships)', x: Y.roadFromX + 20, z: Y.roadZ });
  let t = 0;
  return { root, ids, update(dt) { t += dt; display.group.rotation.y += dt * 0.3; for (const f of display.glow) f.material.opacity = 0.5 + Math.sin(t * 3) * 0.2; } };
}
