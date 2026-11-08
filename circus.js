// Cirque Aurora: a travelling circus pitched beside the Leisure Park boulevard.
// A striped big top you walk into (buy a ticket at the box office first), a sawdust ring with tiered
// seats, and a show that runs on a loop: the ringmaster, jugglers, the flying trapeze, a clown on a
// unicycle, tumblers building a human pyramid, and a fire act. Take a seat to watch the whole show.
// Outside: the entrance arch with light bulbs, caravans, a popcorn and candyfloss stand, bunting.
import * as THREE from 'three';

export const CIRCUS = { x: 242, z: -704, r: 20 };   // big top centre and radius; the entrance faces north (the road)
const ACTS = [
  { id: 'ringmaster', name: 'The Ringmaster', line: 'Ladies and gentlemen, welcome to Cirque Aurora!', len: 12 },
  { id: 'juggle', name: 'The Juggling Jovanovics', line: 'Seven clubs, two jugglers, not one drop!', len: 22 },
  { id: 'trapeze', name: 'The Flying Valentinos', line: 'High above the ring, without a net!', len: 26 },
  { id: 'clown', name: 'Coco the Clown', line: 'Honk honk! Coco rides in on his unicycle.', len: 20 },
  { id: 'pyramid', name: 'The Aurora Tumblers', line: 'Flips, cartwheels and a human pyramid!', len: 22 },
  { id: 'fire', name: 'Ignis the Fire-Breather', line: 'Stand back: the fire act!', len: 18 },
  { id: 'finale', name: 'Grand finale', line: 'Take a bow, everybody!', len: 12 },
];
export const SHOW_LENGTH = ACTS.reduce((a, b) => a + b.len, 0);
export function actAt(t) { let s = ((t % SHOW_LENGTH) + SHOW_LENGTH) % SHOW_LENGTH; for (const a of ACTS) { if (s < a.len) return { act: a, t: s, i: ACTS.indexOf(a) }; s -= a.len; } return { act: ACTS[0], t: 0, i: 0 }; }

export function buildCircus(ctx) {
  const { scene, colliders, interactables, sitSpots, makePerson, animatePerson, makeTex, toast, stats } = ctx;
  const { x: cx, z: cz, r: R } = CIRCUS;
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide, transparent: o.opacity != null, opacity: o.opacity ?? 1, depthWrite: o.opacity == null })); return mats.get(k); };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const root = new THREE.Group(); root.position.set(cx, 0, cz); scene.add(root);
  const B = (w, h, d, x, y, z, c, o, parent = root) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const solid = (minX, maxX, minZ, maxZ) => colliders.push({ minX: cx + minX, maxX: cx + maxX, minZ: cz + minZ, maxZ: cz + maxZ });
  const W = (lx, lz) => new THREE.Vector3(cx + lx, 0, cz + lz);

  // ---------------- the big top ----------------
  const stripes = makeTex(512, 256, g => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f6f1e7' : '#c8102e'; g.fillRect(i * 32, 0, 32, 256); } g.fillStyle = '#f2c14e'; g.fillRect(0, 0, 512, 14); });
  stripes.wrapS = THREE.RepeatWrapping; stripes.repeat.x = 3;
  const wallH = 6, gapA = 0.32;   // entrance: a gap in the wall either side of north (-z)
  const tentMat = new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.85 });
  // the wall, with the doorway cut out (north is -z, i.e. angle -PI/2 in x/z)
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, wallH, 64, 1, true, gapA, Math.PI * 2 - 2 * gapA), tentMat);
  wall.rotation.y = Math.PI;   // open side facing -z
  wall.position.y = wallH / 2; root.add(wall);
  // roof: a cone up to the king poles, then a smaller top cone
  const roofTex = stripes.clone(); roofTex.needsUpdate = true; roofTex.repeat.x = 4;
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, side: THREE.DoubleSide, roughness: 0.85 });
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.5, R + 1.2, 11, 64, 1, true), roofMat); roof.position.y = wallH + 5.5 - 0.3; root.add(roof);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 32), mat(0xc8102e)); cap.position.y = wallH + 11 + 0.9; root.add(cap);
  for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 21, 10), mat(0x8a8f96, { metal: 0.6 })); pole.position.set(s * 1.6, 10.5, 0); root.add(pole);
    const flag = B(1.6, 0.9, 0.04, s * 1.6 + 0.8, 21.5, 0, s > 0 ? 0xf2c14e : 0x1f6fd1); flag.userData.flag = true; }
  // guy ropes and pegs round the outside
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < 0.5) continue;
    const px = Math.cos(a) * (R + 4), pz = Math.sin(a) * (R + 4), top = new THREE.Vector3(Math.cos(a) * R, wallH, Math.sin(a) * R), peg = new THREE.Vector3(px, 0.1, pz);
    const len = top.distanceTo(peg), rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 4), mat(0xd9c8a0)); rope.position.copy(top).add(peg).multiplyScalar(0.5); rope.lookAt(peg); rope.rotateX(Math.PI / 2); root.add(rope);
    B(0.15, 0.4, 0.15, px, 0.2, pz, 0x5a4636); }
  // wall colliders: short segments round the circle, leaving the doorway
  for (let i = 0; i < 40; i++) { const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2, am = (a0 + a1) / 2;
    const north = Math.abs(Math.atan2(Math.sin(am + Math.PI / 2), Math.cos(am + Math.PI / 2))) < gapA + 0.02; if (north) continue;
    const x = Math.cos(am) * R, z = Math.sin(am) * R; solid(x - 1.2, x + 1.2, z - 1.2, z + 1.2); }
  ctx.planeBlocks?.push({ minX: cx - R, maxX: cx + R, minZ: cz - R, maxZ: cz + R, top: 18 });
  // entrance canopy
  for (const s of [-1, 1]) B(0.3, 4.2, 0.3, s * 3.4, 2.1, -R - 1.6, 0xf2c14e, { metal: 0.4 });
  const canopy = B(7.4, 0.25, 3.6, 0, 4.35, -R - 1.2, tentMat); canopy.rotation.x = -0.12;

  // ---------------- inside: ring, seating, lights, rigging ----------------
  const sawdust = new THREE.Mesh(new THREE.CircleGeometry(7, 48), mat(0xd7b377, { rough: 1 })); sawdust.rotation.x = -Math.PI / 2; sawdust.position.y = 0.06; root.add(sawdust);
  const kerb = new THREE.Mesh(new THREE.TorusGeometry(7.1, 0.25, 8, 64), mat(0xc8102e)); kerb.rotation.x = Math.PI / 2; kerb.position.y = 0.3; root.add(kerb);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, 64), mat(0x3a2a24, { rough: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03; root.add(floor);
  // tiered benches in a horseshoe (not across the entrance or the backstage curtain at the south)
  const seats = [];
  for (let tier = 0; tier < 4; tier++) {
    const rr = 10.5 + tier * 1.6, h = 0.45 + tier * 0.55;
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 + 0.11, dn = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2)), ds = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
      if (Math.abs(dn) < 0.42 || Math.abs(ds) < 0.38) continue;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, bench = B(2.3, 0.12, 0.55, x, h, z, tier % 2 ? 0x1f4e8c : 0x2a64b0); bench.rotation.y = -a + Math.PI / 2;
      B(2.3, h, 0.5, x * 1.03, h / 2, z * 1.03, 0x2b2b30).rotation.y = -a + Math.PI / 2;
      if (tier < 3) seats.push({ x: cx + x, z: cz + z, yaw: Math.atan2(-x, -z), seatY: h + 0.06, label: 'Sit and watch the show', circus: true }); }
  }
  for (const s of seats.filter((_, i) => i % 2 === 0)) sitSpots.push(s);
  // backstage curtain at the south
  const curtain = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.6, R - 0.6, wallH - 0.3, 16, 1, true, Math.PI / 2 - 0.35, 0.7), mat(0x6d0f1f, { side: THREE.DoubleSide }));
  curtain.rotation.y = Math.PI; curtain.position.y = (wallH - 0.3) / 2; root.add(curtain);
  // trapeze rig: two towers and a swinging bar between them
  for (const s of [-1, 1]) { B(0.25, 13, 0.25, s * 6, 6.5, 0, 0xbfc5cc, { metal: 0.7 }); B(1.6, 0.12, 1.6, s * 6, 11, 0, 0x9aa1a8, { metal: 0.6 }); }
  const bars = [];
  for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 2.6, 13, 0); root.add(pivot);
    for (const t of [-0.5, 0.5]) B(0.03, 4, 0.03, 0, -2, t, 0xdddddd, {}, pivot); B(0.06, 0.06, 1.1, 0, -4, 0, 0xc0c0c0, { metal: 0.8 }, pivot); bars.push(pivot); }
  // spotlight beams (soft cones) and warm bulbs
  const beams = [];
  for (const [bx, bz, c] of [[-8, -6, 0xfff1c0], [8, -6, 0xffd0e0], [0, 9, 0xd0e8ff]]) { const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 14, 24, 1, true), mat(c, { emissive: c, ei: 0.5, opacity: 0.12, side: THREE.DoubleSide })); beam.position.set(bx / 2, 7, bz / 2); beam.rotation.set(bz * 0.03, 0, -bx * 0.03); root.add(beam); beams.push(beam); }
  const bulbMat = mat(0xfff2c0, { emissive: 0xffd27a, ei: 1.4 });
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), bulbMat); b.position.set(Math.cos(a) * (R - 0.3), wallH - 0.2, Math.sin(a) * (R - 0.3)); root.add(b); }
  const light = new THREE.PointLight(0xffe2b0, 30, 26, 1.6); light.position.set(0, 9, 0); root.add(light);

  // ---------------- outside: arch, box office, snack stand, caravans, bunting ----------------
  const archTex = makeTex(1024, 256, g => { g.fillStyle = '#1c1033'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#ffd23f'; g.font = 'bold 120px Georgia, serif'; g.textAlign = 'center'; g.fillText('CIRQUE AURORA', 512, 150, 980); g.font = 'italic 40px Georgia, serif'; g.fillStyle = '#ffffff'; g.fillText('shows all day · tickets at the box office', 512, 220); });
  const az = -R - 13;
  for (const s of [-1, 1]) B(0.6, 6.5, 0.6, s * 5, 3.25, az, 0xc8102e);
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.6), new THREE.MeshBasicMaterial({ map: archTex, side: THREE.DoubleSide })); arch.position.set(0, 7.6, az); arch.rotation.y = Math.PI; root.add(arch);
  for (let i = 0; i < 22; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), bulbMat); b.position.set(-5.4 + i * (10.8 / 21), 9.0, az - 0.05); root.add(b); }
  // box office
  B(3.2, 2.8, 2.4, -8.5, 1.4, az + 3, 0xc8102e); B(3.4, 0.25, 2.8, -8.5, 2.95, az + 3, 0xf2c14e); B(1.4, 0.9, 0.05, -8.5, 1.7, az + 1.78, 0x9fd3ff, { opacity: 0.5 });
  solid(-10.1, -6.9, az + 1.8, az + 4.2);
  const vendor = ctx.makePerson?.({ outfit: 0xc8102e, hair: 0x2b1d14, pants: 0x222222 }); if (vendor) { vendor.root.position.set(cx - 8.5, 0, cz + az + 3.2); vendor.root.rotation.y = Math.PI; }
  // popcorn & candyfloss stand
  B(2.6, 1.1, 1.4, 8.5, 0.55, az + 3, 0xffffff); for (let i = 0; i < 5; i++) B(0.52, 1.6, 0.05, 7.46 + i * 0.52, 2.0, az + 2.3, i % 2 ? 0xc8102e : 0xffffff);
  B(2.8, 0.1, 1.6, 8.5, 2.85, az + 3, 0xc8102e); solid(7.1, 9.9, az + 2.2, az + 3.8);
  // caravans round the back
  for (const [x, z, c] of [[-16, 20, 0x2a9d8f], [-9, 24, 0xe9c46a], [0, 26, 0xf4a261], [9, 24, 0x6d597a], [16, 20, 0x2a9d8f]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(x, z); root.add(g);
    B(5.5, 2.4, 2.3, 0, 1.6, 0, c, {}, g); B(5.7, 0.2, 2.5, 0, 2.9, 0, 0xf6f1e7, {}, g); for (const s of [-1, 1]) B(1.0, 0.7, 0.05, s * 1.5, 1.9, 1.16, 0x9fd3ff, { opacity: 0.6 }, g);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), mat(0x222222)); w.rotation.x = Math.PI / 2; w.position.set(s * 1.6, 0.4, 1.2); g.add(w); }
    const wx = cx + x, wz = cz + z; colliders.push({ minX: wx - 3, maxX: wx + 3, minZ: wz - 3, maxZ: wz + 3 });
  }
  // bunting from the arch to the tent
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) { const t = i / 9, f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), mat([0xc8102e, 0xf2c14e, 0x1f6fd1, 0x2a9d8f][i % 4])); f.rotation.x = Math.PI; f.position.set(s * (5 - t * 1.6), 8.6 - Math.sin(t * Math.PI) * 1.2 - t * 2.2, az + t * 10.5); root.add(f); }

  // ---------------- the performers ----------------
  const person = (o, x, z) => { const h = makePerson(o); h.root.position.set(cx + x, 0, cz + z); return h; };
  const P = {
    ringmaster: person({ outfit: 0xb3001b, hair: 0x2b1d14, pants: 0x111111 }, 0, -3),
    jugA: person({ outfit: 0x1f6fd1, hair: 0x5a3b22, pants: 0xf2c14e }, -2, 0), jugB: person({ outfit: 0x1f6fd1, hair: 0x111111, pants: 0xf2c14e }, 2, 0),
    flyA: person({ outfit: 0xe0e0ff, hair: 0xc9a26a, pants: 0xe0e0ff }, -6, 0), flyB: person({ outfit: 0xffd1e8, hair: 0x2b1d14, pants: 0xffd1e8 }, 6, 0),
    clown: person({ outfit: 0x2ecc71, hair: 0xff6a00, pants: 0xf39c12, skin: 0xffffff }, 0, 4),
    t1: person({ outfit: 0x8e44ad, hair: 0x111111, pants: 0x8e44ad }, -1, 1), t2: person({ outfit: 0x8e44ad, hair: 0x5a3b22, pants: 0x8e44ad }, 1, 1), t3: person({ outfit: 0x8e44ad, hair: 0xc9a26a, pants: 0x8e44ad }, 0, 2),
    fire: person({ outfit: 0x222222, hair: 0x111111, pants: 0x8b0000 }, 0, 2),
  };
  // props
  const hat = new THREE.Group(); B(0.42, 0.02, 0.42, 0, 0, 0, 0x111111, {}, hat); B(0.26, 0.38, 0.26, 0, 0.2, 0, 0x111111, {}, hat); hat.position.set(0, 2.02, -0.04); P.ringmaster.rig.add(hat);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xff0000)); nose.position.set(0, 1.8, 0.2); P.clown.rig.add(nose);
  const uni = new THREE.Group(); { const w = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 16), mat(0x222222)); w.rotation.y = Math.PI / 2; w.position.y = 0.4; uni.add(w); B(0.05, 0.8, 0.05, 0, 0.9, 0, 0xc0c0c0, {}, uni); } root.add(uni);
  const balls = [0xff3b30, 0xffcc00, 0x34c759, 0x007aff, 0xaf52de, 0xff9500, 0xffffff].map(c => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(c, { emissive: c, ei: 0.2 })); root.add(m); return m; });
  const flames = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), mat(0xffa020, { emissive: 0xff5a00, ei: 2.5, opacity: 0.8 })); f.visible = false; root.add(f); flames.push(f); }
  const all = Object.values(P);

  // ---------------- box office and tickets ----------------
  let ticket = false, watched = 0, lastAct = -1, wasInside = false, doorNag = 0;
  const PRICE = 15;
  const inside = p => Math.hypot(p.x - cx, p.z - cz) < R - 0.5;
  const doorGuard = { minX: cx - 2.2, maxX: cx + 2.2, minZ: cz - R - 1.5, maxZ: cz - R + 0.4 };
  colliders.push(doorGuard);
  const usher = person({ outfit: 0xf2c14e, hair: 0x2b1d14, pants: 0x111111 }, 2.8, -R - 2); usher.root.rotation.y = Math.PI;
  interactables.push({ pos: W(-8.5, az + 1), r: 2.4, get label() { return ticket ? 'You have a circus ticket' : `Buy a circus ticket (${PRICE} gold)`; }, action: () => {
    if (ticket) return toast('🎟️ You already have a ticket. Show it to the usher at the big top.');
    if (stats.gold < PRICE) return toast('Not enough gold for a ticket.');
    stats.gold -= PRICE; ticket = true; toast('🎟️ One ticket for Cirque Aurora! The usher will let you into the big top. Take a seat to watch the show.'); } });
  interactables.push({ pos: W(2.8, -R - 3), r: 2.2, get label() { return ticket ? 'Show your ticket to the usher' : 'Talk to the usher'; }, action: () => toast(ticket ? '🎪 "Enjoy the show! Seats all round the ring."' : '🎪 "Tickets from the box office by the arch, please."') });
  interactables.push({ pos: W(8.5, az + 1.6), r: 2.2, label: 'Buy popcorn and candyfloss', action: () => ctx.openShop?.('Circus treats', [
    { name: 'Popcorn', icon: '🍿', price: 3, hunger: 12 }, { name: 'Candyfloss', icon: '🍭', price: 3, hunger: 8, energy: 8 }, { name: 'Hot dog', icon: '🌭', price: 5, hunger: 25 },
    { name: 'Toffee apple', icon: '🍎', price: 3, hunger: 10, hp: 3 }, { name: 'Lemonade', icon: '🍋', price: 2, energy: 10 }]) });
  ctx.destinations?.push({ name: 'Cirque Aurora (circus)', x: cx, z: cz - R - 14 });

  // ---------------- per frame ----------------
  let clock = 0;
  function pose(h, aL, aR, lL = 0, lR = 0) { h.armL.pivot.rotation.set(aL[0], 0, aL[1]); h.armR.pivot.rotation.set(aR[0], 0, aR[1]); h.legL.pivot.rotation.x = lL; h.legR.pivot.rotation.x = lR; }
  function place(h, x, y, z, yaw) { h.root.position.set(cx + x, y, cz + z); h.root.rotation.set(0, yaw, 0); h.rig.rotation.set(0, 0, 0); }
  function update(dt, playerPos, sitting) {
    clock += dt;
    // the doorway only opens for ticket holders (and always lets you out)
    const atDoor = Math.abs(playerPos.x - cx) < 4 && playerPos.z > cz - R - 4 && playerPos.z < cz - R + 2;
    const open = ticket || inside(playerPos);
    const gi = colliders.indexOf(doorGuard);
    if (open && gi >= 0) colliders.splice(gi, 1); else if (!open && gi < 0) colliders.push(doorGuard);
    doorNag -= dt; if (atDoor && !open && doorNag <= 0) { doorNag = 6; toast('🎪 The usher stops you: "Ticket, please! The box office is by the arch."'); }
    const isIn = inside(playerPos);
    if (wasInside && !isIn && ticket && watched > 30) { ticket = false; watched = 0; }   // the ticket is used once you've seen some of the show and leave
    wasInside = isIn;
    const near = Math.hypot(playerPos.x - cx, playerPos.z - cz) < 140;
    for (const f of root.children) if (f.userData.flag) f.rotation.y = Math.sin(clock * 3 + f.position.x) * 0.3;
    if (!near) return;
    const { act, t, i } = actAt(clock);
    if (isIn && sitting) {
      watched += dt;
      if (i !== lastAct) { lastAct = i; ctx.callout?.(`🎪 ${act.name}`); toast(`🎪 ${act.line}`); }
      if (act.id === 'finale' && t > act.len - dt * 1.5 && watched > SHOW_LENGTH * 0.6) { watched = 0; stats.energy = Math.min(100, stats.energy + 25); ctx.gainXp?.(20); toast('👏 What a show! You feel great: +25 energy, +20 XP.'); }
    } else lastAct = -1;
    for (const h of all) h.root.visible = true;
    for (const b of balls) b.visible = false; uni.visible = false; for (const f of flames) f.visible = false;
    for (const b of bars) b.rotation.z = Math.sin(clock * 1.6 + (b.position.x > 0 ? Math.PI : 0)) * 0.6;
    // everyone not in the current act waits by the curtain
    const backstage = [['ringmaster', -3, 15.8], ['jugA', -2, 16.3], ['jugB', -1, 16.3], ['flyA', 0, 16.3], ['flyB', 1, 16.3], ['clown', 2, 16.3], ['t1', 3, 16.3], ['t2', -4, 16.3], ['t3', 4, 16.3], ['fire', 0, 17]];
    for (const [k, x, z] of backstage) { place(P[k], x, 0, z, Math.PI); pose(P[k], [0, 0.1], [0, -0.1]); }
    const rm = P.ringmaster;
    if (act.id === 'ringmaster' || act.id === 'finale') { place(rm, 0, 0, 2, Math.PI); pose(rm, [-2.6 + Math.sin(clock * 3) * 0.3, 0.3], [-0.4, -0.1]); }
    else { place(rm, -8.5, 0, 0, Math.PI / 2); pose(rm, [0.1, 0.1], [-1.2, -0.2]); }
    if (act.id === 'juggle') {
      place(P.jugA, -1.6, 0, 0, Math.PI / 2); place(P.jugB, 1.6, 0, 0, -Math.PI / 2);
      for (const h of [P.jugA, P.jugB]) pose(h, [-1.2 + Math.sin(clock * 9) * 0.3, 0.1], [-1.2 - Math.sin(clock * 9) * 0.3, -0.1]);
      balls.forEach((b, k) => { b.visible = true; const ph = clock * 2.2 + k / balls.length, u = ph % 1, dirn = Math.floor(ph) % 2 ? 1 : -1; b.position.set(-1.3 * dirn + 2.6 * dirn * u, 1.6 + Math.sin(u * Math.PI) * 2.2, Math.sin(k) * 0.3); });
    }
    if (act.id === 'trapeze') {
      for (const [h, bar] of [[P.flyA, bars[0]], [P.flyB, bars[1]]]) { const a = bar.rotation.z, x = bar.position.x + Math.sin(a) * 4.2, y = 13 - Math.cos(a) * 4.2 - 2.0; h.root.position.set(cx + x, y, cz); h.root.rotation.set(0, Math.PI / 2, 0); h.rig.rotation.set(0, 0, 0); h.root.rotation.z = -a; pose(h, [-3.0, 0.1], [-3.0, -0.1], -0.3, -0.3); }
      // mid-act somersault from one bar to the other
      const k = (t % 6) / 6; if (k > 0.45 && k < 0.6) { const h = P.flyA, u = (k - 0.45) / 0.15; h.root.position.set(cx - 2 + 4 * u, 9.5 + Math.sin(u * Math.PI) * 1.5, cz); h.rig.rotation.x = u * Math.PI * 2; }
    }
    if (act.id === 'clown') {
      const a = clock * 0.9, c = P.clown, x = Math.cos(a) * 5, z = Math.sin(a) * 5; place(c, x, 0.8, z, -a); c.rig.rotation.z = Math.sin(clock * 6) * 0.08;
      pose(c, [-0.3, 1.2 + Math.sin(clock * 5) * 0.4], [-0.3, -1.2 - Math.sin(clock * 5) * 0.4], -0.6 + Math.sin(clock * 8) * 0.5, -0.6 - Math.sin(clock * 8) * 0.5);
      uni.visible = true; uni.position.set(x, 0, z); uni.rotation.y = -a;
    }
    if (act.id === 'pyramid' || act.id === 'finale') {
      const build = act.id === 'finale' ? 1 : Math.min(1, t / 8);
      place(P.t1, -0.7, 0, 0, Math.PI); place(P.t2, 0.7, 0, 0, Math.PI); pose(P.t1, [-2.8, 0], [-2.8, 0]); pose(P.t2, [-2.8, 0], [-2.8, 0]);
      if (build < 1) { place(P.t3, Math.cos(clock * 3) * 3, Math.abs(Math.sin(clock * 6)) * 1.2, Math.sin(clock * 3) * 3, clock); P.t3.rig.rotation.x = clock * 6 % (Math.PI * 2); }
      else { place(P.t3, 0, 1.9, 0, Math.PI); pose(P.t3, [-2.9, 0.4], [-2.9, -0.4]); }
    }
    if (act.id === 'fire') {
      const f = P.fire; place(f, 0, 0, 1.5, Math.PI); pose(f, [-1.5, 0.2], [-0.5, -0.4]);
      const burst = (t % 3) < 1.6;
      flames.forEach((fl, k) => { fl.visible = burst; const u = ((t * 2 + k / flames.length) % 1); fl.position.set(Math.sin(k * 2) * 0.2 * u, 1.85 + u * 0.4, 1.5 - 0.3 - u * 3); fl.scale.setScalar(0.5 + u * 1.6); });
    }
    if (act.id === 'finale') { for (const [k, x] of [['jugA', -3], ['jugB', 3], ['flyA', -4.5], ['flyB', 4.5], ['clown', -1.8], ['fire', 1.8]]) { place(P[k], x, 0, 0.5, Math.PI); pose(P[k], [-2.6, 0.2], [-2.6, -0.2]); P[k].rig.rotation.x = t > 6 ? Math.sin((t - 6) * 2) * 0.4 + 0.3 : 0; } }
    for (const h of [usher, vendor].filter(Boolean)) animatePerson(h, false, dt);
    for (const b of beams) b.rotation.z = -b.position.x * 0.06 + Math.sin(clock * 0.5 + b.position.x) * 0.2;
  }
  return { update, get ticket() { return ticket; }, inside, seats };
}
