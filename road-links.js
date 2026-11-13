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

export function buildRoadLinks({ scene, makeTex }) {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x2b2e32, roughness: 0.95 });
  const dash = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }), edge = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.8 });
  const geo = new THREE.BoxGeometry(1, 1, 1), root = new THREE.Group(); scene.add(root);
  const B = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(geo, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.receiveShadow = true; root.add(b); return b; };
  for (const [x0, x1, z0, z1] of LINKS) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = w > d;
    B(w, 0.06, d, cx, 0.03, cz, asphalt);
    const len = alongX ? w : d, wid = alongX ? d : w;
    // dashed centre line, solid edge lines (stopping short of the ends so junctions stay clean)
    for (let a = -len / 2 + 3; a < len / 2 - 3; a += 6) alongX ? B(3, 0.01, 0.15, cx + a + 1.5, 0.065, cz, dash) : B(0.15, 0.01, 3, cx, 0.065, cz + a + 1.5, dash);
    if (wid >= 9 && len > 20) for (const s of [-1, 1]) alongX ? B(len - 14, 0.01, 0.12, cx, 0.064, cz + s * (wid / 2 - 0.5), edge) : B(0.12, 0.01, len - 14, cx + s * (wid / 2 - 0.5), 0.064, cz, edge);
  }
  void makeTex;
  return { links: LINKS };
}
