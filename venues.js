// Real-life places on the land the Aegis Shield dome added round the old map.
//
// NORTH - Ashford Leisure Park (along z -760 .. -960)
//   * Ashford Raceway: an oval racing circuit with kerbs, grandstand, pit garages and a
//     race car. Drive over the start line to start a timed lap; best lap is saved.
//   * Ashford Stadium: a football pitch with stands and floodlights, and a ball you can
//     dribble and shoot. Score in either goal.
//   * Sports courts: two basketball courts and two tennis courts.
//   * Ashford Aquatics: a 50 m lido with lanes and a leisure pool. You can swim in both.
//   * Pixel Palace arcade (enterable).
// SOUTH - Ashford Business District (along z 1060 .. 1140, below the Capital)
//   * Company headquarters you can walk into: cyber/tech firms (Nexus Cyber Systems,
//     Helix Robotics, Quantum Data, Aquila Aerospace), offices (Meridian Bank, Northwind
//     Logistics, Orbit Media, The Ashford Times, Greenleaf Insurance), Ashford Crown
//     Court and another arcade.
// Roads link both districts to the town and the Capital.
import * as THREE from 'three';

export function buildVenues(ctx) {
  const { scene, colliders, civicBuildings, interactables, sitSpots, makeTex, toast, poolZones, destinations } = ctx;
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + '|' + JSON.stringify({ ...o, map: o.map?.uuid }); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1, depthWrite: o.opacity == null, map: o.map ?? null, side: o.side ?? THREE.FrontSide })); return mats.get(k); };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, c, solid = false, o, ry = 0) => {
    const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m);
    if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return m;
  };
  const flat = (w, d, x, z, m, y = 0.04) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); return p; };
  const spot = (x, z, r, label, action) => interactables.push({ pos: new THREE.Vector3(x, 0.2, z), r, label, action });
  const seat = (x, z, yaw, seatY, label) => sitSpots.push({ x, z, yaw, seatY, label });
  const asphalt = mat(0x2e3135, { rough: 0.95 }), line = mat(0xf2f2f2), concrete = mat(0xb8bbb8), steel = mat(0x7d858c, { metal: 0.6, rough: 0.4 });
  const signTex = (text, bg = '#15364a', fg = '#ffffff', sub = '') => makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = `bold ${sub ? 46 : 56}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, sub ? 48 : 64, 490); if (sub) { g.font = '24px sans-serif'; g.fillText(sub, 256, 98, 490); } });
  const signBoard = (text, x, y, z, w, ry = 0, bg, fg, sub) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: signTex(text, bg, fg, sub), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const road = (x0, z0, x1, z1, w = 10) => { const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0); const r = B(w, 0.04, len, (x0 + x1) / 2, 0.035, (z0 + z1) / 2, asphalt, false, undefined, ang); for (let t = 4; t < len - 4; t += 10) B(0.18, 0.045, 4, x0 + (x1 - x0) * t / len, 0.04, z0 + (z1 - z0) * t / len, line, false, undefined, ang); return r; };
  const enterable = (type, name, x, z, w, d) => civicBuildings.push({ type, name, x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const dest = (name, x, z) => destinations?.push({ name, x, z });

  // ---------------------------------------------------------------- roads
  road(170, -640, 170, -770, 12);                 // north from the frontier edge of town
  road(-470, -770, 700, -770, 12);                // leisure park boulevard
  road(280, 925, 280, 1100, 12);                  // south from the Capital
  road(-360, 1100, 1010, 1100, 14);               // entertainment quarter, business district boulevard, then the nightlife strip

  // ================================================================= RACEWAY
  const RW = { x: -280, z: -880, straight: 190, r: 72, w: 14 };
  {
    const { x, z, straight, r, w } = RW;
    // two straights (along x) and two half-circle bends
    for (const s of [-1, 1]) B(straight, 0.05, w, x, 0.05, z + s * r, asphalt);
    for (const s of [-1, 1]) {
      const bend = new THREE.Mesh(new THREE.RingGeometry(r - w / 2, r + w / 2, 48, 1, s > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), asphalt);
      bend.rotation.x = -Math.PI / 2; bend.position.set(x + s * straight / 2, 0.05, z); scene.add(bend);
    }
    // red and white kerbs round the bends, inside and out
    const kerbGeo = new THREE.BoxGeometry(2.2, 0.12, 0.8), kerbs = [];
    for (const s of [-1, 1]) for (let i = 0; i <= 40; i++) {
      const a = (s > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI * i / 40;
      for (const rr of [r - w / 2 - 0.4, r + w / 2 + 0.4]) kerbs.push([x + s * straight / 2 + Math.cos(a) * rr, z - Math.sin(a) * rr, -a, i % 2]);
    }
    for (const c of [0, 1]) {
      const list = kerbs.filter(k => k[3] === c), im = new THREE.InstancedMesh(kerbGeo, c ? mat(0xffffff) : mat(0xd0281f), list.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
      list.forEach(([kx, kz, ang], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(kx, 0.08, kz), q.setFromAxisAngle(Y, ang), new THREE.Vector3(1, 1, 1))));
      im.userData.noCull = true; scene.add(im);
    }
    // infield grass with the pit lane, and tyre walls on the outside of the bends
    const chk = makeTex(256, 32, g => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 16, j * 16, 16, 16); } });
    flat(w, 2, x - 40, z + r, mat(0xffffff, { map: chk }), 0.08).rotation.z = Math.PI / 2;   // start / finish line
    for (const sx of [-1, 1]) B(0.6, 7, 0.6, x - 40, 3.5, z + r + sx * (w / 2 + 1), steel, true);
    B(0.8, 1.2, w + 3, x - 40, 7.3, z + r, mat(0x1d1d1d));
    signBoard('ASHFORD RACEWAY', x - 40, 7.3, z + r - 0.45, 12, Math.PI / 2, '#111111', '#ffd23f', 'START / FINISH');
    // grandstand along the main straight (outside, facing the track)
    for (let k = 0; k < 6; k++) B(120, 0.6, 1.4, x, 0.3 + k * 0.6, z + r + w / 2 + 6 + k * 1.4, k % 2 ? mat(0x2f6f8f) : mat(0x8a96a0), true);
    B(124, 0.3, 11, x, 7, z + r + w / 2 + 9.5, steel);
    for (let i = -5; i <= 5; i++) seat(x + i * 10, z + r + w / 2 + 8.8, Math.PI, 2.1, 'Watch the race');
    // pit garages on the infield side of the main straight
    for (let i = 0; i < 6; i++) { const gx = x - 60 + i * 12; B(10, 4, 8, gx, 2, z + r - w / 2 - 7, mat(0xe6e6e6), true); B(8, 3.2, 0.1, gx, 1.7, z + r - w / 2 - 2.95, mat(0x3a3f45)); }
    signBoard('PIT LANE', x - 30, 5, z + r - w / 2 - 2.9, 8, 0, '#d0281f');
    for (const s of [-1, 1]) for (let i = 0; i < 30; i++) {
      const a = (s > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI * (i + 0.5) / 30, rr = r + w / 2 + 4;
      for (let k = 0; k < 2; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.2, 6, 12), mat(0x151515)); t.rotation.x = Math.PI / 2; t.position.set(x + s * straight / 2 + Math.cos(a) * rr, 0.25 + k * 0.4, z - Math.sin(a) * rr); scene.add(t); }
    }
    // a race car waiting in the pit lane
    if (ctx.makeVehicle) { const car = ctx.makeVehicle('car', 0xd0281f); car.group.position.set(x - 30, 0.2, z + r - 4); car.group.rotation.y = -Math.PI / 2; car.maxSpeed = 95; car.raceCar = true; }
    spot(x - 40, z + r - 9, 4, 'Read the lap board', () => toast(bestLap ? `Ashford Raceway lap record (yours): ${bestLap.toFixed(2)} s. Drive over the start line to start a timed lap.` : 'No laps set yet. Grab the red race car in the pit lane and drive over the start line to start a timed lap.'));
    dest('Ashford Raceway', x - 40, z + r + 20);
  }
  let bestLap = 0; try { bestLap = +localStorage.getItem('anotherworld-best-lap') || 0; } catch {}
  const lap = { on: false, t: 0, cps: new Set(), wasOnLine: false };
  const raceCheckpoints = [[RW.x + RW.straight / 2 + RW.r, RW.z], [RW.x, RW.z - RW.r], [RW.x - RW.straight / 2 - RW.r, RW.z]];

  // ================================================================= STADIUM
  const ST = { x: 170, z: -860, L: 105, W: 68 };
  {
    const { x, z, L, W } = ST;
    const pitchTex = makeTex(1024, 664, g => {
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#3f8f3a' : '#47a042'; g.fillRect(i * 64, 0, 64, 664); }
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; const sx = 1024 / 105, sz = 664 / 68;
      g.strokeRect(4, 4, 1016, 656); g.beginPath(); g.moveTo(512, 4); g.lineTo(512, 660); g.stroke();
      g.beginPath(); g.arc(512, 332, 9.15 * sx, 0, Math.PI * 2); g.stroke();
      for (const side of [0, 1]) { const x0 = side ? 1020 - 16.5 * sx : 4; g.strokeRect(x0, 332 - 20.15 * sz, 16.5 * sx, 40.3 * sz); const x1 = side ? 1020 - 5.5 * sx : 4; g.strokeRect(x1, 332 - 9.15 * sz, 5.5 * sx, 18.3 * sz); }
    });
    flat(L + 8, W + 8, x, z, mat(0x3f8f3a), 0.045);
    flat(L, W, x, z, mat(0xffffff, { map: pitchTex }), 0.06);
    // goals
    for (const s of [-1, 1]) {
      const gx = x + s * L / 2;
      for (const pz of [-3.66, 3.66]) B(0.15, 2.44, 0.15, gx, 1.22, z + pz, line);
      B(0.15, 0.15, 7.47, gx, 2.44, z, line);
      B(2, 2.44, 7.32, gx + s * 1, 1.22, z, mat(0xffffff, { opacity: 0.25, side: THREE.DoubleSide }));
    }
    // ad boards round the pitch keep the ball in
    for (const s of [-1, 1]) { B(L + 6, 0.9, 0.2, x, 0.45, z + s * (W / 2 + 3), mat(0x2f6f8f, { emissive: 0x1d4b6e, ei: 0.4 })); B(0.2, 0.9, W + 6, x + s * (L / 2 + 3), 0.45, z, mat(0x2f6f8f, { emissive: 0x1d4b6e, ei: 0.4 })); }
    // four stands with gaps at the corners to walk in
    const standCols = [mat(0xc0392b), mat(0xe6e6e6)];
    for (const s of [-1, 1]) {
      for (let k = 0; k < 8; k++) B(L - 6, 0.7, 1.4, x, 0.35 + k * 0.7, z + s * (W / 2 + 6 + k * 1.4), standCols[k % 2], true);
      for (let k = 0; k < 8; k++) B(1.4, 0.7, W - 10, x + s * (L / 2 + 6 + k * 1.4), 0.35 + k * 0.7, z, standCols[(k + 1) % 2], true);
      B(L - 4, 0.3, 13, x, 9, z + s * (W / 2 + 11), steel);
      for (const px of [-L / 3, 0, L / 3]) B(0.4, 9, 0.4, x + px, 4.5, z + s * (W / 2 + 17.5), steel);
      for (let i = -4; i <= 4; i++) seat(x + i * 10, z + s * (W / 2 + 8.8), s > 0 ? Math.PI : 0, 2.3, 'Watch the match');
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {   // floodlight towers
      const fx = x + sx * (L / 2 + 16), fz = z + sz * (W / 2 + 16);
      B(0.8, 30, 0.8, fx, 15, fz, steel, true); B(5, 3, 0.5, fx, 30, fz, mat(0xfff6d0, { emissive: 0xfff1b8, ei: 2 }), false, undefined, Math.atan2(-sx, -sz));
    }
    B(10, 5, 0.6, x, 13, z - W / 2 - 20, mat(0x111111)); signBoard('ASHFORD 0 - 0 RIVERSIDE', x, 13, z - W / 2 - 19.6, 9, 0, '#111111', '#ffd23f');
    signBoard('ASHFORD STADIUM', x, 11, z + W / 2 + 18.2, 14, 0, '#c0392b');
    dest('Ashford Stadium', x, z + W / 2 + 22);
  }
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), mat(0xffffff, { rough: 0.5 }));
  const patch = new THREE.Mesh(new THREE.IcosahedronGeometry(0.345, 0), mat(0x111111, { rough: 0.5 })); ball.add(patch); patch.material.wireframe = true;
  ball.position.set(ST.x, 0.4, ST.z); scene.add(ball);
  const ballV = new THREE.Vector3(); const score = [0, 0];

  // ================================================================= COURTS
  {
    const cx = 430, cz = -830;
    const bballTex = makeTex(512, 272, g => { g.fillStyle = '#c96a2c'; g.fillRect(0, 0, 512, 272); g.fillStyle = '#2f5d8f'; g.fillRect(0, 86, 60, 100); g.fillRect(452, 86, 60, 100); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(3, 3, 506, 266); g.beginPath(); g.moveTo(256, 3); g.lineTo(256, 269); g.stroke(); g.beginPath(); g.arc(256, 136, 34, 0, Math.PI * 2); g.stroke(); for (const s of [0, 1]) { g.beginPath(); g.arc(s ? 486 : 26, 136, 120, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2); g.stroke(); } });
    const tennisTex = makeTex(512, 236, g => { g.fillStyle = '#2f6d4f'; g.fillRect(0, 0, 512, 236); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(20, 20, 472, 196); g.strokeRect(20, 45, 472, 146); g.beginPath(); g.moveTo(130, 45); g.lineTo(130, 191); g.moveTo(382, 45); g.lineTo(382, 191); g.moveTo(130, 118); g.lineTo(382, 118); g.stroke(); });
    for (const k of [0, 1]) {
      const bx = cx - 20, bz = cz - 18 + k * 22;
      flat(28, 15, bx, bz, mat(0xffffff, { map: bballTex }), 0.06);
      for (const s of [-1, 1]) {
        const hx = bx + s * 13.2;
        B(0.25, 3.4, 0.25, hx + s * 1.2, 1.7, bz, steel); B(1.4, 0.15, 0.15, hx + s * 0.55, 3.35, bz, steel, false, undefined, Math.PI / 2);
        B(0.08, 1.05, 1.8, hx, 3.35, bz, mat(0xffffff, { opacity: 0.85 }));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 20), mat(0xff6a00)); rim.rotation.x = Math.PI / 2; rim.position.set(hx - s * 0.3, 3.05, bz); scene.add(rim);
      }
      spot(bx, bz, 7, 'Shoot a hoop', () => shoot());
      const tx = cx + 22, tz = cz - 18 + k * 22;
      flat(30, 14, tx, tz, mat(0xffffff, { map: tennisTex }), 0.06);
      B(0.04, 0.95, 11, tx, 0.5, tz, mat(0xffffff, { opacity: 0.5, side: THREE.DoubleSide })); for (const s of [-1, 1]) B(0.1, 1.1, 0.1, tx, 0.55, tz + s * 5.6, steel);
      spot(tx - 6, tz, 6, 'Play a tennis rally', () => toast(['Ace! Your serve kisses the line.', 'A twenty-shot rally... and you net the last one.', 'Love-fifteen. You need to work on that backhand.'][Math.floor(Math.random() * 3)]));
    }
    for (const [fx, fz, fw, fd] of [[cx, cz - 27, 92, 0.1], [cx, cz + 15, 92, 0.1], [cx - 46, cz - 6, 0.1, 42], [cx + 46, cz - 6, 0.1, 42]]) B(fw, 3, fd, fx, 1.5, fz, mat(0x9aa3aa, { opacity: 0.35, side: THREE.DoubleSide }));
    signBoard('ASHFORD SPORTS COURTS', cx, 4, cz + 15.2, 9, 0, '#2f5d8f');
    dest('Ashford Sports Courts', cx, cz + 20);
  }
  let streak = 0;
  const shoot = () => { if (Math.random() < 0.55) { streak++; toast(streak > 2 ? `Swish! That's ${streak} in a row.` : 'Swish! Nothing but net.'); } else { streak = 0; toast(['It rattles round the rim and drops out.', 'Air ball. Nobody saw that.', 'Off the backboard... and out.'][Math.floor(Math.random() * 3)]); } };

  // ================================================================= AQUATICS
  {
    const ax = 620, az = -860;
    const laneTex = makeTex(256, 512, g => { g.fillStyle = '#1f8fd1'; g.fillRect(0, 0, 256, 512); g.fillStyle = 'rgba(10,40,90,0.55)'; for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 14, 20, 4, 472); });
    flat(64, 34, ax, az, mat(0xe9e4d6), 0.05);                                           // pool deck
    const water = flat(50, 21, ax, az, mat(0xffffff, { map: laneTex, opacity: 0.88, rough: 0.05, emissive: 0x0b3d66, ei: 0.25 }), 0.12);
    water.rotation.z = Math.PI / 2; water.scale.set(21 / 50, 50 / 21, 1);
    for (let i = 1; i < 8; i++) B(50, 0.08, 0.08, ax, 0.16, az - 10.5 + i * 2.625, mat(i % 2 ? 0xd0281f : 0xffffff));   // lane ropes
    for (const s of [-1, 1]) { B(51, 0.3, 0.6, ax, 0.15, az + s * 10.8, line); B(0.6, 0.3, 22, ax + s * 25.3, 0.15, az, line); }
    for (let i = 0; i < 8; i++) B(0.7, 0.5, 0.7, ax - 26, 0.25, az - 9.2 + i * 2.625, mat(0x2f6f8f));                   // starting blocks
    B(0.6, 3, 0.6, ax + 27, 1.5, az - 6, steel); B(4, 0.15, 0.6, ax + 25, 3, az - 6, mat(0x2f6f8f));                       // diving board
    poolZones.push({ minX: ax - 25, maxX: ax + 25, minZ: az - 10.5, maxZ: az + 10.5 });
    // leisure pool with a slide
    const lx = ax, lz = az + 30;
    flat(26, 14, lx, lz, mat(0xe9e4d6), 0.05);
    flat(20, 9, lx, lz, mat(0x37b3e8, { opacity: 0.85, rough: 0.05, emissive: 0x0b4d70, ei: 0.25 }), 0.12);
    for (const s of [-1, 1]) { B(21, 0.3, 0.5, lx, 0.15, lz + s * 4.75, line); B(0.5, 0.3, 10, lx + s * 10.25, 0.15, lz, line); }
    poolZones.push({ minX: lx - 10, maxX: lx + 10, minZ: lz - 4.5, maxZ: lz + 4.5 });
    B(1, 6, 1, lx + 13, 3, lz - 3, mat(0xffd23f)); const slide = B(1.2, 0.2, 9, lx + 13, 3, lz + 1, mat(0xff5a3c)); slide.rotation.x = -0.55;
    for (let i = 0; i < 6; i++) { const ux = ax - 22 + i * 8.5; B(0.8, 0.35, 2, ux, 0.35, az - 15.5, mat(0xffffff)); seat(ux, az - 15.5, 0, 0.75, 'Relax on a sun lounger'); }
    B(20, 4, 8, ax, 2, az + 46, mat(0xdfe6ea), true); signBoard('ASHFORD AQUATICS', ax, 5, az + 41.8, 10, Math.PI, '#1f8fd1');
    enterable('community_centre', 'Ashford Aquatics Changing Rooms', ax, az + 46, 20, 8);
    signBoard('LIDO · 50 M', ax, 2.5, az - 17.5, 5, 0, '#1f8fd1');
    dest('Ashford Aquatics', ax, az - 22);
  }

  // ================================================================= BUILDINGS (arcades, companies)
  const facadeTex = (base, win) => makeTex(128, 256, g => { g.fillStyle = base; g.fillRect(0, 0, 128, 256); g.fillStyle = win; for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) g.fillRect(6 + c * 31, 6 + r * 31, 26, 22); });
  const towers = [];
  const company = ({ name, type, x, z, w = 24, d = 18, floors = 6, face = 1, base = '#3c5a73', win = '#9fd3ff', sign = '#15364a', fg = '#ffffff', sub = '', neon = 0 }) => {
    const h = floors * 3.4, tex = facadeTex(base, win); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 8, floors / 2.4);
    const sideTex = tex.clone(); sideTex.needsUpdate = true; sideTex.repeat.set(d / 8, floors / 2.4);
    const wallMat = mat(0xffffff, { map: tex, rough: 0.4, metal: 0.2 }), sideMat = mat(0xffffff, { map: sideTex, rough: 0.4, metal: 0.2 }), roof = mat(0x3a3f45);
    const tower = new THREE.Mesh(boxGeo, [sideMat, sideMat, roof, roof, wallMat, wallMat]); tower.scale.set(w, h, d); tower.position.set(x, h / 2, z); scene.add(tower);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    const fz = z + face * (d / 2);
    B(8, 0.3, 3, x, 3.6, fz + face * 1.5, mat(0x2b2f33));                                     // entrance canopy
    signBoard(name.toUpperCase(), x, Math.min(h - 1.5, 9), fz + face * 0.15, Math.min(w - 2, 16), face > 0 ? 0 : Math.PI, sign, fg, sub);
    if (neon) { B(w + 0.2, 0.15, 0.15, x, 0.6, fz + face * 0.1, mat(neon, { emissive: neon, ei: 2 })); B(w + 0.2, 0.15, 0.15, x, h - 0.4, fz + face * 0.1, mat(neon, { emissive: neon, ei: 2 })); }
    enterable(type, name, x, z, w, d); civicBuildings.at(-1).doorFace = face;   // the real door is added by doors.js
    dest(name, x, fz + face * 6);
    towers.push({ name, x, z, w, d, h, face });
  };
  // Pixel Palace arcade in the leisure park
  company({ name: 'Pixel Palace Arcade', type: 'arcade', x: 330, z: -730, w: 26, d: 16, floors: 2, face: -1, base: '#22163a', win: '#ff2bd6', sign: '#22163a', fg: '#ffd23f', sub: 'GAMES · PRIZES · AIR HOCKEY', neon: 0xff2bd6 });

  // Business district: north side faces the boulevard (+z), south side faces it (-z)
  const north = [
    { name: 'Nexus Cyber Systems', type: 'cyber', floors: 12, base: '#141b26', win: '#00e5ff', sign: '#0b0f16', fg: '#00e5ff', sub: 'SECURITY · AI · CLOUD', neon: 0x00e5ff },
    { name: 'Helix Robotics', type: 'cyber', floors: 8, base: '#22262c', win: '#ffb347', sign: '#22262c', fg: '#ffb347', sub: 'ROBOTICS & AUTOMATION', neon: 0xffb347 },
    { name: 'Quantum Data Centre', type: 'cyber', floors: 5, base: '#1d2430', win: '#22ff88', sign: '#0d1117', fg: '#22ff88', sub: 'COLOCATION · 24/7', neon: 0x22ff88 },
    { name: 'Ashford Crown Court', type: 'court', floors: 4, base: '#cfc4a8', win: '#5a5040', sign: '#2a2516', fg: '#f2e6c4', sub: 'HIS MAJESTY\'S COURTS' },
    { name: 'Northwind Logistics', type: 'office', floors: 7, base: '#4a5560', win: '#cfe3f2', sign: '#1d3a5a' },
    { name: 'Meridian Bank', type: 'bank', floors: 14, base: '#2a3a2e', win: '#d9e8c8', sign: '#14301d', fg: '#e6d29a', sub: 'HEADQUARTERS' },
  ];
  const south = [
    { name: 'Pixel Palace Arcade', type: 'arcade', floors: 2, base: '#22163a', win: '#ff2bd6', sign: '#22163a', fg: '#ffd23f', sub: 'GAMES · PRIZES', neon: 0xff2bd6 },
    { name: 'Orbit Media', type: 'office', floors: 6, base: '#5a3a5a', win: '#f2d6f2', sign: '#3a1d3a' },
    { name: 'The Ashford Times', type: 'office', floors: 5, base: '#3a3a3a', win: '#e6e6e6', sign: '#111111', sub: 'NEWSROOM' },
    { name: 'Greenleaf Insurance', type: 'office', floors: 8, base: '#2f5a3a', win: '#d6f2dc', sign: '#1d3a24' },
    { name: 'Sterling & Co Solicitors', type: 'office', floors: 4, base: '#5a4a3a', win: '#f2e6d6', sign: '#3a2a1a' },
    { name: 'Aquila Aerospace', type: 'cyber', floors: 10, base: '#1a2230', win: '#9fd3ff', sign: '#0b1220', fg: '#9fd3ff', sub: 'SPACE SYSTEMS', neon: 0x9fd3ff },
  ];
  north.forEach((c, i) => company({ ...c, x: -20 + i * 120, z: 1068, face: 1 }));
  south.forEach((c, i) => company({ ...c, x: -20 + i * 120, z: 1132, face: -1 }));
  // Entertainment Quarter at the west end of the boulevard: casinos, arcades and a church.
  company({ name: 'Golden Palace Casino', type: 'casino', x: -150, z: 1068, w: 26, d: 18, floors: 4, face: 1, base: '#3a0f1f', win: '#ffd23f', sign: '#2a0814', fg: '#ffd23f', sub: 'SLOTS · ROULETTE · BLACKJACK · POKER', neon: 0xffd23f });
  company({ name: 'Lucky Seven Casino', type: 'casino', x: -150, z: 1132, w: 26, d: 18, floors: 3, face: -1, base: '#0f2a1f', win: '#22ff88', sign: '#0a1a14', fg: '#22ff88', sub: 'OPEN 24 HOURS · SLOTS · TABLES', neon: 0x22ff88 });
  company({ name: 'Neon Nights Arcade', type: 'arcade', x: -270, z: 1132, w: 24, d: 16, floors: 2, face: -1, base: '#14102a', win: '#00e5ff', sign: '#14102a', fg: '#00e5ff', sub: '8 GAMES · PRIZES · NO TOKENS NEEDED', neon: 0x00e5ff });
  company({ name: 'Retro Rumble Arcade', type: 'arcade', x: -270, z: 1068, w: 24, d: 16, floors: 2, face: 1, base: '#2a1022', win: '#ff5a3c', sign: '#2a1022', fg: '#ffd23f', sub: 'CLASSIC CABINETS · DANCE · CLAW', neon: 0xff5a3c });
  {   // St Mary's Church: stone nave, bell tower and spire
    const cx = -335, cz = 1062, stone = mat(0xbfb6a0, { rough: 0.9 });
    company({ name: "St Mary's Church", type: 'church', x: cx, z: cz, w: 18, d: 28, floors: 3, face: 1, base: '#bfb6a0', win: '#7a5cff', sign: '#3a2f22', fg: '#f2e6c4', sub: 'ALL WELCOME · SUNDAY SERVICE' });
    B(7, 22, 7, cx, 11, cz - 8, stone, true);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4.6, 14, 4), mat(0x4a5560)); spire.position.set(cx, 29, cz - 8); spire.rotation.y = Math.PI / 4; scene.add(spire);
    B(0.3, 2.4, 0.3, cx, 37, cz - 8, mat(0xd4af37, { metal: 0.8 })); B(1.4, 0.3, 0.3, cx, 37.4, cz - 8, mat(0xd4af37, { metal: 0.8 }));
    const roofN = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 9.6, 5, 4, 1), mat(0x4a5560)); roofN.rotation.y = Math.PI / 4; roofN.scale.set(1, 1, 1.55); roofN.position.set(cx, 10.2 + 2.5, cz + 2); scene.add(roofN);
  }
  signBoard('ENTERTAINMENT QUARTER', -95, 6, 1100, 12, Math.PI / 2, '#2a0814', '#ffd23f', 'CASINOS · ARCADES · CHURCH');
  for (const sz of [-1, 1]) B(0.5, 6, 0.5, -95, 3, 1100 + sz * 6, steel);
  dest('Entertainment Quarter', -210, 1100);

  // Nightlife strip at the east end of the boulevard: pubs, bars, a nightclub and restaurants.
  const night = [
    [{ name: 'The Rusty Anchor', type: 'pub', floors: 2, base: '#3a2414', win: '#ffb36b', sign: '#1a0f08', fg: '#e6c27a', sub: 'PUB · REAL ALE · FOOD', neon: 0xffb36b },
     { name: 'Club Neon', type: 'nightclub', floors: 3, base: '#0c0a14', win: '#8a5cff', sign: '#0c0a14', fg: '#ff2bd6', sub: 'NIGHTCLUB · DJ · LATE', neon: 0xff2bd6 },
     { name: 'Bella Vista', type: 'restaurant', floors: 2, base: '#efe4d0', win: '#ffd9a0', sign: '#5a1f1f', fg: '#ffffff', sub: 'ITALIAN RESTAURANT', neon: 0xffd9a0 }],
    [{ name: 'The Crown & Lantern', type: 'pub', floors: 2, base: '#2a3a2a', win: '#ffd28a', sign: '#14201a', fg: '#f2e6c4', sub: 'PUB · SPORTS ON TV', neon: 0xffd28a },
     { name: 'Velvet Lounge', type: 'bar', floors: 2, base: '#2a0f1f', win: '#ff6ab0', sign: '#1a0814', fg: '#ff9ad2', sub: 'COCKTAIL BAR · NIGHT BAR', neon: 0xff6ab0 },
     { name: 'Golden Dragon', type: 'restaurant', floors: 2, base: '#5a1010', win: '#ffd23f', sign: '#3a0808', fg: '#ffd23f', sub: 'CHINESE RESTAURANT', neon: 0xffd23f }],
  ];
  night[0].forEach((c, i) => company({ ...c, x: 700 + i * 120, z: 1068, w: 20, d: 16, face: 1 }));
  night[1].forEach((c, i) => company({ ...c, x: 700 + i * 120, z: 1132, w: 20, d: 16, face: -1 }));
  signBoard('NIGHTLIFE STRIP', 640, 6, 1100, 12, Math.PI / 2, '#1a0814', '#ff2bd6', 'PUBS · BARS · CLUB · RESTAURANTS');
  for (const sz of [-1, 1]) B(0.5, 6, 0.5, 640, 3, 1100 + sz * 6, steel);
  dest('Nightlife Strip', 820, 1100);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {   // street trees and benches along the boulevard
    const tx = 40 + i * 120, tz = 1100 + s * 9;
    B(0.3, 2.4, 0.3, tx, 1.2, tz, mat(0x5a3d26)); const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 0), mat(0x3f7d3a)); crown.position.set(tx, 3.6, tz); scene.add(crown);
  }
  signBoard('ASHFORD BUSINESS DISTRICT', 280, 6, 1020, 12, Math.PI, '#15364a', '#ffffff', 'COMPANIES · CROWN COURT · ARCADE');
  for (const sx of [-1, 1]) B(0.5, 6, 0.5, 280 + sx * 6, 3, 1020, steel);
  signBoard('ASHFORD LEISURE PARK', 170, 6, -700, 12, 0, '#2f5d8f', '#ffffff', 'STADIUM · RACEWAY · COURTS · POOLS · ARCADE');
  for (const sx of [-1, 1]) B(0.5, 6, 0.5, 170 + sx * 6, 3, -700, steel);
  dest('Ashford Business District', 280, 1100); dest('Ashford Leisure Park', 170, -720);

  // ================================================================= snack kiosks
  const kiosk = (x, z, name, ry = 0, colour = 0xd0281f) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const P = (w, h, d, px, py, pz, c, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(px, py, pz); g.add(m); };
    P(3.2, 2.6, 2.2, 0, 1.3, -0.4, 0xf2efe6); P(3.4, 0.12, 0.9, 0, 1.05, 0.95, 0x7a5636); P(3.6, 0.1, 1.6, 0, 2.75, 0.6, colour);
    for (let i = 0; i < 6; i++) P(0.55, 0.06, 1.62, -1.4 + i * 0.56, 2.68, 0.6, i % 2 ? 0xffffff : colour);
    for (let i = 0; i < 5; i++) P(0.18, 0.25, 0.12, -1.2 + i * 0.6, 1.23, 0.95, [0xd94f3d, 0x3d8bd9, 0xf2c14e, 0x5bb36a, 0x8e5bd9][i]);
    if (ctx.makePerson) { const h = ctx.makePerson({ outfit: colour, hair: 0x3b2c23, pants: 0x2a2f36 }); h.root.position.set(0, 0, 0.1); g.add(h.root); }
    const front = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    colliders.push({ minX: x - 1.8, maxX: x + 1.8, minZ: z - 1.8, maxZ: z + 1.8 });
    spot(x + front.x * 2.6, z + front.z * 2.6, 2.2, `Buy snacks at ${name}`, () => ctx.openShop?.(name));
  };
  kiosk(196, -799, 'the Stadium kiosk', 0);
  kiosk(-200, -782, 'the Raceway snack bar', 0, 0x111111);
  kiosk(578, -832, 'the Poolside kiosk', Math.PI, 0x1f8fd1);
  kiosk(150, -718, 'the Leisure Park cart', 0, 0x2f5d8f);
  kiosk(40, 1091, 'the Boulevard coffee cart', Math.PI, 0x5a3a22);
  kiosk(400, 1109, 'the Boulevard snack stand', 0, 0x2d5d3a);

  // ================================================================= update
  function update(dt, { playerPos, driving }) {
    // football: dribble by walking into the ball, it rolls and bounces off the boards
    const px = playerPos.x - ball.position.x, pz = playerPos.z - ball.position.z, d = Math.hypot(px, pz);
    if (Math.abs(ball.position.x - ST.x) < 80 && Math.abs(ball.position.z - ST.z) < 60) {
      if (d < 0.9 && !driving) { const k = 11 / Math.max(d, 0.2); ballV.x = -px * k * 0.9; ballV.z = -pz * k * 0.9; }
      ball.position.x += ballV.x * dt; ball.position.z += ballV.z * dt;
      ballV.multiplyScalar(Math.max(0, 1 - dt * 0.9));
      const sp = Math.hypot(ballV.x, ballV.z); if (sp > 0.01) { ball.rotation.z -= ballV.x * dt / 0.34; ball.rotation.x += ballV.z * dt / 0.34; }
      const hx = ST.L / 2 + 2.7, hz = ST.W / 2 + 2.7;
      for (const s of [-1, 1]) if ((ball.position.x - ST.x) * s > ST.L / 2 && Math.abs(ball.position.z - ST.z) < 3.66) {
        score[s > 0 ? 0 : 1]++; if (ctx.onGoal) ctx.onGoal(s > 0 ? 0 : 1, score); else toast(`GOAL! Ashford ${score[0]} - ${score[1]} Riverside`);
        ball.position.set(ST.x, 0.4, ST.z); ballV.set(0, 0, 0);
      }
      if (Math.abs(ball.position.x - ST.x) > hx) { ball.position.x = ST.x + Math.sign(ball.position.x - ST.x) * hx; ballV.x *= -0.6; }
      if (Math.abs(ball.position.z - ST.z) > hz) { ball.position.z = ST.z + Math.sign(ball.position.z - ST.z) * hz; ballV.z *= -0.6; }
    } else { ball.position.set(ST.x, 0.4, ST.z); ballV.set(0, 0, 0); }
    // raceway lap timer
    if (driving) {
      const p = driving.group.position;
      const onLine = Math.abs(p.x - (RW.x - 40)) < 2.5 && Math.abs(p.z - (RW.z + RW.r)) < RW.w / 2 + 1;
      if (lap.on) { lap.t += dt; for (let i = 0; i < raceCheckpoints.length; i++) if (Math.hypot(p.x - raceCheckpoints[i][0], p.z - raceCheckpoints[i][1]) < 22) lap.cps.add(i); }
      if (onLine && !lap.wasOnLine) {
        if (lap.on && lap.cps.size === raceCheckpoints.length) {
          const t = lap.t, best = !bestLap || t < bestLap; if (best) { bestLap = t; try { localStorage.setItem('anotherworld-best-lap', String(t)); } catch {} }
          toast(`Lap time ${t.toFixed(2)} s${best ? ' - NEW LAP RECORD!' : ` (record ${bestLap.toFixed(2)} s)`}. Keep going for another lap.`);
        } else if (!lap.on) toast('Timed lap started! Go round the whole circuit and back over the line.');
        lap.on = true; lap.t = 0; lap.cps.clear();
      }
      lap.wasOnLine = onLine;
      if (lap.on && Math.hypot(p.x - RW.x, p.z - RW.z) > RW.straight / 2 + RW.r + 60) { lap.on = false; toast('You left the circuit - lap cancelled.'); }
    } else if (lap.on) { lap.on = false; }
  }
  return { update, stadium: ST, raceway: RW, towers, ball, ballV, score, set onGoal(fn) { ctx.onGoal = fn; } };
}
