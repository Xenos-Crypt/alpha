// Ashford Driving School and its practice ground (west of the Leisure Park, around -540,-540).
// The training ground has its own roads: an oval circuit with a cone slalom on one straight,
// a junction with a stop line and its own traffic light, and marked parking bays.
// Learner cars with L-plates and instructors drive round it all day.
//   Driving lesson (40 gold): drive the course in a learner car following the checkpoints;
//     the instructor scores you (cones hit, running the red light, speeding, parking).
//   Practical driving test (62 gold, needs the theory test, which you can sit here too):
//     pass with 85+ points and you get your full driving licence.
import * as THREE from 'three';

export const SCHOOL = { x: -540, z: -540, hw: 70, hd: 46, r: 22 };   // the circuit: two straights joined by bends
const LESSON_FEE = 40, TEST_FEE = 62, THEORY_FEE = 23, SPEED_LIMIT = 14;   // m/s (about 30 mph) on the course

// centre line of the circuit, anticlockwise, as points (x, z)
export function coursePath() {
  const { x, z, hw, hd } = SCHOOL, pts = [], R = hd;
  for (let i = 0; i <= 24; i++) pts.push([x - hw + (2 * hw) * i / 24, z + R]);                           // north straight, heading east
  for (let i = 1; i <= 16; i++) { const a = Math.PI / 2 - Math.PI * i / 16; pts.push([x + hw + Math.cos(a) * R, z + Math.sin(a) * R]); }   // east bend
  for (let i = 1; i <= 24; i++) pts.push([x + hw - (2 * hw) * i / 24, z - R]);                           // south straight, heading west
  for (let i = 1; i < 16; i++) { const a = -Math.PI / 2 - Math.PI * i / 16; pts.push([x - hw + Math.cos(a) * R, z + Math.sin(a) * R]); }   // west bend
  return pts;
}

export function buildDrivingSchool(ctx) {
  const { scene, colliders, interactables, makeTex, makePerson, makeVehicle, enterVehicle, exitVehicle, isDriving, toast, money, spend, destinations, sign } = ctx;
  const law = () => ctx.roadLaw;   // created after the school, so look it up when needed
  const { x: SX, z: SZ, hw, hd } = SCHOOL;
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, m, solid = false, ry = 0) => { const b = new THREE.Mesh(geo, m instanceof THREE.Material ? m : mat(m)); b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.y = ry; scene.add(b); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return b; };
  const flat = (w, d, x, z, c, y = 0.04, ry = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), c instanceof THREE.Material ? c : mat(c)); p.rotation.x = -Math.PI / 2; p.rotation.z = ry; p.position.set(x, y, z); scene.add(p); return p; };

  // ---- ground and the circuit road
  flat(2 * hw + 2 * hd + 40, 2 * hd + 60, SX, SZ, 0x5f7a3e, 0.02);
  const path = coursePath(), asphalt = mat(0x34383c), white = mat(0xf2f2f2);
  for (let i = 0; i < path.length; i++) {
    const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
    const seg = new THREE.Mesh(geo, asphalt); seg.scale.set(9, 0.05, len + 0.6); seg.position.set((ax + bx) / 2, 0.045, (az + bz) / 2); seg.rotation.y = ang; scene.add(seg);
    if (i % 2 === 0) { const l = new THREE.Mesh(geo, white); l.scale.set(0.15, 0.02, len * 0.6); l.position.set((ax + bx) / 2, 0.08, (az + bz) / 2); l.rotation.y = ang; scene.add(l); }
  }
  // cross road through the middle with a junction, stop line and traffic light
  B(2 * hw, 0.05, 8, SX, 0.045, SZ, asphalt);
  B(8, 0.05, 2 * hd, SX, 0.046, SZ, asphalt);
  // stop line for cars heading north up the cross road, just before the junction
  B(8, 0.02, 0.45, SX, 0.08, SZ - 6, white);
  B(0.2, 3.4, 0.2, SX + 5, 1.7, SZ - 6.5, 0x2b2f33);
  const lamps = [0xff3030, 0xffb030, 0x30ff60].map((c, i) => { const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: c, emissiveIntensity: 0 }); B(0.3, 0.3, 0.12, SX + 5, 3.3 - i * 0.38, SZ - 6.58, m, false, Math.PI); return m; });
  let lightT = 0, light = 'green';
  // cone slalom on the north straight
  const cones = [], coneMat = mat(0xff7a1f), coneGeo = new THREE.ConeGeometry(0.28, 0.75, 10);
  for (let i = 0; i < 7; i++) { const cx = SX - 40 + i * 8, cz = SZ + hd + (i % 2 ? 1.6 : -1.6); const c = new THREE.Mesh(coneGeo, coneMat); c.position.set(cx, 0.4, cz); scene.add(c); cones.push({ m: c, home: new THREE.Vector3(cx, 0.4, cz), hit: false }); }
  // parking bays off the south straight
  const bays = [];
  for (let i = 0; i < 4; i++) { const bx = SX - 18 + i * 6, bz = SZ - hd - 9; for (const s of [-1, 1]) B(0.15, 0.02, 5.5, bx + s * 2.5, 0.07, bz, white); bays.push(new THREE.Vector3(bx, 0, bz)); }
  B(24.2, 0.02, 0.15, SX - 9, 0.07, SZ - hd - 11.75, white);
  // the school building and a sign
  const bx0 = SX - hw - hd - 14, bz0 = SZ;
  B(16, 5, 12, bx0, 2.5, bz0, 0xe8e2d6, true); B(16.6, 0.4, 12.6, bx0, 5.2, bz0, 0xd0281f);
  sign?.('ASHFORD DRIVING SCHOOL', bx0, 4.2, bz0 + 6.1, 12);
  const lPlate = makeTex(64, 64, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#d0281f'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('L', 32, 36); });
  const lMat = new THREE.MeshBasicMaterial({ map: lPlate });
  const addLPlates = v => { const body = v.hoverBody || v.group; for (const z of [2.3, -2.3]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), lMat); p.position.set(0, 1.05, z); p.rotation.y = z > 0 ? 0 : Math.PI; body.add(p); } const roof = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.3), mat(0xffd23f)); roof.position.set(0, 1.85, -0.2); body.add(roof); };
  const instructorAt = makePerson?.({ outfit: 0xd0281f, pants: 0x1a1a1a, hair: 0x5a3a22 }); if (instructorAt) { instructorAt.root.position.set(bx0, 0.2, bz0 + 7.5); instructorAt.root.rotation.y = Math.PI; scene.add(instructorAt.root); }
  destinations?.push({ name: 'Ashford Driving School', x: bx0, z: bz0 + 12 });

  // ---- learner cars lapping the course
  const learners = [0x2f6f8f, 0x2d5d3a].map((c, k) => { const v = makeVehicle('car', c, k ? 'hatch' : 'saloon'); v.taskDriven = true; v.noSteal = true; addLPlates(v); return { v, s: k * path.length / 2, speed: 6 + k }; });
  const segLen = []; let total = 0; for (let i = 0; i < path.length; i++) { const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length]; segLen.push(Math.hypot(bx - ax, bz - az)); total += segLen.at(-1); }
  const along = d => { d = ((d % total) + total) % total; let i = 0; while (d > segLen[i]) { d -= segLen[i]; i++; } const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length], f = d / segLen[i]; return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, yaw: Math.atan2(bx - ax, bz - az) }; };

  // ---- lessons and the test
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 8, 28), new THREE.MeshBasicMaterial({ color: 0x22ff88 })); ring.rotation.x = Math.PI / 2; ring.visible = false; scene.add(ring);
  let lesson = null;
  const CHECKPOINTS = () => [  // in order: down the slalom, round the east bend, the junction (stop on red), round the west bend, park
    [SX - 48, SZ + hd, 'Start the slalom: weave between the cones'], [SX + 20, SZ + hd, 'Good. Round the bend'], [SX + hw + hd, SZ, 'Keep it smooth'], [SX + 20, SZ - hd, 'Now cut through the middle: turn up the cross road'],
    [SX, SZ - 10, 'Approach the junction. Stop at the line if the light is red'], [SX, SZ + 14, 'Through the junction'], [SX - hw - hd + 4, SZ, 'Round the far bend'], [SX - 9, SZ - hd - 4, 'Now park in one of the bays and stop'],
  ];
  function start(kind) {
    if (lesson) { toast('Finish your current drive first.'); return; }
    if (kind === 'test') {
      if (law()?.licence.held && !law().licence.forged) { toast('You already hold a full driving licence.'); return; }
      if (law() && !law().licence.theory) { toast('Pass the theory test first (you can take it here).'); return; }
    }
    const fee = kind === 'test' ? TEST_FEE : LESSON_FEE;
    if (money() < fee) { toast(`That costs ${fee} gold.`); return; }
    spend(fee);
    const car = makeVehicle('car', 0xf2f2f2, 'hatch'); addLPlates(car); car.noSteal = false; car.ai = null; car.schoolCar = true;
    car.group.position.set(SX - hw - 4, 0.15, SZ + hd); car.group.rotation.y = Math.PI / 2;
    lesson = { kind, car, cps: CHECKPOINTS(), i: 0, score: 100, notes: [], t: 0, speedWarn: 0, ranRed: false, conesHit: 0, parked: false };
    enterVehicle(car);
    for (const c of cones) { c.hit = false; c.m.position.copy(c.home); c.m.rotation.set(0, 0, 0); }
    ring.visible = true;
    toast(kind === 'test' ? '📝 Practical test. Follow the green rings, keep under 30 mph, don\'t hit the cones, stop on red, and park in a bay. You need 85 points.' : '🚗 Lesson time! Your instructor says: "Follow the green rings. Nice and steady, under 30 mph."');
  }
  function finish(abandoned) {
    const L = lesson; lesson = null; ring.visible = false;
    if (isDriving(L.car)) exitVehicle();
    L.car.group.removeFromParent(); L.car.disabled = true;
    if (abandoned) { toast('Drive abandoned. No result.'); return; }
    const verdict = L.score >= 85;
    const summary = `Score ${Math.max(0, L.score)}/100${L.notes.length ? ' · ' + [...new Set(L.notes)].join(', ') : ' · a clean drive'}`;
    if (L.kind === 'test') {
      if (verdict && law()) { law().licence.held = true; law().licence.forged = false; law().licence.points = 0; toast(`🎉 PASSED! ${summary}. Your full driving licence is issued.`); }
      else toast(`❌ Test failed. ${summary}. Book another lesson and try again.`);
    } else toast(`🚗 Lesson over. ${summary}. ${verdict ? 'You\'re ready for your test!' : 'Keep practising.'}`);
  }
  const sx = bx0, sz = bz0 + 7.5;
  interactables.push({ pos: new THREE.Vector3(sx, 0.2, sz + 1.5), r: 3.5, label: 'Book a driving lesson (40 gold)', action: () => start('lesson') });
  interactables.push({ pos: new THREE.Vector3(sx - 4, 0.2, sz + 1.5), r: 2.5, label: 'Take the theory test (23 gold)', action: () => law() ? law().takeTheory() : toast('The examiner is out.') });
  interactables.push({ pos: new THREE.Vector3(sx + 4, 0.2, sz + 1.5), r: 2.5, label: 'Take the practical driving test (62 gold)', action: () => start('test') });

  const tmp = new THREE.Vector3();
  function update(dt) {
    // traffic light on the training junction cycles
    lightT += dt; const phase = lightT % 18; light = phase < 8 ? 'green' : phase < 10 ? 'amber' : 'red';
    lamps[0].emissiveIntensity = light === 'red' ? 2 : 0; lamps[1].emissiveIntensity = light === 'amber' ? 2 : 0; lamps[2].emissiveIntensity = light === 'green' ? 2 : 0;
    for (const l of learners) { l.s += l.speed * dt; const a = along(l.s), b = along(l.s + 2); l.v.group.position.set(a.x, 0.15, a.z); l.v.group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); l.v.speed = l.speed; }
    if (!lesson) return;
    const L = lesson, car = L.car, p = car.group.position;
    L.t += dt;
    if (!isDriving(car)) { finish(true); return; }
    if (Math.hypot(p.x - SX, p.z - SZ) > hw + hd + 60) { toast('You left the training ground.'); finish(true); return; }
    // speeding
    if (Math.abs(car.speed) > SPEED_LIMIT) { L.speedWarn += dt; if (L.speedWarn > 1.5) { L.speedWarn = -3; L.score -= 5; L.notes.push('speeding'); toast('Instructor: "Too fast! Keep it under 30."'); } } else L.speedWarn = Math.max(0, L.speedWarn - dt);
    // cones
    for (const c of cones) if (!c.hit && Math.hypot(p.x - c.m.position.x, p.z - c.m.position.z) < 1.5) { c.hit = true; c.m.rotation.z = 1.4; c.m.position.y = 0.2; L.score -= 8; L.conesHit++; L.notes.push('hit cones'); toast('Instructor: "Mind the cones!"'); }
    // red light: crossing the stop line on red
    const crossing = Math.abs(p.x - SX) < 4 && Math.abs(p.z - (SZ - 6)) < 0.9;
    if (crossing && light === 'red' && !L.ranRed && car.speed > 1) { L.ranRed = true; L.score -= 20; L.notes.push('ran a red light'); toast('Instructor: "That was a RED light!"'); }
    // checkpoints
    const cp = L.cps[L.i];
    if (cp) {
      ring.position.set(cp[0], 1.2 + Math.sin(L.t * 3) * 0.15, cp[1]);
      if (L.i < L.cps.length - 1 && Math.hypot(p.x - cp[0], p.z - cp[1]) < 7) { L.i++; const next = L.cps[L.i]; if (next) toast(`Instructor: "${next[2]}."`); }
      if (L.i === L.cps.length - 1) {
        const bay = bays.find(b => Math.abs(p.x - b.x) < 2.2 && Math.abs(p.z - b.z) < 2.6);
        if (bay && Math.abs(car.speed) < 0.4) { const straight = Math.abs(Math.sin(car.group.rotation.y)) < 0.35; if (!straight) { L.score -= 5; L.notes.push('wonky parking'); } finish(false); return; }
      }
    }
    if (L.t > 240) { L.score -= 15; L.notes.push('too slow'); finish(false); }
  }
  return { update, start, get lesson() { return lesson; }, groundAt: null };
}
