// Link roads: the districts were built one at a time and several were left as islands (or one road
// stopped a few metres short of another). These connectors join them all into one network:
//   the north housing grid to the fair road and the boulevard, the driving-test track to the
//   north road, the raceway to the boulevard, the east industrial grid to the town's east road,
//   the far-east grid, the military-airfield road (with its gap filled) and the south-east road down
//   to the business district, and the airport and the west road round to the town.
import * as THREE from 'three';

// [x0, x1, z0, z1]: axis-aligned stretches of road (each overlaps the roads it joins)
export const LINKS = [
  [116, 344, -634, -626], [164, 177, -641, -628],        // north housing grid <-> fair road (x 170) <-> boulevard
  [-466, -288, -449, -439], [-466, -456, -495, -439],    // driving-test track <-> north road (z -450)
  [-366, -354, -804, -767],                              // raceway <-> boulevard
  [535, 546, 25, 240],                                   // east industrial grid <-> town's east road
  [600, 610, -464, -446],                                // Lumen Heights / frontier yard <-> north road
  [940, 952, -85, 125],                                  // far-east grid <-> airfield road
  [1260, 1273, 114, 127],                                // the gap in the airfield road
  [954, 966, 120, 565],                                  // airfield road <-> south-east road <-> business district
  [-667, -657, 125, 262], [-667, -324, 252, 262], [-334, -324, 115, 505], [-334, -176, 115, 125],   // airport and the west road <-> town
];

// The long country stretches aren't flat: they rise and fall over gentle hills (never steeper than
// about 5%, like a real A-road), on embankments that slope down to the fields either side. They are
// level wherever another road joins, so every junction still meets flush.
//   r: the LINKS rectangle, flats: places along it (x for east-west roads, z for north-south) that stay level
export const HILLY = [
  { r: [954, 966, 120, 565], flats: [300] },          // the airfield road (level where The Reserve turns off)
  { r: [116, 344, -634, -626], flats: [170.5] },      // north housing grid <-> the fair road
  { r: [535, 546, 25, 240], flats: [] },              // east industrial grid <-> the town's east road
  { r: [940, 952, -85, 125], flats: [60] },           // far-east grid <-> airfield road (level where Eastfield Lane joins)
  { r: [-667, -324, 252, 262], flats: [] },           // airport road
  { r: [-334, -324, 115, 505], flats: [257] },        // the west road
  { r: [-466, -288, -449, -439], flats: [] },         // driving-test track <-> north road
];
const same = (a, b) => a.every((v, i) => v === b[i]);
function hillProfile(h) {
  const [x0, x1, z0, z1] = h.r, alongX = x1 - x0 > z1 - z0, a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
  const flats = [a0, ...h.flats, a1].sort((p, q) => p - q);
  const at = a => { for (let i = 0; i < flats.length - 1; i++) if (a >= flats[i] && a <= flats[i + 1]) { const f0 = flats[i] + 6, f1 = flats[i + 1] - 6, L = f1 - f0; if (L < 40 || a <= f0 || a >= f1) return 0; const A = Math.min(4.5, 0.05 * L / Math.PI), u = (a - f0) / L; return A * Math.sin(Math.PI * u) ** 2; } return 0; };
  return { alongX, a0, a1, at, mid: alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, half: (alongX ? z1 - z0 : x1 - x0) / 2 };
}
const PROFILES = HILLY.map(h => ({ ...hillProfile(h), r: h.r }));
// height of a sloped road (or its embankment) at (x, z), or null off them
export function linkGroundAt(x, z) {
  for (const p of PROFILES) {
    const a = p.alongX ? x : z, c = p.alongX ? z : x;
    if (a < p.a0 || a > p.a1) continue;
    const h = p.at(a); if (h < 0.05) continue;
    const off = Math.abs(c - p.mid);
    if (off <= p.half) return h + 0.06;
    if (off <= p.half + 2 * h) return (h + 0.06) * (1 - (off - p.half) / (2 * h));
  }
  return null;
}

export function buildRoadLinks({ scene, makeTex }) {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x2b2e32, roughness: 0.95 });
  const dash = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }), edge = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.8 });
  const geo = new THREE.BoxGeometry(1, 1, 1), root = new THREE.Group(); scene.add(root);
  const B = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(geo, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.receiveShadow = true; root.add(b); return b; };
  const grassBank = new THREE.MeshStandardMaterial({ color: 0x6b8a45, roughness: 1, side: THREE.DoubleSide });
  for (const p of PROFILES) buildHillyRoad(p);
  function buildHillyRoad(p) {
    // road ribbon, embankments, centre dashes and edge lines all follow the profile
    const N = Math.ceil((p.a1 - p.a0) / 2), road = [], bank = [], ri = [], bi = [];
    const P = (a, c, y) => p.alongX ? [a, y, c] : [c, y, a];
    for (let i = 0; i <= N; i++) {
      const a = p.a0 + (p.a1 - p.a0) * i / N, h = p.at(a), y = h + 0.06;
      road.push(...P(a, p.mid - p.half, y), ...P(a, p.mid + p.half, y));
      const e = Math.max(0.3, 2 * h);
      bank.push(...P(a, p.mid - p.half - e, 0.02), ...P(a, p.mid - p.half, y - 0.02), ...P(a, p.mid + p.half, y - 0.02), ...P(a, p.mid + p.half + e, 0.02));
      if (i < N) { const r = i * 2; ri.push(r, r + 1, r + 2, r + 1, r + 3, r + 2); const b = i * 4; bi.push(b, b + 1, b + 4, b + 1, b + 5, b + 4, b + 2, b + 3, b + 6, b + 3, b + 7, b + 6); }
    }
    const mk = (arr, idx, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setIndex(idx); g.computeVertexNormals(); const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; root.add(mesh); return mesh; };
    const rm = mk(road, ri, asphalt); rm.material = asphalt.clone(); rm.material.side = THREE.DoubleSide; mk(bank, bi, grassBank);
    for (let a = p.a0 + 3; a < p.a1 - 3; a += 6) { const h1 = p.at(a), h2 = p.at(a + 3), len = Math.hypot(3, h2 - h1), m = B(p.alongX ? len : 0.15, 0.01, p.alongX ? 0.15 : len, ...P(a + 1.5, p.mid, (h1 + h2) / 2 + 0.075), dash); const ang = Math.atan2(h2 - h1, 3); if (p.alongX) m.rotation.z = ang; else m.rotation.x = -ang; }
    for (const sd of [-1, 1]) for (let a = p.a0 + 7; a < p.a1 - 7; a += 4) { const h1 = p.at(a), h2 = p.at(a + 4), len = Math.hypot(4, h2 - h1), m = B(p.alongX ? len : 0.12, 0.01, p.alongX ? 0.12 : len, ...P(a + 2, p.mid + sd * (p.half - 0.5), (h1 + h2) / 2 + 0.072), edge); const ang = Math.atan2(h2 - h1, 4); if (p.alongX) m.rotation.z = ang; else m.rotation.x = -ang; }
  }
  for (const [x0, x1, z0, z1] of LINKS) {
    if (HILLY.some(h => same(h.r, [x0, x1, z0, z1]))) continue;   // built above, over the hills
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = w > d;
    B(w, 0.06, d, cx, 0.03, cz, asphalt);
    const len = alongX ? w : d, wid = alongX ? d : w;
    // dashed centre line, solid edge lines (stopping short of the ends so junctions stay clean)
    for (let a = -len / 2 + 3; a < len / 2 - 3; a += 6) alongX ? B(3, 0.01, 0.15, cx + a + 1.5, 0.065, cz, dash) : B(0.15, 0.01, 3, cx, 0.065, cz + a + 1.5, dash);
    if (wid >= 9 && len > 20) for (const s of [-1, 1]) alongX ? B(len - 14, 0.01, 0.12, cx, 0.064, cz + s * (wid / 2 - 0.5), edge) : B(0.12, 0.01, len - 14, cx + s * (wid / 2 - 0.5), 0.064, cz, edge);
  }
  void makeTex;
  return { links: LINKS, groundAt: linkGroundAt };
}
