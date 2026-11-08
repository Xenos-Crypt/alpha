// Westhaven Recovery: flatbed tow trucks that carry wrecked and broken-down cars.
// The truck has a tilting flatbed, a winch with a cable that hooks onto the wreck, wheel straps
// that hold it down, and amber beacons. Loading is animated: the bed tilts back, the winch drags the
// wreck up onto the bed, the bed levels and the straps go on.
//   * When a car is wrecked, a recovery truck comes out, loads it and drives it away.
//   * The depot keeps trucks in the yard. Steal one and freelance (the scrapyard pays cash for any
//     wreck), or get hired as a recovery driver (careers.js) and take call-outs to broken-down cars.
import * as THREE from 'three';

export const DEPOT = { x: 640, z: -112, w: 40, d: 30 };      // the yard, with its gate on the south side (the East Road)
export const DROP = { x: 640, z: -105, r: 8 };               // the drop-off bay inside the yard

export const isWreck = v => !!v && !v.isTow && !v.carriedBy && !['plane', 'boat', 'bus', 'tank', 'tram', 'helicopter', 'bicycle'].includes(v.kind) && (v.crashed || v.disabled || v.exploded || (v.health ?? 100) < 35);

export function createRecovery(ctx) {
  const { scene, vehicles, makeVehicle, toast, groundY, makeTex } = ctx;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null })); return mats.get(k); };
  const B = (p, w, h, d, x, y, z, c, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const livery = makeTex(512, 128, g => { g.fillStyle = '#f2b707'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#111'; g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.fillText('WESTHAVEN RECOVERY', 256, 62, 490); g.font = '30px sans-serif'; g.fillText('24h breakdown · 0800 TOW', 256, 106); });
  const strapMat = mat(0xffcc00, { rough: 0.9 }), chrome = mat(0xc0c4c8, { metal: 0.8, rough: 0.25 });

  // ---------- the truck model (front is +z, like every vehicle) ----------
  function makeTowTruck(color = 0xf2b707, ai = false) {
    const v = makeVehicle('car', color);
    for (const c of v.group.children) c.visible = false;   // swap the car body for the truck
    const g = new THREE.Group(); v.group.add(g);
    // chassis, cab, wheels
    B(g, 2.3, 0.45, 7.4, 0, 0.75, -0.3, 0x2b2b2b);
    B(g, 2.35, 1.5, 2.0, 0, 1.75, 2.45, color); B(g, 2.2, 0.9, 1.6, 0, 2.85, 2.25, color);
    B(g, 2.0, 0.75, 0.06, 0, 2.95, 3.06, mat(0x5a7f99, { rough: 0.2, metal: 0.4 }));
    for (const s of [-1, 1]) B(g, 0.06, 0.6, 1.0, s * 1.11, 2.9, 2.3, mat(0x5a7f99, { rough: 0.2, metal: 0.4 }));
    B(g, 2.36, 0.4, 0.15, 0, 1.2, 3.45, chrome);
    for (const s of [-1, 1]) { B(g, 0.4, 0.22, 0.05, s * 0.85, 1.55, 3.46, mat(0xfff6d8, { emissive: 0xfff2c0, ei: 1.2 })); B(g, 0.3, 0.2, 0.05, s * 1.0, 1.0, -4.02, mat(0x8a0000, { emissive: 0xff0000, ei: 0.8 })); }
    for (const z of [2.4, -1.6, -2.8]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), mat(0x151515, { rough: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(s * 1.1, 0.5, z); g.add(w); }
    const beacons = [-1, 1].map(s => B(g, 0.35, 0.2, 0.35, s * 0.7, 3.4, 2.4, mat(0xff9900, { emissive: 0xff8800, ei: 0.2 }).clone()));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: livery })); p.position.set(s * 1.185, 1.9, 2.45); p.rotation.y = s * Math.PI / 2; g.add(p); }
    // tilting flatbed: pivot at the back of the chassis
    const pivot = new THREE.Group(); pivot.position.set(0, 1.05, -4.0); g.add(pivot);
    const deck = new THREE.Group(); pivot.add(deck);
    B(deck, 2.5, 0.15, 5.6, 0, 0.1, 2.8, 0x5a5f66, { metal: 0.5 }); for (const s of [-1, 1]) B(deck, 0.12, 0.3, 5.6, s * 1.25, 0.25, 2.8, color);
    for (let i = 0; i < 10; i++) B(deck, 2.4, 0.03, 0.08, 0, 0.19, 0.4 + i * 0.55, 0x3a3e44);
    B(deck, 2.5, 0.12, 0.6, 0, 0.05, -0.15, 0x5a5f66, { metal: 0.5 });   // ramp lip
    // winch at the front of the bed, with drum and cable
    B(deck, 1.4, 0.9, 0.5, 0, 0.6, 5.35, 0x333333); const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12), chrome); drum.rotation.z = Math.PI / 2; drum.position.set(0, 0.55, 5.0); deck.add(drum);
    const cable = B(deck, 0.04, 0.04, 1, 0, 0.5, 4.5, 0x222222); cable.visible = false;
    const hook = B(deck, 0.18, 0.18, 0.18, 0, 0.5, 4, chrome); hook.visible = false;
    // straps over the wreck's wheels (shown once it's secured)
    const straps = []; for (const z of [1.4, 4.0]) for (const s of [-1, 1]) { const st = B(deck, 0.12, 0.9, 0.12, s * 0.95, 0.65, z, strapMat); st.visible = false; straps.push(st); }
    v.isTow = true; v.length = 7.4; v.radius = 3.2; v.towModel = { g, pivot, deck, cable, hook, straps, beacons, drum }; v.carrying = null; v.towState = null;
    if (!ai) v.company = 'Westhaven Recovery';
    return v;
  }

  // ---------- loading / unloading ----------
  const BED = new THREE.Vector3(0, -0.28, 2.6);   // where a carried car sits on the deck (deck-local)
  function startLoad(truck, wreck) {
    if (truck.towState || truck.carrying) return false;
    const i = vehicles.indexOf(wreck); if (i >= 0) vehicles.splice(i, 1);   // out of traffic and physics while it's on the truck
    wreck.carriedBy = truck; wreck.ai = null; wreck.speed = 0;
    truck.towState = { phase: 'tilt', t: 0, wreck, from: wreck.group.position.clone(), fromYaw: wreck.group.rotation.y };
    return true;
  }
  function startUnload(truck, scrap) {
    if (truck.towState || !truck.carrying) return false;
    truck.towState = { phase: 'untilt', t: 0, wreck: truck.carrying, scrap };
    return true;
  }
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  // u = 0: bed level on the chassis; u = 1: slid back, front raised, back lip on the road
  const tilt = (M, u) => { M.pivot.rotation.x = -0.2 * u; M.pivot.position.set(0, 1.05 - 0.9 * u, -4.0 - 1.4 * u); };
  function animate(truck, dt) {
    const s = truck.towState, M = truck.towModel; if (!s) return;
    s.t += dt;
    const w = s.wreck;
    if (s.phase === 'tilt') { tilt(M, Math.min(1, s.t / 1.2)); if (s.t >= 1.2) { s.phase = 'winch'; s.t = 0; } }
    else if (s.phase === 'winch') {
      const u = Math.min(1, s.t / 3.2), e = u * u * (3 - 2 * u);
      M.deck.updateWorldMatrix(true, false); const bed = M.deck.localToWorld(tmp.copy(BED));
      w.group.position.lerpVectors(s.from, bed, e); w.group.position.y = s.from.y + (bed.y - s.from.y) * Math.max(0, (e - 0.3) / 0.7);
      w.group.rotation.y = s.fromYaw + (truck.group.rotation.y - s.fromYaw) * Math.min(1, e * 2);
      // cable from the drum to the wreck's front
      const drum = M.deck.localToWorld(tmp2.set(0, 0.55, 5.0)), front = w.group.position.clone().add(new THREE.Vector3(Math.sin(w.group.rotation.y), 0.5, Math.cos(w.group.rotation.y)).multiplyScalar(2.1));
      M.cable.visible = M.hook.visible = true; const len = drum.distanceTo(front);
      M.cable.scale.set(0.04, 0.04, len); M.deck.worldToLocal(M.cable.position.copy(drum).add(front).multiplyScalar(0.5)); M.cable.lookAt(front); M.hook.position.copy(M.deck.worldToLocal(front.clone()));
      M.drum.rotation.x += dt * 6;
      if (u >= 1) { s.phase = 'level'; s.t = 0; M.deck.attach(w.group); w.group.position.copy(BED); w.group.rotation.set(0, 0, 0); M.cable.visible = M.hook.visible = false; }
    } else if (s.phase === 'level') { const u = Math.min(1, s.t / 1.2); tilt(M, 1 - u); if (u >= 1) { for (const st of M.straps) st.visible = true; truck.carrying = w; truck.towState = null; ctx.onLoaded?.(truck, w); } }
    else if (s.phase === 'untilt') { for (const st of M.straps) st.visible = false; tilt(M, Math.min(1, s.t / 1.2)); if (s.t >= 1.2) { s.phase = 'slide'; s.t = 0; s.start = w.group.position.clone(); } }
    else if (s.phase === 'slide') {
      const u = Math.min(1, s.t / 2.2); w.group.position.z = s.start.z - u * 7.5; w.group.position.y = s.start.y - u * 0.6;
      if (u >= 1) {
        scene.attach(w.group); w.group.position.y = Math.max(0, groundY(w.group.position.x, w.group.position.z, 0)) + 0.1; w.group.rotation.x = w.group.rotation.z = 0;
        truck.carrying = null; w.carriedBy = null;
        if (s.scrap) { scene.remove(w.group); w.scrapped = true; } else vehicles.push(w);
        s.phase = 'relevel'; s.t = 0; ctx.onUnloaded?.(truck, w, s.scrap);
      }
    } else if (s.phase === 'relevel') { const u = Math.min(1, s.t / 1.2); tilt(M, 1 - u); if (u >= 1) truck.towState = null; }
  }

  // ---------- the depot ----------
  const yard = new THREE.Group(); scene.add(yard);
  { const { x, z, w, d } = DEPOT;
    const ground = B(yard, w, 0.06, d, x, 0.04, z, 0x55595e, { rough: 0.95 });
    void ground;
    const fenceMat = mat(0x9aa3a8, { metal: 0.5 });
    for (const [fx, fz, fw, fd] of [[x, z - d / 2, w, 0.15], [x - w / 2, z, 0.15, d], [x + w / 2, z, 0.15, d], [x - w / 4 - 4, z + d / 2, w / 2 - 8, 0.15], [x + w / 4 + 4, z + d / 2, w / 2 - 8, 0.15]]) { B(yard, fw, 2.4, fd, fx, 1.2, fz, fenceMat); ctx.colliders.push({ minX: fx - fw / 2, maxX: fx + fw / 2, minZ: fz - fd / 2, maxZ: fz + fd / 2 }); }
    B(yard, 6, 3.2, 10, x - 16, 1.6, z - 6, 0xf2b707); B(yard, 6.4, 0.3, 10.4, x - 16, 3.3, z - 6, 0x333333); B(yard, 0.06, 1.2, 3, x - 12.97, 2.0, z - 6, mat(0x5a7f99, { rough: 0.2 }));
    ctx.colliders.push({ minX: x - 19, maxX: x - 13, minZ: z - 11, maxZ: z - 1 });
    B(yard, 10, 0.06, 16, x, 0.045, z + d / 2 + 7, 0x2e3135, { rough: 0.95 });   // driveway to the East Road
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshStandardMaterial({ map: livery })); sg.position.set(x, 3.4, z + d / 2 + 0.1); yard.add(sg); for (const s of [-1, 1]) B(yard, 0.2, 3.4, 0.2, x + s * 4, 1.7, z + d / 2 + 0.1, 0x333333);
    // drop-off bay, and a stack of crushed wrecks
    B(yard, 10, 0.02, 8, DROP.x, 0.08, DROP.z, 0xf2c14e); B(yard, 9.4, 0.025, 7.4, DROP.x, 0.085, DROP.z, 0x55595e);
    const wrecks = [0x8a2b2b, 0x2b4f8a, 0x4f6b3a, 0x777777, 0x8a6a2b, 0x5a3a6a];
    for (let i = 0; i < 9; i++) B(yard, 2.0, 0.55, 4.2, x + 16 + (i % 2) * 0.3, 0.3 + i * 0.56, z - 8 + (i % 3) * 0.2, wrecks[i % wrecks.length], { rough: 0.9 }).rotation.y = (i * 0.37) % 0.4;
    ctx.colliders.push({ minX: x + 14.5, maxX: x + 17.8, minZ: z - 10.5, maxZ: z - 5.5 });
    ctx.destinations?.push({ name: 'Westhaven Recovery (tow trucks)', x, z: z + d / 2 + 4 });
  }
  const parked = [];
  for (const dx of [-7, 0, 7]) { const t = makeTowTruck(); t.group.position.set(DEPOT.x + dx, 0.15, DEPOT.z - 8); t.group.rotation.y = 0; t.ai = null; parked.push(t); }

  // Nothing gets dragged or driven through a wall: the straight line between two points must be clear.
  const clear = (ax, az, bx, bz, skip = 2) => { if (!ctx.blocked) return true; const L = Math.hypot(bx - ax, bz - az); for (let d = skip; d < L - skip; d += 0.5) { const t = d / L; if (ctx.blocked(ax + (bx - ax) * t, az + (bz - az) * t, 0.45)) return false; } return true; };
  const clearSpot = (from, minR, maxR) => { for (let k = 0; k < 48; k++) { const a = k * 2.399, r = minR + (k % 4) * (maxR - minR) / 3, x = from.x + Math.cos(a) * r, z = from.z + Math.sin(a) * r; if (!ctx.blocked?.(x, z, 2) && clear(x, z, from.x, from.z, 4)) return new THREE.Vector3(x, 0.15, z); } return null; };
  // ---------- AI recovery: clear wrecks (replaces the old generic tow car) ----------
  const jobs = [];
  function dispatch(wreck) {
    if (!wreck || wreck.towDispatched || wreck.carriedBy) return;
    wreck.towDispatched = true;
    const dest = wreck.group.position.clone(), a = Math.random() * Math.PI * 2, start = clearSpot(dest, 35, 80) || dest.clone().add(new THREE.Vector3(Math.cos(a) * 70, 0, Math.sin(a) * 70));
    const t = makeTowTruck(0xf2b707, true); t.ai = null; t.noSteal = true; t.group.position.copy(start); t.group.position.y = 0.15;
    jobs.push({ t, wreck, phase: 'drive', dest, exit: null, timer: 0 });
    toast('🚛 A recovery truck is on its way to clear the wreck.');
  }

  // ---------- player-driven recovery ----------
  let breakdown = null;   // { v, marker }
  function nearbyWreck(truck) {
    const p = truck.group.position, back = new THREE.Vector3(-Math.sin(truck.group.rotation.y), 0, -Math.cos(truck.group.rotation.y));
    let best = null, bd = 11;
    const rx = p.x + back.x * 5, rz = p.z + back.z * 5;   // the end of the bed, where the winch cable runs out
    for (const v of vehicles) { if (!isWreck(v) || v === truck) continue; const d = v.group.position.distanceTo(p), w = v.group.position; if (d < bd && tmp.copy(w).sub(p).dot(back) > -1 && clear(rx, rz, w.x, w.z, 1.5)) { bd = d; best = v; } }
    return best;
  }
  const atDepot = p => Math.hypot(p.x - DROP.x, p.z - DROP.z) < DROP.r + 3;
  function action(truck, playerPos) {
    if (!truck?.isTow || truck.towState) return null;
    if (Math.abs(truck.speed || 0) > 1) return null;
    if (truck.carrying) return atDepot(truck.group.position)
      ? { label: 'Drop the wreck at the recovery yard (get paid)', action: () => startUnload(truck, true) }
      : { label: 'Unload the wreck here', action: () => startUnload(truck, false) };
    const w = nearbyWreck(truck);
    return w ? { label: 'Winch the wreck onto the truck', action: () => { startLoad(truck, w); toast('⛓️ The bed tilts back, the winch hooks on and drags the wreck up.'); } } : null;
  }
  function spawnBreakdown() {
    if (breakdown && vehicles.includes(breakdown.v)) return breakdown;
    for (let i = 0; i < 30; i++) {
      const rs = ctx.roadRects(), r = rs[Math.floor(Math.random() * rs.length)]; if (!r) break;
      const x = r.minX + 1 + Math.random() * (r.maxX - r.minX - 2), z = r.minZ + 1 + Math.random() * (r.maxZ - r.minZ - 2), dd = Math.hypot(x - DROP.x, z - DROP.z);
      if (dd < 150 || dd > 650 || !ctx.isRoad(x, z)) continue;
      const v = makeVehicle('car', [0x8a2b2b, 0x2b4f8a, 0x4f6b3a, 0x777777][Math.floor(Math.random() * 4)]);
      v.ai = null; v.disabled = true; v.health = 22; v.speed = 0; v.group.position.set(x, 0.15, z); v.group.rotation.y = (r.maxX - r.minX > r.maxZ - r.minZ) ? Math.PI / 2 : 0;
      const hz = [-1, 1].map(s => { const m = new THREE.Mesh(boxGeo, mat(0xff9900, { emissive: 0xff8800, ei: 2 }).clone()); m.scale.set(0.3, 0.15, 0.1); m.position.set(s * 0.8, 0.8, 2.25); v.group.add(m); return m; });
      v.hazards = hz; breakdown = { v, x, z };
      ctx.waypoint?.({ name: 'Broken-down car', x, z });
      toast(`📟 Call-out: a car has broken down ${Math.round(dd)} m away. Bring it back to the yard. (Waypoint set.)`);
      return breakdown;
    }
    toast('No call-outs right now. Try again in a moment.'); return null;
  }

  // ---------- per frame ----------
  let clock = 0;
  function update(dt, s) {
    clock += dt;
    // stealing a company truck
    const d = s.driving;
    if (d?.company && !d.stolenFlag && !s.employed) { d.stolenFlag = true; ctx.raiseWanted?.(50); toast('🚨 You took a Westhaven Recovery truck without permission! The scrapyard still pays cash for wrecks... but the police are looking for it.'); }
    // beacons flash on trucks that are working or carrying
    for (const t of [...parked, ...jobs.map(j => j.t)].concat(d?.isTow && !parked.includes(d) ? [d] : [])) { const on = (t.towState || t.carrying || jobs.some(j => j.t === t)) && Math.sin(clock * 9 + t.group.position.x) > 0; for (const b of t.towModel.beacons) b.material.emissiveIntensity = on ? 2.5 : 0.2; }
    for (const t of new Set([...parked, ...jobs.map(j => j.t), ...(d?.isTow ? [d] : [])])) animate(t, dt);
    if (breakdown) for (const h of breakdown.v.hazards || []) h.material.emissiveIntensity = Math.sin(clock * 6) > 0 ? 2.5 : 0.1;
    // AI trucks
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i], t = j.t, p = t.group.position;
      if (j.phase === 'drive' || j.phase === 'leave') {
        const target = j.phase === 'drive' ? j.dest : j.exit, dir = tmp.set(target.x - p.x, 0, target.z - p.z), dist = dir.length();
        const stop = j.phase === 'drive' ? 7.5 : 2;
        if (dist > stop) { dir.normalize(); p.addScaledVector(dir, Math.min(11, dist) * dt); t.speed = 9; t.group.rotation.y += Math.atan2(Math.sin(Math.atan2(dir.x, dir.z) - t.group.rotation.y), Math.cos(Math.atan2(dir.x, dir.z) - t.group.rotation.y)) * Math.min(1, dt * 4); }
        else if (j.phase === 'drive') { t.speed = 0; if (!vehicles.includes(j.wreck) && !j.wreck.carriedBy) { j.phase = 'leave'; j.exit = clearSpot(p, 60, 110) || p.clone().add(new THREE.Vector3(110, 0, 0)); } else { j.phase = 'load'; t.group.rotation.y = Math.atan2(p.x - j.dest.x, p.z - j.dest.z); startLoad(t, j.wreck); } }
        else { scene.remove(t.group); const k = vehicles.indexOf(t); if (k >= 0) vehicles.splice(k, 1); if (t.carrying) scene.remove(t.carrying.group); jobs.splice(i, 1); }
      } else if (j.phase === 'load' && !t.towState && t.carrying) { j.phase = 'leave'; const a = Math.random() * Math.PI * 2; j.exit = clearSpot(j.t.group.position, 60, 110) || j.dest.clone().add(new THREE.Vector3(Math.cos(a) * 110, 0, Math.sin(a) * 110)); toast('🚛 Wreck winched on and strapped down. The recovery truck heads back to the yard.'); }
    }
  }
  return { update, makeTowTruck, dispatch, action, startLoad, startUnload, spawnBreakdown, parked, get breakdown() { return breakdown; }, clearBreakdown() { breakdown = null; }, atDepot };
}
