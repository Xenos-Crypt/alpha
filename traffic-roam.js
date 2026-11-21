// TRAFFIC EVERYWHERE: cars that drive the whole country's roads, not just the town's street grid.
//
// The road network is read from the roads themselves. Every straight road strip in the world (a long, narrow, flat
// dark surface: the same strips that stop grass growing on roads) becomes a stretch of road with a centre line.
// Where two stretches cross or meet, that's a junction; dead ends are where a road stops. Overlapping strips of the
// same road (tarmac, markings, kerbs) are merged into one. Small pieces that join nothing (car parks, yards) are
// dropped. The town centre keeps its own traffic (it has lights and buses), so these cars drive everywhere else.
//
// Each car keeps to the right-hand lane of its road, slows for junctions, picks a way at random at each one (never
// straight back unless it's a dead end), keeps its distance from the car in front, and waits for anything in its
// way (you, your car, other traffic). They are ordinary cars: someone is at the wheel, they can be waved at,
// knocked on, carjacked (the action menu) and hit. How many there are follows the graphics quality and the
// optimiser, and only the ones near you are moved every frame; far ones move a few times a second.
import * as THREE from 'three';

export function createRoamingTraffic(ctx) {
  // ctx: { rects, makeVehicle, vehicles, groundY(x,z,y), colors, count(), skipArea(x,z), player(), crowd() }
  const segs = [];
  for (const r of ctx.rects) {
    const dx = r.maxX - r.minX, dz = r.maxZ - r.minZ, w = Math.min(dx, dz), len = Math.max(dx, dz);
    if (w < 5 || w > 18 || len < 16 || len / w < 2.5) continue;
    const alongX = dx > dz;
    segs.push(alongX ? { ax: 'x', c: (r.minZ + r.maxZ) / 2, a: r.minX, b: r.maxX, w } : { ax: 'z', c: (r.minX + r.maxX) / 2, a: r.minZ, b: r.maxZ, w });
  }
  // merge strips of the same road (same axis, centre lines within 2.5 m, overlapping)
  const merged = [];
  for (const ax of ['x', 'z']) {
    const list = segs.filter(s => s.ax === ax).sort((p, q) => p.c - q.c || p.a - q.a);
    for (const s of list) {
      const m = merged.find(t => t.ax === ax && Math.abs(t.c - s.c) < 2.5 && s.a < t.b + 1 && s.b > t.a - 1);
      if (m) { m.a = Math.min(m.a, s.a); m.b = Math.max(m.b, s.b); m.w = Math.max(m.w, s.w); } else merged.push({ ...s });
    }
  }
  // junctions: every crossing (and T-junction) of an x-road with a z-road, plus each road's two ends
  const cuts = merged.map(s => new Set([s.a, s.b]));
  merged.forEach((h, i) => { if (h.ax !== 'x') return; merged.forEach((v, j) => {
    if (v.ax !== 'z') return;
    const mh = h.w / 2 + 1.5, mv = v.w / 2 + 1.5;
    if (v.c > h.a - mv && v.c < h.b + mv && h.c > v.a - mh && h.c < v.b + mh) {
      cuts[i].add(Math.min(h.b, Math.max(h.a, v.c))); cuts[j].add(Math.min(v.b, Math.max(v.a, h.c)));
      // a road that stops just short of another (a T-junction) is joined to it
      if (Math.abs(v.c - h.a) < mv) cuts[i].add(h.a); if (Math.abs(v.c - h.b) < mv) cuts[i].add(h.b);
    }
  }); });
  // nodes (snapped to 1 m so meeting roads share them) and edges
  const nodes = new Map(), key = (x, z) => Math.round(x) + ',' + Math.round(z);
  const node = (x, z) => { const k = key(x, z); let n = nodes.get(k); if (!n) nodes.set(k, n = { x, z, out: [] }); return n; };
  merged.forEach((s, i) => {
    const ts = [...cuts[i]].sort((p, q) => p - q);
    // the junction point on a crossing road is at that road's centre: map each cut to a point
    for (let k = 0; k < ts.length - 1; k++) {
      if (ts[k + 1] - ts[k] < 3) continue;
      const P = t => s.ax === 'x' ? node(t, s.c) : node(s.c, t);
      const A = P(ts[k]), B = P(ts[k + 1]);
      const e1 = { from: A, to: B, w: s.w }, e2 = { from: B, to: A, w: s.w };
      e1.back = e2; e2.back = e1; A.out.push(e1); B.out.push(e2);
    }
  });
  // weld nodes that are within a couple of metres (the two ends of a T meet the crossing road's centre line)
  const all = [...nodes.values()];
  for (const n of all) for (const m of all) {
    if (n === m || n.dead || m.dead || Math.abs(n.x - m.x) > 3 || Math.abs(n.z - m.z) > 3) continue;
    if (Math.hypot(n.x - m.x, n.z - m.z) < 3) { for (const e of m.out) { e.from = n; n.out.push(e); e.back.to = n; } m.out = []; m.dead = true; }
  }
  let live = all.filter(n => !n.dead && n.out.length);
  // keep only the big connected networks (drop car parks and yards), and nothing in the town centre
  const comp = new Map(); let best = [];
  for (const n of live) {
    if (comp.has(n)) continue; const q = [n], seen = [n]; comp.set(n, seen);
    while (q.length) { const c = q.pop(); for (const e of c.out) if (!comp.has(e.to)) { comp.set(e.to, seen); seen.push(e.to); q.push(e.to); } }
    if (seen.length >= 6) best.push(...seen);
  }
  live = best.filter(n => !ctx.skipArea(n.x, n.z));
  const usable = new Set(live);
  const edges = []; for (const n of live) { n.out = n.out.filter(e => usable.has(e.to) && Math.hypot(e.to.x - n.x, e.to.z - n.z) > 2); for (const e of n.out) { e.len = Math.hypot(e.to.x - e.from.x, e.to.z - e.from.z); edges.push(e); } }

  // ---- the cars ----
  const cars = [], tmp = new THREE.Vector3();
  const lanePos = (e, s, out) => {
    const dx = (e.to.x - e.from.x) / e.len, dz = (e.to.z - e.from.z) / e.len, lane = Math.min(2.2, e.w / 4);
    return out.set(e.from.x + dx * s + dz * lane, 0, e.from.z + dz * s - dx * lane);   // (the same side as the town's traffic)
  };
  function nextEdge(e) {
    const opts = e.to.out.filter(n => n !== e.back);
    return opts.length ? opts[Math.floor(Math.random() * opts.length)] : e.back;   // dead end: turn round
  }
  function spawn() {
    const near = ctx.player(), pool = edges.filter(e => e.len > 12);
    if (!pool.length) return null;
    // somewhere not right in front of you (they drive in from around you)
    let e = null; for (let i = 0; i < 20 && !e; i++) { const c = pool[Math.floor(Math.random() * pool.length)]; const d = Math.hypot(c.from.x - near.x, c.from.z - near.z); if (d > 60 && d < 700) e = c; }
    e ||= pool[Math.floor(Math.random() * pool.length)];
    const v = ctx.makeVehicle('car', ctx.colors[Math.floor(Math.random() * ctx.colors.length)]);
    v.routeTraffic = true; v.roaming = true; v.stealable = true; v.ai = { cruise: 9 + Math.random() * 5, stopTimer: 0 };
    const c = { v, e, s: Math.random() * e.len, speed: 6, acc: 0 };
    place(c); cars.push(c); return c;
  }
  function place(c) {
    const { v, e } = c; lanePos(e, c.s, tmp);
    const y = ctx.groundY(tmp.x, tmp.z, v.group.position.y + 1);
    v.group.position.set(tmp.x, Number.isFinite(y) ? y : 0.15, tmp.z);
    const want = Math.atan2(e.to.x - e.from.x, e.to.z - e.from.z);
    let d = want - v.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.group.rotation.y += d * Math.min(1, c.turnRate ?? 1);
  }
  function blocked(c) {
    const p = c.v.group.position, fx = Math.sin(c.v.group.rotation.y), fz = Math.cos(c.v.group.rotation.y);
    for (const o of ctx.obstacles()) {
      if (o === p) continue; const dx = o.x - p.x, dz = o.z - p.z, ahead = dx * fx + dz * fz;
      if (ahead > 0.5 && ahead < 9 + c.speed * 0.6 && Math.abs(dx * fz - dz * fx) < 2.2) return true;
    }
    return false;
  }
  let acc = 0, started = false;
  function update(dt) {
    // keep the numbers up (cars that were stolen, wrecked or driven off leave the list)
    for (let i = cars.length - 1; i >= 0; i--) { const v = cars[i].v; if (!v.routeTraffic || v.disabled || !ctx.vehicles.includes(v)) cars.splice(i, 1); }
    const want = Math.round(ctx.count());
    if (!started) { started = true; while (cars.length < want && spawn()); }   // the roads are already busy when you arrive
    else if (cars.length < want) spawn();
    acc += dt; const far = acc >= 0.25; if (far) acc = 0;
    const me = ctx.player();
    for (const c of cars) {
      const p = c.v.group.position, near = Math.abs(p.x - me.x) < 250 && Math.abs(p.z - me.z) < 250;
      if (!near && !far) continue;
      const step = near ? dt : 0.25;
      const toEnd = c.e.len - c.s, slow = toEnd < 12 ? 5 : c.v.ai.cruise;
      const stop = near && blocked(c);
      const target = stop ? 0 : slow;
      c.speed += Math.sign(target - c.speed) * Math.min(Math.abs(target - c.speed), (stop ? 14 : 4) * step);
      c.v.speed = c.speed;
      c.s += c.speed * step;
      while (c.s >= c.e.len) { c.s -= c.e.len; c.e = nextEdge(c.e); }
      c.turnRate = near ? 6 * step : 1;
      place(c);
    }
  }
  return { cars, edges, nodes: live, update, spawn };
}
