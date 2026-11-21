// SOLID PROPS: everything you can see is solid to walk into.
//
// Much of the world (railings, benches, bins, planters, signs on posts, furniture, rocks, tree trunks, kiosks...)
// was drawn without an invisible wall, so you walked straight through it. This looks at every visible thing once
// the world has loaded and gives each one that stands on the ground a solid footprint, turned the same way as the
// thing itself (a bench at 30 degrees blocks at 30 degrees). They live in their own grid, so checking them each
// frame stays cheap however many there are.
//
// Left walkable on purpose: things you stand on (floors, decks, platforms, pavements: the ground is already at
// their top), low things you step over (under 45 cm), things above head height, doors (thin panels that swing),
// stairs, and anything moving (people, vehicles, trains, boats). While you sit, sleep, drive or swim nothing is
// pushed.

export function createSolidProps(THREE) {
  const CELL = 4; let grid = new Map(), list = [];
  const key = (i, k) => i * 100003 + k;
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), m4 = new THREE.Matrix4(), corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3());

  function add(o, grid, list) {   // (into the grid and list being built)
    list.push(o);
    const r = Math.hypot(o.hx, o.hz);
    for (let i = Math.floor((o.x - r) / CELL); i <= Math.floor((o.x + r) / CELL); i++) for (let k = Math.floor((o.z - r) / CELL); k <= Math.floor((o.z + r) / CELL); k++) { const kk = key(i, k); let l = grid.get(kk); if (!l) grid.set(kk, l = []); l.push(o); }
  }

  // build from the scene: opts { skip:Set<Object3D>, groundY(x,z,y), colliders, stairs:[rects], seats:[{x,z}] }
  // Built into a fresh grid and list, swapped in when complete, so the old solids keep working meanwhile.
  // build() does it all at once; buildInSlices() spreads the work over many frames (a few ms each) so play never
  // freezes while it runs.
  function build(scene, opts = {}) { const job = prepare(scene, opts); job.step(Infinity); return job.finish(); }
  function buildInSlices(scene, opts = {}, sliceMs = 4) {
    const job = prepare(scene, opts);
    return new Promise(resolve => { const tick = () => { if (job.step(sliceMs)) resolve(job.finish()); else setTimeout(tick, 0); }; tick(); });
  }
  function prepare(scene, opts) {
    const ng = new Map(), nl = [];
    const skip = opts.skip || new Set(), stairs = opts.stairs || [], seats = opts.seats || [], cols = opts.colliders || [];
    const hidden = o => { for (let p = o; p && p !== scene; p = p.parent) if (!p.visible || skip.has(p) || /hover|vehicle|door|gate leaf|person|npc|lift cab|walk-in interior/i.test(p.name || '')) return true; return false; };
    const covered = (x, z, hx, hz) => { for (const c of near(cols, x, z)) if (c.minX <= x - hx * 0.7 && c.maxX >= x + hx * 0.7 && c.minZ <= z - hz * 0.7 && c.maxZ >= z + hz * 0.7) return true; return false; };
    // the existing colliders, bucketed so "is this already solid?" is quick
    const cgrid = new Map(); for (const c of cols) { if (c.baseYAt || c.circleRadius != null) continue; for (let i = Math.floor(c.minX / 16); i <= Math.floor(c.maxX / 16); i++) for (let k = Math.floor(c.minZ / 16); k <= Math.floor(c.maxZ / 16); k++) { const kk = key(i, k); let l = cgrid.get(kk); if (!l) cgrid.set(kk, l = []); l.push(c); } }
    function near(_, x, z) { return cgrid.get(key(Math.floor(x / 16), Math.floor(z / 16))) || []; }
    const seatGrid = new Map(); for (const st of seats) { const kk = key(Math.floor(st.x / 2), Math.floor(st.z / 2)); let l = seatGrid.get(kk); if (!l) seatGrid.set(kk, l = []); l.push(st); }
    const hasSeat = (x, z, hx, hz, c, sn) => { for (let i = Math.floor((x - 3) / 2); i <= Math.floor((x + 3) / 2); i++) for (let k = Math.floor((z - 3) / 2); k <= Math.floor((z + 3) / 2); k++) for (const st of seatGrid.get(key(i, k)) || []) { const dx = st.x - x, dz = st.z - z, lx = dx * c + dz * sn, lz = -dx * sn + dz * c; if (Math.abs(lx) <= hx + 0.3 && Math.abs(lz) <= hz + 0.3) return true; } return false; };
    scene.updateMatrixWorld(true);
    let added = 0;
    const meshes = []; scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry) meshes.push(o); });
    let next = 0;
    const each = o => {
      if (!o.parent || hidden(o)) return;   // (gone, or hidden, since the list was made)
      const g = o.geometry; if (/Plane|Circle|Ring|Shape|Text/.test(g.type)) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material; if (mat && mat.transparent && mat.opacity < 0.5) return;
      if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox; if (!bb || bb.isEmpty()) return;
      const round = /Cone|Sphere|Icosahedron|Dodecahedron|Octahedron|Tetrahedron|Capsule/.test(g.type);
      if (g.type === 'TorusGeometry') return;                                      // hoops and arches you walk through
      if (g.type === 'CapsuleGeometry') return;                                     // people's limbs
      if (g.type === 'BufferGeometry' && g.attributes.color) return;                // tree crowns and bushes (the trunk is what's solid)
      const kind = g.type === 'BoxGeometry' ? 'box' : g.type === 'CylinderGeometry' ? 'cyl' : round ? 'round' : 'other';
      const one = mw => {
        mw.decompose(v, q, s);
        // the box's 8 corners in the world: its height range, and its footprint as a turned rectangle
        let minY = Infinity, maxY = -Infinity, k = 0;
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { corners[k].set(x, y, z).applyMatrix4(mw); minY = Math.min(minY, corners[k].y); maxY = Math.max(maxY, corners[k].y); k++; }
        const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(q); ax.y = 0; if (ax.lengthSq() < 1e-6) return; ax.normalize();
        const c = ax.x, sn = ax.z;   // the footprint's turn
        let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity;
        for (const p of corners) { const lx = p.x * c + p.z * sn, lz = -p.x * sn + p.z * c; lx0 = Math.min(lx0, lx); lx1 = Math.max(lx1, lx); lz0 = Math.min(lz0, lz); lz1 = Math.max(lz1, lz); }
        let hx = (lx1 - lx0) / 2, hz = (lz1 - lz0) / 2; const mlx = (lx0 + lx1) / 2, mlz = (lz0 + lz1) / 2;
        const x = mlx * c - mlz * sn, z = mlx * sn + mlz * c;
        if (round) { hx *= 0.62; hz *= 0.62; }                                       // a rock or crown is narrower than its box
        if (hx * hz * 4 > 1500 || Math.max(hx, hz) > 60) return;                       // land, lakes, whole districts
        // only shapes whose box is close to the real thing: boxes of any size, posts and trunks, small rocks and small
        // odd shapes. Big merged or curved meshes (a whole fort, a dock, a tank) have their own walls already.
        if (kind === 'cyl' && Math.max(hx, hz) > 2) return;
        if (kind === 'round' && Math.max(hx, hz) > 3) return;
        if (kind === 'other' && Math.max(hx, hz) > 1.5) return;
        if (Math.abs(x) < 0.05 && Math.abs(z) < 0.05) return;                        // parts parked at the origin (templates)
        if (hx < 0.04 || hz < 0.04) return;
        const h = maxY - minY; if (h < 0.45) return;                                 // step over it
        const gy = opts.groundY ? opts.groundY(x, z, maxY + 0.5) : 0;
        if (gy >= maxY - 0.35) return;                                               // you stand on it (a deck, a floor, a platform)
        const base = opts.groundY ? opts.groundY(x, z, minY + 0.5) : 0;             // the floor under it (upstairs too: a tenement's top floor, Skyhaven)
        if (minY > base + 1.9) return;                                                // over your head
        const thin = Math.min(hx, hz) * 2, wide = Math.max(hx, hz) * 2;
        if (thin < 0.16 && wide > 0.7 && wide < 3.2 && h > 1.7 && h < 3.6) return;   // a door (or a pair of doors)
        for (const r of stairs) if (x > r.minX - 0.5 && x < r.maxX + 0.5 && z > r.minZ - 0.5 && z < r.maxZ + 0.5) return;
        if (hasSeat(x, z, hx, hz, c, sn)) return;                                     // benches, chairs and beds you sit or lie on
        if (Math.abs(c) > 0.999 || Math.abs(sn) > 0.999 ? covered(x, z, Math.abs(c) > 0.999 ? hx : hz, Math.abs(c) > 0.999 ? hz : hx) : false) return;   // already solid
        add({ x, z, hx, hz, c, s: sn, minY, maxY, name: o.name || o.parent?.name || g.type }, ng, nl); added++;
      };
      if (o.isInstancedMesh) { for (let i = 0; i < Math.min(o.count, 6000); i++) { o.getMatrixAt(i, m4); one(m4.premultiply(o.matrixWorld)); } }
      else one(o.matrixWorld);
    };
    return {
      step(ms) { const end = performance.now() + ms; while (next < meshes.length) { each(meshes[next++]); if ((next & 31) === 0 && performance.now() > end) return false; } return true; },
      finish() { grid = ng; list = nl; return added; },
    };
  }

  // push a body at p (feet height p.y, radius r) out of anything solid around it. Returns true if it hit.
  function push(p, r) {
    let hit = false; const l = grid.get(key(Math.floor(p.x / CELL), Math.floor(p.z / CELL))); if (!l) return false;
    for (const o of l) {
      if (p.y > o.maxY - 0.35 || p.y + 1.7 < o.minY) continue;                     // on top of it, or under it
      const dx = p.x - o.x, dz = p.z - o.z, lx = dx * o.c + dz * o.s, lz = -dx * o.s + dz * o.c;
      const cx = Math.max(-o.hx, Math.min(o.hx, lx)), cz = Math.max(-o.hz, Math.min(o.hz, lz));
      let ex = lx - cx, ez = lz - cz, d2 = ex * ex + ez * ez; if (d2 >= r * r) continue;
      hit = true; let nx, nz;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; nx = ex * k; nz = ez * k; }
      else { const ox = o.hx - Math.abs(lx), oz = o.hz - Math.abs(lz); if (ox < oz) { nx = Math.sign(lx || 1) * (ox + r); nz = 0; } else { nx = 0; nz = Math.sign(lz || 1) * (oz + r); } }
      p.x += nx * o.c - nz * o.s; p.z += nx * o.s + nz * o.c;
    }
    return hit;
  }
  return { build, buildInSlices, push, get count() { return list.length; }, at(x, z) { return (grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []).filter(o => { const dx = x - o.x, dz = z - o.z, lx = dx * o.c + dz * o.s, lz = -dx * o.s + dz * o.c; return Math.abs(lx) <= o.hx && Math.abs(lz) <= o.hz; }); } };
}
