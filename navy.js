// WESTHAVEN NAVAL BASE: the navy's own base on the bay's west shore, on the flat land between Highcliff Hills and
// the coast road, well away from the beach and the port (the old dock sat right beside the sand). A fenced
// compound with a guarded main gate off the Highcliff Hills road: headquarters, barracks, a boathouse and stores,
// a parade ground with the flag, a helipad, fuel tanks and floodlights. Across the coast road a second fenced
// compound, the waterfront, with its own gate: two piers into the bay, the patrol ship at one and the submarine in
// a covered pen at the other, and a crane. Board either from its pier; bring it back there to get off.
import * as THREE from 'three';

export const NAVY_BASE = { x0: -455, x1: -338, z0: 270, z1: 480, y: 0.15, gateX: -395, quay: { x0: -325, x1: -300, z0: 268, z1: 304 } };

export function buildNavy(ctx) {
  const B0 = NAVY_BASE, Y = B0.y, crew = [];
  let rider = null;
  const mats = new Map(), M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide }); if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; } mats.set(k, m); } return mats.get(k); };
  const geo = new THREE.BoxGeometry(1, 1, 1), root = new THREE.Group(); root.name = 'naval base'; ctx.scene.add(root);
  const B = (w, h, d, x, y, z, c, solid = false) => { const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > 1.5; m.receiveShadow = true; root.add(m); if (solid) ctx.colliders?.push?.({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return m; };
  const Cy = (rt, rb, h, x, y, z, c, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c instanceof THREE.Material ? c : M(c)); m.position.set(x, y, z); m.castShadow = h > 2; root.add(m); return m; };
  const col = (x0, x1, z0, z1) => ctx.colliders?.push?.({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const navyBlue = 0x1f3a8a, white = 0xf2f2ee, concrete = 0x8f938f, steel = M(0x8a949c, { metal: 0.5, rough: 0.45 });

  // ---------------- the ground: the base's concrete, the road in, the waterfront and its piers ----------------
  const W = B0.x1 - B0.x0, D = B0.z1 - B0.z0, cx = (B0.x0 + B0.x1) / 2, cz = (B0.z0 + B0.z1) / 2, Q = B0.quay;
  const asphalt = M(0x3a3f44, { rough: 0.9 });
  B(W, 0.3, D, cx, Y - 0.15, cz, M(0x7d817e, { rough: 0.95 }));                                                     // the base
  B(10, 0.06, 18, B0.gateX, Y - 0.1, B0.z1 + 9, asphalt);                                                            // the road in from the Highcliff Hills road
  B(9, 0.03, 190, B0.gateX, Y + 0.02, cz + 10, asphalt); B(80, 0.03, 9, -378, Y + 0.02, 286, asphalt);                // roads inside: north from the gate, east to the waterfront
  for (let z = B0.z0 + 25; z < B0.z1; z += 6) B(0.2, 0.01, 3, B0.gateX, Y + 0.04, z, 0xf2f2f2);
  B(Q.x1 - Q.x0, 0.3, Q.z1 - Q.z0, (Q.x0 + Q.x1) / 2, Y - 0.15, (Q.z0 + Q.z1) / 2, concrete);                       // the waterfront (over the beach)
  B(9, 0.03, 8, -330, Y + 0.02, 286, M(0xf2f2f2, { rough: 0.6 }), false); for (let k = 0; k < 5; k++) B(9, 0.031, 0.7, -330, Y + 0.03, 282.5 + k * 1.75, asphalt);   // a crossing over the coast road
  const PIERS = [{ z: 272, len: 44 }, { z: 300, len: 44 }];
  for (const p of PIERS) { B(p.len, 1.6, 5, Q.x1 + p.len / 2, Y - 0.8, p.z, concrete); for (let x = Q.x1 + 4; x < Q.x1 + p.len; x += 6) for (const sd of [-1, 1]) Cy(0.18, 0.18, 0.5, x, Y + 0.25, p.z + sd * 2.2, 0x2a2e33, 8); }   // with bollards
  // ---------------- the fences: chain link with barbed wire ----------------
  const mesh = M(0x9aa3aa, { opacity: 0.35, rough: 0.6, side: THREE.DoubleSide }), post = M(0x5a6168, { metal: 0.4, rough: 0.5 });
  const fence = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 3)), along = Math.abs(bx - ax) > Math.abs(bz - az);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), mesh); panel.position.set((ax + bx) / 2, Y + 1.25, (az + bz) / 2); panel.rotation.y = along ? 0 : Math.PI / 2; root.add(panel);
    for (let i = 0; i <= n; i++) { const t = i / n; Cy(0.05, 0.05, 2.9, ax + (bx - ax) * t, Y + 1.45, az + (bz - az) * t, post, 6); }
    for (const dy of [2.75, 2.95]) B(along ? len : 0.03, 0.03, along ? 0.03 : len, (ax + bx) / 2, Y + dy, (az + bz) / 2, 0x5a6168);   // barbed wire
    col(Math.min(ax, bx) - 0.1, Math.max(ax, bx) + 0.1, Math.min(az, bz) - 0.1, Math.max(az, bz) + 0.1);
  };
  fence(B0.x0, B0.z0, B0.x1, B0.z0); fence(B0.x0, B0.z0, B0.x0, B0.z1);
  fence(B0.x0, B0.z1, B0.gateX - 5, B0.z1); fence(B0.gateX + 5, B0.z1, B0.x1, B0.z1);                                // the main gate (south)
  fence(B0.x1, B0.z0, B0.x1, 281); fence(B0.x1, 291, B0.x1, B0.z1);                                                   // the east gate, onto the coast road
  fence(Q.x0, Q.z0, Q.x1, Q.z0); fence(Q.x0, Q.z1, Q.x1, Q.z1); fence(Q.x0, Q.z0, Q.x0, 281); fence(Q.x0, 291, Q.x0, Q.z1);   // the waterfront: its own gate on the road side
  // ---------------- the gates: a guardhouse at the main gate, barriers at all three ----------------
  const gx = B0.gateX + 10, gz = B0.z1 - 6;
  B(4, 3, 4, gx, Y + 1.5, gz, white, true); B(4.6, 0.3, 4.6, gx, Y + 3.15, gz, navyBlue); B(4.02, 1, 2.4, gx, Y + 1.9, gz, M(0x9fd3ff, { opacity: 0.5 }));
  const barrier = (x, z, alongX) => { for (const sd of [-1, 1]) B(0.6, 1.2, 0.6, x + (alongX ? sd * 5.3 : 0), Y + 0.6, z + (alongX ? 0 : sd * 5.3), 0xc0392b, true);
    B(alongX ? 9 : 0.15, 0.15, alongX ? 0.15 : 9, x, Y + 1.1, z, 0xffffff); for (let k = 0; k < 4; k++) B(alongX ? 0.9 : 0.16, 0.16, alongX ? 0.16 : 0.9, x + (alongX ? -3.4 + k * 2.2 : 0), Y + 1.1, z + (alongX ? 0 : -3.4 + k * 2.2), 0xc0392b); };
  barrier(B0.gateX, B0.z1 + 2, true); barrier(B0.x1 + 1.5, 286, false); barrier(Q.x0 - 1.5, 286, false);
  ctx.sign?.('WESTHAVEN NAVAL BASE · AUTHORISED PERSONNEL ONLY', B0.gateX, Y + 5.5, B0.z1 + 3, 22, '#1f3a8a');
  ctx.sign?.('NAVAL WATERFRONT · NO ENTRY', -312, Y + 4.5, Q.z1 + 0.5, 16, '#1f3a8a');
  // ---------------- buildings ----------------
  const building = (x0, x1, z0, z1, h, c, roof, label) => {
    const w = x1 - x0, d = z1 - z0, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    B(w, h, d, x, Y + h / 2, z, c, true); B(w + 0.6, 0.4, d + 0.6, x, Y + h + 0.2, z, roof);
    for (let fy = 1.6; fy < h - 0.8; fy += 3.2) for (let k = 2; k < w - 1; k += 3.5) { B(1.8, 1.3, 0.06, x0 + k, Y + fy, z0 - 0.04, M(0x2a3e52, { metal: 0.4, rough: 0.2 })); B(1.8, 1.3, 0.06, x0 + k, Y + fy, z1 + 0.04, M(0x2a3e52, { metal: 0.4, rough: 0.2 })); }
    if (label) ctx.sign?.(label, x, Y + h - 1, z1 + 0.3, Math.min(w - 2, 16), '#1f3a8a');
  };
  building(-440, -410, 445, 465, 10, white, navyBlue, 'NAVAL HEADQUARTERS');
  building(-450, -410, 292, 302, 7, 0xd8d2c0, 0x4a555d, 'BARRACKS · A BLOCK'); building(-450, -410, 315, 325, 7, 0xd8d2c0, 0x4a555d, 'BARRACKS · B BLOCK');
  // the boathouse and stores: a big shed with a curved roof
  { const x = -365, z = 420; B(36, 9, 22, x, Y + 4.5, z, 0xbfc5ca, true); const r = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.2, 36.4, 20, 1, true, -Math.PI / 2, Math.PI), M(0x6f7b84, { metal: 0.4, rough: 0.5, side: THREE.DoubleSide })); r.rotation.z = Math.PI / 2; r.scale.set(1, 1, 0.35); r.position.set(x, Y + 9, z); root.add(r);
    B(14, 7, 0.1, x, Y + 3.5, z + 11.06, 0x4a555d); ctx.sign?.('BOATHOUSE AND STORES', x, Y + 8.2, z + 11.2, 14, '#1f3a8a'); }
  // the parade ground with the flag, and sailors drilling
  B(40, 0.02, 34, -425, Y + 0.03, 385, M(0x5a5f63, { rough: 0.9 })); for (const [w, d, x, z] of [[40, 0.3, -425, 368.2], [40, 0.3, -425, 401.8], [0.3, 34, -445, 385], [0.3, 34, -405, 385]]) B(w, 0.01, d, x, Y + 0.05, z, 0xf2f2f2);
  Cy(0.12, 0.15, 14, -425, Y + 7, 385, 0xdddddd, 8);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.9), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: typeof document === 'undefined' ? null : (() => { const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#1f3a8a'; g.fillRect(0, 0, 40, 30); g.fillStyle = '#c0392b'; g.fillRect(0, 30, 96, 8); g.fillRect(44, 0, 8, 64); return new THREE.CanvasTexture(c); })() }));
  flag.position.set(-423.4, Y + 13, 385); root.add(flag);
  // a helipad, fuel tanks, a crane at the waterfront, floodlights
  B(18, 0.03, 18, -360, Y + 0.03, 455, M(0x3a3f44)); const hRing = new THREE.Mesh(new THREE.RingGeometry(6.5, 7, 40), M(0xffd23f)); hRing.rotation.x = -Math.PI / 2; hRing.position.set(-360, Y + 0.05, 455); root.add(hRing);
  for (const [w, d, x, z] of [[1, 6, -362.5, 455], [1, 6, -357.5, 455], [4, 1, -360, 455]]) B(w, 0.01, d, x, Y + 0.06, z, 0xffffff);
  for (const x of [-445, -433]) { Cy(4, 4, 7, x, Y + 3.5, 345, 0xd8dcde, 24); col(x - 4, x + 4, 341, 349); }
  { const x = -303, z = 286; for (const [a, b] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) B(0.4, 16, 0.4, x + a, Y + 8, z + b, 0xd4a017); B(3, 0.8, 3, x, Y + 16.4, z, 0xd4a017); B(22, 0.8, 1.2, x + 8, Y + 17, z, 0xd4a017); B(2.4, 1.6, 2.4, x - 3, Y + 17.4, z, 0x4a555d); col(x - 1.5, x + 1.5, z - 1.5, z + 1.5); }
  for (const [x, z] of [[-452, 273], [-341, 273], [-452, 477], [-341, 477], [-395, 385], [-312, 300]]) { Cy(0.12, 0.16, 12, x, Y + 6, z, 0x5a6168, 8); B(1.4, 0.5, 0.8, x, Y + 12.2, z, M(0xffffff, { emissive: 0xfff3d6, ei: 1.2 })); }
  // the submarine pen: a curved roof on columns over the submarine's berth
  { const x = Q.x1 + 22, z = PIERS[1].z + 10; const pen = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 42, 24, 1, true, -Math.PI / 2, Math.PI), M(0x5f6f78, { metal: 0.4, rough: 0.5, side: THREE.DoubleSide })); pen.rotation.z = Math.PI / 2; pen.scale.set(1, 1, 0.5); pen.position.set(x, 9, z); root.add(pen);
    for (let k = -2; k <= 2; k++) for (const sd of [-1, 1]) Cy(0.35, 0.35, 10, x + k * 9.5, 4, z + sd * 6.4, 0x4a555d, 8);
    ctx.sign?.('SUBMARINE PEN · RESTRICTED', x, 10, z - 6.6, 12, '#1f3a8a'); }
  ctx.destinations?.push({ name: 'Westhaven Naval Base', x: B0.gateX, z: B0.z1 + 10 });
  ctx.interactables.push({ pos: new THREE.Vector3(gx - 3, Y, gz + 2), r: 2.5, label: 'Talk to the gate guard', action: () => ctx.toast('🪖 "Westhaven Naval Base. The patrol ship berths at the first pier and the submarine in the pen at the second. Go aboard from the end of the pier."') });
  ctx.interactables.push({ pos: new THREE.Vector3(-425, Y, 467.5), r: 3, label: 'Report to Naval Headquarters', action: () => ctx.toast('⚓ "Reporting for duty? Take the patrol ship or the sub out from the piers; bring them back to the same pier when you\'re done."') });

  // ---------------- the vessels ----------------
  function vessel(name, x, z, sub, heading) {
    const g = new THREE.Group(); ctx.scene.add(g); g.position.set(x, 0, z); g.rotation.y = heading;
    const mat = new THREE.MeshStandardMaterial({ color: sub ? 0x263e48 : 0x7c909a, metalness: 0.45, roughness: 0.4 });
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat); hull.scale.set(sub ? 3 : 4, sub ? 2 : 2.5, sub ? 13 : 18); g.add(hull);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(sub ? 3 : 6, sub ? 3 : 4, sub ? 4 : 7), mat); tower.position.set(0, sub ? 2 : 3, -2); g.add(tower);
    return { name, g, sub, heading, speed: 0, depth: 0, home: new THREE.Vector3(x, 0, z), homeHeading: heading, length: sub ? 26 : 36, width: sub ? 6 : 8 };
  }
  // berthed alongside their piers, bows out to sea (east)
  const vessels = [vessel('Patrol ship', Q.x1 + 22, PIERS[0].z - 8.5, false, Math.PI / 2), vessel('Submarine', Q.x1 + 22, PIERS[1].z + 10, true, Math.PI / 2)];
  const boardAt = [new THREE.Vector3(Q.x1 + 24, Y + 0.3, PIERS[0].z - 1.5), new THREE.Vector3(Q.x1 + 24, Y + 0.3, PIERS[1].z + 1.5)];
  ctx.box(560, 0.4, 680, 0, -20, 500, 0x426664, false);   // the bay's sea floor
  const fish = []; for (let i = 0; i < 22; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x97bdb0 : 0x91a6c7 })); f.scale.set(1.7, 0.6, 0.6); f.position.set(-290 + i * 3, -7 - i % 4, 240 + i % 5 * 20); ctx.scene.add(f); fish.push(f); }
  for (let i = 0; i < 8; i++) { const h = ctx.makePerson({ outfit: 0xd0dbe0, hair: 0x382c23, pants: 0x243d59 }); h.root.position.set(-437 + (i % 4) * 3, Y + 0.05, 377 + Math.floor(i / 4) * 3); h.root.rotation.y = -Math.PI / 2; crew.push(h); }   // drilling on the parade ground
  vessels.forEach((v, i) => ctx.interactables.push({ pos: boardAt[i].clone(), r: 3, label: 'Board navy ' + v.name.toLowerCase(), action: () => { if (!ctx.canBoard()) return; rider = v; ctx.prepare(); ctx.toast(v.sub ? 'Submarine: movement controls steer, Space surfaces, Shift dives. Bring it back to its pier to get off.' : 'Naval patrol ship: use movement controls. Bring it back to its pier to get off.'); } }));
  function leave() {
    if (!rider) return;
    if (rider.g.position.distanceTo(rider.home) > 30 || rider.depth > 1) { ctx.toast('Surface and bring the vessel back to its pier at the naval base before disembarking.'); return; }
    const i = vessels.indexOf(rider); rider.speed = 0; rider = null; ctx.move(boardAt[i].clone());
  }
  const OLD = new THREE.Vector3(-235, 0, 280);   // where the vessels used to berth (old saves): they come home instead
  return {
    vessels, get rider() { return rider; }, leave, base: B0,
    snapshot() { return { rider: rider?.name, vessels: vessels.map(v => ({ name: v.name, position: v.g.position.toArray(), heading: v.heading, depth: v.depth })) }; },
    restore(s) { if (!s) return; for (const record of s.vessels || []) { const v = vessels.find(v => v.name === record.name); if (!v) continue; const p = new THREE.Vector3().fromArray(record.position); if (p.distanceTo(OLD) < 80) continue; v.g.position.copy(p); v.heading = record.heading || 0; v.depth = record.depth || 0; v.g.rotation.y = v.heading; } rider = vessels.find(v => v.name === s.rider) || null; },
    reset() { rider = null; },
    // you walk on the platform, the road in and the piers
    groundAt(x, z) {
      if (x >= B0.x0 && x <= B0.x1 && z >= B0.z0 && z <= B0.z1) return Y;
      if (x >= Q.x0 && x <= Q.x1 && z >= Q.z0 && z <= Q.z1) return Y;
      for (const p of PIERS) if (x > Q.x1 && x <= Q.x1 + p.len && Math.abs(z - p.z) <= 2.5) return Y;
      return null;
    },
    update(dt) {
      for (const h of crew) ctx.animatePerson(h, false, dt);
      if (!rider) return;
      const v = rider, input = ctx.input(), start = v.g.position.clone();
      v.heading += (input.left - input.right) * 0.65 * dt; v.speed += (input.forward * 8 - input.back * 10) * dt; v.speed *= Math.exp(-0.5 * dt); v.speed = THREE.MathUtils.clamp(v.speed, -4, v.sub ? 16 : 12);
      const next = start.clone().add(new THREE.Vector3(Math.sin(v.heading) * v.speed * dt, 0, Math.cos(v.heading) * v.speed * dt));
      if (ctx.water(next.x, next.z, v.heading, v.length, v.width) && ctx.clearPassage(v, next)) v.g.position.copy(next); else v.speed = 0;
      if (v.sub) v.depth = THREE.MathUtils.clamp(v.depth + (input.dive - input.surface) * 3 * dt, 0, 12);
      v.g.position.y = -v.depth; v.g.rotation.y = v.heading; ctx.carry(v.g.position.clone().add(new THREE.Vector3(0, 2, 0)));
    },
  };
}
