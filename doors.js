// Doors on every enterable building, styled by what the building is:
//   revolving  – offices, banks, casinos, hotels, government (glass wings turn, faster when you're near)
//   sliding    – hospitals, police, schools, stations (glass panels slide apart as you walk up)
//   shutter    – shops (a roller shutter that rolls down at night: the shop is shut 22:00–07:00)
//   swing      – homes, pubs, restaurants, churches and the rest (a hinged door swings open)
// Each building's door goes on its entrance side: the side it says it faces, or else the most
// open side (the one with the fewest things in front of it).
import * as THREE from 'three';

export function doorStyle(type = '') {
  const t = type.toLowerCase();
  if (/shop|store|supermarket|market|pharmacy|bakery|butcher|convenience|mall|retail|boutique|kiosk|grocer|dealer/.test(t)) return 'shutter';
  if (/hospital|clinic|police|school|station|fire|airport|university|college/.test(t)) return 'sliding';
  if (/office|cyber|bank|hotel|gov|council|court|casino|company|tower|base|library|embassy|museum|hq|corporate/.test(t)) return 'revolving';
  return 'swing';
}
export const SHOP_OPEN = 7, SHOP_CLOSE = 22;
export const shopOpen = hour => hour >= SHOP_OPEN && hour < SHOP_CLOSE;

export function buildDoors({ scene, buildings, colliders, groundY, playerPos, hourNow, makeTex }) {
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const frame = new THREE.MeshStandardMaterial({ color: 0x2b2f33, metalness: 0.7, roughness: 0.35 });
  const wood = [0x6b4a2f, 0x2f4a6b, 0x7a1f1f, 0x2d5d3a, 0x3a3f45].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  const brass = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });
  const shutterTex = makeTex ? makeTex(64, 64, g => { g.fillStyle = '#9aa3aa'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) { g.fillStyle = '#7d868d'; g.fillRect(0, y, 64, 3); } }) : null;
  if (shutterTex) { shutterTex.wrapS = shutterTex.wrapT = THREE.RepeatWrapping; }
  const shutterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shutterTex, metalness: 0.5, roughness: 0.5 });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const box = (parent, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(geo, m); b.scale.set(w, h, d); b.position.set(x, y, z); parent.add(b); return b; };

  // how cluttered the space just outside a point is (fewer = more likely to be the entrance)
  function clutter(x, z, own) {
    let n = 0;
    for (const c of colliders) {
      if (c === own) continue;
      if (c.maxX > x - 3 && c.minX < x + 3 && c.maxZ > z - 3 && c.minZ < z + 3) n += 3;
      else if (c.maxX > x - 7 && c.minX < x + 7 && c.maxZ > z - 7 && c.minZ < z + 7) n += 1;
    }
    return n;
  }
  function entrance(b) {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const faces = [
      { x: cx, z: b.maxZ, nx: 0, nz: 1, span: w },
      { x: cx, z: b.minZ, nx: 0, nz: -1, span: w },
      { x: b.maxX, z: cz, nx: 1, nz: 0, span: d },
      { x: b.minX, z: cz, nx: -1, nz: 0, span: d },
    ];
    if (b.doorFace) return faces.find(f => f.nz === b.doorFace && f.nx === 0) || faces[0];
    let best = faces[0], bs = Infinity;
    for (const f of faces) { const sc = clutter(f.x + f.nx * 4, f.z + f.nz * 4, null) - (f.nz === 1 ? 0.5 : 0); if (sc < bs) { bs = sc; best = f; } }
    return best;
  }

  const doors = [];
  for (const b of buildings) {
    if (b.minX == null || b.noDoor || Math.abs(b.x) > 4000 || Math.abs(b.z) > 4000) continue;   // skip pockets far from the world
    const f = entrance(b), style = doorStyle(b.type);
    const g = new THREE.Group();
    g.position.set(f.x + f.nx * 0.12, groundY ? groundY(f.x + f.nx * 0.5, f.z + f.nz * 0.5, 0) : 0, f.z + f.nz * 0.12);
    g.rotation.y = Math.atan2(f.nx, f.nz);   // the group's +z points out of the building
    scene.add(g);
    const W = Math.min(style === 'shutter' ? 4.2 : 2.6, f.span * 0.4), H = style === 'shutter' ? 3 : 2.6;
    const d = { b, style, g, f, open: 0, spin: 0, parts: {} };
    // door frame
    box(g, W + 0.3, 0.2, 0.25, 0, H + 0.1, 0, frame);
    for (const s of [-1, 1]) box(g, 0.15, H, 0.25, s * (W / 2 + 0.07), H / 2, 0, frame);
    if (style === 'revolving') {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, H, 20, 1, true, Math.PI * 0.25, Math.PI * 1.5), glass); housing.position.set(0, H / 2, 0.9); g.add(housing);
      box(g, 2.6, 0.12, 2.6, 0, H, 0.9, frame);
      const wings = new THREE.Group(); wings.position.set(0, 0, 0.9); g.add(wings);
      for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2; wings.add(arm); box(arm, 0.05, H - 0.2, 1.15, 0, H / 2, 0.6, glass); box(arm, 0.07, H - 0.2, 0.06, 0, H / 2, 1.17, frame); }
      box(g, 0.1, H, 0.1, 0, H / 2, 0.9, frame);
      d.parts.wings = wings;
    } else if (style === 'sliding') {
      for (const s of [-1, 1]) { const p = box(g, W / 2, H - 0.1, 0.06, s * W / 4, H / 2, 0.05, glass); p.userData.home = s * W / 4; p.userData.side = s; (d.parts.panels ||= []).push(p); }
      box(g, W, 0.08, 0.08, 0, H - 0.3, 0.1, new THREE.MeshBasicMaterial({ color: 0x22ff88 }));
    } else if (style === 'shutter') {
      box(g, W + 0.3, 0.45, 0.45, 0, H + 0.4, 0.1, frame);                         // roll housing
      const sh = box(g, W, H, 0.06, 0, H / 2, 0.12, shutterMat); sh.userData.H = H;
      if (shutterTex) sh.material = shutterMat;
      d.parts.shutter = sh;
      box(g, W, 0.05, 0.3, 0, 0.03, 0.2, frame);
    } else {
      const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, 0.05); g.add(hinge);
      const leaf = box(hinge, W, H - 0.05, 0.08, W / 2, H / 2, 0, wood[(Math.abs(Math.round(b.x * 7 + b.z * 3))) % wood.length]);
      box(hinge, 0.08, 0.08, 0.12, W - 0.25, 1.05, 0.06, brass);
      for (const y of [0.7, 1.9]) box(hinge, W - 0.4, 0.04, 0.02, W / 2, y, 0.05, brass);
      d.parts.hinge = hinge;
      box(g, W + 0.8, 0.12, 0.9, 0, H + 0.25, 0.45, frame);   // little canopy
    }
    b.door = d;
    doors.push(d);
  }

  let lastHour = -1;
  function update(dt) {
    const p = playerPos(), hour = hourNow();
    const hourChanged = Math.floor(hour) !== lastHour; lastHour = Math.floor(hour);
    for (const d of doors) {
      const g = d.g, dx = p.x - g.position.x, dz = p.z - g.position.z, dist2 = dx * dx + dz * dz;
      if (d.style === 'shutter') {
        // shops roll their shutters down at night, up in the morning
        const want = shopOpen(hour) ? 1 : 0;
        if (hourChanged || dist2 < 3600) { d.open += THREE.MathUtils.clamp(want - d.open, -dt * 0.6, dt * 0.6); if (hourChanged && dist2 >= 3600) d.open = want; }
        const sh = d.parts.shutter, H = sh.userData.H, h = Math.max(0.05, H * (1 - d.open));
        sh.scale.y = h; sh.position.y = H - h / 2;
        continue;
      }
      if (dist2 > 1600) continue;   // nobody near: leave it
      const near = dist2 < 16 && Math.abs(p.y - g.position.y) < 3;
      if (d.style === 'revolving') { d.spin += ((near ? 1.4 : 0.25) - d.spin) * Math.min(1, dt * 2); d.parts.wings.rotation.y += d.spin * dt; continue; }
      d.open += THREE.MathUtils.clamp((near ? 1 : 0) - d.open, -dt * 2.5, dt * 2.5);
      if (d.style === 'sliding') for (const pnl of d.parts.panels) pnl.position.x = pnl.userData.home + pnl.userData.side * d.open * (pnl.scale.x * 0.95);
      else d.parts.hinge.rotation.y = d.open * 1.45;
    }
  }
  return { doors, update, isOpen: b => !b.door || b.door.style !== 'shutter' || shopOpen(hourNow()) };
}
