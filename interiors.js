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

export function buildInteriors({ scene, colliders, camBlockers = [], sitSpots, makeTex, tvMaterial, hooks, makePerson, animatePerson }) {
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

  function makeLayout(key, x0, z0, wallColor, floorColor, { exit = true } = {}) {
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
    if (!exit) wall(W, 0.3, 0, D / 2);                                         // upper floors: no street door
    else {
      const half = (W - 1.6) / 2;
      wall(half, 0.3, -(1.6 / 2 + half / 2), D / 2); wall(half, 0.3, 1.6 / 2 + half / 2, D / 2);   // front, gap for the door
      B(1.6, H - 2.5, 0.3, 0, 2.5 + (H - 2.5) / 2, D / 2, wallMat);             // above the front door
      B(1.5, 2.4, 0.08, 0, 1.25, D / 2 + 0.12, 0x3a2a1e, true);                   // front door (closed, you leave through it)
      B(0.06, 0.06, 0.2, 0.55, 1.2, D / 2 - 0.02, 0xc9b26b, false, { metal: 0.8, rough: 0.3 });   // handle
      B(0.9, 0.28, 0.06, 0, 2.75, D / 2 - 0.2, 0x0d6b2f, false, { emissive: 0x19c25a, ei: 1.4 });   // EXIT sign
      B(0.22, 0.12, 0.02, 0, 2.75, D / 2 - 0.24, 0xffffff, false, { emissive: 0xffffff, ei: 1 });
      B(2.4, 0.02, 1.4, 0, 0.11, D / 2 - 1, 0x5b4a3a);                           // doormat
      spot(0, D / 2 - 1, 2.2, 'Leave the building', () => hooks.leave());
    }

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
      vending: (x, z, rot) => { piece(x, z, rot, 0.9, 0.8, g => { P(g, 0.9, 1.9, 0.8, 0, 0.95, 0, 0xc0392b); P(g, 0.6, 1.2, 0.02, -0.1, 1.15, 0.41, 0x222a33, { emissive: 0x2a4a6a, ei: 0.6 }); for (let r = 0; r < 4; r++) P(g, 0.55, 0.05, 0.02, -0.1, 0.7 + r * 0.3, 0.42, 0xffd23f, { emissive: 0xffd23f, ei: 0.4 }); P(g, 0.12, 0.3, 0.03, 0.33, 1.2, 0.41, 0x111111); }); const f = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot)); spot(x + f.x * 0.9, z + f.z * 0.9, 1.3, 'Use the vending machine', () => hooks.shop('Vending machine', 'vending')); },
      art: (x, y, z, rot, c) => { const g = new THREE.Group(); g.position.set(x0 + x, y, z0 + z); g.rotation.y = rot; scene.add(g); P(g, 1.1, 0.8, 0.04, 0, 0, 0, 0x2a2a2a); P(g, 0.98, 0.68, 0.01, 0, 0, 0.025, c); },
    };
    // ---- getting between floors ----
    // A straight staircase, `len` long, rising toward dir (+1 = +z, -1 = -z). (sx, sz) is
    // where you stand to use it.
    L.stairs = (x, z, len, dir, label, onUse, sx, sz) => {
      const n = 14, rise = H / n, run = len / n, stepMat = mat(0xb08a63), side = mat(0xe6e0d4);
      for (let i = 0; i < n; i++) {
        const top = (i + 1) * rise;
        B(1.2, top, run, x, top / 2, z + dir * (-len / 2 + (i + 0.5) * run), stepMat);
      }
      for (const s of [-1, 1]) { const r = B(0.06, 0.06, Math.hypot(len, H), x + s * 0.63, H / 2 + 0.95, z, side); r.rotation.x = -dir * Math.atan2(H, len); }
      colliders.push({ minX: x0 + x - 0.65, maxX: x0 + x + 0.65, minZ: z0 + z - len / 2, maxZ: z0 + z + len / 2 });
      spot(sx, sz, 1.8, label, onUse);
    };
    // Upstairs, the stairs show as an opening in the floor with railings round it.
    L.stairwell = (x, z, len, label, onUse, sx, sz) => {
      B(1.3, 0.02, len, x, 0.11, z, 0x1c1814);
      const rail = mat(0xe6e0d4);
      for (const s of [-1, 1]) { B(0.06, 1.0, len, x + s * 0.68, 0.6, z, rail); B(0.06, 0.06, len, x + s * 0.68, 1.1, z, rail); }
      B(1.4, 1.0, 0.06, x, 0.6, z - len / 2, rail);
      colliders.push({ minX: x0 + x - 0.7, maxX: x0 + x + 0.7, minZ: z0 + z - len / 2, maxZ: z0 + z + len / 2 });
      spot(sx, sz, 1.8, label, onUse);
    };
    // Lift doors set into a wall facing `rot` (front faces +z at rot 0), with a call button.
    L.lift = (x, z, rot, label, onUse) => {
      const g = new THREE.Group(); g.position.set(x0 + x, 0, z0 + z); g.rotation.y = rot; scene.add(g);
      P(g, 2.2, 2.8, 0.2, 0, 1.4, 0, 0xc9ced4, { metal: 0.6, rough: 0.35 });
      for (const s of [-1, 1]) P(g, 0.78, 2.3, 0.05, s * 0.4, 1.2, 0.12, 0xaab2bb, { metal: 0.85, rough: 0.2 });
      P(g, 0.12, 0.2, 0.04, 1.0, 1.25, 0.13, 0x333333); P(g, 0.06, 0.06, 0.02, 1.0, 1.25, 0.16, 0x7ad8ff, { emissive: 0x7ad8ff, ei: 2 });
      P(g, 0.6, 0.18, 0.03, 0, 2.65, 0.13, 0x111111); P(g, 0.3, 0.1, 0.01, 0, 2.65, 0.15, 0xff9a3c, { emissive: 0xff7a1c, ei: 1.5 });
      const f = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
      spot(x + f.x * 1.1, z + f.z * 1.1, 1.7, label, onUse);
    };
    // An escalator: a sloped moving stairway with glass sides, bottom end at (x, zBottom).
    L.escalator = (x, zBottom, len, dir, label, onUse, goingUp = true) => {
      const g = new THREE.Group(); g.position.set(x0 + x, 0, z0 + zBottom + dir * len / 2); scene.add(g);
      const ang = Math.atan2(H, len), slope = Math.hypot(H, len);
      const belt = new THREE.Mesh(boxGeo, mat(0x3a3f45, { metal: 0.5, rough: 0.4 })); belt.scale.set(1.1, 0.25, slope); belt.position.y = H / 2; belt.rotation.x = -dir * ang; g.add(belt);
      for (const s of [-1, 1]) {
        const glass = new THREE.Mesh(boxGeo, mat(0xbfe6ff, { opacity: 0.3, rough: 0.05 })); glass.scale.set(0.04, 0.9, slope); glass.position.set(s * 0.6, H / 2 + 0.55, 0); glass.rotation.x = -dir * ang; g.add(glass);
        const rail = new THREE.Mesh(boxGeo, mat(0x1a1a1a)); rail.scale.set(0.08, 0.06, slope); rail.position.set(s * 0.6, H / 2 + 1.0, 0); rail.rotation.x = -dir * ang; g.add(rail);
      }
      colliders.push({ minX: x0 + x - 0.7, maxX: x0 + x + 0.7, minZ: z0 + Math.min(zBottom, zBottom + dir * len), maxZ: z0 + Math.max(zBottom, zBottom + dir * len) });
      const at = goingUp ? zBottom - dir * 0.9 : zBottom + dir * (len + 0.9);
      spot(x, at, 1.7, label, onUse);
    };
    // ---- people working here ----
    // sit: seated at a desk/chair (seatY = top of the seat); task: 'type' | 'idle' | 'talk' | 'read'
    L.workers = [];
    L.worker = (x, z, rot, { sit = true, seatY = 0.58, outfit = 0x3b4a5a, pants = 0x2a2f36, hair = [0x2b1d14, 0x5a3d26, 0x1a1a1a, 0xc9a24a, 0x8a3b1f][L.workers.length % 5], skin = [0xffdcc0, 0xd9a07a, 0x8d5a3b, 0xf0c8a0, 0x6b4430][(L.workers.length * 3) % 5], task = 'type' } = {}) => {
      if (!makePerson) return;
      const h = makePerson({ outfit, pants, hair, skin });
      h.root.position.set(x0 + x, sit ? seatY + 0.1 - 0.88 : 0.1, z0 + z); h.root.rotation.y = rot; h.root.visible = false; scene.add(h.root);
      if (sit) for (const leg of [h.legL, h.legR]) leg.pivot.rotation.x = -Math.PI / 2;
      L.workers.push({ h, sit, task, phase: Math.random() * 6 });
    };
    L.F = F; L.spot = spot; L.seat = seat; L.B = B; L.Cyl = Cyl; L.x0 = x0; L.z0 = z0;
    layouts[key] = L;
    return L;
  }

  // Moving between floors: fade, put the player at (lx, lz) in layout `to`, facing `yaw`
  // (0 = facing away from the front door). `upFrom` remembers which downstairs you
  // came from, so the flat above a shop takes you back down into the shop.
  let upFrom = null, liftFrom = null;
  const go = (to, lx, lz, yaw, msg) => hooks.travel(new THREE.Vector3(to.x0 + lx, 0, to.z0 + lz), yaw, msg, () => api.enter(to));
  // Seat `n` workers at the desk clusters built with the 4-desk pattern used below.
  const staffDesks = (L, xs, zs, n, outfit) => {
    let k = 0;
    for (const cz of zs) for (const cx of xs) for (const [dx, dz, rot] of [[-0.75, -0.42, Math.PI], [0.75, 0.42, 0], [0.75, -0.42, Math.PI], [-0.75, 0.42, 0]]) {
      if (k++ >= n) return;
      L.worker(cx + dx, cz + dz * 2.6, rot + Math.PI, { outfit: [outfit, 0x6a4a6a, 0x4a6a5a, 0x7a6a4a][k % 4], task: 'type' });
    }
  };

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
    L.stairs(-2.6, 6.3, 4.2, 1, 'Go upstairs', () => { upFrom = { L, x: -2.6, z: 3.0 }; go(layouts['home-up'], -1.2, 7.4, 0, 'Upstairs'); }, -2.6, 3.3);
    L.worker(-6.8, 3.4, -Math.PI / 2, { seatY: 0.52, outfit: 0x8a5a4a, task: 'idle' });          // watching TV
    L.worker(10.6, 4.15, Math.PI / 2, { sit: false, outfit: 0xd96a3d, pants: 0x3a3a3a, task: 'type' });   // cooking
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
    spot(7.2, 7.8, 2.0, 'Buy snacks and drinks at the till', () => hooks.shop('Corner shop'));
    for (const x of [-6.5, -2, 2.5]) spot(x + 0.9, 2.6, 1.4, 'Browse the shelves', () => hooks.toast('Bread, tins, snacks, cleaning stuff... the usual. The meal deals are at the till.'));
    spot(10.6, 2.2, 1.6, 'Look in the chiller', () => hooks.toast('Milk, juice, sandwiches and ready meals, all chilled.'));
    // Stockroom
    F.crates(-9, -6.5, 5); F.crates(-5.5, -7.6, 4); F.crates(-2, -6.2, 3); F.crates(2, -7.6, 5);
    F.shelving(7.6, -8.4, 0, 6.4);
    F.table(8.5, -4.6, 1.4, 0.9); F.chair(8.0, -3.9, Math.PI); F.chair(9.0, -3.9, Math.PI);
    spot(-5.5, -5.8, 2.2, 'Check the stock', () => hooks.toast('Boxes of crisps, tins and toilet roll waiting to go out on the shelves.'));
    L.light(-6, 4, 1.2, 16, 0xffffff); L.light(6, 4, 1.2, 16, 0xffffff); L.light(-4, -5.5, 0.8, 14, 0xfff1dc); L.light(6, -5.5, 0.8, 12, 0xfff1dc);
    L.stairs(-11.2, -5.5, 4.2, -1, 'Go upstairs to the flat', () => { upFrom = { L, x: -9.8, z: -3.0 }; go(layouts['home-up'], -1.2, 7.4, 0, 'The flat above the shop'); }, -9.8, -3.0);
    const uniform = { outfit: 0xc0392b, pants: 0x2a2f36 };
    L.worker(7.2, 5.7, 0, { sit: false, ...uniform, task: 'type' });            // on the till
    L.worker(-5.4, 1.4, -Math.PI / 2, { sit: false, ...uniform, task: 'type' }); // stacking shelves
    L.worker(-4.2, -5.9, Math.PI, { sit: false, ...uniform, task: 'idle' });     // in the stockroom
    L.worker(8.0, -3.9, Math.PI, { ...uniform, seatY: 0.55, task: 'talk' });     // on a break
    L.worker(-1, 6.3, Math.PI, { sit: false, outfit: 0x5b8a72, task: 'idle' });  // a customer
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
    L.B(0.04, 0.9, 2.8, 11.83, 2.4, 6.6, 0x2f6f8f, false, { emissive: 0x2f6f8f, ei: 0.35 });   // company logo panel on the wall
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
    F.vending(11.4, -7.0, -Math.PI / 2);
    L.light(-6, 0.6, 1.1, 14, 0xf4f8ff); L.light(5.5, 0.6, 1.1, 14, 0xf4f8ff); L.light(0, 6, 0.9, 10, 0xf4f8ff);
    L.light(-7, -6, 0.9, 10, 0xf4f8ff); L.light(1.5, -6, 0.8, 9); L.light(8.5, -6, 0.8, 9);
    L.lift(11.75, 3.0, -Math.PI / 2, 'Take the lift up to floor 1', () => { liftFrom = L; go(layouts['office-up'], 10.0, 3.0, Math.PI / 2, 'Floor 1'); });
    L.escalator(-9.5, 7.6, 5, -1, 'Ride the escalator up', () => { liftFrom = L; go(layouts['office-up'], -9.5, 1.3, 0, 'Floor 1'); });
    staffDesks(L, [-6.5, 5.5], [0.6], 6, 0x3b4a5a);
    L.worker(-1, 3.7, 0, { outfit: 0x2f6f8f, task: 'type' });                                   // receptionist
    for (const x of [-8.5, -7, -5.5]) L.worker(x, -7.15, 0, { outfit: 0x4a4a4a, seatY: 0.55, task: 'talk' });   // meeting
    L.worker(1.5, -7.6, 0, { outfit: 0x1f2a36, task: 'type' });                                  // manager
    L.worker(9.4, -7.7, Math.PI, { sit: false, outfit: 0x8a5a4a, task: 'idle' });                 // making a brew
  }

  // =========================== UPSTAIRS: HOME / FLAT ===========================
  {
    const L = makeLayout('home-up', -5100, 60, 0xe9e2d6, 0x9c7a55, { exit: false }), { F, spot, seat } = L;
    L.partZ(-4, 1, 9, [5]); L.partZ(4, 1, 9, [5]);
    L.partX(1, -12, 12, [-8, 0, 8]);
    L.partZ(-4, -9, 1); L.partZ(4, -9, 1);
    // Landing
    L.stairwell(-2.6, 6.3, 4.2, 'Go downstairs', () => { const b = upFrom || { L: layouts.home, x: -2.6, z: 3.0 }; go(b.L, b.x, b.z, 0, 'Downstairs'); }, -1.2, 5.6);
    F.plant(3.2, 8.4); F.art(0, 1.8, 8.82, Math.PI, 0xb57a5a); F.rug(1.2, 4.5, 1.6, 4.2, 0x7a5a8a);
    // Kids' bedroom (front left)
    F.bed(-10.7, 3.2, Math.PI / 2, false, 0xd96a8a); F.bedside(-11.5, 4.7, Math.PI / 2);
    F.desk(-6.0, 8.4, Math.PI, false); F.chair(-6.0, 7.6, 0, 0xe0a030, 'Sit at the desk');
    L.B(0.9, 0.5, 0.5, -10.6, 0.35, 8.3, 0x3d8bd9, true);   // toy box
    F.rug(-8, 4.5, 2.6, 2.2, 0x6fc2a8);
    spot(-10.2, 3.2, 1.8, 'Have a nap', () => hooks.sleep());
    // Guest bedroom (front right)
    F.bed(10.7, 5.0, -Math.PI / 2, true, 0x5a7a4a); F.bedside(11.5, 3.6, -Math.PI / 2); F.bedside(11.5, 6.4, -Math.PI / 2);
    F.wardrobe(6.6, 8.5, Math.PI); F.rug(8.5, 5, 2.6, 3, 0xb8a888);
    spot(9.6, 5.0, 2.0, 'Sleep in the bed', () => hooks.sleep());
    // Family bathroom (back left)
    F.bath(-8, -8.4, 0); F.toilet(-11.5, -4.5, Math.PI / 2); F.basin(-4.5, -5.0, -Math.PI / 2);
    spot(-8, -7.4, 1.6, 'Take a bath', () => hooks.rest(15, 'A warm bath. You feel refreshed.'));
    // Reading room (back middle)
    F.sofa(0, -7.9, 0, 0x8a5a4a); seat(0, -7.9, 0, 0.9, 'Sit on the sofa');
    F.coffeeTable(0, -5.8, 0); F.bookshelf(-3.6, -3.5, Math.PI / 2); F.bookshelf(3.6, -3.5, -Math.PI / 2); F.plant(2.8, -8.3);
    // Home office (back right)
    F.desk(8, -8.3, 0); F.officeChair(8, -7.4, Math.PI); F.bookshelf(11.6, -5, -Math.PI / 2); F.plant(5, -8.3);
    L.light(0, 5, 0.8, 10); L.light(-8, 5, 0.9, 11); L.light(8, 5, 0.9, 11); L.light(-8, -4, 0.8, 10, 0xffffff); L.light(0, -4, 0.8, 10); L.light(8, -4, 0.8, 10);
    L.worker(-6.0, 7.6, 0, { outfit: 0x3d8bd9, pants: 0x3a3a5a, task: 'read' });     // homework
    L.worker(0, -7.6, 0, { seatY: 0.52, outfit: 0x7a5a8a, task: 'read' });            // reading
  }

  // =========================== UPSTAIRS: OFFICE FLOOR 1 ===========================
  {
    const L = makeLayout('office-up', -5300, 60, 0xe9edf1, 0x6f7a86, { exit: false }), { F, spot, seat } = L;
    L.partX(-2.5, -12, 12, [-7, 1.5, 8.5]);
    L.partZ(-2, -9, -2.5); L.partZ(5, -9, -2.5);
    L.lift(11.75, 3.0, -Math.PI / 2, 'Take the lift down to reception', () => { const b = liftFrom || layouts.office; go(b, 10.0, 3.0, Math.PI / 2, 'Ground floor'); });
    L.stairwell(-9.5, 5.1, 5, 'Ride the escalator down', () => { const b = liftFrom || layouts.office; go(b, -8.2, 8.3, 0, 'Ground floor'); }, -9.5, 1.6);
    L.B(1.6, 0.4, 0.04, -9.5, 2.6, 8.82, 0x2f6f8f, false, { emissive: 0x2f6f8f, ei: 0.4 });   // "FLOOR 1" plate
    for (const cx of [-5, 5]) for (const [dx, dz, rot] of [[-0.75, -0.42, Math.PI], [0.75, -0.42, Math.PI], [-0.75, 0.42, 0], [0.75, 0.42, 0]]) {
      for (const cz of [1.0, 5.6]) { F.desk(cx + dx, cz + dz, rot); F.officeChair(cx + dx, cz + dz * 2.6, rot + Math.PI); }
    }
    // Boardroom (back left)
    F.table(-7, -6, 4.6, 1.6, 0, 0x3b2b1f);
    for (const x of [-8.7, -7.3, -5.9]) { F.officeChair(x, -7.3, 0); F.officeChair(x, -4.7, Math.PI); }
    F.screen(-7, -8.78, 0);
    // Break-out area (back middle)
    F.sofa(1.5, -8.0, 0, 0x2f6f8f); seat(1.5, -8.0, 0, 0.9, 'Sit on the sofa'); F.coffeeTable(1.5, -6.0, 0);
    F.sofa(-0.9, -5.6, Math.PI / 2, 0xd98a3d, 1.2); seat(-0.9, -5.6, Math.PI / 2, 0.9, 'Sit in the armchair'); F.plant(4.2, -8.3);
    // Print and server room (back right)
    for (const x of [6.4, 7.6, 8.8]) L.B(0.8, 2.0, 0.9, x, 1.0, -8.4, 0x22262b, true);
    for (const x of [6.4, 7.6, 8.8]) for (let y = 0.4; y < 1.9; y += 0.3) L.B(0.7, 0.03, 0.01, x, y, -7.94, 0x56c8ff, false, { emissive: 0x56c8ff, ei: 1.2 });
    L.B(1.0, 1.0, 0.7, 10.8, 0.5, -4.0, 0xd8d8d8, true);   // printer
    spot(10.8, -4.9, 1.6, 'Use the printer', () => hooks.toast('The printer jams. Of course it does.'));
    L.light(-5, 3, 1.1, 14, 0xf4f8ff); L.light(5, 3, 1.1, 14, 0xf4f8ff); L.light(-7, -6, 0.9, 10, 0xf4f8ff); L.light(1.5, -6, 0.8, 9); L.light(8.5, -6, 0.8, 9, 0xd8f0ff);
    staffDesks(L, [-5, 5], [1.0, 5.6], 9, 0x4a5a6a);
    for (const x of [-8.7, -5.9]) { L.worker(x, -7.3, 0, { outfit: 0x2a2a2a, task: 'talk' }); L.worker(x, -4.7, Math.PI, { outfit: 0x5a4a3a, task: 'talk' }); }
    L.worker(7.6, -7.4, Math.PI, { sit: false, outfit: 0x2f4f6f, task: 'type' });   // IT in the server room
  }


  // =========================== CYBER OFFICE (tech company) ===========================
  {
    const L = makeLayout('cyber', -5400, 0, 0x1c2230, 0x12161d), { F, spot, seat, B } = L;
    const neon = (c, ei = 2) => mat(c, { emissive: c, ei });
    L.partX(-2.5, -12, 12, [-7, 1.5, 8.5], 0x1c2230);
    L.partZ(-2, -9, -2.5, [], 0x1c2230); L.partZ(5, -9, -2.5, [], 0x1c2230);
    for (const [x, z, w, d, c] of [[0, -8.82, 23.5, 0.05, 0x00e5ff], [-11.82, 0, 0.05, 17.5, 0xff2bd6], [11.82, 0, 0.05, 17.5, 0x00e5ff]]) B(w, 0.06, d, x, 3.2, z, neon(c));   // neon strips
    // Reception with a holographic logo
    F.reception(0, 4.6); F.officeChair(-1, 3.7, 0);
    B(4, 0.05, 0.05, 0, 0.82, 5.12, neon(0x00e5ff, 3));
    const holo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 40), neon(0x00e5ff, 3)); holo.position.set(L.x0, 2.3, L.z0 + 4.5); scene.add(holo); L.spin = [holo];
    B(1.2, 0.05, 1.2, 0, 1.18, 4.5, neon(0x00e5ff, 1.2), false, { opacity: 0.4 });
    spot(0, 5.6, 1.8, 'Talk to the receptionist', () => hooks.toast('"Welcome to Nexus Cyber Systems. Visitors need a badge - the dev floor is through there."'));
    // Dev pods: desks with three screens each
    const devDesk = (x, z, rot) => {
      F.desk(x, z, rot, false);
      const g = new THREE.Group(); g.position.set(L.x0 + x, 0.1, L.z0 + z); g.rotation.y = rot; scene.add(g);
      for (const [mx, ry] of [[-0.48, 0.35], [0, 0], [0.48, -0.35]]) { const m = new THREE.Mesh(boxGeo, mat(0x0a0a0a)); m.scale.set(0.46, 0.3, 0.03); m.position.set(mx, 1.08, -0.2); m.rotation.y = ry; g.add(m); const sc = new THREE.Mesh(boxGeo, neon([0x22ff88, 0x00e5ff, 0xff2bd6][Math.abs(Math.round(mx * 2)) % 3], 0.9)); sc.scale.set(0.42, 0.26, 0.005); sc.position.set(mx, 1.08, -0.183); sc.rotation.y = ry; g.add(sc); }
    };
    for (const cx of [-6.5, 5.5]) for (const [dx, dz, rot] of [[-0.75, -0.42, Math.PI], [0.75, -0.42, Math.PI], [-0.75, 0.42, 0], [0.75, 0.42, 0]]) { devDesk(cx + dx, 0.6 + dz, rot); F.officeChair(cx + dx, 0.6 + dz * 2.6, rot + Math.PI); }
    spot(-6.5, 2.4, 1.6, 'Watch the developers code', () => hooks.toast('Green text scrolls past on three screens at once. Someone mutters about a merge conflict.'));
    // Server hall (back left, behind glass)
    for (const x of [-11, -9.6, -8.2, -6.8, -5.4, -4]) { B(0.9, 2.3, 1.0, x, 1.15, -8.2, 0x0d1117, true); for (let y = 0.35; y < 2.2; y += 0.22) B(0.75, 0.025, 0.01, x, y, -7.69, neon(y * 10 % 2 > 1 ? 0x22ff88 : 0x00e5ff, 1.6)); }
    for (const x of [-11, -9.6, -8.2, -6.8, -5.4, -4]) { B(0.9, 2.3, 1.0, x, 1.15, -5.0, 0x0d1117, true); for (let y = 0.35; y < 2.2; y += 0.22) B(0.75, 0.025, 0.01, x, y, -4.49, neon(0x00e5ff, 1.4)); }
    spot(-7.5, -6.6, 2.2, 'Check the servers', () => hooks.toast('Rows of servers hum away. A sign says: DO NOT UNPLUG ANYTHING. EVER.'));
    // AI and robotics lab (back middle): holo table and a robot arm
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.9, 24), mat(0x2a3140)); table.position.set(L.x0 + 1.5, 0.55, L.z0 - 6); scene.add(table);
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat(0x00e5ff, { emissive: 0x00e5ff, ei: 2, opacity: 0.5 })); globe.position.set(L.x0 + 1.5, 1.7, L.z0 - 6); scene.add(globe); L.spin.push(globe);
    colliders.push({ minX: L.x0 + 0.3, maxX: L.x0 + 2.7, minZ: L.z0 - 7.2, maxZ: L.z0 - 4.8 });
    const arm = new THREE.Group(); arm.position.set(L.x0 - 0.8, 0.1, L.z0 - 8.2); scene.add(arm);
    for (const [w, h, y, rx] of [[0.5, 0.4, 0.2, 0], [0.18, 1.0, 0.85, 0.4], [0.14, 0.8, 1.55, -0.9]]) { const p = new THREE.Mesh(boxGeo, mat(0xe8a33d, { metal: 0.4 })); p.scale.set(w, h, w); p.position.y = y; p.rotation.x = rx; arm.add(p); }
    L.spin.push(arm);
    spot(1.5, -4.5, 2.0, 'Talk to the lab AI', () => hooks.toast('"Hello. I am ORACLE. I have analysed the city. The traffic lights are 4% too slow."'));
    // Gaming lounge (back right)
    for (const [x, z, c] of [[7, -5.5, 0xff2bd6], [8.5, -5.2, 0x00e5ff], [10, -5.5, 0x22ff88]]) { const bag = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(c)); bag.scale.y = 0.6; bag.position.set(L.x0 + x, 0.4, L.z0 + z); scene.add(bag); seat(x, z, Math.PI, 0.65, 'Sit on the bean bag'); }
    F.screen(8.5, -8.78, 0); B(0.6, 0.12, 0.35, 8.5, 0.62, -8.3, 0x111111);
    spot(8.5, -6.8, 1.8, 'Play on the console', () => hooks.rest(10, 'You play a quick match on the big screen. Victory!'));
    spot(4, -4.2, 1.4, 'Try the VR headset', () => hooks.toast('You put on the headset and you\'re standing on the moon. Then you walk into a desk.'));
    F.vending(11.4, -3.6, -Math.PI / 2);
    L.lift(11.75, 3.0, -Math.PI / 2, 'Take the lift up to floor 1', () => { liftFrom = L; go(layouts['office-up'], 10.0, 3.0, Math.PI / 2, 'Floor 1'); });
    L.light(-6, 0.6, 0.9, 14, 0x9fe8ff); L.light(5.5, 0.6, 0.9, 14, 0xd9a0ff); L.light(0, 6, 0.8, 10, 0x9fe8ff); L.light(-7, -6, 0.8, 10, 0x8affc8); L.light(1.5, -6, 0.8, 9, 0x9fe8ff); L.light(8.5, -6, 0.8, 9, 0xff9ae8);
    staffDesks(L, [-6.5, 5.5], [0.6], 7, 0x1a1f2a);
    L.worker(-1, 3.7, 0, { outfit: 0x0b0f16, task: 'type' });
    L.worker(-7.5, -6.5, Math.PI, { sit: false, outfit: 0x22262c, task: 'type' });     // checking a rack
    L.worker(1.5, -4.4, Math.PI, { sit: false, outfit: 0xf2f2f2, pants: 0x3a3a3a, task: 'talk' });   // lab coat
    L.worker(7, -5.5, Math.PI, { seatY: 0.42, outfit: 0x8a5cff, task: 'type' }); L.worker(10, -5.5, Math.PI, { seatY: 0.42, outfit: 0x22ff88, pants: 0x1a1a1a, task: 'type' });
  }

  // =========================== COURTHOUSE ===========================
  {
    const L = makeLayout('court', -5500, 0, 0xd9cbb0, 0x6b4a30), { F, spot, seat, B } = L;
    const wood = mat(0x5a3a22), dark = mat(0x3b2616), green = mat(0x2f5a3a);
    L.partX(3, -12, 12, [0]);
    // Lobby: security arch, x-ray belt, benches
    B(0.15, 2.4, 0.5, -3.6, 1.2, 6.5, 0xbfc5cb); B(0.15, 2.4, 0.5, -2.4, 1.2, 6.5, 0xbfc5cb); B(1.35, 0.2, 0.5, -3.0, 2.4, 6.5, 0xbfc5cb);
    B(2.5, 0.9, 0.8, -6, 0.45, 6.5, 0x8a9096, true); B(0.9, 0.7, 0.85, -6, 1.2, 6.5, 0x2b2f33);
    spot(-3, 7.5, 1.6, 'Go through security', () => hooks.toast('Beep. You empty your pockets. Just keys and a few gold coins. "Go ahead."'));
    for (const x of [5, 8.5]) { F.table(x, 7.6, 2.2, 0.5, 0, 0x5a3a22); seat(x, 7.6, Math.PI, 0.85, 'Wait on the bench'); }
    F.vending(11.3, 4.0, -Math.PI / 2);
    spot(9.5, 5, 1.8, 'Talk to the court usher', () => hooks.toast('"Court is in session. You can watch from the public gallery - please keep quiet."'));
    // Courtroom: judge's bench raised at the back
    B(9, 0.6, 3, 0, 0.35, -7.4, dark, true);
    B(6, 1.3, 0.8, 0, 1.3, -6.3, wood, true);
    B(1.0, 1.8, 0.2, 0, 1.6, -8.5, mat(0x7a1f1f));                                   // judge's high-backed chair
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), mat(0xd4af37, { metal: 0.8, rough: 0.3 })); crest.position.set(L.x0, 2.9, L.z0 - 8.8); scene.add(crest);
    B(4.5, 0.08, 0.05, 0, 3.4, -8.8, mat(0xd4af37, { metal: 0.8 }));
    // Witness box, dock, jury box, counsel tables
    B(1.6, 1.1, 0.08, 5, 0.65, -4.5, wood); B(0.08, 1.1, 1.6, 4.2, 0.65, -5.3, wood); B(0.08, 1.1, 1.6, 5.8, 0.65, -5.3, wood);
    B(0.08, 1.1, 2.4, -8.0, 0.65, -1.0, wood); B(2.0, 1.1, 0.08, -9.0, 0.65, 0.2, wood); B(2.0, 1.1, 0.08, -9.0, 0.65, -2.2, wood);
    B(0.06, 1.2, 2.4, -8.0, 1.75, -1.0, mat(0xbfe6ff, { opacity: 0.3 })); B(2.0, 1.2, 0.06, -9.0, 1.75, 0.2, mat(0xbfe6ff, { opacity: 0.3 }));   // glass dock
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) F.chair(10.8 - r * 1.1, -6.8 + k * 1.0, -Math.PI / 2, 0x7a1f1f, 'Sit in the jury box');
    B(0.08, 0.9, 6.4, 9.0, 0.55, -4.3, wood);
    for (const x of [-3, 3]) { F.table(x, -3.2, 3, 1.0, 0, 0x5a3a22); F.chair(x - 0.7, -2.3, Math.PI, 0x2f2f2f, 'Sit at counsel\'s table'); F.chair(x + 0.7, -2.3, Math.PI, 0x2f2f2f, 'Sit at counsel\'s table'); }
    // Public gallery
    for (const z of [-0.3, 1.5]) for (const x of [-4.5, 4.5]) { F.table(x, z, 5, 0.5, 0, 0x5a3a22); for (const dx of [-1.6, 0, 1.6]) seat(x + dx, z, Math.PI, 0.85, 'Watch the trial'); }
    F.rug(0, -3.5, 2, 6, 0x4a1f1f);
    spot(0, -4.8, 1.8, 'Listen to the judge', () => hooks.toast('"Members of the jury, you must consider only the evidence put before you in this court..."'));
    L.light(-6, 6, 0.9, 12); L.light(6, 6, 0.9, 12); L.light(-5, -4, 1.0, 14, 0xfff1d6); L.light(5, -4, 1.0, 14, 0xfff1d6); L.light(0, -7, 0.8, 8, 0xfff1d6);
    L.worker(0, -8.2, 0, { seatY: 1.15, outfit: 0x111111, pants: 0x111111, hair: 0xe8e8e8, task: 'read' });   // the judge
    for (const x of [-3.7, 2.3]) L.worker(x, -2.3, Math.PI, { outfit: 0x1a1a1a, task: 'read' });               // barristers
    L.worker(5, -5.3, -Math.PI / 2, { sit: false, outfit: 0x6a7a8a, task: 'talk' });                           // witness
    L.worker(-9, -1, Math.PI / 2, { sit: false, outfit: 0x8a8a8a, task: 'idle' });                             // in the dock
    for (let k = 0; k < 6; k++) L.worker(10.8 - (k % 2) * 1.1, -6.8 + Math.floor(k / 2) * 2, -Math.PI / 2, { outfit: [0x5a3a3a, 0x3a5a3a, 0x3a3a5a][k % 3], task: 'idle' });   // jurors
    L.worker(-4.5, -0.3, Math.PI, { seatY: 0.82, outfit: 0x7a6a5a, task: 'idle' }); L.worker(4.5, 1.5, Math.PI, { seatY: 0.82, outfit: 0x4a6a7a, task: 'idle' });   // public
    L.worker(9.5, 4.4, Math.PI, { sit: false, outfit: 0x1a1a1a, task: 'idle' }); L.worker(-3, 5.6, 0, { sit: false, outfit: 0x2a3a4a, task: 'idle' });   // usher, security
  }

  // =========================== ARCADE ===========================
  {
    const L = makeLayout('arcade', -5600, 0, 0x22163a, 0x2a1f4f), { F, spot, B } = L;
    const neon = (c, ei = 2) => mat(c, { emissive: c, ei });
    const cols = [0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f, 0xff5a3c, 0x8a5cff];
    for (const [x, z, w, d, c] of [[0, -8.82, 23.5, 0.05, 0xff2bd6], [-11.82, 0, 0.05, 17.5, 0x00e5ff], [11.82, 0, 0.05, 17.5, 0xffd23f]]) B(w, 0.08, d, x, 3.1, z, neon(c));
    let ci = 0;
    const cabinet = (x, z, rot) => {
      const g = new THREE.Group(); g.position.set(L.x0 + x, 0.1, L.z0 + z); g.rotation.y = rot; scene.add(g);
      const c = cols[ci++ % cols.length];
      for (const [w, h, d, px, py, pz, m] of [[0.8, 1.9, 0.75, 0, 0.95, 0, mat(0x15151c)], [0.66, 0.5, 0.02, 0, 1.45, 0.38, neon(c, 1.4)], [0.8, 0.22, 0.2, 0, 1.95, 0.3, neon(c, 2.5)], [0.75, 0.08, 0.35, 0, 1.0, 0.45, mat(0x2b2b33)]]) { const p = new THREE.Mesh(boxGeo, m); p.scale.set(w, h, d); p.position.set(px, py, pz); g.add(p); }
      colliders.push({ minX: L.x0 + x - 0.45, maxX: L.x0 + x + 0.45, minZ: L.z0 + z - 0.45, maxZ: L.z0 + z + 0.45 });
    };
    for (let z = -7.5; z <= 6.5; z += 1.1) { cabinet(-11.3, z, Math.PI / 2); cabinet(11.3, z, -Math.PI / 2); }
    for (let x = -6; x <= 6; x += 1.1) { cabinet(x, -1.2, 0); cabinet(x, -2.4, Math.PI); }
    spot(-10.2, 0, 2.2, 'Play Neon Defender (2 gold)', () => hooks.arcade('game'));
    spot(10.2, 0, 2.2, 'Play Neon Defender (2 gold)', () => hooks.arcade('game'));
    spot(0, 0, 2.0, 'Play Neon Defender (2 gold)', () => hooks.arcade('game'));
    spot(-10.2, -5, 2.0, 'Play Brick Breaker (2 gold)', () => hooks.arcade('bricks'));
    spot(-10.2, 5, 2.0, 'Play Turbo Lanes (2 gold)', () => hooks.arcade('lanes'));
    spot(10.2, -5, 2.0, 'Play Whack-a-Mole (2 gold)', () => hooks.arcade('moles'));
    spot(10.2, 4.5, 2.0, 'Play Hoop Shot (2 gold)', () => hooks.arcade('hoops'));
    // Claw machines, air hockey, dance machine, prize counter
    for (const x of [-7, -5]) {
      B(1.1, 0.9, 1.1, x, 0.45, -7.6, 0xff2bd6, true); B(1.1, 1.3, 1.1, x, 1.55, -7.6, mat(0xbfe6ff, { opacity: 0.25 }));
      for (let k = 0; k < 6; k++) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(cols[k])); ball.position.set(L.x0 + x - 0.3 + (k % 3) * 0.3, 1.05, L.z0 - 7.8 + Math.floor(k / 3) * 0.35); scene.add(ball); }
    }
    spot(-6, -6.4, 1.8, 'Play the claw machine (2 gold)', () => hooks.arcade('claw'));
    for (const x of [3.5, 7]) { F.table(x, -6.5, 2.2, 1.2, 0, 0x1f6f8f); B(2.0, 0.02, 1.0, x, 0.88, -6.5, neon(0x00e5ff, 0.6)); }
    spot(5.2, -5.2, 2.0, 'Play air hockey (2 gold)', () => hooks.arcade('hockey'));
    for (let i = 0; i < 9; i++) B(0.6, 0.12, 0.6, -2.7 + (i % 3) * 0.65, 0.16, 4.5 + Math.floor(i / 3) * 0.65, neon(cols[i % cols.length], 1.2));
    B(2.2, 2.2, 0.3, -2.05, 1.2, 3.4, mat(0x15151c)); B(1.6, 1.0, 0.02, -2.05, 1.6, 3.56, neon(0xff2bd6, 1.2));
    spot(-2.05, 5.2, 1.6, 'Dance on the dance machine (2 gold)', () => hooks.arcade('dance'));
    F.counter(7, 6.8, Math.PI, 4, 0xffd23f, 0x2b2b33);
    for (let k = 0; k < 8; k++) { const prize = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(cols[k % cols.length])); prize.position.set(L.x0 + 5.4 + k * 0.45, 1.25, L.z0 + 7.2); scene.add(prize); }
    spot(7, 5.6, 1.8, 'Swap tickets for a prize', () => hooks.arcade('prize'));
    F.vending(11.3, 8.2, Math.PI);
    L.light(-6, 3, 0.9, 14, 0xff9ae8); L.light(6, 3, 0.9, 14, 0x9fe8ff); L.light(0, -5, 0.9, 14, 0xd9a0ff); L.light(0, 6, 0.7, 10, 0xffe39a);
    L.worker(7, 7.9, Math.PI, { sit: false, outfit: 0xffd23f, pants: 0x22163a, task: 'idle' });   // prize counter
    for (const x of [-3.8, 0.6, 3.9]) L.worker(x, -0.45, Math.PI, { sit: false, outfit: [0xff2bd6, 0x00e5ff, 0x22ff88][Math.abs(Math.round(x)) % 3], task: 'type' });
    L.worker(-10.4, 2.4, -Math.PI / 2, { sit: false, outfit: 0xff5a3c, task: 'type' });
  }


  // =========================== COUNCIL / GOVERNMENT OFFICES ===========================
  {
    const L = makeLayout('gov', -5700, 0, 0xe8e4d8, 0x8a7d6b), { F, spot, seat, B } = L;
    L.partX(-1.5, -12, 12, [-7, 0.5, 8]);
    L.partZ(-3, -9, -1.5); L.partZ(4, -9, -1.5);
    // Front hall: service counters with glass screens, ticket machine, waiting area
    F.counter(8.5, 1.8, 0, 6.5, 0xb8a888, 0xd8d2c4);
    for (let i = 0; i < 3; i++) {
      const cx = 6.3 + i * 2.2;
      B(1.9, 0.9, 0.04, cx, 1.55, 1.8, mat(0xbfe6ff, { opacity: 0.3 }));
      B(0.5, 0.35, 0.04, cx, 2.35, 1.8, mat(0x2f6f8f, { emissive: 0x2f6f8f, ei: 0.6 }));
      F.officeChair(cx, 0.8, Math.PI); L.worker(cx, 0.8, Math.PI, { outfit: [0x233e54, 0x4a3a5a, 0x3a5a4a][i], task: 'type' });
      spot(cx, 2.8, 1.1, `Speak to the clerk at window ${i + 1}`, () => hooks.toast(['"Council tax? Second floor... just kidding, it\'s me. How can I help?"', '"Parking permits are window 3. This is window 2. But fine, I\'ll do it."', '"Next please! Do you have your ticket?"'][i]));
    }
    B(0.6, 1.4, 0.5, 3.5, 0.7, 7.8, 0xd0281f, true); B(0.4, 0.25, 0.02, 3.5, 1.2, 7.54, mat(0xffffff, { emissive: 0xffffff, ei: 0.4 }));
    spot(3.5, 7.0, 1.4, 'Take a queue ticket', () => hooks.toast(`Ticket number ${100 + Math.floor(Math.random() * 60)}. Now serving: ${90 + Math.floor(Math.random() * 10)}.`));
    for (const z of [5.4, 7.0]) for (let x = -10; x <= -5; x += 1) F.chair(x, z, 0, 0x2f6f8f, 'Wait to be called');
    L.worker(-8, 5.4, 0, { seatY: 0.55, outfit: 0x7a5a3a, task: 'idle' }); L.worker(-6, 7.0, 0, { seatY: 0.55, outfit: 0x3a5a7a, task: 'idle' });
    F.reception(-1, 4.4); L.worker(-2, 3.5, 0, { outfit: 0x233e54, task: 'type' }); F.officeChair(-2, 3.5, 0);
    spot(-1, 5.4, 1.8, 'Ask at the front desk', () => hooks.toast('"Welcome to the council offices. Records library is through the left door, the mayor\'s office is on the right."'));
    F.plant(11.3, 8.4); F.plant(-11.3, 3.2); F.vending(-11.3, 8.3, Math.PI / 2);
    L.lift(-11.75, 1.8, Math.PI / 2, 'Take the lift up to floor 1', () => { liftFrom = L; go(layouts['office-up'], 10.0, 3.0, Math.PI / 2, 'Floor 1'); });
    // Records library (back left)
    for (const z of [-3.2, -5.4, -7.6]) for (let x = -11; x <= -6; x += 1.25) F.bookshelf(x, z, 0, 1.2);
    F.table(-4.4, -5.5, 1.0, 2.2); F.chair(-4.4, -4.6, Math.PI); L.worker(-4.4, -6.4, 0, { outfit: 0x5a4a3a, task: 'read' }); F.chair(-4.4, -6.4, 0);
    spot(-6.5, -2.4, 1.8, 'Read the council records', () => hooks.toast('Planning permission for the Aegis Prime Generator, 400 pages. Minutes of the 1987 bin collection debate. A map with the hidden mountain crossed out?'));
    // Open-plan clerks (back middle)
    for (const [x, z] of [[-1.2, -4.2], [2, -4.2], [-1.2, -7.4], [2, -7.4]]) { F.desk(x, z, Math.PI); F.officeChair(x, z - 0.9, 0); L.worker(x, z - 0.9, 0, { outfit: 0x3b4a5a, task: 'type' }); }
    // Mayor's office (back right)
    F.desk(8, -7.6, Math.PI); F.officeChair(8, -8.4, 0); L.worker(8, -8.4, 0, { outfit: 0x1a1a1a, task: 'read' });
    F.chair(7.4, -6.4, Math.PI); F.chair(8.6, -6.4, Math.PI); F.rug(8, -6, 3.5, 3, 0x7a1f1f);
    B(0.06, 2.2, 0.06, 5.2, 1.1, -8.4, 0x8a8a8a); B(0.9, 0.6, 0.02, 5.65, 1.9, -8.4, 0x2d5d3a);
    F.art(8, 2.0, -8.82, 0, 0x8a6a4a); F.bookshelf(11.6, -4, -Math.PI / 2);
    spot(8, -5.4, 1.8, 'Meet the mayor', () => hooks.toast('"Ah, a citizen! The new leisure park? My idea. The business district? Also my idea. Mostly."'));
    L.light(-6, 5, 1.0, 13); L.light(6, 4, 1.0, 13); L.light(-7.5, -5.5, 0.9, 11); L.light(0.5, -5.5, 0.9, 10, 0xf4f8ff); L.light(8, -5.5, 0.9, 10);
  }

  // =========================== PUBLIC LIBRARY ===========================
  {
    const L = makeLayout('library', -5800, 0, 0xe3d2b4, 0x8a6a46), { F, spot, seat, B } = L;
    for (const z of [-7.6, -5.0, -2.4, 0.2]) for (let x = -9.8; x <= -3.5; x += 1.25) F.bookshelf(x, z, 0, 1.2);
    for (let z = -8; z <= 4; z += 1.3) F.bookshelf(-11.6, z, Math.PI / 2, 1.2);
    for (let x = 1; x <= 11; x += 1.25) F.bookshelf(x, -8.65, 0, 1.2);
    F.reception(0, 5.4); F.officeChair(-1, 4.5, 0); L.worker(-1, 4.5, 0, { outfit: 0x5a3d6b, task: 'type' });
    spot(0, 6.4, 1.8, 'Borrow a book', () => hooks.rest(5, ['You borrow "The History of the Aegis Shield". It is very long.', 'You borrow a cookbook. Hunger intensifies.', 'You borrow "Dungeons for Beginners". Chapter 1: don\'t.'][Math.floor(Math.random() * 3)]));
    for (const [x, z] of [[4, -4], [8, -4]]) {
      F.table(x, z, 2.2, 1.2);
      for (const dx of [-0.6, 0.6]) { F.chair(x + dx, z - 0.85, 0, 0x6b4a30, 'Sit and read'); F.chair(x + dx, z + 0.85, Math.PI, 0x6b4a30, 'Sit and read'); }
      L.worker(x - 0.6, z - 0.85, 0, { outfit: 0x4a6a5a, task: 'read' }); L.worker(x + 0.6, z + 0.85, Math.PI, { outfit: 0x7a4a4a, task: 'read' });
    }
    for (const z of [-0.5, 1.2, 2.9]) { F.desk(11.3, z, -Math.PI / 2); F.officeChair(10.4, z, Math.PI / 2); }
    L.worker(10.4, -0.5, Math.PI / 2, { outfit: 0x2f6f8f, task: 'type' });
    spot(10, 1.2, 1.8, 'Use a library computer', () => hooks.toast('You look up "how to find the hidden mountain". The search history is full of people asking the same thing.'));
    F.rug(5, 7.2, 4, 2.4, 0xe0a030); F.vending(9.5, 8.3, Math.PI);
    for (const [x, c] of [[3.8, 0xff5a3c], [6.2, 0x3d8bd9]]) { const bag = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), mat(c)); bag.scale.y = 0.6; bag.position.set(L.x0 + x, 0.35, L.z0 + 7.2); scene.add(bag); seat(x, 7.2, Math.PI, 0.6, 'Sit on the bean bag'); }
    B(3.2, 0.5, 0.04, 0, 3.0, -8.78, 0x2a2516); B(1.6, 0.25, 0.01, 0, 3.0, -8.75, mat(0xf2e6c4, { emissive: 0xf2e6c4, ei: 0.3 }));   // QUIET PLEASE plate
    L.light(-7, -3, 1.0, 14, 0xffecc2); L.light(6, -3, 1.0, 14, 0xffecc2); L.light(0, 5, 0.9, 12, 0xffecc2);
  }

  // =========================== PUB ===========================
  {
    const L = makeLayout('pub', -5900, 0, 0x6b3f26, 0x5a3a22), { F, spot, seat, B, Cyl } = L;
    const wood = 0x4a2c18, brass = mat(0xc9a24a, { metal: 0.8, rough: 0.3 });
    // The bar runs along the back wall, with stools in front and bottles behind.
    F.counter(0, -5.6, 0, 10, 0x3a2414, 0x5a3420);
    B(10, 0.05, 0.05, 0, 0.25, -5.25, brass);   // foot rail
    for (let i = 0; i < 5; i++) { const p = Cyl(0.035, 0.035, 0.5, -1.2 + i * 0.6, 1.2, -5.7, brass); }   // beer pumps
    for (let r = 0; r < 3; r++) { B(9, 0.05, 0.35, 0, 1.3 + r * 0.55, -8.6, wood); for (let k = 0; k < 18; k++) Cyl(0.05, 0.05, 0.3, -4.2 + k * 0.5, 1.48 + r * 0.55, -8.6, [0x2f6b2f, 0x8a3b1f, 0xc9a24a, 0x2a3f6b][(k + r) % 4], undefined, 8, { opacity: 0.85 }); }
    const stool = (x, z) => { Cyl(0.22, 0.22, 0.06, x, 0.83, z, 0x7a1f1f); Cyl(0.04, 0.04, 0.72, x, 0.46, z, 0x2a2a2a); Cyl(0.2, 0.22, 0.04, x, 0.12, z, 0x2a2a2a); seat(x, z, Math.PI, 1.27, 'Sit at the bar'); };
    for (let x = -4; x <= 4; x += 1.3) stool(x, -4.6);
    spot(0, -4.2, 2.6, 'Order at the bar', () => hooks.shop('The Rusty Anchor (pub)', 'pub'));
    L.worker(-1.5, -6.7, 0, { sit: false, outfit: 0x1a1a1a, pants: 0x1a1a1a, task: 'talk' });
    L.worker(1.8, -6.7, 0, { sit: false, outfit: 0xf2f2f2, pants: 0x1a1a1a, task: 'type' });
    L.worker(-2.7, -4.6, Math.PI, { seatY: 0.9, outfit: 0x2f4f6f, task: 'talk' });
    L.worker(2.5, -4.6, Math.PI, { seatY: 0.9, outfit: 0x7a4a2a, task: 'talk' });
    // Booths and tables
    for (const [x, z] of [[-8, 1], [-8, 5], [8, 1], [8, 5]]) {
      F.table(x, z, 1.6, 0.9, 0, wood);
      F.chair(x - 0.45, z - 0.75, 0, 0x7a1f1f, 'Sit at the table'); F.chair(x + 0.45, z - 0.75, 0, 0x7a1f1f, 'Sit at the table');
      F.chair(x - 0.45, z + 0.75, Math.PI, 0x7a1f1f, 'Sit at the table'); F.chair(x + 0.45, z + 0.75, Math.PI, 0x7a1f1f, 'Sit at the table');
    }
    L.worker(-8.45, 0.25, 0, { outfit: 0x5b8a72, task: 'talk' }); L.worker(-7.55, 1.75, Math.PI, { outfit: 0x8a5b72, task: 'talk' });
    L.worker(8.45, 5.75, Math.PI, { outfit: 0x4a4a8a, task: 'read' });
    // Pool table, darts, jukebox, fireplace
    F.table(0, 2.2, 2.6, 1.4, 0, 0x3b2414); B(2.4, 0.03, 1.2, 0, 0.8, 2.2, 0x1f6b3a);
    spot(0, 3.5, 2.0, 'Play a game of pool', () => hooks.toast(['You pot three in a row, then the white. Classic.', 'Clean break! The regulars nod.', 'You win on the black. Free round? No.'][Math.floor(Math.random() * 3)]));
    Cyl(0.45, 0.45, 0.05, 11.85, 1.75, -2, 0x2a2a2a).rotation.z = Math.PI / 2; Cyl(0.32, 0.32, 0.06, 11.84, 1.75, -2, 0xe8d9b0).rotation.z = Math.PI / 2;
    spot(10.6, -2, 1.8, 'Throw some darts', () => { const t = 20 + Math.floor(Math.random() * 161); hooks.toast(t === 180 ? 'ONE HUNDRED AND EIGHTY!' : `You score ${t}.`); });
    B(0.9, 1.6, 0.6, -11.4, 0.8, -2.5, mat(0x8a3b1f, { emissive: 0xff7a2a, ei: 0.35 }));
    spot(-10.3, -2.5, 1.6, 'Put a song on the jukebox', () => hooks.toast(['🎵 An old sea shanty starts up. Everyone sings badly.', '🎵 A rock classic. The barman air-guitars.', '🎵 Something slow. Two old regulars start dancing.'][Math.floor(Math.random() * 3)]));
    B(2.2, 1.2, 0.5, -11.6, 0.6, 5, 0x4a4a4a); B(1.4, 0.6, 0.1, -11.4, 0.5, 5, mat(0xff6a1f, { emissive: 0xff6a1f, ei: 1.6 }));   // fireplace
    B(3.2, 0.6, 0.05, 0, 3.0, 8.82, 0x2a1810);   // name board over the door
    L.light(-6, 2, 0.8, 12, 0xffb36b); L.light(6, 2, 0.8, 12, 0xffb36b); L.light(0, -5, 0.9, 12, 0xffc98a); L.light(-10, 5, 0.6, 7, 0xff7a2a);
  }

  // =========================== NIGHTCLUB ===========================
  {
    const L = makeLayout('nightclub', -6000, 0, 0x0c0a14, 0x14101e), { F, spot, B, Cyl } = L;
    const neon = (c, ei = 2) => mat(c, { emissive: c, ei });
    const cols = [0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f, 0x8a5cff];
    // Light-up dance floor in the middle: the tiles change colour to the beat.
    L.flash = [];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) L.flash.push(B(1.15, 0.04, 1.15, -4.2 + i * 1.2, 0.12, -2.5 + j * 1.2, mat(cols[(i + j) % 5], { emissive: cols[(i + j) % 5], ei: 1 }).clone()));
    spot(0, 0, 3.5, 'Dance', () => hooks.dance?.() ?? hooks.toast('You throw some shapes on the dance floor. The crowd cheers.'));
    // DJ booth on a stage at the back
    B(8, 0.5, 2.6, 0, 0.3, -7.6, 0x1a1a24, true);
    B(3.4, 1.1, 0.8, 0, 1.1, -7.0, 0x111111); B(3.2, 0.06, 0.6, 0, 1.68, -7.0, neon(0x00e5ff, 1));
    for (const x of [-0.8, 0.8]) Cyl(0.25, 0.25, 0.04, x, 1.72, -7.0, 0x222222);
    for (const x of [-3.6, 3.6]) B(1, 2.2, 0.9, x, 1.6, -8.0, 0x111111);   // speaker stacks
    L.worker(0, -7.6, 0, { sit: false, outfit: 0x111111, pants: 0x111111, task: 'dj' });
    spot(0, -5.4, 2.0, 'Request a song from the DJ', () => hooks.toast(['🎧 "Got you." The bass drops and the floor goes mad.', '🎧 The DJ points at you and plays it next.', '🎧 "Not tonight, mate." Fair.'][Math.floor(Math.random() * 3)]));
    // Bar along the right wall
    F.counter(10.6, 1, -Math.PI / 2, 8, 0x111111, 0x1a1a24); B(0.05, 0.1, 8, 10.25, 0.6, 1, neon(0xff2bd6, 2));
    spot(9.2, 1, 2.4, 'Get a drink at the bar', () => hooks.shop('Club Neon bar', 'club'));
    L.worker(11.4, 0, -Math.PI / 2, { sit: false, outfit: 0x2a2a2a, task: 'type' });
    // VIP booths on the left
    for (const z of [-4, 0, 4]) { F.sofa(-10.6, z, Math.PI / 2, 0x5a1f6b, 2.6); F.coffeeTable(-9.3, z, Math.PI / 2); }
    B(0.05, 0.08, 14, -11.8, 2.8, 0, neon(0x8a5cff));
    // Dancers on the floor
    for (let k = 0; k < 9; k++) L.worker(-3.6 + (k % 3) * 3 + (k > 2 ? 0.6 : 0), -2 + Math.floor(k / 3) * 1.8, Math.random() * 6, { sit: false, outfit: cols[k % 5], task: 'dance' });
    // Door staff by the entrance
    L.worker(-2.4, 7.6, Math.PI, { sit: false, outfit: 0x111111, pants: 0x111111, task: 'idle' });
    spot(-2.4, 6.6, 1.5, 'Talk to the bouncer', () => hooks.toast('"No trainers, no trouble. You\'re fine. Enjoy your night."'));
    for (const [x, c] of [[-6, 0xff2bd6], [6, 0x00e5ff], [0, 0x22ff88]]) L.light(x, 0, 1.4, 16, c);
    L.light(0, -7, 1.0, 10, 0x8a5cff); L.light(10, 1, 0.7, 9, 0xff2bd6);
  }

  // =========================== RESTAURANT ===========================
  {
    const L = makeLayout('restaurant', -6100, 0, 0xefe4d0, 0x7a5636), { F, spot, B, Cyl } = L;
    L.partX(-3.6, -12, 12, [8]);
    // Dining room: tables laid with white cloths, candles and plates
    for (const [x, z] of [[-8, 4.5], [-4, 4.5], [0, 4.5], [4, 4.5], [-8, 0.3], [-4, 0.3], [0, 0.3], [4, 0.3]]) {
      F.table(x, z, 1.4, 0.9, 0, 0x5a3a22); B(1.5, 0.02, 1.0, x, 0.79, z, 0xffffff);
      for (const dz of [-0.25, 0.25]) Cyl(0.13, 0.13, 0.015, x, 0.81, z + dz, 0xf6f6f2);
      Cyl(0.025, 0.025, 0.14, x, 0.88, z, mat(0xfff3d0, { emissive: 0xffc46b, ei: 1.2 }));
      F.chair(x, z - 0.75, 0, 0x3b2b1f, 'Take a seat'); F.chair(x, z + 0.75, Math.PI, 0x3b2b1f, 'Take a seat');
    }
    L.worker(-8, -0.45, 0, { outfit: 0x8a5b72, task: 'talk' }); L.worker(-8, 1.05, Math.PI, { outfit: 0x2f4f6f, task: 'talk' });
    L.worker(0, 3.75, 0, { outfit: 0x5b8a72, task: 'talk' }); L.worker(4, 5.25, Math.PI, { outfit: 0x7a4a2a, task: 'read' });
    // Host stand and waiters
    B(0.9, 1.1, 0.6, 9, 0.55, 7, 0x3b2b1f); L.worker(9, 6.2, 0, { sit: false, outfit: 0x1a1a1a, pants: 0x1a1a1a, task: 'idle' });
    spot(9, 7.9, 1.8, 'Ask for a table', () => hooks.toast('"Table for one? Right this way. Any seat you like — a waiter will bring the menu."'));
    for (const [x, z] of [[-6, 2.4], [2, 2.4]]) L.worker(x, z, Math.random() * 6, { sit: false, outfit: 0xf2f2f2, pants: 0x1a1a1a, task: 'idle' });
    for (const [x, z] of [[-8, 1.4], [-4, 1.4], [0, 1.4], [4, 1.4], [-8, 5.6], [-4, 5.6], [0, 5.6], [4, 5.6]]) spot(x, z, 1.2, 'Order from the menu', () => hooks.shop('Bella Vista (restaurant)', 'restaurant'));
    spot(9, 2.5, 2.4, 'Order from the menu', () => hooks.shop('Bella Vista (restaurant)', 'restaurant'));
    // Open kitchen at the back: ranges, prep counters, chefs
    for (let x = -10; x <= 2; x += 0.62) F.cooker(x, -8.4, 0);
    F.counter(-4, -6, Math.PI, 8, 0xc8ccd0, 0x9aa0a6); B(8, 0.04, 0.6, -4, 1.4, -6, 0xc8ccd0);   // pass with heat lamps
    for (let x = -7.5; x <= -0.5; x += 1.4) B(0.3, 0.08, 0.3, x, 1.9, -6, mat(0xff7a2a, { emissive: 0xff7a2a, ei: 1.5 }));
    F.fridge(5, -8.4, 0); F.fridge(6, -8.4, 0); F.sink(8, -8.5, 0); F.counter(8, -8.5, 0, 2);
    for (const [x, z] of [[-8, -7.6], [-4, -7.6], [0, -7.6]]) L.worker(x, z, Math.PI, { sit: false, outfit: 0xffffff, pants: 0x2a2a2a, task: 'cook' });
    L.worker(-2, -5.2, Math.PI, { sit: false, outfit: 0xf2f2f2, pants: 0x1a1a1a, task: 'idle' });
    spot(-4, -4.6, 1.8, 'Watch the chefs', () => hooks.toast('Flames leap from a pan. "Service! Two carbonara, one steak, table six!"'));
    F.plant(-11.3, 8.4); F.plant(11.3, 8.4); F.art(-6, 2.0, -3.5, Math.PI, 0x8a6a4a); F.art(2, 2.0, -3.5, Math.PI, 0x5a6a8a);
    L.light(-6, 2.5, 0.9, 13, 0xffd9a0); L.light(2, 2.5, 0.9, 13, 0xffd9a0); L.light(-4, -6.5, 1.1, 12, 0xffffff); L.light(7, -6.5, 0.8, 10, 0xffffff);
  }

  // =========================== CASINO ===========================
  {
    const L = makeLayout('casino', -6200, 0, 0x5a0f1f, 0x7a1f2a), { F, spot, B, Cyl } = L;
    const gold = mat(0xd4af37, { metal: 0.8, rough: 0.3 }), felt = mat(0x0e5a34), wood = 0x4a2c18;
    const neon = (c, ei = 2) => mat(c, { emissive: c, ei });
    B(23.6, 0.08, 0.05, 0, 3.1, -8.82, neon(0xffd23f)); B(0.05, 0.08, 17.6, -11.82, 3.1, 0, neon(0xff2b4a)); B(0.05, 0.08, 17.6, 11.82, 3.1, 0, neon(0xff2b4a));
    // rows of slot machines along both walls
    const slot = (x, z, rot, c) => {
      const g = new THREE.Group(); g.position.set(L.x0 + x, 0.1, L.z0 + z); g.rotation.y = rot; scene.add(g);
      for (const [w, h, d, px, py, pz, m] of [[0.75, 1.7, 0.7, 0, 0.85, 0, mat(0x1a1a22)], [0.6, 0.45, 0.02, 0, 1.3, 0.36, neon(c, 1.3)], [0.7, 0.25, 0.25, 0, 1.85, 0.2, neon(0xffd23f, 2)], [0.65, 0.1, 0.3, 0, 0.95, 0.42, gold]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); p.position.set(px, py, pz); g.add(p); }
      colliders.push({ minX: L.x0 + x - 0.42, maxX: L.x0 + x + 0.42, minZ: L.z0 + z - 0.42, maxZ: L.z0 + z + 0.42 });
    };
    const cols = [0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f, 0xff5a3c];
    for (let z = -7.6, k = 0; z <= 5.6; z += 1.0, k++) { slot(-11.3, z, Math.PI / 2, cols[k % 5]); slot(11.3, z, -Math.PI / 2, cols[(k + 2) % 5]); }
    for (const sx of [-1, 1]) spot(sx * 10.1, -3, 3.2, 'Play the slot machines', () => hooks.casino?.('slots')), spot(sx * 10.1, 3, 3.2, 'Play the slot machines', () => hooks.casino?.('slots'));
    // roulette tables
    for (const x of [-5.5, 5.5]) {
      F.table(x, -4.5, 3.4, 1.6, 0, wood); B(3.2, 0.03, 1.4, x, 0.81, -4.5, felt);
      const wheel = Cyl(0.55, 0.55, 0.12, x - 1.1, 0.88, -4.5, mat(0x3a1a0a)); L.spin = L.spin || []; const top = Cyl(0.42, 0.42, 0.04, x - 1.1, 0.95, -4.5, gold); L.spin.push(top);
      L.worker(x, -5.6, 0, { sit: false, outfit: 0x111111, pants: 0x111111, task: 'type' });
      spot(x, -3.2, 2.2, 'Play roulette', () => hooks.casino?.('roulette'));
    }
    // blackjack tables (half-moon) with dealers
    for (const x of [-5.5, 0, 5.5]) {
      Cyl(1.4, 1.4, 0.08, x, 0.8, 1.6, wood); Cyl(1.3, 1.3, 0.09, x, 0.81, 1.6, felt);
      L.worker(x, 0.4, 0, { sit: false, outfit: 0xf2f2f2, pants: 0x111111, task: 'type' });
      F.chair(x - 0.9, 2.7, Math.PI, 0x7a1f2a, 'Sit at the blackjack table'); F.chair(x + 0.9, 2.7, Math.PI, 0x7a1f2a, 'Sit at the blackjack table');
      spot(x, 2.9, 1.6, 'Play blackjack', () => hooks.casino?.('blackjack'));
    }
    L.worker(-6.4, 2.7, Math.PI, { outfit: 0x2f4f6f, task: 'talk', seatY: 0.58 }); L.worker(0.9, 2.7, Math.PI, { outfit: 0x7a4a2a, task: 'talk', seatY: 0.58 });
    // poker table, cashier cage, bar
    F.table(0, -7.2, 3, 1.6, 0, wood); B(2.8, 0.03, 1.4, 0, 0.81, -7.2, felt);
    for (const [dx, dz, r] of [[-1.2, -0.9, 0], [1.2, -0.9, 0], [-1.2, 0.9, Math.PI], [1.2, 0.9, Math.PI]]) L.worker(dx, -7.2 + dz, r, { outfit: cols[Math.abs(dx * 3 + dz) | 0 % 5], task: 'talk', seatY: 0.58 });
    spot(0, -5.6, 1.8, 'Watch the high-stakes poker', () => hooks.toast(['"All in." The table goes quiet.', 'A player shows a royal flush. Gasps all round.', '"Fold." Someone loses a fortune with a straight face.'][Math.floor(Math.random() * 3)]));
    B(4, 2.4, 0.15, 8, 1.2, 7.4, mat(0x2a2a2a, { metal: 0.6 })); B(4, 0.1, 0.6, 8, 1.1, 7.1, gold);
    L.worker(8, 8.2, Math.PI, { sit: false, outfit: 0x1a2a3a, task: 'type' });
    spot(8, 6.2, 1.8, 'Talk to the cashier', () => hooks.toast('"Chips are gold here, sir or madam. Play responsibly. The house always wins in the end."'));
    F.counter(-8, 7.2, Math.PI, 5, 0x2a1414, 0x4a2a1a);
    spot(-8, 6, 2.2, 'Get a drink at the casino bar', () => hooks.shop('Casino bar', 'club'));
    L.worker(-8, 8.1, Math.PI, { sit: false, outfit: 0x111111, task: 'type' });
    L.worker(-2.4, 7.6, Math.PI, { sit: false, outfit: 0x111111, pants: 0x111111, task: 'idle' });   // security
    for (const [x, z] of [[-5, 0], [5, 0], [0, -4]]) B(1.6, 0.6, 0.6, x, 3.2, z, neon(0xfff1c4, 1.5));   // chandeliers
    L.light(-5, 0, 1.0, 14, 0xffd9a0); L.light(5, 0, 1.0, 14, 0xffd9a0); L.light(0, -6, 0.9, 12, 0xffe6b0); L.light(0, 6, 0.8, 10, 0xff9a9a);
  }

  // =========================== CHURCH ===========================
  {
    const L = makeLayout('church', -6300, 0, 0xd9d2c0, 0x6b5a48), { F, spot, B, Cyl } = L;
    const wood = 0x5a3a22, gold = mat(0xd4af37, { metal: 0.8, rough: 0.3 });
    // pews either side of the aisle, facing the altar at the back
    for (let z = -3; z <= 6; z += 1.6) for (const sx of [-1, 1]) {
      B(7, 0.12, 0.55, sx * 5, 0.5, z, wood); B(7, 0.6, 0.1, sx * 5, 0.85, z + 0.28, wood);
      for (let k = 0; k < 4; k++) L.seatOnly?.(sx * 5 - 2.6 + k * 1.75, z, Math.PI);
    }
    for (let z = -3; z <= 6; z += 1.6) for (const sx of [-1, 1]) spot(sx * 5, z - 0.6, 1.0, 'Sit and pray', () => hooks.toast(['A quiet moment. You feel calmer.', 'Candlelight flickers. The organ hums softly.', 'You sit in silence for a while.'][Math.floor(Math.random() * 3)]));
    L.worker(-6, 1.8, Math.PI, { outfit: 0x4a4a6a, task: 'read', seatY: 0.58 }); L.worker(4, 4.9, Math.PI, { outfit: 0x6a4a3a, task: 'read', seatY: 0.58 }); L.worker(5.5, -1.4, Math.PI, { outfit: 0x2f4f6f, task: 'read', seatY: 0.58 });
    // altar, steps, cross, candles, lectern, organ
    B(10, 0.3, 4, 0, 0.25, -7, 0x8a7d6b); B(3.2, 1.1, 1.2, 0, 0.95, -7.2, mat(0xf2ede0));
    B(0.25, 3.2, 0.25, 0, 3.0, -8.6, gold); B(1.6, 0.25, 0.25, 0, 3.7, -8.6, gold);
    for (const x of [-1.2, 1.2]) { Cyl(0.05, 0.05, 0.5, x, 1.75, -7.2, mat(0xfff6e0)); Cyl(0.04, 0.02, 0.1, x, 2.05, -7.2, mat(0xffc46b, { emissive: 0xffa21f, ei: 2 })); }
    B(0.7, 1.2, 0.5, 3.5, 1.0, -6, wood);
    L.worker(0, -8.1, 0, { sit: false, outfit: 0x111111, pants: 0x111111, task: 'read' });   // the priest
    spot(0, -5.2, 2.2, 'Talk to the priest', () => hooks.toast(['"Welcome, child. All are welcome here, whoever you are."', '"Sunday service is at ten. The choir could use another voice."', '"Even hunters need somewhere quiet. Rest a while."'][Math.floor(Math.random() * 3)]));
    B(4, 2.6, 1, -8.5, 1.3, -7.6, wood); for (let k = 0; k < 9; k++) Cyl(0.08, 0.08, 1.6 + (k % 3) * 0.4, -10 + k * 0.38, 3.2, -7.9, gold);
    spot(-8.5, -6.4, 1.6, 'Play the organ', () => hooks.toast('🎶 Deep chords fill the church. Someone in the pews starts to hum along.'));
    // stained glass windows along the walls
    const glassCols = [0x7a5cff, 0xff2b4a, 0x22aaff, 0xffd23f, 0x22cc66];
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) B(0.05, 2.2, 1.2, sx * 11.85, 2.0, -5 + i * 3.4, mat(glassCols[(i + (sx > 0 ? 2 : 0)) % 5], { emissive: glassCols[(i + (sx > 0 ? 2 : 0)) % 5], ei: 0.9 }));
    B(2.4, 2.4, 0.05, 0, 2.6, -8.85, mat(0x7a5cff, { emissive: 0x7a5cff, ei: 1.1 }));
    spot(9.5, 7.6, 1.6, 'Light a candle (1 gold)', () => hooks.toast('🕯️ You light a candle and make a wish.'));
    L.light(0, -6, 1.1, 14, 0xffe6b0); L.light(-5, 2, 0.7, 12, 0xfff1d0); L.light(5, 2, 0.7, 12, 0xfff1d0);
  }

  // =========================== HOTEL LOBBY + ROOM ===========================
  {
    const L = makeLayout('hotel', -6500, 0, 0xe9e2d0, 0x4a3524), { F, spot, B, Cyl } = L;
    const gold = mat(0xd4af37, { metal: 0.8, rough: 0.3 }), marble = mat(0xf2efe8, { rough: 0.25, metal: 0.1 });
    B(23.6, 0.02, 17.6, 0, 0.11, 0, marble);                                                       // marble floor
    // reception desk with two receptionists and a key board behind
    F.counter(0, -6.2, 0, 7, 0x2a1a10, 0x3a2414); B(7, 0.06, 0.9, 0, 1.12, -6.2, gold);
    for (let i = 0; i < 12; i++) Cyl(0.06, 0.06, 0.02, -2.5 + (i % 6) * 1, 1.6 + Math.floor(i / 6) * 0.4, -8.8, gold);
    L.worker(-1.5, -7.2, 0, { sit: false, outfit: 0x1a2a3a, pants: 0x1a1a1a, task: 'type' }); L.worker(1.5, -7.2, 0, { sit: false, outfit: 0x1a2a3a, pants: 0x1a1a1a, task: 'talk' });
    spot(0, -4.8, 2.4, 'Check in at reception (book a room)', () => hooks.hotel?.(() => go(layouts['hotel-room'], 0, 6.5, 0, 'Your room. Sleep, order room service, or take the lift back down.')));
    // lifts and a grand staircase look
    for (const x of [-9, -6.5]) { B(2, 2.6, 0.12, x, 1.3, -8.85, mat(0xb8c1c5, { metal: 0.8, rough: 0.25 })); B(0.6, 0.2, 0.05, x, 2.8, -8.8, mat(0xffd23f, { emissive: 0xffd23f, ei: 1 })); }
    spot(-7.75, -7.6, 2.0, 'Call the lift to your room', () => hooks.hotelRoom?.(() => go(layouts['hotel-room'], 0, 6.5, 0, 'Your room.')) ?? hooks.toast('Book a room at reception first.'));
    // lounge: sofas, coffee tables, plants, chandelier, piano
    for (const [x, z, r] of [[-8, 1, Math.PI / 2], [-8, 5, Math.PI / 2], [8, 1, -Math.PI / 2]]) { F.sofa(x, z, r, 0x7a1f2a, 2.6); F.coffeeTable(x + (x < 0 ? 1.4 : -1.4), z, r); }
    L.worker(-8, 1, Math.PI / 2, { outfit: 0x5b8a72, task: 'read', seatY: 0.58 }); L.worker(8, 1, -Math.PI / 2, { outfit: 0x8a5b72, task: 'talk', seatY: 0.58 });
    F.plant(-11.2, -8.2); F.plant(11.2, -8.2); F.plant(-11.2, 8.2); F.plant(11.2, 8.2);
    B(2.2, 0.5, 2.2, 0, 3.35, 0, mat(0xfff1c4, { emissive: 0xfff1c4, ei: 1.4 }));
    B(1.8, 1.0, 0.9, 7.5, 0.6, 6, 0x111111); spot(7.5, 4.9, 1.5, 'Play the lobby piano', () => hooks.toast('🎹 You play a soft tune. A guest gives a small round of applause.'));
    // hotel restaurant corner and bar
    F.counter(8, -2.5, -Math.PI / 2, 4, 0x2a1414, 0x4a2a1a); spot(6.6, -2.5, 1.8, 'Eat at the hotel restaurant', () => hooks.shop('Hotel restaurant', 'restaurant'));
    L.worker(9.3, -2.5, -Math.PI / 2, { sit: false, outfit: 0xf2f2f2, task: 'type' });
    L.worker(4, 7.5, Math.PI, { sit: false, outfit: 0x7a1f1f, pants: 0x1a1a1a, task: 'idle' });   // the porter
    spot(4, 6.3, 1.6, 'Talk to the porter', () => hooks.toast('"Welcome! Rooms from 40 gold a night. A good night\'s sleep restores you fully, and you wake at sunrise."'));
    L.light(0, 0, 1.2, 16, 0xffe6b0); L.light(-8, 3, 0.8, 10, 0xffd9a0); L.light(8, -2, 0.8, 10, 0xffd9a0);
  }
  {
    const L = makeLayout('hotel-room', -6600, 0, 0xdcd6c8, 0x6b5a48, { exit: false }), { F, spot, B } = L;
    B(23.6, 3, 0.1, 0, 1.5, 3.2, 0xdcd6c8, true);   // the room is the back part of the floor: a wall with the corridor beyond
    B(4, 0.6, 2.4, -3, 0.45, -5.5, 0x6b4a2f); B(3.9, 0.25, 2.3, -3, 0.85, -5.5, 0xf4f4f4); B(3.9, 0.12, 0.6, -3, 1.0, -6.4, 0xffffff); B(4, 1.4, 0.12, -3, 1.0, -6.75, 0x4a2c18);
    spot(-3, -3.6, 2.2, 'Sleep until morning', () => hooks.sleep());
    B(2.6, 1.5, 0.08, 4.5, 1.6, -8.85, mat(0x111111)); B(2.4, 1.3, 0.02, 4.5, 1.6, -8.8, mat(0x22324a, { emissive: 0x2a4a7a, ei: 0.5 }));
    spot(4.5, -6.5, 1.8, 'Watch TV', () => hooks.rest(8, 'You flick through the channels. Nothing on, as usual.'));
    B(1.8, 0.8, 0.6, 6.5, 0.5, -1.5, 0x6b4a2f); spot(6.5, -0.4, 1.5, 'Order room service (12 gold)', () => hooks.eat(55, 12, '🛎️ Room service! A club sandwich and a pot of tea arrive at the door.'));
    B(3, 2.4, 0.08, -9, 1.6, -8.9, mat(0x9fd3ff, { emissive: 0x6fa8ff, ei: 0.4 }));   // big window
    spot(-9, -7.6, 1.6, 'Look out of the window', () => hooks.toast('🌆 The city lights stretch all the way to the dome.'));
    B(2.4, 2.6, 0.1, 9, 1.3, 2.9, mat(0xb8c1c5, { metal: 0.8, rough: 0.25 }));
    spot(9, 1.8, 1.8, 'Take the lift down to the lobby', () => go(layouts.hotel, -7.75, -6.4, Math.PI, 'Back in the lobby.'));
    F.plant(-10.8, 2.2); L.light(0, -3, 0.8, 12, 0xffe6b0);
  }

  // =========================== COMMUNITY HALL ===========================
  {
    const L = makeLayout('community', -6400, 0, 0xe8e0c8, 0x8a6a46), { F, spot, B } = L;
    // stage at the back with curtains
    B(14, 0.8, 4, 0, 0.5, -7, 0x6b4a2f, true); for (const s of [-1, 1]) B(3, 3.2, 0.1, s * 6, 2.5, -8.9, 0x7a1f2a);
    B(6, 1.2, 0.05, 0, 3.2, -8.9, mat(0xffffff)); spot(0, -4.6, 2.2, 'Read the events board', () => hooks.toast(['📋 Tonight: bingo at 7. Tomorrow: yoga, coffee morning, and the youth hunters\' club.', '📋 Volunteers wanted for the food bank. Lost cat: answers to "Biscuit".', '📋 Neighbourhood watch meeting on Thursday. Bring biscuits.'][Math.floor(Math.random() * 3)]));
    // rows of folding chairs for a meeting
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) F.chair(-5 + c * 2, -2.5 + r * 1.5, Math.PI, [0x2f6f8f, 0xd0281f][r % 2], 'Sit down');
    L.worker(-3, -2.5, Math.PI, { outfit: 0x7a4a2a, task: 'talk', seatY: 0.58 }); L.worker(1, -1, Math.PI, { outfit: 0x4a4a8a, task: 'talk', seatY: 0.58 }); L.worker(5, 0.5, Math.PI, { outfit: 0x5b8a72, task: 'read', seatY: 0.58 });
    L.worker(0, -7.2, 0, { sit: false, outfit: 0x2d5d3a, task: 'talk' });   // the organiser on stage
    // tea table and bingo
    F.table(-8, 5.5, 3, 1, 0, 0xf2f2f2); B(0.4, 0.6, 0.4, -9, 1.05, 5.5, mat(0xb8c1c5, { metal: 0.8 }));
    spot(-8, 6.8, 1.8, 'Coffee morning: tea and cake (2 gold)', () => hooks.eat(20, 2, '☕ A cup of tea and a slice of Victoria sponge. The locals ask how you\'re getting on.'));
    F.table(7, 5.5, 3, 1.2, 0, 0x2a3f6b);
    spot(7, 6.9, 1.8, 'Play bingo (3 gold)', () => hooks.bingo?.());
    spot(8.5, -5.5, 1.8, 'Join the yoga class (5 gold)', () => hooks.yoga?.());
    spot(-8.5, -5.5, 1.8, 'Volunteer at the food bank', () => hooks.volunteer?.());
    spot(-4, -3.4, 1.6, 'Hire the hall for a party (150 gold)', () => hooks.party?.());
    L.light(-5, 0, 0.9, 13, 0xfff1d0); L.light(5, 0, 0.9, 13, 0xfff1d0); L.light(0, -7, 0.9, 10, 0xffe6b0);
  }

  let active = null, time = 0;
  const api = {
    layouts,
    /** Which layout a building type uses. Unknown non-civic types count as homes. */
    layoutFor(type = '') {
      const t = String(type).toLowerCase();
      if (/cyber|tech|software|data|robot|ai_lab|startup/.test(t)) return layouts.cyber;
      if (/court|law/.test(t)) return layouts.court;
      if (/library/.test(t)) return layouts.library;
      if (/government|townhall|town_hall|council|job_centre|post_office/.test(t)) return layouts.gov;
      if (/arcade|amusement|games/.test(t)) return layouts.arcade;
      if (/^(casino|gambling)$/.test(t)) return layouts.casino;
      if (/^(hotel|motel|hostel|guest_house)$/.test(t)) return layouts.hotel;
      if (/^(community_hall|community_centre|community|village_hall)$/.test(t)) return layouts.community;
      if (/^(church|chapel|cathedral|place_of_worship)$/.test(t)) return layouts.church;
      if (/^(mansion|villa|estate)$/.test(t)) return layouts.home;
      if (/^(nightclub|night_club|club|disco)$/.test(t)) return layouts.nightclub;
      if (/^(pub|bar|inn|tavern|biergarten)$/.test(t)) return layouts.pub;
      if (/^(restaurant|diner|cafe|café|bistro|fast_food|food_court|takeaway)$/.test(t)) return layouts.restaurant;
      if (/shop|retail|supermarket|market|kiosk|store|convenience|bakery|butcher|chemist|pharmacy/.test(t)) return layouts.shop;
      if (/office|commercial|government|bank|job_centre|post_office|company|industrial|warehouse|frontier-office|base/.test(t)) return layouts.office;
      if (/apartment|house|home|residential|terrace|detached|bungalow|flat|dormitory|cabin|farm|building|^yes$/.test(t)) return layouts.home;
      return null;   // civic types use the themed civic hall
    },
    enter(L) { this.exit(); active = L; for (const l of L.lights) l.visible = true; for (const w of L.workers) w.h.root.visible = true; },
    exit() { if (active) { for (const l of active.lights) l.visible = false; for (const w of active.workers) w.h.root.visible = false; } active = null; },
    get active() { return active; },
    update(dt) {
      if (!active) return;
      if (active.spin) for (const o of active.spin) o.rotation.y += dt * 0.8;
      time += dt;
      if (active.flash) { const beat = Math.floor(time * 2.2); active.flash.forEach((m, i) => { m.material.emissiveIntensity = ((i * 7 + beat) % 5) < 2 ? 2.2 : 0.25; }); }
      for (const w of active.workers) {   // typing, reading, chatting or just standing about
        const t = time * 1.0 + w.phase, { armL, armR } = w.h;
        if (w.task === 'type') { armL.pivot.rotation.x = -1.15 + Math.sin(t * 9) * 0.07; armR.pivot.rotation.x = -1.15 + Math.sin(t * 9 + 1.6) * 0.07; }
        else if (w.task === 'read') { armL.pivot.rotation.x = armR.pivot.rotation.x = -0.9; w.h.rig.rotation.x = 0.12 + Math.sin(t * 0.3) * 0.03; }
        else if (w.task === 'dance') { w.h.rig.position.y = Math.abs(Math.sin(t * 4.4)) * 0.14; armL.pivot.rotation.x = -2.6 + Math.sin(t * 4.4) * 0.5; armR.pivot.rotation.x = -2.6 - Math.sin(t * 4.4) * 0.5; w.h.root.rotation.y += dt * 0.6; }
        else if (w.task === 'dj') { armL.pivot.rotation.x = -1.0 + Math.sin(t * 4.4) * 0.15; armR.pivot.rotation.x = Math.sin(t * 2.2) > 0.6 ? -2.8 : -1.0; w.h.rig.position.y = Math.abs(Math.sin(t * 4.4)) * 0.05; }
        else if (w.task === 'cook') { armL.pivot.rotation.x = -1.0; armR.pivot.rotation.x = -1.1 + Math.sin(t * 6) * 0.35; }
        else if (w.task === 'talk') { armR.pivot.rotation.x = -0.4 + Math.sin(t * 2.2) * 0.35; armL.pivot.rotation.x = -0.15; w.h.root.rotation.y += Math.sin(t * 0.7) * 0.002; }
        else if (!w.sit) animatePerson?.(w.h, false, dt);
      }
    },
    /** Nearest interaction inside the current interior (furniture, the exit). */
    nearest(p) {
      if (!active) return null;
      let best = null, bestD = Infinity;
      for (const s of active.spots) { const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z); if (d < s.r && d < bestD) { best = s; bestD = d; } }
      return best;
    },
  };
  return api;
}
