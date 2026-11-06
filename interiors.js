// Building interiors: proper multi-room layouts instead of one empty room.
//
// Every enterable building leads to one of these, picked by the building's type:
//   home   - open-plan living room and kitchen, double bedroom, bathroom, study
//   shop   - shop floor with stocked aisles, chiller cabinets, checkout, stockroom
//   office - reception, open-plan desks, meeting room, manager's office, kitchenette
// Civic buildings (police, hospital, school...) keep the themed civic hall in main.js.
// Rooms are joined by doorways with frames and open doors, the front door has a
// glowing EXIT sign, and the main furniture is solid. Interiors live far from the
// world (x = -5100 and beyond) so they never show up outside.
import * as THREE from 'three';

const W = 24, D = 18, H = 3.6;            // shell size: x from -12 to 12, z from -9 to 9
const DOOR_W = 1.2;

export function buildInteriors({ scene, colliders, camBlockers = [], sitSpots, makeTex, tvMaterial, hooks }) {
  const mats = new Map();
  const mat = (c, o = {}) => {
    const k = c + '|' + JSON.stringify({ ...o, map: o.map?.uuid });
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({
      color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1,
      transparent: o.opacity != null, opacity: o.opacity ?? 1, depthWrite: o.opacity == null, map: o.map ?? null,
    }));
    return mats.get(k);
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const productTex = makeTex(256, 128, g => {
    g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, 256, 128);
    const cols = ['#d94f3d', '#3d8bd9', '#f2c14e', '#5bb36a', '#8e5bd9', '#f28c38', '#e8e8e8', '#2c3e50'];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) {
      g.fillStyle = cols[(i * 3 + row * 5) % cols.length];
      const h = 40 + ((i * 7 + row * 3) % 4) * 6;
      g.fillRect(i * 16 + 2, row * 64 + 62 - h, 12, h);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(i * 16 + 4, row * 64 + 62 - h + 8, 8, 3);
    }
  });
  const bookTex = makeTex(128, 64, g => {
    const cols = ['#7a2e2e', '#2e4f7a', '#3f6b3a', '#a07a2c', '#5a3d6b', '#2f2f2f', '#9b4f2a'];
    for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(i * 8, 64 - (44 + (i * 5) % 18), 7, 64); }
  });

  const layouts = {};

  function makeLayout(key, x0, z0, wallColor, floorColor) {
    const L = { key, origin: new THREE.Vector3(x0, 0, z0), spawn: new THREE.Vector3(x0, 0, z0 + 5.6), spots: [], lights: [] };   // a few steps inside, so the camera stays in the room
    // ---- primitives (local coords) ----
    const B = (w, h, d, x, y, z, c, collide = false, o, parent) => {
      const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o));
      m.scale.set(w, h, d); m.position.set(x, y, z); m.receiveShadow = true;
      if (parent) parent.add(m);
      else {
        m.position.x += x0; m.position.z += z0; scene.add(m);
        if (collide) colliders.push({ minX: x0 + x - w / 2, maxX: x0 + x + w / 2, minZ: z0 + z - d / 2, maxZ: z0 + z + d / 2 });
      }
      return m;
    };
    const Cyl = (rt, rb, h, x, y, z, c, parent, seg = 14, o) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c instanceof THREE.Material ? c : mat(c, o));
      m.position.set(x, y, z); (parent || scene).add(m);
      if (!parent) { m.position.x += x0; m.position.z += z0; }
      return m;
    };
    // A furniture piece built in its own local space (front faces +z), then rotated.
    // fw/fd is its footprint, used for a solid collider when `solid` is set.
    const piece = (x, z, rot, fw, fd, build, solid = true) => {
      const g = new THREE.Group(); g.position.set(x0 + x, 0.1, z0 + z); g.rotation.y = rot; scene.add(g);
      build(g);
      if (solid) {
        const swap = Math.abs(Math.sin(rot)) > 0.5, w = swap ? fd : fw, d = swap ? fw : fd;
        colliders.push({ minX: x0 + x - w / 2, maxX: x0 + x + w / 2, minZ: z0 + z - d / 2, maxZ: z0 + z + d / 2 });
      }
      return g;
    };
    const P = (g, w, h, d, x, y, z, c, o) => B(w, h, d, x, y, z, c, false, o, g);
    const spot = (x, z, r, label, action) => L.spots.push({ pos: new THREE.Vector3(x0 + x, 0, z0 + z), r, label, action });
    const seat = (x, z, yaw, seatY, label) => sitSpots.push({ x: x0 + x, z: z0 + z, yaw, seatY, label });

    // ---- shell: floor, walls with a front door, skirting ----
    B(W, 0.1, D, 0, 0.05, 0, floorColor);
    const wallMat = mat(wallColor);
    const wall = (w, d, x, z) => { const m = B(w, H, d, x, H / 2, z, wallMat, true); camBlockers.push(m); return m; };
    wall(W, 0.3, 0, -D / 2);                                                   // back
    wall(0.3, D, -W / 2, 0); wall(0.3, D, W / 2, 0);                           // sides
    const half = (W - 1.6) / 2;
    wall(half, 0.3, -(1.6 / 2 + half / 2), D / 2); wall(half, 0.3, 1.6 / 2 + half / 2, D / 2);   // front, gap for the door
    B(1.6, H - 2.5, 0.3, 0, 2.5 + (H - 2.5) / 2, D / 2, wallMat);             // above the front door
    B(1.5, 2.4, 0.08, 0, 1.25, D / 2 + 0.12, 0x3a2a1e, true);                   // front door (closed, you leave through it)
    B(0.06, 0.06, 0.2, 0.55, 1.2, D / 2 - 0.02, 0xc9b26b, false, { metal: 0.8, rough: 0.3 });   // handle
    B(0.9, 0.28, 0.06, 0, 2.75, D / 2 - 0.2, 0x0d6b2f, false, { emissive: 0x19c25a, ei: 1.4 });   // EXIT sign
    B(0.22, 0.12, 0.02, 0, 2.75, D / 2 - 0.24, 0xffffff, false, { emissive: 0xffffff, ei: 1 });
    B(2.4, 0.02, 1.4, 0, 0.11, D / 2 - 1, 0x5b4a3a);                           // doormat
    spot(0, D / 2 - 1, 2.2, 'Leave the building', () => hooks.leave());

    // ---- interior walls with doorways (door frame + an open door) ----
    const doorway = (gx, gz, alongX) => {
      const fr = mat(0xf0ece2), leaf = mat(0x9a7b5a);
      if (alongX) {
        for (const s of [-1, 1]) B(0.1, 2.3, 0.22, gx + s * (DOOR_W / 2 + 0.05), 1.15, gz, fr);
        B(DOOR_W + 0.2, 0.12, 0.22, gx, 2.36, gz, fr);
        const d = B(0.05, 2.2, DOOR_W - 0.05, gx - DOOR_W / 2 + 0.03, 1.15, gz + DOOR_W / 2, leaf);   // swung open
        d.userData.door = true;
      } else {
        for (const s of [-1, 1]) B(0.22, 2.3, 0.1, gx, 1.15, gz + s * (DOOR_W / 2 + 0.05), fr);
        B(0.22, 0.12, DOOR_W + 0.2, gx, 2.36, gz, fr);
        B(DOOR_W - 0.05, 2.2, 0.05, gx + DOOR_W / 2, 1.15, gz - DOOR_W / 2 + 0.03, leaf);
      }
    };
    // partition along x at depth z, from x=a to x=b, with doorways centred on gaps[]
    L.partX = (z, a, b, gaps = [], c = wallColor, o) => {
      const m = o ? mat(c, o) : mat(c);
      let x = a;
      for (const g of [...gaps].sort((p, q) => p - q)) {
        const e = g - DOOR_W / 2 - 0.1;
        if (e - x > 0.05) camBlockers.push(B(e - x, H, 0.16, (x + e) / 2, H / 2, z, m, true));
        B(DOOR_W + 0.2, H - 2.42, 0.16, g, 2.42 + (H - 2.42) / 2, z, m);
        doorway(g, z, true); x = g + DOOR_W / 2 + 0.1;
      }
      if (b - x > 0.05) camBlockers.push(B(b - x, H, 0.16, (x + b) / 2, H / 2, z, m, true));
    };
    L.partZ = (x, a, b, gaps = [], c = wallColor, o) => {
      const m = o ? mat(c, o) : mat(c);
      let z = a;
      for (const g of [...gaps].sort((p, q) => p - q)) {
        const e = g - DOOR_W / 2 - 0.1;
        if (e - z > 0.05) camBlockers.push(B(0.16, H, e - z, x, H / 2, (z + e) / 2, m, true));
        B(0.16, H - 2.42, DOOR_W + 0.2, x, 2.42 + (H - 2.42) / 2, g, m);
        doorway(x, g, false); z = g + DOOR_W / 2 + 0.1;
      }
      if (b - z > 0.05) camBlockers.push(B(0.16, H, b - z, x, H / 2, (z + b) / 2, m, true));
    };
    L.light = (x, z, intensity = 1.1, dist = 16, color = 0xfff1dc) => {
      const l = new THREE.PointLight(color, intensity, dist, 1.4); l.position.set(x0 + x, H - 0.4, z0 + z); l.visible = false; scene.add(l); L.lights.push(l);
      B(0.7, 0.05, 0.7, x, H - 0.03, z, 0xffffff, false, { emissive: 0xfff6e0, ei: 1.2 });   // ceiling panel
    };

    // ---- furniture ----
    const F = {
      rug: (x, z, w, d, c) => B(w, 0.02, d, x, 0.11, z, c),
      plant: (x, z) => piece(x, z, 0, 0.5, 0.5, g => { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 12), mat(0xb5683f)); pot.position.y = 0.21; g.add(pot); for (const [px, py, pz, s] of [[0, 0.8, 0, 0.36], [0.12, 1.05, 0.05, 0.26], [-0.1, 1.0, -0.08, 0.28]]) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(0x3f7d3a)); lf.position.set(px, py, pz); g.add(lf); } }),
      sofa: (x, z, rot, c = 0x56677a, w = 2.2) => { piece(x, z, rot, w, 0.95, g => { P(g, w, 0.42, 0.9, 0, 0.21, 0, c); P(g, w, 0.6, 0.2, 0, 0.6, -0.35, c); for (const s of [-1, 1]) P(g, 0.2, 0.62, 0.9, s * (w / 2 - 0.1), 0.31, 0, c); for (const s of [-1, 1]) P(g, w / 2 - 0.25, 0.12, 0.62, s * (w / 4 - 0.02), 0.48, 0.08, 0xd9d2c3); }); },
      coffeeTable: (x, z, rot = 0) => piece(x, z, rot, 1.2, 0.6, g => { P(g, 1.2, 0.06, 0.6, 0, 0.42, 0, 0x7a5636); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(g, 0.05, 0.4, 0.05, a * 0.55, 0.2, b * 0.25, 0x4a3426); P(g, 0.3, 0.04, 0.2, 0.2, 0.47, 0, 0xc0392b); }),
      table: (x, z, w, d, rot = 0, c = 0x8a6440) => piece(x, z, rot, w, d, g => { P(g, w, 0.06, d, 0, 0.75, 0, c); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(g, 0.06, 0.73, 0.06, a * (w / 2 - 0.08), 0.37, b * (d / 2 - 0.08), 0x3b2b1f); }),
      chair: (x, z, rot, c = 0x6b4a30, label = 'Sit on the chair') => { piece(x, z, rot, 0.46, 0.46, g => { P(g, 0.46, 0.06, 0.46, 0, 0.45, 0, c); P(g, 0.46, 0.5, 0.05, 0, 0.73, -0.21, c); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(g, 0.04, 0.44, 0.04, a * 0.2, 0.22, b * 0.2, 0x2f2f2f); }, false); seat(x, z, rot, 0.95, label); },
      officeChair: (x, z, rot) => { piece(x, z, rot, 0.55, 0.55, g => { P(g, 0.5, 0.08, 0.5, 0, 0.48, 0, 0x26292e); P(g, 0.48, 0.6, 0.07, 0, 0.85, -0.23, 0x26292e); P(g, 0.05, 0.42, 0.05, 0, 0.22, 0, 0x8a8f96, { metal: 0.6 }); P(g, 0.55, 0.04, 0.08, 0, 0.03, 0, 0x2a2a2a); P(g, 0.08, 0.04, 0.55, 0, 0.03, 0, 0x2a2a2a); }, false); seat(x, z, rot, 0.98, 'Sit at the desk'); },
      bed: (x, z, rot, wide = true, c = 0x3e6f8f) => { const bw = wide ? 1.7 : 1.0; piece(x, z, rot, bw + 0.1, 2.25, g => { P(g, bw, 0.35, 2.2, 0, 0.18, 0, 0x6b4a30); P(g, bw - 0.1, 0.22, 2.05, 0, 0.46, 0.05, 0xf4f1ea); P(g, bw - 0.08, 0.08, 1.35, 0, 0.6, 0.35, c); for (const s of wide ? [-1, 1] : [0]) P(g, 0.55, 0.12, 0.35, s * 0.4, 0.62, -0.78, 0xffffff); P(g, bw + 0.1, 1.05, 0.08, 0, 0.6, -1.12, 0x5a3d26); }); },
      bedside: (x, z, rot) => piece(x, z, rot, 0.45, 0.4, g => { P(g, 0.45, 0.5, 0.4, 0, 0.25, 0, 0x7a5636); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 12), mat(0xfff0cc, { emissive: 0xffd9a0, ei: 0.6 })); s.position.set(0, 0.82, 0); g.add(s); P(g, 0.03, 0.3, 0.03, 0, 0.62, 0, 0x333333); }),
      wardrobe: (x, z, rot) => piece(x, z, rot, 1.6, 0.6, g => { P(g, 1.6, 2.1, 0.6, 0, 1.05, 0, 0x8a6a4a); P(g, 0.02, 1.9, 0.02, 0, 1.05, 0.31, 0x3b2b1f); for (const s of [-1, 1]) P(g, 0.04, 0.25, 0.04, s * 0.12, 1.1, 0.32, 0xc9b26b, { metal: 0.8 }); }),
      bookshelf: (x, z, rot, w = 1.2) => piece(x, z, rot, w, 0.35, g => { P(g, w, 2.0, 0.35, 0, 1.0, 0, 0x6b4a30); for (let i = 0; i < 4; i++) { P(g, w - 0.08, 0.38, 0.02, 0, 0.3 + i * 0.47, 0.16, 0xffffff, { map: bookTex }); } }),
      tvUnit: (x, z, rot) => piece(x, z, rot, 1.9, 0.5, g => { P(g, 1.9, 0.5, 0.45, 0, 0.25, 0, 0x2c2c2c); P(g, 1.65, 0.95, 0.06, 0, 1.05, -0.05, 0x111111); const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.86), tvMaterial || mat(0x223344, { emissive: 0x334455 })); scr.position.set(0, 1.05, -0.015); g.add(scr); }),
      counter: (x, z, rot, len, top = 0xe6e2da, base = 0xf2f0ea) => piece(x, z, rot, len, 0.62, g => { P(g, len, 0.88, 0.6, 0, 0.44, 0, base); P(g, len + 0.04, 0.05, 0.64, 0, 0.9, 0, top, { rough: 0.35 }); for (let i = -len / 2 + 0.3; i < len / 2; i += 0.6) P(g, 0.02, 0.7, 0.01, i, 0.44, 0.305, 0xb8b4ac); }),
      sink: (x, z, rot) => piece(x, z, rot, 0.6, 0.45, g => { P(g, 0.55, 0.04, 0.4, 0, 0.93, 0, 0xb8bcc2, { metal: 0.7, rough: 0.3 }); const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), mat(0xd0d4da, { metal: 0.9, rough: 0.2 })); tap.position.set(0, 1.08, -0.15); g.add(tap); }, false),
      cooker: (x, z, rot) => piece(x, z, rot, 0.6, 0.6, g => { P(g, 0.6, 0.9, 0.6, 0, 0.45, 0, 0xe8e8e8); P(g, 0.6, 0.04, 0.6, 0, 0.92, 0, 0x1a1a1a); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 12), mat(0x444444)); r.position.set(a * 0.14, 0.95, b * 0.14); g.add(r); } P(g, 0.45, 0.3, 0.02, 0, 0.5, 0.31, 0x1a1a1a, { rough: 0.2 }); }),
      fridge: (x, z, rot) => piece(x, z, rot, 0.8, 0.7, g => { P(g, 0.8, 1.9, 0.7, 0, 0.95, 0, 0xdfe3e6, { metal: 0.3, rough: 0.35 }); P(g, 0.78, 0.01, 0.01, 0, 1.25, 0.355, 0x9aa0a6); P(g, 0.03, 0.4, 0.04, 0.32, 1.5, 0.37, 0x9aa0a6); P(g, 0.03, 0.3, 0.04, 0.32, 0.9, 0.37, 0x9aa0a6); }),
      bath: (x, z, rot) => piece(x, z, rot, 1.75, 0.8, g => { P(g, 1.75, 0.55, 0.8, 0, 0.27, 0, 0xf6f6f2); P(g, 1.5, 0.02, 0.58, 0, 0.5, 0, 0x8cc7de, { opacity: 0.8, rough: 0.1 }); const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), mat(0xd0d4da, { metal: 0.9 })); tap.position.set(-0.75, 0.7, 0); g.add(tap); }),
      toilet: (x, z, rot) => piece(x, z, rot, 0.45, 0.65, g => { P(g, 0.4, 0.4, 0.5, 0, 0.2, 0.05, 0xf6f6f2); P(g, 0.42, 0.05, 0.52, 0, 0.43, 0.05, 0xffffff); P(g, 0.42, 0.38, 0.16, 0, 0.6, -0.25, 0xf6f6f2); }),
      basin: (x, z, rot) => piece(x, z, rot, 0.6, 0.45, g => { P(g, 0.15, 0.78, 0.15, 0, 0.39, -0.05, 0xf6f6f2); P(g, 0.58, 0.13, 0.42, 0, 0.84, 0, 0xffffff); P(g, 0.55, 0.75, 0.02, 0, 1.55, -0.22, 0xbfd6e0, { metal: 0.9, rough: 0.05 }); }),
      desk: (x, z, rot, monitor = true) => piece(x, z, rot, 1.4, 0.72, g => { P(g, 1.4, 0.05, 0.7, 0, 0.75, 0, 0xd8cdb8); for (const s of [-1, 1]) P(g, 0.05, 0.73, 0.65, s * 0.66, 0.37, 0, 0x5c6066); if (monitor) { P(g, 0.62, 0.38, 0.03, 0, 1.08, -0.2, 0x111111); P(g, 0.56, 0.32, 0.005, 0, 1.08, -0.183, 0x2b4a63, { emissive: 0x24506e, ei: 0.8 }); P(g, 0.06, 0.12, 0.06, 0, 0.84, -0.2, 0x333333); P(g, 0.45, 0.02, 0.15, 0, 0.785, 0.05, 0x2a2a2a); } }),
      shelving: (x, z, rot, len = 5.5) => piece(x, z, rot, len, 0.95, g => { P(g, len, 0.12, 0.9, 0, 0.06, 0, 0x6f7780); P(g, len, 1.9, 0.06, 0, 0.95, 0, 0x8a939c); for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { P(g, len - 0.1, 0.03, 0.42, 0, 0.35 + i * 0.55, s * 0.24, 0xb8c0c8, { metal: 0.4 }); P(g, len - 0.15, 0.32, 0.01, 0, 0.53 + i * 0.55, s * 0.43, 0xffffff, { map: productTex }); } for (const s of [-1, 1]) P(g, 0.06, 1.95, 0.9, s * (len / 2 - 0.03), 0.98, 0, 0x6f7780); }),
      chiller: (x, z, rot, len = 3) => piece(x, z, rot, len, 0.75, g => { P(g, len, 2.0, 0.7, 0, 1.0, 0, 0x2b3036); for (let i = 0; i < 4; i++) P(g, len - 0.15, 0.32, 0.01, 0, 0.35 + i * 0.42, 0.33, 0xffffff, { map: productTex }); P(g, len - 0.1, 1.8, 0.02, 0, 1.0, 0.36, 0xbfe6ff, { opacity: 0.25, emissive: 0x9fd8ff, ei: 0.3, rough: 0.05 }); }),
      checkout: (x, z, rot) => piece(x, z, rot, 2.4, 0.85, g => { P(g, 2.4, 0.95, 0.8, 0, 0.47, 0, 0x2f4f6f); P(g, 1.7, 0.02, 0.5, -0.3, 0.96, 0, 0x1a1a1a); P(g, 0.42, 0.3, 0.35, 0.85, 1.1, -0.05, 0x333333); P(g, 0.3, 0.2, 0.01, 0.85, 1.3, 0.13, 0x2b4a63, { emissive: 0x24506e }); }),
      crates: (x, z, n = 3) => piece(x, z, 0, 1.3, 1.1, g => { P(g, 1.2, 0.14, 1.0, 0, 0.07, 0, 0xa7845a); for (let i = 0; i < n; i++) P(g, 0.55, 0.42, 0.45, (i % 2 ? 0.28 : -0.28), 0.36 + Math.floor(i / 2) * 0.43, (i % 3 ? 0.2 : -0.2), 0xc49a6c); }),
      produce: (x, z) => piece(x, z, 0, 1.2, 0.7, g => { P(g, 1.2, 0.7, 0.7, 0, 0.35, 0, 0x8a6440); for (const [c, px] of [[0xd94f3d, -0.38], [0xf2c14e, 0], [0x5bb36a, 0.38]]) P(g, 0.34, 0.1, 0.55, px, 0.74, 0, c); }),
      reception: (x, z) => piece(x, z, 0, 4.2, 1.0, g => { P(g, 4, 1.1, 0.8, 0, 0.55, 0, 0xf2f0ea); P(g, 4.1, 0.05, 1.0, 0, 1.12, 0.05, 0x7a5636); P(g, 4, 0.18, 0.02, 0, 0.8, 0.41, 0x2f6f8f, { emissive: 0x2f6f8f, ei: 0.5 }); P(g, 0.55, 0.35, 0.03, -1, 1.35, -0.2, 0x111111); }),
      cooler: (x, z) => piece(x, z, 0, 0.4, 0.4, g => { P(g, 0.35, 1.0, 0.35, 0, 0.5, 0, 0xeeeeee); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12), mat(0x9fd3ff, { opacity: 0.6 })); b.position.y = 1.2; g.add(b); }),
      screen: (x, z, rot) => piece(x, z, rot, 2.5, 0.1, g => { P(g, 2.5, 1.4, 0.06, 0, 1.7, 0, 0x111111); P(g, 2.35, 1.27, 0.01, 0, 1.7, 0.035, 0x1f3f5a, { emissive: 0x1d4b6e, ei: 0.7 }); }, false),
      art: (x, y, z, rot, c) => { const g = new THREE.Group(); g.position.set(x0 + x, y, z0 + z); g.rotation.y = rot; scene.add(g); P(g, 1.1, 0.8, 0.04, 0, 0, 0, 0x2a2a2a); P(g, 0.98, 0.68, 0.01, 0, 0, 0.025, c); },
    };
    L.F = F; L.spot = spot; L.seat = seat; L.B = B;
    layouts[key] = L;
    return L;
  }

  // =========================== HOME ===========================
  {
    const L = makeLayout('home', -5100, 0, 0xece6da, 0xa8835a), { F, spot, seat } = L;
    L.partX(-1, -12, 12, [-6, 2.5, 8.5]);
    L.partZ(0, -9, -1); L.partZ(5, -9, -1);
    // Living room (front left)
    F.rug(-7.2, 4, 4.6, 3.4, 0x8a5a4a);
    F.tvUnit(-11.55, 4, Math.PI / 2);
    F.sofa(-6.8, 4, -Math.PI / 2, 0x55697d); seat(-6.8, 4, -Math.PI / 2, 0.9, 'Sit and watch TV');
    F.coffeeTable(-9, 4, Math.PI / 2);
    F.sofa(-8.8, 7.6, Math.PI, 0x55697d, 1.2); seat(-8.8, 7.6, Math.PI, 0.9, 'Sit in the armchair');
    F.bookshelf(-3.2, -0.65, 0); F.plant(-11.3, 8.4); F.plant(-1.6, 0.0);
    F.art(-11.83, 1.9, 7.4, Math.PI / 2, 0x6a8caf);
    // Kitchen and dining (front right)
    F.counter(11.4, 2.0, -Math.PI / 2, 3.6); F.sink(11.4, 2.0, -Math.PI / 2); F.cooker(11.4, 4.15, -Math.PI / 2); F.counter(11.4, 5.3, -Math.PI / 2, 1.6);
    F.fridge(11.4, 7.4, -Math.PI / 2);
    F.table(6.2, 4, 1.8, 1.0);
    for (const cx of [5.7, 6.7]) { F.chair(cx, 3.15, 0); F.chair(cx, 4.85, Math.PI); }
    F.art(7, 1.9, -0.84, 0, 0xc9a24a);
    spot(11, 7.4, 1.9, 'Have a snack from the fridge', () => hooks.eat(25, 0, 'You grab a snack from the fridge.'));
    spot(11, 2.0, 1.5, 'Get a glass of water', () => hooks.drink());
    // Bedroom (back left)
    F.rug(-6, -5, 3.6, 2.6, 0x6b7f99);
    F.bed(-6, -7.65, 0, true); F.bedside(-7.4, -8.5, 0); F.bedside(-4.6, -8.5, 0);
    F.wardrobe(-11.5, -4.5, Math.PI / 2); F.plant(-1.0, -8.3);
    spot(-6, -6.0, 2.0, 'Sleep in the bed', () => hooks.sleep());
    // Bathroom (back middle)
    F.bath(2.5, -8.4, 0); F.toilet(4.45, -4.2, -Math.PI / 2); F.basin(0.45, -4.6, Math.PI / 2);
    F.rug(2.5, -6.6, 1.4, 0.8, 0xe8e2d0);
    spot(2.5, -7.4, 1.6, 'Take a bath', () => hooks.rest(15, 'A warm bath. You feel refreshed.'));
    // Study (back right)
    F.bed(10.8, -7.8, 0, false, 0x8f5b3e); F.desk(5.9, -5.2, Math.PI / 2); F.officeChair(6.8, -5.2, -Math.PI / 2);
    F.bookshelf(11.6, -3.0, -Math.PI / 2); F.plant(11.3, -1.6);
    L.light(-6.5, 4); L.light(6.5, 4); L.light(-6, -5, 0.9, 12); L.light(2.5, -5, 0.8, 9, 0xffffff); L.light(8.5, -5, 0.8, 10);
  }

  // =========================== SHOP ===========================
  {
    const L = makeLayout('shop', -5200, 0, 0xf2f2ee, 0xd9dcdf), { F, spot } = L;
    L.partX(-2, -12, 12, [-8]);
    for (const x of [-6.5, -2, 2.5]) F.shelving(x, 2.6, Math.PI / 2, 5.5);
    F.chiller(11.45, 0.6, -Math.PI / 2, 3); F.chiller(11.45, 3.8, -Math.PI / 2, 3);
    F.produce(-10.6, 7.2); F.produce(-10.6, 5.8); F.produce(-10.6, 4.4);
    F.checkout(7.2, 6.6, Math.PI);
    F.plant(-11.2, 8.4);
    L.B(3.2, 0.5, 0.05, 0, 3.0, 8.82, 0xc0392b, false, { emissive: 0xc0392b, ei: 0.4 });   // shop name strip above the door
    L.B(1.6, 0.35, 0.05, -8, 2.65, -1.9, 0x333333);                                          // STAFF ONLY plate
    spot(7.2, 7.8, 2.0, 'Buy a meal deal (5 gold)', () => hooks.eat(40, 5, 'You buy a meal deal: sandwich, crisps and a drink.'));
    for (const x of [-6.5, -2, 2.5]) spot(x + 0.9, 2.6, 1.4, 'Browse the shelves', () => hooks.toast('Bread, tins, snacks, cleaning stuff... the usual. The meal deals are at the till.'));
    spot(10.6, 2.2, 1.6, 'Look in the chiller', () => hooks.toast('Milk, juice, sandwiches and ready meals, all chilled.'));
    // Stockroom
    F.crates(-9, -6.5, 5); F.crates(-5.5, -7.6, 4); F.crates(-2, -6.2, 3); F.crates(2, -7.6, 5);
    F.shelving(7.6, -8.4, 0, 6.4);
    F.table(8.5, -4.6, 1.4, 0.9); F.chair(8.0, -3.9, Math.PI); F.chair(9.0, -3.9, Math.PI);
    spot(-5.5, -5.8, 2.2, 'Check the stock', () => hooks.toast('Boxes of crisps, tins and toilet roll waiting to go out on the shelves.'));
    L.light(-6, 4, 1.2, 16, 0xffffff); L.light(6, 4, 1.2, 16, 0xffffff); L.light(-4, -5.5, 0.8, 14, 0xfff1dc); L.light(6, -5.5, 0.8, 12, 0xfff1dc);
  }

  // =========================== OFFICE ===========================
  {
    const L = makeLayout('office', -5300, 0, 0xe9edf1, 0x7c8792), { F, spot, seat } = L;
    L.partX(-2.5, -12, 12, [-7, 1.5, 8.5]);
    L.partZ(-2, -9, -2.5); L.partZ(5, -9, -2.5);
    // Reception
    F.reception(0, 4.6); F.officeChair(-1, 3.7, 0);
    for (const z of [5.4, 6.4, 7.4]) F.chair(-11.4, z, Math.PI / 2, 0x2f6f8f, 'Sit in the waiting area');
    F.cooler(-11.3, 3.8); F.plant(11.2, 8.3); F.plant(-11.2, 8.4);
    L.B(0.04, 0.9, 3.6, 11.83, 2.4, 5.6, 0x2f6f8f, false, { emissive: 0x2f6f8f, ei: 0.35 });   // company logo panel on the wall
    spot(0, 5.6, 1.8, 'Talk to the receptionist', () => hooks.toast('"Morning! Have a seat, someone will be right with you."'));
    // Open-plan desks
    for (const cx of [-6.5, 5.5]) for (const [dx, dz, rot] of [[-0.75, -0.42, Math.PI], [0.75, -0.42, Math.PI], [-0.75, 0.42, 0], [0.75, 0.42, 0]]) {
      F.desk(cx + dx, 0.6 + dz, rot); F.officeChair(cx + dx, 0.6 + dz * 2.6, rot + Math.PI);   // chair faces its desk
    }
    // Meeting room (glass wall on the corridor side)
    F.table(-7, -6, 4.2, 1.5, 0, 0x5c4a3a);
    for (const x of [-8.5, -7, -5.5]) { F.chair(x, -7.15, 0, 0x26292e, 'Sit at the meeting table'); F.chair(x, -4.85, Math.PI, 0x26292e, 'Sit at the meeting table'); }
    F.screen(-7, -8.78, 0);
    // Manager's office
    F.desk(1.5, -6.6, Math.PI); F.officeChair(1.5, -7.6, 0); F.chair(1.0, -5.4, Math.PI); F.chair(2.0, -5.4, Math.PI);
    F.bookshelf(4.6, -5.2, -Math.PI / 2); F.plant(-1.5, -8.4); F.art(1.5, 1.9, -8.82, 0, 0x7d9e6a);
    // Kitchenette
    F.counter(8.5, -8.55, 0, 5); F.sink(7.5, -8.55, 0); F.fridge(11.45, -4.5, -Math.PI / 2);
    L.B(0.35, 0.4, 0.35, 9.4, 1.15, -8.55, 0x222222);   // coffee machine
    F.table(8, -5, 1.2, 0.8); F.chair(7.6, -4.3, Math.PI); F.chair(8.4, -4.3, Math.PI);
    spot(9.4, -7.6, 1.7, 'Make a coffee', () => hooks.rest(25, 'You make a coffee. That\'s better.'));
    L.light(-6, 0.6, 1.1, 14, 0xf4f8ff); L.light(5.5, 0.6, 1.1, 14, 0xf4f8ff); L.light(0, 6, 0.9, 10, 0xf4f8ff);
    L.light(-7, -6, 0.9, 10, 0xf4f8ff); L.light(1.5, -6, 0.8, 9); L.light(8.5, -6, 0.8, 9);
  }

  let active = null;
  return {
    layouts,
    /** Which layout a building type uses. Unknown non-civic types count as homes. */
    layoutFor(type = '') {
      const t = String(type).toLowerCase();
      if (/shop|retail|supermarket|market|kiosk|store|convenience|bakery|butcher|chemist|pharmacy/.test(t)) return layouts.shop;
      if (/office|commercial|government|bank|job_centre|post_office|company|industrial|warehouse|frontier-office|base/.test(t)) return layouts.office;
      if (/apartment|house|home|residential|terrace|detached|bungalow|flat|dormitory|cabin|farm|building|^yes$/.test(t)) return layouts.home;
      return null;   // civic types use the themed civic hall
    },
    enter(L) { this.exit(); active = L; for (const l of L.lights) l.visible = true; },
    exit() { if (active) for (const l of active.lights) l.visible = false; active = null; },
    get active() { return active; },
    /** Nearest interaction inside the current interior (furniture, the exit). */
    nearest(p) {
      if (!active) return null;
      let best = null, bestD = Infinity;
      for (const s of active.spots) { const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z); if (d < s.r && d < bestD) { best = s; bestD = d; } }
      return best;
    },
  };
}
