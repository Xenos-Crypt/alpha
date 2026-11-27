// WALK-IN BUILDINGS: buildings you really walk into, through a door you open yourself.
//
// The outside: the ground storey is four real walls with a doorway in the street side (the facade above stays one
// block). The doorway has a real door. Nothing opens on its own and nothing moves you: press E to open it (and E
// again to close it), then walk in. A shut door is solid.
//   swing     - homes and flats: a hinged door that swings out (and stops if someone is in the way)
//   sliding   - two glass panels slide apart
//   revolving - offices: it turns all the time; step into a gap between the glass wings and walk round with it. The
//               offices' ground floor is glass, so from the street you can see in (the lobby is built when you're near)
//   shutter   - shops: the steel shutter rolls up in opening hours (07:00-22:00), with a glass door behind it
//
// The inside is built only while you're near (so a city of them costs nothing), at the building's real size and on
// every floor: floors and ceilings, walls with windows, furniture that's solid, and the things you use (the till, the
// receptionist, a bed). Floors are joined by a staircase you walk up (two flights and a landing per storey) or, in
// tall buildings (5 floors or more), a real lift (lifts.js).
//
// Local frame for each building: a runs along the door wall, b runs from the door wall (b = -hb) to the back wall
// (b = +hb). The stair or lift core is in the back right corner; the doorway is in the middle of the front wall.
import * as THREE from 'three';
import { createLift } from './lifts.js';

export const WALKIN_STOREY = 3;

export function createWalkIns(ctx) {
  // ctx: { scene, colliders, camBlockers, interactables, playerPos(), hooks(), sweep, blocked, toast, resume,
  //        hourNow(), shopOpen(h), owns(name), gate(b), makePerson?, onInside?(building|null) }
  const S = WALKIN_STOREY, T = 0.3, G = 2.0, DH = 2.5, FW = 1.1, RUN = 2.4, R = 1.2, SPIN = 0.5;   // R: a revolving door's drum radius; SPIN: how fast it turns (rad/s)
  const list = [], grid = new Map(), CELL = 16;
  const key = (i, k) => i * 100003 + k;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.em ?? c, emissiveIntensity: o.ei ?? 0.18, transparent: !!o.op, opacity: o.op ?? 1 })); return mats.get(k); };
  const glass = mat(0x9fd3ff, { op: 0.35, rough: 0.05, metal: 0.5, ei: 0.05 }), frameM = mat(0x2b2f33, { metal: 0.6, rough: 0.35, ei: 0.05 });
  const brass = mat(0xd4af37, { metal: 0.8, rough: 0.3, ei: 0.1 });
  const LOOK = {
    shop: { wall: 0xf1ede4, floor: 0xc9ccc9 }, office: { wall: 0xe9edf1, floor: 0x5d6b78 }, apartment: { wall: 0xeee6da, floor: 0x9a7350 },
  };

  function frameOf(o) {
    const Bx = -o.nx, Bz = -o.nz, Ax = -Bz, Az = Bx, alongX = Math.abs(Ax) > 0.5;
    const ha = alongX ? o.w / 2 : o.d / 2, hb = alongX ? o.d / 2 : o.w / 2;
    const W = (a, b) => ({ x: o.x + a * Ax + b * Bx, z: o.z + a * Az + b * Bz });
    const rect = (a0, a1, b0, b1) => { const p = W(a0, b0), q = W(a1, b1); return { minX: Math.min(p.x, q.x), maxX: Math.max(p.x, q.x), minZ: Math.min(p.z, q.z), maxZ: Math.max(p.z, q.z) }; };
    const local = (x, z) => { const dx = x - o.x, dz = z - o.z; return { a: dx * Ax + dz * Az, b: dx * Bx + dz * Bz }; };
    return { ha, hb, W, rect, local, alongX };
  }
  // a box in local coordinates: a0..a1 along the door wall, b0..b1 front to back, y0..y1 in world height
  function boxL(F, parent, a0, a1, b0, b1, y0, y1, m) {
    const r = F.rect(a0, a1, b0, b1), o = new THREE.Mesh(geo, m);
    o.scale.set(Math.max(0.01, r.maxX - r.minX), Math.max(0.01, y1 - y0), Math.max(0.01, r.maxZ - r.minZ));
    o.position.set((r.minX + r.maxX) / 2, (y0 + y1) / 2, (r.minZ + r.maxZ) / 2); parent.add(o); return o;
  }
  const inR = (a, b, r) => a > r[0] && a < r[1] && b > r[2] && b < r[3];

  // ------------------------------------------------------------------ add a building
  // o: { b (its civic record), x, z, w, d, floors, base, top, nx, nz (the door side), type, name, wallMat(alongX) }
  function add(o) {
    const F = frameOf(o), { ha, hb } = F, base = o.base, n = o.floors;
    const cr = ha - T, cb = hb - T, tall = n >= 5;
    const W = {
      ...o, F, n, cr, cb, tall, look: LOOK[o.type] || LOOK.apartment, colliders: [], meshes: [],
      bs: cb - 1.1 - RUN,                                                         // where the flights start (front edge of the stair core)
      core: tall ? [cr - 2.6, cr, cb - 2.25, cb] : [cr - 2 * FW - 0.1, cr, cb - 1.1 - RUN, cb],
      interior: null,
    };
    W.style = doorStyleFor(o.type); W.glassFront = W.style === 'revolving';
    const GW = W.gap = W.style === 'revolving' ? 2 * (R + 0.12) : G;
    const sc = o.scene || ctx.scene, wall = (a0, a1, b0, b1, y0, y1, alongX, solid = true, m0 = null) => {
      const m = boxL(F, sc, a0, a1, b0, b1, y0, y1, m0 || o.wallMat(alongX)); m.castShadow = m.receiveShadow = true; ctx.camBlockers.push(m); W.meshes.push(m);
      if (solid) { const c = F.rect(a0, a1, b0, b1); ctx.colliders.push(c); W.colliders.push(c); }
    };
    // the ground storey: four walls, the front one with the doorway (and a lintel over it)
    const fx = F.alongX;   // the front and back walls run along x when the door faces z
    if (W.glassFront) {   // a glass shopfront: panes between slim mullions, a solid band above the drum
      wall(-ha, -GW / 2, -hb, -hb + 0.08, base, base + DH + 0.2, fx, true, glass); wall(GW / 2, ha, -hb, -hb + 0.08, base, base + DH + 0.2, fx, true, glass);
      for (const a of [-ha + 0.05, -ha / 2, -GW / 2 - 0.05, GW / 2 + 0.05, ha / 2, ha - 0.05]) boxL(F, sc, a - 0.05, a + 0.05, -hb, -hb + 0.12, base, base + DH + 0.2, frameM);
      wall(-ha, ha, -hb, -hb + T, base + DH + 0.2, base + S, fx, false);
    } else { wall(-ha, -GW / 2, -hb, -hb + T, base, base + S, fx); wall(GW / 2, ha, -hb, -hb + T, base, base + S, fx); wall(-GW / 2, GW / 2, -hb, -hb + T, base + DH, base + S, fx, false); }
    wall(-ha, ha, hb - T, hb, base, base + S, fx);
    wall(-ha, -ha + T, -hb + T, hb - T, base, base + S, !fx); wall(ha - T, ha, -hb + T, hb - T, base, base + S, !fx);
    // above the ground storey the doorway is just facade: solid for anyone up there
    { const c = { ...F.rect(-GW / 2, GW / 2, -hb, -hb + T), baseYAt: () => { const y = ctx.playerPos().y; return y > base + S - 0.6 ? y : 1e9; } }; ctx.colliders.push(c); W.colliders.push(c); }
    makeDoor(W, sc);
    list.push(W);
    const r = F.rect(-ha, ha, -hb, hb); W.box = r;
    for (let i = Math.floor(r.minX / CELL); i <= Math.floor(r.maxX / CELL); i++) for (let k = Math.floor(r.minZ / CELL); k <= Math.floor(r.maxZ / CELL); k++) { const kk = key(i, k); let l = grid.get(kk); if (!l) grid.set(kk, l = []); l.push(W); }
    if (o.b) { o.b.walkIn = W; o.b.noDoor = true; }
    return W;
  }

  // ------------------------------------------------------------------ doors
  function doorStyleFor(type) { return type === 'shop' ? 'shutter' : type === 'office' ? 'revolving' : 'swing'; }
  function makeDoor(W, sc) {
    const F = W.F, style = W.style, p = F.W(0, -F.hb);
    const g = new THREE.Group(); g.name = 'walk-in door'; g.position.set(p.x, W.base, p.z); g.rotation.y = Math.atan2(W.nx, W.nz); sc.add(g); W.meshes.push(g);
    const P = (parent, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(geo, m); b.scale.set(w, h, d); b.position.set(x, y, z); parent.add(b); return b; };
    const D = { style, g, open: 0, target: 0, spin: 0, parts: {} };
    if (style !== 'revolving') { P(g, G + 0.3, 0.18, 0.2, 0, DH + 0.09, 0.05, frameM); for (const s of [-1, 1]) P(g, 0.12, DH, 0.2, s * (G / 2 + 0.03), DH / 2, 0.05, frameM); }
    const hingeDoor = (m, z) => {
      const h = new THREE.Group(); h.position.set(-G / 2 + 0.03, 0, z); g.add(h); const len = G - 0.06;
      P(h, len, DH - 0.06, 0.06, len / 2, (DH - 0.06) / 2, 0, m); P(h, 0.06, 0.06, 0.14, len - 0.2, 1.05, 0, brass); h.userData.len = len; return h;
    };
    if (style === 'swing') { const leaf = [0x6b4a2f, 0x2f4a6b, 0x7a1f1f, 0x2d5d3a, 0x3a3f45][Math.abs(Math.round(W.x * 7 + W.z * 3)) % 5]; D.parts.hinge = hingeDoor(mat(leaf, { ei: 0.05 }), 0.06); }
    else if (style === 'shutter') {
      D.parts.hinge = hingeDoor(glass, 0.06);
      P(g, G + 0.3, 0.4, 0.4, 0, DH + 0.38, 0.25, frameM);
      const sh = P(g, G, DH, 0.05, 0, DH / 2, 0.3, mat(0x9aa3aa, { metal: 0.5, ei: 0.05 })); D.parts.shutter = sh; D.shut = 1;
    } else if (style === 'sliding') { D.parts.panels = [-1, 1].map(s => { const q = P(g, G / 2, DH - 0.06, 0.05, s * G / 4, DH / 2, 0.06, glass); q.userData.home = s * G / 4; q.userData.side = s; return q; }); }
    else {   // revolving: a glass drum set in the wall, half outside and half in, with four glass wings that never stop
      const cz = -T / 2;
      for (const t0 of [Math.PI / 4, Math.PI * 5 / 4]) { const arc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, DH, 20, 1, true, t0, Math.PI / 2), glass); arc.position.set(0, DH / 2, cz); g.add(arc); }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.08, 0.16, 28), frameM); disc.position.set(0, DH + 0.08, cz); g.add(disc);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, DH, 10), frameM); post.position.set(0, DH / 2, cz); g.add(post);
      const wings = new THREE.Group(); wings.position.set(0, 0, cz); wings.rotation.y = Math.PI / 4; g.add(wings);
      for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2; wings.add(arm); P(arm, 0.03, DH - 0.12, R - 0.1, 0, DH / 2, (R - 0.1) / 2 + 0.06, glass); P(arm, 0.05, DH - 0.12, 0.05, 0, DH / 2, R - 0.06, frameM); P(arm, 0.05, 0.06, R - 0.1, 0, 0.06, (R - 0.1) / 2 + 0.06, frameM); }
      D.parts.wings = wings; const c = F.W(0, -F.hb + T / 2); D.center = { x: c.x, z: c.z };
    }
    // shut, the doorway is solid
    W.door = D;
    const it = { pos: new THREE.Vector3(p.x, W.base, p.z), r: 2.2, door: true };
    W.doorSpot = it;
    if (style === 'revolving') { D.solid = false; return; }   // nothing to open: you walk in with it
    const c = { ...F.rect(-G / 2, G / 2, -F.hb - 0.05, -F.hb + T), baseYAt: () => (D.solid ? W.base : 1e9) };
    ctx.colliders.push(c); W.colliders.push(c); D.solid = true;
    // E: open / close (on either side of the door)
    Object.defineProperties(it, Object.getOwnPropertyDescriptors({
      get label() {
        if (W.b && W.b.alive === false) return `${W.name}: closed for rebuilding`;
        const v = W.b && ctx.gate?.(W.b); if (v) return v.label;
        if (style === 'shutter' && !shopHours(W)) return `${W.name} is shut (opens 07:00)`;
        if (style === 'sliding') return D.target ? 'Close the sliding doors' : `Open the sliding doors (${W.name})`;
        return D.target ? 'Close the door' : `Open the door (${W.name})`;
      },
      action() {
        if (W.b && W.b.alive === false) return;
        const v = W.b && ctx.gate?.(W.b); if (v) { v.action(); return; }
        if (style === 'shutter' && !shopHours(W)) { ctx.toast(`${W.name} is shut for the night. The shutter goes up at 07:00.`); return; }
        D.target = D.target ? 0 : 1;
      } }));
    ctx.interactables.push(it);
  }
  const shopHours = W => ctx.shopOpen(ctx.hourNow()) || !!ctx.owns?.(W.name);
  const _hp = new THREE.Vector3();
  function updateDoor(W, dt) {
    const D = W.door, g = D.g;
    if (D.style === 'shutter') {
      const up = shopHours(W) ? 1 : 0; D.shut += THREE.MathUtils.clamp((1 - up) - D.shut, -dt * 0.6, dt * 0.6);
      const sh = D.parts.shutter, h = Math.max(0.05, DH * D.shut); sh.scale.y = h; sh.position.y = DH - h / 2;
      if (!up && D.target) D.target = 0;   // closing time: the door gets shut and locked
    }
    if (D.style === 'revolving') { D.parts.wings.rotation.y += dt * SPIN; return; }
    D.open += THREE.MathUtils.clamp(D.target - D.open, -dt * 2.2, dt * 2.2);
    if (D.style === 'sliding') for (const q of D.parts.panels) q.position.x = q.userData.home + q.userData.side * D.open * (G / 2 * 0.95);
    else {
      const h = D.parts.hinge, want = -D.open * 1.45;
      if (ctx.sweep) { h.getWorldPosition(_hp); const r = g.rotation.y, res = ctx.sweep(_hp.x, _hp.z, Math.cos(r), -Math.sin(r), h.userData.len, h.rotation.y, want); h.rotation.y = res.angle; if (res.by) { D.open = Math.max(0, Math.min(D.open, -res.angle / 1.45)); ctx.blocked?.(res.by); } }
      else h.rotation.y = want;
    }
    D.solid = D.open < 0.7;
  }

  // ------------------------------------------------------------------ standing places (floors, stairs, the lift)
  const yOf = (W, k) => W.base + k * S;
  // the two flights between floor k and k+1: [a0, a1, bLow, bHigh, y at bLow, y at bHigh]
  function flights(W, k) {
    const a0 = W.cr - 2 * FW - 0.1, mid = yOf(W, k) + S / 2;
    return [[a0, a0 + FW, W.bs, W.cb - 1.1, yOf(W, k), mid], [a0 + FW + 0.1, W.cr, W.bs, W.cb - 1.1, yOf(W, k + 1), mid]];
  }
  function holeOf(W, k) { return k >= 1 && k < W.n ? W.core : null; }   // the stair or lift hole in floor k
  function floorAt(x, z, bodyY) {
    const l = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!l) return null;
    for (const W of l) {
      if (x <= W.box.minX || x >= W.box.maxX || z <= W.box.minZ || z >= W.box.maxZ) continue;
      if (W.b && W.b.alive === false) return null;
      const y = bodyY ?? ctx.playerPos().y;
      if (y < W.base - 1.5) return null;
      if (W.interior?.lift) { const g = W.interior.lift.groundAt(x, z, y); if (g != null) return g; }
      const { a, b } = W.F.local(x, z);
      if (y >= W.top - 0.6) return W.top;   // the roof
      let best = W.base;
      for (let k = Math.min(W.n - 1, Math.floor((y + 0.6 - W.base) / S)); k >= 1; k--) { const h = holeOf(W, k); if (h && inR(a, b, h)) continue; best = Math.max(best, yOf(W, k)); break; }
      if (!W.tall) for (let k = 0; k < W.n - 1; k++) {
        const fy = yOf(W, k); if (fy > y + 0.6 || fy + S < y - 3.5) continue;
        for (const f of flights(W, k)) if (a > f[0] && a < f[1] && b > f[2] - 0.05 && b < f[3] + 0.05) { const t = THREE.MathUtils.clamp((b - f[2]) / (f[3] - f[2]), 0, 1), h = f[4] + (f[5] - f[4]) * t; if (h <= y + 0.6) best = Math.max(best, h); }
        if (a > flights(W, k)[0][0] && a < W.cr && b >= W.cb - 1.1 && b < W.cb + 0.01) { const h = yOf(W, k) + S / 2; if (h <= y + 0.6) best = Math.max(best, h); }   // the half landing
      }
      return best;
    }
    return null;
  }
  function at(x, z) { const l = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!l) return null; for (const W of l) if (x > W.box.minX && x < W.box.maxX && z > W.box.minZ && z < W.box.maxZ) return W; return null; }

  // ------------------------------------------------------------------ the inside, built while you're near
  function buildInterior(W) {
    const I = { group: new THREE.Group(), floors: new Map(), lift: null, liftCols: [], liftSpots: [] };
    I.group.name = 'walk-in interior (' + W.name + ')'; ctx.scene.add(I.group);
    W.interior = I; return I;
  }
  function addLift(W, I) {
    {
      const F = W.F, c = F.W(W.cr - 1.3, W.cb);
      I.lift = createLift({ scene: I.group, colliders: I.liftCols, x: c.x, z: c.z, rot: Math.atan2(W.nx, W.nz), floorH: S, floors: Array.from({ length: W.n }, (_, k) => ({ y: yOf(W, k), name: k ? 'Floor ' + k : 'Ground floor' })), name: 'Lift', toast: ctx.toast, resume: ctx.resume });
      for (const cc of I.liftCols) ctx.colliders.push(cc);
      for (const sp of [...I.lift.spots, ...I.lift.cabSpots]) { ctx.interactables.push(sp); I.liftSpots.push(sp); }
    }
  }
  function disposeFloor(I, k) {
    const f = I.floors.get(k); if (!f) return;
    I.group.remove(f.g);
    for (const m of f.blockers) { const i = ctx.camBlockers.indexOf(m); if (i >= 0) ctx.camBlockers.splice(i, 1); }
    for (const c of f.cols) { const i = ctx.colliders.indexOf(c); if (i >= 0) ctx.colliders.splice(i, 1); }
    for (const s of f.spots) { const i = ctx.interactables.indexOf(s); if (i >= 0) ctx.interactables.splice(i, 1); }
    I.floors.delete(k);
  }
  function disposeInterior(W) {
    const I = W.interior; if (!I) return;
    for (const k of [...I.floors.keys()]) disposeFloor(I, k);
    for (const c of I.liftCols) { const i = ctx.colliders.indexOf(c); if (i >= 0) ctx.colliders.splice(i, 1); }
    for (const s of I.liftSpots) { const i = ctx.interactables.indexOf(s); if (i >= 0) ctx.interactables.splice(i, 1); }
    I.group.traverse(o => { if (!o.isMesh) return; if (o.geometry !== geo) o.geometry.dispose(); for (const m of [].concat(o.material)) { m.map?.dispose(); if (![...mats.values()].includes(m)) m.dispose(); } });   // (what's left is the lift: its own meshes)
    ctx.scene.remove(I.group); W.interior = null;
  }
  // one floor: floor, ceiling, wall linings with windows, the stairs up from it, furniture and the things you use
  function buildFloor(W, I, k) {
    const F = W.F, y0 = yOf(W, k), g = new THREE.Group(); I.group.add(g);
    const f = { g, blockers: [], cols: [], spots: [] }; I.floors.set(k, f);
    const wallM = mat(W.look.wall), floorM = mat(W.look.floor, { rough: 0.6 }), ceilM = mat(0xf4f4f2, { ei: 0.75 });
    const put = (a0, a1, b0, b1, ya, yb, m, solid = false) => { const o = boxL(F, g, a0, a1, b0, b1, y0 + ya, y0 + yb, m); if (solid) { const c = { ...F.rect(a0, a1, b0, b1), baseYAt: () => y0 }; ctx.colliders.push(c); f.cols.push(c); } return o; };
    const spot = (a, b, r, label, action) => { const p = F.W(a, b), s = { pos: new THREE.Vector3(p.x, y0, p.z), r, label, action }; ctx.interactables.push(s); f.spots.push(s); return s; };
    const { cr, cb } = W;
    // floor and ceiling, leaving the stair or lift hole open
    const slab = (hole, ya, yb, m, block) => { const R = [-cr, cr, -cb, cb], q = (...r) => { const o = put(...r, ya, yb, m); if (block) { f.blockers.push(o); ctx.camBlockers.push(o); } };
      if (!hole) { q(R[0], R[1], R[2], R[3]); return; }
      q(R[0], hole[0], R[2], R[3]); q(hole[1], R[1], R[2], R[3]); q(hole[0], hole[1], R[2], hole[2]); q(hole[0], hole[1], hole[3], R[3]); };
    slab(holeOf(W, k), -0.04, 0.01, floorM);
    slab(holeOf(W, k + 1), S - 0.06, S - 0.02, ceilM, true);   // (the camera stays under the ceiling)
    put(-1.2, 1.2, -1.2, 1.2, S - 0.1, S - 0.07, mat(0xffffff, { em: 0xfff6e0, ei: 1.2 }));   // ceiling light
    // wall linings (the camera stays inside them)
    const L = (a0, a1, b0, b1) => { const o = put(a0, a1, b0, b1, 0, S - 0.06, wallM); f.blockers.push(o); ctx.camBlockers.push(o); };
    if (k === 0 && W.glassFront) put(-cr, cr, -cb, -cb + 0.05, DH + 0.2, S - 0.06, wallM);
    else if (k === 0) { L(-cr, -W.gap / 2, -cb, -cb + 0.05); L(W.gap / 2, cr, -cb, -cb + 0.05); put(-W.gap / 2, W.gap / 2, -cb, -cb + 0.05, DH, S - 0.06, wallM); }
    else L(-cr, cr, -cb, -cb + 0.05);
    L(-cr, cr, cb - 0.05, cb); L(-cr, -cr + 0.05, -cb, cb); L(cr - 0.05, cr, -cb, cb);
    const pane = mat(0xa9cde8, { em: 0x9cc4e4, ei: 0.55, rough: 0.1 });
    put(-cr + 0.05, -cr + 0.07, -1, 1, 1.0, 2.3, pane); put(-2.6, -0.6, cb - 0.07, cb - 0.05, 1.0, 2.3, pane); put(cr - 0.07, cr - 0.05, -cb + 0.6, -cb + 2.2, 1.0, 2.3, pane);
    if (k > 0) put(-1, 1, -cb + 0.05, -cb + 0.07, 1.0, 2.3, pane);
    // the stairs from this floor to the next: two flights and a half landing, with rails
    if (!W.tall && k < W.n - 1) {
      const fl = flights(W, k), stepM = mat(0xb9b4aa, { rough: 0.8 }), railM = glass;
      for (const [a0, a1, bl, bh, yl, yh] of fl) {
        const steps = 8; for (let i = 0; i < steps; i++) { const t0 = i / steps, t1 = (i + 1) / steps, yTop = (yl + (yh - yl) * (yl < yh ? t1 : t0)) - y0;
          const bb0 = bl + (bh - bl) * t0, bb1 = bl + (bh - bl) * t1; put(a0, a1, Math.min(bb0, bb1), Math.max(bb0, bb1), Math.max(0, yTop - 0.4), yTop, stepM); }
      }
      const la = fl[0][0]; put(la, cr, cb - 1.1, cb, S / 2 - 0.15, S / 2, stepM);   // half landing
      // the wall between the flights, the rail on the open side, and the space under the upper flight is closed off
      put(la + FW, la + FW + 0.1, W.bs, cb - 1.1, 0, S, wallM);
      for (const yb of [0, S / 2]) { const c = { ...F.rect(la + FW, la + FW + 0.1, W.bs, cb - 1.1), baseYAt: () => y0 + yb }; ctx.colliders.push(c); f.cols.push(c); }
      put(la - 0.05, la + 0.03, W.bs + 0.5, cb, 0.0, 1.0 + S / 2, railM);
      { const c = { ...F.rect(la - 0.08, la + 0.05, W.bs + 0.5, cb), baseYAt: () => y0 }; ctx.colliders.push(c); f.cols.push(c); }
      if (k === 0) { const c = { ...F.rect(la + FW + 0.1, cr, W.bs - 0.05, W.bs + 0.08), baseYAt: () => y0 }; ctx.colliders.push(c); f.cols.push(c); put(la + FW + 0.1, cr, W.bs - 0.03, W.bs + 0.05, 0, 1.0, railM); }   // (nothing to walk into under the first upper flight)
    }
    // on the floor above a staircase: a rail along the open edge of the hole
    if (!W.tall && k >= 1) { const la = flights(W, k - 1)[0][0]; put(la - 0.05, la + 0.03, W.bs + 0.5, cb, 0, 1.0, glass); const c = { ...F.rect(la - 0.08, la + 0.05, W.bs + 0.5, cb), baseYAt: () => y0 }; ctx.colliders.push(c); f.cols.push(c); }
    furnish(W, k, put, spot, f);
  }

  // ------------------------------------------------------------------ furniture, by what the building is
  function furnish(W, k, put, spot, f) {
    const { cr, cb } = W, H = ctx.hooks?.() || {}, name = W.name;
    const wood = mat(0x7a5536, { rough: 0.6 }), dark = mat(0x2d3136), white = mat(0xf2f2f0), fabric = mat(0x5a6f8a, { rough: 0.9 }), green = mat(0x3f7f3a, { rough: 0.9 });
    const plant = (a, b) => { put(a - 0.25, a + 0.25, b - 0.25, b + 0.25, 0, 0.5, mat(0xd8d2c4), true); put(a - 0.35, a + 0.35, b - 0.35, b + 0.35, 0.5, 1.3, green); };
    const person = (a, b) => { if (!ctx.makePerson) return; const h = ctx.makePerson({ outfit: [0x2f5f8f, 0x8f2f2f, 0x3f6f3f, 0x444444][Math.abs(Math.round(W.x + W.z)) % 4] }); const p = W.F.W(a, b); h.root.position.set(p.x, yOf(W, k), p.z); h.root.rotation.y = Math.atan2(W.nx, W.nz); f.g.add(h.root); };
    const flat = () => {
      put(-cr, -cr + 2.0, cb - 2.2, cb - 0.05, 0, 0.5, white, true); put(-cr, -cr + 2.0, cb - 0.25, cb - 0.05, 0.5, 1.2, wood);   // bed
      put(-cr + 2.05, -cr + 2.5, cb - 0.6, cb - 0.1, 0, 0.55, wood, true);
      put(-cr, -cr + 0.9, -1.4, 0.8, 0, 0.45, fabric, true); put(-cr, -cr + 0.25, -1.4, 0.8, 0.45, 0.95, fabric);               // sofa
      put(-cr + 1.3, -cr + 2.1, -0.8, 0.2, 0, 0.4, wood, true);                                                                  // coffee table
      put(-cr, 1.0, -cb + 0.05, -cb + 0.65, 0, 0.9, white, true); put(-cr, 1.0, -cb + 0.05, -cb + 0.7, 0.9, 0.95, dark);           // kitchen units
      put(1.05, 1.85, -cb + 0.05, -cb + 0.8, 0, 2.0, mat(0xbfc5ca, { metal: 0.5 }), true);                                           // fridge
      put(-0.1, 1.1, -1.2, -0.2, 0.72, 0.78, wood); put(0.4, 0.6, -0.8, -0.6, 0, 0.72, wood, true);                                 // table
      spot(-cr + 1.0, cb - 1.1, 1.6, 'Lie on the bed', () => ctx.owns?.(name) ? H.sleep?.() : ctx.toast('This is somebody\'s home. Better not.'));
      spot(-1.2, -cb + 1.1, 1.4, 'Get a glass of water', () => ctx.toast('💧 A glass of cold water from the kitchen tap.'));
    };
    if (W.type === 'shop') {
      if (k === 0) {
        put(-cr, -cr + 0.5, -1.8, 2.0, 0, 1.8, wood, true);
        for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) put(-cr + 0.08, -cr + 0.42, -1.6 + i * 0.6, -1.25 + i * 0.6, 0.3 + r * 0.55, 0.62 + r * 0.55, mat([0xc0392b, 0x2f6f8f, 0xe0b030, 0x3f8f4f, 0xe67e22][(r + i) % 5]));
        put(-1.6, -1.0, -1.2, 1.4, 0, 1.4, wood, true); for (let i = 0; i < 4; i++) put(-1.55, -1.05, -1.0 + i * 0.6, -0.65 + i * 0.6, 1.4, 1.65, mat([0xe67e22, 0x2f6f8f, 0xc0392b, 0x3f8f4f][i]));
        put(-cr, -cr + 0.7, 2.3, cb - 0.05, 0, 2.0, mat(0xdfe6ea, { em: 0x9fd3ff, ei: 0.3 }), true);   // chiller
        put(-0.4, 1.2, 2.0, 2.6, 0, 1.0, mat(0x8f6a45), true); put(0.6, 1.0, 2.1, 2.4, 1.0, 1.3, dark);   // counter and till
        person(0.4, 3.1);
        spot(0.4, 1.5, 1.5, 'Buy snacks and drinks at the till', () => H.shop?.(name));
        spot(-cr + 1.1, 0, 1.6, 'Buy groceries for cooking', () => H.groceries ? H.groceries(name + ' groceries') : H.shop?.(name));
        spot(-cr + 1.2, 2.7, 1.2, 'Look in the chiller', () => ctx.toast('Milk, juice, sandwiches and ready meals, all chilled.'));
      } else if (k === 1) {
        for (const [a, b] of [[-3, -2.5], [-2, -2.5], [-3, -1.4], [-0.6, 2.4], [-3, 2.4], [-2, 2.4]]) put(a - 0.45, a + 0.45, b - 0.45, b + 0.45, 0, 0.8, mat(0xb08a5a), true);
        spot(-2, 0, 1.8, 'Check the stock', () => ctx.toast('Boxes of crisps, tins and toilet roll waiting to go out on the shelves.'));
      } else flat();
    } else if (W.type === 'office') {
      if (k === 0) {
        put(-1.6, 0.6, 1.2, 1.8, 0, 1.05, white, true); put(-1.6, 0.6, 1.15, 1.85, 1.05, 1.1, dark); person(-0.5, 2.5);
        put(-cr, -cr + 0.8, -2.8, -0.6, 0, 0.45, fabric, true); put(-cr, -cr + 0.2, -2.8, -0.6, 0.45, 0.9, fabric); plant(-cr + 0.5, 2.8); plant(2.6, -cb + 0.6);
        spot(-0.5, 0.7, 1.6, 'Talk to the receptionist', () => ctx.toast(`"Welcome to ${name}. Take a seat, someone will be right with you."`));
        spot(0.4, 0.7, 1.2, 'Ask about jobs here', () => H.careers ? H.careers('jobs') : ctx.toast('"We\'re not hiring right now, sorry."'));
      } else {
        for (const a of [-2.8, -0.6]) for (const b of [-1.8, 1.2]) {
          put(a - 0.8, a + 0.8, b - 0.4, b + 0.4, 0.7, 0.76, white, true); put(a - 0.75, a - 0.7, b - 0.35, b + 0.35, 0, 0.7, dark); put(a + 0.7, a + 0.75, b - 0.35, b + 0.35, 0, 0.7, dark);
          put(a - 0.3, a + 0.3, b + 0.15, b + 0.2, 0.8, 1.15, mat(0x111418, { em: 0x2a5a8a, ei: 0.5 })); put(a - 0.25, a + 0.25, b - 0.9, b - 0.5, 0, 0.48, dark);
        }
        put(1.6, 2.2, -cb + 0.05, -cb + 0.5, 0, 1.2, mat(0xd0e8f5), true);
        spot(1.9, -cb + 1.0, 1.3, 'Make a coffee', () => H.rest ? H.rest(25, 'You make a coffee. That\'s better.') : ctx.toast('☕ A coffee from the machine.'));
        if (k === 1) { put(-cr, -cr + 0.7, -cb + 0.05, -cb + 0.7, 0, 1.0, mat(0xd8dde0), true); spot(-cr + 1.0, -cb + 1.0, 1.2, 'Use the printer', () => ctx.toast('The printer jams. Of course it does.')); }
        plant(-cr + 0.5, cb - 0.5);
      }
    } else {   // flats: a lobby downstairs, a flat on every floor above
      if (k === 0) {
        put(-cr, -cr + 0.3, -1.0, 1.0, 0.9, 1.8, mat(0x8a8f95, { metal: 0.4 }), true);
        put(-cr, -cr + 0.5, 1.6, 3.0, 0, 0.45, wood, true); plant(-cr + 0.4, -cb + 0.5);
        spot(-cr + 0.9, 0, 1.4, 'Check the mailboxes', () => ctx.toast('Rows of little metal doors with names on. Nothing for you.'));
      } else flat();
    }
  }

  // A revolving door holds you in the gap between two wings and carries you round: the glass arcs at the sides
  // are solid, the wings push you along, and you can only step out where the drum opens (outside or inside).
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), Q = Math.PI / 2;
  function revolve(W, p) {
    const D = W.door, c = D.center, dx = p.x - c.x, dz = p.z - c.z; let r = Math.hypot(dx, dz);
    if (r > R + 0.45 || Math.abs(p.y - W.base) > 1.6) return;
    let phi = Math.atan2(dx, dz); const gr = D.g.rotation.y, rel = wrap(phi - gr);
    if (Math.abs(Math.abs(rel) - Q) < Math.PI / 4 + 0.05) r = r < R ? Math.min(r, R - 0.4) : Math.max(r, R + 0.4);   // the glass sides
    if (r < R) {
      r = Math.max(r, 0.62);   // (the post in the middle)
      const delta = Math.asin(Math.min(1, 0.4 / r)), w0 = gr + D.parts.wings.rotation.y, s0 = ((phi - w0) % Q + Q) % Q;
      if (s0 < delta) phi += delta - s0; else if (s0 > Q - delta) phi -= s0 - (Q - delta);
    }
    p.x = c.x + Math.sin(phi) * r; p.z = c.z + Math.cos(phi) * r;
  }

  // ------------------------------------------------------------------ each frame
  let insideNow = null;
  function update(dt) {
    const p = ctx.playerPos(), ci = Math.floor(p.x / CELL), ck = Math.floor(p.z / CELL), seen = new Set();
    for (let i = ci - 3; i <= ci + 3; i++) for (let k = ck - 3; k <= ck + 3; k++) for (const W of grid.get(key(i, k)) || []) {
      if (seen.has(W)) continue; seen.add(W);
      if (W.b?.redeveloped) { if (!W.gone) { W.gone = true; const i = ctx.interactables.indexOf(W.doorSpot); if (i >= 0) ctx.interactables.splice(i, 1); disposeInterior(W); } continue; }   // taken down for something else (a subway entrance...)
      updateDoor(W, dt);
      const dx = Math.max(0, W.box.minX - p.x, p.x - W.box.maxX), dz = Math.max(0, W.box.minZ - p.z, p.z - W.box.maxZ), dist = Math.hypot(dx, dz);
      const dp = W.doorSpot.pos, toDoor = Math.hypot(p.x - dp.x, p.z - dp.z);
      const near = (dist < 0.01 || toDoor < 4.5 || W.interior && dist < 3) && (W.b?.alive !== false) && p.y > W.base - 2 && p.y < W.top + 1;
      const seeIn = !near && W.glassFront && toDoor < 26 && (W.b?.alive !== false) && p.y < W.base + 8;   // you can see into the glass lobby from the street
      if (W.style === 'revolving' && toDoor < 3) revolve(W, p);
      if (seeIn) { const I = W.interior || buildInterior(W); for (const kk of [...I.floors.keys()]) if (kk) disposeFloor(I, kk); if (!I.floors.has(0)) buildFloor(W, I, 0); I.lift?.update(dt, p); }
      else if (near) {
        const I = W.interior || buildInterior(W);
        if (W.tall && !I.lift) addLift(W, I);
        const pf = THREE.MathUtils.clamp(Math.floor((p.y + 0.5 - W.base) / S), 0, W.n - 1);
        for (const kk of [...I.floors.keys()]) if (Math.abs(kk - pf) > 1) disposeFloor(I, kk);
        for (let kk = Math.max(0, pf - 1); kk <= Math.min(W.n - 1, pf + 1); kk++) if (!I.floors.has(kk)) buildFloor(W, I, kk);
        I.lift?.update(dt, p);
      } else if (W.interior && !seeIn && dist > 10) disposeInterior(W);
    }
    for (const W of list) if (W.interior && !seen.has(W)) disposeInterior(W);   // (far away now)
    const inside = at(p.x, p.z); const now = inside && p.y > inside.base - 1 && p.y < inside.top ? inside : null;
    if (now !== insideNow) { insideNow = now; ctx.onInside?.(now); }
  }
  // take a walk-in building away again (a building that's knocked down and rebuilt: building-sites.js)
  function remove(W) {
    if (!W) return; if (insideNow === W) insideNow = null;
    disposeInterior(W);
    for (const m of W.meshes) { m.removeFromParent(); const i = ctx.camBlockers.indexOf(m); if (i >= 0) ctx.camBlockers.splice(i, 1); }
    for (const c of W.colliders) { const i = ctx.colliders.indexOf(c); if (i >= 0) ctx.colliders.splice(i, 1); }
    if (W.doorSpot) { const i = ctx.interactables.indexOf(W.doorSpot); if (i >= 0) ctx.interactables.splice(i, 1); }
    const i = list.indexOf(W); if (i >= 0) list.splice(i, 1);
    for (const l of grid.values()) { const j = l.indexOf(W); if (j >= 0) l.splice(j, 1); }
  }
  return { add, remove, floorAt, at, update, list, revolve, get inside() { return insideNow; } };
}
