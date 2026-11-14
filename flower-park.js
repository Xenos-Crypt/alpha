// WESTHAVEN FLOWER PARK — the second park inside the Grand Park's railings, to the west (through the
// opening in the hedge, or by its own west gate). Four gardens round a fountain:
//   • the TULIP FIELDS: long stripes of tulips, a colour to every row
//   • the ROSE GARDEN: rose arches over the walk, rose bushes in beds, a white gazebo
//   • SUNFLOWERS AND LAVENDER: a sunflower field taller than the children, rows of lavender
//   • the GLASSHOUSE: a palm house of glass and iron with tropical flowers, and a cutting garden
// Gardeners tend the beds; families, couples and old friends walk the paths and sit on the benches;
// butterflies work the flowers. The flowers are instanced (thousands of them, a few draw calls).
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';
import { OUTER } from './grand-park.js';

export const FLOWER = { x0: OUTER.x0, x1: OUTER.split, z0: OUTER.z0, z1: OUTER.annexZ1 };
const CX = 134, CZ = OUTER.inner;   // the fountain, where the two main paths cross
const Q = {   // the four gardens
  tulips: { x0: 40, x1: 126, z0: -1098, z1: -1022 }, roses: { x0: 142, x1: 230, z0: -1098, z1: -1022 },
  sun: { x0: 40, x1: 126, z0: -1004, z1: -928 }, glass: { x0: 142, x1: 230, z0: -1004, z1: -928 },
};
// no grass on the beds, the paths or the fountain
export const FLOWER_NO_GRASS = [
  ...Object.values(Q).map(q => ({ minX: q.x0, maxX: q.x1, minZ: q.z0, maxZ: q.z1 })),
  { minX: FLOWER.x0, maxX: FLOWER.x1, minZ: CZ - 3, maxZ: CZ + 3 }, { minX: CX - 3, maxX: CX + 3, minZ: FLOWER.z0, maxZ: FLOWER.z1 }, { cx: CX, cz: CZ, r: 15 },
];

export function buildFlowerPark(ctx) {
  const K = makeKit(ctx), { B, C, S, mat, solid, circle, sign, place, spot, stander, sitter, walker, family, animal } = K;
  const md = (n, m) => ((n % m) + m) % m;
  const root = new THREE.Group(); ctx.scene.add(root);
  let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const gravel = mat(0xcdb68a, { rough: 1 }), soil = mat(0x4a3424, { rough: 1 });
  const path = (x0, x1, z0, z1) => B(root, x1 - x0, .05, z1 - z0, (x0 + x1) / 2, .03, (z0 + z1) / 2, gravel, false);
  const bed = (x0, x1, z0, z1) => B(root, x1 - x0, .08, z1 - z0, (x0 + x1) / 2, .04, (z0 + z1) / 2, soil, false);
  // ---- every flower in the park goes into these instance lists ----
  const stems = [], blooms = [], bushes = [];
  const flower = (x, z, h, colour, size = .09, shape = 'cup') => { stems.push([x, z, h]); blooms.push([x, z, h, colour, size, shape]); };
  const lamps = [];
  const lamp = (x, z) => { C(root, .06, .08, 3.6, x, 1.8, z, 0x1f2326, 6); const head = S(root, .22, x, 3.7, z, mat(0xfff4dc, { emissive: 0xffe2a0, ei: .2 }), 10); head.material = head.material.clone(); lamps.push(head); };
  const bench = (x, z, ry, sit) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 1.8, .08, .5, 0, .45, 0, 0x7a5636); B(g, 1.8, .4, .06, 0, .75, -.22, 0x7a5636); for (const sx of [-.8, .8]) B(g, .08, .45, .5, sx, .22, 0, 0x2a2a2a);
    if (sit) sitter(x, z, ry, .47, { task: 'talk' }); else ctx.sitSpots?.push({ x, z, yaw: ry, seatY: .47, label: 'Sit on the bench' }); };

  // ---- a lawn under everything (beds, paths and the fountain sit on it) ----
  B(root, FLOWER.x1 - FLOWER.x0, .02, FLOWER.z1 - FLOWER.z0, (FLOWER.x0 + FLOWER.x1) / 2, .01, (FLOWER.z0 + FLOWER.z1) / 2, mat(0x5f9a45, { rough: 1 }), false);
  // ---- paths: the cross through the park, a ring round the fountain, paths round each garden ----
  path(FLOWER.x0 - 6, FLOWER.x1, CZ - 3, CZ + 3); path(CX - 3, CX + 3, FLOWER.z0 + 2, FLOWER.z1 - 2);
  for (const q of Object.values(Q)) { path(q.x0 - 4, q.x1 + 4, q.z0 - 4, q.z0 - 1); path(q.x0 - 4, q.x1 + 4, q.z1 + 1, q.z1 + 4); path(q.x0 - 4, q.x0 - 1, q.z0 - 4, q.z1 + 4); path(q.x1 + 1, q.x1 + 4, q.z0 - 4, q.z1 + 4); }
  ctx.destinations?.push({ name: 'Westhaven Flower Park', x: FLOWER.x0 - 6, z: CZ }, { name: 'Flower Park glasshouse', x: (Q.glass.x0 + Q.glass.x1) / 2, z: Q.glass.z0 - 5 }, { name: 'Flower Park rose garden', x: (Q.roses.x0 + Q.roses.x1) / 2, z: Q.roses.z1 + 5 });

  // ---- the fountain ----
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(8, .45, 8, 40), mat(0xd9cfbf, { rough: .8 })); ring.rotation.x = Math.PI / 2; ring.position.set(CX, .45, CZ); root.add(ring);
    const water = new THREE.Mesh(new THREE.CircleGeometry(7.8, 40), new THREE.MeshStandardMaterial({ color: 0x4aa3c9, roughness: .1, metalness: .2, transparent: true, opacity: .85 })); water.rotation.x = -Math.PI / 2; water.position.set(CX, .5, CZ); root.add(water);
    C(root, .9, 1.2, 2.2, CX, 1.1, CZ, 0xd9cfbf); C(root, 2.2, 1.8, .3, CX, 2.3, CZ, 0xd9cfbf); C(root, .4, .5, 1.4, CX, 3.1, CZ, 0xd9cfbf); S(root, .5, CX, 4, CZ, 0xd9cfbf);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(.5, 2.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: .45 })); jet.position.set(CX, 5.3, CZ); jet.rotation.x = Math.PI; root.add(jet);
    circle(CX, CZ, 8.6);
    // a ring of flowers round it, and benches facing it
    for (let a = 0; a < Math.PI * 2; a += .09) flower(CX + Math.cos(a) * 10, CZ + Math.sin(a) * 10, .35, [0xff4f7a, 0xffd23f, 0xffffff, 0x9b5de5][Math.floor(a * 3) % 4]);
    for (const [a, sit] of [[.6, true], [2.2, false], [3.8, true], [5.4, false]]) bench(CX + Math.cos(a) * 13, CZ + Math.sin(a) * 13, -a - Math.PI / 2, sit);
    ctx.fountain = jet;
    for (const [dx, dz] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) lamp(CX + dx, CZ + dz);
  }

  // ---- the tulip fields: a colour to every row ----
  { const q = Q.tulips, TULIP = [0xe63946, 0xffb703, 0xff70a6, 0xffffff, 0x9b5de5, 0xff8c42, 0xd00000, 0xffd6e0, 0x6a4c93, 0xfee440];
    let row = 0;
    for (let z = q.z0 + 2; z < q.z1 - 1; z += 3.2, row++) { bed(q.x0 + 1, q.x1 - 1, z - .9, z + .9); const c = TULIP[row % TULIP.length];
      for (let x = q.x0 + 1.5; x < q.x1 - 1.5; x += .6) for (const dz of [-.35, .35]) flower(x + (r() - .5) * .12, z + dz + (r() - .5) * .12, .38 + r() * .08, c, .075, 'cup'); }
    const s = sign('THE TULIP FIELDS', '', 5, '#2f5d3a', '#fff6d6'); place(s, (q.x0 + q.x1) / 2, 1.6, q.z1 + 4.4, 0);
    C(root, .06, .06, 1.5, (q.x0 + q.x1) / 2 - 2, .75, q.z1 + 4.4, 0x5a4a3a); C(root, .06, .06, 1.5, (q.x0 + q.x1) / 2 + 2, .75, q.z1 + 4.4, 0x5a4a3a);
    // a windmill at the far corner, as in any proper tulip field
    { const x = q.x0 + 6, z = q.z0 + 6; C(root, 2.2, 3, 9, x, 4.5, z, 0xf2e6d0, 8); const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.6, 8), mat(0x7a3b2a)); cap.position.set(x, 10.3, z); root.add(cap);
      const sails = new THREE.Group(); sails.position.set(x, 9, z + 2.4); root.add(sails); for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; sails.add(arm); B(arm, .25, 6, .1, 0, 3, 0, 0x5a4a3a); B(arm, 1.4, 5, .05, .75, 3.4, 0, 0xf4f1e8); }
      ctx.windmill = sails; solid(x - 3, x + 3, z - 3, z + 3); }
  }
  // ---- the rose garden: arches over the walk, bushes in beds, a gazebo ----
  { const q = Q.roses, ROSE = [0xc1121f, 0xff4d6d, 0xffafcc, 0xfff1e6, 0xffd166, 0x9d0208];
    const mx = (q.x0 + q.x1) / 2;
    path(mx - 2, mx + 2, q.z0, q.z1);   // the arch walk down the middle
    for (let z = q.z0 + 4; z < q.z1 - 3; z += 6) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, .08, 6, 20, Math.PI), mat(0x2b2f2a, { metal: .4 })); arch.position.set(mx, 0, z); root.add(arch);
      for (let a = .15; a < Math.PI - .1; a += .22) bushes.push([mx + Math.cos(a) * 2.2, Math.sin(a) * 2.2, z, .28, 0x2f5d2a]), blooms.push([mx + Math.cos(a) * 2.25, z + (r() - .5) * .3, Math.sin(a) * 2.2 + .1, ROSE[md(z | 0, ROSE.length)], .11, 'rose']);
    }
    for (const side of [-1, 1]) for (let z = q.z0 + 3; z < q.z1 - 2; z += 5) {
      const x0 = side < 0 ? q.x0 + 3 : mx + 5, x1 = side < 0 ? mx - 5 : q.x1 - 3;
      bed(x0, x1, z - 1.6, z + 1.6);
      for (let x = x0 + 1; x < x1 - .5; x += 1.6) { const c = ROSE[md(Math.floor(x / 5) + Math.floor(z / 5), ROSE.length)]; bushes.push([x, .45, z, .55, 0x2f5d2a]); for (let k = 0; k < 9; k++) { const a = r() * Math.PI * 2, e = .15 + r() * 1.1; blooms.push([x + Math.cos(a) * .58 * Math.cos(e), z + Math.sin(a) * .58 * Math.cos(e), .45 + Math.sin(e) * .47, c, .13, 'rose']); } }
    }
    // the gazebo
    { const x = mx, z = q.z0 + (q.z1 - q.z0) * .5; C(root, 4.2, 4.2, .3, x, .15, z, 0xf4f1e8, 8);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; C(root, .12, .12, 3, x + Math.cos(a) * 3.8, 1.6, z + Math.sin(a) * 3.8, 0xffffff, 8); }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.2, 8), mat(0x6b8f71)); roof.position.set(x, 4.2, z); root.add(roof);
      bench(x - 2, z, Math.PI / 2, true); bench(x + 2, z, -Math.PI / 2, false); }
    const s = sign('THE ROSE GARDEN', '', 5, '#6b1d2a', '#fff1e6'); place(s, mx, 1.6, q.z1 + 4.4, 0);
  }
  // ---- sunflowers and lavender ----
  { const q = Q.sun, half = (q.x0 + q.x1) / 2;
    bed(q.x0 + 1, half - 1, q.z0 + 1, q.z1 - 1);
    for (let x = q.x0 + 2; x < half - 2; x += 1.2) for (let z = q.z0 + 2; z < q.z1 - 2; z += 1.2) { const h = 1.6 + r() * .7; stems.push([x + (r() - .5) * .3, z + (r() - .5) * .3, h, .025]); blooms.push([x, z, h + .05, 0xffc300, .22, 'sun']); }
    for (let z = q.z0 + 2; z < q.z1 - 1; z += 2.2) { bed(half + 1, q.x1 - 1, z - .6, z + .6); for (let x = half + 1.5; x < q.x1 - 1.5; x += .7) { bushes.push([x, .3, z, .36, 0x6f8f5f]); for (let k = 0; k < 4; k++) blooms.push([x + (r() - .5) * .5, z + (r() - .5) * .4, .55 + r() * .15, 0x8e7cc3, .05, 'spike']); } }
    const s = sign('SUNFLOWERS & LAVENDER', '', 5.5, '#5a4a12', '#fff6d6'); place(s, (q.x0 + q.x1) / 2, 1.6, q.z0 - 4.4, Math.PI);
  }
  // ---- the glasshouse, and a cutting garden of every colour ----
  { const q = Q.glass, x = (q.x0 + q.x1) / 2, z = q.z0 + 22, W = 40, D = 24, H = 9;
    const glass = new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: .05, metalness: .1, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide });
    const iron = mat(0xf2f2ee, { metal: .3, rough: .5 });
    // a barrel-vaulted palm house: glass walls on a low brick base, ribs of white iron
    B(root, W, .06, D, x, .03, z, 0xb9b2a4, false);   // a tiled floor, and a low brick wall all round (open at the door)
    B(root, W, .8, .3, x, .4, z + D / 2, 0x8a4b38); for (const s of [-1, 1]) B(root, W / 2 - 2.5, .8, .3, x + s * (W / 4 + 1.25), .4, z - D / 2, 0x8a4b38); for (const s of [-1, 1]) B(root, .3, .8, D, x + s * W / 2, .4, z, 0x8a4b38);
    for (const s of [-1, 1]) { const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, 3.2), glass); wall.position.set(x, 2.4, z + s * D / 2); wall.rotation.y = s > 0 ? 0 : Math.PI; root.add(wall); }
    for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.PlaneGeometry(D, 3.2), glass); end.position.set(x + s * W / 2, 2.4, z); end.rotation.y = s * Math.PI / 2; root.add(end); }
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 24, 1, true, 0, Math.PI), glass); vault.rotation.z = Math.PI / 2; vault.position.set(x, 4, z); vault.scale.set(.45, 1, 1); root.add(vault);
    for (let i = 0; i <= 8; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(D / 2, .1, 6, 20, Math.PI), iron); rib.rotation.y = Math.PI / 2; rib.position.set(x - W / 2 + i * W / 8, 4, z); rib.scale.set(1, .45, 1); root.add(rib); }
    for (let i = 0; i <= 8; i++) for (const s of [-1, 1]) C(root, .08, .08, 3.2, x - W / 2 + i * W / 8, 2.4, z + s * D / 2, 0xf2f2ee, 6);
    // the doors face the path, and you can walk in: the walls are solid but the front middle is open
    solid(x - W / 2 - .2, x + W / 2 + .2, z + D / 2 - .2, z + D / 2 + .2); solid(x - W / 2 - .2, x - W / 2 + .2, z - D / 2, z + D / 2); solid(x + W / 2 - .2, x + W / 2 + .2, z - D / 2, z + D / 2);
    solid(x - W / 2, x - 2.5, z - D / 2 - .2, z - D / 2 + .2); solid(x + 2.5, x + W / 2, z - D / 2 - .2, z - D / 2 + .2);
    const s = sign('THE GLASSHOUSE', 'tropical flowers', 5, '#24405a', '#eaf6ff'); place(s, x, 4.2, z - D / 2 - .1, Math.PI);
    // inside: palms, a pond, and tropical blooms
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), new THREE.MeshStandardMaterial({ color: 0x2f7f8f, roughness: .1 })); pond.rotation.x = -Math.PI / 2; pond.position.set(x, .08, z); root.add(pond);
    for (const [dx, dz] of [[-14, -6], [-8, 6], [8, -6], [14, 6], [-16, 6], [16, -6]]) { C(root, .2, .3, 6, x + dx, 3.8, z + dz, 0x7a5a3a, 8); for (let k = 0; k < 7; k++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(.5, 3.4, 4), mat(0x2f7f3a)); leaf.position.set(x + dx + Math.cos(k) * 1.2, 6.6, z + dz + Math.sin(k) * 1.2); leaf.rotation.set(Math.sin(k) * 1.2, 0, Math.cos(k) * 1.2); root.add(leaf); } }
    const TROP = [0xff006e, 0xfb5607, 0xffbe0b, 0x8338ec, 0xff4d6d, 0xffffff];
    for (let i = 0; i < 220; i++) { const a = r() * Math.PI * 2, d = 4 + r() * 9; const fx = x + Math.cos(a) * d * 1.5, fz = z + Math.sin(a) * d * .8; if (Math.abs(fz - z) > D / 2 - 1.5 || Math.abs(fx - x) > W / 2 - 1.5) continue; bushes.push([fx, .45, fz, .5, 0x2f6b3a]); blooms.push([fx + (r() - .5) * .4, fz + (r() - .5) * .4, .92, TROP[i % TROP.length], .16, 'star']); }
    stander(x - 6, z - 2, .4, { outfit: 0x3a6b35, task: 'talk' }); stander(x + 5, z + 3, 2.5, { outfit: 0x8a6a3d, task: 'idle' });
    // the cutting garden south of it: blocks of every colour
    const CUT = [0xe63946, 0xffb703, 0xff70a6, 0xffffff, 0x9b5de5, 0xff8c42, 0x4cc9f0, 0xf72585];
    for (let i = 0; i < 8; i++) { const bx = q.x0 + 4 + (i % 4) * 21, bz = q.z1 - 18 + Math.floor(i / 4) * 9; bed(bx, bx + 17, bz, bz + 6); for (let fx = bx + .6; fx < bx + 16.6; fx += .6) for (let fz = bz + .6; fz < bz + 5.6; fz += .6) flower(fx + (r() - .5) * .15, fz + (r() - .5) * .15, .3 + r() * .2, CUT[i], .07, i % 2 ? 'cup' : 'star'); }
  }
  // ---- hedges and trees along the inside of the railing ----
  for (let x = FLOWER.x0 + 8; x < FLOWER.x1 - 6; x += 14) { ctx.tree?.(x, FLOWER.z0 + 3, 'birch', 1); ctx.tree?.(x + 7, FLOWER.z1 - 3, 'oak', .9); }
  for (let z = FLOWER.z0 + 10; z < FLOWER.z1 - 6; z += 14) if (Math.abs(z - CZ) > 10) ctx.tree?.(FLOWER.x0 + 3, z, 'oak', 1);
  for (const [x, z] of [[CX - 30, CZ - 4.5], [CX + 30, CZ - 4.5], [CX - 30, CZ + 4.5], [CX + 30, CZ + 4.5], [CX - 4.5, CZ - 40], [CX + 4.5, CZ + 40]]) lamp(x, z);
  for (const [x, z, ry, sit] of [[CX - 22, CZ - 4.6, 0, true], [CX + 22, CZ + 4.6, Math.PI, false], [CX - 4.6, CZ - 30, Math.PI / 2, false], [CX + 4.6, CZ + 30, -Math.PI / 2, true], [70, CZ - 4.6, 0, false], [200, CZ + 4.6, Math.PI, true]]) bench(x, z, ry, sit);

  // ---- avenues of trees along the main paths, and more places to sit: benches and picnic tables ----
  for (let x = FLOWER.x0 + 12; x < FLOWER.x1 - 8; x += 12) if (Math.abs(x - CX) > 18 && Math.abs(x - (Q.roses.x0 + Q.roses.x1) / 2) > 6) for (const s of [-1, 1]) ctx.tree?.(x, CZ + s * 7, x % 24 < 12 ? 'oak' : 'birch', .85);
  for (let z = FLOWER.z0 + 12; z < FLOWER.z1 - 8; z += 12) if (Math.abs(z - CZ) > 18) for (const s of [-1, 1]) ctx.tree?.(CX + s * 7, z, 'birch', .8);
  for (const [x, z] of [[CX - 50, CZ + 4.6], [CX + 50, CZ - 4.6], [CX - 4.6, CZ + 55], [CX + 4.6, CZ - 55]]) bench(x, z, z > CZ ? Math.PI : 0, false);
  const picnic = (x, z, sit) => { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); B(g, 2.2, .08, .9, 0, .75, 0, 0x8a6a42); for (const s of [-1, 1]) { B(g, 2.2, .06, .3, 0, .45, s * .75, 0x8a6a42); B(g, .08, .75, .08, s * .9, .37, 0, 0x5a4a3a); }
    for (const s of [-1, 1]) ctx.sitSpots?.push({ x, z: z + s * .75, yaw: s > 0 ? Math.PI : 0, seatY: .47, label: 'Sit at the picnic table' }); if (sit) { sitter(x - .5, z - .75, 0, .47, { task: 'talk' }); sitter(x + .4, z + .75, Math.PI, .47, { task: 'talk' }); } solid(x - 1.1, x + 1.1, z - .45, z + .45); };
  picnic(CX - 24, CZ + 12, true); picnic(CX + 24, CZ - 12, false); picnic(CX + 24, CZ + 12, true); picnic(CX - 24, CZ - 12, false);
  // ---- animals: ducks on the fountain, peacocks free on the lawns, tortoises in the glasshouse ----
  for (let i = 0; i < 3; i++) { const a = animal('duck', CX - 3 + i * 3, CZ + (i - 1) * 2, { x0: CX - 5, x1: CX + 5, z0: CZ - 5, z1: CZ + 5 }, { swim: true }); if (a) a.g.position.y = .5; }
  for (let i = 0; i < 6; i++) { const q = Object.values(Q)[i % 4]; animal('peacock', q.x0 - 2.5, q.z0 + 5 + i * 3, { x0: FLOWER.x0 + 6, x1: FLOWER.x1 - 6, z0: FLOWER.z0 + 6, z1: FLOWER.z1 - 6 }); }
  for (let i = 0; i < 2; i++) animal('tortoise', (Q.glass.x0 + Q.glass.x1) / 2 - 8 + i * 12, Q.glass.z0 + 18, { x0: (Q.glass.x0 + Q.glass.x1) / 2 - 16, x1: (Q.glass.x0 + Q.glass.x1) / 2 + 16, z0: Q.glass.z0 + 13, z1: Q.glass.z0 + 30 });
  // ---- the instanced flowers ----
  { const o = new THREE.Object3D(), col = new THREE.Color();
    const stemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .016, 1, 4), mat(0x3f8f3a, { rough: .9 }), stems.length);
    stems.forEach(([x, z, h, w], i) => { o.position.set(x, h / 2, z); o.rotation.set(0, 0, 0); o.scale.set(w ? w / .014 : 1, h, w ? w / .014 : 1); o.updateMatrix(); stemMesh.setMatrixAt(i, o.matrix); });
    root.add(stemMesh);
    const shapes = { cup: new THREE.CylinderGeometry(1, .55, 1.3, 6, 1, true), rose: new THREE.IcosahedronGeometry(1, 0), sun: new THREE.CylinderGeometry(1, 1, .18, 14), star: new THREE.ConeGeometry(1, .8, 5), spike: new THREE.CapsuleGeometry(.5, 2.2, 2, 5) };
    for (const [k, geo] of Object.entries(shapes)) {
      const list = blooms.filter(b => b[5] === k); if (!list.length) continue;
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .6, side: THREE.DoubleSide }), list.length);
      list.forEach(([x, z, h, c, s], i) => { o.position.set(x, h, z); o.rotation.set(k === 'sun' ? -.9 : 0, (i * 2.4) % 6.28, 0); o.scale.setScalar(s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.setHex(c)); });
      if (k === 'sun') { const centre = new THREE.InstancedMesh(new THREE.CylinderGeometry(.45, .45, .22, 10), mat(0x4a2c12), list.length); list.forEach(([x, z, h, c, s], i) => { o.position.set(x, h + .02, z + .03); o.rotation.set(-.9, 0, 0); o.scale.setScalar(s); o.updateMatrix(); centre.setMatrixAt(i, o.matrix); }); root.add(centre); }
      root.add(im);
    }
    const bushMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 }), bushes.length);   // (white: the instance colour is the leaf colour)
    bushes.forEach(([x, y, z, s, c], i) => { o.position.set(x, y, z); o.rotation.set(0, i, 0); o.scale.set(s, s * .8, s); o.updateMatrix(); bushMesh.setMatrixAt(i, o.matrix); bushMesh.setColorAt(i, col.setHex(c)); });
    bushMesh.castShadow = true; root.add(bushMesh);
  }
  // ---- butterflies over the beds ----
  const flies = [];
  { const BF = [0xffd23f, 0xff70a6, 0x4cc9f0, 0xffffff, 0xff8c42];
    for (let i = 0; i < 46; i++) { const q = Object.values(Q)[i % 4], g = new THREE.Group(); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.14, .1), new THREE.MeshBasicMaterial({ color: BF[i % BF.length], side: THREE.DoubleSide })); w.position.x = s * .07; g.add(w); g.userData[s] = w; }
      root.add(g); flies.push({ g, cx: q.x0 + r() * (q.x1 - q.x0), cz: q.z0 + r() * (q.z1 - q.z0), ph: r() * 9, rad: 2 + r() * 4 }); }
  }
  // ---- the people: gardeners at work, visitors on the paths ----
  stander(Q.tulips.x0 + 20, Q.tulips.z0 + 10, 1.2, { outfit: 0x3a6b35, task: 'idle' }); stander(Q.roses.x0 + 12, Q.roses.z1 - 6, -.6, { outfit: 0x3a6b35, task: 'idle' }); stander(Q.sun.x1 - 10, Q.sun.z0 + 8, 2, { outfit: 0x3a6b35, task: 'idle' });
  family([[FLOWER.x0 - 4, CZ + 1], [CX - 16, CZ + 1], [CX, CZ + 16], [CX + 16, CZ], [FLOWER.x1 + 8, CZ - 1], [CX + 16, CZ], [CX, CZ - 16], [CX - 16, CZ + 1]], { kids: 2, speed: .9 });
  walker([[CX, FLOWER.z0 + 4], [CX, FLOWER.z1 - 4]], { speed: .9 }); walker([[CX - 1, FLOWER.z1 - 4], [CX - 1, FLOWER.z0 + 4]], { speed: .8 });
  family([[Q.roses.x0 - 2.5, Q.roses.z0 - 2.5], [Q.roses.x1 + 2.5, Q.roses.z0 - 2.5], [Q.roses.x1 + 2.5, Q.roses.z1 + 2.5], [Q.roses.x0 - 2.5, Q.roses.z1 + 2.5]], { kids: 0, speed: .7, t: 30 });
  family([[Q.tulips.x0 - 2.5, Q.tulips.z1 + 2.5], [Q.tulips.x1 + 2.5, Q.tulips.z1 + 2.5], [Q.tulips.x1 + 2.5, Q.tulips.z0 - 2.5], [Q.tulips.x0 - 2.5, Q.tulips.z0 - 2.5]], { kids: 1, speed: .8, t: 70 });
  walker([[Q.glass.x0 - 2.5, Q.glass.z0 - 2.5], [Q.glass.x1 + 2.5, Q.glass.z0 - 2.5], [Q.glass.x1 + 2.5, Q.glass.z1 + 2.5], [Q.glass.x0 - 2.5, Q.glass.z1 + 2.5]], { speed: .8 });
  spot(CX, CZ - 9.5, 2.4, 'Make a wish at the fountain (1 gold)', () => { if ((ctx.stats?.gold || 0) < 1) return ctx.toast?.('No coins.'); ctx.stats.gold -= 1; ctx.stats.energy = Math.min(100, (ctx.stats.energy || 0) + 3); ctx.toast?.('🪙 Plink. You make a wish.'); });
  spot(Q.roses.x0 + 22, Q.roses.z1 + 3, 2, 'Smell the roses', () => { ctx.stats.energy = Math.min(100, (ctx.stats.energy || 0) + 4); ctx.toast?.('🌹 Lovely. You feel a bit better.'); });

  // ---- update ----
  let t = 0;
  function update(dt, p, night) {
    if (p.x < FLOWER.x0 - 160 || p.x > FLOWER.x1 + 160 || p.z < FLOWER.z0 - 160 || p.z > FLOWER.z1 + 160) return;
    t += dt; K.update(dt, p, 110);
    if (ctx.windmill) ctx.windmill.rotation.z = t * .6;
    if (ctx.fountain) ctx.fountain.scale.y = 1 + Math.sin(t * 3) * .06;
    for (const f of flies) { const a = t * .7 + f.ph; f.g.position.set(f.cx + Math.cos(a) * f.rad, .6 + Math.sin(t * 2 + f.ph) * .25, f.cz + Math.sin(a * 1.3) * f.rad * .6); f.g.rotation.y = -a; const flap = Math.sin(t * 22 + f.ph) * .9; f.g.userData[-1].rotation.y = flap; f.g.userData[1].rotation.y = -flap; f.g.visible = !night; }
    for (const l of lamps) l.material.emissiveIntensity = night ? 2.2 : .15;
  }
  return { update, kit: K };
}
