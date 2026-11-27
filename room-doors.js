// ROOM DOORS: real hinged doors for the doorways inside houses (mansions, their basement): E opens and closes
// them, a shut door is solid, and it swings round on its hinge. A doorway wider than 1.6 m gets a pair of doors.
// add({ a: [x, z], b: [x, z], y, h, color, glass }) puts a door in the gap from a to b (world coordinates, on the
// floor at height y). Each door belongs to its floor: a door upstairs doesn't block you downstairs.
import * as THREE from 'three';

export function createRoomDoors({ scene, colliders, interactables }) {
  const geo = new THREE.BoxGeometry(1, 1, 1), mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0 }); if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; } mats.set(k, m); } return mats.get(k); };
  const brass = mat(0xd4af37, { metal: 0.8, rough: 0.3 });
  const doors = [];
  function add({ a, b, y = 0, h = 2.2, color = 0x6b4a2f, glass = false, open = false }) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ang = Math.atan2(-dz, dx);   // the leaf runs along +x of its hinge group
    const pair = len > 1.6, leafLen = pair ? len / 2 : len;
    const leaves = [];
    const hinge = (hx, hz, dir) => {
      const g = new THREE.Group(); g.position.set(hx, y, hz); g.rotation.y = ang + (dir < 0 ? Math.PI : 0); scene.add(g);
      const leafM = glass ? mat(0x9fd3ff, { opacity: 0.4, rough: 0.05, metal: 0.3 }) : mat(color);
      const leaf = new THREE.Mesh(geo, leafM); leaf.scale.set(leafLen - 0.04, h - 0.03, 0.05); leaf.position.set(leafLen / 2, h / 2, 0); leaf.castShadow = true; g.add(leaf);
      if (glass) { const fr = new THREE.Mesh(geo, mat(0x2a2e33, { metal: 0.6 })); fr.scale.set(leafLen - 0.02, 0.06, 0.06); fr.position.set(leafLen / 2, 0.03, 0); g.add(fr); }
      else for (const [py, ph] of [[h * 0.27, h * 0.36], [h * 0.72, h * 0.36]]) { const p = new THREE.Mesh(geo, mat(new THREE.Color(color).multiplyScalar(0.8).getHex())); p.scale.set(leafLen * 0.7, ph, 0.07); p.position.set(leafLen / 2, py, 0); g.add(p); }   // panels
      const handle = new THREE.Mesh(geo, brass); handle.scale.set(0.12, 0.03, 0.12); handle.position.set(leafLen - 0.1, 1.0, 0); g.add(handle);
      leaves.push({ g, base: g.rotation.y });
    };
    if (pair) { hinge(a[0], a[1], 1); hinge(b[0], b[1], -1); } else hinge(a[0], a[1], 1);
    const col = { minX: Math.min(a[0], b[0]) - (Math.abs(dz) > Math.abs(dx) ? 0.12 : 0), maxX: Math.max(a[0], b[0]) + (Math.abs(dz) > Math.abs(dx) ? 0.12 : 0), minZ: Math.min(a[1], b[1]) - (Math.abs(dx) >= Math.abs(dz) ? 0.12 : 0), maxZ: Math.max(a[1], b[1]) + (Math.abs(dx) >= Math.abs(dz) ? 0.12 : 0), baseYAt: () => y };
    const d = { leaves, col, t: open ? 1 : 0, target: open ? 1 : 0 };
    if (!open) colliders.push(col);
    const it = { pos: new THREE.Vector3((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2), r: 1.6, door: true, get label() { return d.target ? 'Close the door' : 'Open the door'; }, action: () => toggle(d) };
    interactables.push(it);
    doors.push(d); return d;
  }
  function toggle(d) {
    d.target = d.target ? 0 : 1;
    const i = colliders.indexOf(d.col);
    if (d.target && i >= 0) colliders.splice(i, 1); else if (!d.target && i < 0) colliders.push(d.col);
  }
  function update(dt) {
    for (const d of doors) {
      if (d.t === d.target) continue;
      d.t += Math.sign(d.target - d.t) * Math.min(Math.abs(d.target - d.t), dt * 2.2);
      d.leaves.forEach((l, k) => { l.g.rotation.y = l.base + (k ? -1 : 1) * 1.45 * d.t; });   // a pair opens both ways
    }
  }
  return { add, update, doors };
}
