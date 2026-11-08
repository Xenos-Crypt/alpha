// University of Westhaven: a campus north of the East Road.
// Through the gate: a lawned quad with paths, trees, benches and a fountain, the Senate House (lecture
// theatres and the registry) at the far end under a clock tower, the University Library on the
// west side and the Faculty of Science and Engineering on the east. Students cross the quad between
// classes. Inside, the registry enrols you on degree courses (see careers.js).
import * as THREE from 'three';

export const CAMPUS = { x: 725, z: -190, gateZ: -118, minX: 662, maxX: 788, minZ: -258, maxZ: -116 };

export function buildUniversity(ctx) {
  const { scene, colliders, civicBuildings, makeTex, makePerson, animatePerson, glowMats } = ctx;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null }); if (o.glow) glowMats?.push(m); mats.set(k, m); } return mats.get(k); };
  const B = (w, h, d, x, y, z, c, solid = false, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > 0.5; m.receiveShadow = true; scene.add(m); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return m; };
  const C = (r, h, x, y, z, c, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), c instanceof THREE.Material ? c : mat(c)); m.position.set(x, y, z); m.castShadow = true; scene.add(m); return m; };
  const brick = mat(0x9a5b42), stone = mat(0xe4ddcc), glass = mat(0x7ea6bd, { rough: 0.15, metal: 0.4, emissive: 0xffd58a, ei: 0, glow: true }), slate = mat(0x3f474f);
  const sign = (text, sub, w, x, y, z, ry, bg = '#3b1f2b') => { const t = makeTex(512, 96, g => { g.scale(0.5, 0.5); g.fillStyle = bg; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#f2e6c8'; g.font = 'bold 80px Georgia, serif'; g.textAlign = 'center'; g.fillText(text, 512, sub ? 92 : 118, 980); if (sub) { g.font = 'italic 40px Georgia, serif'; g.fillText(sub, 512, 160, 980); } }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.1875), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); };
  const { x: cx } = CAMPUS;

  // access road from the East Road and the gate
  B(9, 0.06, 36, cx, 0.045, -100, 0x2e3135, false, { rough: 0.95 });
  for (const s of [-1, 1]) { B(1.4, 6, 1.4, cx + s * 6.5, 3, CAMPUS.gateZ, stone, true); C(0.9, 0.6, cx + s * 6.5, 6.3, CAMPUS.gateZ, stone); }
  B(14.4, 1.4, 1.2, cx, 6.2, CAMPUS.gateZ, stone); sign('UNIVERSITY OF WESTHAVEN', 'founded 1891 · scientia et virtus', 12, cx, 6.2, CAMPUS.gateZ + 0.65, 0);
  // low railings round the campus, with the gate gap
  const rail = mat(0x1f2326, { metal: 0.6 });
  for (const [x0, x1, z0, z1] of [[CAMPUS.minX, cx - 7.2, CAMPUS.gateZ, CAMPUS.gateZ], [cx + 7.2, CAMPUS.maxX, CAMPUS.gateZ, CAMPUS.gateZ], [CAMPUS.minX, CAMPUS.minX, CAMPUS.minZ, CAMPUS.gateZ], [CAMPUS.maxX, CAMPUS.maxX, CAMPUS.minZ, CAMPUS.gateZ], [CAMPUS.minX, CAMPUS.maxX, CAMPUS.minZ, CAMPUS.minZ]]) {
    const w = Math.max(0.1, x1 - x0), d = Math.max(0.1, z1 - z0); B(w, 1.2, d, (x0 + x1) / 2, 0.6, (z0 + z1) / 2, rail, true);
  }
  // quad: lawn, paths, fountain, trees, benches
  B(CAMPUS.maxX - CAMPUS.minX - 2, 0.05, CAMPUS.gateZ - CAMPUS.minZ - 2, cx, 0.03, (CAMPUS.gateZ + CAMPUS.minZ) / 2, 0x5d8a3a, false, { rough: 1 });
  B(5, 0.07, 118, cx, 0.06, -177, 0xd8cba8); B(56, 0.07, 5, cx, 0.06, -190, 0xd8cba8);
  C(4.2, 0.6, cx, 0.3, -190, stone, 32); C(3.7, 0.12, cx, 0.62, -190, mat(0x4aa3c9, { rough: 0.1, metal: 0.3 }), 32); C(0.5, 2.4, cx, 1.5, -190, stone); C(1.3, 0.3, cx, 2.8, -190, stone, 20);
  colliders.push({ circleX: cx, circleZ: -190, circleRadius: 4.2, minX: cx - 4.2, maxX: cx + 4.2, minZ: -194.2, maxZ: -185.8 });
  const tree = (x, z) => { C(0.25, 3, x, 1.5, z, 0x5a3b22, 8); const top = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), mat(0x3f7d3a)); top.position.set(x, 4.2, z); top.castShadow = true; scene.add(top); colliders.push({ circleX: x, circleZ: z, circleRadius: 0.4, minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 }); };
  for (const z of [-135, -155, -215, -232]) for (const s of [-1, 1]) tree(cx + s * 14, z);
  const seats = [];
  for (const z of [-145, -165, -210, -225]) for (const s of [-1, 1]) { B(2.2, 0.12, 0.6, cx + s * 5.5, 0.48, z, 0x6b4a30); B(2.2, 0.5, 0.1, cx + s * 5.8, 0.75, z, 0x6b4a30); seats.push({ x: cx + s * 5.4, z, yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, seatY: 0.48, label: 'Sit on the bench' }); }
  ctx.sitSpots?.push(...seats);

  // Senate House at the far end: brick, stone portico, clock tower
  const sh = { x: cx, z: -246, w: 44, d: 20, h: 13 };
  B(sh.w, sh.h, sh.d, sh.x, sh.h / 2, sh.z, brick);
  for (let y = 1.4; y < sh.h - 1; y += 3.8) for (let x = -sh.w / 2 + 2.5; x < sh.w / 2 - 2; x += 3.2) B(1.6, 2.2, 0.1, sh.x + x, y + 1.1, sh.z + sh.d / 2 + 0.03, glass);
  for (let i = -3; i <= 3; i++) C(0.45, 9, sh.x + i * 2.6, 4.5, sh.z + sh.d / 2 + 2.4, stone);
  B(19.5, 0.4, 4.6, sh.x, 0.2, sh.z + sh.d / 2 + 2.3, stone); B(20, 1.4, 5, sh.x, 9.7, sh.z + sh.d / 2 + 2.3, stone);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-10.2, 0), new THREE.Vector2(10.2, 0), new THREE.Vector2(0, 3.0)]), { depth: 5, bevelEnabled: false }), stone); ped.position.set(sh.x, 10.4, sh.z + sh.d / 2 - 0.2); scene.add(ped);
  B(3, 3.6, 0.15, sh.x, 1.8, sh.z + sh.d / 2 + 0.05, 0x3b2b1f);
  B(6, 10, 6, sh.x, sh.h + 5, sh.z - 2, brick); B(6.6, 0.6, 6.6, sh.x, sh.h + 10.2, sh.z - 2, stone);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 6, 4), slate); spire.rotation.y = Math.PI / 4; spire.position.set(sh.x, sh.h + 13.5, sh.z - 2); scene.add(spire);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32), mat(0xf6f1e7)); face.position.set(sh.x, sh.h + 6.5, sh.z + 1.02); scene.add(face);
  const hands = [B(0.12, 1.3, 0.05, sh.x, sh.h + 6.5, sh.z + 1.06, 0x111111), B(0.1, 1.6, 0.05, sh.x, sh.h + 6.5, sh.z + 1.08, 0x111111)];
  for (const hnd of hands) { hnd.geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.45, 0); }
  sign('SENATE HOUSE', 'lectures · registry · exams', 9, sh.x, 12.0, sh.z + sh.d / 2 + 4.85, 0);
  colliders.push({ minX: sh.x - sh.w / 2, maxX: sh.x + sh.w / 2, minZ: sh.z - sh.d / 2, maxZ: sh.z + sh.d / 2 });
  civicBuildings.push({ type: 'university', name: 'University of Westhaven', x: sh.x, z: sh.z, minX: sh.x - sh.w / 2, maxX: sh.x + sh.w / 2, minZ: sh.z - sh.d / 2, maxZ: sh.z + sh.d / 2 });

  // Library (west) and Science & Engineering (east), facing the quad
  for (const [x, name, type, sub, col] of [[682, 'University Library', 'library', 'reading rooms · archives', stone], [768, 'Faculty of Science and Engineering', 'university', 'labs · workshops · lecture halls', mat(0xb7b9bb)]]) {
    const w = 20, d = 34, h = 11, fx = x < cx ? 1 : -1;
    B(w, h, d, x, h / 2, -190, col);
    for (let y = 1.4; y < h - 1; y += 3.4) for (let z = -205; z <= -175; z += 3) B(0.1, 2.2, 1.6, x + fx * (w / 2 + 0.03), y + 1.1, z, glass);
    B(0.15, 3.4, 3, x + fx * (w / 2 + 0.05), 1.7, -190, 0x3b2b1f);
    for (let i = -1; i <= 1; i++) C(0.35, 5, x + fx * (w / 2 + 1.8), 2.5, -190 + i * 2.2, stone);
    B(3.2, 0.5, 7, x + fx * (w / 2 + 1.7), 5.2, -190, stone);
    sign(name.toUpperCase(), sub, 8, x + fx * (w / 2 + 3.5), 6.2, -190, fx > 0 ? Math.PI / 2 : -Math.PI / 2);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: -190 - d / 2, maxZ: -190 + d / 2 });
    civicBuildings.push({ type, name, x, z: -190, minX: x - w / 2, maxX: x + w / 2, minZ: -190 - d / 2, maxZ: -190 + d / 2 });
  }
  ctx.destinations?.push({ name: 'University of Westhaven', x: cx, z: CAMPUS.gateZ + 4 });

  // students crossing the quad
  const students = [];
  if (makePerson) {
    const routes = [[cx - 2, -125, cx - 2, -230], [cx + 2, -232, cx + 2, -128], [cx - 26, -190, cx + 26, -190], [cx + 25, -192, cx - 25, -192], [cx - 1.5, -140, cx - 1.5, -235], [cx + 18, -150, cx - 18, -150]];
    routes.forEach((r, i) => { const h = makePerson({ outfit: [0x2980b9, 0xc0392b, 0x16a085, 0x8e44ad, 0xf39c12, 0x2c3e50][i], hair: [0x2b1d14, 0xc9a26a, 0x111111, 0x5a3b22, 0x8a3b1f, 0x111111][i], pants: 0x2d3142 });
      const bag = new THREE.Mesh(boxGeo, mat(0x333333)); bag.scale.set(0.35, 0.4, 0.15); bag.position.set(0, 1.35, -0.25); h.rig.add(bag); students.push({ h, r, t: i * 5 }); });
  }
  let clock = 0;
  function update(dt, playerPos) {
    clock += dt;
    hands[0].rotation.z = -clock * 0.02; hands[1].rotation.z = -clock * 0.24;
    if (Math.hypot(playerPos.x - cx, playerPos.z + 190) > 200) return;
    for (const s of students) { s.t += dt; const T = 40, f = (s.t % (2 * T)) / T, back = f > 1, u = back ? 2 - f : f, [x0, z0, x1, z1] = s.r;
      s.h.root.position.set(x0 + (x1 - x0) * u, 0.05, z0 + (z1 - z0) * u); s.h.root.rotation.y = Math.atan2((x1 - x0) * (back ? -1 : 1), (z1 - z0) * (back ? -1 : 1)); animatePerson(s.h, true, dt); }
  }
  return { update };
}
