// Fences for the venues that were open on every side:
//   Ashford Stadium: a steel palisade all the way round, with a turnstile entrance and gate arch
//   Ashford Sports Courts: the chain-link fence is now solid, with a gate on the boulevard side
//   Ashford Aquatics: a glass pool fence round the lido, entered beside the changing rooms
// Each run is solid (a collider) apart from the gates.
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export function buildVenueFences(ctx) {
  const K = makeKit(ctx), { B, C, mat, solid, sign, place, stander } = K;
  const root = new THREE.Group(); ctx.scene.add(root);
  const steel = mat(0x2a2f36, { metal: 0.6, rough: 0.4 });
  // a straight fence run from (x0,z0) to (x1,z1), with optional gaps [[a,b]] measured along the run
  function run(x0, z0, x1, z1, { h = 2.4, kind = 'palisade', gaps = [] } = {}) {
    const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L;
    let a = 0;
    for (const [g0, g1] of [...gaps, [L, L]]) {
      const len = g0 - a;
      if (len > 0.2) {
        const cx = x0 + dx * (a + len / 2), cz = z0 + dz * (a + len / 2), g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = Math.atan2(-dz, dx); root.add(g);
        if (kind === 'palisade') { for (const y of [0.4, h - 0.3]) B(g, len, 0.08, 0.08, 0, y, 0, steel, false); const n = Math.floor(len / 0.18); const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, h, 0.05), steel, n + 1), o = new THREE.Object3D(); for (let i = 0; i <= n; i++) { o.position.set(-len / 2 + i * len / n, h / 2, 0); o.updateMatrix(); bars.setMatrixAt(i, o.matrix); } g.add(bars); for (let p = -len / 2; p <= len / 2 + 0.01; p += 3) B(g, 0.14, h + 0.2, 0.14, p, (h + 0.2) / 2, 0, steel, false); }
        else if (kind === 'glass') { B(g, len, h - 0.1, 0.04, 0, h / 2, 0, mat(0xbfe6ff, { opacity: 0.35, rough: 0.05 }), false); B(g, len, 0.06, 0.08, 0, h, 0, 0xc0c4c8, false); for (let p = -len / 2; p <= len / 2 + 0.01; p += 1.5) B(g, 0.06, h, 0.06, p, h / 2, 0, 0xc0c4c8, false); }
        const ax = x0 + dx * a, az = z0 + dz * a, bx = x0 + dx * g0, bz = z0 + dz * g0;
        solid(Math.min(ax, bx) - 0.12, Math.max(ax, bx) + 0.12, Math.min(az, bz) - 0.12, Math.max(az, bz) + 0.12);
      }
      a = g1;
    }
  }
  // ---------------- Ashford Stadium ----------------
  { const x0 = 98, x1 = 241, z0 = -916, z1 = -804, gate = 170, gw = 7;
    run(x0, z0, x1, z0, { h: 2.8 }); run(x0, z0, x0, z1, { h: 2.8 }); run(x1, z0, x1, z1, { h: 2.8 });
    run(x0, z1, x1, z1, { h: 2.8, gaps: [[gate - gw - x0, gate + gw - x0]] });
    // gate arch with the club colours, turnstile booths and stewards
    for (const s of [-1, 1]) { B(root, 1.4, 6, 1.4, gate + s * (gw + 0.7), 3, z1, 0xc0392b); }
    B(root, 2 * gw + 2.8, 1.6, 1.4, gate, 6.8, z1, 0xc0392b);
    { const s = sign('ASHFORD STADIUM', 'home of Ashford FC · turnstiles', 13, '#c0392b', '#ffffff', 'sans-serif'); place(s, gate, 6.8, z1 + 0.72, 0); s.scale.y = 0.42; }
    for (const s of [-1, 1]) { const bx = gate + s * 4.2; B(root, 2.2, 2.6, 2.2, bx, 1.3, z1 - 1.6, 0xe6e6e6); B(root, 2.4, 0.2, 2.4, bx, 2.7, z1 - 1.6, 0xc0392b); solid(bx - 1.1, bx + 1.1, z1 - 2.7, z1 - 0.5); for (const t of [-0.5, 0.5]) C(root, 0.05, 0.05, 1.0, gate + s * 1.5 + t, 0.5, z1 - 1, 0xc0c4c8, 6); }
    stander(gate - 2.6, z1 + 1.2, 0, { outfit: 0xffd23f, task: 'talk' }); stander(gate + 2.6, z1 + 1.2, 0, { outfit: 0xffd23f, task: 'idle' });
  }
  // ---------------- Ashford Sports Courts (fence lines already drawn by venues.js) ----------------
  { const cx = 430, cz = -830, n = cz - 27, s = cz + 15, w = cx - 46, e = cx + 46;
    for (const [x0, z0, x1, z1, gaps] of [[w, n, e, n], [w, n, w, s], [e, n, e, s], [w, s, e, s, [[46 - 3, 46 + 3]]]]) {
      const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L; let a = 0;
      for (const [g0, g1] of [...(gaps || []), [L, L]]) { if (g0 - a > 0.2) { const ax = x0 + dx * a, az = z0 + dz * a, bx = x0 + dx * g0, bz = z0 + dz * g0; solid(Math.min(ax, bx) - 0.1, Math.max(ax, bx) + 0.1, Math.min(az, bz) - 0.1, Math.max(az, bz) + 0.1); } a = g1; }
    }
    for (const sx of [-3, 3]) B(root, 0.2, 3.2, 0.2, cx + sx, 1.6, s, steel);   // gate posts
    { const sg = sign('COURTS ENTRANCE', '', 4, '#2f5d8f', '#ffffff', 'sans-serif'); place(sg, cx, 3.6, s + 0.05, 0); }
  }
  // ---------------- Ashford Aquatics: a glass pool fence ----------------
  { const x0 = 586.5, x1 = 656, z0 = -880, z1 = -818;
    run(x0, z0, x1, z0, { kind: 'glass', h: 1.3 }); run(x0, z0, x0, z1, { kind: 'glass', h: 1.3 }); run(x1, z0, x1, z1, { kind: 'glass', h: 1.3 });
    run(x0, z1, 610, z1, { kind: 'glass', h: 1.3, gaps: [[13.5, 17.5]] }); run(630, z1, x1, z1, { kind: 'glass', h: 1.3 });
    { const sg = sign('POOL ENTRANCE', 'no running · no diving in the shallow end', 4, '#1f8fd1', '#ffffff', 'sans-serif'); place(sg, 602, 2.2, z1 + 0.1, 0); C(root, 0.05, 0.05, 2.2, 600, 1.1, z1 + 0.1, 0x888888, 6); }
    stander(604, z1 - 2, Math.PI, { outfit: 0xe63946, task: 'idle' });   // lifeguard at the gate
  }
  return { update: (dt, p) => { if (Math.abs(p.x - 400) < 350 && Math.abs(p.z + 860) < 150) K.update(dt, p, 60); } };
}
