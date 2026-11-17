// PONDS that obey gravity. Water lies in a hollow: a pond is a basin dug below the ground around it, with
// banks that slope down to a muddy bed, and water filling it to a level a little below the top of the bank.
// It is not a flat disc painted on the grass.
//
// How it is drawn: every surface the pond sits in (the grass, the pavement, a lawn, a glasshouse floor) gets a
// hole cut in it exactly where the pond is (holeMaterial adds this to its shader), so you look down into the
// basin. The basin itself is one lathe-turned mesh: the rim at ground level, the banks, then the bed.
import * as THREE from 'three';

const MAX = 8;
// [x, z, radius x, radius z] of each pond; the shaders read these
const HOLES = Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, 0, 0));
const patched = new WeakSet();

// cut the ponds out of a material (the ground under a pond, a lawn, a floor…)
export function holeMaterial(m) {
  if (!m || patched.has(m)) return m; patched.add(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uHoles = { value: HOLES };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHoleW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHoleW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHoleW;\nuniform vec4 uHoles[${MAX}];`)
      .replace('void main() {', `void main() {\n  for (int i = 0; i < ${MAX}; i++) { vec4 h = uHoles[i]; if (h.z > 0.0) { vec2 d = (vHoleW.xz - h.xy) / h.zw; if (dot(d, d) < 1.0) discard; } }`);
  };
  const key = Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') ? m.customProgramCacheKey.bind(m) : null;
  m.customProgramCacheKey = () => (key ? key() : '') + '|pondholes';
  m.needsUpdate = true;
  return m;
}

// dig a pond: returns { water, level, bed, inside(x, z) }
//   rim   – the height of the ground round it (the top of the bank)
//   level – the water level (below the rim, so the water sits in the hollow)
//   bed   – the height of the muddy bottom
export const pondSlotsFree = () => HOLES.filter(h => h.z === 0).length;
export function digPond(parent, { x, z, rx, rz = rx, rim = 0, level = rim - .3, bed = level - 1.5, water = null, materials = [] }) {
  const slot = HOLES.find(h => h.z === 0); if (slot) slot.set(x, z, rx, rz);   // (at most 8 ponds can cut the ground at once)
  for (const m of materials) holeMaterial(m);
  // the bank profile, from the middle of the bed out to the rim (radius as a share of the pond's radius)
  const toe = .5, shelf = .78, shelfY = level - .3;   // a wide sloping bank you can see above the water
  const pts = [[0, bed], [toe, bed], [shelf, shelfY]];
  for (let k = 1; k <= 6; k++) pts.push([shelf + (.985 - shelf) * k / 6, shelfY + (rim - .025 - shelfY) * k / 6]);   // the bank, in steps (so its colours stay crisp)
  pts.push([1, rim]);   // a short grassy lip
  const prof = pts.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(prof, 48);
  // mud darker the deeper it is, wet sand at the waterline, a grassy lip at the top
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = (y - bed) / Math.max(.01, rim - bed);
    c.setHex(y > rim - .02 ? 0x5f7a3a : y > level + .06 ? 0x7a6448 : y > level - .25 ? 0x9a8a62 : 0x3e3426).multiplyScalar(.8 + t * .3);   // grass, earth bank, wet sand at the waterline, mud
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const basin = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  basin.scale.set(rx, 1, rz); basin.position.set(x, 0, z); basin.receiveShadow = true; parent.add(basin);
  // the water: a level surface where the bank crosses the water line, tucked a little under the bank
  const wr = shelf + (.985 - shelf) * ((level - shelfY) / (rim - .025 - shelfY)) + .01;
  if (!water) { water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0x3d8fc4, roughness: .1, metalness: .2, transparent: true, opacity: .82 })); parent.add(water); }
  else if (water.geometry.parameters?.radius) water.geometry.scale(1 / water.geometry.parameters.radius, 1 / water.geometry.parameters.radius, 1);
  water.rotation.x = -Math.PI / 2; water.scale.set(rx * wr, rz * wr, 1); water.position.set(x, level, z);
  water.material.transparent = true; water.material.opacity = Math.min(water.material.opacity ?? 1, .78); water.material.depthWrite = false;
  return { water, basin, level, bed, rim, cut: !!slot, inside: (px, pz) => ((px - x) / rx) ** 2 + ((pz - z) / rz) ** 2 < 1,
    // fill it in again (Create Mode): the ground closes over and the basin and water go
    remove() { slot?.set(0, 0, 0, 0); basin.removeFromParent(); basin.geometry.dispose(); water.removeFromParent(); } };
}
