// Roads wear out, and road crews fix them.
// Every patch of road has a condition (100 = perfect). Heavy vehicles (buses, lorries, tanks), heavy
// building-site machinery, rain and frost, and explosions all wear it down:
//   below 75 cracks appear, below 40 there's a pothole, below 15 the road is broken up.
// Hitting a pothole at speed jolts the car and dents it; broken road slows you down.
// Road crews (a van, cones, a jackhammer and a roller) go to the worst damage, close it off and
// resurface it. Fresh tarmac shows as a darker patch for a while. You can lend a hand for pay.
import * as THREE from 'three';

export const CELL = 6;
export const HEAVY = { bus: 1.2, truck: 1.6, lorry: 1.6, tank: 22, ambulance: 0.3, fire: 1.0, police: 0.15, car: 0.04 };
export const stageFor = hp => hp < 15 ? 'broken' : hp < 40 ? 'pothole' : hp < 75 ? 'cracked' : 'ok';
const key = (x, z) => Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
const MAX = 700;

export function createRoadWear(ctx) {
  const { scene, makeTex, isRoad, roadRects, groundY, toast } = ctx;
  const cells = new Map();     // key -> { hp, x, z, rot, patch }
  let dirty = true, clock = 0, tick = 0, weatherTick = 0, firstBump = true;

  // ---- decals ----
  const crackTex = makeTex(256, 256, g => {
    g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(12,12,12,.9)'; g.lineCap = 'round';
    const branch = (x, y, a, len, w) => { if (len < 8 || w < 0.6) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); branch(x2, y2, a + (Math.random() - 0.5) * 1.2, len * 0.75, w * 0.75); if (Math.random() < 0.6) branch(x2, y2, a + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.7), len * 0.55, w * 0.6); };
    for (let i = 0; i < 6; i++) branch(128, 128, i * Math.PI / 3 + Math.random() * 0.4, 30 + Math.random() * 20, 5);
  });
  const holeTex = makeTex(256, 256, g => {
    g.clearRect(0, 0, 256, 256);
    const grd = g.createRadialGradient(128, 128, 20, 128, 128, 120); grd.addColorStop(0, 'rgba(18,15,12,1)'); grd.addColorStop(0.55, 'rgba(40,34,28,1)'); grd.addColorStop(0.8, 'rgba(70,64,58,.9)'); grd.addColorStop(1, 'rgba(70,64,58,0)');
    g.fillStyle = grd; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = 92 + Math.sin(i * 2.7) * 14 + Math.cos(i * 1.3) * 10; g[i ? 'lineTo' : 'moveTo'](128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.fill();
    g.fillStyle = 'rgba(110,100,90,.8)'; for (let i = 0; i < 40; i++) g.fillRect(40 + Math.random() * 176, 40 + Math.random() * 176, 3 + Math.random() * 5, 3 + Math.random() * 4);
  });
  const patchTex = makeTex(128, 128, g => { g.fillStyle = '#1a1c1f'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122); });
  const decal = (tex, opacity = 1) => { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), MAX); m.count = 0; m.frustumCulled = false; m.renderOrder = 1; scene.add(m); return m; };
  const cracks = decal(crackTex), holes = decal(holeTex), patches = decal(patchTex, 0.9);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  function redraw() {
    dirty = false; let nc = 0, nh = 0, np = 0;
    for (const c of cells.values()) {
      const y = Math.max(0, groundY(c.x, c.z, 0)) + 0.095; q.setFromAxisAngle(up, c.rot);
      if (c.patch > 0 && np < MAX) { patches.setMatrixAt(np++, m4.compose(pos.set(c.x, y - 0.004, c.z), q, sc.set(3.2, 1, 3.2))); }
      const st = stageFor(c.hp);
      if (st !== 'ok' && nc < MAX) { const s = st === 'cracked' ? 1.6 + (75 - c.hp) / 30 : 3.2; cracks.setMatrixAt(nc++, m4.compose(pos.set(c.x, y, c.z), q, sc.set(s, 1, s))); }
      if ((st === 'pothole' || st === 'broken') && nh < MAX) { const s = st === 'broken' ? 2.6 : 1.1 + (40 - c.hp) / 30; holes.setMatrixAt(nh++, m4.compose(pos.set(c.x, y + 0.002, c.z), q, sc.set(s, 1, s * 0.8))); }
    }
    cracks.count = nc; holes.count = nh; patches.count = np;
    for (const m of [cracks, holes, patches]) m.instanceMatrix.needsUpdate = true;
  }

  function damage(x, z, amount) {
    if (!(amount > 0) || !isRoad(x, z)) return;
    const k = key(x, z); let c = cells.get(k);
    if (!c) { if (cells.size >= MAX) return; c = { hp: 100, x, z, rot: Math.random() * Math.PI * 2, patch: 0 }; cells.set(k, c); }
    const before = stageFor(c.hp); c.hp = Math.max(0, c.hp - amount); if (stageFor(c.hp) !== before) dirty = true;
  }
  function blast(p, r) { for (let dx = -r; dx <= r; dx += CELL / 2) for (let dz = -r; dz <= r; dz += CELL / 2) { const d = Math.hypot(dx, dz); if (d <= r) damage(p.x + dx, p.z + dz, 25 + 55 * (1 - d / r)); } }
  const at = (x, z) => cells.get(key(x, z));
  function randomRoadPoint() { const rs = roadRects(); if (!rs.length) return null; for (let i = 0; i < 6; i++) { const r = rs[Math.floor(Math.random() * rs.length)], x = r.minX + 0.6 + Math.random() * (r.maxX - r.minX - 1.2), z = r.minZ + 0.6 + Math.random() * (r.maxZ - r.minZ - 1.2); if (isRoad(x, z)) return [x, z]; } return null; }

  // ---- road crews ----
  const crews = [];
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const B = (p, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(boxGeo, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.castShadow = true; p.add(b); return b; };
  const orange = mat(0xff7a00), white = mat(0xf2f2f2), van = mat(0xf2b707), dark = mat(0x222222), glass = mat(0x5a7f99, { rough: 0.2, metal: 0.4 });
  const beacon = mat(0xff9900, { emissive: 0xff8800, ei: 2 });
  const sign = makeTex(256, 256, g => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(128, 12); g.lineTo(244, 230); g.lineTo(12, 230); g.closePath(); g.fill(); g.strokeStyle = '#c0392b'; g.lineWidth = 22; g.stroke(); g.fillStyle = '#111'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('ROAD', 128, 160); g.fillText('WORKS', 128, 200); });
  function makeCrew(i) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    // van
    const v = new THREE.Group(); g.add(v); B(v, 2.1, 1.9, 4.8, 0, 1.25, 0, van); B(v, 2.0, 0.8, 0.05, 0, 1.8, 2.42, glass); for (const z of [-1.6, 1.6]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(s * 1.0, 0.38, z); v.add(w); }
    B(v, 2.12, 0.25, 4.82, 0, 1.0, 0, orange); const lb = B(v, 1.2, 0.18, 0.25, 0, 2.3, 1.2, beacon);
    // cones in a ring, a sign, a roller
    const cones = []; for (let k = 0; k < 8; k++) { const c = new THREE.Group(); const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 10), orange); body.position.y = 0.35; c.add(body); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 10), white); band.position.y = 0.42; c.add(band); B(c, 0.45, 0.04, 0.45, 0, 0.02, 0, dark); g.add(c); cones.push(c); }
    const sg = new THREE.Group(); g.add(sg); B(sg, 0.06, 1.4, 0.06, 0, 0.7, 0, dark); const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: sign, side: THREE.DoubleSide, transparent: true })); sp.position.y = 1.7; sg.add(sp);
    const roller = new THREE.Group(); g.add(roller); { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16), mat(0x777777, { metal: 0.6 })); d.rotation.z = Math.PI / 2; d.position.y = 0.5; roller.add(d); B(roller, 1.2, 0.8, 1.6, 0, 1.1, -0.9, van); B(roller, 0.8, 0.8, 0.05, 0, 1.9, -1.3, glass); }
    const team = [0, 1, 2].map(k => { const h = ctx.makePerson({ outfit: 0xff7a00, hair: [0x2b1d14, 0x111111, 0x5a3b22][k], pants: 0x2d3142 }); const hat = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff)); hat.position.set(0, 1.93, 0); h.rig.add(hat); h.root.visible = false; return h; });
    const drill = new THREE.Group(); B(drill, 0.12, 0.9, 0.12, 0, 0.45, 0, dark); B(drill, 0.5, 0.1, 0.1, 0, 0.95, 0, dark); g.add(drill);
    const crew = { i, g, v, lb, cones, sg, roller, team, drill, state: 'idle', timer: 3 + i * 4, target: null, along: 0, helped: false };
    const it = { pos: new THREE.Vector3(0, -999, 0), r: 2.6, label: 'Talk to the road crew', action: () => ctx.crewMenu?.(crew) };
    ctx.interactables.push(it); crew.it = it;
    return crew;
  }
  for (let i = 0; i < 3; i++) crews.push(makeCrew(i));
  const alongOf = (x, z) => { const r = roadRects().find(r => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ); return r && r.maxZ - r.minZ > r.maxX - r.minX ? 0 : Math.PI / 2; };   // road direction (yaw)
  function pickJob(crew, playerPos) {
    let best = null, bs = Infinity;
    for (const c of cells.values()) {
      if (c.hp >= 55 || crews.some(o => o !== crew && o.target === c)) continue;
      const score = c.hp + Math.hypot(c.x - playerPos.x, c.z - playerPos.z) / 25;
      if (score < bs) { bs = score; best = c; }
    }
    return best;
  }
  function setUp(crew) {
    const c = crew.target, yaw = alongOf(c.x, c.z), f = [Math.sin(yaw), Math.cos(yaw)], s = [f[1], -f[0]], y = Math.max(0, groundY(c.x, c.z, 0));
    crew.g.visible = true; crew.along = yaw;
    crew.v.position.set(c.x + f[0] * 8, y, c.z + f[1] * 8); crew.v.rotation.y = yaw;
    crew.cones.forEach((k, i) => { const a = i / crew.cones.length * Math.PI * 2; k.position.set(c.x + Math.cos(a) * 3.6, y, c.z + Math.sin(a) * 3.6); });
    crew.sg.position.set(c.x - f[0] * 10, y, c.z - f[1] * 10); crew.sg.rotation.y = yaw + Math.PI;
    crew.roller.position.set(c.x + s[0] * 1.5, y, c.z + s[1] * 1.5); crew.roller.rotation.y = yaw;
    crew.team.forEach((h, i) => { h.root.visible = true; h.root.position.set(c.x + [0.6, -1.4, 0][i] * s[0] + [0, 1.2, -5.5][i] * f[0], y, c.z + [0.6, -1.4, 0][i] * s[1] + [0, 1.2, -5.5][i] * f[1]); h.root.rotation.y = yaw + [Math.PI / 2, -Math.PI / 2, Math.PI][i]; });
    crew.drill.position.copy(crew.team[0].root.position).add(new THREE.Vector3(s[0] * -0.5, 0, s[1] * -0.5));
    crew.it.pos.set(crew.team[2].root.position.x, y, crew.team[2].root.position.z);
  }
  function packUp(crew) { crew.g.visible = false; crew.team.forEach(h => { h.root.visible = false; }); crew.it.pos.set(0, -999, 0); crew.target = null; crew.helped = false; }

  // ---- per frame ----
  function update(dt, s) {
    clock += dt; tick += dt; weatherTick += dt;
    if (tick >= 0.25) {   // heavy traffic wears the road under it
      for (const v of s.vehicles) { const rate = HEAVY[v.kind] ?? 0; const sp = Math.abs(v.speed || 0); if (!rate || sp < 3 || v.crashed) continue; const p = v.group.position; damage(p.x, p.z, rate * tick * Math.min(2.5, sp / 10)); }
      for (const w of s.extraWear || []) damage(w.x, w.z, w.rate * tick);
      tick = 0;
    }
    if (weatherTick >= 1) {   // rain soaks in, frost heaves: random spots crack across the city
      weatherTick = 0;
      const n = s.weather === 'snow' ? 3 : s.weather === 'rain' ? 2 : Math.random() < 0.05 ? 1 : 0;
      for (let i = 0; i < n; i++) { const p = randomRoadPoint(); if (p) damage(p[0], p[1], (s.weather === 'snow' ? 14 : 10) + Math.random() * 18); }
    }
    // fresh patches fade back to normal road after a while
    for (const [k, c] of cells) { if (c.patch > 0) { c.patch -= dt; if (c.patch <= 0) { c.patch = 0; dirty = true; } } if (c.hp >= 100 && c.patch <= 0) cells.delete(k); }
    // potholes jolt the car you're driving
    const d = s.driving;
    if (d && Math.abs(d.speed || 0) > 6 && !['plane', 'helicopter', 'boat'].includes(d.kind) && !d.hover) {
      const c = at(d.group.position.x, d.group.position.z), st = c ? stageFor(c.hp) : 'ok';
      if (st === 'pothole' || st === 'broken') {
        if (d.lastHole !== c) { d.lastHole = c; const sev = st === 'broken' ? 2.5 : 1; ctx.bump?.(d, sev, Math.abs(d.speed)); if (firstBump) { firstBump = false; toast('💥 Pothole! Roads wear out under heavy traffic and bad weather. Road crews are out fixing the worst of it.'); } }
        if (st === 'broken' && Math.abs(d.speed) > 12) d.speed *= 1 - Math.min(0.9, dt * 2);
      } else d.lastHole = null;
    }
    // crews
    for (const crew of crews) {
      crew.timer -= dt;
      if (crew.state === 'idle' && crew.timer <= 0) { const job = pickJob(crew, s.playerPos); if (job) { crew.target = job; crew.state = 'travel'; crew.timer = Math.min(40, 6 + Math.hypot(job.x - s.playerPos.x, job.z - s.playerPos.z) / 20); } else crew.timer = 10; }
      else if (crew.state === 'travel' && crew.timer <= 0) { if (!cells.has(key(crew.target.x, crew.target.z))) { crew.state = 'idle'; crew.target = null; crew.timer = 2; continue; } crew.state = 'work'; crew.timer = crew.helped ? 20 : 45; setUp(crew); }
      else if (crew.state === 'work') {
        const c = crew.target, k = clock;
        crew.lb.material.emissiveIntensity = Math.sin(k * 10) > 0 ? 2.5 : 0.3;
        const [h0, h1, h2] = crew.team;
        ctx.animatePerson(h0, false, dt); h0.rig.rotation.x = 0.35; h0.armL.pivot.rotation.x = h0.armR.pivot.rotation.x = -0.9; crew.drill.position.y = Math.max(0, groundY(c.x, c.z, 0)) + Math.abs(Math.sin(k * 30)) * 0.05;
        ctx.animatePerson(h1, false, dt); h1.armR.pivot.rotation.x = -0.6 + Math.sin(k * 3) * 0.8; h1.rig.rotation.x = 0.2 + Math.max(0, Math.sin(k * 3)) * 0.3;
        ctx.animatePerson(h2, false, dt); h2.armR.pivot.rotation.x = -2.6;
        const f = [Math.sin(crew.along), Math.cos(crew.along)], u = Math.sin(k * 0.6) * 2.2;
        crew.roller.position.set(c.x + f[0] * u + f[1] * 1.5, crew.roller.position.y, c.z + f[1] * u - f[0] * 1.5);
        if (crew.timer <= 0) {
          for (const o of cells.values()) if (Math.hypot(o.x - c.x, o.z - c.z) < 9 && o.hp < 100) { o.hp = 100; o.patch = 600; dirty = true; }
          packUp(crew); crew.state = 'idle'; crew.timer = 5;
        }
      }
    }
    if (dirty) redraw();
  }
  const worst = () => { let n = 0; for (const c of cells.values()) if (c.hp < 40) n++; return n; };
  return {
    update, damage, blast, at, crews, cells,
    get potholes() { return worst(); },
    stageAt: (x, z) => stageFor(at(x, z)?.hp ?? 100),
    help(crew) { if (crew.state !== 'work') return false; crew.timer = Math.min(crew.timer, 6); crew.helped = true; return true; },
    snapshot: () => [...cells.values()].filter(c => c.hp < 100).slice(0, 400).map(c => [Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10, Math.round(c.hp)]),
    restore(list) { if (!Array.isArray(list)) return; cells.clear(); for (const [x, z, hp] of list) { if (!Number.isFinite(x)) continue; cells.set(key(x, z), { hp, x, z, rot: Math.random() * 6.28, patch: 0 }); } dirty = true; },
  };
}
