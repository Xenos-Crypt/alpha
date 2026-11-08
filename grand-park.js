// Westhaven Grand Park: the biggest park in the city (about 350 m by 190 m), north of the leisure strip.
//   - a big boating lake with an island gazebo, a jetty and swan pedalos you can hire, ducks, swans and flamingos
//   - formal flower gardens: rows of beds in every colour, a rose arch walk and a sundial
//   - Westhaven Mini Zoo: giraffes, elephants, zebras, ostriches, lions, monkeys, tortoises and free-roaming peacocks
//   - a playground full of children (swings, slide, seesaw, roundabout, sandpit)
//   - a bandstand with drummers, picnic lawns with families, a football kickabout and elders playing Ayo
//   - avenues of trees, lamps and benches, joggers and families walking round the lake
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export const PARK = { x0: 240, x1: 595, z0: -1105, z1: -912, gates: [300, 420, 540] };
export const LAKE = { x: 420, z: -1015, rx: 80, rz: 42, island: { x: 440, z: -1018, r: 9 } };
const GARDEN = { x0: 250, x1: 330, z0: -1095, z1: -935 }, ZOO = { x0: 510, x1: 590, z0: -1095, z1: -935 }, PLAY = { x0: 270, x1: 330, z0: -932, z1: -916 };
const inLake = (x, z, pad = 0) => ((x - LAKE.x) / (LAKE.rx + pad)) ** 2 + ((z - LAKE.z) / (LAKE.rz + pad)) ** 2 < 1;
// grass mustn't grow on the paths, in the lake or through the playground and zoo yards
export const PARK_NO_GRASS = [{ cx: LAKE.x - 40, cz: LAKE.z, r: 40 }, { cx: LAKE.x, cz: LAKE.z, r: 41 }, { cx: LAKE.x + 40, cz: LAKE.z, r: 40 }, { minX: 416, maxX: 424, minZ: -973, maxZ: -912 }, { minX: PLAY.x0, maxX: PLAY.x1, minZ: PLAY.z0, maxZ: PLAY.z1 }];

export function buildGrandPark(ctx) {
  const K = makeKit(ctx), { B, C, S, mat, solid, circle, sign, place, spot, stander, sitter, walker, family, animal } = K;
  const { scene, makeTex, toast, stats, sports } = ctx, P = PARK, root = new THREE.Group(); scene.add(root);
  const gravel = mat(0xcdb68a, { rough: 1 });
  const path = (x0, x1, z0, z1) => B(root, x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.03, (z0 + z1) / 2, gravel, false);
  const tree = (x, z, kind, s = 1) => { if (inLake(x, z, 6)) return; ctx.tree?.(x, z, kind, s); };
  const bench = (x, z, ry, sitDown = false) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 1.8, 0.08, 0.5, 0, 0.45, 0, 0x7a5636); B(g, 1.8, 0.4, 0.06, 0, 0.75, -0.22, 0x7a5636); for (const sx of [-0.8, 0.8]) B(g, 0.08, 0.45, 0.5, sx, 0.22, 0, 0x2a2a2a);
    if (sitDown) sitter(x, z, ry, 0.47, { task: 'talk' }); else ctx.sitSpots?.push({ x, z, yaw: ry, seatY: 0.47, label: 'Sit on the bench' }); };
  const lamps = [];
  const lamp = (x, z) => { C(root, 0.06, 0.08, 3.6, x, 1.8, z, 0x1f2326, 6); const head = S(root, 0.22, x, 3.7, z, mat(0xfff4dc, { emissive: 0xffe2a0, ei: 0.2 }), 10); head.material = head.material.clone(); lamps.push(head); };

  // ================= boundary: a clipped hedge with three gates =================
  { const hedge = mat(0x2f6b2a, { rough: 1 }), h = 1.4;
    const run = (x0, z0, x1, z1) => { B(root, Math.max(0.9, Math.abs(x1 - x0)), h, Math.max(0.9, Math.abs(z1 - z0)), (x0 + x1) / 2, h / 2, (z0 + z1) / 2, hedge); solid(Math.min(x0, x1) - 0.45, Math.max(x0, x1) + 0.45, Math.min(z0, z1) - 0.45, Math.max(z0, z1) + 0.45); };
    let x = P.x0; for (const g of P.gates) { run(x, P.z1, g - 4, P.z1); x = g + 4; } run(x, P.z1, P.x1, P.z1);
    run(P.x0, P.z0, P.x1, P.z0); run(P.x0, P.z0, P.x0, P.z1); run(P.x1, P.z0, P.x1, P.z1);
    for (const g of P.gates) { for (const s of [-1, 1]) { B(root, 1.2, 4.2, 1.2, g + s * 4.6, 2.1, P.z1, 0xd9cfbf); S(root, 0.5, g + s * 4.6, 4.7, P.z1, 0xd9cfbf, 10); }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.18, 6, 24, Math.PI), mat(0x1f2326, { metal: 0.6, rough: 0.4 })); arch.position.set(g, 4.2, P.z1); root.add(arch);
      const s = sign('WESTHAVEN GRAND PARK', g === 420 ? 'lake · gardens · mini zoo · playground' : '', 7, '#123a2a', '#f2e6c8'); place(s, g, 6.1, P.z1 + 0.05, 0);
      path(g - 3, g + 3, P.z1 - 6, P.z1 + 8); }
  }
  ctx.destinations?.push({ name: 'Westhaven Grand Park', x: 420, z: P.z1 + 6 }, { name: 'Grand Park boating lake', x: 420, z: -968 }, { name: 'Westhaven Mini Zoo', x: 550, z: -930 });

  // ================= paths =================
  path(416, 424, -973, -912);                                   // the avenue from the main gate to the lake
  path(P.x0 + 6, P.x1 - 6, -926, -920);                         // the inner promenade along the south side
  path(296, 304, -935, -920); path(536, 544, -935, -920);       // to the side gates
  { // a ring path round the lake
    const n = 64, ring = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ring.push([LAKE.x + Math.cos(a) * (LAKE.rx + 9), LAKE.z + Math.sin(a) * (LAKE.rz + 9)]); }
    for (let i = 0; i < n; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n], L = Math.hypot(bx - ax, bz - az); const m = B(root, L + 0.6, 0.05, 4, (ax + bx) / 2, 0.035, (az + bz) / 2, gravel, false); m.rotation.y = Math.atan2(-(bz - az), bx - ax); }
    ctx.ringPath = ring;
    for (let i = 0; i < n; i += 4) { const a = i / n * Math.PI * 2; lamp(LAKE.x + Math.cos(a) * (LAKE.rx + 12), LAKE.z + Math.sin(a) * (LAKE.rz + 12)); if (i % 8 === 0) bench(LAKE.x + Math.cos(a + 0.05) * (LAKE.rx + 12.5), LAKE.z + Math.sin(a + 0.05) * (LAKE.rz + 12.5), Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI, i % 16 === 0); }
    // walkers, joggers and families round the lake (both directions)
    const fwd = ring.filter((_, i) => i % 2 === 0), back = fwd.slice().reverse();
    for (let k = 0; k < 4; k++) family(k % 2 ? fwd : back, { kids: 1 + (k % 2), t: k * 70, speed: 1.0 });
    for (let k = 0; k < 4; k++) walker(k % 2 ? back : fwd, { t: k * 55 + 20, speed: k < 2 ? 3.0 : 1.3 });   // two joggers, two walkers
  }
  for (let z = -965; z <= -916; z += 7) { tree(411, z, 'oak', 1.2); tree(429, z, 'oak', 1.2); if ((z + 965) % 14 === 0) { lamp(413.5, z + 3.5); lamp(426.5, z + 3.5); } }

  // ================= the lake =================
  { const water = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x2f7fb0, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.92, emissive: 0x0a3a5a, emissiveIntensity: 0.35 }));
    water.rotation.x = -Math.PI / 2; water.scale.set(LAKE.rx, LAKE.rz, 1); water.position.set(LAKE.x, 0.09, LAKE.z); root.add(water); ctx.lakeWater = water;
    const shore = new THREE.Mesh(new THREE.RingGeometry(1, 1.07, 64), mat(0xb9a57a, { rough: 1 })); shore.rotation.x = -Math.PI / 2; shore.scale.set(LAKE.rx, LAKE.rz, 1); shore.position.set(LAKE.x, 0.1, LAKE.z); root.add(shore);
    for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2, r = 1.02 + Math.sin(i * 7.3) * 0.015; const st = S(root, 0.5 + (i % 3) * 0.2, LAKE.x + Math.cos(a) * LAKE.rx * r, 0.1, LAKE.z + Math.sin(a) * LAKE.rz * r, 0x8a8478, 6); st.scale.y = 0.45; st.castShadow = false; }
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + 0.07; const g = new THREE.Group(); g.position.set(LAKE.x + Math.cos(a) * (LAKE.rx - 1.5), 0, LAKE.z + Math.sin(a) * (LAKE.rz - 1.5)); root.add(g); for (let k = 0; k < 5; k++) { const r = C(g, 0.02, 0.03, 1.4 + (k % 3) * 0.3, (k - 2) * 0.15, 0.7, (k % 2) * 0.15, 0x6b8a3a, 4); r.castShadow = false; } }   // reeds
    // keep walkers out of the water: a chain of circles along the long axis
    for (let x = LAKE.x - LAKE.rx + 8; x <= LAKE.x + LAKE.rx - 8; x += 8) { const half = LAKE.rz * Math.sqrt(Math.max(0, 1 - ((x - LAKE.x) / LAKE.rx) ** 2)); if (half > 3) circle(x, LAKE.z, half - 1); }
    // the island: a little gazebo with a fountain
    const I = LAKE.island; const isl = C(root, I.r, I.r + 1.5, 0.6, I.x, 0.2, I.z, 0x6f8f4a, 32); isl.receiveShadow = true;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; C(root, 0.12, 0.12, 3.2, I.x + Math.cos(a) * 3.2, 2.1, I.z + Math.sin(a) * 3.2, 0xf4f1ea, 8); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 8), mat(0x8e3b2f)); roof.position.set(I.x, 4.8, I.z); root.add(roof); C(root, 3.3, 3.3, 0.2, I.x, 0.6, I.z, 0xe8e2d6, 8);
    for (const [dx, dz] of [[6, 2], [-5, -4], [2, -6]]) tree(I.x + dx, I.z + dz, 'birch', 0.9), ctx.tree?.(I.x + dx, I.z + dz, 'birch', 0.9);
    // the jetty
    B(root, 3, 0.25, 12, LAKE.x, 0.3, LAKE.z + LAKE.rz - 3, 0x8a6a46); for (let k = 0; k < 5; k++) for (const s of [-1, 1]) C(root, 0.12, 0.12, 1.2, LAKE.x + s * 1.4, 0.4, LAKE.z + LAKE.rz - 8 + k * 2.6, 0x5a3b26, 6);
    const js = sign('SWAN PEDALOS', '4 gold for a trip round the island', 4.2, '#1f6fd1', '#ffffff', 'sans-serif'); place(js, LAKE.x + 2.5, 2.2, LAKE.z + LAKE.rz + 3.2, 0); C(root, 0.06, 0.06, 2.2, LAKE.x + 2.5, 1.1, LAKE.z + LAKE.rz + 3.25, 0x333333, 6);
    stander(LAKE.x - 2.2, LAKE.z + LAKE.rz + 3.5, Math.PI, { outfit: 0x1f6fd1, task: 'talk' });
  }
  // swan pedalos going round the island
  const boats = [];
  { const swanBoat = c => { const g = new THREE.Group(); root.add(g); const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(c)); hull.scale.set(1.0, 0.45, 1.5); hull.position.y = 0.2; g.add(hull);
      const neck = C(g, 0.12, 0.2, 1.6, 0, 1.0, 1.1, c, 8); neck.rotation.x = -0.25; S(g, 0.28, 0, 1.85, 1.3, c, 10); B(g, 0.12, 0.1, 0.35, 0, 1.8, 1.6, 0xf2a03a); B(g, 1.4, 0.35, 0.6, 0, 0.6, -0.4, 0xffffff); return g; };
    for (let i = 0; i < 4; i++) { const g = swanBoat(i % 2 ? 0xffffff : 0xffd6e8); const b = { g, t: i / 4, rider: null }; boats.push(b); if (i) { const h = K.person(0, 0, 0, { child: i === 2 }); if (h) { g.add(h.root); h.root.position.set(0, 0.35, -0.4); b.pass = h; } } }
  }
  const boatPos = t => { const a = t * Math.PI * 2; return { x: LAKE.island.x + Math.cos(a) * 26, z: LAKE.island.z + Math.sin(a) * 18, yaw: Math.atan2(-Math.sin(a) * 26, Math.cos(a) * 18) }; };
  let boatRide = null;
  spot(LAKE.x, LAKE.z + LAKE.rz + 2.2, 2.0, 'Hire a swan pedalo (4 gold)', () => {
    if (boatRide) return; if (stats.gold < 4) return toast('A swan pedalo is 4 gold.'); stats.gold -= 4;
    const b = boats[0]; const sp = { x: 0, z: 0, seatY: 1, yaw: 0, label: 'Swan pedalo', follow: () => { const p = boatPos(b.t); return { x: p.x, y: 1.0, z: p.z, yaw: p.yaw }; } };
    boatRide = { sp, t0: b.t, until: 45 }; ctx.seat(sp); toast('🦢 You pedal out onto the lake. Ducks paddle alongside you. (Press E to get off.)'); ctx.gainXp?.(2);
  });

  // ================= water birds =================
  const lakeArea = { x0: LAKE.x - 50, x1: LAKE.x + 50, z0: LAKE.z - 25, z1: LAKE.z + 25 };
  for (let i = 0; i < 10; i++) { const a = animal('duck', LAKE.x - 40 + i * 9, LAKE.z + (i % 3 - 1) * 15, lakeArea, { swim: true }); a.g.position.y = 0.05; }
  for (let i = 0; i < 4; i++) animal('swan', LAKE.x - 20 + i * 14, LAKE.z - 18 + (i % 2) * 30, lakeArea, { swim: true });
  const flamArea = { x0: LAKE.x + 52, x1: LAKE.x + 70, z0: LAKE.z - 12, z1: LAKE.z + 10 };
  for (let i = 0; i < 9; i++) animal('flamingo', flamArea.x0 + (i % 3) * 5, flamArea.z0 + Math.floor(i / 3) * 6, flamArea);

  // ================= flower gardens (west) =================
  { const G = GARDEN;
    const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 6, 4), mat(0xffffff, { rough: 0.6 }), 11000), stems = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 0.38, 5), mat(0x3f7a3a), 11000), o = new THREE.Object3D(), col = new THREE.Color(); let n = 0;
    const palettes = [[0xff3b6b, 0xff7a9a], [0xffd23f, 0xffb703], [0xc58fff, 0x8a5cff], [0xff922b, 0xffffff], [0xffffff, 0xf8c8dc], [0xe63946, 0xffd6e0], [0x4dabf7, 0xa5d8ff]];
    let bi = 0;
    for (let z = G.z0 + 6; z < G.z1 - 6; z += 9) for (let x = G.x0 + 5; x < G.x1 - 5; x += 13) {
      const w = 10, d = 5; B(root, w + 0.6, 0.2, d + 0.6, x + w / 2, 0.1, z + d / 2, 0x6b4a30); B(root, w, 0.05, d, x + w / 2, 0.22, z + d / 2, 0x4a3a2a, false); solid(x - 0.3, x + w + 0.3, z - 0.3, z + d + 0.3);
      const pal = palettes[bi++ % palettes.length];
      for (let k = 0; k < 100 && n < 11000; k++) { const fx = x + 0.3 + (k % 20) * (w - 0.6) / 19 + (Math.random() - 0.5) * 0.15, fz = z + 0.4 + Math.floor(k / 20) * (d - 0.8) / 4 + (Math.random() - 0.5) * 0.15;
        o.position.set(fx, 0.42 + Math.random() * 0.1, fz); o.scale.setScalar(0.8 + Math.random() * 0.5); o.updateMatrix(); flowers.setMatrixAt(n, o.matrix); flowers.setColorAt(n, col.set(pal[(Math.floor(k / 20) + k) % 2 ? 0 : 1]));
        o.position.y = 0.33; o.scale.setScalar(1); o.updateMatrix(); stems.setMatrixAt(n, o.matrix); n++; }
    }
    flowers.count = stems.count = n; root.add(stems, flowers);
    // gravel walks between the beds
    for (let z = G.z0 + 4; z < G.z1 - 2; z += 9) path(G.x0 + 3, G.x1 - 3, z - 0.6, z + 0.6);
    for (let x = G.x0 + 3; x < G.x1; x += 13) path(x - 0.9, x + 0.9, G.z0 + 3, G.z1 - 3);
    // a rose arch walk down the middle, and a sundial
    for (let z = G.z0 + 10; z < G.z1 - 10; z += 4.5) { const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 5, 14, Math.PI), mat(0x2f6b2a)); arch.position.set(G.x0 + 3 + 13 * 3, 0, z); arch.rotation.y = 0; root.add(arch);
      for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI; S(root, 0.16, arch.position.x + Math.cos(a) * 1.6, Math.sin(a) * 1.6 + 0.05, z, [0xe63946, 0xff7a9a, 0xffffff][k % 3], 6).castShadow = false; } }
    C(root, 0.4, 0.5, 1.0, 290, 0.5, -1015, 0xd9cfbf, 12); const dial = C(root, 0.7, 0.7, 0.06, 290, 1.03, -1015, 0xc9a24a, 20); dial.material = mat(0xc9a24a, { metal: 0.7, rough: 0.3 }); B(root, 0.04, 0.4, 0.5, 290, 1.25, -1015, 0x444444);
    { const s = sign('THE FLOWER GARDENS', 'please keep off the beds', 6, '#2f6b2a', '#ffffff'); place(s, (G.x0 + G.x1) / 2, 2.4, G.z1 + 1, 0); C(root, 0.07, 0.07, 2.4, (G.x0 + G.x1) / 2, 1.2, G.z1 + 1.05, 0x333333, 6); }
    for (const [x, z] of [[262, -940], [318, -940], [262, -1090], [318, -1090]]) tree(x, z, 'birch', 1);
    for (let k = 0; k < 6; k++) bench(G.x0 + 8 + k * 12, G.z1 - 1.5, Math.PI, k % 3 === 0);
    walker([[G.x0 + 4, G.z1 - 5], [G.x1 - 4, G.z1 - 5], [G.x1 - 4, G.z0 + 4], [G.x0 + 4, G.z0 + 4]], { speed: 0.8 });
    family([[G.x0 + 42, G.z1 - 5], [G.x0 + 42, G.z0 + 5], [G.x0 + 16, G.z0 + 5], [G.x0 + 16, G.z1 - 5]], { kids: 1, speed: 0.8 });
    stander(304, -990, 0.5, { task: 'talk', outfit: 0x2f6b2a });   // a gardener
  }

  // ================= Westhaven Mini Zoo (east) =================
  { const Z = ZOO, fenceM = mat(0x5a4632);
    const pen = (x0, x1, z0, z1) => { for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) { const L = Math.hypot(bx - ax, bz - az); const g = new THREE.Group(); g.position.set((ax + bx) / 2, 0, (az + bz) / 2); g.rotation.y = Math.atan2(-(bz - az), bx - ax); root.add(g);
        for (const y of [0.5, 1.0, 1.5]) B(g, L, 0.08, 0.08, 0, y, 0, fenceM, false); for (let a = -L / 2; a <= L / 2 + 0.01; a += 2.5) B(g, 0.14, 1.7, 0.14, a, 0.85, 0, fenceM, false);
        solid(Math.min(ax, bx) - 0.1, Math.max(ax, bx) + 0.1, Math.min(az, bz) - 0.1, Math.max(az, bz) + 0.1); } };
    const area = (x0, x1, z0, z1, m = 2) => ({ x0: x0 + m, x1: x1 - m, z0: z0 + m, z1: z1 - m });
    const yard = (x0, x1, z0, z1, c) => B(root, x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.03, (z0 + z1) / 2, c, false);
    const plaque = (text, sub, x, z, ry = 0) => { const s = sign(text, sub, 3.4, '#5a4632', '#f2e6c8'); place(s, x, 1.9, z, ry); C(root, 0.05, 0.05, 1.9, x, 0.95, z - Math.cos(ry) * 0.02, 0x333333, 6); };
    // giraffes
    pen(515, 548, -1092, -1058); yard(515, 548, -1092, -1058, 0xc9a86a); for (let i = 0; i < 3; i++) animal('giraffe', 522 + i * 9, -1075, area(515, 548, -1092, -1058, 3));
    tree(520, -1088, 'oak', 1.6); plaque('GIRAFFES', 'the tallest animals on Earth', 531.5, -1056.8);
    // elephants with a bathing pool
    pen(552, 590, -1092, -1058); yard(552, 590, -1092, -1058, 0xb9a07a); const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 24), mat(0x3a8fbf, { rough: 0.1 })); pool.rotation.x = -Math.PI / 2; pool.position.set(580, 0.08, -1083); root.add(pool);
    for (let i = 0; i < 2; i++) animal('elephant', 562 + i * 10, -1072, area(552, 590, -1092, -1058, 5), { scale: i ? 0.75 : 1 }); plaque('ELEPHANTS', 'mother and calf', 571, -1056.8);
    // savanna: zebras and ostriches
    pen(515, 548, -1052, -1016); yard(515, 548, -1052, -1016, 0xd9c08a); for (let i = 0; i < 4; i++) animal('zebra', 520 + i * 7, -1035, area(515, 548, -1052, -1016)); for (let i = 0; i < 2; i++) animal('ostrich', 526 + i * 12, -1045, area(515, 548, -1052, -1016));
    plaque('ZEBRAS & OSTRICHES', 'the savanna', 531.5, -1014.8);
    // lions with rocks to lie on
    pen(552, 590, -1052, -1016); yard(552, 590, -1052, -1016, 0xc8a46a); for (const [x, z, r] of [[580, -1044, 3], [560, -1024, 2.2]]) { const rk = S(root, r, x, 0.6, z, 0x8a7a6a, 8); rk.scale.y = 0.55; }
    animal('lion', 566, -1036, area(552, 590, -1052, -1016, 4)); animal('lion', 574, -1028, area(552, 590, -1052, -1016, 4), { female: true }); plaque('LIONS', 'please don\'t tap the fence', 571, -1014.8);
    // monkeys with a climbing frame
    pen(515, 548, -1010, -985); yard(515, 548, -1010, -985, 0x8a6a46); for (const x of [522, 531, 540]) { C(root, 0.15, 0.15, 5, x, 2.5, -998, 0x6b4a30, 6); } B(root, 20, 0.15, 0.15, 531, 4.6, -998, 0x6b4a30); B(root, 20, 0.15, 0.15, 531, 2.8, -998, 0x6b4a30);
    for (let i = 0; i < 4; i++) animal('monkey', 520 + i * 6, -995, area(515, 548, -1010, -985)); plaque('MONKEYS', 'cheeky and fast', 531.5, -983.8);
    // tortoises
    pen(552, 576, -1010, -985); yard(552, 576, -1010, -985, 0x9a8a5a); for (let i = 0; i < 3; i++) animal('tortoise', 558 + i * 6, -998, area(552, 576, -1010, -985)); plaque('GIANT TORTOISES', 'over 100 years old', 564, -983.8);
    // peacocks wander the zoo paths freely
    for (let i = 0; i < 4; i++) animal('peacock', 530 + i * 12, -965 + (i % 2) * 6, { x0: 512, x1: 588, z0: -980, z1: -955 });
    { const s = sign('WESTHAVEN MINI ZOO', 'giraffes · elephants · lions · zebras · monkeys', 9, '#5a4632', '#f2e6c8'); place(s, 550, 3.6, -950, 0); for (const sx of [-4.2, 4.2]) C(root, 0.15, 0.15, 3.8, 550 + sx, 1.9, -950, 0x5a4632, 8); }
    stander(548, -978, Math.PI, { outfit: 0x4a6a2a, task: 'talk' });   // the keeper
    spot(548, -976, 1.8, 'Talk to the zookeeper', () => toast(['🦒 "The giraffes eat about 30 kg of leaves a day. Those tongues are nearly half a metre long!"', '🐘 "The little one was born last spring. She follows her mum everywhere."', '🦁 "Lions sleep up to 20 hours a day. That roar carries 8 km."', '🦚 "The peacocks go where they like. They think they own the place."'][Math.floor(Math.random() * 4)]));
    for (const [pts, kids] of [[[[512, -960], [588, -960], [588, -1054], [550, -1054], [550, -960]], 2], [[[588, -975], [512, -975], [512, -1054], [550, -1054], [550, -975]], 1]]) family(pts, { kids, speed: 0.8 });
    for (let k = 0; k < 5; k++) stander(518 + k * 15, -1013.8 + (k % 2 ? -40 : 0) + 0, Math.PI, { child: k % 2 === 0, task: 'cheer' });
  }

  // ================= playground =================
  const swings = [], round = { g: null };
  { const Pl = PLAY; B(root, Pl.x1 - Pl.x0, 0.06, Pl.z1 - Pl.z0, (Pl.x0 + Pl.x1) / 2, 0.03, (Pl.z0 + Pl.z1) / 2, 0xc0392b, false);   // soft rubber surface
    // swings
    { const x = 278, z = -924; for (const sx of [-4, 4]) { const a = C(root, 0.08, 0.08, 3.4, x + sx, 1.6, z - 0.9, 0x1f6fd1, 6); a.rotation.x = 0.3; const b = C(root, 0.08, 0.08, 3.4, x + sx, 1.6, z + 0.9, 0x1f6fd1, 6); b.rotation.x = -0.3; }
      C(root, 0.07, 0.07, 8, x, 3.2, z, 0x1f6fd1, 6).rotation.z = Math.PI / 2; solid(x - 4.2, x + 4.2, z - 1.2, z + 1.2);
      for (let i = 0; i < 4; i++) { const piv = new THREE.Group(); piv.position.set(x - 3 + i * 2, 3.2, z); root.add(piv); for (const sx of [-0.25, 0.25]) B(piv, 0.02, 2.4, 0.02, sx, -1.2, 0, 0x888888, false); B(piv, 0.6, 0.06, 0.3, 0, -2.4, 0, 0x222222);
        const sw = { piv, ph: i * 0.9 }; if (i !== 3) { const h = K.person(0, 0, 0, { child: true }); if (h) { piv.add(h.root); h.root.position.set(0, -2.92, 0); h.root.rotation.y = Math.PI / 2; sw.kid = h; } } swings.push(sw); } }
    // slide
    { const x = 292, z = -924; B(root, 1.8, 2.4, 1.8, x, 1.2, z - 2, 0xffd23f); const sl = B(root, 1.0, 0.12, 4.6, x, 1.2, z + 0.7, 0xff922b); sl.rotation.x = 0.5; for (let k = 0; k < 5; k++) B(root, 0.9, 0.06, 0.2, x, 0.4 + k * 0.45, z - 3.1 - k * 0.1, 0x666666); solid(x - 1, x + 1, z - 3.2, z + 3);
      walker([[x, z - 3.6], [x, z - 2], [x, z + 2.6], [x + 2, z + 3], [x + 2, z - 3.6]], { child: true, speed: 1.2 }); walker([[x, z - 3.6], [x, z - 2], [x, z + 2.6], [x - 2, z + 3], [x - 2, z - 3.6]], { child: true, speed: 1.0, t: 4 }); }
    // seesaw
    { const x = 304, z = -924; B(root, 0.4, 0.6, 0.4, x, 0.3, z, 0x333333); const plank = new THREE.Group(); plank.position.set(x, 0.62, z); root.add(plank); B(plank, 4, 0.1, 0.35, 0, 0, 0, 0x22c55e);
      for (const sx of [-1.8, 1.8]) { const h = K.person(0, 0, 0, { child: true }); if (h) { plank.add(h.root); h.root.position.set(sx, -0.45, 0); h.root.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2; } } round.see = plank; solid(x - 2.1, x + 2.1, z - 0.4, z + 0.4); }
    // roundabout
    { const x = 316, z = -924; const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); C(g, 2, 2, 0.15, 0, 0.3, 0, 0x7b2cbf, 20); for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; C(g, 0.04, 0.04, 1, Math.cos(a) * 1.4, 0.85, Math.sin(a) * 1.4, 0xffd23f, 5); }
      for (let k = 0; k < 2; k++) { const h = K.person(0, 0, 0, { child: true }); if (h) { g.add(h.root); const a = k * Math.PI; h.root.position.set(Math.cos(a) * 1.2, 0.35, Math.sin(a) * 1.2); } } round.g = g; circle(x, z, 2.1); }
    // sandpit
    { const x = 326, z = -926; B(root, 6, 0.3, 6, x, 0.15, z, 0xe8d29a); for (let k = 0; k < 2; k++) sitter(x - 1 + k * 2, z - 0.5, k * 2, 0.35, { child: true, task: 'eat' }); }
    for (let k = 0; k < 4; k++) bench(272 + k * 15, -914.5 + 1.2, Math.PI, k % 2 === 0);
    { const s = sign('PLAYGROUND', 'under-12s · parents please supervise', 5, '#c0392b', '#ffffff', 'sans-serif'); place(s, 300, 2.6, -933, Math.PI); C(root, 0.06, 0.06, 2.6, 300, 1.3, -933.05, 0x333333, 6); }
    for (let k = 0; k < 4; k++) walker([[272 + k * 5, -930], [286 + k * 5, -918], [300 + k * 4, -930]], { child: true, speed: 1.8, t: k * 2 });
  }

  // ================= bandstand, picnics, football, Ayo =================
  { const x = 380, z = -952; C(root, 6, 6, 0.8, x, 0.4, z, 0xe8e2d6, 8); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; C(root, 0.15, 0.15, 3.4, x + Math.cos(a) * 5.4, 2.5, z + Math.sin(a) * 5.4, 0x1f6fd1, 8); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.6, 2.6, 8), mat(0x1f6fd1)); roof.position.set(x, 5.5, z); root.add(roof); circle(x, z, 6);
    for (const [dx, dz] of [[-2, 0], [0, -2], [2, 0], [0, 2]]) { stander(x + dx, z + dz, Math.atan2(-dx, -dz) + Math.PI, { task: 'drum', y: 0.8 }); B(root, 0.35, 0.6, 0.35, x + dx * 0.8, 1.1, z + dz * 0.8, 0x8a5a2b); }
    for (let k = 0; k < 9; k++) { const a = Math.PI * 0.2 + k / 8 * Math.PI * 0.6; stander(x + Math.cos(a) * 9, z + Math.sin(a) * 9, Math.atan2(-Math.cos(a), -Math.sin(a)), { child: k % 3 === 0, task: k % 2 ? 'cheer' : 'dance' }); }
    spot(x, z + 7, 2.4, 'Listen to the band', () => { stats.energy = Math.min(100, stats.energy + 5); toast(['🥁 The talking drums trade rhythms back and forth. The crowd sings along.', '🎶 An old highlife number. A couple start dancing on the grass.', '🥁 Faster and faster... and the whole crowd cheers!'][Math.floor(Math.random() * 3)]); });
    { const s = sign('THE BANDSTAND', 'live music every afternoon', 5, '#1f6fd1', '#ffffff'); place(s, x, 2.4, z + 6.4, 0); }
  }
  // picnic lawns: blankets with families
  for (const [x, z, c, kids] of [[350, -940, 0xd0281f, 2], [362, -948, 0x1f6fd1, 1], [470, -942, 0xffd23f, 1], [486, -952, 0x22c55e, 2], [455, -960, 0xff922b, 0]]) {
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), mat(c)); blanket.rotation.x = -Math.PI / 2; blanket.position.set(x, 0.06, z); root.add(blanket); B(root, 0.6, 0.4, 0.4, x + 1, 0.2, z - 0.7, 0x8a5a2b);
    sitter(x - 0.8, z - 0.6, 0.4, 0.15, { task: 'eat' }); sitter(x + 0.6, z + 0.6, Math.PI + 0.4, 0.15, { task: 'talk' }); for (let k = 0; k < kids; k++) sitter(x - 0.4 + k * 0.8, z + 0.9, Math.PI, 0.15, { child: true, task: 'eat' });
    spot(x, z + 2, 1.6, 'Say hello to the picnickers', () => toast(['🧺 "Join us! There\'s plenty of jollof." You share some food (+10 hunger).', '🧺 "Lovely day for it, isn\'t it?"', '🧺 The kids offer you a sandwich and a wobbly cartwheel.'][Math.floor(Math.random() * 3)]) || (stats.hunger = Math.min(100, stats.hunger + 3)));
  }
  // a football kickabout: penalties against the local kids
  { const x = 500, z = -935; for (const sx of [-1.6, 1.6]) C(root, 0.06, 0.06, 1.6, x + sx, 0.8, z - 6, 0xffffff, 6); B(root, 3.3, 0.06, 0.06, x, 1.6, z - 6, 0xffffff, false);
    stander(x, z - 5.5, 0, { child: true, task: 'swing' }); for (const [dx, dz] of [[-3, -1], [3, 0], [-1, 2]]) stander(x + dx, z + dz, Math.PI, { child: true, task: 'cheer' });
    spot(x, z + 3, 2, () => sports?.label('penalties', { name: 'Kunle and friends', skill: 0.5, prize: 2 }) || 'Penalties', () => sports?.menu('penalties', { name: 'Kunle and friends', skill: 0.5, prize: 2 })); }
  // elders playing Ayo under a tree
  { const x = 455, z = -932; tree(x + 3, z - 3, 'oak', 1.5); const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); B(g, 1.2, 0.1, 0.4, 0, 0.5, 0, 0x8a5a2b); B(g, 0.5, 0.45, 0.5, 0, 0.22, 0, 0x5a3b26);
    for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.03, 10), mat(0x4a2a10)); c.position.set(-0.47 + (i % 6) * 0.19, 0.56, i < 6 ? -0.09 : 0.09); g.add(c); }
    sitter(x, z - 0.75, 0, 0.45, { outfit: 0x7a4a9a, task: 'talk' }); B(root, 0.4, 0.4, 0.4, x, 0.2, z - 0.75, 0x6b4a30); B(root, 0.4, 0.4, 0.4, x, 0.2, z + 0.75, 0x6b4a30);
    stander(x + 1.6, z + 0.5, -Math.PI / 2, { outfit: 0x2a6a4a, task: 'talk' }); solid(x - 0.7, x + 0.7, z - 0.3, z + 0.3);
    spot(x, z + 1.6, 1.8, () => sports?.label('ayo', { name: 'Baba Femi', skill: 0.75, prize: 5 }) || 'Ayo', () => sports?.menu('ayo', { name: 'Baba Femi', skill: 0.75, prize: 5 })); }
  // an ice-cream van by the main gate
  { const x = 433, z = -924; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; root.add(g); B(g, 5, 2.4, 2.2, 0, 1.5, 0, 0xffffff); B(g, 5.1, 0.4, 2.3, 0, 0.3, 0, 0xff8fb1); B(g, 2.4, 1, 0.05, 0.5, 1.8, 1.12, 0x222222); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 10), mat(0xd9a05a)); cone.position.set(-1.5, 3.2, 0); cone.rotation.x = Math.PI; g.add(cone); S(g, 0.45, -1.5, 3.8, 0, 0xffc0d9, 10);
    solid(x - 1.2, x + 1.2, z - 2.6, z + 2.6); stander(x - 0.6, z - 0.5, -Math.PI / 2, { outfit: 0xff8fb1, task: 'talk' });
    spot(x - 2.2, z, 1.8, 'Ice-cream van', () => ctx.openShop?.('Mr Whippy (Grand Park)', [{ name: '99 Flake', icon: '🍦', price: 3, hunger: 8, energy: 6 }, { name: 'Lolly', icon: '🍭', price: 2, energy: 6 }, { name: 'Fan Ice', icon: '🍨', price: 2, energy: 8 }, { name: 'Cold water', icon: '💧', price: 1, energy: 4 }])); }
  // trees over the lawns (keeping clear of the lake, gardens, zoo and playground)
  { let s = 99; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 170; i++) { const x = P.x0 + 6 + r() * (P.x1 - P.x0 - 12), z = P.z0 + 6 + r() * (P.z1 - P.z0 - 12);
      if (inLake(x, z, 14) || (x > GARDEN.x0 - 3 && x < GARDEN.x1 + 3 && z > GARDEN.z0 - 3 && z < GARDEN.z1 + 3) || (x > ZOO.x0 - 3 && x < ZOO.x1 + 3 && z > ZOO.z0 - 3 && z < ZOO.z1 + 3) || (z > -936) || (Math.abs(x - 420) < 8) || Math.hypot(x - 380, z + 952) < 14) continue;
      tree(x, z, r() < 0.5 ? 'oak' : r() < 0.7 ? 'pine' : 'birch', 0.9 + r() * 0.6); }
    for (let x = P.x0 + 8; x < P.x1 - 4; x += 16) tree(x, P.z0 + 4, 'pine', 1.2);
  }
  // more visitors along the promenade
  family([[P.x0 + 10, -923], [P.x1 - 10, -923]], { kids: 2, speed: 1.0 });
  family([[P.x1 - 10, -923], [P.x0 + 10, -923]], { kids: 1, speed: 1.0, t: 90 });
  walker([[420, -915], [420, -965], [430, -968], [420, -915]], { speed: 1.2 });
  family([[420, -915], [420, -968], [410, -968], [420, -915]], { kids: 1, t: 40 });

  // ================= update =================
  let t = 0;
  function update(dt, p, night) {
    const near = p.x > P.x0 - 150 && p.x < P.x1 + 150 && p.z > P.z0 - 150 && p.z < P.z1 + 150;
    if (!near && !boatRide) return; t += dt;
    K.update(dt, p, 110);
    for (const b of boats) { b.t += dt / 60; const q = boatPos(b.t); b.g.position.set(q.x, 0.05 + Math.sin(t * 2 + b.t * 9) * 0.04, q.z); b.g.rotation.y = q.yaw; }
    if (boatRide) { boatRide.until -= dt; if (!ctx.isSeated(boatRide.sp)) boatRide = null; else if (boatRide.until <= 0) { ctx.unseat(boatRide.sp); toast('🦢 Back at the jetty. Lovely.'); stats.energy = Math.min(100, stats.energy + 6); boatRide = null; } }
    for (const s of swings) { s.piv.rotation.z = Math.sin(t * 1.8 + s.ph) * (s.kid ? 0.55 : 0.08); if (s.kid) ctx.pose?.(s.kid, 'sit', dt); }
    if (round.see) round.see.rotation.z = Math.sin(t * 1.4) * 0.22; if (round.g) round.g.rotation.y += dt * 1.2;
    for (const l of lamps) l.material.emissiveIntensity = night ? 2.2 : 0.15;
    if (ctx.lakeWater) ctx.lakeWater.material.emissiveIntensity = 0.3 + Math.sin(t * 0.7) * 0.05;
  }
  return { update, boats, kit: K };
}
