// Ashford Racing: builds the world for one circuit, far away from the city (each track has its
// own patch of land at z ≈ -14 km). Road with racing lines, kerbs on the corners, run-off, walls,
// terrain that follows the road (cuttings and embankments), and scenery that matches the theme:
//   grass   – grandstands and parkland        forest – dense mixed woodland and hills
//   coast   – beach, sea, palms, lighthouse   city   – skyscrapers, street lamps, neon
//   canyon  – red mesas, cacti and rocks      alpine – pines, snowfields, huge peaks
// Returns { group, path, hw, groundAt(x, z), slot(k), lights, minimap, ... }.
import * as THREE from 'three';
import { createForest } from './trees.js';
import { buildPath } from './race-tracks.js';

export const WORLD_Z = -14000, WORLD_STEP = 3200;
const WALL = 4.6;   // walls stand this far beyond the edge of the tarmac

function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 7, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3 + 3) * 0.15;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rand = (() => { let s = 98765; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

export const THEMES = {
  grass: { ground: [0x4c7a36, 0x6b9446], verge: 0x5a8a3c, wall: 'armco', hills: 3, trees: ['oak', 170], stands: 2 },
  forest: { ground: [0x3b6a2c, 0x5a843a], verge: 0x4d7d36, wall: 'tyres', hills: 9, trees: ['mix', 650], stands: 1 },
  coast: { ground: [0x6c9a48, 0x8aa957], verge: 0xd8c690, wall: 'armco', hills: 4, trees: ['palm', 170], stands: 1, sea: true },
  city: { ground: [0x4b5057, 0x575c63], verge: 0x6a6e74, wall: 'concrete', hills: 0, buildings: true, stands: 1 },
  canyon: { ground: [0xbf7a46, 0xd89a60], verge: 0xc58a5a, wall: 'rock', hills: 3, mesas: true, stands: 1 },
  alpine: { ground: [0x587a48, 0x6f8c58], verge: 0xe8eef2, wall: 'snow', hills: 46, trees: ['pine', 520], stands: 1, peaks: true },
};

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const noiseFill = (g, w, h, base, spread, n = 2500) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = Math.floor(rand() * spread); g.fillStyle = `rgba(${v},${v},${v},0.13)`; g.fillRect(rand() * w, rand() * h, 2, 2); } };
let TEX = null;
function textures() {
  if (TEX) return TEX;
  TEX = {
    road: canvasTex(128, 256, (g, w, h) => { noiseFill(g, w, h, '#3b3e44', 255, 3000); g.fillStyle = '#eceff1'; g.fillRect(3, 0, 4, h); g.fillRect(w - 7, 0, 4, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(w * 0.3, 0, w * 0.4, h); }),
    kerb: canvasTex(32, 64, (g, w, h) => { g.fillStyle = '#d42a24'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f4f4f4'; g.fillRect(0, h / 2, w, h / 2); }),
    checker: canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 8, j * 8, 8, 8); } }),
    armco: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#9aa3ab'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9d0d6'; g.fillRect(0, 34, w, 12); g.fillRect(0, 50, w, 10); g.fillStyle = '#c62828'; g.fillRect(0, 22, w / 2, 8); g.fillStyle = '#fafafa'; g.fillRect(w / 2, 22, w / 2, 8); g.fillStyle = '#5b6168'; g.fillRect(0, 0, w, 22); }),
    tyres: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#2a2b2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181a'; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.ellipse(16 + i * 32, 12 + j * 21, 14, 9, 0, 0, 7); g.fill(); } g.fillStyle = '#f2f2f2'; g.fillRect(0, 40, w, 4); g.fillStyle = '#d32f2f'; g.fillRect(0, 22, w, 4); }),
    concrete: canvasTex(256, 64, (g, w, h) => { noiseFill(g, w, h, '#b9bcbf', 120, 800); const ads = [['#0d47a1', 'AEGIS FUEL'], ['#c62828', 'NOVA COLA'], ['#1b5e20', 'ASHFORD BANK'], ['#ff6f00', 'VOLT MOTORS']]; const a = ads[Math.floor(rand() * ads.length)]; g.fillStyle = a[0]; g.fillRect(8, 26, w - 16, 30); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText(a[1], w / 2, 49); }),
    rock: canvasTex(128, 64, (g, w, h) => { noiseFill(g, w, h, '#8a5a3c', 200, 900); g.strokeStyle = 'rgba(60,30,15,.6)'; for (let i = 0; i < 9; i++) { g.strokeRect(rand() * w, rand() * h, 20 + rand() * 30, 10 + rand() * 14); } }),
    snow: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#eef3f7'; g.fillRect(0, 0, w, h); g.fillStyle = '#d32f2f'; g.fillRect(28, 0, 8, h); g.fillStyle = '#1e5bb8'; g.fillRect(0, 50, w, 6); }),
    windows: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#2b3240'; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) { const on = rand(); g.fillStyle = on > 0.55 ? `hsl(${40 + rand() * 20},80%,${55 + rand() * 25}%)` : on > 0.25 ? '#3d4a5e' : '#1b2230'; g.fillRect(x, y, 6, 6); } }),
    pit: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = '#5a6470'; g.fillRect(4 + i * 32, 18, 26, 46); g.fillStyle = '#717c88'; for (let y = 20; y < 64; y += 5) g.fillRect(4 + i * 32, y, 26, 1); } g.fillStyle = '#d32f2f'; g.fillRect(0, 0, w, 10); }),
    mesa: canvasTex(64, 128, (g, w, h) => { for (let y = 0; y < h; y += 4) { const t = Math.sin(y * 0.21) * 0.5 + 0.5; g.fillStyle = `rgb(${150 + t * 50},${80 + t * 30},${50 + t * 15})`; g.fillRect(0, y, w, 4); } }),
    banner: canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.font = 'italic 900 40px sans-serif'; g.textAlign = 'center'; g.fillText('ASHFORD RACING', w / 2, 46); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#fff' : '#111'; g.fillRect(i * 32, 0, 32, 6); g.fillStyle = i % 2 ? '#111' : '#fff'; g.fillRect(i * 32, h - 6, 32, 6); } }, false),
    chevron: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d32f2f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 9; for (const o of [14, 36]) { g.beginPath(); g.moveTo(o, 10); g.lineTo(o + 14, 32); g.lineTo(o, 54); g.stroke(); } }, false),
  };
  TEX.boards = ['AEGIS FUEL', 'WESTHAVEN TYRES', 'NOVA COLA', 'ASHFORD BANK', 'VOLT MOTORS', 'SKYLINE AIR'].map((t, i) => canvasTex(256, 96, (g, w, h) => {
    const cols = ['#0d47a1', '#212121', '#c62828', '#1b5e20', '#ff6f00', '#4a148c'];
    g.fillStyle = cols[i]; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `italic 900 ${t.length > 12 ? 26 : 34}px sans-serif`; g.textAlign = 'center'; g.fillText(t, w / 2, h / 2 + 12); g.fillStyle = '#ffd23f'; g.fillRect(0, h - 10, w, 10);
  }, false));
  return TEX;
}

const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

export function buildRaceWorld({ scene, track, index, lowPower = false }) {
  const T = textures(), th = THEMES[track.theme], hw = track.hw;
  const path = buildPath(track), n = path.n, { x: PX, y: PY, z: PZ, tx: TX, tz: TZ, k: K } = path;
  const ox = 0, oz = WORLD_Z - index * WORLD_STEP;
  const group = new THREE.Group(); group.position.set(ox, 0, oz); group.userData.noCull = true; group.visible = false; scene.add(group);
  const add = (m, cast = false) => { m.castShadow = cast; m.receiveShadow = true; group.add(m); return m; };
  const P = (i, off, dy = 0) => [PX[i] + TZ[i] * off, PY[i] + dy, PZ[i] - TX[i] * off];

  // ---------------------------------------------------------------- ribbons along the track
  function strip(runs, f, vLen, material) {
    const pos = [], uv = [], idx = []; let base = 0;
    for (const run of runs) {
      let sv = 0;
      run.forEach((i, r) => {
        if (r) sv += path.ds;
        const q = f(i); pos.push(...q); uv.push(0, sv / vLen, 1, sv / vLen);
        if (r) { const a = base + (r - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      });
      base += run.length * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return add(new THREE.Mesh(g, material));
  }
  const loop = [...Array(n).keys(), 0];
  const roadTex = T.road.clone(); roadTex.needsUpdate = true;
  strip([loop], i => [...P(i, -hw, 0.06), ...P(i, hw, 0.06)], 12, mat({ map: roadTex, roughness: 0.82, side: THREE.DoubleSide }));
  const vergeMat = mat({ color: th.verge, roughness: 1, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) strip([loop], i => [...P(i, sd * hw, 0.04), ...P(i, sd * (hw + WALL + 0.3), 0.04)], 10, vergeMat);
  // kerbs only where the road bends
  const runs = []; { let cur = null; for (let i = 0; i < n; i++) { const bend = Math.abs(K[i]) > 1 / 160; if (bend) { if (!cur) { cur = []; runs.push(cur); } cur.push(i); } else cur = null; } if (runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1].at(-1) === n - 1) runs[0] = [...runs.pop(), ...runs[0]]; }
  const kerbMat = mat({ map: T.kerb, roughness: 0.7, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) strip(runs, i => [...P(i, sd * (hw - 0.4), 0.09), ...P(i, sd * (hw + 1.3), 0.09)], 4, kerbMat);
  // walls
  const wallTex = T[th.wall].clone(); wallTex.needsUpdate = true;
  const wallMat = mat({ map: wallTex, roughness: 0.6, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) add(strip([loop], i => [...P(i, sd * (hw + WALL), -1.6), ...P(i, sd * (hw + WALL), 1.05)], th.wall === 'concrete' ? 16 : 4, wallMat), false);
  // start / finish line and the grid boxes
  { const line = []; for (let i = 0; Math.abs(path.s[i]) < 3; i++) line.push(i); strip([line], i => [...P(i, -hw, 0.08), ...P(i, hw, 0.08)], 1.2, mat({ map: T.checker, side: THREE.DoubleSide })).material.map.repeat.set(hw / 2, 1); }
  const slot = k => { const row = Math.floor(k / 2), sd = k % 2 ? -1 : 1; return { s: path.L - 14 - row * 9 - (k % 2) * 3, off: sd * hw * 0.42 }; };
  { const white = mat({ color: 0xf2f2f2 }); const geo = new THREE.BoxGeometry(hw * 0.6, 0.02, 0.35);
    for (let k = 0; k < 8; k++) { const q = slot(k), a = path.at(q.s + 2.4, q.off); const m = add(new THREE.Mesh(geo, white)); m.position.set(a.x, a.y + 0.09, a.z); m.rotation.y = a.yaw; } }

  // ---------------------------------------------------------------- terrain that follows the road
  const b = path.bounds, M = 240, res = lowPower ? 9 : 6;
  const gx0 = b.minX - M, gz0 = b.minZ - M, GW = Math.ceil((b.maxX - b.minX + 2 * M) / res), GD = Math.ceil((b.maxZ - b.minZ + 2 * M) / res);
  const H = new Float32Array((GW + 1) * (GD + 1)), trendPts = [];
  for (let i = 0; i < n; i += 8) trendPts.push(i);
  const seaZ = b.minZ - 18;
  for (let j = 0; j <= GD; j++) for (let i = 0; i <= GW; i++) {
    const x = gx0 + i * res, z = gz0 + j * res;
    let ws = 0, a = 0; for (const t of trendPts) { const w = 1 / ((x - PX[t]) ** 2 + (z - PZ[t]) ** 2 + 900); ws += w; a += w * PY[t]; }
    let h = a / ws;
    const q = path.nearest(x, z, -1, 3), d = q ? Math.sqrt(q.d2) : 1e9;
    let natural = th.hills * (fbm(x / 140, z / 140) - 0.35) * 2;
    if (track.theme === 'alpine') natural = th.hills * Math.pow(fbm(x / 170, z / 170), 1.6) * 2.2 * smooth(hw + 20, 160, d);
    h += natural;
    if (q && d < hw + 50) h = THREE.MathUtils.lerp(q.y - 0.5, h, smooth(hw + WALL + 1, hw + 50, d));
    const dOut = Math.max(b.minX - x, x - b.maxX, b.minZ - z, z - b.maxZ, 0);
    h *= 1 - smooth(M * 0.5, M * 0.95, dOut);
    if (th.sea) h -= 14 * smooth(seaZ, seaZ - 90, z);
    H[j * (GW + 1) + i] = h;
  }
  const heightAt = (x, z) => {
    const fx = (x - gx0) / res, fz = (z - gz0) / res; if (fx < 0 || fz < 0 || fx >= GW || fz >= GD) return th.sea && z < seaZ ? -14 : 0;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, r = GW + 1;
    return H[j * r + i] * (1 - u) * (1 - v) + H[j * r + i + 1] * u * (1 - v) + H[(j + 1) * r + i] * (1 - u) * v + H[(j + 1) * r + i + 1] * u * v;
  };
  {
    const pos = new Float32Array((GW + 1) * (GD + 1) * 3), col = new Float32Array(pos.length), idx = [];
    const c0 = new THREE.Color(th.ground[0]), c1 = new THREE.Color(th.ground[1]), sand = new THREE.Color(0xd8c690), rock = new THREE.Color(0x77736d), snow = new THREE.Color(0xf1f5f8), red = new THREE.Color(0xa0522d), c = new THREE.Color();
    for (let j = 0; j <= GD; j++) for (let i = 0; i <= GW; i++) {
      const k = j * (GW + 1) + i, x = gx0 + i * res, z = gz0 + j * res, h = H[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      const sl = Math.abs(H[k] - H[Math.min(k + 1, H.length - 1)]) / res + Math.abs(H[k] - H[Math.min(k + GW + 1, H.length - 1)]) / res;
      c.copy(c0).lerp(c1, fbm(x / 30, z / 30));
      if (th.sea && h < 1.2) c.copy(sand);
      if (track.theme === 'canyon') c.lerp(red, 0.3 * (Math.sin(h * 0.7) * 0.5 + 0.5));
      if (track.theme === 'alpine') { if (sl > 0.9) c.copy(rock); if (h > 70 + fbm(x / 20, z / 20) * 20) c.copy(snow); else if (h > 55) c.lerp(snow, 0.5); }
      else if (sl > 1.2) c.lerp(rock, 0.6);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    for (let j = 0; j < GD; j++) for (let i = 0; i < GW; i++) { const a = j * (GW + 1) + i, b2 = a + 1, c2 = a + GW + 1, d2 = c2 + 1; idx.push(a, c2, b2, b2, c2, d2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    add(new THREE.Mesh(g, mat({ vertexColors: true, roughness: 1 })));
    // land beyond the edges (and the sea for the coast road)
    const outer = add(new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat({ color: th.ground[0], roughness: 1 })));
    outer.rotation.x = -Math.PI / 2; outer.position.set((b.minX + b.maxX) / 2, -0.4, th.sea ? seaZ - 70 + 4500 : (b.minZ + b.maxZ) / 2);
    if (th.sea) {
      const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(9000, 6000), mat({ color: 0x1f6f9a, roughness: 0.25, metalness: 0.1 })));
      sea.rotation.x = -Math.PI / 2; sea.position.set((b.minX + b.maxX) / 2, -1.4, seaZ - 3000);
    }
  }
  const spotFree = (x, z, minD) => { const q = path.nearest(x, z, -1, Math.ceil(minD / 16)); return !q || Math.sqrt(q.d2) > minD; };
  const randIn = () => [b.minX - M * 0.8 + rand() * (b.maxX - b.minX + M * 1.6), b.minZ - M * 0.8 + rand() * (b.maxZ - b.minZ + M * 1.6)];

  // ---------------------------------------------------------------- start gantry with the five race lights
  const lights = [];
  {
    const a = path.at(0), steel = mat({ color: 0x2b2f35, metalness: 0.5, roughness: 0.5 });
    const g = new THREE.Group(); g.position.set(a.x, a.y, a.z); g.rotation.y = a.yaw; group.add(g);
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), steel); p.position.set(sd * (hw + 2.5), 4, 0); p.castShadow = true; g.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * hw + 5.6, 1.6, 0.8), [steel, steel, steel, steel, mat({ map: T.banner }), mat({ map: T.banner })]); beam.position.y = 8; g.add(beam);
    const bulb = new THREE.SphereGeometry(0.42, 12, 8);
    for (let i = 0; i < 5; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x220606, emissive: 0xff1a1a, emissiveIntensity: 0 }); const l = new THREE.Mesh(bulb, m); l.position.set((i - 2) * 1.3, 6.6, -0.5); g.add(l); lights.push(m); }
  }
  // grandstands with a crowd, and a pit building opposite
  function stand(s0, side, len) {
    const a = path.at(s0 + len / 2), g = new THREE.Group(); g.position.set(a.x, a.y, a.z); g.rotation.y = a.yaw; group.add(g);
    const seat = mat({ color: 0x9aa3ad }), back = mat({ color: 0x37474f });
    for (let t = 0; t < 6; t++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9 + t * 1.1, len), seat); m.position.set(side * (hw + WALL + 3 + t * 2.2), (0.9 + t * 1.1) / 2, 0); m.receiveShadow = true; g.add(m); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, len + 2), back); roof.position.set(side * (hw + WALL + 8.5), 11.5, 0); roof.castShadow = true; g.add(roof);
    const wallB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 11.5, len), back); wallB.position.set(side * (hw + WALL + 16), 5.75, 0); g.add(wallB);
    const cnt = lowPower ? 140 : 320, crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.95, 0.42), new THREE.MeshStandardMaterial({ roughness: 0.8 }), cnt), m4 = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < cnt; i++) { const t = Math.floor(rand() * 6); m4.makeTranslation(side * (hw + WALL + 3 + t * 2.2), 0.9 + t * 1.1 + 0.45, (rand() - 0.5) * (len - 1)); crowd.setMatrixAt(i, m4); crowd.setColorAt(i, col.setHSL(rand(), 0.7, 0.5)); }
    g.add(crowd); return g;
  }
  stand(-75, 1, 70);
  if (th.stands > 1) stand(path.L / 2 - 40, 1, 60);
  {
    const a = path.at(-30), g = new THREE.Group(); g.position.set(a.x, a.y, a.z); g.rotation.y = a.yaw; group.add(g);
    const pit = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 70), [mat({ color: 0xe0e0e0 }), mat({ map: T.pit }), mat({ color: 0xd32f2f }), mat({ color: 0xcccccc }), mat({ color: 0xe0e0e0 }), mat({ color: 0xe0e0e0 })]);
    pit.position.set(-(hw + WALL + 10), 3.5, 0); pit.castShadow = true; g.add(pit);
    T.pit.rotation = Math.PI / 2;
  }
  // billboards on the straights and chevron boards on the outside of tight bends
  {
    const post = mat({ color: 0x555b62 }), boardGeo = new THREE.BoxGeometry(10, 3.8, 0.25), postGeo = new THREE.BoxGeometry(0.3, 3.4, 0.3);
    let side = 1;
    for (let i = 40; i < n - 40; i += Math.round(130 / path.ds)) {
      if (Math.abs(K[i]) > 0.004) continue;
      side = -side; const p = P(i, side * (hw + WALL + 6));
      if (!spotFree(p[0], p[2], hw + WALL + 4)) continue;
      const g = new THREE.Group(); g.position.set(p[0], heightAt(p[0], p[2]), p[2]); g.rotation.y = path.yaw[i] + side * Math.PI / 2; group.add(g);
      const bd = new THREE.Mesh(boardGeo, [post, post, post, post, mat({ map: T.boards[Math.floor(rand() * T.boards.length)] }), post]); bd.position.y = 5; bd.castShadow = true; g.add(bd);
      for (const dx of [-3.5, 3.5]) { const pp = new THREE.Mesh(postGeo, post); pp.position.set(dx, 1.7, 0); g.add(pp); }
    }
    const chev = new THREE.PlaneGeometry(2.2, 1.6), chevMat = mat({ map: T.chevron, side: THREE.DoubleSide });
    for (let i = 0; i < n; i += 7) {
      if (Math.abs(K[i]) < 1 / 75) continue;
      const out = -Math.sign(K[i]), p = P(i, out * (hw + WALL - 0.2), 1.9);
      const m = add(new THREE.Mesh(chev, chevMat)); m.position.set(...p); m.rotation.y = path.yaw[i] + Math.PI; m.scale.x = out;
    }
  }

  // ---------------------------------------------------------------- theme scenery
  const forest = createForest(group);
  if (th.trees) {
    const [kind, count] = th.trees, total = Math.round(count * (lowPower ? 0.5 : 1));
    let placed = 0;
    for (let tries = 0; placed < total && tries < total * 6; tries++) {
      const [x, z] = randIn(); if (!spotFree(x, z, hw + WALL + 7)) continue;
      const h = heightAt(x, z); if (th.sea && h < 0.8) continue; if (track.theme === 'alpine' && h > 66) continue;
      const kd = kind === 'mix' ? ['oak', 'oak', 'pine', 'birch'][Math.floor(rand() * 4)] : kind;
      forest.add(x, h - 0.1, z, { kind: kd, scale: 0.9 + rand() * 0.8 }); placed++;
    }
  }
  forest.flush();
  if (track.theme === 'canyon' || track.theme === 'alpine') {   // boulders
    const cnt = lowPower ? 70 : 150, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat({ color: track.theme === 'canyon' ? 0x9c5a35 : 0x7d7f83, flatShading: true }), cnt), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let i = 0; for (let tries = 0; i < cnt && tries < cnt * 6; tries++) { const [x, z] = randIn(); if (!spotFree(x, z, hw + WALL + 4)) continue; const s = 0.8 + rand() * 3.2; m4.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.3, z), q.setFromEuler(e.set(rand() * 3, rand() * 3, 0)), new THREE.Vector3(s, s * 0.7, s * 1.2)); rocks.setMatrixAt(i++, m4); }
    rocks.count = i; add(rocks, true);
  }
  if (th.mesas) {
    const m = mat({ map: T.mesa, roughness: 1 });
    let made = 0; for (let tries = 0; made < 14 && tries < 400; tries++) {
      const [x, z] = randIn(), r = 22 + rand() * 45; if (!spotFree(x, z, hw + WALL + 8 + r)) continue;
      const h = 22 + rand() * 50, me = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r, h, 9), m), true); me.position.set(x, heightAt(x, z) + h / 2 - 1, z); me.rotation.y = rand() * 3; made++;
    }
    const cnt = lowPower ? 90 : 180, parts = [new THREE.CylinderGeometry(0.35, 0.4, 4, 7).translate(0, 2, 0), new THREE.CylinderGeometry(0.22, 0.22, 1.6, 6).translate(0.9, 2.6, 0), new THREE.CylinderGeometry(0.22, 0.22, 1.2, 6).translate(-0.8, 2.2, 0), new THREE.CylinderGeometry(0.22, 0.22, 0.8, 6).rotateZ(Math.PI / 2).translate(0.5, 1.9, 0), new THREE.CylinderGeometry(0.22, 0.22, 0.7, 6).rotateZ(Math.PI / 2).translate(-0.45, 1.7, 0)];
    const cac = new THREE.InstancedMesh(mergeAll(parts), mat({ color: 0x3f7a3a }), cnt), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    let i = 0; for (let tries = 0; i < cnt && tries < cnt * 6; tries++) { const [x, z] = randIn(); if (!spotFree(x, z, hw + WALL + 4)) continue; const s = 0.7 + rand() * 0.7; cac.setMatrixAt(i++, m4.compose(new THREE.Vector3(x, heightAt(x, z), z), q.setFromAxisAngle(up, rand() * 6), new THREE.Vector3(s, s, s))); }
    cac.count = i; add(cac, true);
  }
  if (th.peaks) {
    const rockM = mat({ color: 0x6c6f74, flatShading: true }), snowM = mat({ color: 0xf4f7fa, flatShading: true }), cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, R = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + M + 180;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + rand() * 0.3, d = R + rand() * 300, r = 180 + rand() * 160, h = 220 + rand() * 200;
      const pk = add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockM)); pk.position.set(cx + Math.cos(a) * d, h / 2 - 5, cz + Math.sin(a) * d);
      const cap = add(new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.36, 7), snowM)); cap.position.set(pk.position.x, h - h * 0.18 - 4.5, pk.position.z);
    }
  }
  if (th.sea) {   // a lighthouse on the shore
    const x = (b.minX + b.maxX) / 2 + 160, z = seaZ - 40, g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); group.add(g);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(3 - i * 0.3, 3.3 - i * 0.3, 5, 14), mat({ color: i % 2 ? 0xd32f2f : 0xf5f5f5 })); s.position.y = 2.5 + i * 5; s.castShadow = true; g.add(s); }
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.5, 10), new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffe08a, emissiveIntensity: 1.5 })); lamp.position.y = 26.5; g.add(lamp);
  }
  if (th.buildings) {
    const cnt = lowPower ? 80 : 150, geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const winTex = T.windows; winTex.repeat.set(2, 4);
    const bld = new THREE.InstancedMesh(geo, mat({ map: winTex, emissiveMap: winTex, emissive: 0x888888, emissiveIntensity: 0.5, roughness: 0.6 }), cnt), neon = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 40);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    let i = 0, ni = 0;
    for (let tries = 0; i < cnt && tries < cnt * 10; tries++) {
      const [x, z] = randIn(), w = 14 + rand() * 22, d = 14 + rand() * 22, h = 18 + Math.pow(rand(), 1.5) * 90, ry = Math.round(rand() * 4) * Math.PI / 2;
      if (!spotFree(x, z, hw + WALL + 6 + Math.hypot(w, d) / 2)) continue;
      bld.setMatrixAt(i, m4.compose(new THREE.Vector3(x, -0.5, z), q.setFromAxisAngle(up, ry), new THREE.Vector3(w, h, d))); bld.setColorAt(i++, col.setHSL(0.58 + rand() * 0.1, 0.12, 0.55 + rand() * 0.35));
      if (ni < 40 && rand() < 0.4) { neon.setMatrixAt(ni, m4.compose(new THREE.Vector3(x, h - 0.5 - rand() * h * 0.4, z), q.setFromAxisAngle(up, ry), new THREE.Vector3(w + 0.4, 1.1, d + 0.4))); neon.setColorAt(ni++, col.setHSL([0.92, 0.5, 0.15, 0.78][Math.floor(rand() * 4)], 1, 0.6)); }
    }
    bld.count = i; neon.count = ni; add(bld, true); add(neon);
    const lamps = Math.floor(n / Math.round(32 / path.ds)) * 2, pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6).translate(0, 3.5, 0), mat({ color: 0x3a3f45 }), lamps), head = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2a8, emissiveIntensity: 2 }), lamps);
    let li = 0; for (let j = 0; j < n && li < lamps; j += Math.round(32 / path.ds)) for (const sd of [-1, 1]) { const p = P(j, sd * (hw + WALL + 0.8)); pole.setMatrixAt(li, m4.makeTranslation(p[0], p[1] - 0.2, p[2])); head.setMatrixAt(li++, m4.compose(new THREE.Vector3(p[0] - TZ[j] * sd * 0.6, p[1] + 6.9, p[2] + TX[j] * sd * 0.6), q.setFromAxisAngle(up, path.yaw[j] + Math.PI / 2), new THREE.Vector3(1, 1, 1))); }
    pole.count = head.count = li; add(pole); add(head);
  }

  // ---------------------------------------------------------------- minimap picture
  const minimap = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const mapScale = 150 / Math.max(b.maxX - b.minX, b.maxZ - b.minZ), mapX = x => 90 + (x - (b.minX + b.maxX) / 2) * mapScale, mapZ = z => 90 + (z - (b.minZ + b.maxZ) / 2) * mapScale;
  if (minimap) {
    minimap.width = minimap.height = 180; const g = minimap.getContext('2d');
    g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#000a'; g.lineWidth = 9; const draw = () => { g.beginPath(); for (let i = 0; i <= n; i += 3) { const j = i % n; i ? g.lineTo(mapX(PX[j]), mapZ(PZ[j])) : g.moveTo(mapX(PX[j]), mapZ(PZ[j])); } g.closePath(); g.stroke(); };
    draw(); g.strokeStyle = '#e8e8e8'; g.lineWidth = 4; draw();
    g.fillStyle = '#fff'; g.fillRect(mapX(PX[0]) - 3, mapZ(PZ[0]) - 3, 6, 6);
  }

  // where things stand on the ground (world coordinates)
  let hint = -1;
  function groundAt(wx, wz) {
    const x = wx - ox, z = wz - oz;
    if (x < gx0 - 4000 || x > gx0 + GW * res + 4000 || z < gz0 - 4000 || z > gz0 + GD * res + 4000) return null;
    const q = path.nearest(x, z, hint, 1);
    if (q && Math.abs(q.off) < hw + WALL + 0.5 && q.d2 < (hw + WALL + 2) ** 2) { hint = q.i; return q.y + 0.06; }
    return heightAt(x, z);
  }
  return { group, path, hw, wallOff: hw + WALL, ox, oz, slot, lights, groundAt, heightAt, minimap, mapX, mapZ, track };
}

function mergeAll(geos) {   // tiny merge for non-indexed parts
  const pos = [], nor = [];
  for (let g of geos) { g = g.index ? g.toNonIndexed() : g; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out;
}
