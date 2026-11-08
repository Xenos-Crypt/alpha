// Bringing three of the oldest places up to the standard of the rest of the city:
//   St Mary General Hospital: a glass-fronted entrance wing, an A&E bay with ambulances, a drop-off
//     loop with a garden, a rooftop helipad, and nurses, doctors and patients about the place.
//   Westhaven International Port: stacked container yard, proper ship-to-shore cranes, a detailed
//     container ship, floodlight masts and the port's name in lights.
//   Westhaven Naval Base: a real destroyer and submarine, a submarine pen, flags, a guard post,
//     an anchor memorial and the base sign.
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export function upgradeHospital(ctx, hospital) {
  const K = makeKit(ctx), { B, C, S, mat, solid, sign, place, spot, stander, sitter, walker, family } = K;
  const { makeTex, scene } = ctx, root = new THREE.Group(); scene.add(root);
  const x0 = -224, x1 = -176, z0 = -224, z1 = -208, H = 8.6, cx = -200;
  // ---------------- the entrance wing ----------------
  const glassTex = makeTex(256, 128, g => { g.fillStyle = '#5f8fae'; g.fillRect(0, 0, 256, 128); const grd = g.createLinearGradient(0, 0, 256, 128); grd.addColorStop(0, 'rgba(255,255,255,0.25)'); grd.addColorStop(0.5, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,255,255,0.18)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 128); g.fillStyle = '#e8eef2'; for (let x = 0; x <= 256; x += 32) g.fillRect(x, 0, 3, 128); g.fillRect(0, 62, 256, 4); });
  glassTex.wrapS = THREE.RepeatWrapping; glassTex.repeat.set(6, 1);
  B(root, x1 - x0, H, z1 - z0, (x0 + x1) / 2, H / 2, (z0 + z1) / 2, 0xf4f6f8);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 2, H - 1.4), new THREE.MeshStandardMaterial({ map: glassTex, roughness: 0.15, metalness: 0.4, emissive: 0x1d3a52, emissiveIntensity: 0.3 })); glass.position.set((x0 + x1) / 2, (H - 1.4) / 2 + 0.2, z0 - 0.03); glass.rotation.y = Math.PI; root.add(glass); ctx.glowMats?.push(glass.material);
  B(root, x1 - x0 + 0.4, 0.5, 0.6, (x0 + x1) / 2, 4.3, z0 - 0.2, 0xffffff); B(root, x1 - x0 + 0.6, 1.4, z1 - z0 + 0.6, (x0 + x1) / 2, H + 0.4, (z0 + z1) / 2, 0xffffff);
  for (let x = x0 + 4; x < x1 - 2; x += 8) B(root, 0.5, H, 0.5, x, H / 2, z0 - 0.1, 0xdfe6ea);
  solid(x0, x1, z0, z1);
  { const s = sign('ST MARY GENERAL HOSPITAL', '', 24, '#ffffff', '#1f5fa8', 'sans-serif'); place(s, cx + 2, H + 0.45, z0 - 0.36, Math.PI); s.scale.y = 0.22; }
  // a big red cross on the wing
  { const g = new THREE.Group(); g.position.set(x1 - 4, H + 2.6, z0 + 1); root.add(g); const red = mat(0xe84118, { emissive: 0xe84118, ei: 0.6 }); B(g, 3.2, 0.9, 0.3, 0, 0, 0, red); B(g, 0.9, 3.2, 0.3, 0, 0, 0, red); B(g, 3.6, 3.6, 0.2, 0, 0, 0.3, 0xffffff); ctx.glowMats?.push(red); }
  // main entrance: canopy on columns, sliding glass doors
  B(root, 16, 0.5, 8, cx, 4.4, z0 - 4, 0xffffff); for (const dx of [-7.5, 7.5]) for (const dz of [-7.6]) C(root, 0.25, 0.25, 4.2, cx + dx, 2.1, z0 + dz, 0xdfe6ea, 10);
  B(root, 5, 3, 0.1, cx, 1.5, z0 - 0.08, mat(0x9fd3ff, { opacity: 0.55, metal: 0.4, rough: 0.05 }));
  { const s = sign('MAIN ENTRANCE', 'outpatients · visitors · pharmacy', 6, '#1f5fa8', '#ffffff', 'sans-serif'); place(s, cx, 5.1, z0 - 8.05, Math.PI); }
  // A&E: red-lit sign, a covered ambulance bay with two ambulances
  { const s = sign('EMERGENCY · A&E', 'ambulances only', 8, '#c0392b', '#ffffff', 'sans-serif'); place(s, x0 + 7, 6.5, z0 - 0.35, Math.PI); s.material.color.set(0xffffff);
    B(root, 13, 0.4, 9, x0 + 6.5, 4.6, z0 - 4.5, 0xc0392b); for (const dx of [0.5, 12.5]) C(root, 0.2, 0.2, 4.6, x0 + dx, 2.3, z0 - 8.6, 0xdfe6ea, 8);
    const stripe = makeTex(64, 16, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#1f5fa8' : '#ffd23f'; g.fillRect(i * 8, 0, 8, 16); } });
    const amb = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 2.2, 2.4, 4.4, 0, 1.6, -0.4, 0xf8f8f8); B(g, 2.1, 1.5, 1.6, 0, 1.15, 2.6, 0xf8f8f8); B(g, 2.0, 0.6, 0.05, 0, 1.6, 3.42, 0x22313d);
      const st = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.35, 4.44), new THREE.MeshStandardMaterial({ map: stripe })); st.position.set(0, 1.3, -0.4); g.add(st);
      for (const sx of [-0.7, 0.7]) B(g, 0.4, 0.15, 0.3, sx, 2.9, 1.5, mat(0x1f6fd1, { emissive: 0x1f6fd1, ei: 1.5 }));
      for (const [wx, wz] of [[-1, 2.4], [1, 2.4], [-1, -1.8], [1, -1.8]]) { const w = C(g, 0.38, 0.38, 0.3, wx, 0.4, wz, 0x111111, 12); w.rotation.z = Math.PI / 2; }
      const cr = new THREE.Group(); cr.position.set(0, 2.3, -0.4); g.add(cr); B(cr, 0.25, 1.0, 0.25, 0, 0, 0, 0xe84118); B(cr, 1.0, 0.25, 0.25, 0, 0, 0, 0xe84118); cr.rotation.y = Math.PI / 2; cr.position.x = 1.13;
      solid(x - 1.6, x + 1.6, z - 3, z + 3); };
    amb(x0 + 3.5, z0 - 5, Math.PI); amb(x0 + 9.5, z0 - 5, Math.PI);
    stander(x0 + 6.5, z0 - 9.5, Math.PI, { outfit: 0x2e7d32, task: 'talk' }); stander(x0 + 7.4, z0 - 9.2, 0, { outfit: 0x2e7d32, task: 'talk' });   // paramedics
  }
  // ---------------- drop-off loop and garden ----------------
  { const asph = mat(0x3a3d42, { rough: 0.95 }); B(root, 54, 0.05, 16, cx, 0.03, -235, asph, false);
    B(root, 26, 0.3, 7, cx, 0.15, -236.5, 0xd9d3c7); const lawn = new THREE.Mesh(new THREE.PlaneGeometry(25, 6), mat(0x4f8a3a, { rough: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(cx, 0.31, -236.5); root.add(lawn); solid(cx - 13, cx + 13, -240, -233);
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), mat(0xffffff), 300), o = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < 300; i++) { o.position.set(cx - 11 + (i % 50) * 0.45, 0.42, -238.8 + Math.floor(i / 50) * 0.35 + (Math.floor(i / 150) * 3.3)); o.updateMatrix(); fl.setMatrixAt(i, o.matrix); fl.setColorAt(i, col.set([0xff5a8a, 0xffd23f, 0xffffff, 0xc58fff][i % 4])); } root.add(fl);
    for (const [dx, c] of [[-3, '#1f5fa8'], [0, '#ffffff'], [3, '#2e7d32']]) { C(root, 0.06, 0.06, 9, cx + dx, 4.8, -236.5, 0xdddddd, 6); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ map: makeTex(32, 20, g => { g.fillStyle = c; g.fillRect(0, 0, 32, 20); if (c === '#ffffff') { g.fillStyle = '#e84118'; g.fillRect(13, 3, 6, 14); g.fillRect(9, 7, 14, 6); } }), side: THREE.DoubleSide })); f.position.set(cx + dx + 0.9, 8.6, -236.5); root.add(f); }
    for (const tx of [-230, -228, -172, -170]) for (const tz of [-228, -216, -204, -192]) if (!(tx > -229 && tx < -171 && tz > -225)) ctx.tree?.(tx, tz, 'birch', 1.0);
    for (const bx of [-214, -186]) { const g = new THREE.Group(); g.position.set(bx, 0, z0 - 8.8); root.add(g); B(g, 1.8, 0.08, 0.5, 0, 0.45, 0, 0x7a5636); B(g, 1.8, 0.4, 0.06, 0, 0.75, 0.22, 0x7a5636); }
    sitter(-214, z0 - 8.8, Math.PI, 0.47, { task: 'talk' }); ctx.sitSpots?.push({ x: -186, z: z0 - 8.8, yaw: Math.PI, seatY: 0.47, label: 'Sit on the bench' });
  }
  // ---------------- rooftop helipad on the tower ----------------
  { const top = hospital?.top ?? 24; const padTex = makeTex(128, 128, g => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke(); g.fillStyle = '#ffffff'; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 68); });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(6.4, 32), new THREE.MeshStandardMaterial({ map: padTex })); pad.rotation.x = -Math.PI / 2; pad.position.set(cx, top + 0.12, -200); root.add(pad);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; S(root, 0.12, cx + Math.cos(a) * 6.6, top + 0.2, -200 + Math.sin(a) * 6.6, mat(0x22ff88, { emissive: 0x22ff88, ei: 1.6 }), 6); }
    for (const [dx, dz] of [[-16, -216], [-8, -218], [10, -217]]) B(root, 3, 1.6, 3, cx + dx, H + 1.9, dz, 0xb9c0c6);   // plant on the wing roof
  }
  // ---------------- people ----------------
  const scrubs = 0x6fb3d2;
  stander(cx - 3, z0 - 5, Math.PI, { outfit: scrubs, task: 'talk' }); stander(cx - 2.2, z0 - 5.6, 0.3, { outfit: 0xffffff, task: 'talk' });   // a nurse and a doctor
  // patients in wheelchairs being pushed, visitors with children
  const chair = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); B(g, 0.55, 0.06, 0.5, 0, 0.5, 0, 0x333333); B(g, 0.55, 0.5, 0.06, 0, 0.78, -0.25, 0x333333); for (const sx of [-0.32, 0.32]) { const w = C(g, 0.3, 0.3, 0.04, sx, 0.32, -0.05, 0x666666, 14); w.rotation.z = Math.PI / 2; } return g; };
  chair(cx + 5, z0 - 6, Math.PI); sitter(cx + 5, z0 - 6, Math.PI, 0.55, { outfit: 0xdfe6ea, task: 'talk' }); stander(cx + 5, z0 - 5.1, Math.PI, { outfit: scrubs });
  chair(cx - 10, z0 - 11, 0.4); sitter(cx - 10, z0 - 11, 0.4, 0.55, { outfit: 0xdfe6ea });
  family([[cx - 26, -229], [cx + 26, -229], [cx + 4, z0 - 2], [cx - 4, z0 - 2]], { kids: 1, speed: 1.0 });
  walker([[cx + 26, -230], [cx - 26, -230], [cx - 2, z0 - 2], [cx + 2, z0 - 2]], { speed: 1.2, t: 20 });
  walker([[cx - 6, z0 - 3], [cx + 6, z0 - 3]], { outfit: scrubs, speed: 1.4 });
  spot(cx, z0 - 9, 2.2, 'Hospital reception: get checked over (15 gold)', () => { if (ctx.stats.gold < 15) return ctx.toast('A check-up is 15 gold.'); ctx.stats.gold -= 15; ctx.stats.hp = ctx.maxHp ? ctx.maxHp() : 100; ctx.toast('🩺 A nurse checks you over, cleans your cuts and gives you the all-clear. Fully healed!'); });
  return { update: (dt, p) => { if (Math.abs(p.x - cx) < 120 && Math.abs(p.z + 215) < 120) K.update(dt, p, 80); }, bay: new THREE.Vector3(x0 + 6.5, 0, z0 - 12) };
}

export function upgradePort(ctx, harbour) {
  const K = makeKit(ctx), { B, C, S, mat, solid, sign, place } = K;
  const { makeTex, scene } = ctx, root = new THREE.Group(); scene.add(root);
  const corr = makeTex(64, 32, g => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 32); for (let x = 0; x < 64; x += 4) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, 2, 32); } g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 30, 64, 2); });
  corr.wrapS = THREE.RepeatWrapping; corr.repeat.set(3, 1);
  const cols = [0xc0392b, 0x1f5fa8, 0x2e7d32, 0xf39c12, 0x7b2cbf, 0x16a085, 0x8e3b2f, 0xdfe6ea, 0x34495e, 0xe67e22];
  const cmat = cols.map(c => new THREE.MeshStandardMaterial({ map: corr, color: c, roughness: 0.7 }));
  const box = (x, y, z, w = 10, d = 5, k = 0) => { const m = new THREE.Mesh(K.boxGeo, cmat[k % cmat.length]); m.scale.set(w, 2.58, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
  // ---------------- the container yard: stacks on the existing rows, plus a new row ----------------
  let k = 3;
  for (const x of [-137, -123, -78, -64]) for (const z of [190, 205]) { const tiers = 1 + ((x * 3 + z) % 3 + 3) % 3; for (let t = 1; t <= tiers; t++) box(x, 2.5 + t * 2.6, z, 10, 5, k++); }
  for (const x of [-137, -123, -78, -64]) { const tiers = 2 + ((x + 7) % 2 + 2) % 2; for (let t = 0; t < tiers; t++) box(x, 2.5 + t * 2.6, 216.5, 10, 5, k++); solid(x - 5, x + 5, 214, 219); ctx.planeBlocks?.push({ minX: x - 5, maxX: x + 5, minZ: 214, maxZ: 219, top: 2.5 + tiers * 2.6 }); }
  // yellow safety lanes painted on the quay
  for (const x of [-114, -108, -95, -89]) B(root, 0.25, 0.02, 34, x, 1.21, 198, 0xffd23f, false);
  B(root, 98, 0.02, 0.3, -100, 1.21, 222, 0xffd23f, false);
  // ---------------- ship-to-shore cranes: back legs, bracing, machinery house, long boom ----------------
  for (const c of harbour?.cranes || []) {
    const g = c.hoist.parent, x = c.x; if (!g) continue;
    const red = mat(0xc0392b), white = mat(0xf4f4f2);
    for (const sx of [-5, 5]) { B(g, 0.7, 16, 0.7, x + sx, 9.2, 215, red); for (let y = 2; y < 16; y += 4) B(g, 0.35, 0.35, 10, x + sx, y + 1.2, 220, white); }
    for (const z of [215, 225]) B(g, 11, 0.6, 0.6, x, 4, z, red);
    B(g, 8, 3.2, 6, x, 19.2, 218, white); B(g, 8.2, 0.4, 6.2, x, 20.9, 218, red); const s = sign('WESTHAVEN PORT', '', 7.6, '#c0392b', '#ffffff', 'sans-serif'); s.position.set(x, 19.4, 214.95); s.rotation.y = Math.PI; g.add(s);
    B(g, 0.9, 0.9, 40, x, 17.4, 232, red); B(g, 0.5, 0.5, 30, x, 21.5, 222, white); for (const z of [212, 238]) { const tie = B(g, 0.2, 0.2, 14, x, 19.5, (z + 225) / 2, white); tie.rotation.x = z > 225 ? 0.35 : -0.35; }
    S(g, 0.3, x, 21.6, 207, mat(0xff3b30, { emissive: 0xff3b30, ei: 2 }), 8);
    for (const sx of [-5, 5]) { const blk = { minX: x + sx - 0.4, maxX: x + sx + 0.4, minZ: 214.6, maxZ: 215.4 }; ctx.colliders.push(blk); ctx.planeBlocks?.push({ ...blk, top: 22 }); }
  }
  // ---------------- the container ship: a real hull, bridge, funnel and deck cargo ----------------
  if (harbour?.ship) {
    const ship = harbour.ship; for (const ch of [...ship.children]) ch.visible = false;
    const prof = new THREE.Shape(); prof.moveTo(-26, -2.5); prof.lineTo(20, -2.5); prof.quadraticCurveTo(27, -2, 28, 3.2); prof.lineTo(-26, 3.2); prof.lineTo(-26, -2.5);
    const hg = new THREE.ExtrudeGeometry(prof, { depth: 11, bevelEnabled: false }); hg.translate(0, 0, -5.5);
    const hull = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ map: makeTex(128, 32, g => { g.fillStyle = '#7a1f1f'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#1d2b3a'; g.fillRect(0, 0, 128, 21); g.fillStyle = '#ffffff'; g.fillRect(0, 21, 128, 1); }), roughness: 0.6 })); hull.position.y = 0.6; hull.castShadow = true; ship.add(hull);
    hg.computeBoundingBox(); const uv = hg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 54 + 0.5, (hg.attributes.position.getY(i) + 2.5) / 5.7);
    B(ship, 52, 0.2, 10.6, 0, 3.85, 0, 0x6b2b2b);
    const bridge = new THREE.Group(); bridge.position.set(-19, 3.9, 0); ship.add(bridge);
    for (let f = 0; f < 4; f++) { B(bridge, 7 - f * 0.4, 2, 9.4, 0, 1 + f * 2, 0, 0xf4f4f2); B(bridge, 7.05 - f * 0.4, 0.5, 9.45, 0, 1.4 + f * 2, 0, 0x22313d); }
    B(bridge, 3, 0.6, 13, 1.5, 7.6, 0, 0xf4f4f2); B(bridge, 2.4, 4, 2.4, -2.6, 10.5, 0, 0xc0392b); B(bridge, 2.45, 0.8, 2.45, -2.6, 12.2, 0, 0x111111);
    C(bridge, 0.1, 0.1, 5, 1, 11, 0, 0xdddddd, 6); const radar = B(bridge, 1.6, 0.15, 0.3, 1, 13.4, 0, 0x333333); ship.userData.radar = radar;
    let kk = 0; for (let x = -12; x <= 22; x += 6.4) for (let t = 0; t < 3; t++) for (const z of [-3.8, -1.3, 1.3, 3.8]) { if (t === 2 && (x + z) % 3 === 0) continue; const m = new THREE.Mesh(K.boxGeo, cmat[(kk++ * 7) % cmat.length]); m.scale.set(6, 2.58, 2.44); m.position.set(x, 5.3 + t * 2.6, z); m.castShadow = true; ship.add(m); }
    const nm = makeTex(256, 48, g => { g.fillStyle = '#1d2b3a'; g.fillRect(0, 0, 256, 48); g.fillStyle = '#ffffff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText('WESTHAVEN STAR', 128, 34); });
    for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: nm })); p.position.set(17, 2.4, sz * 5.53); p.rotation.y = sz > 0 ? 0 : Math.PI; ship.add(p); }
  }
  // ---------------- floodlight masts and the port's name ----------------
  const lamps = [];
  for (const [x, z] of [[-146, 183], [-54, 183], [-146, 230], [-54, 230], [-100, 230]]) { C(root, 0.3, 0.45, 24, x, 12, z, 0x8a939c, 8); B(root, 3, 0.6, 1.2, x, 24.2, z, 0x333333); const l = B(root, 2.6, 0.2, 1.0, x, 23.85, z, mat(0xfff4dc, { emissive: 0xfff4dc, ei: 0.2 })); l.material = l.material.clone(); lamps.push(l); ctx.colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 }); }
  { const s = sign('WESTHAVEN INTERNATIONAL PORT', '', 34, '#173e51', '#ffd23f', 'sans-serif'); place(s, -182, 15.3, 168.5, Math.PI); }
  return { update(dt, night) { for (const l of lamps) l.material.emissiveIntensity = night ? 2.4 : 0.2; const r = harbour?.ship?.userData.radar; if (r) r.rotation.y += dt * 1.5; } };
}

export function upgradeNavy(ctx, navy) {
  const K = makeKit(ctx), { B, C, S, mat, solid, sign, place, stander } = K;
  const { makeTex, scene } = ctx, root = new THREE.Group(); scene.add(root);
  const grey = mat(0x7c8a94, { metal: 0.35, rough: 0.5 }), dark = mat(0x4a555d, { metal: 0.3, rough: 0.6 }), subM = mat(0x1e262b, { metal: 0.2, rough: 0.7 });
  const radars = [];
  const num = (t, w, bg = '#7c8a94') => makeTex(64, 32, g => { g.fillStyle = bg; g.fillRect(0, 0, 64, 32); g.fillStyle = '#ffffff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText(t, 32, 26); });
  for (const v of navy?.vessels || []) {
    for (const ch of [...v.g.children]) ch.visible = false;
    const g = new THREE.Group(); v.g.add(g);
    if (!v.sub) {   // a destroyer: pointed hull, deck gun, missile cells, stepped superstructure, mast and radar, helicopter deck
      const hs = new THREE.Shape(); hs.moveTo(-3.6, -17); hs.lineTo(3.6, -17); hs.lineTo(3.9, 6); hs.quadraticCurveTo(2.6, 14, 0, 19); hs.quadraticCurveTo(-2.6, 14, -3.9, 6); hs.lineTo(-3.6, -17);
      const hg = new THREE.ExtrudeGeometry(hs, { depth: 4.2, bevelEnabled: false }); hg.rotateX(Math.PI / 2); hg.translate(0, 2.4, 0);
      const hull = new THREE.Mesh(hg, grey); hull.castShadow = true; g.add(hull);
      const dk = new THREE.ExtrudeGeometry(hs, { depth: 0.12, bevelEnabled: false }); dk.rotateX(Math.PI / 2); dk.scale(0.97, 1, 0.98); dk.translate(0, 2.52, 0); g.add(new THREE.Mesh(dk, dark));
      B(g, 6.4, 2.6, 13, 0, 3.8, -2, grey); B(g, 5.2, 2.2, 7, 0, 6.2, 0, grey); B(g, 5.25, 0.6, 1.2, 0, 6.6, 3.45, mat(0x111a22)); B(g, 4, 1.6, 4, 0, 8.1, -0.5, grey);
      C(g, 0.2, 0.25, 6, 0, 11.6, -0.5, dark, 6); const rd = B(g, 2.6, 0.5, 0.25, 0, 14.2, -0.5, 0x2a2f33); radars.push(rd); S(g, 0.6, 0, 12.6, -0.5, 0xeeeeee, 10);
      B(g, 2.2, 3.2, 2.6, 0, 5.2, -6.5, dark);   // funnel
      const tur = new THREE.Group(); tur.position.set(0, 3.0, 11); g.add(tur); const tm = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.2, 12), grey); tur.add(tm); const barrel = C(tur, 0.12, 0.15, 4.5, 0, 0.2, 2.4, dark, 8); barrel.rotation.x = Math.PI / 2 - 0.08;
      for (let i = 0; i < 8; i++) B(g, 0.7, 0.1, 0.7, -1.2 + (i % 4) * 0.8, 2.6, 6.5 + Math.floor(i / 4) * 0.9, 0x5a656d);
      const heli = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshStandardMaterial({ map: makeTex(64, 64, q => { q.fillStyle = '#4a555d'; q.fillRect(0, 0, 64, 64); q.strokeStyle = '#ffffff'; q.lineWidth = 3; q.strokeRect(4, 4, 56, 56); q.fillStyle = '#ffffff'; q.font = 'bold 36px sans-serif'; q.textAlign = 'center'; q.fillText('H', 32, 46); }) })); heli.rotation.x = -Math.PI / 2; heli.position.set(0, 2.66, -13); g.add(heli);
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: num('D21') })); p.position.set(sx * 3.92, 1.6, 9); p.rotation.y = sx * Math.PI / 2; g.add(p); }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: makeTex(48, 32, q => { q.fillStyle = '#ffffff'; q.fillRect(0, 0, 48, 32); q.fillStyle = '#1f3a8a'; q.fillRect(0, 0, 18, 14); q.fillStyle = '#c0392b'; q.fillRect(0, 14, 48, 4); q.fillRect(22, 0, 4, 32); }) })); flag.position.set(0.6, 5, -16.6); flag.rotation.y = Math.PI / 2; g.add(flag); C(g, 0.04, 0.04, 3, 0, 4, -16.6, 0xdddddd, 5);
    } else {   // a submarine: long dark hull, sail with planes, cross-shaped stern fins
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 20, 6, 18), subM); hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, 0.85); hull.position.y = 0.3; hull.castShadow = true; g.add(hull);
      const sail = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.4, 4, 12), subM); sail.rotation.x = Math.PI / 2; sail.scale.set(1, 1, 2.6); sail.position.set(0, 3.6, 3.5); g.add(sail);
      B(g, 6, 0.15, 1.2, 0, 4.0, 4.2, subM); C(g, 0.1, 0.1, 2.2, 0.3, 6.6, 4.4, dark, 6); C(g, 0.08, 0.08, 1.6, -0.3, 6.4, 3.8, dark, 6);
      B(g, 0.15, 4.4, 2.2, 0, 0.3, -12.4, subM); B(g, 5.2, 0.15, 2.2, 0, 0.3, -12.4, subM); const prop = C(g, 0.9, 0.9, 0.3, 0, 0.3, -13.8, 0x8a6a2a, 10); prop.rotation.x = Math.PI / 2;
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: num('S85', 0, '#1e262b') })); p.position.set(sx * 0.95, 4.4, 3.5); p.rotation.y = sx * Math.PI / 2; g.add(p); }
    }
  }
  // ---------------- the base: submarine pen roof, sign, guard post, flags, anchor memorial ----------------
  { const roof = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 14.5, 18, 24, 1, true, -Math.PI / 2, Math.PI), mat(0x5f6f78, { metal: 0.4, rough: 0.5, side: THREE.DoubleSide })); roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.45); roof.position.set(-235, 7.1, 236); root.add(roof);
    const s = sign('SUBMARINE PEN', 'restricted area', 10, '#1f3a8a', '#ffffff', 'sans-serif'); place(s, -235, 11.5, 226.9, Math.PI); }
  { const s = sign('WESTHAVEN NAVAL BASE', 'HMS Westhaven · authorised personnel only', 16, '#1f3a8a', '#ffffff', 'sans-serif'); place(s, -235, 5.2, 162, Math.PI); for (const sx of [-7.6, 7.6]) C(root, 0.2, 0.2, 5.4, -235 + sx, 2.7, 162, 0x1f3a8a, 8); }
  { // guard post at the pier root
    B(root, 2.4, 2.8, 2.4, -230.5, 1.4, 167, 0xf4f4f2); B(root, 2.8, 0.25, 2.8, -230.5, 2.95, 167, 0x1f3a8a); B(root, 2.42, 0.8, 1.6, -230.5, 1.8, 167, mat(0x9fd3ff, { opacity: 0.5 }));
    solid(-231.7, -229.3, 165.8, 168.2); stander(-232.5, 168.5, Math.PI, { outfit: 0xffffff, pants: 0x1c2f43, task: 'idle' });
    const bar = B(root, 0.12, 0.12, 4, -233, 1.1, 165, 0xc0392b); bar.rotation.y = Math.PI / 2; bar.position.x = -235; }
  for (const [dx, c] of [[-5, '#1f3a8a'], [5, '#ffffff']]) { C(root, 0.06, 0.06, 10, -235 + dx, 5, 158, 0xdddddd, 6); const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: makeTex(48, 32, q => { q.fillStyle = c; q.fillRect(0, 0, 48, 32); q.strokeStyle = c === '#ffffff' ? '#1f3a8a' : '#ffd23f'; q.lineWidth = 3; q.beginPath(); q.arc(24, 13, 6, 0, 7); q.moveTo(24, 7); q.lineTo(24, 27); q.moveTo(16, 22); q.quadraticCurveTo(24, 30, 32, 22); q.stroke(); }) })); f.position.set(-235 + dx + 1.1, 9.2, 158); root.add(f); }
  { // anchor memorial
    const g = new THREE.Group(); g.position.set(-247, 0, 160); root.add(g); B(g, 3, 0.8, 3, 0, 0.4, 0, 0xbfb6a0); const am = mat(0x2a2f33, { metal: 0.6, rough: 0.4 });
    C(g, 0.12, 0.12, 3, 0, 2.3, 0, am, 8); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 14), am); ring.position.y = 4.0; g.add(ring); B(g, 1.6, 0.18, 0.18, 0, 3.3, 0, am);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 18, Math.PI), am); arc.rotation.z = Math.PI; arc.position.y = 1.9; g.add(arc); solid(-248.5, -245.5, 158.5, 161.5); }
  // sailors on the dock
  for (let i = 0; i < 4; i++) stander(-244 + i * 3, 234, Math.PI, { outfit: 0xffffff, pants: 0x1c2f43, task: i % 2 ? 'talk' : 'idle' });
  return { update(dt, p) { for (const r of radars) r.rotation.y += dt * 2; if (Math.abs(p.x + 235) < 150 && Math.abs(p.z - 220) < 150) K.update(dt, p, 80); } };
}
