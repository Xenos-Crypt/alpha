// Westhaven Recreation Centre: an indoor sports hall north of the boulevard, next to the
// outdoor courts. Play anyone you find here (or an online player in your room):
//   three badminton courts, four table-tennis tables, a volleyball court, a glass-backed squash
//   court, a climbing wall, a boxing ring, and a lounge with darts, pool, table football and Ayo.
// There's also a gym (work out for XP), a reception desk and a vending machine.
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export const REC = { x0: 255, x1: 365, z0: -895, z1: -835, door: [304, 316], H: 9 };

export function buildRecCentre(ctx) {
  const K = makeKit(ctx), { B, C, mat, solid, sign, place, spot, stander, sitter, hall } = K;
  const { makeTex, sports, toast, stats } = ctx, R = REC, root = new THREE.Group(); ctx.scene.add(root);
  hall({ x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z1, H: R.H, wall: 0xdfe4ea, floor: 0xc49a6c, floorKind: 'parquet', roof: 0x3d4650, gaps: { s: [R.door] } });
  // outside: a big sign, coloured bands and an entrance canopy
  { const s = sign('WESTHAVEN RECREATION CENTRE', 'badminton · table tennis · squash · volleyball · climbing · boxing · gym', 30, '#0d5c46', '#ffffff', 'sans-serif'); place(s, (R.x0 + R.x1) / 2, R.H - 1.6, R.z1 + 0.17, 0);
    for (const [y, c] of [[2.6, 0x0d5c46], [3.0, 0xf2c14e]]) B(root, R.x1 - R.x0, 0.3, 0.05, (R.x0 + R.x1) / 2, y, R.z1 + 0.17, c);
    B(root, 16, 0.3, 4, 310, 3.6, R.z1 + 2, 0x0d5c46); for (const sx of [-7.5, 7.5]) C(root, 0.12, 0.12, 3.6, 310 + sx, 1.8, R.z1 + 3.8, 0xd9dde2, 8); }
  ctx.destinations?.push({ name: 'Westhaven Recreation Centre', x: 310, z: R.z1 + 6 });
  // textures for the courts
  const courtTex = (bg, lines, w, h, draw) => makeTex(256, Math.round(256 * h / w), g => { g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.strokeStyle = lines; g.lineWidth = 3; draw(g, 256, Math.round(256 * h / w)); });
  const flat = (w, d, x, z, tex, y = 0.07) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); root.add(m); return m; };
  const opp = (name, skill, prize) => ({ name, skill, prize });
  const play = (x, z, id, o) => spot(x, z, 1.8, () => sports?.label(id, o) || `Play ${id}`, () => sports?.menu(id, o));

  // ---------------- badminton x3 ----------------
  const badTex = courtTex('#2f7d5a', '#ffffff', 6.1, 13.4, (g, w, h) => { g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(w / 2, 3); g.lineTo(w / 2, h - 3); g.moveTo(3, h / 2 - 25); g.lineTo(w - 3, h / 2 - 25); g.moveTo(3, h / 2 + 25); g.lineTo(w - 3, h / 2 + 25); g.stroke(); g.strokeRect(20, 3, w - 40, h - 6); });
  const badOpp = [opp('Amaka', 0.6, 4), opp('Tunde', 0.8, 6), null];
  [265, 276, 287].forEach((x, i) => { const z = -870;
    flat(6.1, 13.4, x, z, badTex);
    for (const sx of [-1, 1]) C(root, 0.04, 0.04, 1.55, x + sx * 3.2, 0.78, z, 0x444444, 6);
    B(root, 6.3, 0.7, 0.02, x, 1.2, z, mat(0xffffff, { opacity: 0.5 }), false); B(root, 6.3, 0.05, 0.03, x, 1.55, z, 0xffffff, false);
    if (badOpp[i]) { stander(x, z - 4.5, 0, { task: 'swing' }); play(x, z + 7.6, 'badminton', badOpp[i]); }
    else { stander(x, z - 4.5, 0, { task: 'swing' }); stander(x + 0.5, z + 4.5, Math.PI, { task: 'swing' }); }
    solid(x - 3.3, x + 3.3, z - 0.05, z + 0.05);   // the net
  });
  // ---------------- table tennis x4 ----------------
  const ttOpp = [opp('Chidi', 0.7, 4), opp('Bisi', 0.45, 3), null, null];
  [[300, -885], [314, -885], [300, -874], [314, -874]].forEach(([x, z], i) => {
    B(root, 2.74, 0.05, 1.525, x, 0.76, z, 0x1f4e8c); B(root, 0.02, 0.15, 1.6, x, 0.86, z, 0xffffff, false); B(root, 2.74, 0.006, 0.02, x, 0.79, z, 0xffffff, false);
    for (const [lx, lz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) B(root, 0.06, 0.74, 0.06, x + lx, 0.37, z + lz, 0x222222, false);
    solid(x - 1.4, x + 1.4, z - 0.8, z + 0.8);
    stander(x + 2.1, z, -Math.PI / 2, { task: 'swing' });
    if (ttOpp[i]) play(x - 2.3, z, 'tabletennis', ttOpp[i]); else stander(x - 2.1, z + 0.2, Math.PI / 2, { task: 'swing' });
  });
  // ---------------- volleyball ----------------
  { const x = 313, z = -858;
    flat(18, 9, x, z, courtTex('#d9823b', '#ffffff', 18, 9, (g, w, h) => { g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(w / 2, 3); g.lineTo(w / 2, h - 3); g.moveTo(w / 2 - 40, 3); g.lineTo(w / 2 - 40, h - 3); g.moveTo(w / 2 + 40, 3); g.lineTo(w / 2 + 40, h - 3); g.stroke(); }));
    for (const sz of [-1, 1]) C(root, 0.05, 0.05, 2.5, x, 1.25, z + sz * 5, 0x444444, 6);
    B(root, 0.02, 1.0, 10, x, 1.95, z, mat(0xffffff, { opacity: 0.5 }), false); solid(x - 0.05, x + 0.05, z - 5, z + 5);
    for (const [dx, dz] of [[3, -2.5], [3, 2.5], [6.5, 0]]) stander(x + dx, z + dz, -Math.PI / 2, { task: 'swing' });
    for (const [dx, dz] of [[-3, 2.5], [-6.5, -2]]) stander(x + dx, z + dz, Math.PI / 2, { task: 'swing' });
    play(x - 10.5, z, 'volleyball', opp('Ngozi\'s team', 0.65, 5));
  }
  // ---------------- squash court ----------------
  { const x0 = 338, x1 = 362, z0 = -894, z1 = -874, x = (x0 + x1) / 2;
    flat(x1 - x0, z1 - z0, x, (z0 + z1) / 2, courtTex('#d9b98a', '#c0392b', 24, 20, (g, w, h) => { g.beginPath(); g.moveTo(3, h * 0.55); g.lineTo(w - 3, h * 0.55); g.moveTo(w / 2, h * 0.55); g.lineTo(w / 2, h - 3); g.stroke(); g.strokeRect(3, h * 0.55, 40, 40); g.strokeRect(w - 43, h * 0.55, 40, 40); }));
    for (const xx of [x0, x1]) { B(root, 0.2, 5, z1 - z0, xx, 2.5, (z0 + z1) / 2, 0xf4f4f0); solid(xx - 0.1, xx + 0.1, z0, z1); }
    B(root, x1 - x0, 3, 0.05, x, 1.5, z1, mat(0xbfe6ff, { opacity: 0.3 }), false); B(root, x1 - x0, 0.05, 0.08, x, 4.6, z0 + 0.35, 0xc0392b, false);
    solid(x0, x - 1, z1 - 0.05, z1 + 0.05); solid(x + 1, x1, z1 - 0.05, z1 + 0.05);   // glass back wall with a door gap
    stander(x + 2, z0 + 8, Math.PI, { task: 'swing' }); play(x, z1 + 1.5, 'squash', opp('Yusuf', 0.85, 6));
  }
  // ---------------- climbing wall ----------------
  { const x0 = 296, x1 = 330, z = R.z0 + 0.35;
    B(root, x1 - x0, 8.4, 0.3, (x0 + x1) / 2, 4.3, z, 0x7a8aa0);
    const hold = new THREE.SphereGeometry(0.13, 6, 4); const cols = [0xff3b30, 0xffd23f, 0x22c55e, 0x3b82f6, 0xff2bd6, 0xff922b];
    for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(hold, mat(cols[i % 6])); m.position.set(x0 + 0.5 + ((i * 37) % 330) / 10, 0.4 + ((i * 53) % 790) / 100, z + 0.2); m.scale.set(1, 0.8, 0.6); root.add(m); }
    for (let k = 0; k < 4; k++) B(root, 0.04, 8.2, 0.02, x0 + 5 + k * 8, 4.2, z + 0.3, 0xffffff, false);   // top ropes
    for (const [xx, y] of [[304, 3.2], [321, 5.4]]) stander(xx, z + 0.6, Math.PI, { task: 'swing', y });
    B(root, x1 - x0, 0.3, 3, (x0 + x1) / 2, 0.15, z + 1.7, 0x2b4a7a);   // crash mats
    play(313, z + 4, 'climbing', opp('Halima', 0.7, 5));
  }
  // ---------------- boxing ring ----------------
  { const x = 350, z = -857;
    B(root, 6.4, 1.0, 6.4, x, 0.5, z, 0x1f2a44); B(root, 6, 0.06, 6, x, 1.03, z, 0xe8e2d6, false);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C(root, 0.08, 0.08, 1.6, x + sx * 3, 1.8, z + sz * 3, [0xc0392b, 0x2980b9][(sx + sz + 2) / 2 % 2], 8);
    for (const y of [1.45, 1.85, 2.25]) for (const [w, d, dx, dz] of [[6, 0.04, 0, -3], [6, 0.04, 0, 3], [0.04, 6, -3, 0], [0.04, 6, 3, 0]]) B(root, w, 0.04, d, x + dx, y, z + dz, 0xf2f2f2, false);
    solid(x - 3.2, x + 3.2, z - 3.2, z + 3.2);
    stander(x + 0.8, z - 0.5, -Math.PI / 2, { task: 'swing', y: 1.05 }); stander(x - 0.8, z + 0.5, Math.PI / 2, { task: 'swing', y: 1.05 });
    play(x, z + 4.4, 'boxing', opp('Emeka', 0.85, 8));
  }
  // ---------------- gym ----------------
  { for (let i = 0; i < 4; i++) { const x = 338 + i * 2.2, z = -846; B(root, 0.8, 0.25, 1.9, x, 0.12, z, 0x2a2f36); B(root, 0.7, 1.1, 0.08, x, 1.0, z - 0.95, 0x2a2f36); B(root, 0.5, 0.3, 0.05, x, 1.4, z - 0.92, mat(0x1f6fd1, { emissive: 0x1f6fd1, ei: 0.5 }));
      if (i % 2 === 0) stander(x, z + 0.1, Math.PI, { task: 'jog', y: 0.27 }); }
    B(root, 1.8, 0.4, 0.6, 357, 0.45, -846, 0x333333); C(root, 0.025, 0.025, 2.0, 357, 1.2, -846, 0xc0c4c8, 6).rotation.z = Math.PI / 2;
    for (let k = 0; k < 8; k++) C(root, 0.08, 0.08, 0.35, 360.5, 0.3 + (k % 4) * 0.25, -843 + Math.floor(k / 4) * 0.5, 0x222222, 8).rotation.z = Math.PI / 2;
    solid(337, 362, -847.2, -844.8);
    spot(349, -842.5, 2.2, 'Work out in the gym (3 gold)', () => { if (stats.gold < 3) return toast('A gym session is 3 gold.'); if (stats.energy < 15) return toast('You\'re too tired for a workout. Eat something first.'); stats.gold -= 3; stats.energy -= 12; ctx.gainXp?.(8); toast('🏋️ Treadmill, weights, stretch. You\'re dripping, but stronger (+8 XP).'); });
  }
  // ---------------- lounge: darts, pool, table football, Ayo ----------------
  { B(root, 0.05, 0.9, 0.9, R.x0 + 0.2, 1.73, -846, 0x111111); const board = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshStandardMaterial({ map: makeTex(64, 64, g => { const cs = ['#1a1a1a', '#e8dcc0']; for (let i = 0; i < 20; i++) { g.fillStyle = cs[i % 2]; g.beginPath(); g.moveTo(32, 32); g.arc(32, 32, 31, i / 20 * 7.0, (i + 1) / 20 * 7.0); g.fill(); } g.strokeStyle = '#c0392b'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 20, 0, 7); g.stroke(); g.fillStyle = '#2e7d32'; g.beginPath(); g.arc(32, 32, 4, 0, 7); g.fill(); }) }));
    board.position.set(R.x0 + 0.25, 1.73, -846); board.rotation.y = Math.PI / 2; root.add(board);
    stander(R.x0 + 3, -844.5, -Math.PI / 2 - 0.3, { task: 'talk' }); play(R.x0 + 3, -846.2, 'darts', opp('Femi', 0.7, 4));
    // pool table
    B(root, 2.6, 0.8, 1.5, 270, 0.4, -843, 0x5a3b26); B(root, 2.4, 0.05, 1.3, 270, 0.82, -843, 0x1e7d4a, false); solid(268.6, 271.4, -843.8, -842.2);
    for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat([0xffffff, 0xffd23f, 0x1f6fd1, 0xc0392b, 0x7b2cbf, 0xff922b, 0x111111][i])); b.position.set(270.6 + (i % 3) * 0.07, 0.87, -843 + (i - 3) * 0.06); root.add(b); }
    stander(272, -841.6, Math.PI * 0.75, { task: 'talk' }); play(268, -841, 'pool', opp('Jide', 0.6, 4));
    // table football
    B(root, 1.3, 0.85, 0.75, 281, 0.43, -843, 0x1f4e8c); B(root, 1.2, 0.02, 0.65, 281, 0.87, -843, 0x2e8b57, false); for (let k = 0; k < 6; k++) C(root, 0.012, 0.012, 1.1, 280.5 + k * 0.2, 0.92, -843, 0xc0c4c8, 5).rotation.x = Math.PI / 2;
    solid(280.3, 281.7, -843.4, -842.6); stander(281, -844.1, 0, { child: true, task: 'swing' }); play(281, -841.6, 'tabletop', opp('Dayo (age 12)', 0.5, 2));
    // Ayo: a carved board on a low stool, an elder waiting for a challenger
    { const g = new THREE.Group(); g.position.set(291, 0, -842.5); root.add(g); B(g, 0.5, 0.45, 0.5, 0, 0.22, 0, 0x5a3b26); B(g, 1.2, 0.1, 0.4, 0, 0.5, 0, 0x8a5a2b);
      for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.03, 10), mat(0x4a2a10)); c.position.set(-0.47 + (i % 6) * 0.19, 0.56, i < 6 ? -0.09 : 0.09); g.add(c); }
      for (const sz of [-1, 1]) B(g, 0.4, 0.4, 0.4, 0, 0.2, sz * 0.75, 0x6b4a30);
      sitter(291, -843.25, 0, 0.45, { outfit: 0x7a4a9a, task: 'talk' }); solid(290.3, 291.7, -843, -842); play(291, -841.4, 'ayo', opp('Baba Tunji', 0.8, 6)); }
    for (const x of [262, 276]) { B(root, 2.4, 0.45, 0.8, x, 0.22, -838.5, 0x0d5c46); }
    sitter(262, -838.5, Math.PI, 0.45, { task: 'talk' }); sitter(263, -838.5, Math.PI, 0.45, { child: true });
  }
  // ---------------- reception ----------------
  { B(root, 5, 1.1, 1.0, 323, 0.55, -840.5, 0x0d5c46); B(root, 5.2, 0.06, 1.2, 323, 1.13, -840.5, 0xe8e2d6); solid(320.5, 325.5, -841, -840);
    stander(323, -841.6, 0, { outfit: 0x0d5c46, task: 'talk' });
    spot(323, -839, 1.8, 'Reception: what\'s on today', () => toast('🏸 "Welcome! Badminton courts 1 and 2, table tennis, volleyball, squash, the climbing wall and the ring are all open. Grab a partner, or ask the regulars. Gym is 3 gold."'));
    B(root, 0.9, 1.9, 0.8, 330, 0.95, -836.2, 0x1f6fd1); B(root, 0.6, 0.9, 0.02, 330, 1.2, -836.62, mat(0xbfe6ff, { emissive: 0x4a90c0, ei: 0.4 }), false); solid(329.5, 330.5, -836.6, -835.8);
    spot(330, -837.6, 1.4, 'Vending machine', () => ctx.openShop?.('Vending machine', [{ name: 'Sports drink', icon: '🧃', price: 2, energy: 12 }, { name: 'Water', icon: '💧', price: 1, energy: 4 }, { name: 'Protein bar', icon: '🍫', price: 2, hunger: 10, energy: 4 }, { name: 'Plantain chips', icon: '🍌', price: 2, hunger: 8 }]));
  }
  // a few people heading in and out, families with kids
  K.family([[310, -830], [310, -838], [276, -852], [300, -852], [310, -838], [310, -830], [330, -828]], { kids: 1 });
  K.walker([[262, -848], [295, -848], [295, -862], [262, -862]], { speed: 1.0 });
  return { update: (dt, p) => { if (Math.abs(p.x - 310) < 150 && Math.abs(p.z + 865) < 150) K.update(dt, p, 80); }, kit: K };
}
