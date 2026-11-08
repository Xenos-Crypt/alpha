// Small building kit shared by the leisure places (Ventura, the Recreation Centre, the Grand Park):
// cached materials, boxes and cylinders, signs, colliders, walk-in halls with a roof the camera stays
// under, people (adults and children) who stand, sit, play or walk loops, and simple wandering animals.
import * as THREE from 'three';

export function makeKit(ctx) {
  const { scene, colliders, camBlockers, makeTex } = ctx;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide }); if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; } mats.set(k, m); } return mats.get(k); };
  const M = c => c instanceof THREE.Material ? c : mat(c);
  const B = (p, w, h, d, x, y, z, c, shadow = true) => { const m = new THREE.Mesh(boxGeo, M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = shadow && (h > 0.6 || w > 2); m.receiveShadow = true; p.add(m); return m; };
  const C = (p, rt, rb, h, x, y, z, c, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)); m.position.set(x, y, z); m.castShadow = h > 0.8; m.receiveShadow = true; p.add(m); return m; };
  const S = (p, r, x, y, z, c, seg = 12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), M(c)); m.position.set(x, y, z); m.castShadow = r > 0.3; p.add(m); return m; };
  const solid = (x0, x1, z0, z1) => { const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }; colliders.push(c); return c; };
  const circle = (x, z, r) => colliders.push({ circleX: x, circleZ: z, circleRadius: r, minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
  const sign = (text, sub, w, bg = '#123a4f', fg = '#ffffff', font = 'Georgia, serif') => { const t = makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = `bold ${sub ? 46 : 58}px ${font}`; g.textAlign = 'center'; g.fillText(text, 256, sub ? 58 : 82, 490); if (sub) { g.font = `italic 26px ${font}`; g.globalAlpha = 0.9; g.fillText(sub, 256, 104, 490); } }); return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); };
  const place = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const spot = (x, z, r, label, action, extra = {}) => { const it = { pos: new THREE.Vector3(x, 0, z), r, action, ...extra }; if (typeof label === 'function') Object.defineProperty(it, 'label', { get: label, enumerable: true }); else it.label = label; ctx.interactables.push(it); return it; };

  // A walk-in hall: walls with doorways (gaps on any side), a flat roof the camera won't go through,
  // a patterned floor. gaps: { s: [[x0,x1]], n: [...], w: [[z0,z1]], e: [...] }
  function hall({ x0, x1, z0, z1, H, wall = 0xe8e4dc, floor = 0x9aa3ad, floorKind = 'tiles', roof = 0x5b6167, gaps = {} }) {
    const g = new THREE.Group(); scene.add(g); const wm = mat(wall, { rough: 0.9 });
    const runX = (z, list, front) => { let a = x0; for (const [g0, g1] of [...(list || []), [x1, x1]]) { if (g0 - a > 0.05) { const w = B(g, g0 - a, H, 0.3, (a + g0) / 2, H / 2, z, front ? wm : wm); camBlockers?.push(w); solid(a, g0, z - 0.15, z + 0.15); } if (g1 > g0) { B(g, g1 - g0, H - 3.2, 0.3, (g0 + g1) / 2, (H + 3.2) / 2, z, wm); } a = g1; } };
    const runZ = (x, list) => { let a = z0; for (const [g0, g1] of [...(list || []), [z1, z1]]) { if (g0 - a > 0.05) { const w = B(g, 0.3, H, g0 - a, x, H / 2, (a + g0) / 2, wm); camBlockers?.push(w); solid(x - 0.15, x + 0.15, a, g0); } if (g1 > g0) B(g, 0.3, H - 3.2, g1 - g0, x, (H + 3.2) / 2, (g0 + g1) / 2, wm); a = g1; } };
    runX(z0, gaps.n); runX(z1, gaps.s, true); runZ(x0, gaps.w); runZ(x1, gaps.e);
    const r = B(g, x1 - x0 + 1, 0.5, z1 - z0 + 1, (x0 + x1) / 2, H + 0.25, (z0 + z1) / 2, roof); camBlockers?.push(r);
    // ceiling light panels (glowing, no real lights: cheap) and a pale ceiling under the roof
    B(g, x1 - x0 - 0.4, 0.05, z1 - z0 - 0.4, (x0 + x1) / 2, H - 0.03, (z0 + z1) / 2, mat(0xe9edf1, { emissive: 0x8a9098, ei: 0.6 }), false);
    const lp = mat(0xffffff, { emissive: 0xfff6e0, ei: 1.2 }); for (let x = x0 + 5; x < x1 - 2; x += 10) for (let z = z0 + 5; z < z1 - 2; z += 8) B(g, 3, 0.06, 0.8, x, H - 0.08, z, lp, false);
    const fm = ctx.floorMaterial ? ctx.floorMaterial(makeTex, floorKind, floor, x1 - x0, z1 - z0) : mat(floor);
    B(g, x1 - x0 - 0.3, 0.06, z1 - z0 - 0.3, (x0 + x1) / 2, 0.03, (z0 + z1) / 2, fm, false);
    ctx.planeBlocks?.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, top: H + 1 });
    return g;
  }

  // ---------------- people ----------------
  const OUT = [0xc0392b, 0x2980b9, 0x8e44ad, 0x16a085, 0xf39c12, 0x2c3e50, 0xe84393, 0x27ae60, 0xd35400, 0x1abc9c];
  const KID = [0xff6b9d, 0x4dabf7, 0xffd43b, 0x69db7c, 0xff922b, 0xb197fc];
  const SKIN = [0x8d5a3b, 0x6b4430, 0xd9a07a, 0xffdcc0, 0x5a3a28, 0xf0c8a0, 0x7a4a30];
  const HAIR = [0x111111, 0x2b1d14, 0x1a1a1a, 0x5a3b22, 0xc9a26a];
  let pid = 0;
  const person = (x, z, yaw = 0, o = {}) => { if (!ctx.makePerson) return null; const i = pid++; const h = ctx.makePerson({ child: !!o.child, outfit: o.outfit ?? (o.child ? KID : OUT)[i % (o.child ? KID.length : OUT.length)], hair: HAIR[(i * 3) % HAIR.length], skin: SKIN[(i * 5) % SKIN.length], pants: o.pants ?? [0x2d3142, 0x1f3a5a, 0x4a3a2a, 0x222222][i % 4] }); h.root.position.set(x, o.y ?? 0.05, z); h.root.rotation.y = yaw; return h; };
  const actors = [];   // { h, kind, ... } animated by update()
  const stander = (x, z, yaw, o = {}) => { const h = person(x, z, yaw, o); if (h) actors.push({ h, kind: o.task || 'idle', ph: Math.random() * 6, x, z, y: o.y ?? 0.05 }); return h; };
  const sitter = (x, z, yaw, seatY, o = {}) => { const h = person(x, z, yaw, { ...o, y: seatY - 0.5 }); if (h) actors.push({ h, kind: 'sit', ph: Math.random() * 6, task: o.task }); return h; };
  // walk a closed loop of points at a speed, optionally with a child following
  const walker = (pts, o = {}) => { const h = person(pts[0][0], pts[0][1], 0, o); if (!h) return null; const segs = pts.map((a, i) => { const b = pts[(i + 1) % pts.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); }); const a = { h, kind: 'walk', pts, segs, total: segs.reduce((x, y) => x + y, 0), t: o.t ?? Math.random() * 100, speed: o.speed ?? 1.2, off: o.off ?? 0 }; actors.push(a); return a; };
  const family = (pts, o = {}) => { const t = o.t ?? Math.random() * 200; walker(pts, { t, speed: o.speed ?? 1.1, off: 0.4 }); if (o.partner !== false) walker(pts, { t: t - 0.2, speed: o.speed ?? 1.1, off: -0.5 }); const n = o.kids ?? 1; for (let k = 0; k < n; k++) walker(pts, { child: true, t: t - 1.2 - k * 0.8, speed: o.speed ?? 1.1, off: 0.9 - k * 0.6 }); };
  // ---------------- animals ----------------
  const animals = [];
  const legAt = (g, x, z, len, c, r = 0.07) => { const piv = new THREE.Group(); piv.position.set(x, len, z); g.add(piv); const l = C(piv, r, r * 0.8, len, 0, -len / 2, 0, c, 6); l.castShadow = false; return piv; };
  function animal(kind, x, z, area, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const legs = []; let speed = 0.8, head = null, s = o.scale ?? 1;
    const body = (w, h, d, y, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), M(c)); m.scale.set(w, h, d); m.position.y = y; m.castShadow = true; g.add(m); return m; };
    if (kind === 'giraffe') { const c = mat(0xffffff, { map: ctx.giraffeTex ||= makeTex(64, 64, t => { t.fillStyle = '#e8b04a'; t.fillRect(0, 0, 64, 64); t.fillStyle = '#8a4a1a'; for (let i = 0; i < 14; i++) { t.beginPath(); t.arc((i * 37) % 64, (i * 23) % 64, 6 + (i % 3) * 2, 0, 7); t.fill(); } }) });
      body(1.2, 1.0, 2.0, 2.4, c); for (const [lx, lz] of [[-0.35, 0.7], [0.35, 0.7], [-0.35, -0.7], [0.35, -0.7]]) legs.push(legAt(g, lx, lz, 2.0, c, 0.08));
      const neck = C(g, 0.16, 0.28, 2.6, 0, 3.7, 0.95, c, 8); neck.rotation.x = 0.35; head = new THREE.Group(); head.position.set(0, 5.0, 1.45); g.add(head); B(head, 0.3, 0.3, 0.7, 0, 0, 0.15, c); for (const sx of [-0.1, 0.1]) C(head, 0.03, 0.03, 0.3, sx, 0.25, -0.1, 0x5a3a1a, 5); speed = 0.9; }
    else if (kind === 'zebra') { const c = mat(0xffffff, { map: ctx.zebraTex ||= (() => { const t = makeTex(64, 64, q => { q.fillStyle = '#f4f4f4'; q.fillRect(0, 0, 64, 64); q.fillStyle = '#111'; for (let i = 0; i < 8; i++) q.fillRect(i * 8, 0, 4, 64); }); return t; })() });
      body(0.8, 0.8, 1.6, 1.2, c); for (const [lx, lz] of [[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.55], [0.25, -0.55]]) legs.push(legAt(g, lx, lz, 0.9, c, 0.06));
      const neck = C(g, 0.14, 0.2, 0.8, 0, 1.65, 0.85, c, 8); neck.rotation.x = 0.6; head = new THREE.Group(); head.position.set(0, 1.95, 1.15); g.add(head); B(head, 0.24, 0.26, 0.6, 0, -0.05, 0.15, c); B(head, 0.06, 0.25, 0.5, 0, 0.18, -0.1, 0x111111); speed = 1.2; }
    else if (kind === 'elephant') { const c = mat(0x8e8f94, { rough: 0.95 });
      body(2.0, 1.8, 3.0, 2.3, c); for (const [lx, lz] of [[-0.6, 1.0], [0.6, 1.0], [-0.6, -1.0], [0.6, -1.0]]) legs.push(legAt(g, lx, lz, 1.6, c, 0.3));
      head = new THREE.Group(); head.position.set(0, 2.9, 1.7); g.add(head); S(head, 0.75, 0, 0, 0, c, 14); const trunk = C(head, 0.12, 0.22, 1.7, 0, -0.95, 0.55, c, 8); trunk.rotation.x = -0.2;
      for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CircleGeometry(0.75, 14), mat(0x7f8085, { side: THREE.DoubleSide })); ear.position.set(sx * 0.65, 0.1, -0.15); ear.rotation.y = sx * 1.2; head.add(ear); const tusk = C(head, 0.05, 0.08, 0.7, sx * 0.3, -0.55, 0.55, 0xf4efe0, 6); tusk.rotation.x = -0.9; } speed = 0.6; s *= 1.1; }
    else if (kind === 'lion') { const c = mat(0xd1a052); body(0.8, 0.8, 1.7, 0.95, c); for (const [lx, lz] of [[-0.25, 0.6], [0.25, 0.6], [-0.25, -0.6], [0.25, -0.6]]) legs.push(legAt(g, lx, lz, 0.75, c, 0.08));
      head = new THREE.Group(); head.position.set(0, 1.35, 0.95); g.add(head); if (!o.female) S(head, 0.48, 0, 0, -0.08, 0x7a4a1a, 12); S(head, 0.3, 0, 0, 0.1, c, 12); const tail = C(g, 0.03, 0.03, 0.9, 0, 0.95, -1.15, c, 5); tail.rotation.x = 0.9; speed = 1.0; }
    else if (kind === 'ostrich') { const c = mat(0x2a2a2a); body(0.8, 0.7, 1.0, 1.5, c); S(g, 0.32, 0, 1.6, -0.45, 0xf2f2f2, 8); for (const lx of [-0.15, 0.15]) legs.push(legAt(g, lx, 0, 1.2, 0xd9b090, 0.04));
      C(g, 0.05, 0.07, 1.2, 0, 2.3, 0.35, 0xd9b090, 6).rotation.x = 0.2; head = new THREE.Group(); head.position.set(0, 2.9, 0.45); g.add(head); S(head, 0.12, 0, 0, 0, 0xd9b090, 8); B(head, 0.06, 0.05, 0.18, 0, -0.03, 0.12, 0xe8a060); speed = 1.6; }
    else if (kind === 'flamingo') { const c = mat(0xff8fb1); body(0.35, 0.3, 0.55, 1.05, c); legs.push(legAt(g, 0, 0, 0.95, 0xff6f9a, 0.02)); C(g, 0.025, 0.03, 0.55, 0, 1.4, 0.18, c, 5).rotation.x = -0.3; head = new THREE.Group(); head.position.set(0, 1.7, 0.25); g.add(head); S(head, 0.07, 0, 0, 0, c, 8); B(head, 0.04, 0.04, 0.12, 0, -0.03, 0.08, 0x222222); speed = 0.5; }
    else if (kind === 'peacock') { const c = mat(0x1f6fd1, { rough: 0.4 }); body(0.35, 0.35, 0.55, 0.45, c); for (const lx of [-0.07, 0.07]) legs.push(legAt(g, lx, 0, 0.3, 0x8a7a6a, 0.015));
      const fan = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18, 0, Math.PI), mat(0xffffff, { side: THREE.DoubleSide, map: ctx.peaTex ||= makeTex(64, 32, t => { t.fillStyle = '#1e7d4a'; t.fillRect(0, 0, 64, 32); for (let i = 0; i < 12; i++) { t.fillStyle = '#2bb3c0'; t.beginPath(); t.arc(6 + i * 5, 6 + (i % 3) * 8, 3, 0, 7); t.fill(); t.fillStyle = '#1a2a6a'; t.beginPath(); t.arc(6 + i * 5, 6 + (i % 3) * 8, 1.4, 0, 7); t.fill(); } }) }));
      fan.position.set(0, 0.55, -0.3); fan.rotation.x = -0.25; g.add(fan); head = new THREE.Group(); head.position.set(0, 0.85, 0.25); g.add(head); S(head, 0.08, 0, 0, 0, c, 8); speed = 0.5; }
    else if (kind === 'monkey') { const c = mat(0x6b4a2a); body(0.35, 0.45, 0.35, 0.55, c); for (const [lx, lz] of [[-0.12, 0.1], [0.12, 0.1], [-0.12, -0.1], [0.12, -0.1]]) legs.push(legAt(g, lx, lz, 0.35, c, 0.04)); head = new THREE.Group(); head.position.set(0, 0.95, 0.05); g.add(head); S(head, 0.17, 0, 0, 0, c, 10); S(head, 0.1, 0, -0.03, 0.12, 0xd9b090, 8); const tail = C(g, 0.02, 0.02, 0.7, 0, 0.6, -0.35, c, 5); tail.rotation.x = -0.8; speed = 1.4; }
    else if (kind === 'tortoise') { body(0.9, 0.5, 1.1, 0.3, mat(0x6b5a3a, { rough: 0.95 })); head = new THREE.Group(); head.position.set(0, 0.25, 0.6); g.add(head); S(head, 0.12, 0, 0, 0, 0x8a8a5a, 8); speed = 0.12; }
    else if (kind === 'duck' || kind === 'swan') { const sw = kind === 'swan'; const c = mat(sw ? 0xffffff : 0x8a6a4a); body(sw ? 0.5 : 0.3, sw ? 0.35 : 0.22, sw ? 0.8 : 0.45, 0.12, c); head = new THREE.Group(); head.position.set(0, sw ? 0.6 : 0.3, sw ? 0.35 : 0.2); g.add(head); if (sw) C(g, 0.04, 0.05, 0.55, 0, 0.35, 0.3, c, 6); S(head, sw ? 0.09 : 0.09, 0, 0, 0, sw ? c : 0x1e6b3a, 8); B(head, 0.05, 0.04, 0.12, 0, -0.02, 0.1, 0xf2a03a); speed = 0.4; }
    g.scale.setScalar(s);
    const a = { g, legs, head, kind, area, speed: speed * (o.speedMul ?? 1), tx: x, tz: z, wait: Math.random() * 4, ph: Math.random() * 6, swim: o.swim };
    animals.push(a); return a;
  }
  // ---------------- update ----------------
  let clock = 0;
  function update(dt, p, range = 140) {
    clock += dt;
    for (const a of actors) {
      const h = a.h, near = Math.abs(h.root.position.x - p.x) < range && Math.abs(h.root.position.z - p.z) < range;
      if (a.kind === 'walk') { a.t += dt * a.speed; if (!near) continue; let d = ((a.t % a.total) + a.total) % a.total, i = 0; while (d > a.segs[i]) { d -= a.segs[i]; i++; }
        const A = a.pts[i], Bp = a.pts[(i + 1) % a.pts.length], u = d / a.segs[i], dx = (Bp[0] - A[0]) / a.segs[i], dz = (Bp[1] - A[1]) / a.segs[i];
        h.root.position.set(A[0] + (Bp[0] - A[0]) * u - dz * a.off, 0.05, A[1] + (Bp[1] - A[1]) * u + dx * a.off); h.root.rotation.y = Math.atan2(dx, dz); ctx.animatePerson?.(h, true, dt); continue; }
      if (!near) continue;
      const t = clock + a.ph, { armL, armR } = h;
      if (a.kind === 'sit') { ctx.pose?.(h, 'sit', dt); if (a.task === 'eat' && armR) armR.pivot.rotation.x = -1.2 + Math.sin(t * 2) * 0.35; if (a.task === 'talk' && armR) armR.pivot.rotation.x = -0.6 + Math.sin(t * 2.4) * 0.3; }
      else if (a.kind === 'swing' && armR) { armR.pivot.rotation.x = -0.4 - Math.max(0, Math.sin(t * 3.2)) * 2.0; armL.pivot.rotation.x = -0.3; h.root.rotation.y += Math.sin(t * 0.5) * 0.004; }
      else if (a.kind === 'cheer' && armR) { armL.pivot.rotation.x = armR.pivot.rotation.x = -2.6 + Math.sin(t * 5) * 0.4; h.root.position.y = a.y + Math.abs(Math.sin(t * 5)) * 0.12; }
      else if (a.kind === 'bounce') { h.root.position.y = a.y + Math.abs(Math.sin(t * 2.6)) * 1.4; if (armR) { armL.pivot.rotation.x = armR.pivot.rotation.x = -2.2 - Math.sin(t * 5.2) * 0.5; } }
      else if (a.kind === 'dance' && armR) { h.root.position.y = a.y + Math.abs(Math.sin(t * 4.4)) * 0.1; armL.pivot.rotation.x = -2.4 + Math.sin(t * 4.4) * 0.6; armR.pivot.rotation.x = -2.4 - Math.sin(t * 4.4) * 0.6; h.root.rotation.y += dt * 0.5; }
      else if (a.kind === 'drum' && armR) { armL.pivot.rotation.x = -1.0 + Math.max(0, Math.sin(t * 7)) * 0.5; armR.pivot.rotation.x = -1.0 + Math.max(0, Math.sin(t * 7 + 1.6)) * 0.5; }
      else if (a.kind === 'cook' && armR) { armR.pivot.rotation.x = -1.1 + Math.sin(t * 6) * 0.35; armL.pivot.rotation.x = -0.9; }
      else if (a.kind === 'jog') ctx.animatePerson?.(h, true, dt);
      else if (a.kind === 'talk' && armR) { armR.pivot.rotation.x = -0.4 + Math.sin(t * 2.2) * 0.35; }
      else ctx.animatePerson?.(h, false, dt);
    }
    for (const a of animals) {
      const g = a.g; if (Math.abs(g.position.x - p.x) > range || Math.abs(g.position.z - p.z) > range) continue;
      const dx = a.tx - g.position.x, dz = a.tz - g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { a.wait -= dt; if (a.wait <= 0) { const A = a.area; a.tx = A.x0 + Math.random() * (A.x1 - A.x0); a.tz = A.z0 + Math.random() * (A.z1 - A.z0); a.wait = 2 + Math.random() * 6; } }
      const moving = d >= 0.4;
      if (moving) { const st = Math.min(d, a.speed * dt); g.position.x += dx / d * st; g.position.z += dz / d * st; const want = Math.atan2(dx, dz); let dr = want - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * Math.min(1, dt * 3); }
      a.ph += dt * (moving ? a.speed * 4 : 0.6); a.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(a.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.45 : 0; });
      if (a.head) a.head.rotation.x = moving ? Math.sin(a.ph * 0.5) * 0.08 : Math.sin(clock * 0.8 + a.ph) * 0.15 + (a.kind === 'giraffe' || a.kind === 'zebra' ? 0.25 : 0);
      if (a.swim) g.position.y = Math.sin(clock * 2 + a.ph) * 0.03;
    }
  }
  return { mat, B, C, S, solid, circle, sign, place, spot, hall, person, stander, sitter, walker, family, animal, actors, animals, update, boxGeo };
}
