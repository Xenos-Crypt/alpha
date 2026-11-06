// Eastern Command: the Aegis Defence Force base just inside the East gate of the dome.
// The military is split into branches, and each one has its own part of the base:
//   * Air Force: a runway, hangars, a control tower and fighter jets you can fly.
//   * Militant Corps: soldiers with awakened powers, blasting targets in the training yard.
//   * Combatant Mech Corps: giant walking mechs, and an exosuit you can wear and take off.
//   * Heavy Infantry: ordinary soldiers with massive weapons (miniguns, rocket launchers,
//     railguns) on the firing range.
//   * Navy: sailors at the naval dock (see addNavyCrew), with the patrol ship and submarine.
import * as THREE from 'three';

export const BASE = { x0: 1260, x1: 1440, z0: -240, z1: 480, gateZ: 120 };

export function buildMilitary(ctx) {
  const { scene, colliders, interactables, civicBuildings, makePerson, animatePerson, makeTex, toast, burst, fxSphere, addAircraft, makeTank, playerPos, playerRig, statSources, destinations } = ctx;
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1 })); return mats.get(k); };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, c, solid = false, parent = scene) => { const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return m; };
  const flat = (w, d, x, z, c, y = 0.05) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c, { rough: 0.95 })); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); scene.add(p); return p; };
  const sign = (text, sub, x, y, z, w, ry = 0, bg = '#2b3320', fg = '#e6e2c4') => {
    const map = makeTex(512, 128, g => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.textAlign = 'center'; g.font = `bold ${sub ? 44 : 54}px sans-serif`; g.fillText(text, 256, sub ? 58 : 80, 490); if (sub) { g.font = '24px sans-serif'; g.fillText(sub, 256, 100, 490); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
  };
  const spot = (x, z, r, label, action, y = 0.5) => { const it = { pos: new THREE.Vector3(x, y, z), r, label, action }; interactables.push(it); return it; };
  const olive = 0x4f5a3a, sand = 0xb8a57a, concrete = 0xa6a8a4, steel = mat(0x6d757c, { metal: 0.6, rough: 0.4 });
  const { x0, x1, z0, z1, gateZ } = BASE;

  // ---------------------------------------------------------------- ground, road, fence
  flat(x1 - x0, z1 - z0, (x0 + x1) / 2, (z0 + z1) / 2, 0x6b6a52, 0.03);
  flat(330, 12, 1097, gateZ, 0x2e3135, 0.06);                         // road in from the town side
  flat(x1 - x0 - 10, 12, (x0 + x1) / 2 + 5, gateZ, 0x2e3135, 0.06);    // main street through the base
  for (let x = 940; x < x1; x += 8) B(3, 0.02, 0.25, x, 0.08, gateZ, 0xf2f2f2);
  const post = (x, z) => B(0.25, 3.2, 0.25, x, 1.6, z, steel);
  const fenceRun = (ax, az, bx, bz) => {   // chain-link fence with barbed wire on top
    const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 4);
    for (let i = 0; i <= n; i++) post(ax + (bx - ax) * i / n, az + (bz - az) * i / n);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, 3), mat(0x9aa0a6, { opacity: 0.35, metal: 0.5 })); panel.material.side = THREE.DoubleSide;
    panel.position.set((ax + bx) / 2, 1.5, (az + bz) / 2); panel.rotation.y = Math.atan2(bx - ax, bz - az) + Math.PI / 2; scene.add(panel);
    const wire = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 4, 8), steel);
    for (let i = 0; i < n * 2; i++) { const w = wire.clone(); w.position.set(ax + (bx - ax) * i / (n * 2), 3.35, az + (bz - az) * i / (n * 2)); w.rotation.y = Math.atan2(bx - ax, bz - az); scene.add(w); }
    colliders.push({ minX: Math.min(ax, bx) - 0.3, maxX: Math.max(ax, bx) + 0.3, minZ: Math.min(az, bz) - 0.3, maxZ: Math.max(az, bz) + 0.3 });
  };
  fenceRun(x0, z0, x1, z0); fenceRun(x0, z1, x1, z1); fenceRun(x1, z0, x1, z1);
  fenceRun(x0, z0, x0, gateZ - 8); fenceRun(x0, gateZ + 8, x0, z1);
  // Gatehouse with a barrier and two guards
  B(5, 3.4, 5, x0 - 2, 1.7, gateZ - 12, concrete, true); B(5.6, 0.4, 5.6, x0 - 2, 3.6, gateZ - 12, olive);
  const barrier = B(14, 0.25, 0.25, x0, 1.1, gateZ, 0xd0281f); barrier.geometry = geo;
  for (let i = 0; i < 7; i += 2) B(1, 0.27, 0.27, x0, 1.1, gateZ - 6 + i * 2, 0xffffff);
  sign('EASTERN COMMAND', 'AEGIS DEFENCE FORCE · ALL BRANCHES', x0 - 6, 6.5, gateZ, 16, -Math.PI / 2);
  for (const s of [-1, 1]) B(0.5, 6.5, 0.5, x0 - 6, 3.25, gateZ + s * 8, steel);
  destinations?.push({ name: 'Eastern Command (military base)', x: x0 - 20, z: gateZ });

  // ---------------------------------------------------------------- people
  const people = [];
  const soldier = (x, z, ry, look = {}, task = 'stand') => {
    const h = makePerson({ outfit: look.outfit ?? olive, pants: look.pants ?? 0x3b4330, hair: 0x1a1a1a, shoes: 0x1a1a1a, skin: [0xffdcc0, 0xd9a07a, 0x8d5a3b, 0xf0c8a0, 0x6b4430][people.length % 5] });
    h.root.position.set(x, 0, z); h.root.rotation.y = ry; scene.add(h.root);
    if (look.helmet !== false) { const helm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(look.helmetColor ?? 0x3b4330)); helm.position.y = 1.86; h.rig.add(helm); }
    const p = { h, task, t: Math.random() * 5, home: new THREE.Vector3(x, 0, z), ry };
    people.push(p); return p;
  };
  soldier(x0 - 4, gateZ - 7, -Math.PI / 2); soldier(x0 - 4, gateZ + 7, -Math.PI / 2);
  spot(x0 - 5, gateZ, 4, 'Talk to the gate guard', () => toast('"Eastern Command. Visitors can look round: Air Force runway north, Militant yard and Mech bay south, the heavy weapons range at the far end. Don\'t touch anything that\'s loaded."'));

  // HQ (enterable: offices inside), barracks, mess hall
  const building = (name, type, x, z, w, d, h, c = concrete) => {
    B(w, h, d, x, h / 2, z, c, true); B(w + 0.6, 0.4, d + 0.6, x, h + 0.2, z, olive);
    sign(name.toUpperCase(), '', x, Math.min(h - 0.8, 4.6), z + d / 2 + 0.06, Math.min(w - 2, 10), 0);
    if (type) civicBuildings?.push({ type, name, x, z, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  };
  building('Command HQ', 'base', 1300, 72, 26, 16, 9);
  building('Barracks', 'dormitory', 1360, 72, 30, 12, 6);
  building('Mess hall', 'restaurant', 1415, 72, 20, 12, 5);
  const flagPole = B(0.15, 12, 0.15, 1300, 6, 92, steel);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8), new THREE.MeshStandardMaterial({ map: makeTex(96, 64, g => { g.fillStyle = '#2b3320'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#e6c84a'; g.beginPath(); g.arc(48, 32, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2b3320'; g.beginPath(); g.arc(48, 32, 11, 0, Math.PI * 2); g.fill(); }), side: THREE.DoubleSide }));
  flag.position.set(1301.6, 11, 92); scene.add(flag);
  // Drill squad marching up and down the parade square
  const drill = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) drill.push(soldier(1330 + c * 2, 100 + r * 2, Math.PI / 2, {}, 'march'));
  const sergeant = soldier(1326, 102, Math.PI / 2, { outfit: 0x3b4330 });
  spot(1326, 102, 3, 'Talk to the drill sergeant', () => toast('"LEFT, RIGHT, LEFT! You want to join up? Air Force, Militants, Mechs, Heavy Infantry or the Navy down at the dock. Pick one and stop slouching!"'));

  // ---------------------------------------------------------------- AIR FORCE
  flat(30, 290, 1405, -95, 0x3a3d40, 0.07);
  for (let z = -225; z < 45; z += 14) B(0.6, 0.02, 7, 1405, 0.09, z, 0xf2f2f2);
  for (const s of [-1, 1]) for (let z = -235; z < 50; z += 10) { const l = B(0.4, 0.3, 0.4, 1405 + s * 15.5, 0.15, z, mat(0x2dd4ff, { emissive: 0x2dd4ff, ei: 1.5 })); }
  sign('AIR FORCE', 'RUNWAY 36 · FIGHTER SQUADRON', 1405, 5, -236, 12, Math.PI, '#1d2a3a', '#cfe3ff');
  const hangar = (x, z) => {
    B(30, 10, 0.5, x, 5, z - 13, concrete, true); B(30, 10, 0.5, x, 5, z + 13, concrete, true); B(0.5, 10, 26, x - 15, 5, z, concrete, true);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 26.5, 20, 1, false, -Math.PI / 2, Math.PI), mat(0x6b7280, { metal: 0.4 })); roof.rotation.x = Math.PI / 2; roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.3); roof.position.set(x, 10, z); scene.add(roof);
    flat(30, 26, x, z, 0x555a5e, 0.08);
  };
  hangar(1325, -200); hangar(1325, -160);
  // Control tower
  B(5, 18, 5, 1350, 9, -110, concrete, true);
  B(8, 3, 8, 1350, 19.5, -110, mat(0x1d2a33, { metal: 0.5, rough: 0.2, opacity: 0.7 }));
  B(8.6, 0.4, 8.6, 1350, 21.2, -110, olive);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 })); beacon.position.set(1350, 22, -110); scene.add(beacon);
  const radar = new THREE.Group(); radar.position.set(1350, 22.2, -110); scene.add(radar); B(3, 1.2, 0.15, 0, 0.6, 0, steel, false, radar);
  const jets = [];
  if (addAircraft) {
    jets.push(addAircraft({ name: 'Air Force fighter', color: 0x5a6570, accent: 0x2b3320, maxSpeed: 130, takeoff: 30, turn: 1.15, jet: true, home: [1405, -215] }));
    jets.push(addAircraft({ name: 'Stealth fighter', color: 0x22262b, accent: 0x111111, maxSpeed: 140, takeoff: 32, turn: 1.2, jet: true, home: [1328, -200] }));
    jets.push(addAircraft({ name: 'Military transport', color: 0x6b7060, accent: 0x3b4330, maxSpeed: 60, takeoff: 26, turn: 0.75, jet: false, home: [1328, -160] }));
  }
  for (const [x, z] of [[1312, -205], [1314, -195], [1312, -164]]) soldier(x, z, Math.PI / 2, { outfit: 0x5a6a7a, pants: 0x3a4a5a, helmet: false }, 'idle');
  spot(1350, -104, 4, 'Talk to air traffic control', () => toast('"Tower here. The fighter on runway 36 is fuelled — climb in, full throttle, pull up at take-off speed. The stealth fighter and transport are in the hangars. Bring them back in one piece."'));
  spot(1312, -200, 3, 'Talk to the fighter pilots', () => toast('"Air Force, 1st Fighter Squadron. We patrol the inside of the dome and back up the hunters when a gate breaks. Best job in the forces."'));

  // ---------------------------------------------------------------- MILITANT CORPS (soldiers with powers)
  flat(56, 44, 1310, 210, sand, 0.08);
  sign('MILITANT CORPS', 'AWAKENED SOLDIERS · POWERS TRAINING', 1310, 5, 186, 12, 0, '#3a1d4a', '#f2d6ff');
  for (const s of [-1, 1]) B(0.4, 5, 0.4, 1310 + s * 6, 2.5, 186, steel);
  const dummies = [];
  for (let k = 0; k < 4; k++) {
    const z = 196 + k * 9, x = 1334;
    B(0.3, 1.6, 0.3, x, 0.8, z, 0x5a3d26);
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 16), mat(0xf2f2f2)); board.rotation.z = Math.PI / 2; board.position.set(x, 1.8, z); scene.add(board);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.17, 16), mat(0xd0281f)); ring.rotation.z = Math.PI / 2; ring.position.set(x, 1.8, z); scene.add(ring);
    dummies.push(new THREE.Vector3(x, 1.8, z));
  }
  const POWERS = [[0xff5a1f, 'fire'], [0x5fc9f3, 'water'], [0x9fffe6, 'wind'], [0xffe14a, 'lightning']];
  const auraTex = makeTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const militants = POWERS.map(([c, kind], k) => {
    const p = soldier(1300, 196 + k * 9, Math.PI / 2, { outfit: 0x2a1d3a, pants: 0x1a1424, helmet: false }, 'cast');
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); aura.scale.set(2.2, 3, 1); aura.position.y = 1.1; p.h.root.add(aura);
    p.color = c; p.kind = kind; p.aura = aura; p.target = dummies[k]; p.cd = 1 + k * 0.7;
    return p;
  });
  spot(1298, 210, 4, 'Talk to the Militant commander', () => toast('"Militant Corps. Every one of us awakened a power — fire, water, wind, lightning — and chose to serve. We hold the line when a dungeon break is too much for the hunters."'));

  // ---------------------------------------------------------------- COMBATANT MECH CORPS
  flat(70, 60, 1370, 330, 0x55595c, 0.08);
  sign('COMBATANT MECH CORPS', 'HEAVY BOT MACHINERY · EXOSUITS', 1340, 6, 298, 14, 0, '#2a2f36', '#ffb347');
  for (const s of [-1, 1]) B(0.4, 6, 0.4, 1340 + s * 7, 3, 298, steel);
  // Mech bay shed (open front)
  B(0.5, 14, 30, 1305, 7, 335, concrete, true); B(30, 14, 0.5, 1320, 7, 350, concrete, true); B(31, 0.5, 31, 1320, 14.2, 335, olive);
  const makeMech = (color = 0x6b7280) => {
    const g = new THREE.Group(), m = mat(color, { metal: 0.5, rough: 0.45 }), dark = mat(0x2a2f36, { metal: 0.4 }), glow = mat(0xffb347, { emissive: 0xffb347, ei: 2 });
    const torso = B(3.2, 2.6, 2.4, 0, 6.4, 0, m, false, g); B(2.0, 0.6, 0.1, 0, 6.9, 1.22, glow, false, g);   // cockpit visor
    B(2.4, 1.2, 2.0, 0, 7.9, -0.1, dark, false, g);
    const leg = s => { const hip = new THREE.Group(); hip.position.set(s * 1.1, 5.1, 0); g.add(hip); B(0.9, 2.6, 1.0, 0, -1.3, 0, dark, false, hip); const knee = new THREE.Group(); knee.position.y = -2.6; hip.add(knee); B(1.0, 2.4, 1.1, 0, -1.2, 0.1, m, false, knee); B(1.4, 0.4, 2.0, 0, -2.4, 0.3, dark, false, knee); return { hip, knee }; };
    const arm = s => { const sh = new THREE.Group(); sh.position.set(s * 2.0, 7.2, 0); g.add(sh); B(1.0, 1.0, 1.0, 0, 0, 0, dark, false, sh); B(0.8, 2.4, 0.8, s * 0.2, -1.4, 0, m, false, sh); const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.2, 10), dark); gun.rotation.x = Math.PI / 2; gun.position.set(s * 0.2, -2.7, 0.8); sh.add(gun); return sh; };
    const legs = [leg(-1), leg(1)], arms = [arm(-1), arm(1)];
    scene.add(g);
    return { g, legs, arms, phase: Math.random() * 6 };
  };
  const parked = [makeMech(0x6b7280), makeMech(0x8a6b3a)];
  parked[0].g.position.set(1312, 0, 325); parked[0].g.rotation.y = Math.PI / 2;
  parked[1].g.position.set(1312, 0, 342); parked[1].g.rotation.y = Math.PI / 2;
  for (const pm of parked) colliders.push({ minX: pm.g.position.x - 2, maxX: pm.g.position.x + 2, minZ: pm.g.position.z - 2, maxZ: pm.g.position.z + 2 });
  // Two mechs patrol a loop round the bay
  const route = [[1350, 310], [1420, 310], [1420, 370], [1350, 370]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const walkers = [makeMech(0x4f5a3a), makeMech(0x5a6570)].map((m, k) => { m.leg = k * 2; m.g.position.copy(route[k * 2]); return m; });
  // Exosuit rack: a wearable suit
  const rack = new THREE.Group(); rack.position.set(1340, 0, 345); scene.add(rack);
  B(2.4, 0.2, 1.6, 0, 0.1, 0, steel, false, rack); B(0.2, 3, 0.2, 0, 1.5, -0.6, steel, false, rack);
  const rackSuit = new THREE.Group(); rack.add(rackSuit);
  const suitMat = mat(0x8a6b3a, { metal: 0.6, rough: 0.35 }), suitDark = mat(0x2a2f36, { metal: 0.5 }), suitGlow = mat(0x22e5ff, { emissive: 0x22e5ff, ei: 2 });
  B(0.9, 1.0, 0.6, 0, 1.45, 0, suitMat, false, rackSuit); B(0.5, 0.5, 0.5, 0, 2.15, 0, suitDark, false, rackSuit); B(0.42, 0.12, 0.05, 0, 2.18, 0.26, suitGlow, false, rackSuit);
  colliders.push({ minX: 1338.6, maxX: 1341.4, minZ: 344, maxZ: 346 });
  for (const [x, z] of [[1332, 330], [1332, 336]]) soldier(x, z, -Math.PI / 2, { outfit: 0x2a2f36, pants: 0x1a1d22, helmetColor: 0xffb347 }, 'idle');
  spot(1333, 333, 3, 'Talk to the mech engineer', () => toast('"Combatant Mech Corps. The big ones are crewed walkers with autocannons. The exosuit on the rack is yours if you want it: twice the punch, takes hits like a tank, a bit slow. Press E at the rack to suit up, J to take it off."'));

  // Wearing the exosuit: armour pieces go on your body and change your stats.
  let wearing = false; const worn = [];
  const suitStats = { get dmg() { return wearing ? 2.2 : 1; }, get def() { return wearing ? 0.35 : 1; }, get speed() { return wearing ? 0.8 : 1; } };
  statSources?.push(suitStats);
  function suitUp() {
    const h = playerRig(); if (!h || wearing) return;
    const add = (parent, w, hgt, d, x, y, z, m) => worn.push(B(w, hgt, d, x, y, z, m, false, parent));
    add(h.rig, 0.62, 0.7, 0.46, 0, 1.3, 0, suitMat); add(h.rig, 0.7, 0.18, 0.5, 0, 1.6, 0, suitDark);          // chest plate, collar
    add(h.rig, 0.44, 0.42, 0.44, 0, 1.84, 0, suitDark); add(h.rig, 0.34, 0.09, 0.05, 0, 1.86, 0.22, suitGlow);  // helmet and visor
    add(h.rig, 0.5, 0.5, 0.3, 0, 1.35, -0.34, suitDark);                                                        // power pack
    for (const a of [h.armL, h.armR]) { add(a.pivot, 0.3, 0.32, 0.32, 0, -0.05, 0, suitMat); add(a.pivot, 0.22, 0.5, 0.22, 0, -0.45, 0, suitDark); }
    for (const l of [h.legL, h.legR]) { add(l.pivot, 0.24, 0.5, 0.26, 0, -0.3, 0, suitMat); add(l.pivot, 0.24, 0.45, 0.26, 0, -0.75, 0.02, suitDark); }
    wearing = true; rackSuit.visible = false;
    toast('🦾 Exosuit on: ×2.2 damage, take 65% less damage, 20% slower. Press J to take it off.');
  }
  function takeOff() {
    if (!wearing) return false;
    for (const m of worn) m.removeFromParent(); worn.length = 0;
    wearing = false; rackSuit.visible = true;
    toast('You take off the exosuit' + (Math.hypot(playerPos().x - 1340, playerPos().z - 345) < 6 ? ' and hang it back on the rack.' : '. It folds itself up and flies back to the mech bay.'));
    return true;
  }
  spot(1340, 347.4, 2.4, 'Suit up in the exosuit', () => wearing ? takeOff() : suitUp());

  // ---------------------------------------------------------------- HEAVY INFANTRY firing range
  flat(150, 50, 1360, 440, 0x7a6a4a, 0.08);
  sign('HEAVY INFANTRY RANGE', 'MINIGUNS · ROCKETS · RAILGUNS', 1288, 5, 412, 12, -Math.PI / 2, '#3a2a1a', '#ffd23f');
  B(1.2, 1.2, 40, 1292, 0.6, 440, 0x8a7a5a, true);   // sandbag firing line
  for (let z = 422; z <= 458; z += 1.2) B(1.0, 0.4, 1.1, 1292, 1.4, z, 0x9a8a62);
  const berm = B(6, 8, 50, 1436, 4, 440, 0x6b5a3a, true);
  const rangeTargets = [];
  for (let k = 0; k < 5; k++) {
    const t = new THREE.Vector3(1420, 1.5, 424 + k * 8);
    B(0.3, 3, 2, t.x, 1.5, t.z, 0x8a8a8a); B(0.32, 1.2, 1.2, t.x - 0.02, 2, t.z, 0xd0281f);
    rangeTargets.push(t);
  }
  const WEAPONS = [
    { name: 'minigun', rate: 0.06, burst: 30, pause: 3, speed: 260, color: 0xffd23f, boom: false },
    { name: 'rocket launcher', rate: 1, burst: 1, pause: 4, speed: 70, color: 0xff7a1f, boom: true },
    { name: 'railgun', rate: 1, burst: 1, pause: 5, speed: 900, color: 0x5fd4ff, boom: true, beam: true },
    { name: 'minigun', rate: 0.06, burst: 25, pause: 3.5, speed: 260, color: 0xffd23f, boom: false },
  ];
  const weaponMesh = w => {
    const g = new THREE.Group(), dark = mat(0x22262b, { metal: 0.6, rough: 0.35 });
    if (w.name === 'minigun') { for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), dark); const a = i / 6 * Math.PI * 2; b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.65); g.add(b); } B(0.35, 0.35, 0.5, 0, 0, 0, dark, false, g); B(0.3, 0.4, 0.3, 0.25, -0.15, -0.2, mat(0x4f5a3a), false, g); }
    else if (w.name === 'rocket launcher') { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 10), mat(0x3b4330)); t.rotation.x = Math.PI / 2; t.position.z = 0.3; g.add(t); }
    else { B(0.16, 0.22, 1.9, 0, 0, 0.5, dark, false, g); for (const s of [-1, 1]) B(0.04, 0.3, 1.6, s * 0.1, 0, 0.6, mat(0x5fd4ff, { emissive: 0x5fd4ff, ei: 1.5 }), false, g); }
    return g;
  };
  const gunners = WEAPONS.map((w, k) => {
    const p = soldier(1290, 426 + k * 9, Math.PI / 2, { outfit: 0x3b4330 }, 'fire');
    p.gun = weaponMesh(w); p.gun.position.set(0.18, 1.25, 0.35); p.gun.scale.setScalar(1 / 0.9); p.h.root.add(p.gun);
    p.weapon = w; p.target = rangeTargets[k]; p.cd = 1 + k; p.shots = 0; p.spin = 0;
    return p;
  });
  spot(1286, 440, 4, 'Talk to the range master', () => toast('"Heavy Infantry: no powers, no mechs, just very big guns. Miniguns, rocket launchers and railguns. Ear defenders on, stay behind the line."'));

  // Tanks parked by the motor pool
  makeTank?.(1395, 160, Math.PI); makeTank?.(1410, 160, Math.PI);

  // ---------------------------------------------------------------- shots and blasts
  const shots = [];
  const tracerGeo = new THREE.BoxGeometry(0.06, 0.06, 1.4), orbGeo = new THREE.SphereGeometry(0.35, 10, 8);
  function fire(from, to, color, speed, { orb = false, boom = false, beam = false } = {}) {
    const m = new THREE.Mesh(orb ? orbGeo : tracerGeo, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    m.position.copy(from); m.lookAt(to); scene.add(m);
    if (beam) { m.scale.z = from.distanceTo(to) / 1.4; m.position.lerpVectors(from, to, 0.5); shots.push({ m, beam: true, life: 0.25, to: to.clone(), boom, color }); return; }
    shots.push({ m, to: to.clone(), dir: to.clone().sub(from).normalize(), speed, left: from.distanceTo(to), boom, color });
  }

  // ---------------------------------------------------------------- per frame
  let t = 0;
  const near = () => { const p = playerPos(); return p.x > x0 - 260 && p.x < x1 + 120 && p.z > z0 - 200 && p.z < z1 + 200; };
  const tmp = new THREE.Vector3();
  function update(dt) {
    t += dt;
    flag.rotation.y = Math.sin(t * 1.3) * 0.25;
    if (!near()) return;
    radar.rotation.y += dt * 1.5;
    beacon.visible = (t % 1.2) < 0.4;
    // drill squad: march back and forth across the square
    const march = Math.sin(t * 0.25) * 12, dir = Math.cos(t * 0.25) >= 0 ? 1 : -1;
    for (let i = 0; i < drill.length; i++) { const d = drill[i]; d.h.root.position.x = d.home.x + march; d.h.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; animatePerson(d.h, true, dt); }
    sergeant.h.root.position.x = sergeant.home.x + march - 4 * dir;
    sergeant.h.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; animatePerson(sergeant.h, true, dt);
    for (const p of people) if (p.task === 'stand' || p.task === 'idle') animatePerson(p.h, false, dt);
    // militants: charge up (aura grows), then throw a power blast at their target
    for (const p of militants) {
      animatePerson(p.h, false, dt);
      p.cd -= dt;
      const charge = Math.max(0, 1 - p.cd / 2.5);
      p.aura.material.opacity = 0.35 + charge * 0.6; p.aura.scale.set(2.2 + charge * 1.2, 3 + charge * 1.2, 1);
      p.h.armR.pivot.rotation.x = -0.4 - charge * 1.2; p.h.armL.pivot.rotation.x = -0.4 - charge * 1.2;
      if (p.cd <= 0) {
        p.cd = 2.5 + Math.random() * 1.5;
        tmp.copy(p.h.root.position); tmp.y += 1.4; tmp.x += 0.6;
        if (p.kind === 'lightning') fire(tmp, p.target, p.color, 0, { beam: true, boom: true });
        else fire(tmp, p.target, p.color, p.kind === 'wind' ? 45 : 32, { orb: true, boom: true });
      }
    }
    // gunners
    for (const p of gunners) {
      animatePerson(p.h, false, dt);
      p.h.armR.pivot.rotation.x = -1.3; p.h.armL.pivot.rotation.x = -1.2; p.h.armL.pivot.rotation.z = -0.35;
      if (p.weapon.name === 'minigun') { p.spin = Math.max(0, p.spin - dt * 2); p.gun.rotation.z += p.spin * dt * 40; }
      p.cd -= dt;
      if (p.cd <= 0) {
        const w = p.weapon;
        p.gun.getWorldPosition(tmp); tmp.x += 1.2;
        const aim = p.target.clone().add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8));
        fire(tmp, aim, w.color, w.speed, { boom: w.boom, beam: w.beam });
        if (w.name === 'minigun') p.spin = 1;
        p.shots++;
        if (p.shots >= w.burst) { p.shots = 0; p.cd = w.pause + Math.random(); } else p.cd = w.rate;
      }
    }
    // walking mechs: stomp round the loop
    for (const m of walkers) {
      const target = route[(m.leg + 1) % route.length], pos = m.g.position;
      tmp.subVectors(target, pos); tmp.y = 0;
      const d = tmp.length();
      if (d < 1) m.leg = (m.leg + 1) % route.length;
      else { tmp.normalize(); pos.addScaledVector(tmp, Math.min(d, 3.2 * dt)); const want = Math.atan2(tmp.x, tmp.z); m.g.rotation.y += Math.atan2(Math.sin(want - m.g.rotation.y), Math.cos(want - m.g.rotation.y)) * Math.min(1, dt * 2); }
      m.phase += dt * 2.6;
      const s = Math.sin(m.phase);
      m.legs[0].hip.rotation.x = s * 0.45; m.legs[1].hip.rotation.x = -s * 0.45;
      m.legs[0].knee.rotation.x = Math.max(0, -s) * 0.6; m.legs[1].knee.rotation.x = Math.max(0, s) * 0.6;
      m.arms[0].rotation.x = -s * 0.2; m.arms[1].rotation.x = s * 0.2;
      m.g.position.y = Math.abs(Math.cos(m.phase)) * 0.25;
    }
    for (const m of parked) m.phase += dt;
    // shots in flight
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      let done = false;
      if (s.beam) { s.life -= dt; s.m.material.opacity = 1; done = s.life <= 0; }
      else { const step = s.speed * dt; s.m.position.addScaledVector(s.dir, step); s.left -= step; done = s.left <= 0; }
      if (done) {
        if (s.boom) { fxSphere?.(s.to, s.color, 1.6, 0.3); burst?.(s.to, 14, [s.color, 0xffffff, 0x555555], 6, 0.18, 0.5); }
        else if (Math.random() < 0.3) burst?.(s.to, 3, [0xffd23f, 0x8a7a5a], 3, 0.1, 0.25);
        s.m.removeFromParent(); s.m.material.dispose(); shots.splice(i, 1);
      }
    }
  }
  return { update, takeOff, get wearing() { return wearing; }, jets };
}

// Navy sailors and an officer at the naval dock.
export function addNavyCrew({ scene, interactables, makePerson, toast, dock = { x: -235, z: 228 } }) {
  const sailors = [];
  for (let i = 0; i < 4; i++) {
    const h = makePerson({ outfit: 0x1d2a4a, pants: 0x1d2a4a, hair: 0x2b1d14, shoes: 0x111111 });
    h.root.position.set(dock.x - 12 + i * 2.2, 0.5, dock.z - 4); h.root.rotation.y = Math.PI; scene.add(h.root);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xffffff })); cap.position.y = 2.0; h.rig.add(cap);
    sailors.push(h);
  }
  interactables.push({ pos: new THREE.Vector3(dock.x - 8, 0.8, dock.z - 4), r: 3.5, label: 'Talk to the navy officer', action: () => toast('"Aegis Navy. We crew the patrol ship and the submarine — go aboard from the end of the pier. The rest of the forces are at Eastern Command, inside the East gate: Air Force, Militant Corps, Mech Corps and Heavy Infantry."') });
  return {
    update(dt, animatePerson) { for (const h of sailors) animatePerson(h, false, dt); },
  };
}
