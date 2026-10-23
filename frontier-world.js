// Northern frontier expansion: the Aegis planetary shield, military bases, the Hunter
// Guild Quarter, the Lumen Heights housing district and a driver licensing office.
// Sci-fi infrastructure and fantasy guild architecture side by side, laid out like a
// real town extension: an arterial avenue from the old town, a boulevard, local streets,
// fenced restricted sites with a single guarded gate.
//
// Everything static is merged into a handful of meshes per site, so the whole expansion
// costs a few dozen draw calls rather than thousands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const FORT = { name: 'Fort Halberd', x0: 470, x1: 790, z0: -640, z1: -460, gate: [600, 616] };
export const WESTWATCH = { name: 'Westwatch Aegis Relay', x0: -880, x1: -740, z0: -640, z1: -500, gate: [-816, -804] };
export const SPIRES = [
  { name: 'Westwatch Spire', x: -810, z: -575 },
  { name: 'Fort Halberd Spire', x: 740, z: -505 },
  { name: 'Saltmarsh Spire', x: -800, z: 420 },
  { name: 'Eastreach Spire', x: 840, z: 612 },
];
export const PATROL_POINTS = [
  { name: 'Boulevard west checkpoint', x: -330, z: -440 },
  { name: 'Lumen Heights checkpoint', x: 230, z: -440 },
  { name: 'Fort Halberd approach', x: 608, z: -432 },
];
export const restrictedZones = [FORT, WESTWATCH];
export const insideRect = (r, p, pad = 0) => p.x > r.x0 - pad && p.x < r.x1 + pad && p.z > r.z0 - pad && p.z < r.z1 + pad;

// ---------------------------------------------------------------------------------
// Batched static geometry
// ---------------------------------------------------------------------------------
function createBatcher(scene) {
  const mats = new Map(), parts = new Map();
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  function mat(color, o = {}) {
    const key = [color, o.emissive ?? 0, o.ei ?? 1, o.rough ?? 0.75, o.metal ?? 0, o.opacity ?? 1].join('|');
    if (!mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1 });
      if ((o.opacity ?? 1) < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
      mats.set(key, m);
    }
    return mats.get(key);
  }
  function add(geo, material, x, y, z, ry = 0, rx = 0, rz = 0) {
    e.set(rx, ry, rz); q.setFromEuler(e); v.set(x, y, z);
    geo.applyMatrix4(tmpM.compose(v, q, s));
    if (!parts.has(material)) parts.set(material, []);
    parts.get(material).push(geo);
  }
  function flush(name, shadows = true) {
    const group = new THREE.Group(); group.name = name;
    for (const [material, list] of parts) {
      const merged = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, material);
      m.castShadow = shadows && !material.transparent; m.receiveShadow = !material.transparent;
      group.add(m);
    }
    parts.clear();
    scene.add(group);
    return group;
  }
  return { mat, add, flush };
}

export function buildFrontierWorld(ctx) {
  // ctx: { scene, colliders, planeBlocks, interactables, glowMats, sign(text,x,y,z,w,colour), makePerson, animatePerson,
  //        destinations, toast, playerPosition(), makeTank(x,z,ry), makeMilitaryTruck(x,z,ry), authorised(), onIntrusion(zone), sleep(), buyFood(price,energy), groundY }
  const B = createBatcher(ctx.scene);
  const C = {
    asphalt: B.mat(0x2d3034, { rough: 0.95 }), line: B.mat(0xe8e2c8, { rough: 0.8 }), kerb: B.mat(0x9a9a94, { rough: 0.9 }),
    concrete: B.mat(0xb8b6ae), darkConcrete: B.mat(0x6e706c), olive: B.mat(0x4f5a3a), steel: B.mat(0x5b6670, { metal: 0.6, rough: 0.45 }),
    hull: B.mat(0x8c9aa6, { metal: 0.55, rough: 0.35 }), glow: B.mat(0x9fe8ff, { emissive: 0x56c8ff, ei: 1.6 }), warn: B.mat(0xd8a21c),
    stone: B.mat(0x9c958a, { rough: 0.95 }), darkStone: B.mat(0x5f5a54, { rough: 0.95 }), timber: B.mat(0x6b4a2f, { rough: 0.9 }), thatch: B.mat(0x7a6a3a, { rough: 1 }),
    gold: B.mat(0xd9b44a, { metal: 0.8, rough: 0.3, emissive: 0x6a4a10, ei: 0.6 }), lantern: B.mat(0xfff0b8, { emissive: 0xffc560, ei: 2 }),
    leaf: B.mat(0x3f7a3a, { rough: 1 }), lawn: B.mat(0x5f8a45, { rough: 1 }), glass: B.mat(0x284155, { metal: 0.3, rough: 0.15 }), door: B.mat(0x2a2522),
    whiteRender: B.mat(0xe7e2d6), brick: B.mat(0x9a5a44), slate: B.mat(0x3c4249), red: B.mat(0xa33a32), rune: B.mat(0x8fffd2, { emissive: 0x3cf0b0, ei: 1.8 }),
    fenceMesh: B.mat(0x7f8a8f, { metal: 0.4, opacity: 0.55 }), helipad: B.mat(0x33363a), shieldCore: B.mat(0xc8f4ff, { emissive: 0x7ad8ff, ei: 3 }),
  };
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x2a3d4f, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.2, metalness: 0.2 });
  ctx.glowMats?.push(windowMat);
  C.window = windowMat;

  const box = (w, h, d, x, y, z, m, collide = false, ry = 0) => {
    B.add(new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
    if (collide) {
      const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
      ctx.colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
      if (h > 4) ctx.planeBlocks?.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, top: y + h / 2 + 0.3 });
    }
  };
  const cyl = (rt, rb, h, x, y, z, m, seg = 16, rx = 0, rz = 0) => B.add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, 0, rx, rz);
  const sphere = (r, x, y, z, m, seg = 12) => B.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), m, x, y, z);
  // Gabled roof over a w×d footprint, ridge running along x. `pitch` scales the height.
  function prismRoof(x, z, w, d, baseY, m, pitch = 0.5) {
    const r = (d + 0.8) / 1.732, g = new THREE.CylinderGeometry(r, r, w + 0.8, 3, 1);
    g.scale(1, 1, pitch);
    B.add(g, m, x, baseY + 0.5 * r * pitch, z, 0, -Math.PI / 2, Math.PI / 2);
  }

  // ---- generic building pieces ---------------------------------------------------
  // A rectangular building with windows on all sides and a door on the side facing `face` (+z by default).
  function building(x, z, w, d, h, wall, { roof = C.slate, floors = Math.max(1, Math.round(h / 3.4)), door = true, flatRoof = true, face = 1 } = {}) {
    box(w, h, d, x, h / 2, z, wall, true);
    if (flatRoof) box(w + 0.4, 0.4, d + 0.4, x, h + 0.2, z, roof);
    const fh = h / floors;
    for (let f = 0; f < floors; f++) {
      const y = fh * f + fh * 0.58;
      for (const side of [-1, 1]) {
        const nW = Math.max(1, Math.floor(w / 3.2)), nD = Math.max(1, Math.floor(d / 3.2));
        for (let i = 0; i < nW; i++) { const wx = x - w / 2 + (i + 0.5) * w / nW; if (f === 0 && door && side === face && Math.abs(wx - x) < 1.8) continue; box(1.5, fh * 0.45, 0.08, wx, y, z + side * (d / 2 + 0.04), C.window); }
        for (let i = 0; i < nD; i++) box(0.08, fh * 0.45, 1.5, x + side * (w / 2 + 0.04), y, z - d / 2 + (i + 0.5) * d / nD, C.window);
      }
    }
    if (door) { box(2.4, 2.8, 0.15, x, 1.4, z + face * (d / 2 + 0.08), C.door); box(4, 0.25, 1.6, x, 3.1, z + face * (d / 2 + 0.8), C.darkConcrete); }
    return { doorPos: new THREE.Vector3(x, 0.2, z + face * (d / 2 + 2.2)) };
  }
  function house(x, z, face, wall, roofMat) {
    const w = 8, d = 9, h = 5.4;
    box(w, h, d, x, h / 2, z, wall, true);
    // pitched roof: triangular prism with its ridge parallel to the street
    prismRoof(x, z, w, d, h, roofMat, 0.5);
    box(1.1, 2.4, 1.1, x + w * 0.25, h + 2.2, z - d * 0.2, C.brick);                  // chimney
    for (const sx of [-2.2, 2.2]) for (const y of [1.6, 4]) box(1.4, 1.1, 0.08, x + sx, y, z + face * (d / 2 + 0.04), C.window);
    box(1.2, 2.2, 0.12, x, 1.1, z + face * (d / 2 + 0.06), C.door);
    box(1.4, 0.06, 1.6, x, 0.03, z + face * (d / 2 + 0.8), C.concrete);               // front path
    for (const sx of [-1, 1]) box(w / 2 - 0.9, 0.6, 0.25, x + sx * (w / 4 + 0.45), 0.3, z + face * (d / 2 + 1.6), C.darkStone);   // garden wall with a gap for the path
  }
  function tree(x, z, s = 1) { cyl(0.18 * s, 0.25 * s, 2.6 * s, x, 1.3 * s, z, C.timber, 6); sphere(1.7 * s, x, 3.4 * s, z, C.leaf, 7); }
  function road(x0, z0, x1, z1, width = 9, markings = true) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.add(new THREE.BoxGeometry(width, 0.06, len), C.asphalt, cx, 0.03, cz, ang);
    for (const side of [-1, 1]) { const ox = Math.cos(ang) * side * (width / 2 + 0.9), oz = -Math.sin(ang) * side * (width / 2 + 0.9); B.add(new THREE.BoxGeometry(1.8, 0.15, len), C.kerb, cx + ox, 0.075, cz + oz, ang); }
    if (markings) for (let t = 3; t < len - 3; t += 9) { const px = x0 + Math.sin(ang) * t, pz = z0 + Math.cos(ang) * t; B.add(new THREE.BoxGeometry(0.15, 0.065, 4.5), C.line, px, 0.035, pz, ang); }
  }
  function streetLight(x, z) { cyl(0.07, 0.1, 5.5, x, 2.75, z, C.steel, 6); box(0.5, 0.18, 0.5, x, 5.55, z, C.glow); }

  // ---- security fence with a guarded gate ------------------------------------------
  function perimeter(r, h = 3.4) {
    const [g0, g1] = r.gate;
    const segX = (x0, x1, z) => { if (x1 - x0 < 0.5) return; const w = x1 - x0, cx = (x0 + x1) / 2; box(w, h, 0.12, cx, h / 2, z, C.fenceMesh); ctx.colliders.push({ minX: x0, maxX: x1, minZ: z - 0.3, maxZ: z + 0.3 }); for (let x = x0; x <= x1; x += 6) cyl(0.08, 0.08, h + 0.4, x, (h + 0.4) / 2, z, C.steel, 5); box(w, 0.08, 0.3, cx, h + 0.35, z, C.steel); };
    const segZ = (z0, z1, x) => { const d = z1 - z0, cz = (z0 + z1) / 2; box(0.12, h, d, x, h / 2, cz, C.fenceMesh); ctx.colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z0, maxZ: z1 }); for (let z = z0; z <= z1; z += 6) cyl(0.08, 0.08, h + 0.4, x, (h + 0.4) / 2, z, C.steel, 5); box(0.3, 0.08, d, x, h + 0.35, cz, C.steel); };
    segX(r.x0, r.x1, r.z0); segX(r.x0, g0, r.z1); segX(g1, r.x1, r.z1); segZ(r.z0, r.z1, r.x0); segZ(r.z0, r.z1, r.x1);
    // gatehouse and barrier
    box(4, 3.2, 4, g0 - 3, 1.6, r.z1 + 1, C.concrete, true); box(4.6, 0.3, 4.6, g0 - 3, 3.35, r.z1 + 1, C.darkConcrete);
    box(g1 - g0, 0.18, 0.18, (g0 + g1) / 2, 1.1, r.z1 + 1.5, C.warn);
    ctx.sign?.(r.name.toUpperCase() + ' · RESTRICTED · AUTHORISED PERSONNEL ONLY', (g0 + g1) / 2, 5.2, r.z1 + 2.2, 16, '#5a2a22');
  }

  // =================================================================================
  // 1. Roads: avenue from the old town, a boulevard linking the new districts
  // =================================================================================
  road(0, -168, 0, -444, 10);
  road(-345, -440, 640, -440, 11);
  road(608, -440, 608, -459, 8, false);
  road(-200, -440, -200, -548, 8, false);                     // guild quarter internal street
  for (const x of [120, 230, 340]) road(x, -440, x, -628, 7, false);
  road(115, -520, 345, -520, 7, false); road(115, -600, 345, -600, 7, false);
  for (let x = -330; x <= 630; x += 45) { streetLight(x, -446.5); streetLight(x + 22, -433.5); }
  for (let z = -180; z >= -430; z -= 36) { streetLight(-6.8, z); }
  B.flush('frontier-roads', false);
  ctx.destinations?.push({ name: 'Guild Quarter', x: -200, z: -452 }, { name: 'Lumen Heights', x: 230, z: -452 }, { name: 'Fort Halberd gate', x: 608, z: -400 });

  // =================================================================================
  // 2. Hunter Guild Quarter
  // =================================================================================
  const desks = {};
  // Hunter Association HQ — a glass-and-steel tower wrapped round an old stone hall
  desks.hq = building(-200, -567, 34, 30, 24, C.concrete, { floors: 6 }).doorPos;
  box(36, 3.5, 32, -200, 1.75, -567, C.stone, false);
  box(10, 34, 10, -200, 17, -575, C.glass, true);
  for (let y = 6; y <= 32; y += 6.5) box(10.4, 0.5, 10.4, -200, y, -575, C.glow);
  cyl(0.15, 0.15, 10, -200, 39, -575, C.steel, 6); sphere(0.6, -200, 44.2, -575, C.glow, 8);
  // Aegis Vanguard: sleek sci-fi hall with a shield emitter on the roof
  desks.aegis = building(-295, -472, 22, 26, 12, C.hull, { roof: C.steel, floors: 3 }).doorPos;
  cyl(3, 4, 2, -295, 13, -472, C.steel, 20); sphere(2.6, -295, 15, -472, C.shieldCore, 16);
  // Order of the Silver Lantern: fantasy stone chapterhouse with a mage tower
  desks.lantern = building(-105, -472, 22, 26, 10, C.stone, { roof: C.darkStone, floors: 2 }).doorPos;
  cyl(4, 4.6, 26, -97, 13, -480, C.stone, 12); ctx.colliders.push({ minX: -101.6, maxX: -92.4, minZ: -484.6, maxZ: -475.4 });
  B.add(new THREE.ConeGeometry(5.2, 9, 12), C.slate, -97, 30.5, -480);
  sphere(1.4, -97, 36, -480, C.lantern, 10);
  for (let a = 0; a < 6; a++) box(0.4, 1.6, 0.4, -97 + Math.cos(a) * 4.7, 20, -480 + Math.sin(a) * 4.7, C.rune);
  // Thornwild Rangers: timber longhouse with a thatched roof and trophy antlers
  desks.thorn = building(-295, -560, 24, 20, 7, C.timber, { roof: C.thatch, flatRoof: false, floors: 1 }).doorPos;
  prismRoof(-295, -560, 24, 20, 7, C.thatch, 0.62);
  for (const sx of [-1, 1]) box(0.25, 2.6, 0.25, -295 + sx * 1.4, 8.4, -549.6, C.whiteRender, false, sx * 0.5);
  // Driver & Vehicle Licensing Office
  desks.dvla = building(-105, -555, 20, 16, 8, C.whiteRender, { floors: 2 }).doorPos;
  // Contract plaza with a holographic obelisk board
  box(60, 0.12, 40, -200, 0.06, -480, C.concrete);
  box(2.4, 7, 2.4, -200, 3.5, -478, C.darkStone, true); box(2.6, 0.4, 2.6, -200, 7.2, -478, C.gold);
  box(5, 3, 0.08, -200, 5.2, -476.7, C.glow);
  for (const [x, z] of [[-230, -462], [-170, -462], [-230, -498], [-170, -498]]) tree(x, z, 1.2);
  // Lantern Inn (rent a room)
  desks.inn = building(-37, -478, 16, 18, 8, C.brick, { roof: C.slate, floors: 2 }).doorPos;
  B.flush('guild-quarter');
  ctx.sign?.('HUNTER ASSOCIATION', -200, 26, desks.hq.z - 2.4, 20, '#0d2f4a');
  ctx.sign?.('AEGIS VANGUARD', -295, 13.2, desks.aegis.z - 2.3, 14, '#0e3550');
  ctx.sign?.('ORDER OF THE SILVER LANTERN', -105, 11.2, desks.lantern.z - 2.3, 16, '#4a3b13');
  ctx.sign?.('THORNWILD RANGERS', -295, 8.4, desks.thorn.z - 2.3, 14, '#2c4a1e');
  ctx.sign?.('DRIVER & VEHICLE LICENSING', -105, 9.2, desks.dvla.z - 2.3, 14, '#1b3c8c');
  ctx.sign?.('THE LANTERN INN', -37, 9.2, desks.inn.z - 2.3, 12, '#5a2a18');
  ctx.sign?.('CONTRACT BOARD', -200, 9, -476.5, 6, '#0d2f4a');

  // =================================================================================
  // 3. Lumen Heights — terraced streets, apartment blocks and two arcology towers
  // =================================================================================
  const walls = [C.whiteRender, C.brick, B.mat(0xc9b79c), B.mat(0xa7b3b8), B.mat(0xd8c7a6)];
  const roofs = [C.slate, C.red, B.mat(0x5a4a3c)];
  let hi = 0;
  for (const [z, face] of [[-458, 1], [-505, -1], [-535, 1], [-585, -1], [-615, 1]]) {   // fronts face the street
    for (let x = 75; x <= 395; x += 13) {
      if ([120, 230, 340].some(rx => Math.abs(x - rx) < 9)) continue;
      if (z <= -580 && x > 300) continue;                    // tower plot
      house(x, z, face, walls[hi % walls.length], roofs[(hi * 7) % roofs.length]); hi++;
    }
  }
  // apartment blocks on the boulevard frontage (west end) — mixed-use with ground-floor shops
  for (const x of [40, 75]) building(x, -470, 26, 16, 15, B.mat(0xbfb6a8), { floors: 5, face: 1 });
  // arcology towers: tiered cylinders with luminous rings and sky gardens
  for (const [x, z, h] of [[355, -612, 70], [395, -585, 54]]) {
    for (let i = 0; i < 4; i++) { const r = 11 - i * 2, seg = h / 4; cyl(r, r + 0.6, seg, x, seg * i + seg / 2, z, i % 2 ? C.glass : C.hull, 24); cyl(r + 0.9, r + 0.9, 0.7, x, seg * (i + 1), z, C.glow, 24); sphere(r * 0.45, x + r * 0.55, seg * (i + 1) + 1.2, z, C.leaf, 8); }
    cyl(0.25, 0.25, 14, x, h + 7, z, C.steel, 6);
    ctx.colliders.push({ minX: x - 11.6, maxX: x + 11.6, minZ: z - 11.6, maxZ: z + 11.6, circleX: x, circleZ: z, circleRadius: 11.6 });
    ctx.planeBlocks?.push({ minX: x - 11, maxX: x + 11, minZ: z - 11, maxZ: z + 11, top: h + 1 });
  }
  // pocket park and corner shop
  box(36, 0.1, 22, 165, 0.05, -560, C.lawn);
  for (let i = 0; i < 6; i++) tree(152 + (i % 3) * 13, -566 + Math.floor(i / 3) * 12, 1);
  const shopDoor = building(285, -470, 16, 12, 5, B.mat(0x2f6f5a), { floors: 1 }).doorPos;
  B.flush('lumen-heights');
  ctx.sign?.('LUMEN HEIGHTS', 230, 7, -447.5, 10, '#123a4f');
  ctx.sign?.('CORNER SHOP', 285, 6.2, shopDoor.z - 2.3, 8, '#2f6f5a');

  // =================================================================================
  // 4. Fort Halberd — Defence Force base
  // =================================================================================
  perimeter(FORT);
  box(FORT.x1 - FORT.x0 - 4, 0.08, FORT.z1 - FORT.z0 - 4, (FORT.x0 + FORT.x1) / 2, 0.04, (FORT.z0 + FORT.z1) / 2, C.darkConcrete);
  // command building and comms mast
  const fortRadio = building(608, -495, 30, 18, 12, C.olive, { floors: 3, roof: C.darkConcrete }).doorPos;
  box(1, 30, 1, 625, 15, -500, C.steel, true); for (let y = 6; y < 30; y += 6) box(4, 0.2, 0.2, 625, y, -500, C.steel);
  sphere(2.2, 625, 31, -500, C.concrete, 12);
  // barracks
  for (let i = 0; i < 4; i++) building(505 + i * 28, -530, 22, 12, 7, B.mat(0x77745f), { floors: 2, roof: C.darkConcrete });
  // hangars (half cylinders)
  for (const x of [530, 585]) { B.add(new THREE.CylinderGeometry(14, 14, 36, 20, 1, false, -Math.PI / 2, Math.PI), C.steel, x, 0, -605, 0, -Math.PI / 2, 0); ctx.colliders.push({ minX: x - 14, maxX: x + 14, minZ: -623, maxZ: -587 }); box(26, 12, 0.3, x, 6, -586.8, C.darkConcrete); }
  // mech bay: two 9 m walker frames (sci-fi armour) under a gantry
  for (const x of [650, 675]) {
    box(3.4, 3, 2.2, x, 6.5, -600, C.olive); box(2.2, 1.6, 2, x, 8.8, -600, C.hull); box(2.6, 0.5, 0.2, x, 8.8, -598.9, C.glow);
    for (const s of [-1, 1]) { box(1.2, 5, 1.4, x + s * 1.2, 2.5, -600, C.olive); box(1, 4, 1, x + s * 2.4, 6, -600, C.olive); box(1.6, 0.6, 2.4, x + s * 1.2, 0.3, -599.6, C.steel); }
    ctx.colliders.push({ minX: x - 3, maxX: x + 3, minZ: -602, maxZ: -598 });
  }
  box(40, 0.8, 1, 662, 13, -594, C.warn); for (const x of [642, 682]) box(1, 13, 1, x, 6.5, -594, C.warn, true);
  // railgun battery covering the northern gate-breach corridor
  cyl(5, 6, 3, 735, 1.5, -560, C.darkConcrete, 16); box(5, 3, 6, 735, 4.5, -560, C.olive);
  box(1.2, 1.2, 24, 735, 6.5, -548, C.steel, false); box(1.6, 0.25, 22, 735, 7.25, -548, C.glow);
  ctx.colliders.push({ minX: 729, maxX: 741, minZ: -566, maxZ: -554 });
  // helipads
  for (const [x, z] of [[690, -545], [770, -545]]) { cyl(9, 9, 0.12, x, 0.06, z, C.helipad, 24); box(1, 0.13, 7, x - 2, 0.07, z, C.line); box(1, 0.13, 7, x + 2, 0.07, z, C.line); box(4, 0.13, 1, x, 0.07, z, C.line); }
  // watchtowers on the corners
  for (const [x, z] of [[FORT.x0 + 4, FORT.z0 + 4], [FORT.x1 - 4, FORT.z0 + 4], [FORT.x0 + 4, FORT.z1 - 4], [FORT.x1 - 4, FORT.z1 - 4]]) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.3, 9, 0.3, x + dx * 1.4, 4.5, z + dz * 1.4, C.steel);
    box(4, 2.4, 4, x, 10.2, z, C.olive); box(4.6, 0.3, 4.6, x, 11.55, z, C.darkConcrete); ctx.colliders.push({ minX: x - 2, maxX: x + 2, minZ: z - 2, maxZ: z + 2 });
  }
  B.flush('fort-halberd');

  // =================================================================================
  // 5. Aegis shield spires (and the Westwatch relay compound)
  // =================================================================================
  perimeter(WESTWATCH, 3);
  building(-860, -520, 14, 10, 5, C.olive, { floors: 1 });
  for (const sp of SPIRES) {
    const { x, z } = sp;
    cyl(7, 9, 4, x, 2, z, C.darkConcrete, 8);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; box(1.6, 46, 1.6, x + Math.cos(a) * 3.2, 25, z + Math.sin(a) * 3.2, C.hull, false, -a); }
    cyl(1.2, 1.6, 48, x, 26, z, C.shieldCore, 10);
    for (let y = 12; y <= 44; y += 8) cyl(4.2, 4.2, 0.6, x, y, z, C.glow, 16);
    sphere(3.2, x, 52, z, C.shieldCore, 14);
    ctx.colliders.push({ minX: x - 9, maxX: x + 9, minZ: z - 9, maxZ: z + 9, circleX: x, circleZ: z, circleRadius: 9 });
    ctx.planeBlocks?.push({ minX: x - 5, maxX: x + 5, minZ: z - 5, maxZ: z + 5, top: 56 });
  }
  B.flush('aegis-spires');
  // light beams from each spire to the shield (unlit, additive)
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const beams = SPIRES.map(sp => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.2, 420, 10, 1, true), beamMat); b.position.set(sp.x, 262, sp.z); b.userData.noCull = true; ctx.scene.add(b); return b; });
  for (const sp of SPIRES) ctx.sign?.(sp.name.toUpperCase() + ' · AEGIS SHIELD NODE', sp.x, 6.5, sp.z + 9.4, 12, '#0e3550');
  ctx.destinations?.push(...SPIRES.map(s => ({ name: s.name, x: s.x, z: s.z + 14 })));

  // =================================================================================
  // 6. The Aegis planetary shield — a hex lattice across the whole sky
  // =================================================================================
  const shieldUniforms = { time: { value: 0 }, strength: { value: 1 }, pulse: { value: 0 } };
  const shield = new THREE.Mesh(new THREE.SphereGeometry(440, 48, 24), new THREE.ShaderMaterial({
    uniforms: shieldUniforms, side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: true, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float time; uniform float strength; uniform float pulse; varying vec3 vDir;
      float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0,1.732))), p.x); }
      vec4 hexCoords(vec2 uv){ vec2 r = vec2(1.0,1.732), h = r*0.5; vec2 a = mod(uv,r)-h, b = mod(uv-h,r)-h; vec2 gv = dot(a,a)<dot(b,b)?a:b; return vec4(gv, uv-gv); }
      void main(){
        float up = vDir.y; if (up < -0.02) discard;
        vec2 uv = vDir.xz / (up + 0.35) * 5.0;            // flatter cells overhead, compressed towards the horizon
        vec4 hc = hexCoords(uv);
        float edge = smoothstep(0.465, 0.5, hexDist(hc.xy));
        float shimmer = 0.5 + 0.5 * sin(time * 0.6 + hc.z * 0.9 + hc.w * 1.3);
        float wave = smoothstep(0.0, 0.15, 0.15 - abs(fract(length(hc.zw) * 0.025 - time * 0.05) - 0.5));
        float horizon = smoothstep(0.35, 0.0, up);
        float a = edge * (0.025 + 0.05 * shimmer) + wave * edge * 0.18 + horizon * 0.07 + pulse * edge * 0.6;
        gl_FragColor = vec4(vec3(0.35, 0.78, 1.0) * a * strength, 1.0);
      }`,
  }));
  shield.renderOrder = -0.5; shield.frustumCulled = false; shield.userData.noCull = true;
  ctx.scene.add(shield);

  // =================================================================================
  // 7. People: soldiers, gate guards, guild staff
  // =================================================================================
  const people = [];
  const person = (outfit, x, z, route = null) => { const h = ctx.makePerson({ outfit, hair: 0x2e241c, pants: outfit === 0x4f5a3a ? 0x3b432c : 0x222833 }); h.root.position.set(x, 0.2, z); people.push({ h, route, i: 0, wait: 0 }); return h; };
  person(0x4f5a3a, FORT.gate[0] - 6, FORT.z1 + 4); person(0x4f5a3a, FORT.gate[1] + 4, FORT.z1 + 4);
  for (let i = 0; i < 6; i++) person(0x4f5a3a, 520 + i * 40, -515, [[520 + i * 40, -515], [520 + i * 40, -570], [540 + i * 35, -570], [540 + i * 35, -515]]);
  person(0x4f5a3a, WESTWATCH.gate[0] - 6, WESTWATCH.z1 + 4);
  person(0x1f3c56, desks.hq.x, desks.hq.z + 1); person(0x1f5a7a, desks.aegis.x + 3, desks.aegis.z + 1);
  person(0x6a5a2a, desks.lantern.x - 3, desks.lantern.z + 1); person(0x3a5a2a, desks.thorn.x + 3, desks.thorn.z + 1);
  person(0x2a3f8c, desks.dvla.x, desks.dvla.z + 1);
  for (let i = 0; i < 6; i++) person([0x7a4a6a, 0x3a6a8a, 0x8a6a3a][i % 3], 120 + i * 40, -446, [[100 + i * 40, -446], [140 + i * 40, -446]]);

  // Military vehicles parked inside the fort
  for (let i = 0; i < 3; i++) ctx.makeTank?.(500 + i * 12, -480, Math.PI);
  for (let i = 0; i < 2; i++) ctx.makeMilitaryTruck?.(690 + i * 9, -480, 0);

  // =================================================================================
  // 8. Interactions
  // =================================================================================
  const I = (pos, label, action, r = 3) => ctx.interactables.push({ pos, r, label, action });
  I(desks.inn, 'Rent a room at the Lantern Inn (25 gold, sleep)', () => { if (ctx.money() < 25) return ctx.toast('A room costs 25 gold a night.'); ctx.spend(25); ctx.sleep(); });
  I(shopDoor, 'Buy groceries at the corner shop (12 gold)', () => ctx.buyFood(12, 10));
  I(new THREE.Vector3(FORT.gate[0] - 3, 0.2, FORT.z1 + 4), 'Speak to the Fort Halberd gate sentry', () => ctx.toast(ctx.authorised()
    ? 'Sentry: Joint Task Force pass verified. Stay on the marked roads and keep powers holstered.'
    : 'Sentry: Fort Halberd is a restricted Defence Force site. Entry without authorisation is an offence under the Official Secrets and Defence Sites Act; intruders will be stopped by force. Rank C hunters on joint task force duty may enter.'));
  I(fortRadio, 'Fort Halberd operations desk', () => ctx.toast('Operations: the railgun battery covers the northern gate-breach corridor. The Aegis Spire beside you keeps the planetary shield powered. Do not fly over the base.'));
  for (const sp of SPIRES) I(new THREE.Vector3(sp.x, 0.2, sp.z + 11), `Read the ${sp.name} status panel`, () => ctx.toast(`${sp.name}: output nominal. The Aegis Shield is a planet-wide hex lattice fed by spire nodes. It stops meteors, orbital debris and high-tier monsters from outside — not the gates that open inside it.`));

  // =================================================================================
  // 9. Update: patrols, restricted-zone enforcement, shield shimmer
  // =================================================================================
  let warnCd = 0, alertCd = 0, time = 0;
  function update(dt, { sky, inSpace, underground }) {
    time += dt;
    shieldUniforms.time.value = time;
    shieldUniforms.pulse.value = Math.max(0, shieldUniforms.pulse.value - dt * 0.6);
    shield.visible = !inSpace && !underground;
    for (const b of beams) b.visible = shield.visible;
    if (sky) { shield.position.copy(sky.position); shield.scale.copy(sky.scale); }
    for (const p of people) {
      let moving = false;
      if (p.route) {
        if (p.wait > 0) p.wait -= dt;
        else {
          const [tx, tz] = p.route[p.i], pos = p.h.root.position, dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz);
          if (d < 0.6) { p.i = (p.i + 1) % p.route.length; p.wait = 2 + Math.random() * 3; }
          else { const s = Math.min(d, 1.4 * dt); pos.x += dx / d * s; pos.z += dz / d * s; p.h.root.rotation.y = Math.atan2(dx, dz); moving = true; }
        }
      }
      ctx.animatePerson(p.h, moving, dt);
    }
    warnCd -= dt; alertCd -= dt;
    const pos = ctx.playerPosition();
    for (const zone of restrictedZones) {
      if (ctx.authorised()) break;
      if (insideRect(zone, pos)) { if (alertCd <= 0) { alertCd = 6; ctx.onIntrusion(zone); } }
      else if (insideRect(zone, pos, 25) && warnCd <= 0) { warnCd = 12; ctx.toast(`Warning: you are approaching ${zone.name}, a restricted defence site. Turn back.`); }
    }
  }
  return {
    update, shield, desks, spires: SPIRES, patrolPoints: PATROL_POINTS,
    pulseShield() { shieldUniforms.pulse.value = 1; },
    groundAt: null,
  };
}
