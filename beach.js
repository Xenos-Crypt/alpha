// Ashford Beach, done properly: rippling sea with shallow turquoise water, foam that washes in and
// out along the shore, palms, parasols and loungers, sunbathers, kids with sandcastles, a lifeguard
// tower, surfboards, a beach-volleyball court (play the locals), the Coco Beach Bar, swimmers in the
// shallows and people strolling along the water's edge.
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export function buildBeach(ctx, { sea, seaZ = 187, beachZ0 = 165 }) {
  const K = makeKit(ctx), { B, C, S, mat, solid, sign, place, spot, stander, sitter, walker, family } = K;
  const { scene, makeTex, sports, toast, stats } = ctx, root = new THREE.Group(); scene.add(root);
  const ZONES = [[70, 138], [162, 205], [242, 296], [-298, -215]];   // clear stretches of sand (port, bridges, pier and helipad left alone)
  const inZone = x => ZONES.some(([a, b]) => x > a && x < b);

  // ---------------- the sea: a rippling surface, shallows and surf ----------------
  const ripple = makeTex(256, 256, g => {   // a tileable normal map built from a few crossing waves
    const img = g.createImageData(256, 256), h = (x, y) => Math.sin(x * 0.0491 * 2) * 0.5 + Math.sin(y * 0.0491 * 3 + x * 0.0491) * 0.35 + Math.sin((x - y) * 0.0491 * 5) * 0.15 + Math.sin((x + 2 * y) * 0.0491 * 4) * 0.12;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), i = (y * 256 + x) * 4; img.data[i] = 128 + dx * 90; img.data[i + 1] = 128 + dy * 90; img.data[i + 2] = 255; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  });
  ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping; ripple.repeat.set(40, 45); ripple.colorSpace = THREE.NoColorSpace;
  if (sea) { sea.material.normalMap = ripple; sea.material.normalScale = new THREE.Vector2(0.55, 0.55); sea.material.roughness = 0.12; sea.material.metalness = 0.25; sea.material.color.set(0x1f6fa8); sea.material.needsUpdate = true; }
  const shallowTex = makeTex(8, 64, g => { const grd = g.createLinearGradient(0, 0, 0, 64); grd.addColorStop(0, 'rgba(90,220,210,0.85)'); grd.addColorStop(0.5, 'rgba(60,180,200,0.45)'); grd.addColorStop(1, 'rgba(31,111,168,0)'); g.fillStyle = grd; g.fillRect(0, 0, 8, 64); });
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(600, 26), new THREE.MeshStandardMaterial({ map: shallowTex, transparent: true, depthWrite: false, roughness: 0.1, normalMap: ripple }));
  shallow.rotation.x = -Math.PI / 2; shallow.position.set(0, 0.045, seaZ + 13); root.add(shallow);
  const foamTex = makeTex(256, 32, g => { g.clearRect(0, 0, 256, 32); for (let i = 0; i < 260; i++) { const x = Math.random() * 256, y = 8 + Math.random() * 16, r = 1 + Math.random() * 4; g.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.5})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(0, 14, 256, 4); });
  foamTex.wrapS = THREE.RepeatWrapping; foamTex.repeat.set(30, 1);
  const foams = [0, 1].map(k => { const f = new THREE.Mesh(new THREE.PlaneGeometry(600, 2.4), new THREE.MeshBasicMaterial({ map: k ? foamTex.clone() : foamTex, transparent: true, depthWrite: false, opacity: 0.8 })); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.055 + k * 0.004, seaZ + 1); root.add(f); if (k) { f.material.map.wrapS = THREE.RepeatWrapping; f.material.map.repeat.set(22, 1); f.material.map.needsUpdate = true; } return f; });
  // wet sand along the water's edge
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(600, 4), mat(0xb59a6a, { rough: 0.5 })); wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.02, seaZ - 1.5); root.add(wet);

  // ---------------- palms, parasols, loungers, towels ----------------
  for (let x = 72; x < 296; x += 11) if (inZone(x)) ctx.tree?.(x + (x % 3), beachZ0 + 2.2, 'palm', 1.1 + (x % 5) * 0.05);
  for (let x = -296; x < -215; x += 12) ctx.tree?.(x, beachZ0 + 2.2, 'palm', 1.15);
  const parasolCols = [['#e63946', '#ffffff'], ['#1f6fd1', '#ffd23f'], ['#22c55e', '#ffffff'], ['#ff922b', '#ffffff'], ['#7b2cbf', '#ffd6e8']];
  const parasolMats = parasolCols.map(([a, b]) => { const t = makeTex(128, 16, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 16, 0, 16, 16); } }); return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide }); });
  let k = 0;
  const towelCols = [0xe63946, 0x1f6fd1, 0xffd23f, 0x22c55e, 0xff8fb1, 0xffffff];
  for (const [a, b] of ZONES) for (let x = a + 6; x < b - 4; x += 9) {
    const z = 174 + ((x * 7) % 5);
    C(root, 0.04, 0.04, 2.4, x, 1.2, z, 0xeeeeee, 6); const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 8, 1, true), parasolMats[k % parasolMats.length]); top.position.set(x, 2.45, z); root.add(top);
    for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(x + s * 1.0, 0, z + 0.4); root.add(g); B(g, 0.65, 0.08, 1.8, 0, 0.32, 0, 0xffffff); const back = B(g, 0.65, 0.08, 0.7, 0, 0.55, -0.85, 0xffffff); back.rotation.x = -0.9; for (const lx of [-0.28, 0.28]) for (const lz of [-0.7, 0.7]) B(g, 0.04, 0.32, 0.04, lx, 0.16, lz, 0xcccccc);
      if ((k + s) % 3 === 0) { sitter(x + s * 1.0, z + 0.6, Math.PI, 0.55, { task: (k % 2) ? 'talk' : 'eat', outfit: [0xff6b6b, 0x4dabf7, 0xffd43b, 0xffffff][k % 4] }); } else ctx.sitSpots?.push({ x: x + s * 1.0, z: z + 0.4, yaw: Math.PI, seatY: 0.4, label: 'Lie on the sun lounger' }); }
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), mat(towelCols[k % towelCols.length])); towel.rotation.x = -Math.PI / 2; towel.position.set(x + 3.6, 0.025, z + 2.5); root.add(towel);
    if (k % 2 === 0) sitter(x + 3.6, z + 2.3, Math.PI, 0.1, { task: 'talk' });
    k++;
  }
  // kids building sandcastles, with a bucket and spade
  for (const [x, z] of [[96, 182], [186, 181], [262, 182], [-250, 182]]) {
    const castle = new THREE.Group(); castle.position.set(x, 0, z); root.add(castle); B(castle, 1.2, 0.35, 1.2, 0, 0.17, 0, 0xd9c08a); for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { C(castle, 0.18, 0.2, 0.55, dx, 0.5, dz, 0xd9c08a, 8); const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 8), mat(0xd9c08a)); c2.position.set(dx, 0.9, dz); castle.add(c2); }
    C(castle, 0.15, 0.12, 0.25, 1.0, 0.12, 0.3, 0xff3b30, 10); sitter(x - 1.0, z + 0.6, Math.PI * 0.7, 0.15, { child: true, task: 'eat' }); sitter(x + 0.8, z - 0.9, -0.4, 0.15, { child: true, task: 'talk' }); }
  // surfboards stuck in the sand
  for (const [x, c] of [[132, 0xff3b30], [133.2, 0x1f6fd1], [134.4, 0xffd23f]]) { const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.7, 4, 10), mat(c)); sb.scale.z = 0.18; sb.position.set(x, 0.9, 168.5); sb.rotation.z = 0.08; root.add(sb); }

  // ---------------- lifeguard tower ----------------
  { const x = 120, z = 172; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C(root, 0.08, 0.08, 3, x + dx, 1.5, z + dz, 0xffffff, 6);
    B(root, 2.6, 1.6, 2.6, x, 3.8, z, 0xe63946); B(root, 3, 0.2, 3, x, 4.7, z, 0xffffff); const ramp = B(root, 0.8, 0.08, 4, x, 1.6, z - 2.8, 0xd9b07a); ramp.rotation.x = -0.75;
    const s = sign('LIFEGUARD', 'swim between the flags', 2.6, '#e63946', '#ffffff', 'sans-serif'); place(s, x, 3.9, z + 1.32, 0);
    stander(x, z + 0.3, 0, { outfit: 0xe63946, y: 3.05, task: 'talk' }); solid(x - 1.2, x + 1.2, z - 1.2, z + 1.2);
    for (const fx of [108, 132]) { C(root, 0.04, 0.04, 3.5, fx, 1.75, seaZ - 2, 0x888888, 5); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: makeTex(32, 24, g => { g.fillStyle = '#e63946'; g.fillRect(0, 0, 32, 12); g.fillStyle = '#ffd23f'; g.fillRect(0, 12, 32, 12); }), side: THREE.DoubleSide })); fl.position.set(fx + 0.45, 3.2, seaZ - 2); root.add(fl); }
    spot(x, z - 2.2, 1.8, 'Talk to the lifeguard', () => toast(['🏊 "Water\'s lovely today. Stay between the red and yellow flags!"', '🏊 "Watch out for the jellyfish near the pier."', '🏊 "Fancy a game of beach volleyball? The locals are always up for one."'][Math.floor(Math.random() * 3)]));
  }
  // ---------------- beach volleyball ----------------
  { const x = 180, z = 178; for (const s of [-1, 1]) C(root, 0.05, 0.05, 2.5, x, 1.25, z + s * 4.5, 0x333333, 6); B(root, 0.02, 0.9, 9, x, 2.0, z, mat(0xffffff, { opacity: 0.5 }), false); solid(x - 0.05, x + 0.05, z - 4.5, z + 4.5);
    for (const [dx, dz] of [[3, -2], [3, 2]]) stander(x + dx, z + dz, -Math.PI / 2, { task: 'swing' }); for (const [dx, dz] of [[-3, 2]]) stander(x + dx, z + dz, Math.PI / 2, { task: 'swing' });
    S(root, 0.11, x + 1.6, 3.2, z, 0xffd23f, 10);
    spot(x - 6, z, 2, () => sports?.label('volleyball', { name: 'the beach crew', skill: 0.6, prize: 3 }) || 'Beach volleyball', () => sports?.menu('volleyball', { name: 'the beach crew', skill: 0.6, prize: 3 })); }
  // ---------------- Coco Beach Bar ----------------
  { const x = 196, z = 169; B(root, 7, 0.3, 4, x, 0.15, z, 0x8a6a46); for (const [dx, dz] of [[-3.3, -1.8], [3.3, -1.8], [-3.3, 1.8], [3.3, 1.8]]) C(root, 0.12, 0.12, 3, x + dx, 1.5, z + dz, 0x6b4a30, 6);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 1.8, 4), mat(0xc9a86a, { rough: 1 })); roof.position.set(x, 3.7, z); roof.rotation.y = Math.PI / 4; root.add(roof);
    B(root, 6, 1.1, 0.6, x, 0.85, z + 1.6, 0x6b4a30); B(root, 6.2, 0.08, 0.8, x, 1.42, z + 1.6, 0xe8d29a); stander(x, z + 0.4, 0, { outfit: 0xff922b, task: 'cook' });
    const s = sign('COCO BEACH BAR', 'coconuts · grilled fish · cold drinks', 5, '#6b4a30', '#ffd23f', 'sans-serif'); place(s, x, 2.6, z + 1.95, 0);
    for (let i = 0; i < 4; i++) { const bx = x - 2.4 + i * 1.6; C(root, 0.2, 0.2, 0.75, bx, 0.38, z + 2.6, 0x6b4a30, 8); if (i % 2) sitter(bx, z + 2.6, Math.PI, 0.8, { task: 'eat' }); else ctx.sitSpots?.push({ x: bx, z: z + 2.6, yaw: Math.PI, seatY: 0.8, label: 'Sit at the bar' }); }
    solid(x - 3.4, x + 3.4, z - 2, z + 1.95);
    spot(x, z + 3.4, 1.8, 'Coco Beach Bar', () => ctx.openShop?.('Coco Beach Bar', [{ name: 'Fresh coconut', icon: '🥥', price: 3, energy: 14 }, { name: 'Grilled fish and plantain', icon: '🐟', price: 8, hunger: 40 }, { name: 'Prawn skewers', icon: '🍤', price: 6, hunger: 22 }, { name: 'Chapman', icon: '🍹', price: 3, energy: 12 }, { name: 'Ice lolly', icon: '🍧', price: 2, energy: 8 }, { name: 'Roasted corn', icon: '🌽', price: 2, hunger: 10 }]));
  }
  // ---------------- people: strollers along the water, swimmers in the shallows ----------------
  family([[75, seaZ - 3], [204, seaZ - 3]], { kids: 1, speed: 0.8 });
  family([[204, seaZ - 4], [75, seaZ - 4]], { kids: 2, speed: 0.8, t: 60 });
  walker([[244, seaZ - 3], [294, seaZ - 3]], { speed: 1.0 }); walker([[-296, seaZ - 3], [-218, seaZ - 3]], { speed: 2.6 });   // a jogger
  walker([[80, 170], [135, 170], [135, 172], [80, 172]], { speed: 1.1 });
  const swimmers = [];
  for (let i = 0; i < 9; i++) { const x = 100 + i * 11 + (i % 2) * 4, z = seaZ + 5 + (i % 3) * 3; const h = K.person(x, z, Math.PI * (i % 2), { child: i % 3 === 0 }); if (h) { swimmers.push({ h, x, z, ph: i * 1.3 }); } }

  let t = 0;
  function update(dt, p) {
    t += dt; ripple.offset.set(t * 0.012, t * 0.02);
    if (Math.abs(p.x) > 420 || p.z < 60 || p.z > 320) return;
    // surf: foam washes up the sand and drains back
    foams[0].position.z = seaZ + 0.6 + Math.sin(t * 0.55) * 1.2; foams[0].material.opacity = 0.55 + Math.sin(t * 0.55) * 0.3; foamTex.offset.x = t * 0.01;
    foams[1].position.z = seaZ + 1.8 + Math.sin(t * 0.55 + 2) * 1.6; foams[1].material.opacity = 0.45 + Math.sin(t * 0.55 + 2) * 0.3; foams[1].material.map.offset.x = -t * 0.007;
    K.update(dt, p, 140);
    for (const s of swimmers) { s.h.root.position.set(s.x + Math.sin(t * 0.3 + s.ph) * 2, -0.95 + Math.sin(t * 1.4 + s.ph) * 0.08, s.z + Math.cos(t * 0.25 + s.ph) * 1.2); const { armL, armR } = s.h; if (armR) { armR.pivot.rotation.x = -2.6 + Math.sin(t * 2.2 + s.ph) * 1.4; armL.pivot.rotation.x = -2.6 - Math.sin(t * 2.2 + s.ph) * 1.4; } }
  }
  return { update };
}
