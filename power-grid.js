// The Aegis power grid. The Aegis Prime Generator in the Capital feeds every dungeon
// gate and the dungeon arena through cables that run underground, through the sewers.
//
// * Every dungeon gate gets an open manhole beside it, with glowing power cables
//   climbing out of it and running to the gate (added and removed as gates come and go).
// * Three manholes beside the Prime Generator take its heavy feed cables underground.
// * In the sewers, cable trays run along every tunnel to a grid junction in the
//   central chamber.
// * In the dungeon arena, conduits run round the walls to a power feed by the exit.
// The cables pulse with energy. Press E at a manhole or junction to read about it.
import * as THREE from 'three';

export function buildPowerGrid({ scene, gates, interactables, toast, groundY, makeTex, sewerOrigin = -8000, dungeon = { x: 2000, z: 0 }, prime = { x: 260, z: 702 } }) {
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x0d2230, emissive: 0x56c8ff, emissiveIntensity: 1.4, roughness: 0.4, metalness: 0.3 });
  const sheathMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.7 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3c3f, roughness: 0.6, metalness: 0.6 });
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
  const cageMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b, wireframe: true });
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.35 });
  const haloMat = new THREE.SpriteMaterial({ map: makeTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,180,0.9)'); gr.addColorStop(1, 'rgba(255,236,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const coverTex = makeTex(128, 128, g => { g.fillStyle = '#4a4c4f'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#2f3134'; g.lineWidth = 6; for (let i = 10; i < 128; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } });
  const coverMat = new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.6, metalness: 0.5 });
  const gy = (x, z) => { const y = groundY(x, z); return Number.isFinite(y) ? y : 0; };
  const tube = (points, r, parent = scene, material = cableMat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, r, 6), material); parent.add(m); return m; };
  const sign = (text, w = 3) => { const map = makeTex(512, 96, g => { g.fillStyle = '#0e3550'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#9fe8ff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 48, 490); }); return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide })); };

  // An open manhole at (x, z) with cables climbing out toward `to` (a point on the ground).
  function manhole(x, z, to, { cables = 3, r = 0.07, label, text } = {}) {
    const g = new THREE.Group(), y = gy(x, z); g.position.set(x, y, z); scene.add(g);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 20, 1, true), ironMat); ring.position.y = 0.04; g.add(ring);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.66, 20), holeMat); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.03; g.add(hole);
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 20), coverMat); cover.position.set(0.95, 0.06, 0.55); cover.rotation.z = 0.08; g.add(cover);   // slid aside
    if (to) {
      const dx = to.x - x, dz = to.z - z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, px = -uz, pz = ux;
      for (let i = 0; i < cables; i++) {
        const off = (i - (cables - 1) / 2) * 0.22;
        const pts = [new THREE.Vector3(px * off * 0.6, -0.6, pz * off * 0.6), new THREE.Vector3(px * off, 0.28, pz * off), new THREE.Vector3(ux * 1.2 + px * off, 0.12, uz * 1.2 + pz * off)];
        const steps = Math.max(2, Math.floor(d / 2.5));
        for (let k = 1; k <= steps; k++) { const t = k / steps; pts.push(new THREE.Vector3(dx * t + px * (off + Math.sin(k * 1.7 + i) * 0.12), 0.08, dz * t + pz * (off + Math.sin(k * 1.7 + i) * 0.12))); }
        tube(pts, r, g);
      }
    }
    // Work lights that are always on: a caged bulb on a post and a lamp glowing down the shaft.
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), ironMat); post.position.set(-0.85, 0.65, 0.45); g.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bulbMat); bulb.position.set(-0.85, 1.36, 0.45); g.add(bulb);
    const cage = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), cageMat); cage.position.copy(bulb.position); g.add(cage);
    const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(1.6); halo.position.copy(bulb.position); g.add(halo);
    const shaftGlow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), shaftMat); shaftGlow.rotation.x = -Math.PI / 2; shaftGlow.position.y = 0.035; g.add(shaftGlow);
    for (const [cx, cz] of [[-0.9, -0.6], [0.2, -1.0]]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0xff6a00 })); cone.position.set(cx, 0.25, cz); g.add(cone); }
    const it = { pos: new THREE.Vector3(x, y + 0.2, z), r: 2.2, label: label || 'Look into the manhole', action: () => toast(text || 'Thick power cables run down into the sewers. Stencilled on them: AEGIS PRIME GRID.') };
    interactables.push(it);
    return { g, it };
  }

  // ---------------- the Prime Generator's feeds ----------------
  for (const a of [Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
    const x = prime.x + Math.sin(a) * 17, z = prime.z + Math.cos(a) * 17;
    manhole(x, z, { x: prime.x + Math.sin(a) * 12.5, z: prime.z + Math.cos(a) * 12.5 }, { cables: 4, r: 0.13, label: 'Look into the main feed', text: 'Huge glowing cables leave the Aegis Prime Generator and drop into the sewers. From down there they branch out to every dungeon gate in the country, and to the dungeon arena itself.' });
  }

  // ---------------- every dungeon gate ----------------
  const fed = new Map();   // gate -> { g, it }
  function feedGate(gate) {
    const p = gate.pos, dir = gate.dir || new THREE.Vector3(1, 0, 0);
    const mx = p.x + dir.x * 5 + dir.z * 2.5, mz = p.z + dir.z * 5 - dir.x * 2.5;
    fed.set(gate, manhole(mx, mz, { x: p.x, z: p.z }, { text: `Power cables climb out of the manhole and into the gate${gate.name ? ` "${gate.name}"` : ''}. A tag on them reads: AEGIS PRIME GRID - GATE FEED. Every gate runs on the big generator.` }));
  }
  function unfeed(gate) {
    const f = fed.get(gate); if (!f) return;
    f.g.traverse(o => { if (o.geometry && o.geometry.type === 'TubeGeometry') o.geometry.dispose(); });
    f.g.removeFromParent(); const i = interactables.indexOf(f.it); if (i >= 0) interactables.splice(i, 1);
    fed.delete(gate);
  }

  // ---------------- sewers: cable trays and the grid junction ----------------
  {
    const o = sewerOrigin;
    const run = (x0, z0, x1, z1) => { for (let k = 0; k < 3; k++) { const y = 3.0 + k * 0.22; tube([new THREE.Vector3(x0, y, z0), new THREE.Vector3((x0 + x1) / 2, y - 0.08, (z0 + z1) / 2), new THREE.Vector3(x1, y, z1)], 0.07); } };
    for (const s of [-1, 1]) { run(o + 2.7, s * 12, o + 2.7, s * 61.5); run(s * 12 + o, 2.7, s * 61.5 + o, 2.7); }
    for (const [x0, z0, x1, z1] of [[o + 2.7, -12, o + 2.7, 12], [o - 12, 2.7, o + 12, 2.7]]) run(x0, z0, x1, z1);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.9), new THREE.MeshStandardMaterial({ color: 0x2b3238, metalness: 0.5, roughness: 0.5 })); box.position.set(o - 9.5, 1.3, 11.3); scene.add(box);
    for (let i = 0; i < 5; i++) { const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22ff88 : 0x56c8ff })); led.position.set(o - 10.3 + i * 0.4, 2.2, 10.84); scene.add(led); }
    const sg = sign('AEGIS PRIME GRID · GATE & DUNGEON FEED', 3.4); sg.position.set(o - 9.5, 3.1, 10.8); sg.rotation.y = Math.PI; scene.add(sg);
    tube([new THREE.Vector3(o - 9.5, 2.6, 11.3), new THREE.Vector3(o - 6, 3.2, 8), new THREE.Vector3(o + 2.7, 3.2, 2.7)], 0.1);
    interactables.push({ pos: new THREE.Vector3(o - 9.5, 0, 9.8), r: 2.5, label: 'Read the grid junction', action: () => toast(`AEGIS PRIME GRID JUNCTION. Input: Aegis Prime Generator (Capital). Outputs: ${fed.size} active dungeon gate${fed.size === 1 ? '' : 's'}, the dungeon arena, and the four shield sub-generators. Status: nominal.`) });
  }

  // ---------------- dungeon arena conduits ----------------
  {
    const { x, z } = dungeon, y = 6.5, w = 34.8;
    for (const [x0, z0, x1, z1] of [[-w, -w, w, -w], [w, -w, w, w], [w, w, -w, w], [-w, w, -w, -w]]) for (let k = 0; k < 2; k++) tube([new THREE.Vector3(x + x0, y + k * 0.3, z + z0), new THREE.Vector3(x + (x0 + x1) / 2, y + k * 0.3 - 0.25, z + (z0 + z1) / 2), new THREE.Vector3(x + x1, y + k * 0.3, z + z1)], 0.09);
    const feed = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.8), new THREE.MeshStandardMaterial({ color: 0x2b3238, metalness: 0.5 })); feed.position.set(x + 9, 1.5, z + 34.5); scene.add(feed);
    tube([new THREE.Vector3(x + 9, 3, z + 34.5), new THREE.Vector3(x + 9, 5.5, z + 34.8), new THREE.Vector3(x + 12, 6.5, z + w)], 0.12);
    const sg = sign('POWER FEED · AEGIS PRIME', 2.6); sg.position.set(x + 9, 3.4, z + 34.05); sg.rotation.y = Math.PI; scene.add(sg);
    interactables.push({ pos: new THREE.Vector3(x + 9, 0, z + 33), r: 2.5, label: 'Read the power feed', action: () => toast('This dungeon is powered through the sewers from the Aegis Prime Generator in the Capital. Cut the feed and the gate collapses - so nobody cuts it.') });
  }

  let time = 0, syncT = 0;
  function update(dt) {
    time += dt;
    cableMat.emissiveIntensity = 1.2 + Math.sin(time * 3.5) * 0.6;
    if ((syncT -= dt) > 0) return;
    syncT = 0.5;
    for (const g of gates) if (g.pos && !fed.has(g)) feedGate(g);
    for (const g of [...fed.keys()]) if (!gates.includes(g)) unfeed(g);
  }
  return { update, manhole, get fedGates() { return fed.size; } };
}
