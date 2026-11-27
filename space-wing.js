// THE AIR FORCE SPACE WING: the military's spaceships, at Eastern Command (the military base).
//
// On the apron between the hangars and the runway (x 1275-1375, z -70 to 20: checked empty first; the control
// tower at z -110 and the jets' taxi route at z -160 to -215 are clear of it) there's the Space Wing building,
// three strike ships on launch pads that you can fly like the fighter jets, and two pads for the patrol ships.
//
// Two patrol ships fly the Space Wing's beat all the time: a long loop over the country, up in space (350-500 m).
// When the Defence Force is on alert (you went into a restricted zone) or you're wanted at four stars or more,
// they come down after you and open fire with their cannons. When it's over they go back to patrolling, and land
// on their pads for a turnaround now and then.
import * as THREE from 'three';
import { buildShipMesh } from './spaceships.js';

export const SPACE_WING = { minX: 1275, maxX: 1375, minZ: -70, maxZ: 25, pads: [[1295, -55], [1325, -55], [1355, -55]], patrolPads: [[1340, 10], [1364, 10]], hq: { x: 1297, z: 8, w: 36, d: 26 } };

// a military version of a ship: dark, with gun pods under the wings and red markings
export function buildMilitaryShip(model) {
  const s = buildShipMesh(model, 0x3b4148), g = s.group, k = s.size;
  const gun = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.8, roughness: 0.3 }), red = new THREE.MeshStandardMaterial({ color: 0xb3261e });
  for (const side of [-1, 1]) { const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.22 * k, 3.4 * k, 10), gun); pod.rotation.x = Math.PI / 2; pod.position.set(side * 2.4 * k, 1.4 * k, 1 * k); g.add(pod);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.2 * k, 0.06, 0.5 * k), red); band.position.set(side * 3 * k, 1.75 * k, -0.6 * k); g.add(band); }
  return s;
}

export function buildSpaceWing(ctx) {
  const { scene, colliders, interactables, makeTex, toast, addSpaceship, makePerson } = ctx;
  const W = SPACE_WING, ids = [];
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.2, emissive: o.em ?? 0 });
  const box = (w, h, d, x, y, z, m, solid = false) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; scene.add(o); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return o; };
  const id = (cls, kind, m3, name, x, z) => ids.push({ cls, kind, mat: m3, owner: 'GOV', seed: 'spacewing:' + name, name, maker: 'Orbital Forge', pos: { x, z } });
  // pads
  const padTex = makeTex(256, 256, g => { g.fillStyle = '#2a2d26'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d6b24a'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke(); g.fillStyle = '#d6b24a'; g.font = 'bold 74px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ASW', 128, 132); });
  const steel = mat(0x50555a, { metal: 0.6 });
  [...W.pads, ...W.patrolPads].forEach(([x, z], i) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.16, 40), [steel, new THREE.MeshStandardMaterial({ map: padTex }), steel]); p.position.set(x, 0.1, z); scene.add(p); id('LND', 'RMP', 'CON', `Space Wing launch pad ${i + 1}`, x, z); });
  // the Space Wing building: solid, its door facing the pads
  const H = W.hq, wall = mat(0x3b4033, { rough: 0.8 });
  box(H.w, 8, 0.5, H.x, 4, H.z + H.d / 2, wall, true);
  for (const s of [-1, 1]) box(0.5, 8, H.d, H.x + s * H.w / 2, 4, H.z, wall, true);
  for (const s of [-1, 1]) box(H.w / 2 - 1.6, 8, 0.5, H.x + s * (H.w / 4 + 0.8), 4, H.z - H.d / 2, wall, true);
  box(3.2, 5, 0.5, H.x, 5.5, H.z - H.d / 2, wall);
  box(H.w + 1, 0.5, H.d + 1, H.x, 8.25, H.z, mat(0x2b2f2a));
  const sign = makeTex(768, 128, g => { g.fillStyle = '#1d2a1d'; g.fillRect(0, 0, 768, 128); g.fillStyle = '#e8d38a'; g.textAlign = 'center'; g.font = 'bold 52px sans-serif'; g.fillText('AIR FORCE SPACE WING', 384, 72); g.font = '22px sans-serif'; g.fillStyle = '#fff'; g.fillText('Eastern Command · strike and patrol ships', 384, 110); });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.3), new THREE.MeshBasicMaterial({ map: sign })); m.position.set(H.x, 6.6, H.z - H.d / 2 - 0.27); m.rotation.y = Math.PI; scene.add(m); }
  id('BLD', 'GOV', 'CON.STL', 'Air Force Space Wing building', H.x, H.z);
  if (makePerson) for (const [x, z] of [[H.x - 3, H.z - H.d / 2 - 2], [H.x + 3, H.z - H.d / 2 - 2]]) { const h = makePerson({ outfit: 0x4b5a3a, pants: 0x3a4430, hair: 0x111111 }); h.root.position.set(x, 0.1, z); h.root.rotation.y = Math.PI; scene.add(h.root); }
  interactables.push({ pos: new THREE.Vector3(H.x, 0.1, H.z - H.d / 2 - 3), r: 3.5, label: 'Talk to the Space Wing officer', action: () => toast('"Air Force Space Wing. Three strike ships on the pads, two on patrol up there round the clock. Restricted zone? Four stars on your head? Then they come for you. Fly one if you dare, but bring it back."') });
  // three strike ships you can fly (like the fighter jets)
  const strike = [];
  if (addSpaceship) W.pads.forEach(([x, z], i) => { const v = addSpaceship({ name: ['Space Wing strike ship', 'Space Wing interceptor', 'Space Wing heavy gunship'][i], model: ['skiff', 'voyager', 'starhawk'][i], military: true, x, z, yaw: Math.PI }); if (v) { v.climb = [26, 32, 40][i]; v.maxSpeed = [110, 140, 170][i]; strike.push(v); } });

  // ---------------------------------------------------------------- the patrol ships
  const LOOP = [[1300, -40, 380], [700, -600, 450], [-200, -700, 420], [-800, -100, 480], [-500, 600, 450], [200, 900, 400], [900, 600, 420], [1300, 200, 380]];
  const patrols = W.patrolPads.map(([px, pz], i) => {
    const s = buildMilitaryShip(i ? 'voyager' : 'skiff'); s.group.rotation.order = 'YXZ'; s.group.position.set(px, 0.18, pz); scene.add(s.group);
    id('VEH', 'SHP', 'STL', `Space Wing patrol ship ${i + 1}`, px, pz);
    return { ...s, pad: new THREE.Vector3(px, 0.18, pz), state: 'ground', t: 20 + i * 45, leg: i * 4, fire: 0, speed: 0, yaw: Math.PI };
  });
  const beams = [], tmp = new THREE.Vector3(), aim = new THREE.Vector3();
  function beam(a, b) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xff5a36 })); scene.add(l); beams.push({ l, t: 0.15 }); }
  function steer(s, to, maxSpeed, dt) {
    const p = s.group.position; tmp.subVectors(to, p); const d = tmp.length();
    s.speed = Math.min(maxSpeed, s.speed + 10 * dt, d * 1.2);   // (big ships pick up speed slowly)
    if (d > 0.5) { p.addScaledVector(tmp.normalize(), Math.min(d, s.speed * dt)); const want = Math.atan2(tmp.x, tmp.z); let da = want - s.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); s.yaw += da * Math.min(1, dt * 2.5); }
    s.group.rotation.set(-tmp.y * 0.4, s.yaw, 0);
    for (const f of s.glow) f.scale.set(1, 0.4 + s.speed / maxSpeed, 1);
    return d;
  }
  // ARREST FIRST. The patrol ships only come down after you when the Defence Force is on alert (you went into a
  // restricted zone), when you're seriously wanted AND resisting (you've attacked the police, or them), or when
  // you've shot at a ship. Even then they warn you first ("stand down and surrender") and give you time to do it;
  // they only open fire if you're still at it. Their cannons need a clear line to you: a building or a wall in the
  // way blocks the shot. They fly at believable speeds (about 45 m/s on patrol, slower when they hunt).
  // They can be damaged: each ship has armour; a ship you've hit turns on you; one that loses all its armour
  // goes down in smoke and crashes, and the Space Wing sends a replacement to its pad later.
  let announced = 0;
  const MAX_HP = 500;
  for (const s of patrols) { s.hp = MAX_HP; s.angry = 0; s.warn = 0; }
  function damage(s, dmg, from) {
    if (!s || s.state === 'down' || s.state === 'wreck' || !(dmg > 0)) return;
    s.hp -= dmg; s.angry = 90; ctx.onShipHit?.(s);
    for (const f of s.glow) f.scale.set(1.4, 1.4, 1.4);
    ctx.burst?.(s.group.position.clone(), 10, [0xffcc66, 0x777777]);
    if (s.hp <= 0) { s.state = 'down'; s.vy = 0; toast('💥 A Space Wing patrol ship is going down!'); ctx.news?.('A Space Wing patrol ship was shot down'); }
  }
  // the ship nearest a point, if one is within reach (for punches, powers and shots)
  function shipNear(p, r) { let best = null, bd = r; for (const s of patrols) { if (s.state === 'down' || s.state === 'wreck' || s.state === 'ground') continue; const d = s.group.position.distanceTo(p); if (d < bd) { bd = d; best = s; } } return best; }
  function update(dt) {
    for (let i = beams.length - 1; i >= 0; i--) { beams[i].t -= dt; if (beams[i].t <= 0) { scene.remove(beams[i].l); beams[i].l.geometry.dispose(); beams.splice(i, 1); } }
    const target = ctx.target(), angry = patrols.some(s => s.angry > 0);
    const hunting = ctx.alert() > 0 || angry || (ctx.wanted() >= 100 && ctx.resisting());
    if (hunting && announced <= 0) { announced = 60; toast('🚀 Space Wing patrol: "This is the Air Force. Stand down and surrender to the police, or we open fire."'); for (const s of patrols) s.warn = 8; }
    announced -= dt; if (!hunting) announced = Math.min(announced, 0);
    for (const s of patrols) {
      s.angry = Math.max(0, s.angry - dt);
      if (s.state === 'wreck') { s.t -= dt; if (s.t <= 0) { s.group.visible = true; s.group.position.copy(s.pad); s.group.rotation.set(0, Math.PI, 0); s.hp = MAX_HP; s.state = 'ground'; s.t = 60; s.speed = 0; } continue; }
      if (s.state === 'down') {   // falling, trailing smoke, then a crash
        const p = s.group.position; s.vy -= 9.8 * dt; p.y += s.vy * dt; p.x += Math.sin(s.yaw) * 20 * dt; p.z += Math.cos(s.yaw) * 20 * dt; s.group.rotation.z += dt * 1.5;
        if (Math.random() < 0.5) ctx.burst?.(p.clone(), 3, [0x333333, 0x666666]);
        const g = ctx.groundY?.(p.x, p.z) ?? 0; if (p.y <= g + 0.5) { p.y = g + 0.5; ctx.explode?.(p.clone()); s.group.visible = false; s.state = 'wreck'; s.t = 600; }
        continue;
      }
      if (s.state === 'ground') { s.t -= dt; for (const f of s.glow) f.visible = false; if (s.t <= 0 || hunting) { s.state = 'up'; for (const f of s.glow) f.visible = true; } continue; }
      if (s.state === 'up') { const p = s.group.position; p.y += 12 * dt; for (const f of s.glow) f.scale.set(1, 1.4, 1); if (p.y > 120) s.state = hunting ? 'hunt' : 'patrol'; continue; }
      if (s.state === 'patrol') { if (hunting) { s.state = 'hunt'; continue; } const [x, z, y] = LOOP[s.leg % LOOP.length]; if (steer(s, aim.set(x, y, z), 45, dt) < 25) { s.leg++; if (s.leg % (LOOP.length * 2) === 0) s.state = 'home'; } continue; }
      if (s.state === 'home') { const d = steer(s, aim.copy(s.pad).setY(s.pad.y + (s.group.position.distanceTo(s.pad) > 40 ? 150 : 0)), 35, dt); if (d < 1.5 && s.group.position.distanceTo(s.pad) < 2) { s.group.position.copy(s.pad); s.state = 'ground'; s.t = 90; s.speed = 0; s.group.rotation.set(0, s.yaw, 0); } continue; }
      if (s.state === 'hunt') {
        if (!hunting) { s.state = 'patrol'; continue; }
        // hold off 60 m behind and 25 m above you; fire only after the warning, in range, and with a clear line
        const off = aim.copy(target).add(new THREE.Vector3(Math.sin(s.yaw) * -60, 25, Math.cos(s.yaw) * -60));
        steer(s, off, 40, dt); s.fire -= dt; s.warn -= dt;
        const range = s.group.position.distanceTo(target);
        if (s.warn <= 0 && range < 160 && s.fire <= 0) {
          s.fire = 1.4;
          const to = target.clone().add(new THREE.Vector3(0, 1, 0));
          for (const side of [-1, 1]) {
            const from = s.group.localToWorld(new THREE.Vector3(side * 2.4, 1.4, 3));
            const stop = ctx.firstHit?.(from, to);   // a wall or building in the way: the beam stops there
            beam(from, stop || to);
            if (!stop && side === 1) ctx.hurt(18, s.group.position);
          }
        }
      }
    }
  }
  return { ids, patrols, strike, update, damage, shipNear };
}
