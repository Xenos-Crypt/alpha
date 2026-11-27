// THE WILDS: five forests of different kinds in the open country along the south of the dome, one of them a foggy
// forest with a church hidden deep inside it, and snow monsters roaming the frozen land outside the shield.
//
// Where: a scan of the map (sea, roads, colliders, everything already built) found the band south of the last
// streets, z 1250 to the dome's edge, x -270 to 560, empty but for a few posts. The forests stand there side by
// side, each with a trail through it; trees keep 9 m off anything already there.
//
// The church: no sign, no path, off the trail in the thickest of the mist. Only the admin has its location (the
// map lists it for the admin alone). Its door is barred.
//
// Outside the shield (the snow ring round the dome): white wolves in packs, white snakes, ice tigers, ice bears,
// ice golems and frost foxes. They can't come in and you can't go out; you see them through the shield. They are
// made the first time you come near the edge, and only the ones near you move.
import * as THREE from 'three';
import { DOME, PLAY_R } from './border.js';

export const FORESTS = [
  { name: 'Mistwood', x0: -270, x1: -30, kinds: ['pine', 'pine', 'cypress', 'pine', 'oak'], gap: 4.2, fog: true, sign: 'MISTWOOD', sub: 'stay on the trail', col: '#2b3236' },
  { name: 'Silverbirch Wood', x0: -10, x1: 140, kinds: ['birch'], gap: 5, sign: 'SILVERBIRCH WOOD', sub: 'birch forest', col: '#3b5a3a' },
  { name: 'Emberleaf Wood', x0: 160, x1: 310, kinds: ['maple', 'maple', 'beech', 'oak'], gap: 5.5, sign: 'EMBERLEAF WOOD', sub: 'red and copper leaves all year', col: '#6a2a1a' },
  { name: 'Blossom Grove', x0: 330, x1: 440, kinds: ['cherry'], gap: 6, sign: 'BLOSSOM GROVE', sub: 'cherry blossom', col: '#7a3a5a' },
  { name: 'Willowmere', x0: 460, x1: 560, kinds: ['willow', 'willow', 'cypress'], gap: 6.5, sign: 'WILLOWMERE', sub: 'weeping willows', col: '#2f4a3a' },
];
const Z0 = 1250, EDGE = PLAY_R - 12;   // the band's north edge; trees stop 12 m short of the fence
export const CHURCH = { x: -205, z: 1335, w: 12, d: 22 };   // deep in Mistwood, off the trail

export function buildWilds(ctx) {
  const { scene, groundY, interactables, toast, makeTex } = ctx;
  const ids = [], destinations = [], hidden = [];
  let seed = 90211; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const inDome = (x, z, m = 0) => Math.hypot(x - DOME.x, z - DOME.z) < EDGE - m;
  const zMax = x => DOME.z + Math.sqrt(Math.max(0, EDGE ** 2 - (x - DOME.x) ** 2));
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.em ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null, side: o.side ?? THREE.FrontSide });
  const box = (p, w, h, d, x, y, z, m, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; p.add(o); return o; };

  // ---------------------------------------------------------------- the forests
  // each has a winding trail from its north edge to the far end; trees keep off it
  const trailX = (F, z) => { const mid = (F.x0 + F.x1) / 2, half = (F.x1 - F.x0) / 2; return mid + Math.sin((z - Z0) / 38 + F.x0) * half * 0.35; };
  const nearChurch = (x, z, pad) => Math.abs(x - CHURCH.x) < CHURCH.w / 2 + pad && Math.abs(z - CHURCH.z) < CHURCH.d / 2 + pad;
  let planted = 0;
  for (const F of FORESTS) {
    for (let x = F.x0; x <= F.x1; x += F.gap) for (let z = Z0; z < zMax(x); z += F.gap) {
      const tx = x + (rnd() - 0.5) * F.gap * 0.9, tz = z + (rnd() - 0.5) * F.gap * 0.9;
      if (!inDome(tx, tz, 2) || tz < Z0 || tx < F.x0 || tx > F.x1) continue;
      if (Math.abs(tx - trailX(F, tz)) < 3.2) continue;                     // the trail
      if (F.fog && nearChurch(tx, tz, 7)) continue;                         // the church's clearing
      if (ctx.blocked(tx, tz, 9)) continue;                                 // anything already there
      const kind = F.kinds[Math.floor(rnd() * F.kinds.length)];
      ctx.plant(tx, groundY(tx, tz), tz, kind, (F.fog ? 1.15 : 0.95) + rnd() * 0.5); planted++;
    }
    // the trail: a dirt path, and a sign at its start
    const pts = []; for (let z = Z0 - 6; z < zMax(trailX(F, z)) - 4; z += 4) pts.push(new THREE.Vector3(trailX(F, z), 0, z));
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len + 0.4), mat(F.fog ? 0x4a4236 : 0x8a7354, { rough: 1 }));
      m.rotation.set(-Math.PI / 2, 0, Math.atan2(b.x - a.x, b.z - a.z)); m.position.set((a.x + b.x) / 2, groundY((a.x + b.x) / 2, (a.z + b.z) / 2) + 0.03, (a.z + b.z) / 2); m.receiveShadow = true; scene.add(m); }
    const sx = trailX(F, Z0 - 8), sz = Z0 - 8, tex = makeTex(512, 160, g => { g.fillStyle = F.col; g.fillRect(0, 0, 512, 160); g.fillStyle = '#f3ead2'; g.textAlign = 'center'; g.font = 'bold 54px Georgia, serif'; g.fillText(F.sign, 256, 78, 480); g.font = 'italic 28px Georgia, serif'; g.fillText(F.sub, 256, 128, 480); });
    const sign = new THREE.Group(); sign.position.set(sx + 3.4, groundY(sx, sz), sz); scene.add(sign);
    for (const s of [-1, 1]) box(sign, 0.18, 2.6, 0.18, s * 1.5, 1.3, 0, mat(0x5a4230));
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); p.position.set(0, 2.1, -0.1); p.rotation.y = Math.PI; sign.add(p); const p2 = p.clone(); p2.rotation.y = 0; p2.position.z = 0.1; sign.add(p2); }
    ctx.colliders.push({ minX: sx + 3.4 - 1.7, maxX: sx + 3.4 + 1.7, minZ: sz - 0.2, maxZ: sz + 0.2 });
    destinations.push({ name: F.name + ' (forest)', x: sx, z: sz - 2 });
    ids.push({ cls: 'LND', kind: 'FOR', mat: 'WOD', owner: 'GOV', seed: 'wilds:' + F.name, name: F.name, maker: 'nature (protected by the Council)', pos: { x: (F.x0 + F.x1) / 2, z: Z0 + 80 } });
  }

  // ---------------------------------------------------------------- Mistwood's mist
  const M = FORESTS[0];
  const fogTex = makeTex(128, 128, g => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(225,232,235,0.9)'); r.addColorStop(0.5, 'rgba(215,222,226,0.45)'); r.addColorStop(1, 'rgba(210,218,222,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const fogMat = new THREE.SpriteMaterial({ map: fogTex, transparent: true, opacity: 0.55, depthWrite: false, fog: true });
  const wisps = [];
  for (let i = 0; i < 140; i++) { const x = M.x0 + rnd() * (M.x1 - M.x0), z = Z0 + rnd() * (zMax(x) - Z0); if (!inDome(x, z, 4)) continue;
    const s = new THREE.Sprite(fogMat); const k = 10 + rnd() * 16; s.scale.set(k * 1.8, k * 0.55, 1); s.position.set(x, groundY(x, z) + 0.6 + rnd() * 3.2, z); s.renderOrder = 3; scene.add(s); wisps.push({ s, x, z, ph: rnd() * 6, sp: 0.2 + rnd() * 0.4 }); }
  // how deep in the mist a point is: 0 outside, 1 more than 35 m in
  function mistAt(p) { if (!p || p.y > 40 || p.z < Z0 - 30 || p.x < M.x0 - 30 || p.x > M.x1 + 30) return 0;
    const d = Math.min(p.x - M.x0, M.x1 - p.x, p.z - Z0); return THREE.MathUtils.clamp((d + 30) / 65, 0, 1); }

  // ---------------------------------------------------------------- the hidden church
  {
    const C = CHURCH, g = new THREE.Group(); g.name = 'church (hidden, Mistwood)'; const y0 = groundY(C.x, C.z); g.position.set(C.x, y0, C.z); scene.add(g);
    const stone = mat(0x4b4f52, { rough: 0.95 }), dark = mat(0x23262a, { rough: 0.9 }), slate = mat(0x2c2f36, { rough: 0.8 }), glass = mat(0x3a1212, { em: 0x5a1010, ei: 0.35, rough: 0.4 });
    const W = C.w, D = C.d, H = 7;
    box(g, W, 0.4, D, 0, 0.2, 0, dark);                                                     // plinth
    for (const s of [-1, 1]) box(g, 0.8, H, D, s * (W / 2 - 0.4), H / 2, 0, stone);        // side walls
    box(g, W, H, 0.8, 0, H / 2, D / 2 - 0.4, stone);                                        // back wall
    for (const s of [-1, 1]) box(g, W / 2 - 1.3, H, 0.8, s * (W / 4 + 0.65), H / 2, -D / 2 + 0.4, stone);   // front wall, either side of the door
    box(g, 2.6, H - 3.8, 0.8, 0, 3.8 + (H - 3.8) / 2, -D / 2 + 0.4, stone);                  // over the door
    box(g, 2.6, 3.8, 0.25, 0, 1.9, -D / 2 + 0.2, mat(0x2a1c14, { rough: 0.7 }));              // the door (barred)
    box(g, 3, 0.25, 0.3, 0, 2, -D / 2 - 0.02, mat(0x1a1a1a, { metal: 0.6 }));                 // the bar across it
    for (const s of [-1, 1]) { const r = box(g, W / 2 + 1.2, 0.35, D + 1.4, s * W / 4.4, H + 2.1, 0, slate); r.rotation.z = -s * 0.62; }   // roof
    for (const s of [-1, 1]) for (let k = -2; k <= 2; k++) box(g, 0.1, 2.8, 1.1, s * (W / 2 + 0.01), 3.8, k * 4, glass);   // tall dark windows
    box(g, 4, H + 7, 4, 0, (H + 7) / 2, -D / 2 - 1.6, stone);                                 // bell tower
    { const sp = new THREE.Mesh(new THREE.ConeGeometry(3, 9, 4), slate); sp.position.set(0, H + 7 + 4.5, -D / 2 - 1.6); sp.rotation.y = Math.PI / 4; sp.castShadow = true; g.add(sp); }
    for (const s of [-1, 1]) box(g, 0.1, 2.2, 1.2, s * 2.01, H + 4, -D / 2 - 1.6, glass);
    ctx.colliders.push({ minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 }, { minX: C.x - 2, maxX: C.x + 2, minZ: C.z - D / 2 - 3.6, maxZ: C.z - D / 2 + 0.4 });
    interactables.push({ pos: new THREE.Vector3(C.x, y0, C.z - D / 2 - 1.2), r: 2.4, label: 'Try the door', action: () => toast('The door is barred from the inside. Somewhere within, something shifts, then goes still.') });
    ids.push({ cls: 'BLD', kind: 'GEN', mat: 'STN', owner: 'UNK', seed: 'wilds:mistwood-church', name: 'Old stone church (Mistwood)', maker: 'unknown', pos: { x: C.x, z: C.z } });
    hidden.push({ name: 'Yabatan Church (hidden, admin only)', x: C.x, z: C.z - D / 2 - 4 });
  }

  // ---------------------------------------------------------------- the snow monsters outside the shield
  const DUNGEON = { x: 2000, z: 0, keep: 440 };
  const monsters = []; let made = false;
  const RING0 = DOME.r + 12, RING1 = DOME.r + 160;   // most stay close enough to be seen through the shield and the fence
  const KINDS = {
    'white wolf':  { n: 9, pack: 4, len: 1.8, ht: 0.95, body: 0xf2f5f7, belly: 0xdfe6ea, eye: 0x7fdcff, speed: 3.2, legs: 4, tail: 0.9, snout: 0.45, ears: true },
    'ice tiger':   { n: 8, len: 3.4, ht: 1.3, body: 0xf4f7fb, stripe: 0x2a4a7a, eye: 0x9ff3ff, speed: 2.6, legs: 4, tail: 1.6, snout: 0.35, ears: true },
    'ice bear':    { n: 8, len: 3.2, ht: 1.9, body: 0xf3f1ea, belly: 0xe2ddd0, eye: 0x6fd0ff, speed: 1.6, legs: 4, tail: 0.15, snout: 0.5, ears: true, bulk: 1.5 },
    'frost fox':   { n: 10, len: 1.1, ht: 0.55, body: 0xffffff, belly: 0xeef3f6, eye: 0xbfefff, speed: 3.8, legs: 4, tail: 0.9, snout: 0.3, ears: true },
    'white snake': { n: 10, len: 9, ht: 0.45, body: 0xf1f4f6, stripe: 0x9fc4dc, eye: 0xaef0ff, speed: 1.4, snake: true },
    'ice golem':   { n: 7, ht: 5.5, body: 0x9fd8f0, eye: 0xe0fbff, speed: 0.8, golem: true },
  };
  const eyeMat = new Map(), kindMat = new Map();
  const mOf = (c, o) => { const k = c + JSON.stringify(o || {}); if (!kindMat.has(k)) kindMat.set(k, mat(c, o)); return kindMat.get(k); };
  function quadruped(K) {
    const g = new THREE.Group(), b = K.bulk || 1, body = mOf(K.body, { rough: 0.9 }), belly = mOf(K.belly || K.body, { rough: 0.95 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(K.ht * 0.32 * b, K.len * 0.55, 6, 10), body); torso.rotation.z = Math.PI / 2; torso.position.y = K.ht * 0.72; g.add(torso);
    if (K.stripe) for (let i = -2; i <= 2; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(K.ht * 0.33, 0.05, 4, 16, Math.PI), mOf(K.stripe)); s.position.set(i * K.len * 0.13, K.ht * 0.72, 0); s.rotation.y = Math.PI / 2; g.add(s); }
    const head = new THREE.Group(); head.position.set(K.len * 0.5, K.ht * 0.92, 0); g.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(K.ht * 0.26 * b, 10, 8), body));
    { const sn = new THREE.Mesh(new THREE.ConeGeometry(K.ht * 0.13 * b, K.snout * b, 8), belly); sn.rotation.z = -Math.PI / 2; sn.position.x = K.ht * 0.25 * b + K.snout * b * 0.4; sn.position.y = -K.ht * 0.05; head.add(sn); }
    if (!eyeMat.has(K.eye)) eyeMat.set(K.eye, new THREE.MeshBasicMaterial({ color: K.eye }));
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06 * b + K.ht * 0.02, 6, 4), eyeMat.get(K.eye)); e.position.set(K.ht * 0.2 * b, K.ht * 0.07, s * K.ht * 0.12 * b); head.add(e);
      if (K.ears) { const ear = new THREE.Mesh(new THREE.ConeGeometry(K.ht * 0.07 * b, K.ht * 0.18, 4), body); ear.position.set(0, K.ht * 0.24 * b, s * K.ht * 0.13 * b); head.add(ear); } }
    const legs = [];
    for (const [lx, lz] of [[0.33, 1], [0.33, -1], [-0.33, 1], [-0.33, -1]]) { const piv = new THREE.Group(); piv.position.set(lx * K.len, K.ht * 0.62, lz * K.ht * 0.2 * b); g.add(piv);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(K.ht * 0.08 * b, K.ht * 0.06 * b, K.ht * 0.62, 6), body); leg.position.y = -K.ht * 0.31; piv.add(leg); legs.push(piv); }
    let tail = null; if (K.tail > 0.2) { tail = new THREE.Group(); tail.position.set(-K.len * 0.52, K.ht * 0.8, 0); g.add(tail); const t = new THREE.Mesh(new THREE.CylinderGeometry(K.ht * 0.05, K.ht * 0.1, K.tail, 6), K.stripe ? body : belly); t.rotation.z = Math.PI / 2 + 0.5; t.position.x = -K.tail * 0.45; t.position.y = -K.tail * 0.22; tail.add(t); }
    return { g, legs, head, tail };
  }
  function snake(K) {
    const g = new THREE.Group(), segs = [], body = mOf(K.body, { rough: 0.6 }), band = mOf(K.stripe, { rough: 0.6 });
    for (let i = 0; i < 18; i++) { const r = K.ht * (i < 2 ? 0.9 : 1 - i / 22); const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), i % 3 === 1 ? band : body); s.scale.set(1.4, 0.7, 1); s.position.y = r * 0.7; g.add(s); segs.push(s); }
    if (!eyeMat.has(K.eye)) eyeMat.set(K.eye, new THREE.MeshBasicMaterial({ color: K.eye }));
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), eyeMat.get(K.eye)); e.position.set(K.ht * 0.6, K.ht * 0.9, s * K.ht * 0.4); segs[0].add(e); }
    return { g, segs };
  }
  function golem(K) {
    const g = new THREE.Group(), ice = mOf(K.body, { rough: 0.25, metal: 0.1, em: 0x2a6f9a, ei: 0.5 }), core = new THREE.MeshBasicMaterial({ color: K.eye }), H = K.ht;
    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(H * 0.24, 0), ice); torso.scale.set(1.1, 1.25, 0.8); torso.position.y = H * 0.62; g.add(torso);
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(H * 0.06), core); heart.position.set(H * 0.17, H * 0.66, 0); g.add(heart);
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(H * 0.1, 0), ice); head.position.y = H * 0.95; g.add(head);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), core); e.position.set(H * 0.09, H * 0.97, s * H * 0.04); g.add(e); }
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(H * 0.05, H * (0.16 + (i % 3) * 0.06), 5), ice); c.position.set(-H * 0.12 + (i % 2) * 0.2, H * 0.82, (i - 2) * H * 0.07); c.rotation.z = 0.5 - (i % 2); g.add(c); }
    const arms = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(0, H * 0.8, s * H * 0.27); g.add(piv); const a = new THREE.Mesh(new THREE.BoxGeometry(H * 0.12, H * 0.48, H * 0.12), ice); a.position.y = -H * 0.24; piv.add(a); const f = new THREE.Mesh(new THREE.DodecahedronGeometry(H * 0.1, 0), ice); f.position.y = -H * 0.5; piv.add(f); return piv; });
    const legs = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(0, H * 0.38, s * H * 0.12); g.add(piv); const l = new THREE.Mesh(new THREE.BoxGeometry(H * 0.15, H * 0.38, H * 0.15), ice); l.position.y = -H * 0.19; piv.add(l); return piv; });
    return { g, legs, arms };
  }
  const ringPoint = () => { for (let t = 0; t < 40; t++) { const a = rnd() * Math.PI * 2, r = RING0 + 10 + rnd() * rnd() * (RING1 - RING0 - 30), x = DOME.x + Math.cos(a) * r, z = DOME.z + Math.sin(a) * r; if (Math.hypot(x - DUNGEON.x, z - DUNGEON.z) > DUNGEON.keep) return [x, z]; } return [DOME.x, DOME.z + RING0 + 50]; };
  function make() {
    made = true; let mi = 0;
    for (const [name, K] of Object.entries(KINDS)) {
      for (let i = 0; i < K.n; i++) {
        const [hx, hz] = ringPoint(), packN = K.pack || 1;
        for (let p = 0; p < packN; p++) {
          const parts = K.snake ? snake(K) : K.golem ? golem(K) : quadruped(K), sc = 0.9 + rnd() * 0.3;
          parts.g.scale.setScalar(sc); parts.g.name = name; const x = hx + (rnd() - 0.5) * 8, z = hz + (rnd() - 0.5) * 8; parts.g.position.set(x, 0.05, z); parts.g.visible = false; scene.add(parts.g);
          const m = { name, K, ...parts, home: { x: hx, z: hz }, tx: x, tz: z, wait: rnd() * 4, ph: rnd() * 6, leader: p > 0 ? monsters[monsters.length - p] : null, off: [(rnd() - 0.5) * 6, (rnd() - 0.5) * 6], trail: [] };
          monsters.push(m);
          ids.push({ cls: 'CRE', kind: 'MON', mat: 'ICE', owner: 'WLD', seed: 'wilds:' + name + ':' + (mi++), maker: 'wild', name: name[0].toUpperCase() + name.slice(1) + ' (monster, outside the shield)', get pos() { return { x: m.g.position.x, z: m.g.position.z }; } });
        }
      }
    }
  }
  const keepOut = (x, z) => { const dx = x - DOME.x, dz = z - DOME.z, r = Math.hypot(dx, dz); if (r < RING0) return [DOME.x + dx / r * RING0, DOME.z + dz / r * RING0]; if (r > RING1) return [DOME.x + dx / r * RING1, DOME.z + dz / r * RING1]; return [x, z]; };
  function updateMonster(m, dt, t) {
    const g = m.g, K = m.K;
    let tx = m.tx, tz = m.tz;
    if (m.leader) { tx = m.leader.g.position.x + m.off[0]; tz = m.leader.g.position.z + m.off[1]; }
    let dx = tx - g.position.x, dz = tz - g.position.z, d = Math.hypot(dx, dz);
    if (!m.leader && d < 1) { m.wait -= dt; if (m.wait <= 0) { const a = rnd() * Math.PI * 2, r = 8 + rnd() * 35; [m.tx, m.tz] = keepOut(m.home.x + Math.cos(a) * r, m.home.z + Math.sin(a) * r); m.wait = 2 + rnd() * 7; } }
    const moving = d > (m.leader ? 2 : 1), sp = K.speed * (m.leader && d > 8 ? 1.5 : 1);
    if (moving) { const st = Math.min(d, sp * dt); [g.position.x, g.position.z] = keepOut(g.position.x + dx / d * st, g.position.z + dz / d * st);
      const want = Math.atan2(-dz, dx); let dr = want - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * Math.min(1, dt * (K.golem ? 1.2 : 3)); }
    m.ph += dt * (moving ? sp * (K.golem ? 1.4 : 3.2) : 0.8);
    if (K.snake) { m.segs.forEach((s, i) => { s.position.x = -i * K.len / 18 * 1.1; s.position.z = Math.sin(m.ph * 1.3 - i * 0.55) * (moving ? 0.55 : 0.15) * Math.min(1, i / 3); }); return; }
    const sw = moving ? Math.sin(m.ph) * (K.golem ? 0.35 : 0.55) : 0;
    m.legs.forEach((l, i) => { l.rotation.z = (i % 2 ? -sw : sw) * (K.golem ? 1 : i < 2 ? 1 : -1); });
    if (m.arms) m.arms.forEach((a, i) => { a.rotation.z = (i ? sw : -sw) * 0.8; });
    if (m.tail) m.tail.rotation.y = Math.sin(t * 3 + m.ph) * 0.3;
    if (m.head) m.head.rotation.z = moving ? Math.sin(m.ph * 2) * 0.05 : Math.sin(t * 0.7 + m.ph) * 0.12;
  }

  let t = 0;
  function update(dt, p) {
    t += dt;
    if (!p) return;
    // the mist drifts
    if (Math.abs(p.x - (M.x0 + M.x1) / 2) < 400 && Math.abs(p.z - 1350) < 400) for (const w of wisps) { w.s.position.x = w.x + Math.sin(t * 0.05 * w.sp + w.ph) * 6; w.s.material.rotation = 0; }
    // the monsters: made the first time you come within 450 m of the shield's edge; only those near you move
    const rim = DOME.r - Math.hypot(p.x - DOME.x, p.z - DOME.z);
    if (!made && rim < 450) make();
    if (!made) return;
    for (const m of monsters) { const near = Math.abs(m.g.position.x - p.x) < 520 && Math.abs(m.g.position.z - p.z) < 520; m.g.visible = near; if (near) updateMonster(m, dt, t); }
  }
  return { ids, destinations, hidden, update, mistAt, forests: FORESTS, church: CHURCH, get monsters() { return monsters; }, planted, insideDome: inDome };
}
