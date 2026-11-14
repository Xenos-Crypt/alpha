import { marketStall, setStallScene } from './market-stalls.js';
// The Narrows: the dark side of the country, a maze of grimy back alleys on the far west
// edge of the dome. Dealers sell illegal weapons (permanent damage bonus) and street stims
// (fictional drugs: a strong boost for a minute, then a nasty comedown). Every deal risks a
// tip-off to the police, and a forger can wipe your wanted level for a price.
import * as THREE from 'three';

export const NARROWS = { x: -1010, z: 50 };

export const WEAPONS = [
  { name: 'Switchblade', icon: '🔪', price: 60, dmg: 0.10, desc: '+10% damage, permanently' },
  { name: 'Sawn-off shotgun', icon: '💥', price: 220, dmg: 0.25, desc: '+25% damage, permanently' },
  { name: 'Smuggled assault rifle', icon: '🔫', price: 600, dmg: 0.45, desc: '+45% damage, permanently' },
  { name: 'Stolen military railgun', icon: '⚡', price: 2000, dmg: 0.8, desc: '+80% damage, permanently' },
];
// Fictional street drugs. Strong for 60 seconds, then a comedown.
export const STIMS = [
  { name: 'Red Haze', icon: '🩸', price: 45, boost: { dmg: 1.35 }, comedown: { energy: -25 }, desc: '+35% damage for 60s. Comedown: −25 energy' },
  { name: 'Quicksilver', icon: '💨', price: 45, boost: { speed: 1.35 }, comedown: { hunger: -25 }, desc: '+35% speed for 60s. Comedown: −25 hunger' },
  { name: 'Ironskin', icon: '🪨', price: 60, boost: { def: 0.6 }, comedown: { slow: 20 }, desc: 'Take 40% less damage for 60s. Comedown: slowed for 20s' },
  { name: 'Blue Lotus', icon: '🪷', price: 30, instant: { energy: 100 }, comedown: { hp: -15 }, desc: 'Full energy at once. Comedown: −15 health' },
];

export function buildBlackMarket({ openVehicleShop, openPropertyShop, forgeLicence, hasLicence, scene, colliders, interactables, sitSpots, makePerson, animatePerson, makeTex, groundY, toast, openMenu, raiseWanted, stats, destinations }) {
  const { x: CX, z: CZ } = NARROWS, Y = groundY(CX, CZ);
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.9, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null })); return mats.get(k); };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, m, solid = false, ry = 0) => { const b = new THREE.Mesh(geo, m instanceof THREE.Material ? m : mat(m)); b.scale.set(w, h, d); b.position.set(x, Y + y, z); b.rotation.y = ry; scene.add(b); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return b; };
  const grime = makeTex(128, 256, g => { g.fillStyle = '#2a2622'; g.fillRect(0, 0, 128, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; g.fillRect(Math.random() * 128, Math.random() * 256, 3 + Math.random() * 9, 3 + Math.random() * 9); } g.fillStyle = '#4a3a2a'; for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) if (Math.random() < 0.75) g.fillRect(12 + c * 40, 14 + r * 35, 22, 20); });
  grime.wrapS = grime.wrapT = THREE.RepeatWrapping;
  const wallMat = mat(0xffffff, { map: grime });
  const tag = (text, colour) => makeTex(256, 96, g => { g.clearRect(0, 0, 256, 96); g.fillStyle = colour; g.font = 'italic bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 48); });
  const decal = (text, colour, x, y, z, ry, w = 3) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 256), new THREE.MeshBasicMaterial({ map: tag(text, colour), transparent: true, depthWrite: false })); m.position.set(x, Y + y, z); m.rotation.y = ry; scene.add(m); return m; };

  // ---- the maze: blocks of run-down buildings with narrow alleys between them ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(190, 420), mat(0x1c1b1a)); ground.rotation.x = -Math.PI / 2; ground.position.set(CX, Y + 0.03, CZ); scene.add(ground);
  const blocks = [];
  for (let i = -2; i <= 2; i++) for (let j = -4; j <= 4; j++) {
    if (i === 0 && Math.abs(j) <= 1) continue;   // the market square in the middle
    const bx = CX + i * 34, bz = CZ + j * 44, w = 24 + (j * 7 + i * 3) % 5, d = 32 + (i * 5 + j) % 6, h = 7 + ((i * 13 + j * 7) % 4 + 4) % 4 * 3;
    const m = B(w, h, d, bx, h / 2, bz, wallMat, true); grime.repeat.set(2, 2);
    blocks.push(m);
    B(w + 0.4, 0.5, d + 0.4, bx, h + 0.25, bz, 0x1a1816);   // roof lip
  }
  // street clutter: burning barrels, crates, dumpsters, flickering signs, graffiti
  const fires = [], flicker = [];
  const barrel = (x, z) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 10), mat(0x5a3a22)); b.position.set(x, Y + 0.5, z); scene.add(b);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0.85 })); f.position.set(x, Y + 1.35, z); scene.add(f); fires.push(f);
    colliders.push({ circleX: x, circleZ: z, circleRadius: 0.5, minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  };
  for (const [x, z] of [[-8, -10], [9, 12], [-17, 30], [17, -34], [-6, 60], [6, -66], [-17, -90], [17, 100]]) barrel(CX + x, CZ + z);
  for (const [x, z] of [[-11, 18], [12, -20], [-12, -44], [11, 52]]) B(3, 1.6, 1.6, CX + x, 0.8, CZ + z, 0x2f4a2f, true);   // dumpsters
  const neons = [['THE NARROWS', '#ff2b4a'], ['NO COPS', '#22ff88'], ['CASH ONLY', '#ffd23f'], ['DON\'T ASK', '#00e5ff']];
  neons.forEach(([t, c], k) => { const s = decal(t, c, CX + (k % 2 ? 4.95 : -4.95), 4.2, CZ + (k - 1.5) * 26, k % 2 ? -Math.PI / 2 : Math.PI / 2, 4); flicker.push(s); });
  for (const [t, c, x, z, ry] of [['GHOSTS RUN THIS', '#d9d9d9', -5, -48, Math.PI / 2], ['☠', '#ff2bd6', 5, 70, -Math.PI / 2], ['VIKTOR WAS HERE', '#ffa21f', -5, 88, Math.PI / 2]]) decal(t, c, CX + x, 2, CZ + z, ry, 3.5);
  // A sign at the entrance off the open land, so you can find it
  const entrance = decal('⚠ THE NARROWS ⚠', '#ff2b4a', CX + 40, 5, CZ - 220, Math.PI, 8);
  const lamp = new THREE.PointLight(0xff3b2a, 1.4, 30, 1.6); lamp.position.set(CX, Y + 5, CZ); scene.add(lamp);

  // ---- market stalls in the square ----
  const stall = (x, z, ry, colour) => {
    const titles = { 0x3a0f0f: ['ARMOURY', 'no questions'], 0x0f2a1a: ['STIMS', 'feel better'], 0x1a1a3a: ['PAPERS', 'any name'], 0x2a2a2a: ['WHEELS', 'cash only'] }[colour] || ['', ''];
    if (marketStall) { setStallScene(scene); const s = marketStall({ x, y: Y, z, ry: ry + Math.PI, colour: colour + 0x202020, goods: 'dark', dark: true, title: titles[0], sub: titles[1] }); colliders.push({ minX: x - 1.8, maxX: x + 1.8, minZ: z - 1.2, maxZ: z + 1.2 }); return s; }
    const g = new THREE.Group(); g.position.set(x, Y, z); g.rotation.y = ry; scene.add(g);
    for (const [w, h, d, px, py, pz, c] of [[3.2, 1.0, 1.2, 0, 0.5, 0.3, 0x3a2a1a], [3.4, 0.08, 2.2, 0, 2.4, 0, colour], [0.1, 2.4, 0.1, -1.6, 1.2, -0.8, 0x222222], [0.1, 2.4, 0.1, 1.6, 1.2, -0.8, 0x222222], [0.1, 2.4, 0.1, -1.6, 1.2, 0.9, 0x222222], [0.1, 2.4, 0.1, 1.6, 1.2, 0.9, 0x222222]]) { const p = new THREE.Mesh(geo, mat(c)); p.scale.set(w, h, d); p.position.set(px, py, pz); g.add(p); }
    colliders.push({ minX: x - 1.8, maxX: x + 1.8, minZ: z - 1.2, maxZ: z + 1.2 });
    return g;
  };
  const dealers = [];
  const dealer = (x, z, ry, outfit, label, action) => {
    const h = makePerson?.({ outfit, pants: 0x111111, hair: 0x111111, skin: [0xd9a07a, 0x8d5a3b, 0xffdcc0][dealers.length % 3] });
    if (h) { h.root.position.set(x, Y, z); h.root.rotation.y = ry; scene.add(h.root); dealers.push(h); }
    // hood
    if (h) { const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(outfit)); hood.position.y = 1.62; hood.scale.set(1.1, 1.15, 1.2); h.root.add(hood); }
    const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    interactables.push({ pos: new THREE.Vector3(x + f.x * 1.6, Y + 1, z + f.z * 1.6), r: 2.2, label, action });
  };
  // Every deal risks a tip-off.
  const risk = (p, what) => { if (Math.random() < p) { raiseWanted(50); toast(`🚨 Someone tipped off the police about the ${what}! Lose them, or pay the forger.`); } };
  const owned = new Set();
  const weaponItems = WEAPONS.map(w => ({ ...w, owned: () => owned.has(w.name), onBuy: s => { if (stats.gold < s.price) return false; owned.add(s.name); toast(`${s.icon} You buy the ${s.name.toLowerCase()}. ${s.desc}. Keep it out of sight.`); risk(0.3, 'weapon deal'); } }));
  stall(CX - 6, CZ - 6, Math.PI / 2, 0x3a0f0f); dealer(CX - 8.2, CZ - 6, Math.PI / 2, 0x2a2a2a, 'Talk to Viktor (illegal weapons)', () => openMenu('Viktor\'s back-room armoury', weaponItems));

  let active = [];   // { name, boost, t, comedown }
  let slowT = 0;
  const stimItems = STIMS.map(s => ({ ...s, onBuy: it => {
    if (stats.gold < it.price) return false;
    if (it.instant?.energy) stats.energy = Math.min(100, stats.energy + it.instant.energy);
    if (it.boost) { active = active.filter(a => a.name !== it.name); active.push({ name: it.name, boost: it.boost, t: 60, comedown: it.comedown }); }
    else applyComedown(it.comedown, it.name);
    toast(`${it.icon} ${it.name}: ${it.desc}.`);
    risk(0.2, 'drug deal');
  } }));
  stall(CX + 6, CZ + 6, -Math.PI / 2, 0x0f2a1a); dealer(CX + 8.2, CZ + 6, -Math.PI / 2, 0x1f3a2a, 'Talk to Doc Sable (street stims)', () => openMenu('Doc Sable\'s stims', stimItems));

  // Ink also forges licences: instant, no test, no queue. Works until a proper check spots it.
  const FAKES = [['driving', 'Fake driving licence', '🚗', 250], ['firearms', 'Fake firearms licence', '🔫', 220], ['pilot', 'Fake pilot licence', '✈️', 400], ['boat', 'Fake boat licence', '⛵', 120], ['motorbike', 'Fake motorbike licence', '🏍️', 110], ['business', 'Fake trading licence', '🏪', 160]];
  const fakeItems = FAKES.map(([id, name, icon, price]) => ({ name, icon, price, desc: 'Instant, no test. Police or clerks may spot it.', owned: () => !!hasLicence?.(id), onBuy: s => { if (stats.gold < s.price) return false; forgeLicence?.(id); toast(`${icon} ${name}: it looks perfect. Mostly. Don't hand it to anyone who checks properly.`); risk(0.1, 'forged documents'); } }));
  const forger = [...fakeItems, { name: 'Clean record (fake papers)', icon: '📄', price: 150, desc: 'Wipes your wanted level', onBuy: s => { if (stats.gold < s.price) return false; window.dispatchEvent(new CustomEvent('aw-clear-wanted')); toast('📄 New papers, new face. The police lose interest in you.'); } },
    { name: 'Hot-wire kit', icon: '🔧', price: 80, desc: 'Lockpicks and a scanner. (For show. Mostly.)', onBuy: s => { if (stats.gold < s.price) return false; toast('🔧 A hot-wire kit. You feel like a criminal mastermind.'); risk(0.1, 'stolen gear'); } }];
  stall(CX + 6, CZ - 10, -Math.PI / 2, 0x1a1a3a); dealer(CX + 8.2, CZ - 10, -Math.PI / 2, 0x2a2a4a, 'Talk to Ink (forged licences and papers)', () => openMenu('Ink the forger', forger));
  // Razor's chop shop: stolen cars and bikes, re-sprayed with fake plates, about half price.
  stall(CX - 6, CZ + 14, Math.PI / 2, 0x2a2a2a); dealer(CX - 8.2, CZ + 14, Math.PI / 2, 0x3a2a1a, "Talk to Razor (stolen vehicles, chop shop)", () => {
    let spot = 0;
    openVehicleShop?.("Razor's Chop Shop", ['Hatchback', 'Saloon', 'SUV', 'Sports car', 'Supercar', 'Electric', 'Pickup', 'Bicycle', 'Motorbike'], v => { const x = CX - 10 + (spot++ % 5) * 5, z = CZ + 34; v.group.position.set(x, Y, z); v.group.rotation.y = Math.PI; }, { priceMult: 0.55, illegal: true });
    risk(0.12, 'stolen car deal');
  });
  // Fixer: unregistered hideouts (see property.js)
  stall(CX + 6, CZ + 22, -Math.PI / 2, 0x1a1a1a); dealer(CX + 8.2, CZ + 22, -Math.PI / 2, 0x111111, 'Talk to the Fixer (off-the-books property)', () => openPropertyShop?.('illegal'));
  // Lookouts watching the alleys
  for (const [x, z, ry] of [[0, -30, 0], [0, 30, Math.PI], [-10, 75, Math.PI / 2], [10, -80, -Math.PI / 2]]) dealer(CX + x, CZ + z, ry, 0x1a1a1a, 'Talk to the lookout', () => toast(['"Keep walking. You didn\'t see me."', '"Viktor\'s got new stock. Square\'s that way."', '"Cops? We\'d hear them a mile off."'][Math.floor(Math.random() * 3)]));
  destinations?.push({ name: 'The Narrows', x: CX + 40, z: CZ - 225 });

  function applyComedown(c, name) {
    if (!c) return;
    if (c.energy) stats.energy = Math.max(0, stats.energy + c.energy);
    if (c.hunger) stats.hunger = Math.max(0, stats.hunger + c.hunger);
    if (c.hp) stats.hp = Math.max(1, stats.hp + c.hp);
    if (c.slow) slowT = c.slow;
    toast(`${name} wears off. ${c.energy ? 'You crash, exhausted.' : c.hunger ? 'You are suddenly starving.' : c.hp ? 'Your heart pounds. That hurt.' : 'Your legs feel like lead.'}`);
  }
  let t = 0;
  function update(dt) {
    t += dt;
    for (const f of fires) { f.scale.y = 0.8 + Math.sin(t * 13 + f.position.x) * 0.25; f.material.opacity = 0.7 + Math.sin(t * 9) * 0.15; }
    for (const s of flicker) s.material.opacity = Math.sin(t * 23 + s.position.z) > 0.92 ? 0.15 : 1;
    entrance.material.opacity = 0.75 + Math.sin(t * 3) * 0.25;
    for (const h of dealers) animatePerson?.(h, false, dt);
    for (const a of active) { a.t -= dt; if (a.t <= 0) applyComedown(a.comedown, a.name); }
    active = active.filter(a => a.t > 0);
    if (slowT > 0) slowT -= dt;
  }
  const weaponBonus = () => WEAPONS.reduce((m, w) => owned.has(w.name) ? Math.max(m, w.dmg) : m, 0);
  return {
    update,
    get dmg() { return (1 + weaponBonus()) * active.reduce((m, a) => m * (a.boost.dmg || 1), 1); },
    get def() { return active.reduce((m, a) => m * (a.boost.def || 1), 1); },
    get speed() { return active.reduce((m, a) => m * (a.boost.speed || 1), 1) * (slowT > 0 ? 0.7 : 1); },
    get boosts() { return active.map(a => `${a.name} ${Math.ceil(a.t)}s`); },
  };
}
