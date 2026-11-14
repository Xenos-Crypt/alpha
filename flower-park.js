// WESTHAVEN FLOWER PARK — the second park inside the Grand Park's railings, to the west (through the
// opening in the hedge, or by its own west gate). Four gardens round a fountain:
//   • the TULIP FIELDS: long stripes of tulips, a colour to every row
//   • the ROSE GARDEN: rose arches over the walk, rose bushes in beds, a white gazebo
//   • SUNFLOWERS AND LAVENDER: a sunflower field taller than the children, rows of lavender
//   • the GLASSHOUSE: a palm house of glass and iron with tropical flowers, and a cutting garden
// Gardeners tend the beds; families, couples and old friends walk the paths and sit on the benches;
// butterflies work the flowers. The flowers are instanced (thousands of them, a few draw calls).
// Every bed is one named cultivar (botany.js): walk up to it and the label shows its botanical name. Every
// plant, tree, animal, bench and lamp here has its own ID.
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';
import { OUTER } from './grand-park.js';
import { makeBotany, PLANTS } from './botany.js';
import { buildWaterfall } from './waterfalls.js';

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
  const K = makeKit(ctx), { B, C, S, mat, solid, circle, sign, place, spot, stander, sitter, walker, family } = K;
  let glassFalls = null;
  const PARK = 'Westhaven Flower Park', bot = makeBotany(ctx, PARK), animal = (kind, x, z, area, o, key, where) => bot.animal(K.animal(kind, x, z, area, o), key, where);
  const fx = (cls, kind, m, maker, name, x, z) => bot.fixture(cls, kind, m, maker, name, x, z), col = k => PLANTS[k].colour;
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
  const lamp = (x, z) => { fx('PRD', 'LMP', 'STL.GLS', 'Ironforge Steel', 'Lamp post', x, z); C(root, .06, .08, 3.6, x, 1.8, z, 0x1f2326, 6); const head = S(root, .22, x, 3.7, z, mat(0xfff4dc, { emissive: 0xffe2a0, ei: .2 }), 10); head.material = head.material.clone(); lamps.push(head); };
  const bench = (x, z, ry, sit) => { fx('PRD', 'BEN', 'WOD.STL', 'Northwood Sawmills', 'Park bench', x, z); const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 1.8, .08, .5, 0, .45, 0, 0x7a5636); B(g, 1.8, .4, .06, 0, .75, -.22, 0x7a5636); for (const sx of [-.8, .8]) B(g, .08, .45, .5, sx, .22, 0, 0x2a2a2a);
    if (sit) sitter(x, z, ry, .47, { task: 'talk' }); else ctx.sitSpots?.push({ x, z, yaw: ry, seatY: .47, label: 'Sit on the bench' }); };

  // ---- a lawn under everything (beds, paths and the fountain sit on it) ----
  const lawn = B(root, FLOWER.x1 - FLOWER.x0, .02, FLOWER.z1 - FLOWER.z0, (FLOWER.x0 + FLOWER.x1) / 2, .01, (FLOWER.z0 + FLOWER.z1) / 2, mat(0x5f9a45, { rough: 1 }), false);
  fx('LND', 'LWN', 'GRS', 'Westhaven Parks & Gardens', 'The lawns', (FLOWER.x0 + FLOWER.x1) / 2, (FLOWER.z0 + FLOWER.z1) / 2);
  fx('LND', 'PTH', 'STN', 'Deepstone Quarries (gravel), laid by Westhaven Parks & Gardens', 'Gravel paths', CX, CZ + 3);
  // ---- paths: the cross through the park, a ring round the fountain, paths round each garden ----
  path(FLOWER.x0 - 6, FLOWER.x1, CZ - 3, CZ + 3); path(CX - 3, CX + 3, FLOWER.z0 + 2, FLOWER.z1 - 2);
  for (const q of Object.values(Q)) { path(q.x0 - 4, q.x1 + 4, q.z0 - 4, q.z0 - 1); path(q.x0 - 4, q.x1 + 4, q.z1 + 1, q.z1 + 4); path(q.x0 - 4, q.x0 - 1, q.z0 - 4, q.z1 + 4); path(q.x1 + 1, q.x1 + 4, q.z0 - 4, q.z1 + 4); }
  ctx.destinations?.push({ name: 'Westhaven Flower Park', x: FLOWER.x0 - 6, z: CZ }, { name: 'Flower Park glasshouse', x: (Q.glass.x0 + Q.glass.x1) / 2, z: Q.glass.z0 - 5 }, { name: 'Flower Park rose garden', x: (Q.roses.x0 + Q.roses.x1) / 2, z: Q.roses.z1 + 5 });

  // ---- the fountain ----
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(8, .45, 8, 40), mat(0xd9cfbf, { rough: .8 })); ring.rotation.x = Math.PI / 2; ring.position.set(CX, .45, CZ); root.add(ring);
    const water = new THREE.Mesh(new THREE.CircleGeometry(7.8, 40), new THREE.MeshStandardMaterial({ color: 0x4aa3c9, roughness: .1, metalness: .2, transparent: true, opacity: .85 })); water.rotation.x = -Math.PI / 2; water.position.set(CX, .5, CZ); root.add(water);
    C(root, .9, 1.2, 2.2, CX, 1.1, CZ, 0xd9cfbf); C(root, 2.2, 1.8, .3, CX, 2.3, CZ, 0xd9cfbf); C(root, .4, .5, 1.4, CX, 3.1, CZ, 0xd9cfbf); S(root, .5, CX, 4, CZ, 0xd9cfbf);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(.5, 2.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: .45 })); jet.position.set(CX, 5.3, CZ); jet.rotation.x = Math.PI; root.add(jet);
    circle(CX, CZ, 8.6); fx('BLD', 'FNT', 'STN.STL', 'Westhaven Builders', 'The fountain', CX, CZ);
    // a ring of flowers round it, and benches facing it
    { const pl = []; for (let a = 0; a < Math.PI * 2; a += .09) { const x = CX + Math.cos(a) * 10, z = CZ + Math.sin(a) * 10; pl.push([x, z]); flower(x, z, .35, [0xff4f7a, 0xffd23f, 0xffffff, 0x9b5de5][Math.floor(a * 3) % 4]); }
      bot.bed('pansy', CX - 10, CX + 10, CZ - 10, CZ + 10, 'the ring round the fountain', { plants: pl, every: 99 }); }
    for (const [a, sit] of [[.6, true], [2.2, false], [3.8, true], [5.4, false]]) bench(CX + Math.cos(a) * 13, CZ + Math.sin(a) * 13, -a - Math.PI / 2, sit);
    ctx.fountain = jet;
    for (const [dx, dz] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) lamp(CX + dx, CZ + dz);
  }

  // ---- the tulip fields: a colour to every row ----
  { const q = Q.tulips, TULIP = ['tApeldoorn', 'tGolden', 'tPink', 'tWhite', 'tPurple', 'tOrange', 'tKings', 'tAngel', 'tNight', 'tStrong'];
    let row = 0;
    for (let z = q.z0 + 2; z < q.z1 - 1; z += 3.2, row++) { bed(q.x0 + 1, q.x1 - 1, z - .9, z + .9); const key = TULIP[row % TULIP.length], c = col(key), pl = [];
      for (let x = q.x0 + 1.5; x < q.x1 - 1.5; x += .6) for (const dz of [-.35, .35]) { const px = x + (r() - .5) * .12, pz = z + dz + (r() - .5) * .12; pl.push([px, pz]); flower(px, pz, .38 + r() * .08, c, .075, 'cup'); }
      bot.bed(key, q.x0 + 1, q.x1 - 1, z - .9, z + .9, 'the Tulip Fields', { plants: pl }); }
    const s = sign('THE TULIP FIELDS', '', 5, '#2f5d3a', '#fff6d6'); place(s, (q.x0 + q.x1) / 2, 1.6, q.z1 + 4.4, 0);
    C(root, .06, .06, 1.5, (q.x0 + q.x1) / 2 - 2, .75, q.z1 + 4.4, 0x5a4a3a); C(root, .06, .06, 1.5, (q.x0 + q.x1) / 2 + 2, .75, q.z1 + 4.4, 0x5a4a3a);
    // a windmill at the far corner, as in any proper tulip field
    { const x = q.x0 + 6, z = q.z0 + 6; C(root, 2.2, 3, 9, x, 4.5, z, 0xf2e6d0, 8); const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.6, 8), mat(0x7a3b2a)); cap.position.set(x, 10.3, z); root.add(cap);
      const sails = new THREE.Group(); sails.position.set(x, 9, z + 2.4); root.add(sails); for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; sails.add(arm); B(arm, .25, 6, .1, 0, 3, 0, 0x5a4a3a); B(arm, 1.4, 5, .05, .75, 3.4, 0, 0xf4f1e8); }
      ctx.windmill = sails; solid(x - 3, x + 3, z - 3, z + 3); fx('BLD', 'WML', 'BRK.WOD', 'Westhaven Builders (sails by Northwood Sawmills)', 'The windmill', x, z); }
  }
  // ---- the rose garden: arches over the walk, bushes in beds, a gazebo ----
  { const q = Q.roses, ROSE = ['rIngrid', 'rJekyll', 'rQueen', 'rIceberg', 'rGraham', 'rMunstead'], CLIMB = ['rDawn', 'rDanse', 'rAlbertine'];
    const mx = (q.x0 + q.x1) / 2;
    path(mx - 2, mx + 2, q.z0, q.z1);   // the arch walk down the middle
    let ai = 0;
    for (let z = q.z0 + 4; z < q.z1 - 3; z += 6, ai++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, .08, 6, 20, Math.PI), mat(0x2b2f2a, { metal: .4 })); arch.position.set(mx, 0, z); root.add(arch);
      const key = CLIMB[ai % CLIMB.length];   // a climbing rose up each side of every arch
      for (let a = .15; a < Math.PI - .1; a += .22) bushes.push([mx + Math.cos(a) * 2.2, Math.sin(a) * 2.2, z, .28, 0x2f5d2a]), blooms.push([mx + Math.cos(a) * 2.25, z + (r() - .5) * .3, Math.sin(a) * 2.2 + .1, col(key), .11, 'rose']);
      fx('PRD', 'ARC', 'STL', 'Ironforge Steel', 'Rose arch', mx, z); bot.bed(key, mx - 2.3, mx + 2.3, z - .3, z + .3, 'the rose arch walk', { plants: [[mx - 2.2, z], [mx + 2.2, z]] });
    }
    let bi = 0;
    for (const side of [-1, 1]) for (let z = q.z0 + 3; z < q.z1 - 2; z += 5, bi++) {
      const x0 = side < 0 ? q.x0 + 3 : mx + 5, x1 = side < 0 ? mx - 5 : q.x1 - 3, key = ROSE[md(bi * 5 + (side > 0 ? 3 : 0), ROSE.length)], c = col(key), pl = [];   // one variety to a bed
      bed(x0, x1, z - 1.6, z + 1.6);
      for (let x = x0 + 1; x < x1 - .5; x += 1.6) { pl.push([x, z]); bushes.push([x, .45, z, .55, 0x2f5d2a]); for (let k = 0; k < 9; k++) { const a = r() * Math.PI * 2, e = .15 + r() * 1.1; blooms.push([x + Math.cos(a) * .58 * Math.cos(e), z + Math.sin(a) * .58 * Math.cos(e), .45 + Math.sin(e) * .47, c, .13, 'rose']); } }
      bot.bed(key, x0, x1, z - 1.6, z + 1.6, 'the Rose Garden', { plants: pl });
    }
    // the gazebo
    { const x = mx, z = q.z0 + (q.z1 - q.z0) * .5; C(root, 4.2, 4.2, .3, x, .15, z, 0xf4f1e8, 8);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; C(root, .12, .12, 3, x + Math.cos(a) * 3.8, 1.6, z + Math.sin(a) * 3.8, 0xffffff, 8); }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.2, 8), mat(0x6b8f71)); roof.position.set(x, 4.2, z); root.add(roof);
      bench(x - 2, z, Math.PI / 2, true); bench(x + 2, z, -Math.PI / 2, false); fx('BLD', 'GZB', 'WOD.SHT', 'Westhaven Builders', 'The gazebo', x, z); }
    const s = sign('THE ROSE GARDEN', '', 5, '#6b1d2a', '#fff1e6'); place(s, mx, 1.6, q.z1 + 4.4, 0);
  }
  // ---- sunflowers and lavender ----
  { const q = Q.sun, half = (q.x0 + q.x1) / 2;
    bed(q.x0 + 1, half - 1, q.z0 + 1, q.z1 - 1);
    { const pl = []; for (let x = q.x0 + 2; x < half - 2; x += 1.2) for (let z = q.z0 + 2; z < q.z1 - 2; z += 1.2) { const h = 1.6 + r() * .7; pl.push([x, z]); stems.push([x + (r() - .5) * .3, z + (r() - .5) * .3, h, .025]); blooms.push([x, z, h + .05, col('sunflower'), .22, 'sun']); }
      bot.bed('sunflower', q.x0 + 1, half - 1, q.z0 + 1, q.z1 - 1, 'the sunflower field', { plants: pl, every: 12 }); }
    for (let z = q.z0 + 2; z < q.z1 - 1; z += 2.2) { bed(half + 1, q.x1 - 1, z - .6, z + .6); const pl = []; for (let x = half + 1.5; x < q.x1 - 1.5; x += .7) { pl.push([x, z]); bushes.push([x, .3, z, .36, 0x6f8f5f]); for (let k = 0; k < 4; k++) blooms.push([x + (r() - .5) * .5, z + (r() - .5) * .4, .55 + r() * .15, col('lavender'), .05, 'spike']); }
      bot.bed('lavender', half + 1, q.x1 - 1, z - .6, z + .6, 'the lavender rows', { plants: pl }); }
    const s = sign('SUNFLOWERS & LAVENDER', '', 5.5, '#5a4a12', '#fff6d6'); place(s, (q.x0 + q.x1) / 2, 1.6, q.z0 - 4.4, Math.PI);
  }
  // ---- the glasshouse, and a cutting garden of every colour ----
  { const q = Q.glass, x = (q.x0 + q.x1) / 2, z = q.z0 + 22, W = 40, D = 24, H = 9;
    const glass = new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: .05, metalness: .1, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide });
    const iron = mat(0xf2f2ee, { metal: .3, rough: .5 });
    // a barrel-vaulted palm house: glass walls on a low brick base, ribs of white iron
    const floor = B(root, W, .06, D, x, .03, z, mat(0xb9b2a4, { rough: .8 }), false);   // a tiled floor, and a low brick wall all round (open at the door)
    B(root, W, .8, .3, x, .4, z + D / 2, 0x8a4b38); for (const s of [-1, 1]) B(root, W / 2 - 2.5, .8, .3, x + s * (W / 4 + 1.25), .4, z - D / 2, 0x8a4b38); for (const s of [-1, 1]) B(root, .3, .8, D, x + s * W / 2, .4, z, 0x8a4b38);
    for (const s of [-1, 1]) { const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, 3.2), glass); wall.position.set(x, 2.4, z + s * D / 2); wall.rotation.y = s > 0 ? 0 : Math.PI; root.add(wall); }
    for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.PlaneGeometry(D, 3.2), glass); end.position.set(x + s * W / 2, 2.4, z); end.rotation.y = s * Math.PI / 2; root.add(end); }
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 24, 1, true, 0, Math.PI), glass); vault.rotation.z = Math.PI / 2; vault.position.set(x, 4, z); vault.scale.set(.45, 1, 1); root.add(vault);
    for (let i = 0; i <= 8; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(D / 2, .1, 6, 20, Math.PI), iron); rib.rotation.y = Math.PI / 2; rib.position.set(x - W / 2 + i * W / 8, 4, z); rib.scale.set(1, .45, 1); root.add(rib); }
    for (let i = 0; i <= 8; i++) for (const s of [-1, 1]) C(root, .08, .08, 3.2, x - W / 2 + i * W / 8, 2.4, z + s * D / 2, 0xf2f2ee, 6);
    // the doors face the path, and you can walk in: the walls are solid but the front middle is open
    solid(x - W / 2 - .2, x + W / 2 + .2, z + D / 2 - .2, z + D / 2 + .2); solid(x - W / 2 - .2, x - W / 2 + .2, z - D / 2, z + D / 2); solid(x + W / 2 - .2, x + W / 2 + .2, z - D / 2, z + D / 2);
    solid(x - W / 2, x - 2.5, z - D / 2 - .2, z - D / 2 + .2); solid(x + 2.5, x + W / 2, z - D / 2 - .2, z - D / 2 + .2);
    fx('BLD', 'GLH', 'GLS.STL.BRK', 'Clearview Glassworks (glass), Ironforge Steel (frame), built by Westhaven Builders', 'The Glasshouse', x, z);
    const s = sign('THE GLASSHOUSE', 'tropical flowers', 5, '#24405a', '#eaf6ff'); place(s, x, 4.2, z - D / 2 - .1, Math.PI);
    // inside: palms, a pond, and tropical blooms
    // the pond is sunk into the floor: a little basin, its water below the tiles
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), new THREE.MeshStandardMaterial({ color: 0x2f7f8f, roughness: .1 })); root.add(pond);
    ctx.digPond?.(root, { x, z, rx: 3.2, rim: .065, level: -.3, bed: -1, water: pond, materials: [floor.material, lawn.material, ...(ctx.groundMats || [])] }); circle(x, z, 3.2);
    // a little two-step waterfall tumbling into the pond over mossy rocks; a pump in the rocks lifts pond water back to the top
    glassFalls = buildWaterfall(root, { x, z: z - 3.6, yaw: 0, width: 1.4, scale: .5, tiers: [{ lip: 1.9, z: 0, land: .9, v0: .9 }, { lip: .9, z: 1.3, land: -.3, v0: .9 }], block: (bx, bz, br) => circle(bx, bz, br * .7) });
    fx('LND', 'WFL', 'STN.WAT', 'Westhaven Builders (rockwork in Deepstone Quarries stone)', 'Glasshouse waterfall', x, z - 3.6); fx('MCH', 'PMP', 'STL.PLS', 'Spark & Pipe Utilities (recirculating pump hidden in the rocks)', 'Waterfall pump', x, z - 4.6);
    bot.label(x, z - 2.2, 3, 'Waterfall', 'A little waterfall falls in two steps into the pond. The pond water is lifted back to the top by a pump hidden in the rocks, so it never runs dry.');
    for (const [dx, dz] of [[-14, -6], [-8, 6], [8, -6], [14, 6], [-16, 6], [16, -6]]) { bot.single('kentia', x + dx, z + dz, 'the Glasshouse', 2.2); C(root, .2, .3, 6, x + dx, 3.8, z + dz, 0x7a5a3a, 8); for (let k = 0; k < 7; k++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(.5, 3.4, 4), mat(0x2f7f3a)); leaf.position.set(x + dx + Math.cos(k) * 1.2, 6.6, z + dz + Math.sin(k) * 1.2); leaf.rotation.set(Math.sin(k) * 1.2, 0, Math.cos(k) * 1.2); root.add(leaf); } }
    // six tropical plants, each growing in its own part of the house
    const TROP = ['bougain', 'strelitzia', 'allamanda', 'orchid', 'hibiscus', 'gardenia'], tp = TROP.map(() => []);
    for (let i = 0; i < 220; i++) { const a = r() * Math.PI * 2, d = 4 + r() * 9; const px = x + Math.cos(a) * d * 1.5, pz = z + Math.sin(a) * d * .8; if (Math.abs(pz - z) > D / 2 - 1.5 || Math.abs(px - x) > W / 2 - 1.5 || Math.hypot(px - x, pz - z + 4.2) < 2.8) continue; const k = Math.floor(a / (Math.PI * 2) * 6) % 6; tp[k].push([px, pz]); bushes.push([px, .45, pz, .5, 0x2f6b3a]); blooms.push([px + (r() - .5) * .4, pz + (r() - .5) * .4, .92, col(TROP[k]), .16, 'star']); }
    TROP.forEach((key, k) => bot.patch(key, tp[k], 'the Glasshouse', 3.5));
    stander(x - 6, z - 2, .4, { outfit: 0x3a6b35, task: 'talk' }); stander(x + 5, z + 3, 2.5, { outfit: 0x8a6a3d, task: 'idle' });
    // the cutting garden south of it: blocks of every colour
    const CUT = ['dahlia', 'zinnia', 'cosmos', 'snapdragon', 'verbena', 'calendula', 'cornflower', 'sweetwill'];
    for (let i = 0; i < 8; i++) { const bx = q.x0 + 4 + (i % 4) * 21, bz = q.z1 - 18 + Math.floor(i / 4) * 9, pl = []; bed(bx, bx + 17, bz, bz + 6);
      for (let px = bx + .6; px < bx + 16.6; px += .6) for (let pz = bz + .6; pz < bz + 5.6; pz += .6) { const ax = px + (r() - .5) * .15, az = pz + (r() - .5) * .15; pl.push([ax, az]); flower(ax, az, .3 + r() * .2, col(CUT[i]), .07, i % 2 ? 'cup' : 'star'); }
      bot.bed(CUT[i], bx, bx + 17, bz, bz + 6, 'the cutting garden', { plants: pl, every: 9 }); }
  }
  // ---- hedges and trees along the inside of the railing ----
  // (silver birches along the north railing, copper beeches and oaks along the south, a row of Italian cypresses by the west gate)
  for (let x = FLOWER.x0 + 8, i = 0; x < FLOWER.x1 - 6; x += 14, i++) { bot.tree('birch', x, FLOWER.z0 + 3, 1, PARK); bot.tree(i % 2 ? 'oak' : 'beech', x + 7, FLOWER.z1 - 3, .9, PARK); }
  for (let z = FLOWER.z0 + 10; z < FLOWER.z1 - 6; z += 14) if (Math.abs(z - CZ) > 10) bot.tree('cypress', FLOWER.x0 + 3, z, 1, PARK);
  for (const [x, z] of [[CX - 30, CZ - 4.5], [CX + 30, CZ - 4.5], [CX - 30, CZ + 4.5], [CX + 30, CZ + 4.5], [CX - 4.5, CZ - 40], [CX + 4.5, CZ + 40]]) lamp(x, z);
  for (const [x, z, ry, sit] of [[CX - 22, CZ - 4.6, 0, true], [CX + 22, CZ + 4.6, Math.PI, false], [CX - 4.6, CZ - 30, Math.PI / 2, false], [CX + 4.6, CZ + 30, -Math.PI / 2, true], [70, CZ - 4.6, 0, false], [200, CZ + 4.6, Math.PI, true]]) bench(x, z, ry, sit);

  // ---- avenues of trees along the main paths, and more places to sit: benches and picnic tables ----
  // (a cherry blossom avenue east to west, Japanese maples along the north–south walk)
  for (let x = FLOWER.x0 + 12; x < FLOWER.x1 - 8; x += 12) if (Math.abs(x - CX) > 18 && Math.abs(x - (Q.roses.x0 + Q.roses.x1) / 2) > 6) for (const s of [-1, 1]) bot.tree('cherry', x, CZ + s * 7, .85, 'the cherry avenue');
  for (let z = FLOWER.z0 + 12; z < FLOWER.z1 - 8; z += 12) if (Math.abs(z - CZ) > 18) for (const s of [-1, 1]) bot.tree('maple', CX + s * 7, z, .9, 'the maple walk');
  for (const [x, z] of [[CX - 50, CZ + 4.6], [CX + 50, CZ - 4.6], [CX - 4.6, CZ + 55], [CX + 4.6, CZ - 55]]) bench(x, z, z > CZ ? Math.PI : 0, false);
  const picnic = (x, z, sit) => { fx('PRD', 'PIC', 'WOD', 'Northwood Sawmills', 'Picnic table', x, z); const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); B(g, 2.2, .08, .9, 0, .75, 0, 0x8a6a42); for (const s of [-1, 1]) { B(g, 2.2, .06, .3, 0, .45, s * .75, 0x8a6a42); B(g, .08, .75, .08, s * .9, .37, 0, 0x5a4a3a); }
    for (const s of [-1, 1]) ctx.sitSpots?.push({ x, z: z + s * .75, yaw: s > 0 ? Math.PI : 0, seatY: .47, label: 'Sit at the picnic table' }); if (sit) { sitter(x - .5, z - .75, 0, .47, { task: 'talk' }); sitter(x + .4, z + .75, Math.PI, .47, { task: 'talk' }); } solid(x - 1.1, x + 1.1, z - .45, z + .45); };
  picnic(CX - 24, CZ + 12, true); picnic(CX + 24, CZ - 12, false); picnic(CX + 24, CZ + 12, true); picnic(CX - 24, CZ - 12, false);
  // ---- animals: ducks on the fountain, peacocks free on the lawns, tortoises in the glasshouse ----
  for (let i = 0; i < 3; i++) { const a = animal('duck', CX - 3 + i * 3, CZ + (i - 1) * 2, { x0: CX - 5, x1: CX + 5, z0: CZ - 5, z1: CZ + 5 }, { swim: true, swimY: .5 }, 'duck', 'the fountain'); }
  for (let i = 0; i < 6; i++) { const q = Object.values(Q)[i % 4]; animal('peacock', q.x0 - 2.5, q.z0 + 5 + i * 3, { x0: FLOWER.x0 + 6, x1: FLOWER.x1 - 6, z0: FLOWER.z0 + 6, z1: FLOWER.z1 - 6 }); }
  for (let i = 0; i < 2; i++) animal('tortoise', (Q.glass.x0 + Q.glass.x1) / 2 - 8 + i * 12, Q.glass.z0 + 15, { x0: (Q.glass.x0 + Q.glass.x1) / 2 - 16, x1: (Q.glass.x0 + Q.glass.x1) / 2 + 16, z0: Q.glass.z0 + 13, z1: Q.glass.z0 + 17.5 }, {}, 'hermann', 'the Glasshouse');   // (on the dry floor, clear of the pond)
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
  { const BF = [0xffd23f, 0xb5342f, 0x4cc9f0, 0xffffff, 0xff8c42], BFK = ['brimstone', 'peacockfly', 'commonblue', 'smallwhite', 'orangetip'];
    for (let i = 0; i < 46; i++) { const q = Object.values(Q)[i % 4], g = new THREE.Group(); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.14, .1), new THREE.MeshBasicMaterial({ color: BF[i % BF.length], side: THREE.DoubleSide })); w.position.x = s * .07; g.add(w); g.userData[s] = w; }
      root.add(g); flies.push({ g, cx: q.x0 + r() * (q.x1 - q.x0), cz: q.z0 + r() * (q.z1 - q.z0), ph: r() * 9, rad: 2 + r() * 4 }); bot.animal({ kind: BFK[i % BFK.length], pos: g.position }, BFK[i % BFK.length], 'over the flower beds'); }
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

  for (const [t0, x, z] of [['THE TULIP FIELDS', (Q.tulips.x0 + Q.tulips.x1) / 2, Q.tulips.z1 + 4.4], ['THE ROSE GARDEN', (Q.roses.x0 + Q.roses.x1) / 2, Q.roses.z1 + 4.4], ['SUNFLOWERS & LAVENDER', (Q.sun.x0 + Q.sun.x1) / 2, Q.sun.z0 - 4.4]]) fx('PRD', 'SGN', 'WOD', 'Northwood Sawmills', `Sign: ${t0}`, x, z);
  bot.people(K);   // every visitor and gardener here has an ID

  // ---- update ----
  let t = 0;
  function update(dt, p, night) {
    glassFalls?.update(dt, Math.hypot(p.x - (Q.glass.x0 + Q.glass.x1) / 2, p.z - (Q.glass.z0 + 22)) < 60);
    if (p.x < FLOWER.x0 - 160 || p.x > FLOWER.x1 + 160 || p.z < FLOWER.z0 - 160 || p.z > FLOWER.z1 + 160) return;
    t += dt; K.update(dt, p, 110);
    if (ctx.windmill) ctx.windmill.rotation.z = t * .6;
    if (ctx.fountain) ctx.fountain.scale.y = 1 + Math.sin(t * 3) * .06;
    for (const f of flies) { const a = t * .7 + f.ph; f.g.position.set(f.cx + Math.cos(a) * f.rad, .6 + Math.sin(t * 2 + f.ph) * .25, f.cz + Math.sin(a * 1.3) * f.rad * .6); f.g.rotation.y = -a; const flap = Math.sin(t * 22 + f.ph) * .9; f.g.userData[-1].rotation.y = flap; f.g.userData[1].rotation.y = -flap; f.g.visible = !night; }
    for (const l of lamps) l.material.emissiveIntensity = night ? 2.2 : .15;
  }
  return { update, kit: K };
}
