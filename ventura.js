// Ventura: a big family fun centre on the leisure strip, inspired by The Ventura Mall in Ibadan.
//   Inside: a bowling alley, a trampoline park, an arcade, a kids' soft play, a food court
//   (jollof, suya, shawarma, small chops, smoothies) and a karaoke lounge.
//   Outside: the Fountain Park, a plaza with a musical fountain that dances in colours at night and
//   a splash pad for the kids; and Ventura Karting, a go-kart circuit you race on against other karts.
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export const VENTURA = { x0: 486, x1: 576, z0: -905, z1: -845, door: [523, 539], H: 10 };
export const FOUNTAIN = { x: 531, z: -818, r: 9, plaza: [481, 586, -842, -793] };
export const KARTS = { box: [600, 740, -1000, -905], price: 6, laps: 3 };
const KART_PTS = [[624, -916], [700, -916], [724, -926], [730, -948], [722, -970], [724, -985], [708, -993], [684, -991], [668, -980], [656, -966], [640, -971], [624, -987], [610, -979], [606, -958], [610, -936], [614, -922]];

export function buildVentura(ctx) {
  const K = makeKit(ctx), { B, C, S, mat, solid, sign, place, spot, stander, sitter, hall, circle } = K;
  const { scene, makeTex, toast, stats, sports, games } = ctx, V = VENTURA, root = new THREE.Group(); scene.add(root);
  const play = (x, z, id, o) => spot(x, z, 1.8, () => sports?.label(id, o) || id, () => sports?.menu(id, o));
  const neon = c => mat(c, { emissive: c, ei: 1.8 });

  // ================= the building =================
  hall({ x0: V.x0, x1: V.x1, z0: V.z0, z1: V.z1, H: V.H, wall: 0xf3efe6, floor: 0x3a3550, floorKind: 'tech', roof: 0x2b2f3a, gaps: { s: [V.door] } });
  { const z = V.z1 + 0.18, cx = (V.x0 + V.x1) / 2;
    // facade: coloured glass fins, a huge VENTURA sign, a canopy over the doors
    for (let i = 0; i < 14; i++) B(root, 0.4, V.H, 0.5, V.x0 + 3 + i * 6.5, V.H / 2, z + 0.1, [0xff6b35, 0xffd23f, 0x1fb5a8, 0x7b2cbf][i % 4]);
    const s = sign('VENTURA', 'fun · games · food · karting', 34, '#111827', '#ffd23f', 'sans-serif'); place(s, cx, V.H + 2.2, z + 0.4, 0);
    B(root, 34.6, 9, 0.3, cx, V.H + 2.2, z + 0.2, 0x111827);
    B(root, 22, 0.4, 6, (V.door[0] + V.door[1]) / 2, 4.2, z + 3, 0x111827); for (const sx of [-10.5, 10.5]) C(root, 0.15, 0.15, 4.2, (V.door[0] + V.door[1]) / 2 + sx, 2.1, z + 5.7, 0xd9dde2, 8);
    for (let i = 0; i <= 40; i++) { const b = S(root, 0.1, (V.door[0] + V.door[1]) / 2 - 11 + i * 0.55, 3.95, z + 5.95, neon([0xffd23f, 0xff2bd6, 0x22ff88][i % 3]), 6); b.castShadow = false; }
  }
  ctx.destinations?.push({ name: 'Ventura (fun centre)', x: 531, z: V.z1 + 8 }, { name: 'Ventura Fountain Park', x: FOUNTAIN.x, z: FOUNTAIN.z + 14 }, { name: 'Ventura Karting', x: 616, z: -905 });

  // ---------------- bowling: four lanes on the west side ----------------
  { const lanes = [491, 497.5, 504, 510.5], top = V.z0 + 1, foul = -868;
    B(root, 26, 0.12, foul - top, 501, 0.06, (top + foul) / 2, 0x2a2440);
    lanes.forEach((x, i) => {
      B(root, 1.8, 0.04, foul - top, x, 0.14, (top + foul) / 2, mat(0xd9b07a, { rough: 0.25 }), false);
      for (const s of [-1, 1]) B(root, 0.3, 0.02, foul - top, x + s * 1.05, 0.1, (top + foul) / 2, 0x333333, false);
      for (let r = 0; r < 4; r++) for (let k = 0; k <= r; k++) { const p = C(root, 0.06, 0.06, 0.38, x + (k - r / 2) * 0.3, 0.33, top + 1.2 + r * 0.26, 0xffffff, 8); p.castShadow = false; }
      B(root, 2.4, 1.2, 0.2, x, 4.8, foul - 0.5, mat(0x111111)); const scr = B(root, 2.1, 0.9, 0.02, x, 4.8, foul - 0.39, neon(0x1fb5a8)); scr.material = mat(0x0b3a4a, { emissive: 0x1fb5a8, ei: 0.5 });
      B(root, 0.6, 0.6, 1.4, x + 3.25, 0.3, foul + 2, 0x3a3a46);   // ball return
      for (let b = 0; b < 3; b++) S(root, 0.11, x + 3.25, 0.7, foul + 1.6 + b * 0.3, [0xff3b30, 0x1f6fd1, 0x22c55e][b], 10);
    });
    solid(V.x0, 515, V.z0, foul);
    for (let i = 0; i < 4; i++) B(root, 6, 0.06, 0.06, 501, 0.4 + i * 0.002, foul + 0.01, 0xff2bd6, false);
    { const s = sign('VENTURA BOWL', 'four lanes · bowl against anyone', 12, '#111827', '#ff2bd6', 'sans-serif'); place(s, 501, 7.2, foul - 0.6, 0); }
    const bowlers = [{ name: 'Seun', skill: 0.55, prize: 4 }, { name: 'Zainab', skill: 0.75, prize: 6 }, { name: 'Coach Ade', skill: 0.92, prize: 10 }, null];
    lanes.forEach((x, i) => { if (bowlers[i]) { stander(x + 1.6, foul + 3.2, Math.PI, { task: 'talk' }); play(x, foul + 2.2, 'bowling', bowlers[i]); } else { stander(x, foul + 1.2, Math.PI, { task: 'swing' }); stander(x + 1.6, foul + 3, Math.PI, { task: 'cheer', child: true }); } });
    for (let k = 0; k < 4; k++) { B(root, 2.4, 0.45, 0.8, 491 + k * 6.5, 0.22, foul + 6.4, 0x7b2cbf); }
    sitter(492, foul + 6.4, Math.PI, 0.45, { task: 'talk' }); sitter(498, foul + 6.4, Math.PI, 0.45, { task: 'eat' }); sitter(504.6, foul + 6.4, Math.PI, 0.45, { child: true });
  }

  // ---------------- trampoline park (north middle) ----------------
  { const x0 = 518, x1 = 546, z0 = V.z0 + 1, z1 = -882;
    B(root, x1 - x0, 0.6, z1 - z0, (x0 + x1) / 2, 0.3, (z0 + z1) / 2, 0x1f6fd1);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const x = x0 + 3.5 + i * 7, z = z0 + 3.5 + k * 7; B(root, 5.6, 0.05, 5.6, x, 0.62, z, 0x111111, false); for (const [w, d, dx, dz] of [[6.4, 0.4, 0, -3], [6.4, 0.4, 0, 3], [0.4, 6.4, -3, 0], [0.4, 6.4, 3, 0]]) B(root, w, 0.12, d, x + dx, 0.66, z + dz, 0xffd23f, false); }
    for (const [x, z, child] of [[521.5, -900.5, true], [535.5, -893.5, true], [528.5, -886.5, false], [542.5, -900.5, true], [521.5, -886.5, true]]) stander(x, z, Math.random() * 6, { child, task: 'bounce', y: 0.65 });
    solid(x0, x1, z0, z1 - 1.2);
    { const s = sign('JUMP ZONE', 'trampoline park', 10, '#1f6fd1', '#ffffff', 'sans-serif'); place(s, (x0 + x1) / 2, 6.5, z1 + 0.05, 0); }
    let bounceT = 0;
    spot((x0 + x1) / 2, z1 + 0.6, 2.2, 'Bounce on the trampolines (4 gold)', () => {
      if (stats.gold < 4) return toast('The Jump Zone is 4 gold.'); stats.gold -= 4; bounceT = 0;
      const sp = { x: 528.5, z: -893.5, seatY: 1.6, yaw: Math.PI, label: 'Jump Zone', follow: () => { bounceT += 1 / 60; const y = 1.6 + Math.abs(Math.sin(bounceT * 2.7)) * 2.6; return { x: 528.5, y, z: -893.5, yaw: Math.PI + bounceT * 0.4 }; } };
      ctx.seat(sp); toast('🤸 Boing! Boing! Up you go! (Press E to stop.)'); stats.energy = Math.max(0, stats.energy - 4); ctx.gainXp?.(3);
      setTimeout(() => { if (ctx.isSeated(sp)) { ctx.unseat(sp); toast('🤸 Puffed out! That was brilliant.'); } }, 20000);
    });
  }

  // ---------------- arcade (middle) ----------------
  { const glow = [0xff2bd6, 0x00e5ff, 0x22ff88, 0xffd23f, 0xff5a3c, 0x8a5cff];
    const machine = (x, z, ry, k, label, act) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 1.0, 2.0, 0.9, 0, 1.0, 0, 0x15151c); B(g, 0.8, 0.6, 0.02, 0, 1.45, 0.46, neon(glow[k % 6])); B(g, 1.0, 0.25, 0.3, 0, 2.1, 0.35, neon(glow[(k + 2) % 6])); B(g, 0.9, 0.08, 0.4, 0, 1.0, 0.55, 0x2b2b33);
      solid(x - 0.55, x + 0.55, z - 0.55, z + 0.55); if (label) spot(x + Math.sin(ry) * 1.3, z + Math.cos(ry) * 1.3, 1.1, label, act); };
    const list = [['Play the claw crane (2 gold)', () => games?.open('claw')], ['Play the coin pusher (1 gold)', () => games?.open('pusher')], ['Bop-a-mole (2 gold)', () => games?.open('molebop')], ['Dance machine (2 gold)', () => games?.open('dance')], ['Peg drop (1 gold)', () => games?.open('pegdrop')], ['Hoop Fever basketball', () => sports?.menu('basketball', { name: 'the high score', skill: 0.6, prize: 3 })],
      ['VR: zombie shooter (3 gold)', () => games?.open({ id: 'vrzombie', name: 'VR Zombie Shooter', where: 'Arcade', icon: '🧟', price: 3, kind: 'aim', time: 14, need: 9, pop: 0.75, how: 'Headset on. The dead are coming out of the walls. Tap them before they reach you!' })],
      ['Racing simulator (3 gold)', () => games?.open({ id: 'racesim', name: 'Turbo Racing simulator', where: 'Arcade', icon: '🏎️', price: 3, kind: 'timing', zone: 0.14, speed: 2.2, tries: 8, need: 6, how: 'Hit each apex: stop the marker in the green to take the corner flat out.' })]];
    let k = 0;
    for (let i = 0; i < 6; i++) machine(520 + i * 2.2, -878, Math.PI, k++, list[i % list.length][0], list[i % list.length][1]);
    for (let i = 0; i < 6; i++) machine(520 + i * 2.2, -872.5, 0, k++, list[(i + 6) % list.length][0], list[(i + 6) % list.length][1]);
    for (let i = 0; i < 4; i++) machine(520 + i * 2.2, -866, Math.PI, k++, null);
    // air hockey and table football
    for (const [x, id, o] of [[538, 'airhockey', { name: 'Kunle', skill: 0.65, prize: 3 }], [543, 'tabletop', { name: 'Tolu (age 10)', skill: 0.45, prize: 2 }]]) { B(root, 1.4, 0.85, 2.2, x, 0.43, -868, 0x1f4e8c); B(root, 1.2, 0.02, 2.0, x, 0.87, -868, neon(0x00e5ff), false); solid(x - 0.7, x + 0.7, -869.1, -866.9); stander(x, -869.7, 0, { child: id === 'tabletop', task: 'swing' }); play(x, -866.2, id, o); }
    for (const [x, z, ry, c] of [[521, -876.6, Math.PI, true], [526, -873.8, 0, false], [531, -876.6, Math.PI, true]]) stander(x, z, ry, { child: c, task: 'swing' });
    { const s = sign('ARCADE', '', 6, '#15151c', '#00e5ff', 'sans-serif'); place(s, 531, 5.5, -879.3, 0); }
  }
  // ---------------- kids' soft play (south-west, by the door) ----------------
  { const x0 = 488, x1 = 512, z0 = -862, z1 = -848;
    for (const [w, d, x, z] of [[x1 - x0, 0.2, (x0 + x1) / 2, z0], [x1 - x0, 0.2, (x0 + x1) / 2, z1], [0.2, z1 - z0, x0, (z0 + z1) / 2]]) B(root, w, 1.2, d, x, 0.6, z, mat(0x22c55e, { opacity: 0.6 }), false);
    solid(x0, x1, z0 - 0.1, z0 + 0.1); solid(x0, x1 - 3, z1 - 0.1, z1 + 0.1); solid(x0 - 0.1, x0 + 0.1, z0, z1);
    B(root, 8, 0.6, 6, 494, 0.3, -856, 0x1f6fd1); const ballGeo = new THREE.SphereGeometry(0.12, 6, 4); const bm = [0xff3b30, 0xffd23f, 0x22c55e, 0x3b82f6, 0xff2bd6].map(c => mat(c));
    const balls = new THREE.InstancedMesh(ballGeo, mat(0xffffff), 500), o = new THREE.Object3D(), col = new THREE.Color(); for (let i = 0; i < 500; i++) { o.position.set(490.3 + Math.random() * 7.4, 0.62 + Math.random() * 0.2, -858.7 + Math.random() * 5.4); o.updateMatrix(); balls.setMatrixAt(i, o.matrix); balls.setColorAt(i, col.set([0xff3b30, 0xffd23f, 0x22c55e, 0x3b82f6, 0xff2bd6][i % 5])); } root.add(balls); void bm;
    const slide = B(root, 1.2, 0.15, 6, 505, 1.5, -855, 0xff922b); slide.rotation.x = 0.45; B(root, 2, 3, 2, 505, 1.5, -859, 0xffd23f);
    for (const [x, z] of [[492, -856], [495, -854.5], [503, -851], [508, -853]]) stander(x, z, Math.random() * 6, { child: true, task: 'bounce', y: z > -853 ? 0.05 : 0.5 });
    { const s = sign('LITTLE EXPLORERS', 'soft play for under-10s', 7, '#22c55e', '#ffffff', 'sans-serif'); place(s, 500, 3.2, -848.1, 0); }
    spot(510.5, -849.5, 1.8, 'Little Explorers soft play', () => toast('🧸 "Sorry, soft play is for children under 10! Grown-ups can watch from the benches."'));
  }
  // ---------------- food court (east) ----------------
  { const stalls = [
      ['Mama Put', '🍛', 0xc0392b, [{ name: 'Jollof rice and chicken', icon: '🍛', price: 7, hunger: 40 }, { name: 'Fried rice and plantain (dodo)', icon: '🍚', price: 7, hunger: 38 }, { name: 'Ofada rice with ayamase', icon: '🌶️', price: 8, hunger: 42 }, { name: 'Moi moi', icon: '🫘', price: 3, hunger: 15 }]],
      ['Suya Spot', '🍢', 0x7a3e00, [{ name: 'Beef suya', icon: '🍢', price: 6, hunger: 28 }, { name: 'Chicken suya', icon: '🍗', price: 6, hunger: 26 }, { name: 'Kilishi', icon: '🥩', price: 5, hunger: 18 }]],
      ['Shawarma & Small Chops', '🌯', 0x16a085, [{ name: 'Chicken shawarma', icon: '🌯', price: 6, hunger: 32 }, { name: 'Small chops platter (puff-puff, samosa, spring rolls)', icon: '🥟', price: 6, hunger: 25 }, { name: 'Meat pie', icon: '🥧', price: 3, hunger: 15 }, { name: 'Puff-puff', icon: '🍩', price: 2, hunger: 10, energy: 4 }]],
      ['Pizza & Burgers', '🍕', 0xd35400, [{ name: 'Pepperoni pizza slice', icon: '🍕', price: 4, hunger: 20 }, { name: 'Burger and chips', icon: '🍔', price: 7, hunger: 36 }, { name: 'Chicken wings', icon: '🍗', price: 5, hunger: 22 }]],
      ['Smoothies & Ice cream', '🍦', 0xe84393, [{ name: 'Zobo', icon: '🍷', price: 2, energy: 10 }, { name: 'Chapman', icon: '🍹', price: 3, energy: 12 }, { name: 'Mango smoothie', icon: '🥭', price: 4, hunger: 8, energy: 14 }, { name: 'Ice-cream sundae', icon: '🍨', price: 4, hunger: 10, energy: 8 }]]];
    stalls.forEach(([name, icon, c, items], i) => { const z = V.z0 + 4 + i * 6.4, x = V.x1 - 1.6;
      B(root, 2.4, 1.1, 5, x - 1.4, 0.55, z, c); B(root, 2.6, 0.06, 5.2, x - 1.4, 1.13, z, 0xe8e2d6); B(root, 0.3, 4, 5.6, x + 0.6, 2, z, c);
      const s = sign(`${icon} ${name.toUpperCase()}`, '', 5.4, '#111827', '#ffd23f', 'sans-serif'); place(s, x + 0.4, 4.6, z, -Math.PI / 2);
      solid(x - 2.7, x + 0.8, z - 2.6, z + 2.6); stander(x - 0.1, z, -Math.PI / 2, { task: 'cook', outfit: 0xffffff });
      spot(x - 3.6, z, 1.8, `${icon} ${name}`, () => ctx.openShop?.(`${name} (Ventura food court)`, items)); });
    // tables with diners
    for (let i = 0; i < 6; i++) { const x = 556 + (i % 2) * 7, z = -899 + Math.floor(i / 2) * 9; C(root, 0.7, 0.7, 0.05, x, 0.75, z, 0xf4f1ea, 16); C(root, 0.06, 0.06, 0.75, x, 0.37, z, 0x444444, 6); circle(x, z, 0.75);
      for (const [dx, dz, ry] of [[0, -1.1, 0], [0, 1.1, Math.PI], [1.1, 0, -Math.PI / 2]]) { B(root, 0.45, 0.45, 0.45, x + dx, 0.22, z + dz, 0xff6b35); if ((i + dx + dz) % 3 !== 1 || i % 2) sitter(x + dx, z + dz, ry, 0.47, { child: i === 2 && dz > 0, task: i % 2 ? 'eat' : 'talk' }); else ctx.sitSpots?.push({ x: x + dx, z: z + dz, yaw: ry, seatY: 0.47, label: 'Sit at the table' }); } }
  }
  // ---------------- karaoke lounge (south-east) ----------------
  { const x = 562, z = -856;
    B(root, 9, 0.5, 4, x, 0.25, z - 3.5, 0x2b0f4a); C(root, 0.02, 0.02, 1.5, x, 1.25, z - 3.5, 0x888888, 5); S(root, 0.07, x, 2.0, z - 3.5, 0x222222, 8);
    B(root, 3.2, 1.8, 0.1, x, 2.6, z - 5.3, mat(0x101030, { emissive: 0x3030a0, ei: 0.6 }));
    for (let i = 0; i < 9; i++) { const b = B(root, 0.12, 0.12, 0.12, x - 4.4 + i * 1.1, 4.6, z - 5.4, neon([0xff2bd6, 0x00e5ff, 0xffd23f][i % 3])); b.castShadow = false; }
    for (const [dx, ry] of [[-3, Math.PI], [0, Math.PI], [3, Math.PI]]) { B(root, 2.4, 0.45, 0.9, x + dx, 0.22, z + 2.6, 0x7b2cbf); B(root, 2.4, 0.6, 0.2, x + dx, 0.75, z + 3.0, 0x7b2cbf); void ry; }
    sitter(x - 3.4, z + 2.5, Math.PI, 0.47, { task: 'talk' }); sitter(x - 2.6, z + 2.5, Math.PI, 0.47, { task: 'talk' }); sitter(x + 0.5, z + 2.5, Math.PI, 0.47, { task: 'eat' }); stander(x + 1, z - 3.2, Math.PI, { task: 'dance', y: 0.5 });
    solid(x - 4.5, x + 4.5, z - 5.5, z - 1.5);
    { const s = sign('LATITUDE LOUNGE', 'karaoke every night', 8, '#2b0f4a', '#ff2bd6', 'Georgia, serif'); place(s, x, 5.6, z - 5.45, 0); }
    spot(x - 2, z - 0.8, 2.0, 'Sing karaoke (3 gold)', () => games?.open({ id: 'karaoke', name: 'Karaoke: Latitude Lounge', where: 'Arcade', icon: '🎤', price: 3, kind: 'timing', zone: 0.16, speed: 1.6, tries: 8, need: 5, how: 'Pick a song and sing along: stop the marker on the beat to hit each note. The crowd will tell you how you did!' }));
    spot(x + 3, z - 0.8, 1.6, 'Lounge bar: drinks', () => ctx.openShop?.('Latitude Lounge bar', [{ name: 'Chapman', icon: '🍹', price: 3, energy: 12 }, { name: 'Malt drink', icon: '🥤', price: 2, energy: 10 }, { name: 'Fresh juice', icon: '🧃', price: 3, energy: 10 }, { name: 'Peppered snail', icon: '🐌', price: 6, hunger: 18 }]));
  }
  // a few families wandering the hall
  K.family([[531, -842], [531, -858], [522, -862], [512, -864], [522, -864], [548, -862], [548, -880], [550, -862], [531, -858]], { kids: 2 });
  K.family([[531, -842], [520, -862], [540, -862], [531, -842]], { kids: 1, t: 30 });
  K.walker([[517, -880], [548, -880], [548, -864], [517, -864]], { speed: 1.0 });

  // ================= the Fountain Park =================
  const F = FOUNTAIN, [px0, px1, pz0, pz1] = F.plaza;
  { const pave = ctx.floorMaterial ? ctx.floorMaterial(makeTex, 'stone', 0xd8cbb0, px1 - px0, pz1 - pz0) : mat(0xd8cbb0);
    B(root, px1 - px0, 0.06, pz1 - pz0, (px0 + px1) / 2, 0.03, (pz0 + pz1) / 2, pave, false);
    for (const [x, z, w, d] of [[px0 + 3, (pz0 + pz1) / 2, 4, pz1 - pz0 - 6], [px1 - 3, (pz0 + pz1) / 2, 4, pz1 - pz0 - 6]]) { B(root, w, 0.35, d, x, 0.17, z, 0x7a5a3a); B(root, w - 0.4, 0.05, d - 0.4, x, 0.36, z, 0x3f7a3a, false); }
    // flower beds in the planters
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 4), mat(0xffffff), 900), o = new THREE.Object3D(), col = new THREE.Color(), cols = [0xff3b6b, 0xffd23f, 0xff922b, 0xc58fff, 0xffffff, 0xff5a8a];
    for (let i = 0; i < 900; i++) { const left = i % 2; o.position.set((left ? px0 + 3 : px1 - 3) + (Math.random() - 0.5) * 3.4, 0.45 + Math.random() * 0.08, pz0 + 3.5 + Math.random() * (pz1 - pz0 - 7)); o.updateMatrix(); fl.setMatrixAt(i, o.matrix); fl.setColorAt(i, col.set(cols[i % cols.length])); }
    root.add(fl); solid(px0 + 1, px0 + 5, pz0 + 3, pz1 - 3); solid(px1 - 5, px1 - 1, pz0 + 3, pz1 - 3);
    for (const [x, z] of [[px0 + 3, pz0 + 1.2], [px1 - 3, pz0 + 1.2], [px0 + 3, pz1 - 1.2], [px1 - 3, pz1 - 1.2], [500, -836], [562, -836], [500, -800], [562, -800]]) ctx.tree?.(x, z, 'palm', 1.1);
  }
  // the fountain: a basin, a tiered centrepiece, a ring of 24 jets and a tall centre jet, with spray
  const jets = [], jetMats = [];
  { const basin = C(root, F.r + 0.5, F.r + 0.7, 0.7, F.x, 0.35, F.z, 0xe8e2d6, 48); basin.receiveShadow = true;
    const water = new THREE.Mesh(new THREE.CircleGeometry(F.r, 48), new THREE.MeshStandardMaterial({ color: 0x3aa0d8, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.85, emissive: 0x0b4d70, emissiveIntensity: 0.4 })); water.rotation.x = -Math.PI / 2; water.position.set(F.x, 0.62, F.z); root.add(water);
    C(root, 0.6, 0.9, 2.0, F.x, 1.0, F.z, 0xe8e2d6, 16); C(root, 2.2, 1.4, 0.3, F.x, 2.0, F.z, 0xe8e2d6, 24); C(root, 0.35, 0.5, 1.5, F.x, 2.8, F.z, 0xe8e2d6, 12); C(root, 1.2, 0.8, 0.25, F.x, 3.5, F.z, 0xe8e2d6, 20);
    circle(F.x, F.z, F.r + 0.7);
    for (let i = 0; i < 25; i++) { const a = i / 24 * Math.PI * 2, r = i === 24 ? 0 : F.r - 1.4, m = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.55, emissive: 0x66ccff, emissiveIntensity: 0.2, depthWrite: false });
      const j = new THREE.Mesh(new THREE.CylinderGeometry(i === 24 ? 0.12 : 0.07, i === 24 ? 0.22 : 0.12, 1, 8, 1, true), m); j.position.set(F.x + Math.cos(a) * r, i === 24 ? 3.6 : 0.6, F.z + Math.sin(a) * r); root.add(j); jets.push({ j, base: j.position.y, i, a }); jetMats.push(m); }
  }
  const spray = (() => { const N = 700, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe6f6ff, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false })); pts.frustumCulled = false; root.add(pts);
    for (let i = 0; i < N; i++) age[i] = Math.random() * 2; return { N, pos, vel, age, g, pts }; })();
  // splash pad for the kids
  const pad = { x: 499, z: -808, r: 6, jets: [] };
  { const disc = new THREE.Mesh(new THREE.CircleGeometry(pad.r, 32), mat(0x3ab0e8, { rough: 0.3 })); disc.rotation.x = -Math.PI / 2; disc.position.set(pad.x, 0.07, pad.z); root.add(disc);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.3, r = 1.5 + (i % 3) * 1.4, j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.6, depthWrite: false })); j.position.set(pad.x + Math.cos(a) * r, 0.5, pad.z + Math.sin(a) * r); root.add(j); pad.jets.push({ j, ph: Math.random() * 6 }); }
    for (let k = 0; k < 5; k++) { const a = k * 1.3; K.walker([[pad.x + Math.cos(a) * 4, pad.z + Math.sin(a) * 4], [pad.x + Math.cos(a + 2) * 3, pad.z + Math.sin(a + 2) * 3], [pad.x + Math.cos(a + 4) * 4.5, pad.z + Math.sin(a + 4) * 4.5]], { child: true, speed: 1.6, t: k * 3 }); }
    for (const [x, z] of [[489, -808], [489, -804]]) { B(root, 2, 0.45, 0.6, x, 0.22, z, 0x5a3b26); } sitter(489, -808, Math.PI / 2, 0.45, { task: 'talk' }); sitter(489.2, -804, Math.PI / 2, 0.45, {});
    { const s = sign('SPLASH PAD', 'for kids', 4, '#3ab0e8', '#ffffff', 'sans-serif'); place(s, pad.x, 2.4, pad.z - pad.r - 0.6, 0); C(root, 0.06, 0.06, 2, pad.x, 1, pad.z - pad.r - 0.65, 0x444444, 6); }
  }
  // benches round the fountain, people enjoying the evening
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = F.r + 4.5, x = F.x + Math.cos(a) * r, z = F.z + Math.sin(a) * r; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -a - Math.PI / 2; root.add(g); B(g, 1.8, 0.08, 0.5, 0, 0.45, 0, 0x7a5636); B(g, 1.8, 0.4, 0.06, 0, 0.75, -0.22, 0x7a5636); B(g, 0.1, 0.45, 0.5, -0.8, 0.22, 0, 0x333333); B(g, 0.1, 0.45, 0.5, 0.8, 0.22, 0, 0x333333);
    if (i % 3 === 0) sitter(x, z, -a + Math.PI / 2, 0.47, { task: 'talk' }); else ctx.sitSpots?.push({ x, z, yaw: -a + Math.PI / 2, seatY: 0.47, label: 'Sit by the fountain' }); }
  K.family([[F.x, F.z + 13], [F.x + 13, F.z], [F.x, F.z - 13], [F.x - 13, F.z]], { kids: 2, speed: 0.9 });
  K.family([[F.x - 13, F.z], [F.x, F.z - 13], [F.x + 13, F.z], [F.x, F.z + 13]], { kids: 1, speed: 0.9, t: 20 });
  K.walker([[F.x, F.z + 13], [F.x + 13, F.z], [F.x, F.z - 13], [F.x - 13, F.z]], { speed: 1.3, t: 9 });
  K.walker([[540, -797], [575, -797], [575, -838], [531, -840], [531, -800]], { speed: 1.2 });
  // a drinks and ice-cream kiosk
  { const x = 568, z = -805; B(root, 3.4, 2.4, 2.4, x, 1.2, z, 0xff6b35); B(root, 3.8, 0.2, 3, x, 2.5, z, 0xffd23f); const s = sign('ZOBO · CHAPMAN · ICE CREAM', '', 3.4, '#ff6b35', '#ffffff', 'sans-serif'); place(s, x, 2.0, z - 1.22, Math.PI); solid(x - 1.7, x + 1.7, z - 1.2, z + 1.2); stander(x, z - 0.4, Math.PI, { task: 'talk' });
    spot(x, z - 2.4, 1.8, 'Fountain kiosk: drinks and ice cream', () => ctx.openShop?.('Fountain kiosk', [{ name: 'Zobo', icon: '🍷', price: 2, energy: 10 }, { name: 'Chapman', icon: '🍹', price: 3, energy: 12 }, { name: 'Ice-cream cone', icon: '🍦', price: 3, hunger: 8, energy: 5 }, { name: 'Fan Ice (vanilla)', icon: '🍨', price: 2, energy: 8 }, { name: 'Popcorn', icon: '🍿', price: 2, hunger: 8 }])); }
  // sign facing the boulevard
  { const s = sign('VENTURA FOUNTAIN PARK', 'the musical fountain dances every night', 12, '#111827', '#ffd23f', 'sans-serif'); place(s, F.x, 3.6, pz1 - 0.6, 0); for (const sx of [-5.6, 5.6]) C(root, 0.12, 0.12, 3.6, F.x + sx, 1.8, pz1 - 0.6, 0x333333, 8); }

  // ================= Ventura Karting =================
  const curve = new THREE.CatmullRomCurve3(KART_PTS.map(([x, z]) => new THREE.Vector3(x, 0.08, z)), true, 'centripetal');
  const N = 700, LEN = curve.getLength(), samp = curve.getSpacedPoints(N).slice(0, N), tan = [], rgt = [], curv = [], HW = 4.2, TOP = 17;
  for (let i = 0; i < N; i++) { const t = curve.getTangentAt(i / N); tan.push(t); rgt.push(new THREE.Vector3(-t.z, 0, t.x)); }
  for (let i = 0; i < N; i++) { const a = tan[i], b = tan[(i + 3) % N]; const cross = a.x * b.z - a.z * b.x, ang = Math.asin(Math.max(-1, Math.min(1, cross))); curv.push(ang / (3 * LEN / N)); }
  const vmax = curv.map(k => Math.min(TOP, Math.sqrt(9 / Math.max(1e-4, Math.abs(k)))));
  const look = vmax.map((_, i) => { let m = TOP; for (let j = 0; j < 25; j++) m = Math.min(m, vmax[(i + j) % N] + j * 0.25); return m; });
  { // the track: asphalt ribbon with kerbs, tyre walls, start line and a pit building
    const strip = (off0, off1, y, m) => { const pos = [], idx = []; for (let i = 0; i <= N; i++) { const k = i % N, p = samp[k], r = rgt[k]; pos.push(p.x + r.x * off0, y, p.z + r.z * off0, p.x + r.x * off1, y, p.z + r.z * off1); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m2 = new THREE.Mesh(g, m); m2.receiveShadow = true; root.add(m2); return m2; };
    const [bx0, bx1, bz0, bz1] = KARTS.box; B(root, bx1 - bx0, 0.04, bz1 - bz0, (bx0 + bx1) / 2, 0.02, (bz0 + bz1) / 2, 0x5f8a45, false);
    strip(-HW, HW, 0.07, mat(0x2b2e32, { rough: 0.95, side: THREE.DoubleSide }));
    const kerbT = makeTex(64, 8, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d0281f' : '#ffffff'; g.fillRect(i * 8, 0, 8, 8); } }); kerbT.wrapS = THREE.RepeatWrapping; kerbT.repeat.set(1, 1);
    strip(HW, HW + 0.8, 0.08, mat(0xd0281f, { side: THREE.DoubleSide })); strip(-HW - 0.8, -HW, 0.08, mat(0xffffff, { side: THREE.DoubleSide }));
    const tyreGeo = new THREE.TorusGeometry(0.32, 0.14, 6, 10); tyreGeo.rotateX(Math.PI / 2); const tyres = new THREE.InstancedMesh(tyreGeo, mat(0x1a1a1a, { rough: 0.9 }), Math.ceil(N / 2) * 2 * 2), o = new THREE.Object3D(); let n = 0;
    for (let i = 0; i < N; i += 2) for (const s of [-1, 1]) for (const y of [0.14, 0.42]) { const p = samp[i], r = rgt[i]; o.position.set(p.x + r.x * s * (HW + 1.5), y, p.z + r.z * s * (HW + 1.5)); o.updateMatrix(); tyres.setMatrixAt(n++, o.matrix); }
    tyres.count = n; root.add(tyres);
    // start line and gantry
    const p0 = samp[0], r0 = rgt[0]; const chk = makeTex(64, 16, g => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 4, j * 4, 4, 4); } });
    const lg = new THREE.Group(); lg.position.set(p0.x, 0.1, p0.z); lg.rotation.y = Math.atan2(tan[0].x, tan[0].z); root.add(lg); const line = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 1.2), new THREE.MeshBasicMaterial({ map: chk })); line.rotation.x = -Math.PI / 2; lg.add(line);
    for (const s of [-1, 1]) C(root, 0.15, 0.15, 5, p0.x + r0.x * s * (HW + 0.6), 2.5, p0.z + r0.z * s * (HW + 0.6), 0x222222, 8);
    const gs = sign('VENTURA KARTING', 'race the go-karts!', 9, '#111827', '#ffd23f', 'sans-serif'); gs.position.set(p0.x, 4.6, p0.z); gs.rotation.y = Math.atan2(tan[0].x, tan[0].z) + Math.PI; root.add(gs);
    // pit building and fence round the circuit
    B(root, 14, 4, 6, 612, 2, -905, 0x111827); { const s = sign('KART HIRE & PITS', 'arrive and drive', 8, '#ffd23f', '#111827', 'sans-serif'); place(s, 612, 3, -901.9, 0); } solid(605, 619, -908, -902);
    for (let i = 0; i < 5; i++) B(root, 1.2, 0.3, 1.8, 606 + i * 2.6, 0.15, -899.5, [0xd0281f, 0x1f6fd1, 0xffd23f, 0x22c55e, 0xff922b][i]);
    stander(616, -900.2, 0, { outfit: 0xffd23f, task: 'talk' });
    // a low safety fence round the whole venue (gap at the pits)
    const f = (x0, z0, x1, z1) => { B(root, Math.abs(x1 - x0) || 0.1, 1.2, Math.abs(z1 - z0) || 0.1, (x0 + x1) / 2, 0.6, (z0 + z1) / 2, mat(0x9aa3aa, { opacity: 0.4 }), false); solid(x0 - 0.05, x1 + 0.05, z0 - 0.05, z1 + 0.05); };
    f(622, -902, 740, -902); f(740, -1001, 740, -902); f(600, -1001, 740, -1001); f(600, -1001, 600, -910);
    for (let i = 0; i < 8; i++) stander(630 + i * 12, -900.5, Math.PI, { task: 'cheer', child: i % 3 === 0 });
  }
  // the karts: you and five rivals
  const makeKart = c => { const g = new THREE.Group(); root.add(g); B(g, 1.2, 0.25, 1.9, 0, 0.28, 0, c); B(g, 1.0, 0.35, 0.6, 0, 0.5, -0.45, 0x222222); B(g, 1.3, 0.12, 0.3, 0, 0.3, 0.95, c);
    for (const [x, z] of [[-0.62, 0.62], [0.62, 0.62], [-0.65, -0.62], [0.65, -0.62]]) { const w = C(g, 0.2, 0.2, 0.22, x, 0.2, z, 0x111111, 10); w.rotation.z = Math.PI / 2; }
    C(g, 0.13, 0.13, 0.05, 0, 0.75, 0.2, 0x333333, 10).rotation.x = -1.1; return g; };
  const RIV = ['Tobi', 'Kemi', 'Musa', 'Ada', 'Leo'], rcol = [0x1f6fd1, 0xffd23f, 0x22c55e, 0xff922b, 0x7b2cbf];
  const rivals = RIV.map((name, i) => { const g = makeKart(rcol[i]); const helmet = S(g, 0.22, 0, 1.0, -0.2, [0xffffff, 0xd0281f, 0x111111, 0x1f6fd1, 0xffd23f][i], 10); B(g, 0.45, 0.45, 0.3, 0, 0.75, -0.25, rcol[i]); void helmet; return { name, g, s: -6 - i * 4, d: (i % 2 ? 1.5 : -1.5), v: 0, skill: 0.95 + i * 0.012, lap: 0, done: false }; });
  const me = { g: makeKart(0xd0281f), s: 0, d: 0, v: 0, lap: 0, racing: false, spot: null, cd: 0, finished: false };
  const at = (s, d) => { const u = ((s % LEN) + LEN) % LEN, i = Math.floor(u / LEN * N) % N, f = u / LEN * N - Math.floor(u / LEN * N), j = (i + 1) % N; const x = samp[i].x + (samp[j].x - samp[i].x) * f + rgt[i].x * d, z = samp[i].z + (samp[j].z - samp[i].z) * f + rgt[i].z * d; return { x, z, i, yaw: Math.atan2(tan[i].x, tan[i].z) }; };
  const place3 = (k, steer = 0) => { const p = at(k.s, k.d); k.g.position.set(p.x, 0.05, p.z); k.g.rotation.y = p.yaw + steer * 0.25; return p; };
  const grid = () => { rivals.forEach((r, i) => { r.s = -6 - i * 4; r.d = i % 2 ? 1.6 : -1.6; r.v = 0; r.lap = 0; r.done = false; place3(r); }); me.s = -2 - rivals.length * 4 - 2; me.d = 0; me.v = 0; me.lap = 0; place3(me); };
  grid();
  const hud = document.createElement('div'); hud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:40;background:#111827dd;color:#ffd23f;font:700 16px system-ui,sans-serif;padding:8px 14px;border-radius:12px;display:none;text-align:center'; document.body.append(hud);
  const progress = k => k.lap * LEN + k.s;
  spot(620, -903.5, 2.0, () => me.racing ? 'Ventura Karting' : `Race at Ventura Karting: ${KARTS.laps} laps against 5 karts (${KARTS.price} gold)`, () => {
    if (me.racing) return; if (stats.gold < KARTS.price) return toast(`A kart race is ${KARTS.price} gold.`); stats.gold -= KARTS.price;
    grid(); me.racing = true; me.cd = 3.5; me.finished = false;
    me.spot = { x: me.g.position.x, z: me.g.position.z, seatY: 0.75, yaw: me.g.rotation.y, label: 'Go-kart', follow: () => ({ x: me.g.position.x, y: 0.72, z: me.g.position.z, yaw: me.g.rotation.y }) };
    ctx.seat(me.spot); toast('🏎️ Helmet on! W to accelerate, S to brake, A/D to steer. Press E to retire.'); hud.style.display = 'block';
  });
  let kartClock = 0;
  function kartTick(dt) {
    kartClock += dt;
    const running = me.racing && me.cd <= 0;
    if (me.racing) {
      if (!ctx.isSeated(me.spot)) { me.racing = false; hud.style.display = 'none'; toast('You climb out of the kart.'); grid(); return; }
      if (me.cd > 0) { const before = Math.ceil(me.cd); me.cd -= dt; const after = Math.ceil(me.cd); if (after !== before) toast(after > 0 ? `🚦 ${after}...` : '🟢 GO GO GO!'); }
      else if (!me.finished) {
        const inp = ctx.input?.() || {}, thr = inp.forward || 0, brk = inp.back || 0, steer = (inp.right || 0) - (inp.left || 0);
        me.v += (thr * 7.5 - brk * 15 - me.v * 0.12 - (thr ? 0 : 2)) * dt; me.v = Math.max(0, Math.min(TOP, me.v));
        const p = at(me.s, me.d), k = curv[p.i], over = me.v - vmax[p.i];
        me.d += steer * Math.min(me.v, 9) * 0.5 * dt;
        if (over > 0) { me.d += -Math.sign(k) * over * 0.9 * dt; me.v -= over * 1.5 * dt; }   // too fast for the bend: you slide wide
        if (Math.abs(me.d) > HW - 0.7) { me.d = Math.sign(me.d) * (HW - 0.7); if (me.v > 6) { me.v *= 0.6; if (kartClock - (me.bump || 0) > 1.5) { me.bump = kartClock; toast('💥 Into the tyre wall!'); } } }
        me.s += me.v * dt; if (me.s >= LEN) { me.s -= LEN; me.lap++; if (me.lap >= KARTS.laps) { me.finished = true; const pos = 1 + rivals.filter(r => r.done).length; const pts = [25, 12, 8, 4, 2, 1][pos - 1]; stats.gold += pts; ctx.gainXp?.(pos === 1 ? 20 : 8); toast(pos === 1 ? `🏆 YOU WIN the Ventura Grand Prix! +${pts} gold` : `🏁 You finish P${pos}. +${pts} gold`); setTimeout(() => { if (ctx.isSeated(me.spot)) ctx.unseat(me.spot); }, 4000); } else toast(`Lap ${me.lap + 1} of ${KARTS.laps}`); }
        place3(me, steer);
      }
      const all = [{ me: true, p: progress(me) }, ...rivals.map(r => ({ p: progress(r) }))].sort((a, b) => b.p - a.p), pos = all.findIndex(o => o.me) + 1;
      hud.textContent = me.cd > 0 ? `🚦 ${Math.ceil(me.cd)}` : me.finished ? '🏁 Finished!' : `Lap ${Math.min(me.lap + 1, KARTS.laps)}/${KARTS.laps} · P${pos} of 6 · ${Math.round(me.v * 3.6)} km/h`;
    }
    // the rivals drive the racing line; when you're not racing they keep lapping for fun
    for (const r of rivals) {
      if (me.racing && me.cd > 0) { place3(r); continue; }
      const p = at(r.s, r.d), target = look[p.i] * r.skill * (running ? 1 : 0.8);
      r.v += Math.max(-12, Math.min(6, (target - r.v) * 2)) * dt; r.s += r.v * dt;
      r.d += (Math.sin(kartClock * 0.3 + r.skill * 20) * 2.2 - r.d) * dt * 0.5;
      if (r.s >= LEN) { r.s -= LEN; r.lap++; if (running && r.lap >= KARTS.laps) r.done = true; }
      place3(r);
    }
    if (!me.racing) place3(me);
  }

  // ================= update =================
  let t = 0;
  function update(dt, p, night) {
    const near = Math.abs(p.x - 600) < 260 && Math.abs(p.z + 880) < 220;
    if (!near && !me.racing) return;
    t += dt; K.update(dt, p, 90); kartTick(dt);
    // the musical fountain: jets rise and fall in patterns; at night they dance in colour
    const show = Math.floor(t / 20) % 4;
    for (const o of jets) { const h = o.i === 24 ? 6 + Math.sin(t * 1.3) * 2.5 : show === 0 ? 2.5 + Math.sin(t * 2 + o.a * 2) * 1.5 : show === 1 ? (Math.sin(t * 3 - o.a * 3) > 0 ? 4 : 0.6) : show === 2 ? 1.5 + Math.abs(Math.sin(t * 1.5 + o.i * 0.5)) * 3 : 3 + Math.sin(t * 4) * 1;
      o.j.scale.y = Math.max(0.3, h); o.j.position.y = o.base + o.j.scale.y / 2; }
    const hue = (t * 0.08) % 1; jetMats.forEach((m, i) => { if (night) { m.emissive.setHSL((hue + i / 25) % 1, 0.9, 0.5); m.emissiveIntensity = 1.6; } else { m.emissive.setHex(0x66ccff); m.emissiveIntensity = 0.2; } });
    // spray droplets falling back from the centre jet and the ring
    { const s = spray, P = s.pos, Vv = s.vel; for (let i = 0; i < s.N; i++) { s.age[i] -= dt; if (s.age[i] <= 0) { const o = jets[i % 25], top = o.j.position.y + o.j.scale.y / 2; P[i * 3] = o.j.position.x; P[i * 3 + 1] = top; P[i * 3 + 2] = o.j.position.z; const a = Math.random() * Math.PI * 2, sp = o.i === 24 ? 1.8 : 0.6; Vv[i * 3] = Math.cos(a) * sp; Vv[i * 3 + 1] = 0.5 + Math.random(); Vv[i * 3 + 2] = Math.sin(a) * sp; s.age[i] = 1.2 + Math.random() * 0.6; } else { Vv[i * 3 + 1] -= 9.8 * dt; P[i * 3] += Vv[i * 3] * dt; P[i * 3 + 1] = Math.max(0.62, P[i * 3 + 1] + Vv[i * 3 + 1] * dt); P[i * 3 + 2] += Vv[i * 3 + 2] * dt; } } s.g.attributes.position.needsUpdate = true;
      s.pts.material.color.setHSL(night ? hue : 0.55, night ? 0.8 : 0.2, night ? 0.7 : 0.95); }
    for (const o of pad.jets) { const h = Math.max(0, Math.sin(t * 2.2 + o.ph)) * 2.2; o.j.visible = h > 0.1; o.j.scale.y = Math.max(0.1, h); o.j.position.y = h / 2 + 0.07; }
  }
  return { update, kart: { me, rivals, LEN, curve }, kit: K };
}
