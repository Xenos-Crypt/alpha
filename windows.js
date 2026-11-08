// Real windows: walls are built around actual openings, so a window you see from the street is also
// a window from inside (glass you can look through, a frame, a sill). Every window opens: press E
// next to it and the casement swings outward; press E again to close it.
//
//   const win = createWindows({ scene, interactables, glowMats });
//   win.wall({ ax, az, bx, bz, y, h, t, mat, inward: [nx, nz], holes: [{ at, w, sill, h, frosted }], view })
//     builds the visible wall from A to B (bottom at y, height h, thickness t) with holes. It adds NO
//     collider: keep the wall's own collider, so nobody climbs out through a window.
//     `at` is the window centre's distance from A along the wall. `inward` points into the room.
//     `view` (optional texture) puts a painted outside view a little beyond each window, for rooms
//     that don't sit in the real city (the pocket interiors).
//   win.update(dt) swings the casements.
import * as THREE from 'three';

export function createWindows({ scene, interactables, glowMats }) {
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), sashes = [];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 });
  const sillMat = new THREE.MeshStandardMaterial({ color: 0xd9d3c7, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe3f5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide, emissive: 0xffd58a, emissiveIntensity: 0 });
  const frosted = new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 0.4, transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: 0xffd58a, emissiveIntensity: 0 });
  glowMats?.push(glass, frosted);   // a warm glow from inside at night
  const add = (parent, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(boxGeo, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.castShadow = h > 0.5 && d > 0.1; b.receiveShadow = true; parent.add(b); return b; };

  function wall({ ax, az, bx, bz, y = 0, h = 3, t = 0.3, mat, inward = [0, 1], holes = [], view = null, interact = true }) {
    const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
    // a group whose local +x runs along the wall from A, local +z points into the room
    const g = new THREE.Group(); g.position.set(ax, y, az); g.rotation.y = Math.atan2(-dz, dx); scene.add(g);
    const lz = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion), flip = lz.x * inward[0] + lz.z * inward[1] < 0 ? -1 : 1;   // local z sign of "inside"
    const meshes = [], H = holes.slice().sort((a, b) => a.at - b.at);
    // solid strips between windows, and the pieces under and over each window
    let u = 0;
    for (const o of H) { const u0 = o.at - o.w / 2, u1 = o.at + o.w / 2;
      if (u0 - u > 0.01) meshes.push(add(g, u0 - u, h, t, (u + u0) / 2, h / 2, 0, mat));
      if (o.sill > 0.01) meshes.push(add(g, o.w, o.sill, t, o.at, o.sill / 2, 0, mat));
      const top = o.sill + o.h; if (h - top > 0.01) meshes.push(add(g, o.w, h - top, t, o.at, (top + h) / 2, 0, mat));
      u = u1; }
    if (L - u > 0.01) meshes.push(add(g, L - u, h, t, (u + L) / 2, h / 2, 0, mat));
    // the windows
    for (const o of H) {
      const u0 = o.at - o.w / 2, cy = o.sill + o.h / 2, f = 0.06;
      for (const s of [-1, 1]) add(g, f, o.h, t + 0.02, o.at + s * (o.w / 2 - f / 2), cy, 0, frameMat);   // jambs
      add(g, o.w, f, t + 0.02, o.at, o.sill + o.h - f / 2, 0, frameMat);                                   // head
      add(g, o.w + 0.16, 0.05, t + 0.16, o.at, o.sill, 0, sillMat);                                         // sill, sticking out both sides
      // two casements, hinged at the outer jambs, swinging outwards
      const leaves = [];
      for (const s of [-1, 1]) {
        const hinge = new THREE.Group(); hinge.position.set(o.at + s * (o.w / 2 - f), cy, 0); g.add(hinge);
        const lw = o.w / 2 - f, dir = -s;   // the leaf runs from the hinge towards the middle
        add(hinge, lw, o.h - 2 * f, 0.025, dir * lw / 2, 0, 0, o.frosted ? frosted : glass);
        for (const yy of [-1, 1]) add(hinge, lw, 0.04, 0.045, dir * lw / 2, yy * (o.h / 2 - f - 0.02), 0, frameMat);
        add(hinge, 0.04, o.h - 2 * f, 0.045, dir * (lw - 0.02), 0, 0, frameMat);
        add(hinge, 0.03, 0.12, 0.05, dir * (lw - 0.07), 0, flip * 0.04, sillMat);   // handle
        leaves.push({ hinge, open: dir * flip * 1.2 });   // swings out of the room
      }
      if (view) {   // a painted view of the city outside
        const p = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 3.2, o.h * 2.6), new THREE.MeshBasicMaterial({ map: view, fog: false }));
        p.position.set(o.at, cy + 0.15, -flip * 2.4); p.rotation.y = flip > 0 ? 0 : Math.PI; g.add(p);
      }
      const w = { leaves, t: 0, target: 0 }; sashes.push(w);
      if (interact) {
        const c = new THREE.Vector3(o.at, 0, flip * 0.75).applyMatrix4(new THREE.Matrix4().makeRotationY(g.rotation.y)).add(new THREE.Vector3(ax, y, az));
        interactables.push({ pos: c, r: 1.25, get label() { return w.target ? 'Close the window' : 'Open the window'; }, action: () => { w.target = w.target ? 0 : 1; }, window: true });
      }
    }
    return { group: g, meshes };
  }
  function update(dt) {
    for (const w of sashes) { if (w.t === w.target) continue; w.t += Math.sign(w.target - w.t) * Math.min(Math.abs(w.target - w.t), dt * 1.8); for (const l of w.leaves) l.hinge.rotation.y = l.open * w.t; }
  }
  return { wall, update, sashes };
}

// A city skyline seen through a window (for rooms that aren't really in the street).
export function windowView(makeTex) {
  return makeTex(256, 192, g => {
    const sky = g.createLinearGradient(0, 0, 0, 192); sky.addColorStop(0, '#7fb6e6'); sky.addColorStop(1, '#d7ecf7'); g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#ffffffcc'; for (const [x, y, r] of [[40, 30, 14], [58, 26, 18], [180, 40, 12], [196, 36, 16]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let x = 0; x < 256;) { const w = 14 + r() * 26, h = 50 + r() * 100, c = 120 + r() * 70 | 0; g.fillStyle = `rgb(${c},${c + 6},${c + 16})`; g.fillRect(x, 192 - h, w, h);
      g.fillStyle = '#f6e7b8aa'; for (let wy = 192 - h + 6; wy < 180; wy += 10) for (let wx = x + 3; wx < x + w - 4; wx += 7) if (r() > 0.35) g.fillRect(wx, wy, 4, 5); x += w + 2; }
    g.fillStyle = '#5f8f4a'; g.fillRect(0, 176, 256, 16); for (let i = 0; i < 9; i++) { g.fillStyle = '#3f7a3a'; g.beginPath(); g.arc(14 + i * 30, 176, 12, Math.PI, 0); g.fill(); }
  });
}
