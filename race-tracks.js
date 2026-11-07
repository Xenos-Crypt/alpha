// Ashford Racing: the six circuits, the race cars and the maths behind them.
// Everything here is plain data and geometry (no scene, no DOM), so it can be checked in tests.
//   buildPath(track) samples the closed centre line every ~2 m and gives, for each sample, its
//   position, height, heading, curvature and slope, a "how fast can you take this" speed profile
//   (used by the AI and for the medal times), and a fast nearest-point lookup for cars.
import * as THREE from 'three';

// ---------------------------------------------------------------- shapes
function stadium(straight, r, step = 45) {   // two straights joined by half-circle bends
  const pts = [], S = straight;
  for (let x = -S / 2; x < S / 2; x += step) pts.push([x, -r, 0]);
  for (let a = 0; a < Math.PI; a += Math.PI / 7) pts.push([S / 2 + Math.sin(a) * r, -Math.cos(a) * r, 0]);
  for (let x = S / 2; x > -S / 2; x -= step) pts.push([x, r, 0]);
  for (let a = 0; a < Math.PI; a += Math.PI / 7) pts.push([-S / 2 - Math.sin(a) * r, Math.cos(a) * r, 0]);
  return pts;
}
function rounded(corners, r, y = 0) {   // a polygon with rounded corners (street circuits)
  const pts = [], n = corners.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = corners[(i - 1 + n) % n], [bx, bz] = corners[i], [cx, cz] = corners[(i + 1) % n];
    const l1 = Math.hypot(bx - ax, bz - az), l2 = Math.hypot(cx - bx, cz - bz), rr = Math.min(r, l1 / 2.2, l2 / 2.2);
    const p0 = [bx + (ax - bx) / l1 * rr, bz + (az - bz) / l1 * rr], p2 = [bx + (cx - bx) / l2 * rr, bz + (cz - bz) / l2 * rr];
    for (let k = 0; k <= 3; k++) {   // quadratic bezier through the corner
      const t = k / 3, u = 1 - t;
      pts.push([u * u * p0[0] + 2 * u * t * bx + t * t * p2[0], u * u * p0[1] + 2 * u * t * bz + t * t * p2[1], y]);
    }
    const mx = (bx + cx) / 2, mz = (bz + cz) / 2; if (l2 > 4 * rr) pts.push([mx, mz, y]);   // keep straights straight
  }
  return pts;
}
function polar(R0, shape, hills, n = 40) {   // a flowing loop: radius and height vary with angle
  const pts = [], lift = hills.reduce((a, h) => a + Math.abs(h[1]), 0);
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2;
    const r = R0 * (1 + shape.reduce((a, [k, amp, ph]) => a + amp * Math.sin(k * t + ph), 0));
    const y = lift + hills.reduce((a, [k, amp, ph]) => a + amp * Math.sin(k * t + ph), 0);
    pts.push([Math.cos(t) * r, Math.sin(t) * r, y]);
  }
  return pts;
}

// ---------------------------------------------------------------- the circuits
export const TRACKS = [
  { id: 'speedway', name: 'Ashford Speedway', theme: 'grass', icon: '🏟️', stars: 1, hw: 10,
    blurb: 'A stadium oval with two long straights. Flat out, packed grandstands.',
    pts: stadium(430, 135) },
  { id: 'greenwood', name: 'Greenwood Ring', theme: 'forest', icon: '🌲', stars: 2, hw: 8,
    blurb: 'Rolling hills through an old forest. Fast sweepers and blind crests.',
    pts: polar(310, [[2, 0.15, 0.4], [3, 0.13, 1.7], [5, 0.07, 2.2], [7, 0.035, 0.6]], [[1, 9, 0], [3, 4, 1]], 56) },
  { id: 'coast', name: 'Seabreeze Coast Road', theme: 'coast', icon: '🌴', stars: 2, hw: 8,
    blurb: 'Palm-lined coast road above the beach. Long, quick and wide open.',
    pts: polar(420, [[2, 0.12, 2.2], [3, 0.09, 0.9], [5, 0.04, 1], [8, 0.018, 2]], [[1, 6, 1], [2, 3, 0.2]], 64) },
  { id: 'harbour', name: 'Harbour Street Circuit', theme: 'city', icon: '🌃', stars: 3, hw: 7,
    blurb: 'Right-angle corners between concrete walls, skyscrapers and neon. Brake early.',
    pts: rounded([[-170, 0], [380, 0], [380, 190], [230, 190], [230, 330], [-60, 330], [-60, 200], [-170, 200]], 26) },
  { id: 'canyon', name: 'Red Rock Canyon', theme: 'canyon', icon: '🏜️', stars: 3, hw: 8,
    blurb: 'Desert rally road past giant red mesas. Dips, rises and a tricky final bend.',
    pts: polar(340, [[2, 0.2, 1.1], [3, 0.1, 0.3], [4, 0.08, 2.6], [6, 0.05, 1.2], [9, 0.02, 0.4]], [[1, 11, 0.5], [2, 6, 2], [5, 2, 1]], 64) },
  { id: 'alpine', name: 'Alpine Pass', theme: 'alpine', icon: '🏔️', stars: 5, hw: 7,
    blurb: 'Climb a snowy mountain through hairpins, then dive down the other side.',
    pts: [[0, 0, 2], [180, -10, 3], [340, 20, 6], [450, 100, 12], [480, 200, 18], [420, 265, 24], [300, 270, 30], [180, 262, 35],
      [120, 300, 38], [150, 352, 41], [270, 365, 45], [400, 372, 50], [470, 410, 53], [450, 465, 56], [330, 490, 60],
      [150, 495, 62], [-40, 480, 62], [-210, 440, 58], [-330, 360, 50], [-390, 250, 40], [-400, 130, 29], [-340, 40, 17], [-190, -5, 8]] },
];

// The cars you can race. top = top speed (m/s), the rest are multipliers. price 0 = free to drive.
export const CARS = [
  { id: 'gt', name: 'Rookie GT', style: 'sports', icon: '🏎️', top: 54, accel: 1.0, handling: 1.0, brake: 1.0, price: 0, blurb: 'Balanced and forgiving. A good first race car.' },
  { id: 'hatch', name: 'Street Hatch', style: 'hatch', icon: '🚗', top: 49, accel: 1.08, handling: 1.18, brake: 1.1, price: 0, blurb: 'Light and nimble. Slow on the straights, great in the twisty bits.' },
  { id: 'rally', name: 'Rally SUV', style: 'suv', icon: '🚙', top: 52, accel: 1.05, handling: 1.12, brake: 1.15, price: 400, blurb: 'Grippy rally machine. Loves canyons and mountain passes.' },
  { id: 'muscle', name: 'V8 Muscle', style: 'pickup', icon: '🛻', top: 60, accel: 1.22, handling: 0.88, brake: 0.92, price: 650, blurb: 'Huge power, heavy steering. Rockets out of corners.' },
  { id: 'apex', name: 'Apex Supercar', style: 'supercar', icon: '🏁', top: 66, accel: 1.18, handling: 1.08, brake: 1.15, price: 1300, blurb: 'Mid-engined supercar. Fast everywhere.' },
  { id: 'volt', name: 'Volt X Hyper EV', style: 'electric', icon: '⚡', top: 70, accel: 1.35, handling: 1.12, brake: 1.25, price: 2200, blurb: 'Silent electric hypercar with brutal acceleration.' },
];
export const COLOURS = [0xd0281f, 0xffd23f, 0x1d6fd8, 0x22b35e, 0xf5f6fa, 0x1c1f24, 0xff7a1f, 0x8a5cff];

export const MODES = [
  { id: 'race', name: 'Quick Race', icon: '🏁', blurb: 'Race the field over a few laps. Prize money for the top three.' },
  { id: 'trial', name: 'Time Trial', icon: '⏱️', blurb: 'Just you and the clock. Chase your ghost and earn bronze, silver and gold medals.' },
  { id: 'elim', name: 'Elimination', icon: '💥', blurb: 'Every time the leader completes a lap, whoever is last is knocked out.' },
  { id: 'rush', name: 'Checkpoint Rush', icon: '⏳', blurb: 'Beat the clock. Every checkpoint you reach adds time. Run out and it is over.' },
  { id: 'sprint', name: 'Sprint A → B', icon: '🚩', blurb: 'A timed dash from the start line to a finish gate you choose. Race others or run solo.' },
  { id: 'cup', name: 'Championship', icon: '🏆', blurb: 'Three races in a row. Points for every finish. Win the cup and the big prize.' },
];
export const CUPS = [
  { id: 'rookie', name: 'Rookie Cup', tracks: ['speedway', 'greenwood', 'coast'] },
  { id: 'pro', name: 'Pro Series', tracks: ['harbour', 'canyon', 'greenwood'] },
  { id: 'legend', name: 'Legends Tour', tracks: ['canyon', 'harbour', 'alpine'] },
];
export const MODES_EXTRA = [{ id: 'career', name: 'Career', icon: '⭐', blurb: 'Twelve levels from first race to Ashford Legend. Clear one to unlock the next.' }];
// Sprint finish gates, as a fraction of a lap from the start line.
export const SPRINTS = [{ id: 'q', name: 'Gate A', frac: 0.25 }, { id: 'h', name: 'Gate B', frac: 0.5 }, { id: 't', name: 'Gate C', frac: 0.75 }, { id: 'f', name: 'Full lap', frac: 1 }, { id: 'x', name: 'Lap and a half', frac: 1.5 }];
// The career ladder. goal: { pos } = finish this high, { medal } = time-trial medal, { finish } = make it to the end.
export const CAREER = [
  { title: 'First Laps', mode: 'race', track: 'speedway', laps: 2, opp: 3, diff: 'rookie', goal: { pos: 3 }, reward: 100 },
  { title: 'Against the Clock', mode: 'trial', track: 'greenwood', goal: { medal: 'bronze' }, reward: 120 },
  { title: 'Seaside Dash', mode: 'sprint', track: 'coast', route: 'h', opp: 3, diff: 'rookie', goal: { pos: 1 }, reward: 150 },
  { title: 'Beat the Clock', mode: 'rush', track: 'speedway', laps: 2, diff: 'rookie', goal: { finish: true }, reward: 160 },
  { title: 'Street Fight', mode: 'race', track: 'harbour', laps: 2, opp: 5, diff: 'rookie', goal: { pos: 3 }, reward: 200 },
  { title: 'Last One Standing', mode: 'elim', track: 'canyon', opp: 4, diff: 'pro', goal: { pos: 2 }, reward: 260 },
  { title: 'Forest Grand Prix', mode: 'race', track: 'greenwood', laps: 3, opp: 5, diff: 'pro', goal: { pos: 1 }, reward: 320 },
  { title: 'Precision', mode: 'trial', track: 'harbour', goal: { medal: 'silver' }, reward: 350 },
  { title: 'Desert Clock', mode: 'rush', track: 'canyon', laps: 2, diff: 'pro', goal: { finish: true }, reward: 400 },
  { title: 'Mountain Sprint', mode: 'sprint', track: 'alpine', route: 'f', opp: 5, diff: 'pro', goal: { pos: 3 }, reward: 500 },
  { title: 'Coastal Showdown', mode: 'race', track: 'coast', laps: 3, opp: 7, diff: 'legend', goal: { pos: 3 }, reward: 700 },
  { title: 'Ashford Legend', mode: 'race', track: 'alpine', laps: 3, opp: 7, diff: 'legend', goal: { pos: 1 }, reward: 1200 },
];
export const DIFFS = [
  { id: 'rookie', name: 'Rookie', skill: 0.8, fee: 1 },
  { id: 'pro', name: 'Pro', skill: 0.9, fee: 2 },
  { id: 'legend', name: 'Legend', skill: 0.97, fee: 3.5 },
];
export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

// ---------------------------------------------------------------- sampling
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export function buildPath(track) {
  const curve = new THREE.CatmullRomCurve3(track.pts.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1])), true, 'centripetal');
  const N = Math.max(200, Math.round(curve.getLength() / 2));
  let P = curve.getSpacedPoints(N); P.pop();
  const n = P.length;
  {   // put the start / finish line on the straightest stretch (with straight road behind it for the grid)
    const h = P.map((p, i) => { const q = P[(i + 1) % n]; return Math.atan2(q.x - p.x, q.z - p.z); });
    const turn = i => Math.abs(wrapA(h[(i + 1) % n] - h[i]));
    let best = 0, bs = Infinity;
    for (let i = 0; i < n; i += 2) { let a = 0; for (let j = -45; j <= 25; j++) a += turn((i + j + n) % n); if (a < bs) { bs = a; best = i; } }
    P = [...P.slice(best), ...P.slice(0, best)];
  }
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), tx = new Float32Array(n), tz = new Float32Array(n);
  const yaw = new Float32Array(n), k = new Float32Array(n), grade = new Float32Array(n), s = new Float32Array(n);
  for (let i = 0; i < n; i++) { x[i] = P[i].x; y[i] = P[i].y; z[i] = P[i].z; }
  let L = 0;
  for (let i = 0; i < n; i++) { s[i] = L; const j = (i + 1) % n; L += Math.hypot(x[j] - x[i], z[j] - z[i]); }
  const ds = L / n;
  for (let i = 0; i < n; i++) s[i] = i * ds;   // samples are evenly spaced: keep distance and index in step
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n, dx = x[b] - x[a], dz = z[b] - z[a], d = Math.hypot(dx, dz) || 1;
    tx[i] = dx / d; tz[i] = dz / d; yaw[i] = Math.atan2(tx[i], tz[i]); grade[i] = (y[b] - y[a]) / d;
  }
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = wrapA(yaw[(i + 1) % n] - yaw[(i - 1 + n) % n]) / (2 * ds);
  for (let i = 0; i < n; i++) { let a = 0; for (let j = -3; j <= 3; j++) a += raw[(i + j + n) % n]; k[i] = a / 7; }   // smoothed curvature (+ = bending towards +side)
  // side vector: (tz, -tx). Positive "off" is that side.
  // ---- speed profile: corner limit, then braking backwards and accelerating forwards round the loop
  function profile({ top = 60, grip = 15, yawRate = 1.7, accel = 12, decel = 22 } = {}) {
    const v = new Float32Array(n);
    for (let i = 0; i < n; i++) { const kk = Math.max(Math.abs(k[i]), 1e-5); v[i] = Math.min(top, Math.sqrt(grip / kk), yawRate / kk); }
    for (let pass = 0; pass < 2; pass++) for (let i = n - 1; i >= 0; i--) { const j = (i + 1) % n; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * decel * ds)); }
    const brake = Float32Array.from(v);
    const acc = typeof accel === 'function' ? accel : () => accel;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { const j = (i - 1 + n) % n; v[i] = Math.min(v[i], Math.sqrt(Math.max(0, v[j] * v[j] + 2 * Math.max(0.5, acc(v[j])) * ds))); }
    let t = 0; for (let i = 0; i < n; i++) t += ds / Math.max(1, v[i]);
    return { brake, flying: v, lapTime: t, timeBetween(a, b) { let tt = 0; for (let sv = a; sv < b; sv += ds) tt += ds / Math.max(1, v[Math.floor(((sv % L) + L) % L / ds) % n]); return tt; } };
  }
  // ---- nearest centre-line point: local search from a hint, else a grid of cells
  const CELL = 16, cells = new Map(), key = (cx, cz) => cx * 100003 + cz;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const kk = key(Math.floor(x[i] / CELL), Math.floor(z[i] / CELL)); if (!cells.has(kk)) cells.set(kk, []); cells.get(kk).push(i);
    minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]); minZ = Math.min(minZ, z[i]); maxZ = Math.max(maxZ, z[i]); minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]);
  }
  function near(px, pz, radiusCells = 1) {   // indices of samples in nearby cells
    const cx = Math.floor(px / CELL), cz = Math.floor(pz / CELL), out = [];
    for (let a = -radiusCells; a <= radiusCells; a++) for (let b = -radiusCells; b <= radiusCells; b++) { const c = cells.get(key(cx + a, cz + b)); if (c) for (const i of c) out.push(i); }
    return out;
  }
  function project(i, px, pz) {
    const dx = px - x[i], dz = pz - z[i], along = dx * tx[i] + dz * tz[i], off = dx * tz[i] - dz * tx[i];
    return { i, along, off, s: (s[i] + along + L) % L, y: y[i] + grade[i] * along, d2: dx * dx + dz * dz };
  }
  function nearest(px, pz, hint = -1, radiusCells = 1) {
    let best = -1, bd = Infinity;
    const test = i => { const dx = px - x[i], dz = pz - z[i], d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } };
    if (hint >= 0) { for (let j = -30; j <= 30; j++) test((hint + j + n) % n); if (bd < 400) return project(best, px, pz); }
    for (const i of near(px, pz, radiusCells)) test(i);
    return best < 0 ? null : project(best, px, pz);
  }
  function at(sv, off = 0) {   // point on the line at distance sv, shifted sideways by off
    sv = ((sv % L) + L) % L; const f = sv / ds, i = Math.floor(f) % n, j = (i + 1) % n, u = f - Math.floor(f);
    const X = x[i] + (x[j] - x[i]) * u, Z = z[i] + (z[j] - z[i]) * u, Y = y[i] + (y[j] - y[i]) * u;
    const TX = tx[i] + (tx[j] - tx[i]) * u, TZ = tz[i] + (tz[j] - tz[i]) * u, tl = Math.hypot(TX, TZ) || 1;
    return { x: X + TZ / tl * off, y: Y, z: Z - TX / tl * off, yaw: Math.atan2(TX, TZ), i, grade: grade[i] };
  }
  // tightest corner and how much it climbs, for the menu
  let minR = Infinity, corners = 0, inCorner = false;
  for (let i = 0; i < n; i++) { const r = 1 / Math.max(Math.abs(k[i]), 1e-5); minR = Math.min(minR, r); const c = r < 120; if (c && !inCorner) corners++; inCorner = c; }
  return { n, L, ds, x, y, z, tx, tz, yaw, k, grade, s, at, nearest, near, profile, bounds: { minX, maxX, minZ, maxZ, minY, maxY }, minR, corners };
}

// Closest approach between two parts of the track that aren't next to each other (must be wide
// enough for two roads plus their walls), the steepest slope, and the tightest bend.
export function checkPath(p, hw) {
  let gap = Infinity, steep = 0;
  for (let i = 0; i < p.n; i++) {
    steep = Math.max(steep, Math.abs(p.grade[i]));
    for (const j of p.near(p.x[i], p.z[i], 4)) {
      const sep = Math.min(Math.abs(p.s[i] - p.s[j]), p.L - Math.abs(p.s[i] - p.s[j]));
      if (sep < 140) continue;
      gap = Math.min(gap, Math.hypot(p.x[i] - p.x[j], p.z[i] - p.z[j]));
    }
  }
  return { gap, steep, minR: p.minR, needGap: 2 * (hw + 6) };
}
