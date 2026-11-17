// CREATE MODE: build your own world on empty land. Pick a house, a building, a road, a tree, a pond or a
// park bench from the catalogue and place it where you want: move it, turn it, copy it, remove it. Then walk
// around what you built.
//   - the land is flat, and things stand on it: two things can't occupy the same spot (a red outline tells
//     you). Roads, pavements, lawns and ponds are ground; houses, trees and benches stand on the ground, and
//     can stand on a lawn or pavement but not on a road.
//   - ponds are dug into the land (ponds.js): the water sits in a hollow, below the grass.
//   - trees are the game's own species (botany.js) with their botanical names.
//   - nothing comes from nowhere: every piece gets an ID in the game's standard format (owner PLR: built by
//     you), says which firm makes its materials, and the world keeps a bill of materials.
//   - worlds save on this device, and to your account when you're signed in (Supabase table "creations").
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { treeMesh } from './trees.js';
import { PLANTS, TREE_SHAPE } from './botany.js';
import { digPond, holeMaterial, pondSlotsFree } from './ponds.js';
import { makeId } from './world-ids.js';

const $ = id => document.getElementById(id);
const supabase = (() => { try { return createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch { return null; } })();

// ───────────────────────── scene ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9d4f2); scene.fog = new THREE.Fog(0xa9d4f2, 260, 900);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 2500);
scene.add(new THREE.HemisphereLight(0xdfefff, 0x5a7040, .9));
const sun = new THREE.DirectionalLight(0xfff2dc, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 400 }); scene.add(sun, sun.target);
// the land: grass to the horizon
const grassTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#5f8f45'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { g.fillStyle = `hsl(${95 + Math.random() * 20},${35 + Math.random() * 20}%,${28 + Math.random() * 14}%)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(400, 400); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const groundMat = holeMaterial(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(400, 400, 0xffffff, 0xffffff); grid.material.transparent = true; grid.material.opacity = .08; grid.position.y = .01; scene.add(grid);
const grid10 = new THREE.GridHelper(400, 40, 0xffffff, 0xffffff); grid10.material.transparent = true; grid10.material.opacity = .22; grid10.position.y = .012; scene.add(grid10);

// ───────────────────────── building blocks ─────────────────────────
const mats = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? .8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1, map: o.map ?? null })); return mats.get(k); };
function B(g, w, h, d, x, y, z, m, shadow = true) { const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'number' ? mat(m) : m); e.position.set(x, y, z); e.castShadow = shadow; e.receiveShadow = true; g.add(e); return e; }
function C(g, rt, rb, h, x, y, z, m, seg = 12) { const e = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'number' ? mat(m) : m); e.position.set(x, y, z); e.castShadow = true; e.receiveShadow = true; g.add(e); return e; }
function flat(g, w, d, x, z, y, m) { const e = new THREE.Mesh(new THREE.PlaneGeometry(w, d), typeof m === 'number' ? mat(m, { rough: .95 }) : m); e.rotation.x = -Math.PI / 2; e.position.set(x, y, z); e.receiveShadow = true; g.add(e); return e; }
// a wall with windows in rows (one row per floor)
const facades = new Map();
function facade(wall, glass, frame = 0xeeeeee, cols = 2, style = 'house') {
  const k = [wall, glass, frame, cols, style].join(); if (facades.has(k)) return facades.get(k);
  const c = document.createElement('canvas'); c.width = 128 * cols; c.height = 128; const g = c.getContext('2d'), hex = n => '#' + n.toString(16).padStart(6, '0');
  g.fillStyle = hex(wall); g.fillRect(0, 0, c.width, 128);
  if (style === 'brick') { g.strokeStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < 128; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); } }
  for (let i = 0; i < cols; i++) {
    const x = i * 128;
    if (style === 'glass') { g.fillStyle = hex(glass); g.fillRect(x + 4, 10, 120, 100); g.fillStyle = hex(frame); g.fillRect(x + 62, 10, 4, 100); }
    else { g.fillStyle = hex(frame); g.fillRect(x + 30, 28, 68, 66); g.fillStyle = hex(glass); g.fillRect(x + 35, 33, 58, 56); g.fillStyle = hex(frame); g.fillRect(x + 62, 33, 4, 56); g.fillRect(x + 35, 58, 58, 4); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; facades.set(k, t); return t;
}
function walls(g, w, d, h, floors, tex, y0 = 0) {
  const mk = (len) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(len / 3.2)) / (tex.image.width / 128), floors); return new THREE.MeshStandardMaterial({ map: t, roughness: .85 }); };
  const top = mat(0x8a8a86), m = [mk(d), mk(d), top, top, mk(w), mk(w)];
  const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); e.position.set(0, y0 + h / 2, 0); e.castShadow = e.receiveShadow = true; g.add(e); return e;
}
function pitchedRoof(g, w, d, y, rise, colour, gable = 0xf0e6d2) {
  const s = new THREE.Shape([new THREE.Vector2(-d / 2 - .5, 0), new THREE.Vector2(d / 2 + .5, 0), new THREE.Vector2(0, rise)]);
  const geo = new THREE.ExtrudeGeometry(s, { depth: w + .5, bevelEnabled: false }); geo.translate(0, 0, -(w + .5) / 2); geo.rotateY(Math.PI / 2);
  const r = new THREE.Mesh(geo, [mat(gable), mat(colour, { rough: .9 })]); r.position.y = y; r.castShadow = r.receiveShadow = true; g.add(r); return r;
}
function door(g, x, z, colour = 0x6b3f22, w = 1.1) { B(g, w, 2.2, .12, x, 1.1, z, colour); B(g, .08, .08, .1, x + w * .35, 1.05, z + .06, 0xd4af37, false); }
function signText(text, bg = '#1d3557', fg = '#ffffff') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg; g.font = 'bold 64px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: .6 });
}
function sign(g, text, w, x, y, z, bg, fg) { const e = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), signText(text, bg, fg)); e.position.set(x, y, z); g.add(e); return e; }

// a house, a shop, an office: walls with windows, a door at the front (+z), a roof
function building({ w, d, floors = 1, wall, glass = 0x9cc3d9, frame = 0xf4f1ea, style = 'house', roof = null, rise = 2, doorColour, label, labelBg, labelFg, awning }) {
  const g = new THREE.Group(), h = floors * 3;
  walls(g, w, d, h, floors, facade(wall, glass, frame, 2, style));
  door(g, 0, d / 2 + .02, doorColour);
  if (roof != null) pitchedRoof(g, w, d, h, rise, roof, wall);
  else { B(g, w + .3, .4, d + .3, 0, h + .2, 0, 0x6f6f6a); }
  if (label) sign(g, label, Math.min(w - 1, 7), 0, Math.min(h - .5, 3.6), d / 2 + .08, labelBg, labelFg);
  if (awning) { const a = B(g, w * .8, .1, 1.6, 0, 2.8, d / 2 + .8, awning); a.rotation.x = .18; }
  return g;
}

// ───────────────────────── roads (10 m tiles) ─────────────────────────
const ASPHALT = 0x3b3d40, PAVE = 0xb8b2a6, KERB = .12;
function asphalt(g, w, d, x, z) { return flat(g, w, d, x, z, .02, ASPHALT); }
function pavement(g, w, d, x, z) { return B(g, w, KERB, d, x, KERB / 2, z, PAVE, false); }
function dashes(g, axis, from, to, at = 0) { for (let t = from + 1; t < to; t += 3) { const e = flat(g, axis === 'z' ? .15 : 1.4, axis === 'z' ? 1.4 : .15, axis === 'z' ? at : t, axis === 'z' ? t : at, .03, 0xf2f2f2); } }
const road = {
  straight() { const g = new THREE.Group(); asphalt(g, 6, 10, 0, 0); pavement(g, 2, 10, -4, 0); pavement(g, 2, 10, 4, 0); dashes(g, 'z', -5, 5); return g; },
  cross() { const g = new THREE.Group(); asphalt(g, 10, 6, 0, 0); asphalt(g, 6, 10, 0, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) pavement(g, 2, 2, sx * 4, sz * 4); return g; },
  tee() { const g = new THREE.Group(); asphalt(g, 6, 10, 0, 0); asphalt(g, 5, 6, 2.5, 0); pavement(g, 2, 10, -4, 0); pavement(g, 2, 2, 4, -4); pavement(g, 2, 2, 4, 4); dashes(g, 'z', -5, 5); return g; },
  corner() { const g = new THREE.Group(); asphalt(g, 6, 8, 0, 1); asphalt(g, 5, 6, 2.5, 0); pavement(g, 2, 10, -4, 0); pavement(g, 8, 2, 0, -4); pavement(g, 2, 2, 4, 4); return g; },
  zebra() { const g = road.straight(); for (let x = -2.5; x <= 2.5; x += 1) flat(g, .5, 3, x, 0, .031, 0xf6f6f6); for (const sx of [-1, 1]) { C(g, .05, .05, 2.4, sx * 3.4, 1.2, 1.9, 0x222222, 6); const b = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), mat(0xffa500, { emissive: 0xff8800, ei: .6 })); b.position.set(sx * 3.4, 2.5, 1.9); g.add(b); } return g; },
  roundabout() { const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.RingGeometry(3.5, 9, 40), mat(ASPHALT, { rough: .95 })); r.rotation.x = -Math.PI / 2; r.position.y = .02; r.receiveShadow = true; g.add(r);
    C(g, 3.5, 3.5, .3, 0, .15, 0, 0x6f9a4a, 32); for (const [x, z] of [[0, 9.5], [0, -9.5], [9.5, 0], [-9.5, 0]]) asphalt(g, Math.abs(x) ? 1 : 6, Math.abs(z) ? 1 : 6, x, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pavement(g, 4, 4, sx * 8, sz * 8); return g; },
  carpark() { const g = new THREE.Group(); asphalt(g, 20, 20, 0, 0); for (let x = -8.75; x <= 8.75; x += 2.5) { flat(g, .12, 5, x, -6.5, .03, 0xf2f2f2); flat(g, .12, 5, x, 6.5, .03, 0xf2f2f2); } sign(g, 'P', 1.2, -9, 2.2, 9.9, '#1d4ed8'); C(g, .05, .05, 2, -9, 1, 9.85, 0x555555, 6); return g; },
  pavement() { const g = new THREE.Group(); pavement(g, 10, 10, 0, 0); return g; },
  plaza() { const g = new THREE.Group(); B(g, 10, .1, 10, 0, .05, 0, 0xd9cfbd, false); for (let i = -4; i <= 4; i += 2) flat(g, 10, .05, 0, i, .105, 0xc9bea9); return g; },
  lawn() { const g = new THREE.Group(); flat(g, 10, 10, 0, 0, .025, 0x6aa84f); return g; },
};

// ───────────────────────── the catalogue ─────────────────────────
// w × d is the footprint (metres, before turning); layer 'ground' items lie on the land, 'object' items stand on it
const P = (id, cat, name, icon, w, d, o) => ({ id, cat, name, icon, w, d, layer: 'object', snap: 1, ...o });
const CATALOGUE = [
  P('cottage', 'Homes', 'Cottage', '🏡', 8, 7, { cls: 'BLD', kind: 'HSE', mat: 'BRK.WOD', maker: 'Westhaven Builders', materials: { bricks: 6, timber: 3, glass: 1, 'roof tiles': 2 }, make: () => { const g = building({ w: 8, d: 7, wall: 0xefe3c8, roof: 0x8a3b2b, rise: 2.6, doorColour: 0x2f5d8a }); B(g, .7, 1.6, .7, 2.2, 4.4, -.6, 0x8a5a44); return g; } }),
  P('house', 'Homes', 'Family house', '🏠', 10, 8, { cls: 'BLD', kind: 'HSE', mat: 'BRK.WOD', maker: 'Westhaven Builders', materials: { bricks: 10, timber: 4, glass: 2, 'roof tiles': 3 }, make: () => building({ w: 10, d: 8, floors: 2, wall: 0xd9c7a8, roof: 0x5a4a44, rise: 2.4, style: 'brick' }) }),
  P('terrace', 'Homes', 'Terraced row', '🏘️', 18, 8, { cls: 'BLD', kind: 'HSE', mat: 'BRK', maker: 'Westhaven Builders', materials: { bricks: 18, timber: 5, glass: 3, 'roof tiles': 5 }, make: () => { const g = building({ w: 18, d: 8, floors: 2, wall: 0xa0503c, roof: 0x3d3d44, rise: 2.2, style: 'brick', frame: 0xffffff }); for (const [x, c] of [[-6, 0x1d3557], [6, 0x2f5d3a]]) door(g, x, 4.02, c); return g; } }),
  P('bungalow', 'Homes', 'Bungalow', '🛖', 12, 9, { cls: 'BLD', kind: 'HSE', mat: 'BRK.WOD', maker: 'Westhaven Builders', materials: { bricks: 9, timber: 4, glass: 2, 'roof tiles': 3 }, make: () => building({ w: 12, d: 9, wall: 0xf3efe6, roof: 0x6b4a3a, rise: 1.8, doorColour: 0x8a3b3b }) }),
  P('mansion', 'Homes', 'Mansion', '🏰', 22, 14, { cls: 'BLD', kind: 'MAN', mat: 'STN.BRK', maker: 'Westhaven Builders', materials: { stone: 20, bricks: 20, timber: 8, glass: 6, 'roof tiles': 8 }, make: () => { const g = building({ w: 22, d: 14, floors: 3, wall: 0xeae2d0, roof: 0x3a3f4a, rise: 3.5, style: 'house' }); for (const x of [-3, 3]) C(g, .35, .4, 6, x, 3, 7.6, 0xf6f1e4); B(g, 8, .4, 2.4, 0, 6.2, 7.4, 0xeae2d0); return g; } }),
  P('flats', 'Homes', 'Block of flats', '🏢', 16, 12, { cls: 'BLD', kind: 'APT', mat: 'CON.GLS', maker: 'Westhaven Builders', materials: { concrete: 30, steel: 8, glass: 10 }, make: () => building({ w: 16, d: 12, floors: 6, wall: 0xc9c2b4, glass: 0x7fa3bd, style: 'brick', frame: 0xe8e4dc }) }),
  P('shop', 'Buildings', 'Corner shop', '🏪', 10, 10, { cls: 'BLD', kind: 'SHP', mat: 'BRK.GLS', maker: 'Westhaven Builders', materials: { bricks: 9, glass: 3, timber: 2 }, make: () => building({ w: 10, d: 10, floors: 2, wall: 0xb5651d, style: 'brick', label: 'SHOP', labelBg: '#2a9d8f', awning: 0x2a9d8f }) }),
  P('cafe', 'Buildings', 'Café', '☕', 10, 8, { cls: 'BLD', kind: 'SHP', mat: 'BRK.GLS', maker: 'Westhaven Builders', materials: { bricks: 8, glass: 3, timber: 2 }, make: () => { const g = building({ w: 10, d: 8, wall: 0xf1e3c6, label: 'CAFÉ', labelBg: '#7a3b2b', awning: 0xc0392b }); for (const x of [-3, 3]) { C(g, .5, .5, .05, x, .75, 6, 0xffffff); C(g, .05, .05, .75, x, .37, 6, 0x333333, 6); } return g; } }),
  P('supermarket', 'Buildings', 'Supermarket', '🛒', 24, 18, { cls: 'BLD', kind: 'SUP', mat: 'STL.GLS', maker: 'Westhaven Builders', materials: { steel: 20, glass: 12, concrete: 15 }, make: () => building({ w: 24, d: 18, floors: 2, wall: 0xe8e8e2, glass: 0x9cc3d9, style: 'glass', frame: 0xd0d0d0, label: 'SUPERMARKET', labelBg: '#e63946' }) }),
  P('office', 'Buildings', 'Office tower', '🏙️', 14, 14, { cls: 'BLD', kind: 'OFF', mat: 'STL.GLS', maker: 'Westhaven Builders', materials: { steel: 40, glass: 40, concrete: 25 }, make: () => building({ w: 14, d: 14, floors: 12, wall: 0x5a6d7d, glass: 0x8fb8d8, frame: 0x44525e, style: 'glass' }) }),
  P('school', 'Buildings', 'School', '🏫', 24, 16, { cls: 'BLD', kind: 'SCH', mat: 'BRK.GLS', maker: 'Westhaven Builders', materials: { bricks: 30, glass: 10, timber: 6 }, make: () => building({ w: 24, d: 16, floors: 2, wall: 0xb5523b, style: 'brick', frame: 0xffffff, label: 'SCHOOL', labelBg: '#1d3557', roof: 0x3d3d44, rise: 3 }) }),
  P('hospital', 'Buildings', 'Hospital', '🏥', 24, 20, { cls: 'BLD', kind: 'HSP', mat: 'CON.GLS', maker: 'Westhaven Builders', materials: { concrete: 40, glass: 16, steel: 12 }, make: () => building({ w: 24, d: 20, floors: 4, wall: 0xf4f4f0, glass: 0x9cc3d9, label: '✚ HOSPITAL', labelBg: '#ffffff', labelFg: '#d62828' }) }),
  P('police', 'Buildings', 'Police station', '🚓', 16, 12, { cls: 'BLD', kind: 'POL', mat: 'BRK.GLS', maker: 'Westhaven Builders', materials: { bricks: 16, glass: 5, steel: 3 }, make: () => building({ w: 16, d: 12, floors: 2, wall: 0xd9d4c7, label: 'POLICE', labelBg: '#1d4ed8' }) }),
  P('fire', 'Buildings', 'Fire station', '🚒', 16, 14, { cls: 'BLD', kind: 'FIR', mat: 'BRK.STL', maker: 'Westhaven Builders', materials: { bricks: 16, steel: 6, glass: 3 }, make: () => { const g = building({ w: 16, d: 14, floors: 2, wall: 0xc8b8a0, style: 'brick', label: 'FIRE STATION', labelBg: '#d62828' }); for (const x of [-4.5, 4.5]) B(g, 4, 3.6, .15, x, 1.8, 7.05, 0xc1121f); return g; } }),
  P('road', 'Roads', 'Road', '🛣️', 10, 10, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'ROD', mat: 'ASP', maker: 'Westhaven Highways', materials: { asphalt: 6, 'paving slabs': 4 }, make: road.straight }),
  P('cross', 'Roads', 'Crossroads', '➕', 10, 10, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'ROD', mat: 'ASP', maker: 'Westhaven Highways', materials: { asphalt: 8, 'paving slabs': 2 }, make: road.cross }),
  P('tee', 'Roads', 'T-junction', '⊤', 10, 10, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'ROD', mat: 'ASP', maker: 'Westhaven Highways', materials: { asphalt: 7, 'paving slabs': 3 }, make: road.tee }),
  P('corner', 'Roads', 'Bend', '↱', 10, 10, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'ROD', mat: 'ASP', maker: 'Westhaven Highways', materials: { asphalt: 6, 'paving slabs': 4 }, make: road.corner }),
  P('zebra', 'Roads', 'Zebra crossing', '🦓', 10, 10, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'XNG', mat: 'ASP.PLS', maker: 'Westhaven Highways', materials: { asphalt: 6, 'paving slabs': 4, paint: 1 }, make: road.zebra }),
  P('roundabout', 'Roads', 'Roundabout', '🔄', 20, 20, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'ROD', mat: 'ASP', maker: 'Westhaven Highways', materials: { asphalt: 20, 'paving slabs': 6 }, make: road.roundabout }),
  P('carpark', 'Roads', 'Car park', '🅿️', 20, 20, { layer: 'ground', snap: 10, road: true, cls: 'LND', kind: 'SRF', mat: 'ASP', maker: 'Westhaven Highways', materials: { asphalt: 20, paint: 2 }, make: road.carpark }),
  P('pavement', 'Roads', 'Pavement', '⬜', 10, 10, { layer: 'ground', snap: 10, cls: 'LND', kind: 'PTH', mat: 'STN', maker: 'Deepstone Quarries', materials: { 'paving slabs': 10 }, make: road.pavement }),
  P('plaza', 'Roads', 'Town square paving', '🔲', 10, 10, { layer: 'ground', snap: 10, cls: 'LND', kind: 'PTH', mat: 'STN', maker: 'Deepstone Quarries', materials: { stone: 10 }, make: road.plaza }),
  P('lawn', 'Nature', 'Lawn', '🟩', 10, 10, { layer: 'ground', snap: 10, cls: 'LND', kind: 'LWN', mat: 'GRS', maker: 'Rootstock Nurseries (turf)', materials: { turf: 10 }, make: road.lawn }),
  P('pond', 'Nature', 'Pond', '💧', 10, 8, { layer: 'ground', snap: 1, pond: true, cls: 'LND', kind: 'PND', mat: 'WAT.MUD', maker: 'Westhaven Builders (dug and lined with clay)', materials: { clay: 4, water: 1 }, make: () => new THREE.Group() }),
  ...Object.keys(TREE_SHAPE).map(k => P('tree-' + k, 'Nature', PLANTS[k].common, '🌳', 2, 2, { tree: k, cls: 'PLT', kind: PLANTS[k].kind, mat: PLANTS[k].code, maker: 'Rootstock Nurseries', botanical: PLANTS[k].botanical, materials: { 'young tree': 1 }, make: (it) => { const m = treeMesh(TREE_SHAPE[k], it.seed % 3); m.scale.setScalar(.9); return m; } })),
  ...[['tApeldoorn', 'Tulip bed'], ['rIngrid', 'Rose bed'], ['lavender', 'Lavender bed'], ['sunflower', 'Sunflower bed']].map(([k, n]) => P('bed-' + k, 'Nature', n, '🌷', 4, 2, { cls: 'LND', kind: 'BED', mat: PLANTS[k].code, maker: 'Rootstock Nurseries', botanical: PLANTS[k].botanical, materials: { 'young plants': 1, soil: 1 }, make: () => flowerBed(k) })),
  P('hedge', 'Nature', 'Yew hedge', '🟫', 4, 1, { cls: 'PLT', kind: 'SHR', mat: 'TAX', maker: 'Rootstock Nurseries', botanical: 'Taxus baccata', materials: { 'young plants': 1 }, make: () => { const g = new THREE.Group(); B(g, 4, 1.3, .9, 0, .65, 0, 0x2f6b2a); return g; } }),
  P('bench', 'Park', 'Park bench', '🪑', 2, 1, { cls: 'PRD', kind: 'BEN', mat: 'WOD.STL', maker: 'Northwood Sawmills', materials: { timber: 1, steel: 1 }, make: () => { const g = new THREE.Group(); B(g, 1.8, .08, .45, 0, .45, 0, 0x8a5a2b); B(g, 1.8, .45, .08, 0, .72, -.2, 0x8a5a2b); for (const x of [-.8, .8]) B(g, .08, .45, .45, x, .22, 0, 0x2b2f2a); return g; } }),
  P('picnic', 'Park', 'Picnic table', '🧺', 2, 2, { cls: 'PRD', kind: 'PIC', mat: 'WOD', maker: 'Northwood Sawmills', materials: { timber: 2 }, make: () => { const g = new THREE.Group(); B(g, 1.8, .07, .8, 0, .75, 0, 0x9a6a3b); for (const z of [-.7, .7]) B(g, 1.8, .06, .3, 0, .45, z, 0x9a6a3b); for (const x of [-.7, .7]) B(g, .1, .75, 1.6, x, .37, 0, 0x7a5030); return g; } }),
  P('lamp', 'Park', 'Lamp post', '💡', 1, 1, { cls: 'PRD', kind: 'LMP', mat: 'STL.GLS', maker: 'Ironforge Steel', materials: { steel: 1, glass: 1 }, make: () => { const g = new THREE.Group(); C(g, .06, .09, 4, 0, 2, 0, 0x2b2f33, 8); const l = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 10), mat(0xfff2c0, { emissive: 0xffe08a, ei: .8 })); l.position.y = 4.1; g.add(l); return g; } }),
  P('fountain', 'Park', 'Fountain', '⛲', 6, 6, { cls: 'BLD', kind: 'FNT', mat: 'STN.WAT', maker: 'Westhaven Builders; pump by Spark & Pipe Utilities', materials: { stone: 4, water: 1, pump: 1 }, make: () => { const g = new THREE.Group(); C(g, 2.8, 3, .7, 0, .35, 0, 0xd9d2c3, 32); const w = C(g, 2.55, 2.55, .05, 0, .62, 0, mat(0x5aa9d6, { opacity: .85 }), 32); w.castShadow = false; C(g, .3, .4, 1.6, 0, 1.1, 0, 0xd9d2c3); C(g, 1, .6, .25, 0, 1.9, 0, 0xd9d2c3, 20); return g; } }),
  P('swings', 'Park', 'Swings', '🛝', 4, 2, { cls: 'PRD', kind: 'PLY', mat: 'STL.PLS', maker: 'Ironforge Steel, Petra Polymers', materials: { steel: 2, plastic: 1 }, make: () => { const g = new THREE.Group(); for (const x of [-1.9, 1.9]) for (const z of [-.6, .6]) { const p = B(g, .08, 2.6, .08, x, 1.25, z * .7, 0xc1121f); p.rotation.x = z > 0 ? -.25 : .25; } B(g, 3.9, .1, .1, 0, 2.5, 0, 0xc1121f); for (const x of [-.8, .8]) { B(g, .02, 1.9, .02, x - .2, 1.5, 0, 0x555555); B(g, .02, 1.9, .02, x + .2, 1.5, 0, 0x555555); B(g, .6, .05, .25, x, .55, 0, 0x1d3557); } return g; } }),
  P('bin', 'Park', 'Litter bin', '🗑️', 1, 1, { cls: 'PRD', kind: 'BIN', mat: 'STL', maker: 'Ironforge Steel', materials: { steel: 1 }, make: () => { const g = new THREE.Group(); C(g, .3, .26, .9, 0, .45, 0, 0x2f4f3a, 12); return g; } }),
  P('busstop', 'Park', 'Bus shelter', '🚏', 4, 2, { cls: 'PRD', kind: 'SGN', mat: 'STL.GLS', maker: 'Ironforge Steel, Clearview Glassworks', materials: { steel: 2, glass: 2 }, make: () => { const g = new THREE.Group(); B(g, 3.6, .1, 1.5, 0, 2.5, 0, 0x2b2f33); B(g, 3.6, 2.3, .05, 0, 1.25, -.7, mat(0xbfe3f2, { opacity: .35 })); for (const x of [-1.75, 1.75]) B(g, .08, 2.5, .08, x, 1.25, .65, 0x2b2f33); B(g, 2.6, .08, .4, 0, .5, -.45, 0x8a5a2b); return g; } }),
  P('railing', 'Park', 'Iron railing', '🚧', 4, 1, { cls: 'LND', kind: 'FEN', mat: 'STL', maker: 'Ironforge Steel', materials: { steel: 1 }, make: () => { const g = new THREE.Group(); for (let x = -1.9; x <= 1.9; x += .2) B(g, .03, 1.4, .03, x, .7, 0, 0x1e1f22, false); for (const y of [.15, 1.3]) B(g, 4, .05, .05, 0, y, 0, 0x1e1f22, false); return g; } }),
];
const BY_ID = Object.fromEntries(CATALOGUE.map(p => [p.id, p]));
function flowerBed(key) {
  const g = new THREE.Group(); B(g, 4, .18, 2, 0, .09, 0, 0x4a3426, false);
  const s = PLANTS[key], tall = key === 'sunflower' ? 1.7 : key === 'lavender' ? .5 : .45;
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(.015, .015, 1, 4), mat(0x3f7f3a), 40), head = new THREE.InstancedMesh(new THREE.SphereGeometry(key === 'sunflower' ? .16 : .07, 8, 6), mat(s.colour), 40), o = new THREE.Object3D();
  for (let i = 0; i < 40; i++) { const x = -1.8 + (i % 10) * .4, z = -.75 + Math.floor(i / 10) * .5; o.position.set(x, .18 + tall / 2, z); o.scale.set(1, tall, 1); o.updateMatrix(); stem.setMatrixAt(i, o.matrix); o.position.y = .18 + tall; o.scale.set(1, 1, 1); o.updateMatrix(); head.setMatrixAt(i, o.matrix); }
  g.add(stem, head); return g;
}

// ───────────────────────── the world you're building ─────────────────────────
let world = newWorld('My world');
function newWorld(name) { return { id: crypto.randomUUID(), name, items: [], next: 1, updated: Date.now() }; }
const placed = [];   // { item, def, obj, pond }
const sizeOf = (def, r) => (r % 2 ? [def.d, def.w] : [def.w, def.d]);
const rectOf = (def, x, z, r) => { const [w, d] = sizeOf(def, r); return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }; };
const overlap = (a, b) => a.x0 < b.x1 - .01 && a.x1 > b.x0 + .01 && a.z0 < b.z1 - .01 && a.z1 > b.z0 + .01;
// can this go here? ground can't overlap ground; objects can't overlap objects, and don't stand on roads or in ponds
function blocked(def, x, z, r, skip) {
  const R = rectOf(def, x, z, r);
  for (const p of placed) { if (p === skip) continue; const Q = rectOf(p.def, p.item.x, p.item.z, p.item.r);
    if (!overlap(R, Q)) continue;
    if (p.def.layer === def.layer) return `There's already a ${p.def.name.toLowerCase()} there`;
    const g = def.layer === 'ground' ? def : p.def; if (g.road || g.pond) return g.pond ? 'That would be in the pond' : 'That would be in the road'; }
  if (def.pond && !skip && pondSlotsFree() === 0) return 'A world can have up to 8 ponds';
  return null;
}
const idOf = (def, item) => makeId(def.cls, def.kind, def.mat, 'PLR', `create:${world.id}:${item.seed}`);
function build(item) {
  const def = BY_ID[item.p]; if (!def) return null;
  const obj = def.make(item); obj.position.set(item.x, 0, item.z); obj.rotation.y = -item.r * Math.PI / 2;
  obj.traverse(o => { o.userData.item = item; }); scene.add(obj);
  const p = { item, def, obj };
  if (def.pond) { const [w, d] = sizeOf(def, item.r); p.pond = digPond(scene, { x: item.x, z: item.z, rx: w / 2, rz: d / 2, rim: .01, level: -.3, bed: -1.4, materials: [groundMat] }); }
  placed.push(p); return p;
}
function unbuild(p) { scene.remove(p.obj); p.pond?.remove(); const i = placed.indexOf(p); if (i >= 0) placed.splice(i, 1); }
function rebuildAll() { for (const p of [...placed]) unbuild(p); for (const it of world.items) build(it); refreshInfo(); }

// undo / redo: each step is a copy of the world's items
const undo = [], redo = [];
function remember() { undo.push(JSON.stringify(world.items)); if (undo.length > 80) undo.shift(); redo.length = 0; }
function restore(json) { world.items = JSON.parse(json); rebuildAll(); select(null); autosave(); }

// ───────────────────────── camera ─────────────────────────
const view = { tx: 0, tz: 0, dist: 70, yaw: .7, pitch: .85 };
function placeCamera() {
  const { tx, tz, dist, yaw, pitch } = view;
  camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(tx, 0, tz);
  sun.position.set(tx + 60, 120, tz + 40); sun.target.position.set(tx, 0, tz);
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
function groundAt(cx, cy) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hitP) ? hitP.clone() : null; }
function pickAt(cx, cy) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(placed.map(p => p.obj), true); const objHit = hits.find(h => h.object.userData.item && BY_ID[h.object.userData.item.p].layer === 'object') || hits[0]; return objHit ? placed.find(p => p.item === objHit.object.userData.item) : null; }

// ───────────────────────── tools: place, select, move ─────────────────────────
let tool = null;            // { def, r } while placing
let selected = null, moving = false;
let ghost = null, ghostOK = true;
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x3fd17a })); outline.visible = false; scene.add(outline);
function showOutline(def, x, z, r, ok, h = 0) { const [w, d] = sizeOf(def, r); outline.visible = true; outline.scale.set(w, Math.max(.3, h), d); outline.position.set(x, Math.max(.3, h) / 2, z); outline.material.color.set(ok ? 0x3fd17a : 0xff4d4d); }
function snap(def, v, r) { const s = def.snap; const [w, d] = sizeOf(def, r); return { x: Math.round((v.x - w / 2) / s) * s + w / 2, z: Math.round((v.z - d / 2) / s) * s + d / 2 }; }
function startPlacing(def) {
  cancelTool(); select(null); tool = { def, r: 0 };
  ghost = def.make({ seed: 1 }); ghost.traverse(o => { if (o.material) { o.material = (Array.isArray(o.material) ? o.material[0] : o.material).clone(); o.material.transparent = true; o.material.opacity = .55; o.material.depthWrite = false; } o.castShadow = false; }); scene.add(ghost);
  hint(`Placing: ${def.name}. Click or tap to place · R or ⟳ to turn · Esc to stop`);
  document.querySelectorAll('.cat-item').forEach(b => b.classList.toggle('on', b.dataset.id === def.id));
}
function cancelTool() { if (ghost) { scene.remove(ghost); ghost = null; } tool = null; moving = false; outline.visible = false; $('why').textContent = ''; document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('on')); hint(''); }
let lastPointer = null;
function hover(cx, cy) {
  lastPointer = [cx, cy];
  const g = groundAt(cx, cy); if (!g) return;
  if (tool) { const { x, z } = snap(tool.def, g, tool.r); ghost.position.set(x, 0, z); ghost.rotation.y = -tool.r * Math.PI / 2; const why = blocked(tool.def, x, z, tool.r); ghostOK = !why; showOutline(tool.def, x, z, tool.r, ghostOK, 0); $('why').textContent = why || ''; }
  else if (moving && selected) { const { x, z } = snap(selected.def, g, selected.item.r); selected.obj.position.set(x, 0, z); const why = blocked(selected.def, x, z, selected.item.r, selected); ghostOK = !why; showOutline(selected.def, x, z, selected.item.r, ghostOK); $('why').textContent = why || ''; }
}
function clickAt(cx, cy) {
  const g = groundAt(cx, cy); if (!g) return;
  if (tool) {
    hover(cx, cy); if (!ghostOK) return;
    remember(); const { x, z } = ghost.position; const item = { p: tool.def.id, x, z, r: tool.r, seed: world.next++ }; world.items.push(item); build(item); autosave(); refreshInfo();
    return;
  }
  if (moving && selected) {
    hover(cx, cy); if (!ghostOK) return;
    remember(); const it = selected.item, { x, z } = selected.obj.position; it.x = x; it.z = z; const p = selected; unbuild(p); const q = build(it); moving = false; select(q); autosave(); return;
  }
  select(pickAt(cx, cy));
}
function turn() {
  if (tool) { tool.r = (tool.r + 1) % 4; if (lastPointer) hover(...lastPointer); return; }
  if (!selected) return;
  const it = selected.item, r = (it.r + 1) % 4; if (blocked(selected.def, it.x, it.z, r, selected)) { $('why').textContent = 'No room to turn it here'; return; }
  remember(); it.r = r; unbuild(selected); const q = build(it); select(q); autosave();
}
function removeSelected() { if (!selected) return; remember(); world.items.splice(world.items.indexOf(selected.item), 1); unbuild(selected); select(null); autosave(); refreshInfo(); }
function copySelected() { if (!selected) return; startPlacing(selected.def); tool.r = selected.item.r; }
function select(p) {
  selected = p; moving = false;
  if (!p) { outline.visible = false; $('sel').hidden = true; return; }
  const box = new THREE.Box3().setFromObject(p.obj); showOutline(p.def, p.item.x, p.item.z, p.item.r, true, box.max.y);
  $('sel').hidden = false; $('selName').textContent = `${p.def.icon} ${p.def.name}`;
  $('selBot').textContent = p.def.botanical ? p.def.botanical : '';
  $('selId').textContent = idOf(p.def, p.item);
  $('selMaker').textContent = `Built by you · materials from ${p.def.maker}`;
}

// ───────────────────────── walking around what you built ─────────────────────────
let walking = false; const me = { x: 0, z: 0, yaw: 0, pitch: 0 }; const keys = {};
function startWalk() {
  cancelTool(); select(null); walking = true; me.x = view.tx; me.z = view.tz + 12; me.yaw = 0; me.pitch = 0; grid.visible = grid10.visible = false;
  document.body.classList.add('walking'); hint('Walking · WASD or the arrows to move, drag to look around · Esc to go back to building');
}
function stopWalk() { walking = false; grid.visible = grid10.visible = true; document.body.classList.remove('walking'); view.tx = me.x; view.tz = me.z; hint(''); }
function solidAt(x, z) { for (const p of placed) { if (p.def.layer !== 'object') { if (p.def.pond) { const R = rectOf(p.def, p.item.x, p.item.z, p.item.r); const rx = (R.x1 - R.x0) / 2 * .9, rz = (R.z1 - R.z0) / 2 * .9; if (((x - p.item.x) / rx) ** 2 + ((z - p.item.z) / rz) ** 2 < 1) return true; } continue; }
  if (p.def.id === 'lawn' || p.def.id.startsWith('bed-')) continue; const R = rectOf(p.def, p.item.x, p.item.z, p.item.r); const pad = p.def.tree ? -.6 : .25; if (x > R.x0 - pad && x < R.x1 + pad && z > R.z0 - pad && z < R.z1 + pad) return true; } return false; }
function walkStep(dt) {
  const f = (keys.KeyW || keys.ArrowUp || keys.up ? 1 : 0) - (keys.KeyS || keys.ArrowDown || keys.down ? 1 : 0), s = (keys.KeyD || keys.right ? 1 : 0) - (keys.KeyA || keys.left ? 1 : 0);
  if (keys.ArrowLeft) me.yaw += dt * 1.8; if (keys.ArrowRight) me.yaw -= dt * 1.8;
  const sp = (keys.ShiftLeft ? 9 : 4.5) * dt, dx = (-Math.sin(me.yaw) * f + Math.cos(me.yaw) * s) * sp, dz = (-Math.cos(me.yaw) * f - Math.sin(me.yaw) * s) * sp;
  if (!solidAt(me.x + dx, me.z)) me.x += dx; if (!solidAt(me.x, me.z + dz)) me.z += dz;
  let y = 1.65; for (const p of placed) if (p.def.layer === 'ground' && !p.def.road && !p.def.pond) { const R = rectOf(p.def, p.item.x, p.item.z, p.item.r); if (me.x > R.x0 && me.x < R.x1 && me.z > R.z0 && me.z < R.z1) y = 1.65 + .12; }
  camera.position.set(me.x, y, me.z); camera.rotation.set(me.pitch, me.yaw, 0, 'YXZ');
  sun.position.set(me.x + 60, 120, me.z + 40); sun.target.position.set(me.x, 0, me.z);
}

// ───────────────────────── saving ─────────────────────────
const LOCAL = 'create:worlds';
const localWorlds = () => { try { return JSON.parse(localStorage.getItem(LOCAL)) || {}; } catch { return {}; } };
let saveTimer = 0, account = null;
function autosave() { world.updated = Date.now(); try { const all = localWorlds(); all[world.id] = world; localStorage.setItem(LOCAL, JSON.stringify(all)); localStorage.setItem('create:last', world.id); } catch { } clearTimeout(saveTimer); saveTimer = setTimeout(cloudSave, 2500); $('saved').textContent = 'Saved on this device'; }
async function cloudSave() {
  if (!account || !supabase) return;
  const { error } = await supabase.from('creations').upsert({ id: world.id, owner: account.id, name: world.name, data: { items: world.items, next: world.next }, updated_at: new Date().toISOString() });
  $('saved').textContent = error ? (/relation|schema|does not exist/i.test(error.message) ? 'Saved on this device (account saving needs world-mode.sql)' : 'Saved on this device (' + error.message + ')') : 'Saved to your account';
}
async function listWorlds() {
  const out = Object.values(localWorlds());
  if (account && supabase) { const { data } = await supabase.from('creations').select('id,name,data,updated_at').eq('owner', account.id).order('updated_at', { ascending: false }); for (const r of data || []) if (!out.some(w => w.id === r.id)) out.push({ id: r.id, name: r.name, items: r.data?.items || [], next: r.data?.next || 1, updated: Date.parse(r.updated_at) }); }
  return out.sort((a, b) => b.updated - a.updated);
}
function openWorld(w) { world = { ...w, items: w.items.map(i => ({ ...i })) }; undo.length = redo.length = 0; $('worldName').value = world.name; rebuildAll(); select(null); autosave(); }

// ───────────────────────── panels ─────────────────────────
function hint(t) { $('hint').textContent = t || 'Pick something from the catalogue, then click on the land to place it. Click a placed thing to move, turn, copy or remove it.'; }
function refreshInfo() {
  $('count').textContent = `${world.items.length} placed`;
  const tally = {}; for (const it of world.items) { const d = BY_ID[it.p]; if (d) for (const [k, n] of Object.entries(d.materials || {})) tally[k] = (tally[k] || 0) + n; }
  const list = $('bill'); list.replaceChildren();
  for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) { const li = document.createElement('li'); li.textContent = `${n} × ${k}`; list.append(li); }
  if (!list.children.length) { const li = document.createElement('li'); li.textContent = 'Nothing yet'; list.append(li); }
}
function buildCatalogue() {
  const cats = [...new Set(CATALOGUE.map(p => p.cat))], tabs = $('tabs'), items = $('items');
  const show = cat => { items.replaceChildren(); tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === cat));
    for (const p of CATALOGUE.filter(p => p.cat === cat)) { const b = document.createElement('button'); b.className = 'cat-item'; b.dataset.id = p.id; b.type = 'button';
      const i = document.createElement('span'); i.className = 'ic'; i.textContent = p.icon; const n = document.createElement('span'); n.textContent = p.name; b.append(i, n);
      if (p.botanical) { const bo = document.createElement('i'); bo.textContent = p.botanical; b.append(bo); }
      b.title = `${p.name}: ${p.w}×${p.d} m · ${p.maker}`; b.onclick = () => (tool?.def === p ? cancelTool() : startPlacing(p)); items.append(b); } };
  for (const c of cats) { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => show(c); tabs.append(b); }
  show(cats[0]);
}

// ───────────────────────── input ─────────────────────────
const el = renderer.domElement; el.style.touchAction = 'none';
const pointers = new Map(); let drag = null, pinch = null;
el.addEventListener('contextmenu', e => e.preventDefault());
el.addEventListener('pointerdown', e => {
  el.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), dist: view.dist, yaw: view.yaw }; drag = null; return; }
  drag = { x: e.clientX, y: e.clientY, button: e.button, moved: 0, tx: view.tx, tz: view.tz, yaw: view.yaw, pitch: view.pitch, my: me.yaw, mp: me.pitch, touch: e.pointerType === 'touch' };
});
el.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; view.dist = THREE.MathUtils.clamp(pinch.dist * pinch.d / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 12, 400); view.yaw = pinch.yaw - (Math.atan2(b.y - a.y, b.x - a.x) - pinch.ang); return; }
  if (!drag) { if (!walking) hover(e.clientX, e.clientY); return; }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
  if (walking) { me.yaw = drag.my - dx * .005; me.pitch = THREE.MathUtils.clamp(drag.mp - dy * .005, -1.2, 1.2); return; }
  if (drag.button === 2 || e.shiftKey) { view.yaw = drag.yaw - dx * .006; view.pitch = THREE.MathUtils.clamp(drag.pitch + dy * .005, .25, 1.45); }
  else if (drag.moved > 6 && !(drag.touch && (tool || moving))) { const k = view.dist / innerHeight * 1.6, c = Math.cos(view.yaw), s = Math.sin(view.yaw); view.tx = drag.tx - (dx * c + dy * s) * k; view.tz = drag.tz - (-dx * s + dy * c) * k; }
  if (drag.touch && (tool || moving)) hover(e.clientX, e.clientY);
});
const up = e => {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
  if (drag && drag.moved < 7 && drag.button === 0 && !walking) clickAt(e.clientX, e.clientY);
  drag = null;
};
el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; });
el.addEventListener('wheel', e => { e.preventDefault(); view.dist = THREE.MathUtils.clamp(view.dist * (1 + Math.sign(e.deltaY) * .1), 12, 400); }, { passive: false });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (e.code === 'Escape') { if (walking) stopWalk(); else if (tool || moving) { if (moving && selected) { selected.obj.position.set(selected.item.x, 0, selected.item.z); } cancelTool(); } else select(null); }
  if (e.code === 'KeyR' && !walking) turn();
  if ((e.code === 'Delete' || e.code === 'Backspace') && selected) removeSelected();
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) $('redo').click(); else $('undo').click(); }
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); $('redo').click(); }
  if (!walking && !e.ctrlKey && !e.metaKey) { const k = 3 * view.dist / 70, c = Math.cos(view.yaw), s = Math.sin(view.yaw); if (e.code === 'KeyW') { view.tx -= s * k; view.tz -= c * k; } if (e.code === 'KeyS') { view.tx += s * k; view.tz += c * k; } if (e.code === 'KeyA') { view.tx -= c * k; view.tz += s * k; } if (e.code === 'KeyD') { view.tx += c * k; view.tz -= s * k; } }
});
addEventListener('keyup', e => { keys[e.code] = false; });
for (const d of ['up', 'down', 'left', 'right']) { const b = $('w' + d); b.addEventListener('pointerdown', e => { e.preventDefault(); keys[d] = true; }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { keys[d] = false; }); }
$('turn').onclick = turn; $('del').onclick = removeSelected; $('copy').onclick = copySelected;
$('move').onclick = () => { if (!selected) return; moving = true; hint(`Moving: ${selected.def.name}. Click or tap where it should go · Esc to cancel`); };
$('undo').onclick = () => { if (!undo.length) return; redo.push(JSON.stringify(world.items)); restore(undo.pop()); };
$('redo').onclick = () => { if (!redo.length) return; undo.push(JSON.stringify(world.items)); restore(redo.pop()); };
$('walk').onclick = () => (walking ? stopWalk() : startWalk());
$('back').onclick = () => { autosave(); location.href = './index.html'; };
$('worldName').onchange = e => { world.name = e.target.value.trim().slice(0, 60) || 'My world'; autosave(); };
$('newWorld').onclick = () => { if (world.items.length && !confirmTwice('newWorld', 'Press New again to start an empty world (this one stays saved).')) return; openWorld(newWorld('My world')); };
$('openWorld').onclick = async () => {
  const box = $('worlds'), list = $('worldList'); list.replaceChildren(); box.hidden = false;
  const ws = await listWorlds();
  for (const w of ws) { const b = document.createElement('button'); b.type = 'button'; b.textContent = `${w.name} · ${w.items.length} things · ${new Date(w.updated).toLocaleDateString()}`; b.onclick = () => { box.hidden = true; openWorld(w); }; list.append(b); }
  if (!ws.length) { const p = document.createElement('p'); p.textContent = 'No saved worlds yet.'; list.append(p); }
};
$('worldsClose').onclick = () => { $('worlds').hidden = true; };
const armed = {}; function confirmTwice(k, msg) { if (Date.now() - (armed[k] || 0) < 4000) return true; armed[k] = Date.now(); hint(msg); return false; }
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ───────────────────────── start ─────────────────────────
buildCatalogue(); hint(''); refreshInfo();
(async () => {
  try { const { data } = await supabase.auth.getSession(); account = data?.session?.user || null; } catch { }
  $('who').textContent = account ? 'Saving to your account' : 'Guest: saving on this device only';
  const last = localStorage.getItem('create:last'), all = localWorlds();
  if (last && all[last]) openWorld(all[last]); else { $('worldName').value = world.name; autosave(); }
})();
let t0 = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
  if (walking) walkStep(dt); else placeCamera();
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// for checks
window.__create = { CATALOGUE, get world() { return world; }, placed, startPlacing, clickAt, hover, select, turn, removeSelected, startWalk, stopWalk, view, camera, renderer, scene, blocked, BY_ID, me, keys, idOf };
