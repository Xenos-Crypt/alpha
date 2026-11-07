// Westhaven Superstore: a big walk-in supermarket on the North Road, just outside the town centre.
// A car park with trolley bays out front, sliding doors, fruit and veg by the entrance, four signed
// aisles, a bakery counter, chiller cabinets along the back, and staffed checkouts. Shoppers push
// trolleys round the aisles. Each aisle sells its own groceries; the checkouts sell everything.
// Everything you buy goes into your kitchen at home, ready to cook (see kitchen.js).
import * as THREE from 'three';
import { AISLES } from './kitchen.js';
import { floorMaterial } from './floor-textures.js';

export const SUPERSTORE = { x0: 36, x1: 72, z0: -242, z1: -198, door: -220 };   // the doors face west, onto the North Road

export function buildSupermarket(ctx) {
  const { scene, colliders, camBlockers, planeBlocks, interactables, makeTex, makePerson, animatePerson, kitchen } = ctx;
  const S = SUPERSTORE, H = 7, cz = (S.z0 + S.z1) / 2;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, transparent: o.opacity != null, opacity: o.opacity ?? 1 })); return mats.get(k); };
  const B = (x0, x1, y0, y1, z0, z1, c, solid = false, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(x1 - x0, y1 - y0, z1 - z0); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = y1 - y0 > 0.4; m.receiveShadow = true; scene.add(m); if (solid) colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }); return m; };
  const label = (text, x, y, z, ry, w = 4, bg = '#0f5132', fg = '#ffffff') => { const t = makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66, 490); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const spot = (x, z, r, text, action) => interactables.push({ pos: new THREE.Vector3(x, 0, z), r, label: text, action });

  // ---- car park ----
  B(6, S.x0, 0.01, 0.05, S.z0 - 4, S.z1 + 4, 0x3d4145, false, { rough: 0.95 });
  for (let z = S.z0 - 2; z <= S.z1 + 2; z += 3) for (const x of [10, 30]) B(x - 4, x + 4, 0.05, 0.06, z - 0.06, z + 0.06, 0xf2f0df);
  B(18, 18.1, 0.05, 0.06, S.z0, S.z1, 0xf2f0df);
  for (const z of [S.z0 + 6, S.z1 - 6]) { B(19.4, 22.6, 0, 2.4, z - 1.2, z + 1.2, 0x2f6f8f, false, { opacity: 0.35 }); B(19.4, 22.6, 2.4, 2.55, z - 1.3, z + 1.3, 0x0f5132); }   // trolley shelters
  // ---- the building: walls with a glass front and doorway ----
  const wallMat = mat(0xe8e4dc, { rough: 0.9 }), green = mat(0x0f5132);
  B(S.x0, S.x1, 0, H, S.z0 - 0.3, S.z0, wallMat, true); B(S.x0, S.x1, 0, H, S.z1, S.z1 + 0.3, wallMat, true); B(S.x1, S.x1 + 0.3, 0, H, S.z0, S.z1, wallMat, true);
  const dw = 2.5;
  B(S.x0 - 0.3, S.x0, 0, H, S.z0, S.door - dw, mat(0x88b4cc, { opacity: 0.45, rough: 0.1, metal: 0.3 }), true); B(S.x0 - 0.3, S.x0, 0, H, S.door + dw, S.z1, mat(0x88b4cc, { opacity: 0.45, rough: 0.1, metal: 0.3 }), true);
  for (let z = S.z0; z <= S.z1; z += 4) B(S.x0 - 0.4, S.x0 + 0.1, 0, H, z - 0.15, z + 0.15, green);
  B(S.x0 - 0.4, S.x0 + 0.1, 2.8, H, S.door - dw, S.door + dw, green);
  const doors = [B(S.x0 - 0.25, S.x0 - 0.15, 0, 2.8, S.door - dw, S.door, mat(0xbfe0f0, { opacity: 0.4, rough: 0.05 })), B(S.x0 - 0.25, S.x0 - 0.15, 0, 2.8, S.door, S.door + dw, mat(0xbfe0f0, { opacity: 0.4, rough: 0.05 }))];
  const roof = B(S.x0 - 1.5, S.x1 + 0.5, H, H + 0.4, S.z0 - 0.5, S.z1 + 0.5, 0x5b6167); camBlockers?.push(roof);
  B(S.x0 - 3.5, S.x0, 3.0, 3.25, S.door - 5, S.door + 5, green);   // entrance canopy
  planeBlocks?.push({ minX: S.x0, maxX: S.x1, minZ: S.z0, maxZ: S.z1, top: H + 0.4 });
  const big = makeTex(1024, 192, g => { g.fillStyle = '#0f5132'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(96, 96, 62, 0, Math.PI * 2); g.fill(); g.fillStyle = '#0f5132'; g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.fillText('W', 96, 120); g.fillStyle = '#fff'; g.font = 'bold 92px sans-serif'; g.textAlign = 'left'; g.fillText('WESTHAVEN SUPERSTORE', 180, 128, 820); });
  const bigSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.75), new THREE.MeshStandardMaterial({ map: big, emissive: 0xffffff, emissiveMap: big, emissiveIntensity: 0.35 })); bigSign.position.set(S.x0 - 0.45, 5.0, cz); bigSign.rotation.y = -Math.PI / 2; scene.add(bigSign);
  // ---- inside: floor, lights ----
  B(S.x0, S.x1, 0.0, 0.05, S.z0, S.z1, floorMaterial(makeTex, 'tiles', 0xdfe3e2, S.x1 - S.x0, S.z1 - S.z0));
  B(S.x0 + 0.1, S.x1 - 0.1, H - 0.03, H - 0.01, S.z0 + 0.1, S.z1 - 0.1, 0xe6e9ec, false, { emissive: 0x6a6d70, ei: 1 });   // ceiling
  const panel = mat(0xffffff, { emissive: 0xffffff, ei: 1.2 });
  for (let x = S.x0 + 5; x < S.x1 - 2; x += 8) for (let z = S.z0 + 5; z < S.z1 - 2; z += 8) B(x - 1.2, x + 1.2, H - 0.06, H - 0.02, z - 0.4, z + 0.4, panel);
  for (const [x, z] of [[46, cz - 10], [46, cz + 10], [62, cz]]) { const l = new THREE.PointLight(0xffffff, 12, 30, 1.4); l.position.set(x, H - 0.8, z); scene.add(l); }
  // ---- fruit and veg near the door ----
  const veg = [0xd94f3d, 0xf2c14e, 0x5bb36a, 0xe67e22, 0x8e44ad, 0x2ecc71];
  for (let i = 0; i < 3; i++) { const x = S.x0 + 6.5 + i * 3.2, z = S.z0 + 4; B(x - 1.2, x + 1.2, 0, 0.8, z - 0.9, z + 0.9, 0x8a6440, true); for (let k = 0; k < 4; k++) B(x - 1.1 + k * 0.55, x - 0.6 + k * 0.55, 0.8, 0.95, z - 0.8, z + 0.8, veg[(i * 4 + k) % veg.length]); }
  label('FRUIT & VEG', S.x0 + 9.7, 3.6, S.z0 + 4, 0, 4.5);
  spot(S.x0 + 9.7, S.z0 + 6, 2.4, 'Shop fruit and veg', () => kitchen().openGroceries('Fruit and veg', 0, AISLES[0].items));
  // ---- aisles (shelving running away from the door) ----
  const stock = [0xc0392b, 0xf39c12, 0x27ae60, 0x2980b9, 0x8e44ad, 0xecf0f1, 0xd35400, 0x16a085];
  const aisleZ = [cz - 7.5, cz - 2.5, cz + 2.5, cz + 7.5], ax0 = S.x0 + 14, ax1 = S.x1 - 6;
  for (const z of [cz - 10, cz - 5, cz, cz + 5, cz + 10]) {
    B(ax0, ax1, 0, 2.1, z - 0.55, z + 0.55, 0x8a939c, true, { metal: 0.3 });
    for (let lvl = 0; lvl < 4; lvl++) for (let x = ax0 + 0.3; x < ax1 - 0.6; x += 0.7) for (const s of [-1, 1]) B(x, x + 0.55, 0.15 + lvl * 0.5, 0.45 + lvl * 0.5, z + s * 0.56 - 0.12, z + s * 0.56 + 0.12, stock[(Math.floor(x * 3) + lvl * 3 + (s > 0 ? 1 : 0) + Math.floor(z)) % stock.length]);
  }
  [AISLES[1], AISLES[2], AISLES[3], { name: 'Household', icon: '🧽', items: null }].forEach((a, i) => {
    const z = aisleZ[i]; label(`${i + 1}  ${a.name.toUpperCase()}`, ax0 - 0.2, 4.2, z, -Math.PI / 2, 4.2, '#ffd23f', '#0f5132');
    B(ax0 - 0.25, ax0 - 0.2, 4.2, H - 0.05, z - 0.02, z + 0.02, 0x555555);
    if (a.items) spot(ax0 + 3, z, 2.2, `Shop the ${a.name.toLowerCase()} aisle`, () => kitchen().openGroceries(a.name, 0, a.items));
    else spot(ax0 + 3, z, 2.2, 'Browse household goods', () => ctx.toast('🧽 Washing-up liquid, sponges, bin bags, light bulbs... you have all that at home already.'));
  });
  // ---- chillers along the back, bakery counter in the corner ----
  for (let z = S.z0 + 2; z < S.z1 - 2; z += 3.2) { B(S.x1 - 1.1, S.x1 - 0.05, 0, 2.1, z, z + 3, 0x2b3036, true); for (let k = 0; k < 4; k++) B(S.x1 - 1.13, S.x1 - 1.1, 0.35 + k * 0.42, 0.6 + k * 0.42, z + 0.1, z + 2.9, mat(0xbfe9ff, { emissive: 0x9fdcff, ei: 0.6, opacity: 0.7 })); }
  label('CHILLED · DAIRY · MEAT', S.x1 - 0.2, 3.4, cz, -Math.PI / 2, 6);
  spot(S.x1 - 2, cz, 2.2, 'Shop the chillers', () => kitchen().openGroceries('Chilled', 0, ['milk', 'butter', 'cheese', 'eggs', 'bacon', 'chicken', 'beef', 'fish']));
  B(S.x0 + 6, S.x0 + 12, 0, 1.1, S.z1 - 3.5, S.z1 - 2.5, 0xd8c3a5, true); B(S.x0 + 6, S.x0 + 12, 1.1, 1.6, S.z1 - 3.5, S.z1 - 2.5, mat(0xfff4e0, { opacity: 0.4 }));
  for (let i = 0; i < 8; i++) B(S.x0 + 6.3 + i * 0.7, S.x0 + 6.8 + i * 0.7, 1.12, 1.3, S.z1 - 3.3, S.z1 - 2.7, 0xc68642);
  label('BAKERY', S.x0 + 9, 3.2, S.z1 - 0.4, Math.PI, 3.6, '#8a5a2b');
  spot(S.x0 + 9, S.z1 - 5, 2.2, 'Buy from the bakery', () => kitchen().openGroceries('Bakery', 0, ['bread', 'flour', 'eggs', 'butter']));
  // ---- checkouts by the door ----
  const tills = [cz - 8, cz - 3, cz + 3];
  for (const z of tills) {
    B(S.x0 + 5, S.x0 + 9, 0, 0.95, z - 0.45, z + 0.45, 0x2f4f6f, true); B(S.x0 + 5.2, S.x0 + 8, 0.95, 0.97, z - 0.3, z + 0.3, 0x1a1a1a);
    B(S.x0 + 8.4, S.x0 + 8.8, 0.95, 1.3, z - 0.2, z + 0.2, 0x333333); B(S.x0 + 9.1, S.x0 + 9.2, 0, 1.9, z + 0.5, z + 0.6, 0x555555);
    const num = label(`${tills.indexOf(z) + 1}`, S.x0 + 9.15, 2.1, z + 0.55, -Math.PI / 2, 0.8, '#ffd23f', '#0f5132'); void num;
    spot(S.x0 + 7, z - 1.0, 1.6, 'Pay at the checkout: buy groceries', () => kitchen().openGroceries('Westhaven Superstore'));
  }
  // ---- people: cashiers and shoppers ----
  const people = [];
  if (makePerson) {
    for (const z of tills) { const h = makePerson({ outfit: 0x0f5132, hair: [0x2b1d14, 0xc9a26a, 0x111111][tills.indexOf(z)], pants: 0x222222 }); h.root.position.set(S.x0 + 7, 0, z + 0.9); h.root.rotation.y = Math.PI; people.push({ h, still: true }); }
    const trolleyMesh = () => { const g = new THREE.Group(); const wire = mat(0xb8bcc2, { metal: 0.8, rough: 0.3 }); for (const [w, hh, d, x, y, z] of [[0.6, 0.5, 0.9, 0, 0.75, 0.3], [0.62, 0.03, 0.03, 0, 1.05, 0.8]]) { const m = new THREE.Mesh(boxGeo, wire); m.scale.set(w, hh, d); m.position.set(x, y, z); g.add(m); } scene.add(g); return g; };
    const routes = [[S.x0 + 12, cz - 7.5, S.x1 - 7, cz - 7.5], [S.x1 - 7, cz + 2.5, S.x0 + 12, cz + 2.5], [S.x0 + 12, cz + 7.5, S.x1 - 7, cz + 7.5], [S.x0 + 6, S.z0 + 6.5, S.x0 + 14, S.z1 - 6]];
    routes.forEach((r, i) => { const h = makePerson({ outfit: [0xc0392b, 0x2980b9, 0x8e44ad, 0x16a085][i], hair: [0x5a3b22, 0x111111, 0xc9a26a, 0x2b1d14][i], pants: 0x2d3142 }); people.push({ h, r, t: i * 3.7, trolley: i < 3 ? trolleyMesh() : null }); });
  }
  // ---- per frame: doors slide open when someone is near, shoppers potter about ----
  let clock = 0;
  function update(dt, playerPos) {
    clock += dt;
    const near = Math.abs(playerPos.x - S.x0) < 4 && Math.abs(playerPos.z - S.door) < 4;
    const open = Math.max(0, Math.min(1, (doors[0].userData.o ?? 0) + (near ? dt * 3 : -dt * 3))); doors[0].userData.o = open;
    doors[0].position.z = S.door - dw / 2 - open * dw * 0.9; doors[1].position.z = S.door + dw / 2 + open * dw * 0.9;
    if (Math.hypot(playerPos.x - (S.x0 + S.x1) / 2, playerPos.z - cz) > 120) return;
    for (const p of people) {
      if (p.still) { animatePerson(p.h, false, dt); continue; }
      p.t += dt; const T = 22, f = (p.t % (2 * T)) / T, back = f > 1, u = back ? 2 - f : f, [x0, z0, x1, z1] = p.r;
      const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, yaw = Math.atan2((x1 - x0) * (back ? -1 : 1), (z1 - z0) * (back ? -1 : 1));
      const pause = Math.sin(p.t * 0.7) > 0.85;   // stop to look at the shelves now and then
      if (pause) p.t -= dt;
      p.h.root.position.set(x, 0, z); p.h.root.rotation.y = pause ? yaw + Math.PI / 2 : yaw; animatePerson(p.h, !pause, dt);
      if (p.trolley) { p.trolley.position.set(x + Math.sin(yaw) * 0.45, 0, z + Math.cos(yaw) * 0.45); p.trolley.rotation.y = yaw; if (!pause) { p.h.armL.pivot.rotation.x = p.h.armR.pivot.rotation.x = -1.1; } }
    }
  }
  ctx.destinations?.push({ name: 'Westhaven Superstore', x: S.x0 - 6, z: S.door });
  return { update };
}
