// What the nation's progress looks like in the world:
//  • the ATLAS base in the Capital: the national AI's tower, server halls and dish, with the robot
//    workers it has built walking its grounds and robot soldiers guarding it;
//  • the temple dig in the countryside: an ancient stepped temple that rises out of the ground as the
//    archaeologists uncover it, with their tents and the team at work;
//  • self-driving cars: as Velo Motors releases them, more and more traffic has no driver and a sensor on the roof.
import * as THREE from 'three';

export const ATLAS_BASE = { x: 80, z: 922 }, TEMPLE_DIG = { x: -147, z: -357 }, WASTE_CENTRE = { x: 283, z: -411 };

export function buildAtlasWorld(ctx) {
  const { scene, groundY, S } = ctx;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .5, ...o });
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const solid = (x0, x1, z0, z1, top) => { ctx.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 }); ctx.planeBlocks?.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, bottom: 0, top }); };

  // ---- ATLAS base ------------------------------------------------------------------------------------
  const A = ATLAS_BASE, ay = groundY(A.x, A.z);
  add(new THREE.BoxGeometry(36, .4, 36), M(0xd9dee3), A.x, ay + .2, A.z);
  const glass = M(0x1d3557, { metalness: .7, roughness: .15, emissive: 0x0b2a4a, emissiveIntensity: .6 });
  add(new THREE.CylinderGeometry(6, 7, 32, 24), glass, A.x, ay + 16.4, A.z);
  add(new THREE.CylinderGeometry(6.6, 6.6, .6, 24), M(0xe9edf0), A.x, ay + 32.6, A.z);
  const rings = [];
  for (const h of [8, 16, 24]) { const r = add(new THREE.TorusGeometry(8.2, .18, 8, 48), new THREE.MeshBasicMaterial({ color: 0x5ff0ff }), A.x, ay + h, A.z); r.rotation.x = Math.PI / 2; rings.push(r); }
  const core = add(new THREE.SphereGeometry(1.4, 20, 14), new THREE.MeshBasicMaterial({ color: 0x8ff7ff }), A.x, ay + 35, A.z);
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(8, 5, 26), M(0x9aa6b0, { metalness: .4 }), A.x + s * 13, ay + 2.9, A.z); solid(A.x + s * 13 - 4, A.x + s * 13 + 4, A.z - 13, A.z + 13, 5.4); for (let k = -10; k <= 10; k += 4) add(new THREE.BoxGeometry(.1, 1.2, 2.4), new THREE.MeshBasicMaterial({ color: 0x47e1ff }), A.x + s * 17.05, ay + 3, A.z + k); }
  solid(A.x - 6.5, A.x + 6.5, A.z - 6.5, A.z + 6.5, 33);
  const dish = new THREE.Group(); dish.position.set(A.x + 13, ay + 5.4, A.z - 9); scene.add(dish);
  add(new THREE.CylinderGeometry(.2, .3, 3, 8), M(0xcfd6db), 0, 1.5, 0, dish);
  const bowl = add(new THREE.SphereGeometry(2.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), M(0xf2f4f5, { side: THREE.DoubleSide }), 0, 3.4, 0, dish); bowl.rotation.x = -2.2;
  {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160; const g = cv.getContext('2d');
    g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#7ff3ff'; g.font = 'bold 74px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('ATLAS', 512, 78); g.fillStyle = '#dfe7ee'; g.font = '30px system-ui,sans-serif'; g.fillText('National AI of A.T. · Unity Network', 512, 130);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    for (const [z, ry] of [[A.z - 18.6, Math.PI], [A.z + 18.6, 0]]) { const s = add(new THREE.PlaneGeometry(12, 1.9), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }), A.x, ay + 2.2, z); s.rotation.y = ry; }
  }
  ctx.interactables.push({ pos: new THREE.Vector3(A.x, ay, A.z - 8), r: 4, label: 'Talk to ATLAS', action: () => ctx.openTab('atlas') });
  ctx.interactables.push({ pos: new THREE.Vector3(A.x, ay, A.z + 8), r: 4, label: 'Talk to ATLAS', action: () => ctx.openTab('atlas') });
  ctx.destinations?.push({ name: 'ATLAS national AI base', x: A.x, z: A.z - 20 });

  // robots: workers walk the grounds, soldiers stand guard
  const robots = [], soldiers = [];
  const visor = new THREE.MeshBasicMaterial({ color: 0x5ff0ff });
  function robot(colour, soldier) {
    const h = ctx.makePerson({ outfit: colour, hair: 0x2a2f35, skin: soldier ? 0x5d6670 : 0xb9c3cc, pants: soldier ? 0x30363d : 0x8a96a2, shoes: 0x22272c });
    const v = new THREE.Mesh(new THREE.BoxGeometry(.32, .07, .05), visor); v.position.set(0, 1.62, .2); h.rig.add(v);
    return h;
  }
  // ---- the temple dig ---------------------------------------------------------------------------------
  const T = TEMPLE_DIG, ty = groundY(T.x, T.z);
  add(new THREE.BoxGeometry(44, .06, 44), M(0x8a6a48, { roughness: 1 }), T.x, ty + .03, T.z).castShadow = false;
  for (let i = -2; i <= 2; i++) { add(new THREE.BoxGeometry(40, .08, .9), M(0x5a4330, { roughness: 1 }), T.x, ty + .07, T.z + i * 8); }
  const temple = new THREE.Group(); scene.add(temple);
  const stone = M(0xb8a888, { roughness: .95 }), dark = M(0x8f7f62, { roughness: .95 });
  add(new THREE.BoxGeometry(24, 1.4, 24), dark, 0, .7, 0, temple); add(new THREE.BoxGeometry(18, 1.4, 18), stone, 0, 2.1, 0, temple); add(new THREE.BoxGeometry(12, 1.4, 12), dark, 0, 3.5, 0, temple);
  add(new THREE.BoxGeometry(4, 4.2, 6), stone, 0, 6.3, 0, temple);
  for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(4, .35, 1), stone, 0, .35 + k * .7, -12.5 + k * 1.2, temple);   // the steps
  for (const [cx, cz] of [[-5, -5], [5, -5], [-5, 5], [5, 5], [0, -5], [0, 5], [-5, 0], [5, 0]]) add(new THREE.CylinderGeometry(.45, .55, 4.6, 10), stone, cx, 6.5, cz, temple);
  add(new THREE.BoxGeometry(12, .6, 12), dark, 0, 9, 0, temple);
  temple.position.set(T.x, ty, T.z);
  for (const [dx, dz, c] of [[-17, 16, 0xe8e0c8], [-12, 18, 0xd9cfa8], [17, 17, 0xcfd8c0]]) { const t = add(new THREE.ConeGeometry(2.6, 2.6, 4), M(c), T.x + dx, ty + 1.3, T.z + dz); t.rotation.y = Math.PI / 4; }
  {
    const cv = document.createElement('canvas'); cv.width = 768; cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#3b2c1d'; g.fillRect(0, 0, 768, 128); g.fillStyle = '#f3e6c4'; g.font = 'bold 44px serif'; g.textAlign = 'center'; g.fillText('ANCIENT TEMPLE EXCAVATION', 384, 62); g.font = '26px serif'; g.fillText('National Heritage Dig · Keep to the boards', 384, 104);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const s = add(new THREE.PlaneGeometry(6, 1), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }), T.x, ty + 1.8, T.z - 23); s.rotation.y = Math.PI;
    add(new THREE.BoxGeometry(.15, 1.8, .15), M(0x5a4330), T.x - 2.6, ty + .9, T.z - 23); add(new THREE.BoxGeometry(.15, 1.8, .15), M(0x5a4330), T.x + 2.6, ty + .9, T.z - 23);
  }
  const diggers = [];
  for (let i = 0; i < 4; i++) { const h = ctx.makePerson({ outfit: [0xc9a46a, 0x8f9e6b, 0xd7c49e, 0x7b8f99][i], hair: 0x3a2a1c, pants: 0x5b4a36 }); const a = i * Math.PI / 2 + .4; h.root.position.set(T.x + Math.cos(a) * 14, ty, T.z + Math.sin(a) * 14); h.root.rotation.y = Math.atan2(T.x - h.root.position.x, T.z - h.root.position.z); diggers.push(h); }
  ctx.interactables.push({ pos: new THREE.Vector3(T.x, ty, T.z - 21), r: 3.5, label: 'Talk to the dig director', action: () => ctx.openTab('atlas') });
  ctx.destinations?.push({ name: 'Ancient temple dig', x: T.x, z: T.z - 25 });

  // ---- the waste & recycling centre: the landfill mound grows with what is buried there ----------------
  const R = WASTE_CENTRE, ry = groundY(R.x, R.z);
  add(new THREE.BoxGeometry(44, .1, 44), M(0x5d5a52, { roughness: 1 }), R.x, ry + .05, R.z).castShadow = false;
  const mound = add(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0x6b6151, { roughness: 1 }), R.x + 8, ry, R.z + 6); mound.scale.set(.01, .01, .01);
  for (const [i, c] of [[0, 0x2e7d4f], [1, 0x7a7f86], [2, 0x8a5a3a]]) { add(new THREE.BoxGeometry(10, 6, 8), M(c, { metalness: .3 }), R.x - 13, ry + 3, R.z - 12 + i * 10); solid(R.x - 18, R.x - 8, R.z - 16 + i * 10, R.z - 8 + i * 10, 6); }
  const chimney = add(new THREE.CylinderGeometry(.8, 1.1, 18, 12), M(0x9aa0a6), R.x + 15, ry + 9, R.z - 15); solid(R.x + 14, R.x + 16, R.z - 16, R.z - 14, 18);
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(1.6, 1.2, 1.2), M([0x2f7dd1, 0xe3b43a, 0x3a9a55, 0x7a7f86, 0x8a5a3a, 0x2f7dd1][i]), R.x - 6 + i * 2, ry + .6, R.z - 20);
  {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#1f4d32'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#eaf5ec'; g.font = 'bold 50px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('WESTHAVEN WASTE & RECYCLING CENTRE', 512, 62); g.font = '28px system-ui,sans-serif'; g.fillText('Westhaven Waste Services · Second Life Recycling', 512, 104);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const s = add(new THREE.PlaneGeometry(10, 1.25), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }), R.x, ry + 2.2, R.z - 21.5); s.rotation.y = Math.PI;
  }
  ctx.interactables.push({ pos: new THREE.Vector3(R.x, ry, R.z - 19.5), r: 3.5, label: 'Read the waste centre board', action: () => ctx.openTab('economy') });
  ctx.destinations?.push({ name: 'Waste & Recycling Centre', x: R.x, z: R.z - 25 });

  // ---- self-driving cars ---------------------------------------------------------------------------------
  const sensorGeo = new THREE.CylinderGeometry(.22, .26, .22, 12), sensorMat = M(0x1c1f22, { metalness: .6, emissive: 0x2244ff, emissiveIntensity: .4 });
  let carT = 0, t = 0;
  function update(dt, playerPos) {
    t += dt;
    rings.forEach((r, i) => { r.rotation.z += dt * (.4 + i * .25) * (i % 2 ? -1 : 1); r.position.y = ay + 8 + i * 8 + Math.sin(t * 1.3 + i) * .25; });
    core.scale.setScalar(1 + Math.sin(t * 2) * .08 + (S.atlas.level || 0) * .06); dish.rotation.y += dt * .15;
    const near = Math.hypot(playerPos.x - A.x, playerPos.z - A.z) < 160;
    // as many robots as ATLAS has built (up to a handful on show)
    while (robots.length < Math.min(8, S.atlas.robots || 0)) robots.push(robot(0xc9d3dc, false));
    while (soldiers.length < Math.min(6, S.atlas.soldiers || 0)) { const h = robot(0x3b4652, true), i = soldiers.length, corner = [[-19, -19], [19, -19], [-19, 19], [19, 19], [0, -20], [0, 20]][i]; h.root.position.set(A.x + corner[0], ay + .4, A.z + corner[1]); h.root.rotation.y = Math.atan2(corner[0], corner[1]); soldiers.push(h); }
    if (near) {
      robots.forEach((h, i) => { const a = t * .25 + i * Math.PI * 2 / Math.max(1, robots.length), R = 11 + (i % 2) * 2.5; h.root.position.set(A.x + Math.cos(a) * R, ay + .4, A.z + Math.sin(a) * R); h.root.rotation.y = -a; ctx.animate(h, true, dt); });
      soldiers.forEach(h => ctx.animate(h, false, dt));
    }
    // the landfill mound: up to 16 m tall and 18 m across as it fills (and more when it overflows)
    const fill = S.waste ? Math.min(1.6, S.waste.landfill / S.waste.cap) : 0; mound.scale.set(2 + fill * 11, .3 + fill * 10, 2 + fill * 11);
    // the temple rises as the dig goes on
    const reveal = (S.dig?.progress || 0) / 100;
    temple.position.y = ty - 9.6 * (1 - reveal);
    if (Math.hypot(playerPos.x - T.x, playerPos.z - T.z) < 150) diggers.forEach((h, i) => { ctx.animate(h, false, dt); h.armR.pivot.rotation.x = -1 + Math.sin(t * 5 + i) * .35; h.rig.rotation.x = reveal >= 1 ? 0 : .35; });
    // driverless cars, in proportion to how far Velo Motors has got
    carT -= dt;
    if (carT <= 0) {
      carT = 3;
      const share = S.selfDriving || 0;
      ctx.vehicles().forEach((v, i) => {
        if (!v.driver || !v.ai || v.stolen || v.taskDriven) return;
        const want = ((i * 37) % 100) / 100 < share;
        if (want === !!v.selfDriving) return;
        v.selfDriving = want; v.driver.root.visible = !want;
        if (want && !v.sensor) { v.sensor = new THREE.Mesh(sensorGeo, sensorMat); v.sensor.position.set(0, (v.roofY || 1.62), 0); v.group.add(v.sensor); }
        if (v.sensor) v.sensor.visible = want;
      });
    }
  }
  return { update, robots: () => [...robots, ...soldiers] };
}
