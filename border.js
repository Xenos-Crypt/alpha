// The edge of the world is where the Aegis Shield dome meets the ground.
//
// The shield is a fixed dome centred on the map (DOME). A guarded fence runs round
// its rim with a military checkpoint at north, south, east and west. Soldiers stand
// inside the fence at each gate (you can talk to them), watch from the towers and
// patrol along the wire. Outside the dome it's snow: a white plain, snowy pines and a
// ring of snow-capped peaks. Repeated things are instanced, so it's cheap to draw.
import * as THREE from 'three';

export const DOME = { x: 170, z: 150, r: 1350 };   // shield dome centre and radius (ground level)
export const FENCE_R = DOME.r - 2;                   // the fence stands just inside the rim
export const PLAY_R = FENCE_R - 1.5;                 // how far the player can go

const DUNGEON = { x: 2000, z: 0, keepClear: 420 };   // the dungeon arena lives out east

export function buildBorder({ scene, groundY, makePerson, animatePerson, interactables, toast, makeTex }) {
  const C = DOME, R = FENCE_R;
  const gy = (x, z) => { const y = groundY(x, z); return Number.isFinite(y) ? Math.max(0, y) : 0; };
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, map: o.map ?? null, flatShading: !!o.flat, depthWrite: o.opacity == null });
  const noCull = m => { m.userData.noCull = true; m.frustumCulled = false; return m; };
  const onRim = (a, r = R) => [C.x + Math.sin(a) * r, C.z + Math.cos(a) * r];   // a = 0 points south (+z)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  let seed = 1234567; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

  // Four checkpoints. `a` is the angle round the circle.
  const gates = [
    { name: 'South', a: 0 }, { name: 'East', a: Math.PI / 2 }, { name: 'North', a: Math.PI }, { name: 'West', a: -Math.PI / 2 },
  ];
  const GATE_W = 12, gateHalfAngle = (GATE_W / 2) / R;
  const nearGate = a => gates.some(g => Math.abs(Math.atan2(Math.sin(a - g.a), Math.cos(a - g.a))) < gateHalfAngle);

  // ---------------- fence ----------------
  const meshTex = makeTex(64, 64, g => { g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(190,200,205,0.95)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); });
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  const N = 360, step = Math.PI * 2 / N, segLen = 2 * R * Math.sin(step / 2);
  const panels = [];
  for (let i = 0; i < N; i++) {
    const a0 = i * step, a1 = a0 + step, mid = a0 + step / 2;
    if (nearGate(mid)) continue;
    panels.push(mid);
  }
  const panelTex = meshTex.clone(); panelTex.needsUpdate = true; panelTex.repeat.set(segLen / 0.5, 6);
  const wireMat = mat(0xffffff, { map: panelTex, opacity: 0.85, side: THREE.DoubleSide, metal: 0.5, rough: 0.5 }); wireMat.alphaTest = 0.3; wireMat.depthWrite = true;
  const postMat = mat(0x6d757c, { metal: 0.6, rough: 0.45 });
  const inst = (geo, material, n) => { const m = noCull(new THREE.InstancedMesh(geo, material, n)); scene.add(m); return m; };
  const wires = inst(new THREE.PlaneGeometry(segLen + 0.05, 3.2), wireMat, panels.length);
  const rails = inst(new THREE.BoxGeometry(segLen + 0.05, 0.08, 0.08), postMat, panels.length * 2);
  const kerbs = inst(new THREE.BoxGeometry(segLen + 0.05, 0.3, 0.5), mat(0x8a8d8f), panels.length);
  const coils = inst(new THREE.CylinderGeometry(0.28, 0.28, segLen + 0.05, 8, 1, true).rotateZ(Math.PI / 2), mat(0x9aa3aa, { metal: 0.7, rough: 0.4, opacity: 0.6, side: THREE.DoubleSide }), panels.length);
  const posts = inst(new THREE.BoxGeometry(0.14, 3.6, 0.14), postMat, panels.length * 12);
  let pi = 0;
  panels.forEach((mid, i) => {
    const [x, z] = onRim(mid), y = gy(x, z);
    q.setFromAxisAngle(Y, mid);   // panel's local x runs along the circle's tangent
    sc.set(1, 1, 1);
    wires.setMatrixAt(i, m4.compose(pos.set(x, y + 1.7, z), q, sc));
    rails.setMatrixAt(i * 2, m4.compose(pos.set(x, y + 0.12, z), q, sc));
    rails.setMatrixAt(i * 2 + 1, m4.compose(pos.set(x, y + 3.35, z), q, sc));
    kerbs.setMatrixAt(i, m4.compose(pos.set(x, y + 0.1, z), q, sc));
    coils.setMatrixAt(i, m4.compose(pos.set(x, y + 3.7, z), q, sc));
    const a0 = mid - step / 2;
    for (let k = 0; k < 12 && pi < posts.count; k++) { const [px, pz] = onRim(a0 + step * k / 12); posts.setMatrixAt(pi++, m4.compose(pos.set(px, gy(px, pz) + 1.8, pz), q, sc)); }
  });
  posts.count = pi;

  // ---------------- checkpoints ----------------
  const guards = [];
  const concrete = mat(0xa4a7a3), stripe = mat(0xc0392b), white = mat(0xf2f2f2), steel = mat(0x5d656c, { metal: 0.6, rough: 0.4 });
  const olive = mat(0x4f5b3a), sandbag = mat(0xb9a57a), glass = mat(0x9fd3ff, { opacity: 0.35, rough: 0.1 });
  const lamp = mat(0xfff6d0, { emissive: 0xfff1b8, ei: 2.2 });
  const signTex = makeTex(512, 128, g => { g.fillStyle = '#1d2e1f'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#f2c14e'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 118, 512, 10); g.fillStyle = '#ffffff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BORDER CHECKPOINT', 256, 50); g.font = 'bold 26px sans-serif'; g.fillText('EDGE OF THE AEGIS SHIELD · NO EXIT', 256, 92); });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
  const soldier = () => {
    const h = makePerson({ outfit: 0x4f5b3a, hair: 0x2a2520, pants: 0x3f4a2e });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), olive); helmet.position.set(0, 1.84, 0); h.rig.add(helmet);
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.85), mat(0x1e1f20)); rifle.position.set(0.18, 1.2, 0.18); rifle.rotation.x = -0.35; h.rig.add(rifle);
    return h;
  };
  for (const gate of gates) {
    const [gx, gz] = onRim(gate.a), y = gy(gx, gz);
    // local +z points into the dome (toward the centre); local x runs along the fence
    const g = new THREE.Group(); g.position.set(gx, y, gz); g.rotation.y = gate.a + Math.PI; scene.add(g);
    const B = (w, h, d, x, yy, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, yy, z); g.add(b); return b; };
    for (const sx of [-1, 1]) {
      B(1.2, 5, 1.2, sx * (GATE_W / 2 + 0.6), 2.5, 0, concrete);
      for (let k = 0; k < 4; k++) B(1.22, 0.4, 1.22, sx * (GATE_W / 2 + 0.6), 0.8 + k * 1.1, 0, k % 2 ? white : stripe);
      B(0.5, 0.3, 0.5, sx * (GATE_W / 2 + 0.6), 5.2, 0.4, lamp);
    }
    for (let x = -GATE_W / 2 + 0.3; x <= GATE_W / 2 - 0.3; x += 0.6) B(0.08, 3.2, 0.08, x, 1.7, 0, steel);
    for (const h of [0.3, 1.7, 3.2]) B(GATE_W, 0.12, 0.12, 0, h, 0, steel);
    B(0.4, 1.1, 0.4, -GATE_W / 2 + 1, 0.55, 5, concrete);
    for (let k = 0; k < 7; k++) B(1.2, 0.14, 0.14, -GATE_W / 2 + 1.4 + k * 1.2, 1.05, 5, k % 2 ? white : stripe);   // barrier arm, down
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), signMat); sign.position.set(0, 4.5, 0.2); g.add(sign);
    B(GATE_W + 2.4, 0.3, 0.4, 0, 3.6, 0, concrete);
    B(5, 3.2, 4, GATE_W / 2 + 5, 1.6, 6, concrete); B(5.4, 0.3, 4.4, GATE_W / 2 + 5, 3.35, 6, steel);   // gatehouse
    B(3, 1, 0.05, GATE_W / 2 + 5, 1.9, 3.98, glass); B(1, 2.2, 0.05, GATE_W / 2 + 3.2, 1.1, 8.02, mat(0x3a3f45));
    for (const sx of [-1, 1]) {                                     // watchtowers and sandbags
      const tx = sx * (GATE_W / 2 + 12);
      for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) B(0.25, 7, 0.25, tx + lx, 3.5, 4 + lz, steel);
      B(3.4, 0.2, 3.4, tx, 7.1, 4, steel); B(3.4, 1.1, 0.1, tx, 7.75, 2.35, olive); B(3.4, 1.1, 0.1, tx, 7.75, 5.65, olive);
      B(0.1, 1.1, 3.4, tx - 1.65, 7.75, 4, olive); B(0.1, 1.1, 3.4, tx + 1.65, 7.75, 4, olive);
      B(3.8, 0.2, 3.8, tx, 9.4, 4, olive); for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) B(0.12, 2.1, 0.12, tx + lx, 8.4, 4 + lz, steel);
      const spot = B(0.6, 0.4, 0.5, tx, 8.6, 2.2, lamp); spot.rotation.x = 0.4;
      const lookout = soldier(); lookout.root.position.set(tx, 7.2, 4); lookout.root.rotation.y = Math.PI; g.add(lookout.root);
      guards.push({ h: lookout, group: g });
      for (let k = 0; k < 5; k++) B(0.9, 0.35, 0.5, sx * (GATE_W / 2 + 3.2) + (k - 2) * 0.85, 0.18, 3, sandbag);
      for (let k = 0; k < 4; k++) B(0.9, 0.35, 0.5, sx * (GATE_W / 2 + 3.2) + (k - 1.5) * 0.85, 0.53, 3, sandbag);
    }
    B(0.12, 9, 0.12, -(GATE_W / 2 + 4), 4.5, 6, steel);
    gate.flag = B(1.8, 1.1, 0.03, -(GATE_W / 2 + 4) + 0.95, 8.3, 6, mat(0x2d5d3a, { side: THREE.DoubleSide }));
    for (const sx of [-1, 1]) { const h = soldier(); h.root.position.set(sx * 3, 0, 3.2); g.add(h.root); guards.push({ h, face: true, group: g }); }
    // patrols walk along the inside of the fence, following the curve
    for (const sx of [-1, 1]) { const h = soldier(); scene.add(h.root); guards.push({ h, patrol: { a0: gate.a + sx * (GATE_W / 2 + 4) / R, a1: gate.a + sx * 75 / R, t: rnd() }, anchor: g }); }
    const talk = new THREE.Vector3(0, 0, 4.2).applyAxisAngle(Y, g.rotation.y).add(g.position);
    interactables.push({ pos: talk, r: 4, label: 'Talk to the border guard', action: () => toast(lines[lineI++ % lines.length]) });
    gate.group = g;
  }
  const lines = [
    '"This is the edge of the Aegis Shield. Past the fence it\'s nothing but snow and mountains - the Frostspine range goes on for hundreds of miles."',
    '"Defence Force checkpoint. Nobody goes through without orders from the Capital. Move along, please."',
    '"Cold out there? You have no idea. We lost a patrol in a whiteout last winter."',
    '"The shield covers everything inside the fence. Out there you\'re on your own."',
  ];
  let lineI = 0;

  // ---------------- snow outside the dome ----------------
  const OUT = 420;   // stays clear of the dungeon arena to the east
  const snow = noCull(new THREE.Mesh(new THREE.RingGeometry(DOME.r + 0.5, DOME.r + OUT, 180, 1), mat(0xf4f7fa, { rough: 0.95 })));
  snow.rotation.x = -Math.PI / 2; snow.position.set(C.x, 0.05, C.z); snow.receiveShadow = true; scene.add(snow);
  const clearOfDungeon = (x, z, r = 0) => Math.hypot(x - DUNGEON.x, z - DUNGEON.z) > DUNGEON.keepClear + r;

  const pineSpots = [];
  for (let a = 0; a < Math.PI * 2; a += 0.0055) {
    if (gates.some(g => Math.abs(Math.atan2(Math.sin(a - g.a), Math.cos(a - g.a))) < 22 / R)) continue;
    for (let k = 0; k < 2; k++) {
      const [x, z] = onRim(a + rnd() * 0.004, DOME.r + 10 + rnd() * 90);
      if (clearOfDungeon(x, z)) pineSpots.push([x, z, 0.8 + rnd() * 0.9]);
    }
  }
  const pines = inst(new THREE.ConeGeometry(1.8, 6.5, 7), mat(0x2c4a34, { flat: true }), pineSpots.length);
  const caps = inst(new THREE.ConeGeometry(0.95, 2.4, 7), mat(0xffffff, { flat: true }), pineSpots.length);
  const trunks = inst(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6), mat(0x4a3426), pineSpots.length);
  q.identity();
  pineSpots.forEach(([x, z, s], i) => {
    sc.setScalar(s);
    trunks.setMatrixAt(i, m4.compose(pos.set(x, 0.8 * s, z), q, sc));
    pines.setMatrixAt(i, m4.compose(pos.set(x, (1.6 + 3.25) * s, z), q, sc));
    caps.setMatrixAt(i, m4.compose(pos.set(x, (1.6 + 6.5 - 1.0) * s, z), q, sc));
  });

  const peaks = [];
  for (const row of [0, 1]) for (let a = 0; a < Math.PI * 2; a += row ? 0.075 : 0.05) {
    const r = row ? 110 + rnd() * 90 : 55 + rnd() * 45, h = row ? 180 + rnd() * 160 : 90 + rnd() * 80;
    const [x, z] = onRim(a + rnd() * 0.02, DOME.r + (row ? 260 : 130) + r * 0.6 + rnd() * 50);
    if (clearOfDungeon(x, z, r)) peaks.push([x, z, r, h]);
  }
  const rocks = inst(new THREE.ConeGeometry(1, 1, 9), mat(0x6f7378, { flat: true, rough: 0.95 }), peaks.length);
  const snowCaps = inst(new THREE.ConeGeometry(1, 1, 9), mat(0xf7f9fb, { flat: true, rough: 0.9 }), peaks.length);
  peaks.forEach(([x, z, r, h], i) => {
    q.setFromAxisAngle(Y, rnd() * Math.PI);
    rocks.setMatrixAt(i, m4.compose(pos.set(x, h / 2, z), q, sc.set(r, h, r)));
    const ch = h * 0.45;   // the top 45% is snow
    snowCaps.setMatrixAt(i, m4.compose(pos.set(x, h - ch / 2 + 0.6, z), q, sc.set(r * 0.45 * 1.04, ch, r * 0.45 * 1.04)));
  });

  // ---------------- update ----------------
  let time = 0;
  function update(dt, playerPos) {
    time += dt;
    for (const g of gates) g.flag.rotation.y = Math.sin(time * 2 + g.a * 3) * 0.15;
    for (const gd of guards) {
      const anchor = (gd.anchor || gd.group).position;
      if (Math.abs(anchor.x - playerPos.x) + Math.abs(anchor.z - playerPos.z) > 200) continue;
      if (gd.patrol) {
        const p = gd.patrol; p.t += dt * 0.02;
        const k = (Math.sin(p.t * Math.PI * 2) + 1) / 2, a = p.a0 + (p.a1 - p.a0) * k;
        const [x, z] = onRim(a, R - 2.5), forward = Math.cos(p.t * Math.PI * 2) * (p.a1 - p.a0) >= 0;
        gd.h.root.position.set(x, gy(x, z), z);
        gd.h.root.rotation.y = a + (forward ? Math.PI / 2 : -Math.PI / 2);   // face along the fence, the way they're walking
        animatePerson(gd.h, true, dt);
      } else {
        if (gd.face) {   // gate guards turn to face you when you walk up
          const wp = gd.h.root.getWorldPosition(pos), d = Math.hypot(playerPos.x - wp.x, playerPos.z - wp.z);
          const target = d < 18 ? Math.atan2(playerPos.x - wp.x, playerPos.z - wp.z) - gd.group.rotation.y : 0;
          const diff = Math.atan2(Math.sin(target - gd.h.root.rotation.y), Math.cos(target - gd.h.root.rotation.y));
          gd.h.root.rotation.y += diff * Math.min(1, dt * 3);
        }
        animatePerson(gd.h, false, dt);
      }
    }
  }
  return { update, gates, guards };
}
