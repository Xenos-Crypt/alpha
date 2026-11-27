// BUILD YOUR OWN HOUSE. Maple Fields, a new estate on the south road, has ten plots for sale and the builder's
// office, where you design the house and buy it. Or build it anywhere you like: pick the spot yourself.
//
// Start from one of the builder's designs or make your own: the shape (a plain rectangle, an L or a T with a wing
// at the back), how many floors (1 to 3), how wide and deep, the roof (flat, gable or hip), what the walls are
// made of (brick, stone, timber, render, concrete or glass), the colours of the walls, roof, window frames and
// front door, the size of the windows, and extras (a garage, a pool, a garden fence, a porch, a balcony, a
// chimney). The office shows the house as you change it and what it will cost.
//
// Building a house takes as long as it really does: six months on the game's calendar (the game's day is 8 real
// hours, so about 60 real days). The builders keep working while you're away, and the house is always at the
// right stage when you come back: the land is cleared and dug, the foundations poured, the walls go up floor by
// floor inside scaffolding, the roof goes on, then the windows, doors and outside, and last the inside. You can
// go and watch the crew at work (they work 7am to 6pm) and ask them how it's going. When it's done it's a real
// house you walk into: stairs between floors, a living room, kitchen, bedrooms and a bathroom (toilet, shower,
// basin), all working. Your houses are remembered on this device.
import * as THREE from 'three';

export const ESTATE = { name: 'Maple Fields', roadZ: 1176 };
const PLOT_XS = [-90, -48, -6, 36, 78, 120, 255, 297, 339, 381];
export const PLOTS = PLOT_XS.map((x, i) => ({ id: 'plot' + (i + 1), n: i + 1, x0: x, x1: x + 38, z0: 1184, z1: 1232 }));
const OFFICE = { x: 170, z: 1196 };
const MAPLE_RECT = { minX: -95, maxX: 425, minZ: 1170, maxZ: 1237 };   // the estate, its road frontage and the office

// ---- how long building takes (the real clock, so it carries on while the game is closed) ----
export const GAME_DAY_MS = 8 * 3600e3, BUILD_GAME_DAYS = 180, BUILD_MS = BUILD_GAME_DAYS * GAME_DAY_MS;
export const STAGES = [
  { at: 0, key: 'ground', text: 'clearing the land and digging out the foundations' },
  { at: 0.06, key: 'slab', text: 'pouring the concrete foundations' },
  { at: 0.14, key: 'walls', text: 'building the walls' },
  { at: 0.62, key: 'roof', text: 'putting the roof on' },
  { at: 0.74, key: 'outside', text: 'fitting the windows and doors and finishing the outside' },
  { at: 0.9, key: 'inside', text: 'fitting out the inside: the kitchen, bathroom, floors and paint' },
];
export const stageAt = t => { let s = STAGES[0]; for (const x of STAGES) if (t >= x.at) s = x; return s; };
export const progressOf = (rec, now = Date.now()) => !(rec.doneAt > rec.startAt) ? 1 : Math.max(0, Math.min(1, (now - rec.startAt) / (rec.doneAt - rec.startAt)));
export function describeLeft(rec, now = Date.now()) {
  const ms = Math.max(0, rec.doneAt - now); if (ms <= 0) return 'now';
  const game = Math.ceil(ms / GAME_DAY_MS), real = ms / 86400e3;
  const g = game >= 60 ? `about ${Math.round(game / 30)} months` : `${game} day${game > 1 ? 's' : ''}`;
  const r = real >= 1 ? `${Math.ceil(real)} real day${Math.ceil(real) > 1 ? 's' : ''}` : `${Math.max(1, Math.ceil(real * 24))} real hour${Math.ceil(real * 24) > 1 ? 's' : ''}`;
  return `${g} on the game's calendar (${r})`;
}

export const MATERIALS = { brick: { name: 'Brick', cost: 9 }, stone: { name: 'Stone', cost: 12 }, wood: { name: 'Timber', cost: 7 }, render: { name: 'Render (plaster)', cost: 8 }, concrete: { name: 'Concrete', cost: 8 }, glass: { name: 'Glass', cost: 15 } };
export const ROOFS = { flat: { name: 'Flat', cost: 2 }, gable: { name: 'Gable (pitched)', cost: 3 }, hip: { name: 'Hip (four slopes)', cost: 3.5 } };
export const WINDOWS = { small: { name: 'Small', w: 1, h: 1, sill: 1.1, k: 1 }, medium: { name: 'Medium', w: 1.4, h: 1.4, sill: 0.9, k: 1.05 }, large: { name: 'Large', w: 2.2, h: 1.9, sill: 0.6, k: 1.12 }, full: { name: 'Floor to ceiling', w: 2.4, h: 2.6, sill: 0.1, k: 1.25 } };
export const SHAPES = { rect: { name: 'Rectangle' }, L: { name: 'L-shape (a wing at the back, to one side)' }, T: { name: 'T-shape (a wing out the back, in the middle)' } };
export const EXTRAS = { garage: { name: 'Garage', cost: 900 }, pool: { name: 'Swimming pool', cost: 1600 }, fence: { name: 'Garden fence', cost: 250 }, porch: { name: 'Porch', cost: 300 }, balcony: { name: 'Balcony', cost: 400 }, chimney: { name: 'Chimney', cost: 150 } };
export const DESIGNS = [
  { name: 'Starter cottage', shape: 'rect', floors: 1, w: 10, d: 8, roof: 'gable', wall: 'brick', wallColor: '#b5563c', roofColor: '#3a3f45', trim: '#f2efe9', door: '#2f4a6b', windows: 'small', extras: { porch: true, fence: true, chimney: true } },
  { name: 'Family house', shape: 'L', floors: 2, w: 14, d: 10, roof: 'gable', wall: 'render', wallColor: '#efe6d2', roofColor: '#5a3a2a', trim: '#ffffff', door: '#7a1f1f', windows: 'medium', extras: { garage: true, fence: true, porch: true, chimney: true } },
  { name: 'Modern villa', shape: 'T', floors: 2, w: 18, d: 12, roof: 'flat', wall: 'render', wallColor: '#f7f7f4', roofColor: '#2a2e33', trim: '#2a2e33', door: '#3a3f45', windows: 'large', extras: { pool: true, balcony: true, garage: true } },
  { name: 'Timber lodge', shape: 'rect', floors: 2, w: 12, d: 10, roof: 'gable', wall: 'wood', wallColor: '#8a5a36', roofColor: '#2f3a2a', trim: '#e8dcc0', door: '#3f2a1a', windows: 'medium', extras: { porch: true, chimney: true, fence: true } },
  { name: 'Glass house', shape: 'rect', floors: 1, w: 16, d: 12, roof: 'flat', wall: 'glass', wallColor: '#9fc4d6', roofColor: '#1f2328', trim: '#1f2328', door: '#1f2328', windows: 'full', extras: { pool: true } },
  { name: 'Stone townhouse', shape: 'rect', floors: 3, w: 9, d: 12, roof: 'hip', wall: 'stone', wallColor: '#b9ad98', roofColor: '#3a3f45', trim: '#f2efe9', door: '#2d5d3a', windows: 'medium', extras: { chimney: true } },
];
// the wing at the back of an L- or T-shaped house
export const wingOf = s => s.shape === 'L' || s.shape === 'T' ? { ww: Math.max(4, Math.min(8, Math.round(s.w * 0.5))), wd: Math.max(4, Math.min(8, Math.round(s.d * 0.6))) } : null;
// the land a house needs (for a plot you pick yourself): a front garden, the house, a back garden or the pool
export function plotSize(s) { const w = wingOf(s); return { pw: s.w + 6 + (s.extras?.garage ? 8 : 0), pd: 10 + s.d + (w ? w.wd : 0) + (s.extras?.pool ? 13 : 4) }; }
export function priceOf(s) {
  const w = wingOf(s), area = s.w * s.d + (w ? w.ww * w.wd : 0), body = area * s.floors * MATERIALS[s.wall].cost * WINDOWS[s.windows].k, roof = area * ROOFS[s.roof].cost;
  const extras = Object.entries(s.extras || {}).reduce((a, [k, v]) => a + (v && EXTRAS[k] ? EXTRAS[k].cost : 0), 0);
  return Math.round((600 + body + roof + extras) / 50) * 50;   // (600 is the land)
}
export const clampSpec = s => ({ ...s, shape: SHAPES[s.shape] ? s.shape : 'rect', floors: Math.max(1, Math.min(3, s.floors | 0)), w: Math.max(8, Math.min(20, +s.w)), d: Math.max(8, Math.min(16, +s.d)), extras: { ...(s.extras || {}) } });

const FH = 3.2, Y0 = 0.15, RUN = 5.4;
// where the house sits on its plot (plot coordinates, the front facing -z): set back from the front, centred
export function layout(p, s) {
  const cx = (p.x0 + p.x1) / 2 - (s.extras.garage ? 3.5 : 0), hz0 = p.z0 + 10, hx0 = cx - s.w / 2, hx1 = cx + s.w / 2, hz1 = hz0 + s.d, w = wingOf(s);
  let wing = null, dc = null;
  if (w) { const x0 = s.shape === 'L' ? hx1 - w.ww : cx - w.ww / 2; wing = { x0, x1: x0 + w.ww, z0: hz1, z1: hz1 + w.wd, cx: x0 + w.ww / 2 }; dc = Math.max(wing.cx, hx0 + 4.1); }
  return { hx0, hx1, hz0, hz1, cx, wing, dc, back: wing ? wing.z1 : hz1 };
}
function stairs(L) {   // flights: even ones front->back by the right wall (strip A), odd ones back->front beside it (strip B)
  const A = [L.hx1 - 1.45, L.hx1 - 0.2], Bs = [L.hx1 - 2.85, L.hx1 - 1.6], s0 = L.hz0 + 1.0, s1 = s0 + RUN;
  return k => k % 2 === 0 ? { x0: A[0], x1: A[1], zLow: s0, zHigh: s1 } : { x0: Bs[0], x1: Bs[1], zLow: s1 + 0.5, zHigh: s1 + 0.5 - RUN };
}
// plot coordinates <-> the world: the plot's middle is at place.x, place.z and it's turned by place.rot (quarter turns)
export function xf(place) {
  const { x: px, z: pz, rot } = place, c = Math.round(Math.cos(rot)), sn = Math.round(Math.sin(rot));
  const toW = (x, z) => [px + x * c + z * sn, pz - x * sn + z * c];
  const toL = (x, z) => { const dx = x - px, dz = z - pz; return [dx * c - dz * sn, dx * sn + dz * c]; };
  const rect = (x0, x1, z0, z1) => { const a = toW(x0, z0), b = toW(x1, z1); return { minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minZ: Math.min(a[1], b[1]), maxZ: Math.max(a[1], b[1]) }; };
  return { toW, toL, rect, rot };
}
const overlap = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

export function createHouseBuilder(ctx) {
  // ctx: { scene, colliders, interactables, sitSpots, planeBlocks, poolZones, doors, makeTex, toast, money(), spend(n),
  //        pause(), resume(), sleep(), chore(kind), eat(n), rest(n), destinations, sign(text,x,y,z,w,colour), rebuild(),
  //        makePerson(o), animatePerson(h,moving,dt), hours(), view() -> {x,y,z,yaw}, landCheck(x,z) -> why not | null,
  //        placeNear(x,z) }
  const { scene, toast } = ctx;
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const flat = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1 }); if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; } return m; };
  // ---- wall textures, drawn in greys so the chosen colour tints them ----
  const texCache = {};
  const wallTex = kind => texCache[kind] ||= (() => {
    const t = ctx.makeTex(128, 128, g => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
      if (kind === 'brick') { g.fillStyle = '#c9c4be'; for (let r = 0; r < 8; r++) { g.fillRect(0, r * 16, 128, 2); for (let c = 0; c < 4; c++) g.fillRect(((r % 2) * 16 + c * 32) % 128, r * 16, 2, 16); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 2); } }
      else if (kind === 'stone') { g.fillStyle = '#bdb8b0'; let y = 0; while (y < 128) { const h = 14 + Math.random() * 12; let x = -Math.random() * 20; while (x < 128) { const w = 18 + Math.random() * 26; g.fillStyle = `rgb(${225 + Math.random() * 30},${222 + Math.random() * 30},${215 + Math.random() * 30})`; g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3); x += w; } y += h; } }
      else if (kind === 'wood') { for (let r = 0; r < 8; r++) { g.fillStyle = `rgb(${235 + (r % 2) * 15},${232 + (r % 2) * 15},${228 + (r % 2) * 15})`; g.fillRect(0, r * 16, 128, 15); g.fillStyle = '#a9a39a'; g.fillRect(0, r * 16 + 14, 128, 2); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, r * 16 + 3 + k * 2, 128, 1); } } }
      else if (kind === 'concrete') { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#bcbcbc'; g.fillRect(0, 63, 128, 2); g.fillRect(63, 0, 2, 128); for (const [x, y] of [[16, 16], [112, 16], [16, 112], [112, 112], [48, 48], [80, 80]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); } }
      else { for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); } }   // render
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const TILE = { brick: 2, stone: 2.5, wood: 2, concrete: 3, render: 3, glass: 3 };
  // a box whose texture is tiled by its real size (so bricks are brick-sized on every wall)
  const boxUV = (w, h, d, tile) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); } return g; };
  // ---------------- the estate: plots, a road in, the office ----------------
  const root = new THREE.Group(); root.name = 'maple fields'; scene.add(root);
  const B = (w, h, d, x, y, z, m, solid = false, parent = root) => { const b = new THREE.Mesh(geoBox, m instanceof THREE.Material ? m : flat(m)); b.scale.set(w, h, d); b.position.set(x, y, z); b.castShadow = h > 1; b.receiveShadow = true; parent.add(b); if (solid) ctx.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return b; };
  const lawn = flat(0x5f8a3e, { rough: 1 }), paving = flat(0xb8b3a8, { rough: 0.9 });
  const homes = new Map();   // id -> a plot and what's on it: { place, size, spec, startAt, doneAt, site, built, ... }
  function makeHome(id, place, size, extra = {}) {
    const X = xf(place), g = new THREE.Group(); g.position.set(place.x, 0, place.z); g.rotation.y = place.rot; root.add(g);
    const h = { id, place, size, X, g, wb: X.rect(-size.pw / 2, size.pw / 2, -size.pd / 2, size.pd / 2), its: [], cols: [], ...extra };
    homes.set(id, h); return h;
  }
  const localPlot = h => ({ x0: -h.size.pw / 2, x1: h.size.pw / 2, z0: -h.size.pd / 2, z1: h.size.pd / 2 });
  for (const p of PLOTS) {
    const cx = (p.x0 + p.x1) / 2;
    B(p.x1 - p.x0, 0.04, p.z1 - p.z0, cx, 0.02, (p.z0 + p.z1) / 2, lawn);
    B(3, 0.05, p.z0 - ESTATE.roadZ + 0.5, cx, 0.03, (ESTATE.roadZ + p.z0) / 2, paving);   // a drive from the road
    const sale = new THREE.Group(); sale.position.set(cx + 6, 0, p.z0 + 1.5); root.add(sale); B(0.12, 2.2, 0.12, 0, 1.1, 0, 0x6b4a2f, false, sale);
    const t = ctx.makeTex(256, 128, g => { g.fillStyle = '#c0392b'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('PLOT ' + p.n, 128, 50); g.font = 'bold 26px sans-serif'; g.fillText('FOR SALE · BUILD YOUR OWN', 128, 95); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: t })); s.position.set(0, 2.1, -0.07); s.rotation.y = Math.PI; sale.add(s);
    makeHome(p.id, { x: cx, z: (p.z0 + p.z1) / 2, rot: 0 }, { pw: p.x1 - p.x0, pd: p.z1 - p.z0 }, { maple: true, n: p.n, sale });
  }
  // the builder's office
  { const { x, z } = OFFICE, render = new THREE.MeshStandardMaterial({ color: 0xf1ece2, map: wallTex('render'), roughness: 0.85 }), navy = flat(0x2f4a6b, { rough: 0.5 }), glass = flat(0x9fd3ff, { opacity: 0.35, rough: 0.05, metal: 0.3 }), frame = flat(0x22272e, { metal: 0.5, rough: 0.4 });
    const zf = z - 1.5, zb = z + 5.5;   // the front wall and back wall
    B(9, 0.05, 6, x, 0.03, z - 4.4, paving);   // the forecourt
    B(9, 3.6, 0.25, x, 1.8, zb, render, true); for (const sx of [-1, 1]) B(0.25, 3.6, 7, x + sx * 4.5, 1.8, z + 2, render, true);
    for (const sx of [-1, 1]) { B(2.6, 3.6, 0.25, x + sx * 3.2, 1.8, zf, render); ctx.colliders.push({ minX: x + sx * 3.2 - 1.3, maxX: x + sx * 3.2 + 1.3, minZ: zf - 0.13, maxZ: zf + 0.13 }); }
    B(3.8, 2.6, 0.06, x, 1.35, zf, glass); B(3.8, 1.0, 0.25, x, 3.1, zf, render); for (const dx of [-1.9, 0, 1.9]) B(0.08, 2.6, 0.1, x + dx, 1.35, zf - 0.05, frame);
    ctx.colliders.push({ minX: x - 1.9, maxX: x + 1.9, minZ: zf - 0.1, maxZ: zf + 0.1 });   // (the shopfront: you talk to the agent from the forecourt)
    B(9.8, 0.3, 9, x, 3.75, z + 1.3, navy); for (const sx of [-1, 1]) B(0.15, 3.6, 0.15, x + sx * 4.6, 1.8, zf - 2.3, frame);   // a canopy over the forecourt
    { const m = flat(0xe8e2d6, { rough: 0.9 }); m.side = THREE.BackSide; B(8.7, 3.4, 6.7, x, 1.75, z + 2, m); }   // (the inside, seen through the glass)
    B(2.4, 0.8, 1.2, x, 0.4, z + 1, flat(0x6b4a33)); B(0.7, 0.35, 0.5, x - 0.5, 0.97, z + 1, flat(0xb5563c)); B(0.6, 0.3, 0.45, x + 0.5, 0.95, z + 1, flat(0xefe6d2));   // the agent's desk and two model houses
    const model = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 4), flat(0x3a3f45)); model.rotation.y = Math.PI / 4; model.position.set(x - 0.5, 1.3, z + 1); root.add(model);
    for (const dx of [-3.4, 3.4]) { const fr = ctx.makeTex(256, 192, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 192); g.fillStyle = dx < 0 ? '#b5563c' : '#efe6d2'; g.fillRect(58, 80, 140, 90); g.fillStyle = '#3a3f45'; g.beginPath(); g.moveTo(44, 82); g.lineTo(128, 26); g.lineTo(212, 82); g.fill(); g.fillStyle = '#2f4a6b'; g.fillRect(116, 120, 24, 50); g.fillStyle = '#5f86a6'; g.fillRect(72, 100, 30, 24); g.fillRect(154, 100, 30, 24); g.fillStyle = '#111'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText(dx < 0 ? 'FROM 2,000 GOLD' : 'YOUR DESIGN, YOUR WAY', 128, 188); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.35), new THREE.MeshBasicMaterial({ map: fr })); m.position.set(x + dx, 1.8, zf - 0.14); m.rotation.y = Math.PI; root.add(m); }
    ctx.sign?.('MAPLE FIELDS HOMEBUILDERS', x, 4.25, zf - 2.3, 9, '#2f4a6b');
    for (const dx of [-4, 4]) { B(1, 0.6, 1, x + dx, 0.3, zf - 4.4, flat(0x8f938f)); const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), flat(0x3f6f2a, { rough: 1 })); bush.position.set(x + dx, 0.95, zf - 4.4); root.add(bush); }
    { const t = ctx.makeTex(512, 256, g => { g.fillStyle = '#2f4a6b'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#f4f1ea'; g.textAlign = 'center'; g.font = 'bold 64px sans-serif'; g.fillText('MAPLE FIELDS', 256, 92); g.font = '32px sans-serif'; g.fillText('New homes · 10 plots', 256, 150); g.fillText('Design and build your own', 256, 200); });
      const board = new THREE.Group(); board.position.set(x - 8, 0, ESTATE.roadZ + 3); root.add(board); for (const dx of [-1.3, 1.3]) B(0.15, 2.6, 0.15, dx, 1.3, 0, flat(0x6b4a2f), false, board);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshStandardMaterial({ map: t })); m.position.set(0, 1.9, -0.09); m.rotation.y = Math.PI; board.add(m); B(3.1, 1.6, 0.06, 0, 1.9, -0.02, flat(0x6b4a2f), false, board); }
    ctx.interactables.push({ pos: new THREE.Vector3(x, 0, zf - 1.2), r: 2.6, label: 'Design and buy a house (Maple Fields Homebuilders)', action: () => openPanel() }); }
  ctx.destinations?.push({ name: 'Maple Fields (build your own house)', x: OFFICE.x, z: OFFICE.z - 8 });
  const nearOf = place => place.near || (place.near = ctx.placeNear?.(place.x, place.z) || 'Westhaven');   // (worked out once, when you buy the land)
  const nameOf = h => h.maple ? `plot ${h.n} at Maple Fields` : `your land near ${nearOf(h.place)}`;

  // ---------------- the finished house ----------------
  const glassM2 = () => flat(0x9fd3ff, { opacity: 0.3, rough: 0.05 });
  const wallMatOf = s => s.wall === 'glass' ? flat(s.wallColor, { opacity: 0.35, rough: 0.05, metal: 0.4 }) : new THREE.MeshStandardMaterial({ color: s.wallColor, map: wallTex(s.wall), roughness: s.wall === 'render' ? 0.85 : 0.9 });
  // every outside wall of the house: [along x?, where, from, to, which way is out, which wall]
  function wallsOf(L) {
    const { hx0, hx1, hz0, hz1, wing } = L;
    const w = [[true, hz0, hx0, hx1, -1, 'front'], [true, hz1, hx0, hx1, 1, 'back'], [false, hx0, hz0, hz1, -1, 'side'], [false, hx1, hz0, hz1, 1, 'side']];
    if (wing) w.push([false, wing.x0, wing.z0, wing.z1, -1, 'side'], [false, wing.x1, wing.z0, wing.z1, 1, 'side'], [true, wing.z1, wing.x0, wing.x1, 1, 'side']);
    return w;
  }
  // the windows and doors in a wall (positions along the wall, from its start)
  function openingsOf(s, L, wall, k) {
    const [alongX, , a, b, , kind] = wall, len = b - a, Wd = WINDOWS[s.windows], front = kind === 'front', ground = k === 0, list = [];
    const skip = kind === 'back' && L.wing ? [L.wing.x0 - a - 0.3, L.wing.x1 - a + 0.3] : null;
    if (s.wall !== 'glass') { const n = Math.max(1, Math.floor(len / (Wd.w + 1.6))), gap = len / n;
      for (let i = 0; i < n; i++) { const c = gap * (i + 0.5); if (front && ground && Math.abs(c - len / 2) < Wd.w / 2 + 1.1) continue; if (skip && c + Wd.w / 2 > skip[0] && c - Wd.w / 2 < skip[1]) continue;
        list.push({ a: c - Wd.w / 2, b: c + Wd.w / 2, y0: Wd.sill, y1: Math.min(FH - 0.25, Wd.sill + Wd.h), glass: true }); } }
    if (front && ground) list.push({ a: len / 2 - 0.6, b: len / 2 + 0.6, y0: 0, y1: 2.3, door: true });
    if (skip) list.push({ a: L.dc - a - 0.65, b: L.dc - a + 0.65, y0: 0, y1: 2.3, arch: true });   // through to the wing
    void alongX; return list.sort((u, v) => u.a - v.a);
  }
  function build(h) {
    const s = h.spec, p = localPlot(h), X = h.X, g = new THREE.Group(); h.g.add(g); h.house = g;
    const L = layout(p, s), { hx0, hx1, hz0, hz1, cx, wing } = L, W = s.w, D = s.d;
    const solid = (x0, x1, z0, z1, base) => { const c = X.rect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)); if (base != null) c.baseYAt = () => base; ctx.colliders.push(c); h.cols.push(c); return c; };
    const spot = (x, z, y, r, label, action) => { const [wx, wz] = X.toW(x, z); const it = { pos: new THREE.Vector3(wx, y, wz), r, label, action }; ctx.interactables.push(it); h.its.push(it); };
    const seat = (x, z, y, yaw, label, extra = {}) => { const [wx, wz] = X.toW(x, z); ctx.sitSpots?.push({ x: wx, z: wz, yaw: yaw + X.rot, seatY: y, label, ...extra }); };
    const door = (a, b, y, o = {}) => ctx.doors?.add({ a: X.toW(a[0], a[1]), b: X.toW(b[0], b[1]), y, ...o });
    const Bx = (w, hh, d, x, y, z, m) => B(w, hh, d, x, y, z, m, false, g);
    const wallMat = wallMatOf(s), trim = flat(s.trim, { rough: 0.5 }), glassM = flat(0x9fc4d6, { opacity: 0.3, rough: 0.05, metal: 0.3 }), inner = flat(0xf3efe6, { rough: 0.85 });
    const wpiece = (alongX, at, out, a, b, y0, y1) => { const len = b - a, hh = y1 - y0; if (len < 0.02 || hh < 0.02) return; const mats = Array(6).fill(wallMat);   // (plastered inside: only the outside face shows the brick, stone or timber)
      if (s.wall !== 'glass') mats[alongX ? (out > 0 ? 5 : 4) : (out > 0 ? 1 : 0)] = inner;
      const m = new THREE.Mesh(alongX ? boxUV(len, hh, 0.25, TILE[s.wall]) : boxUV(0.25, hh, len, TILE[s.wall]), mats); m.position.set(alongX ? (a + b) / 2 : at, (y0 + y1) / 2, alongX ? at : (a + b) / 2); m.castShadow = true; m.receiveShadow = true; g.add(m); };
    const wsolid = (alongX, at, a, b, base, t = 0.13) => alongX ? solid(a, b, at - t, at + t, base) : solid(at - t, at + t, a, b, base);
    for (let k = 0; k < s.floors; k++) {
      const yb = Y0 + k * FH, yt = yb + FH;
      for (const wall of wallsOf(L)) {
        const [alongX, at, a, b, out] = wall; let pos = a;
        for (const o of openingsOf(s, L, wall, k)) {
          const oa = a + o.a, ob = a + o.b; wpiece(alongX, at, out, pos, oa, yb, yt); if (oa - pos > 0.02) wsolid(alongX, at, pos, oa, yb);
          wpiece(alongX, at, out, oa, ob, yb, yb + o.y0); wpiece(alongX, at, out, oa, ob, yb + o.y1, yt);
          if (o.glass) { const gw = ob - oa, gh = o.y1 - o.y0, my = yb + (o.y0 + o.y1) / 2, mc = (oa + ob) / 2;
            if (alongX) { Bx(gw, gh, 0.04, mc, my, at, glassM); Bx(gw + 0.14, 0.1, 0.32, mc, yb + o.y0, at, trim); Bx(gw + 0.14, 0.1, 0.32, mc, yb + o.y1, at, trim); Bx(0.08, gh, 0.32, oa, my, at, trim); Bx(0.08, gh, 0.32, ob, my, at, trim); }
            else { Bx(0.04, gh, gw, at, my, mc, glassM); Bx(0.32, 0.1, gw + 0.14, at, yb + o.y0, mc, trim); Bx(0.32, 0.1, gw + 0.14, at, yb + o.y1, mc, trim); Bx(0.32, gh, 0.08, at, my, oa, trim); Bx(0.32, gh, 0.08, at, my, ob, trim); }
            wsolid(alongX, at, oa, ob, yb, 0.1); }
          if (o.door) door(alongX ? [oa, at] : [at, oa], alongX ? [ob, at] : [at, ob], yb, { h: 2.3, color: new THREE.Color(s.door).getHex(), glass: s.wall === 'glass' });
          pos = ob;
        }
        wpiece(alongX, at, out, pos, b, yb, yt); if (b - pos > 0.02) wsolid(alongX, at, pos, b, yb);
        if (s.wall === 'glass') for (let m2 = a; m2 <= b + 0.01; m2 += 2) alongX ? Bx(0.1, FH, 0.3, m2, yb + FH / 2, at, trim) : Bx(0.3, FH, 0.1, at, yb + FH / 2, m2, trim);
      }
    }
    // floors and ceilings, with the stairwells left open
    const flight = stairs(L), floorM = flat(0xc9a77a, { rough: 0.55 }), ceilM = flat(0xf4f1ea, { emissive: 0x4a4844, ei: 0.4 });
    const voidOf = k => { if (k <= 0) return null; const f = flight(k - 1), hi = f.zHigh, lo = f.zLow, z0 = Math.min(lo + (hi - lo) * 0.4, hi), z1 = Math.max(lo + (hi - lo) * 0.4, hi); return { x0: f.x0 - 0.05, x1: f.x1 + 0.05, z0, z1 }; };
    const slab = (r, y, hh, m, hole) => { const parts = hole ? [[r.x0, hole.x0, r.z0, r.z1], [hole.x1, r.x1, r.z0, r.z1], [hole.x0, hole.x1, r.z0, hole.z0], [hole.x0, hole.x1, hole.z1, r.z1]] : [[r.x0, r.x1, r.z0, r.z1]]; for (const [a, b, c, d] of parts) if (b - a > 0.02 && d - c > 0.02) Bx(b - a - 0.02, hh, d - c - 0.02, (a + b) / 2, y, (c + d) / 2, m); };
    const mainR = { x0: hx0, x1: hx1, z0: hz0, z1: hz1 }, blocks = wing ? [mainR, { x0: wing.x0, x1: wing.x1, z0: wing.z0, z1: wing.z1 }] : [mainR];
    for (const r of blocks) { Bx(r.x1 - r.x0 + 0.4, Y0, r.z1 - r.z0 + 0.4, (r.x0 + r.x1) / 2, Y0 / 2, (r.z0 + r.z1) / 2, flat(0x8f938f)); slab(r, Y0 + 0.01, 0.02, floorM); }   // the foundations
    for (let k = 1; k <= s.floors; k++) { const y = Y0 + k * FH;
      for (const r of blocks) { const hole = r === mainR && k < s.floors ? voidOf(k) : null; if (k < s.floors) { slab(r, y - 0.12, 0.24, floorM, hole); slab(r, y - 0.26, 0.03, ceilM, hole); } else slab(r, y - 0.04, 0.04, ceilM); } }
    // the stairs (12 steps a flight), with a rail; you can't walk into the high end from below
    const stepM = flat(0xb08a5e, { rough: 0.6 });
    for (let k = 0; k < s.floors - 1; k++) {
      const f = flight(k), yb = Y0 + k * FH, n = 12;
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, z0 = f.zLow + (f.zHigh - f.zLow) * t0, z1 = f.zLow + (f.zHigh - f.zLow) * t1, top = FH * t1; Bx(f.x1 - f.x0, top, Math.abs(z1 - z0), (f.x0 + f.x1) / 2, yb + top / 2, (z0 + z1) / 2, stepM); }
      const hiZ0 = f.zLow + (f.zHigh - f.zLow) * 0.7, sideZ = f.zLow + (f.zHigh - f.zLow) * 0.34;   // (from below, the high end is a wall; so is the open side once the steps are knee high)
      solid(f.x0 - 0.04, f.x1 + 0.04, Math.min(hiZ0, f.zHigh), Math.max(hiZ0, f.zHigh), yb);
      solid(f.x0 - 0.1, f.x0 - 0.02, Math.min(sideZ, f.zHigh), Math.max(sideZ, f.zHigh), yb); Bx(0.05, 0.9, Math.abs(f.zHigh - sideZ), f.x0 - 0.06, yb + FH * 0.67 + 0.45, (sideZ + f.zHigh) / 2, glassM);
      const v = voidOf(k + 1), y1 = Y0 + (k + 1) * FH;   // rails round the hole upstairs: the inner side, and the end you don't arrive at
      Bx(0.05, 1, v.z1 - v.z0, v.x0, y1 + 0.5, (v.z0 + v.z1) / 2, glassM); solid(v.x0 - 0.06, v.x0 + 0.06, v.z0, v.z1, y1);
      if (k % 2 === 1) { Bx(0.05, 1, v.z1 - v.z0, v.x1, y1 + 0.5, (v.z0 + v.z1) / 2, glassM); solid(v.x1 - 0.06, v.x1 + 0.06, v.z0, v.z1, y1); }
      const endZ = k % 2 === 0 ? v.z0 : v.z1; Bx(v.x1 - v.x0, 1, 0.05, (v.x0 + v.x1) / 2, y1 + 0.5, endZ, glassM); solid(v.x0, v.x1, endZ - 0.06, endZ + 0.06, y1);
    }
    // ---- the roof ----
    const top = Y0 + s.floors * FH;
    roofOver(g, s, mainR, top, true, flat(s.roofColor, { rough: 0.7 }), wallMat, [true, true]);
    if (wing) roofOver(g, s, blocks[1], top, false, flat(s.roofColor, { rough: 0.7 }), wallMat, [false, true]);
    // ---- extras ----
    const roofM = flat(s.roofColor, { rough: 0.7 });
    if (s.extras.chimney) Bx(0.9, s.roof === 'flat' ? 1.6 : 4.2, 0.9, hx0 + 1.5, top + (s.roof === 'flat' ? 0.8 : 2.1), hz1 - 2, flat(0x8a4a3a));
    if (s.extras.porch) { Bx(3.4, 0.15, 2, cx, Y0 + 2.7, hz0 - 1, roofM); for (const sd of [-1, 1]) Bx(0.15, 2.7, 0.15, cx + sd * 1.5, Y0 + 1.35, hz0 - 1.9, trim); Bx(3.4, Y0, 2, cx, Y0 / 2, hz0 - 1, flat(0x8f938f)); }
    if (s.extras.balcony && s.floors > 1) { const y = Y0 + FH; Bx(W * 0.5, 0.2, 1.6, cx, y, hz0 - 0.8, flat(0x8f938f)); Bx(W * 0.5, 1, 0.05, cx, y + 0.6, hz0 - 1.6, glassM); Bx(W * 0.5, 0.06, 0.08, cx, y + 1.1, hz0 - 1.6, trim); }
    if (s.extras.garage) { const gx = hx1 + 3.5; Bx(6.6, 3, 7, gx, 1.5, hz0 + 3.5, wallMat); Bx(6.9, 0.25, 7.3, gx, 3.1, hz0 + 3.5, roofM); Bx(5, 2.4, 0.06, gx, 1.25, hz0 - 0.03, flat(new THREE.Color(s.door).getHex())); for (let k = 0; k < 6; k++) Bx(5, 0.04, 0.08, gx, 0.3 + k * 0.4, hz0 - 0.06, trim); solid(gx - 3.3, gx + 3.3, hz0, hz0 + 7); Bx(5, 0.05, hz0 - p.z0, gx, 0.03, (p.z0 + hz0) / 2, paving); }
    let poolRect = null;
    if (s.extras.pool) {   // a raised pool in the back garden: a stone rim you walk round (steps up at the house end), 1.2 m of water
      const pz0 = L.back + 3.5, pz1 = Math.min(p.z1 - 2, pz0 + 7), pw = Math.min(W, 10), x0 = cx - pw / 2, x1 = cx + pw / 2, rim = flat(0xe8e2d6, { rough: 0.8 }), RIM = 1.25;
      if (pz1 - pz0 >= 4) {
        for (const [w, d, x, z] of [[pw + 1.6, 0.8, cx, pz0 - 0.4], [pw + 1.6, 0.8, cx, pz1 + 0.4], [0.8, pz1 - pz0, x0 - 0.4, (pz0 + pz1) / 2], [0.8, pz1 - pz0, x1 + 0.4, (pz0 + pz1) / 2]]) Bx(w, RIM, d, x, RIM / 2, z, rim);
        Bx(pw, 0.05, pz1 - pz0, cx, 0.03, (pz0 + pz1) / 2, flat(0x2f8fbf));
        Bx(pw, 0.04, pz1 - pz0, cx, RIM - 0.17, (pz0 + pz1) / 2, flat(0x3fa9d6, { opacity: 0.7, rough: 0.05, emissive: 0x0b4f6a, ei: 0.35 }));
        for (let i = 0; i < 5; i++) Bx(2, RIM * (i + 1) / 5, 0.5, cx, RIM * (i + 1) / 10, pz0 - 0.8 - (4 - i) * 0.5 - 0.25, rim);   // the steps up
        ctx.poolZones?.push({ ...X.rect(x0, x1, pz0, pz1), waterY: RIM - 0.15 });
        const under = -0.9;   // (the rim's walls stop you walking into it from the lawn, or swimming out except by the steps; on top you walk freely)
        for (const [mx0, mx1, mz0, mz1] of [[x0 - 0.8, x1 + 0.8, pz1, pz1 + 0.8], [x0 - 0.8, x0, pz0 - 0.8, pz1 + 0.8], [x1, x1 + 0.8, pz0 - 0.8, pz1 + 0.8], [x0, cx - 1.1, pz0 - 0.8, pz0], [cx + 1.1, x1, pz0 - 0.8, pz0]]) solid(mx0, mx1, mz0, mz1, under);
        poolRect = { x0, x1, z0: pz0, z1: pz1, rim: RIM, cx }; } }
    if (s.extras.fence) { const fm = flat(0xf2efe9, { rough: 0.6 }); for (const [a, b, z] of [[p.x0, cx - 2, p.z0 + 0.3], [cx + 2, s.extras.garage ? hx1 + 0.8 : p.x1, p.z0 + 0.3], ...(s.extras.garage ? [[hx1 + 6.2, p.x1, p.z0 + 0.3]] : [])]) if (b > a) { Bx(b - a, 0.08, 0.06, (a + b) / 2, 0.85, z, fm); Bx(b - a, 0.08, 0.06, (a + b) / 2, 0.45, z, fm); for (let x = a; x <= b; x += 0.6) Bx(0.08, 1, 0.08, x, 0.5, z, fm); solid(a, b, z - 0.1, z + 0.1); }
      for (const x of [p.x0, p.x1]) { Bx(0.06, 1, p.z1 - p.z0, x, 0.5, (p.z0 + p.z1) / 2, fm); solid(x - 0.1, x + 0.1, p.z0, p.z1); } Bx(p.x1 - p.x0, 1, 0.06, (p.x0 + p.x1) / 2, 0.5, p.z1, fm); solid(p.x0, p.x1, p.z1 - 0.1, p.z1 + 0.1); }
    Bx(1.6, 0.05, hz0 - p.z0, cx, 0.03, (p.z0 + hz0) / 2, paving);   // the path to the door
    if (!h.maple) Bx(p.x1 - p.x0, 0.03, p.z1 - p.z0, 0, 0.015, 0, lawn);   // your own land gets a lawn
    // ---- inside ----
    furnish(g, s, L, { solid, spot, seat, door, Bx });
    for (const r of blocks) ctx.planeBlocks?.push({ ...X.rect(r.x0, r.x1, r.z0, r.z1), top: top + 1 });   // indoors: first person
    h.layout = L; h.flight = flight; h.pool = poolRect; h.built = true; ctx.rebuild?.();
  }
  // a roof over one block: ridge along x (the main house) or along z (the wing); gable ends where asked
  function roofOver(g, s, r, top, alongX, roofM, wallMat, ends) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0, xc = (r.x0 + r.x1) / 2, zc = (r.z0 + r.z1) / 2, Bx = (a, b, c, x, y, z, m) => B(a, b, c, x, y, z, m, false, g);
    if (s.roof === 'flat') { Bx(w + 0.6, 0.3, d + 0.6, xc, top + 0.15, zc, roofM); for (const [a, b, x, z] of [[w + 0.6, 0.2, xc, r.z0 - 0.2], [w + 0.6, 0.2, xc, r.z1 + 0.2], [0.2, d + 0.6, r.x0 - 0.2, zc], [0.2, d + 0.6, r.x1 + 0.2, zc]]) Bx(a, 0.6, b, x, top + 0.6, z, wallMat); return; }
    if (s.roof === 'gable') {
      const across = alongX ? d : w, len = alongX ? w : d, rise = Math.min(4, across * 0.38), sh = new THREE.Shape(); sh.moveTo(-across / 2 - 0.5, 0); sh.lineTo(across / 2 + 0.5, 0); sh.lineTo(0, rise); sh.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: len + 0.8, bevelEnabled: false }), roofM); m.castShadow = true; g.add(m);
      if (alongX) { m.rotation.y = Math.PI / 2; m.position.set(r.x0 - 0.4, top, zc); } else m.position.set(xc, top, r.z0 - 0.4);
      const gsh = new THREE.Shape(); gsh.moveTo(-across / 2, 0); gsh.lineTo(across / 2, 0); gsh.lineTo(0, rise - 0.3); gsh.closePath();
      [alongX ? r.x0 + 0.02 : r.z0 + 0.02, alongX ? r.x1 - 0.02 : r.z1 - 0.02].forEach((at, i) => { if (!ends[i]) return; const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gsh, { depth: 0.2, bevelEnabled: false }), wallMat); g.add(gm);
        if (alongX) { gm.rotation.y = Math.PI / 2; gm.position.set(at - 0.1, top, zc); } else gm.position.set(xc, top, at - 0.1); });
      return; }
    const rise = Math.min(4, Math.min(w, d) * 0.4), geo = new THREE.ConeGeometry(Math.SQRT1_2, rise, 4, 1); geo.rotateY(Math.PI / 4);   // (a square pyramid, stretched over the block)
    const m = new THREE.Mesh(geo, roofM); m.scale.set(w + 1.2, 1, d + 1.2); m.position.set(xc, top + rise / 2, zc); m.castShadow = true; g.add(m);
  }
  function furnish(g, s, L, { solid, spot, seat, door, Bx }) {
    const { hx0, hx1, hz0, hz1, wing } = L;
    const wood = flat(0x6b4a33, { rough: 0.6 }), cream = flat(0xe9e4da, { rough: 0.8 }), white = flat(0xf8f8f5, { rough: 0.25 }), dark = flat(0x2a2e33, { rough: 0.5 }), tile = flat(0xdfe6ea, { rough: 0.35 });
    const xR = s.floors > 1 ? hx1 - 3.1 : hx1 - 0.3;   // (the stairs take the right-hand side)
    const y0 = Y0;
    const kitchen = (ka, kb, zWall, tz) => {   // a run of units along a back wall, and a table for four in front if there's room
      Bx(kb - ka, 0.9, 0.6, (ka + kb) / 2, y0 + 0.45, zWall - 0.42, white); Bx(kb - ka + 0.05, 0.05, 0.65, (ka + kb) / 2, y0 + 0.92, zWall - 0.42, dark); solid(ka, kb, zWall - 0.75, zWall, y0);
      spot((ka + kb) / 2, zWall - 1.3, y0, 1.6, 'Cook something', () => { ctx.eat?.(25); toast('🍳 You cook a proper meal in your own kitchen.'); });
      if (tz == null) return; const tx = (ka + kb) / 2;
      Bx(1.6, 0.06, 0.9, tx, y0 + 0.76, tz, wood); Bx(0.1, 0.74, 0.1, tx, y0 + 0.38, tz, wood); for (const dx of [-0.5, 0.5]) for (const sd of [-1, 1]) { Bx(0.4, 0.45, 0.4, tx + dx, y0 + 0.23, tz + sd * 0.75, wood); seat(tx + dx, tz + sd * 0.75, y0 + 0.47, sd > 0 ? Math.PI : 0, 'Sit at the table'); } solid(tx - 0.8, tx + 0.8, tz - 0.45, tz + 0.45, y0); };
    // ground floor: the living room at the front left (a sofa facing the TV on the side wall)
    { const sx = hx0 + 2.9, sz = hz0 + 2.6, rug = flat(0x7b2f2f, { rough: 1 });
      Bx(0.9, 0.45, 2.4, sx, y0 + 0.25, sz, cream); Bx(0.22, 0.6, 2.4, sx + 0.4, y0 + 0.7, sz, cream); solid(sx - 0.45, sx + 0.5, sz - 1.2, sz + 1.2, y0); for (const dz of [-0.7, 0.7]) seat(sx - 0.05, sz + dz, y0 + 0.45, -Math.PI / 2, 'Sit on the sofa');
      Bx(0.6, 0.35, 1.2, sx - 1.3, y0 + 0.18, sz, wood); solid(sx - 1.6, sx - 1.0, sz - 0.6, sz + 0.6, y0); Bx(2.4, 0.02, 2.8, sx - 1.2, y0 + 0.03, sz, rug);
      Bx(0.4, 0.5, 1.8, hx0 + 0.4, y0 + 0.25, sz, wood); Bx(0.06, 0.85, 1.5, hx0 + 0.45, y0 + 1.0, sz, flat(0x050505, { rough: 0.2 })); solid(hx0, hx0 + 0.6, sz - 0.9, sz + 0.9, y0);
      spot(sx - 0.8, sz, y0, 1.6, 'Watch TV', () => { ctx.rest?.(5); toast('📺 You put your feet up and watch TV in your own living room.'); }); }
    // the kitchen: in the wing if there is one, otherwise along the back wall
    if (wing) kitchen(wing.x0 + 0.3, wing.x1 - 0.3, wing.z1, wing.z1 - wing.z0 >= 5 ? (wing.z0 + wing.z1) / 2 - 0.3 : null);
    else { const ka = hx0 + (s.floors > 1 ? 0.3 : 3.6), kb = Math.min(xR - 0.2, ka + 5); if (kb - ka > 1.5) kitchen(ka, kb, hz1, hz1 - 2.6 - hz0 > 4 ? hz1 - 2.6 : null); }
    // the bathroom and bedroom: upstairs if there is one, otherwise at the back of the ground floor
    const by = s.floors > 1 ? Y0 + FH : y0;
    const bx0 = hx0, bx1 = hx0 + 3.2, bz0 = hz1 - 3.2, bz1 = hz1;   // bathroom: the back-left corner
    { const inner = flat(0xf3efe6, { rough: 0.85 }), hh = FH - 0.3;
      Bx(0.15, hh, 3.2, bx1, by + hh / 2, (bz0 + bz1) / 2, inner); solid(bx1 - 0.08, bx1 + 0.08, bz0, bz1, by);
      Bx(1.8, hh, 0.15, bx0 + 0.9, by + hh / 2, bz0, inner); Bx(0.4, hh, 0.15, bx1 - 0.2, by + hh / 2, bz0, inner); Bx(1.0, hh - 2.2, 0.15, bx0 + 2.3, by + 2.2 + (hh - 2.2) / 2, bz0, inner);
      solid(bx0, bx0 + 1.8, bz0 - 0.08, bz0 + 0.08, by); solid(bx1 - 0.4, bx1, bz0 - 0.08, bz0 + 0.08, by);
      door([bx0 + 1.8, bz0], [bx0 + 2.8, bz0], by, { color: 0xf2efe9 });
      Bx(3.1, 0.02, 3.1, (bx0 + bx1) / 2, by + 0.025, (bz0 + bz1) / 2, tile);
      Bx(0.4, 0.4, 0.5, bx0 + 0.45, by + 0.2, bz0 + 0.7, white); Bx(0.16, 0.38, 0.42, bx0 + 0.18, by + 0.62, bz0 + 0.7, white); seat(bx0 + 0.5, bz0 + 0.7, by + 0.45, Math.PI / 2, 'Use the toilet', { toilet: true });
      Bx(1.3, 0.1, 1.3, bx1 - 0.75, by + 0.06, bz1 - 0.75, white); Bx(0.04, 2, 1.3, bx1 - 1.4, by + 1.05, bz1 - 0.75, glassM2()); spot(bx1 - 0.75, bz1 - 0.75, by, 1, 'Take a shower', () => ctx.chore?.('shower'));
      Bx(0.6, 0.85, 0.42, bx0 + 1.6, by + 0.43, bz1 - 0.3, white); spot(bx0 + 1.6, bz1 - 0.95, by, 0.8, 'Wash your hands', () => ctx.chore?.('handwash')); }
    const bed = (x, z, y, label, side) => { Bx(1.8, 0.45, 2.2, x, y + 0.25, z, wood); Bx(1.7, 0.22, 2.1, x, y + 0.55, z, white); Bx(1.75, 0.05, 1.2, x, y + 0.68, z + 0.4, flat(0x2f4a6b)); solid(x - 0.9, x + 0.9, z - 1.1, z + 1.1, y); spot(x + side * 1.4, z, y, 1.4, label, () => ctx.sleep?.()); };
    if (s.floors > 1) bed(hx0 + 2, hz0 + 2.2, by, 'Sleep in your bed', 1); else bed(hx1 - 1.3, hz0 + 1.6, by, 'Sleep in your bed', -1);   // (a bungalow's is in the front right corner)
    if (s.floors > 2) { const y2 = Y0 + 2 * FH; Bx(1.6, 0.45, 2, hx0 + 2, y2 + 0.25, hz1 - 1.5, wood); Bx(1.5, 0.22, 1.9, hx0 + 2, y2 + 0.55, hz1 - 1.5, white); solid(hx0 + 1.2, hx0 + 2.8, hz1 - 2.5, hz1 - 0.5, y2); spot(hx0 + 3.2, hz1 - 1.5, y2, 1.4, 'Sleep in the spare bed', () => ctx.sleep?.());
      Bx(1.6, 0.06, 0.8, hx0 + 2, y2 + 0.76, hz0 + 1.2, wood); seat(hx0 + 2, hz0 + 1.9, y2 + 0.47, Math.PI, 'Sit at the desk'); }
    if (wing) for (let k = 1; k < s.floors; k++) {   // upstairs in the wing: another bedroom, with a wardrobe
      const y = Y0 + k * FH; bed(wing.cx, wing.z1 - 1.25, y, 'Sleep in the guest bed', wing.x1 - wing.cx > 2.2 ? 1 : -1);
      Bx(0.6, 2, 1.4, wing.x0 + 0.35, y + 1, wing.z0 + 1.6, wood); solid(wing.x0, wing.x0 + 0.65, wing.z0 + 0.9, wing.z0 + 2.3, y); }
  }

  // ---------------- the building site ----------------
  // While the house is going up the plot is a fenced building site you can walk into. Everything on it is set
  // from how far along the job is (0 to 1), so it's right whenever you look (and after a reload).
  const siteM = { dirt: flat(0x6e5536, { rough: 1 }), block: flat(0xa9a59c, { rough: 0.95 }), concrete: flat(0xb9b6ae, { rough: 0.95 }), timber: flat(0xc49a62, { rough: 0.8 }), pole: flat(0xc9a24a, { metal: 0.4, rough: 0.5 }), board: flat(0x8a6a3a), yellow: flat(0xf2b707, { rough: 0.5 }), dark: flat(0x2a2e33), mesh: flat(0xbfc6cc, { opacity: 0.5, metal: 0.5 }), glass: flat(0x34485a, { rough: 0.15, metal: 0.4 }), hat: flat(0xffd42a, { rough: 0.4 }), vest: flat(0xd8ff3a, { emissive: 0x556600, ei: 0.4 }) };
  function startSite(h) {
    const s = h.spec, p = localPlot(h), L = layout(p, s), X = h.X, g = new THREE.Group(); h.g.add(g);
    const S = h.site = { g, L, team: [], cols: [], its: [], shell: [], slabs: [], wins: [], t: -1, stage: null, pct: -1, clock: 0 };
    const Bs = (w, hh, d, x, y, z, m) => B(w, hh, d, x, y, z, m, false, g);
    const solid = (x0, x1, z0, z1, base) => { const c = X.rect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)); if (base != null) c.baseYAt = () => base; ctx.colliders.push(c); S.cols.push(c); return c; };
    // the site fence (mesh panels), open at the front where the path goes in
    for (const [a, b, z] of [[p.x0 + 0.5, L.cx - 2.5, p.z0 + 0.5], [L.cx + 2.5, p.x1 - 0.5, p.z0 + 0.5], [p.x0 + 0.5, p.x1 - 0.5, p.z1 - 0.5]]) { Bs(b - a, 2, 0.04, (a + b) / 2, 1, z, siteM.mesh); for (let x = a; x <= b + 0.01; x += 3.5) Bs(0.06, 2, 0.06, x, 1, z, siteM.pole); solid(a, b, z - 0.08, z + 0.08); }
    for (const x of [p.x0 + 0.5, p.x1 - 0.5]) { Bs(0.04, 2, p.z1 - p.z0 - 1, x, 1, (p.z0 + p.z1) / 2, siteM.mesh); for (let z = p.z0 + 0.5; z <= p.z1 - 0.49; z += 3.5) Bs(0.06, 2, 0.06, x, 1, z, siteM.pole); solid(x - 0.08, x + 0.08, p.z0 + 0.5, p.z1 - 0.5); }
    Bs(4, 0.05, L.hz0 - p.z0, L.cx, 0.03, (p.z0 + L.hz0) / 2, siteM.concrete);   // a hard track in
    const blocks = L.wing ? [{ x0: L.hx0, x1: L.hx1, z0: L.hz0, z1: L.hz1 }, { x0: L.wing.x0, x1: L.wing.x1, z0: L.wing.z0, z1: L.wing.z1 }] : [{ x0: L.hx0, x1: L.hx1, z0: L.hz0, z1: L.hz1 }];
    S.blocks = blocks;
    // the dug-out ground, a spoil heap, the slab
    S.dirt = blocks.map(r => Bs(r.x1 - r.x0 + 2, 0.06, r.z1 - r.z0 + 2, (r.x0 + r.x1) / 2, 0.03, (r.z0 + r.z1) / 2, siteM.dirt));
    S.heap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 9), siteM.dirt); S.heap.position.set(p.x1 - 4, 0.9, p.z1 - 5); g.add(S.heap);
    S.slab = blocks.map(r => Bs(r.x1 - r.x0 + 0.4, Y0, r.z1 - r.z0 + 0.4, (r.x0 + r.x1) / 2, Y0 / 2, (r.z0 + r.z1) / 2, siteM.concrete));
    // the walls: one panel per outside wall, raised as the job goes on (blockwork, then the finish you chose)
    S.finish = wallMatOf(s);
    for (const [alongX, at, a, b, , kind] of wallsOf(L)) {
      const pieces = kind === 'front' ? [[a, (a + b) / 2 - 0.6], [(a + b) / 2 + 0.6, b]] : [[a, b]];
      for (const [u, v] of pieces) { const m = Bs(alongX ? v - u : 0.25, 1, alongX ? 0.25 : v - u, alongX ? (u + v) / 2 : at, 1, alongX ? at : (u + v) / 2, siteM.block); m.visible = false; S.shell.push(m); }
    }
    for (let k = 1; k <= s.floors; k++) for (const r of blocks) { const m = Bs(r.x1 - r.x0, 0.24, r.z1 - r.z0, (r.x0 + r.x1) / 2, Y0 + k * FH - 0.12, (r.z0 + r.z1) / 2, siteM.concrete); m.visible = false; m.userData.k = k; S.slabs.push(m); }
    // the windows, fitted near the end
    for (let k = 0; k < s.floors; k++) for (const wall of wallsOf(L)) { const [alongX, at, a, , out] = wall;
      for (const o of openingsOf(s, L, wall, k)) { if (!o.glass && !o.door) continue; const oa = a + o.a, ob = a + o.b, yb = Y0 + k * FH, my = yb + (o.y0 + o.y1) / 2, gh = o.y1 - o.y0, m = o.door ? flat(new THREE.Color(s.door).getHex()) : siteM.glass;
        const pane = alongX ? Bs(ob - oa, gh, 0.05, (oa + ob) / 2, my, at + out * 0.14, m) : Bs(0.05, gh, ob - oa, at + out * 0.14, my, (oa + ob) / 2, m); pane.visible = false; S.wins.push(pane); } }
    // the roof: timber trusses first, then covered
    const trussG = new THREE.Group(), roofG = new THREE.Group(); g.add(trussG, roofG); S.truss = trussG; S.roof = roofG;
    const top = Y0 + s.floors * FH; roofOver(roofG, s, blocks[0], top, true, flat(s.roofColor, { rough: 0.7 }), S.finish, [true, true]); if (blocks[1]) roofOver(roofG, s, blocks[1], top, false, flat(s.roofColor, { rough: 0.7 }), S.finish, [false, true]);
    roofOver(trussG, s, blocks[0], top, true, siteM.timber, siteM.timber, [true, true]); if (blocks[1]) roofOver(trussG, s, blocks[1], top, false, siteM.timber, siteM.timber, [false, true]);
    trussG.traverse(o => { if (o.isMesh && o.material === siteM.timber && s.roof !== 'flat') { o.material = siteM.timber.clone(); o.material.wireframe = true; } });
    // scaffolding round the house: poles and boards, as high as the walls (plus a rail)
    S.scaf = new THREE.Group(); g.add(S.scaf);
    const H = top + 1;
    for (const r of blocks) { for (let x = r.x0 - 0.9; x <= r.x1 + 0.91; x += 2) for (const z of [r.z0 - 0.9, r.z1 + 0.9]) B(0.07, H, 0.07, x, H / 2, z, siteM.pole, false, S.scaf);
      for (let z = r.z0 - 0.9; z <= r.z1 + 0.91; z += 2) for (const x of [r.x0 - 0.9, r.x1 + 0.9]) B(0.07, H, 0.07, x, H / 2, z, siteM.pole, false, S.scaf);
      for (let y = 1.6; y < H; y += FH / 2) { B(r.x1 - r.x0 + 1.8, 0.05, 0.6, (r.x0 + r.x1) / 2, y, r.z0 - 0.9, siteM.board, false, S.scaf); B(r.x1 - r.x0 + 1.8, 0.05, 0.6, (r.x0 + r.x1) / 2, y, r.z1 + 0.9, siteM.board, false, S.scaf); B(0.6, 0.05, r.z1 - r.z0 + 1.8, r.x0 - 0.9, y, (r.z0 + r.z1) / 2, siteM.board, false, S.scaf); B(0.6, 0.05, r.z1 - r.z0 + 1.8, r.x1 + 0.9, y, (r.z0 + r.z1) / 2, siteM.board, false, S.scaf); } }
    S.scafH = H;
    // the machines: an excavator, a mixer lorry; pallets of blocks and timber by the gate
    { const e = new THREE.Group(); e.position.set(L.hx0 - 3, 0, L.hz0 + 2); g.add(e); S.exc = e; B(2.4, 0.6, 3.2, 0, 0.4, 0, siteM.dark, false, e); const top2 = new THREE.Group(); top2.position.y = 0.7; e.add(top2); B(2.2, 1, 2.2, 0, 0.5, 0.3, siteM.yellow, false, top2); B(1, 1, 1, -0.5, 1.4, 0.6, siteM.glass, false, top2);
      const boom = new THREE.Group(); boom.position.set(0.5, 0.8, -0.7); top2.add(boom); B(0.3, 0.3, 3, 0, 0.6, -1.4, siteM.yellow, false, boom); boom.rotation.x = 0.5; S.excTop = top2; S.excBoom = boom; }
    { const m = new THREE.Group(); m.position.set(L.cx + 5, 0, p.z0 + 5); g.add(m); S.mixer = m; B(2.4, 2, 1.8, 0, 1.2, -2.6, siteM.yellow, false, m); B(2.4, 0.5, 6, 0, 0.5, 0, siteM.dark, false, m);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.7, 3.2, 12), flat(0xdcdcdc)); drum.rotation.x = Math.PI / 2 - 0.25; drum.position.set(0, 2, 0.9); m.add(drum); S.drum = drum; }
    S.pile = new THREE.Group(); S.pile.position.set(p.x0 + 4, 0, p.z0 + 5); g.add(S.pile);
    for (let i = 0; i < 4; i++) { B(1.2, 0.15, 1.2, (i % 2) * 1.5, 0.08, Math.floor(i / 2) * 1.5, siteM.board, false, S.pile); B(1.1, 0.9, 1.1, (i % 2) * 1.5, 0.6, Math.floor(i / 2) * 1.5, i < 3 ? siteM.block : siteM.timber, false, S.pile); }
    // the board at the gate, and the crew to talk to
    S.board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ color: 0xffffff })); S.board.position.set(L.cx + 3.6, 1.9, p.z0 + 0.4); S.board.rotation.y = Math.PI; g.add(S.board);
    for (const dx of [-1.2, 1.2]) Bs(0.1, 2.6, 0.1, L.cx + 3.6 + dx, 1.3, p.z0 + 0.45, siteM.pole);
    { const [wx, wz] = X.toW(L.cx, p.z0 + 2); const it = { pos: new THREE.Vector3(wx, 0, wz), r: 3, label: 'Ask the builders how your house is going', action: () => toast(`👷 "${report(h)}"`) }; ctx.interactables.push(it); S.its.push(it); }
    stageSite(h, progressOf(h));
  }
  const working = () => { const hr = ctx.hours?.() ?? 12; return hr >= 7 && hr < 18; };
  function report(h) {
    const t = progressOf(h), st = stageAt(t);
    return `We're ${st.text}. Your house is ${Math.floor(t * 100)}% done and should be finished in ${describeLeft(h)}.${working() ? '' : ' We knock off at 6pm and start again at 7 in the morning.'}`;
  }
  function stageSite(h, t) {
    const S = h.site; if (!S) return; const s = h.spec, st = stageAt(t), top = Y0 + s.floors * FH;
    const wallsT = Math.max(0, Math.min(1, (t - 0.14) / 0.48)), wallTop = Y0 + wallsT * s.floors * FH;
    S.dirt.forEach(m => { m.visible = t < 0.14; }); S.heap.visible = t < 0.3; S.heap.scale.setScalar(Math.max(0.2, 1 - Math.max(0, t - 0.06) * 3));
    S.slab.forEach(m => { m.visible = t >= 0.06; m.scale.y = Y0 * Math.min(1, (t - 0.06) / 0.08 + 0.05); m.position.y = m.scale.y / 2; });
    const clad = t >= 0.74;
    for (const m of S.shell) { m.visible = wallTop > Y0 + 0.05; const hh = Math.max(0.05, wallTop - Y0); m.scale.y = hh; m.position.y = Y0 + hh / 2; m.material = clad ? S.finish : siteM.block; }
    for (const m of S.slabs) m.visible = wallTop >= Y0 + m.userData.k * FH - 0.1 && m.userData.k < s.floors;
    S.truss.visible = t >= 0.62 && t < 0.68; S.roof.visible = t >= 0.68;
    S.wins.forEach(m => { m.visible = t >= 0.78; });
    S.scaf.visible = t >= 0.14 && t < 0.9; S.scaf.scale.y = Math.max(0.05, Math.min(1, (wallTop + 1) / S.scafH));
    S.exc.visible = t < 0.1; S.mixer.visible = t >= 0.04 && t < 0.18; S.pile.visible = t >= 0.1 && t < 0.97;
    // once the walls are knee high you can't walk through them (the front has a gap for the door)
    if (wallTop > 1 && !S.shellCols) { S.shellCols = true; const X = h.X;
      for (const [alongX, at, a, b, , kind] of wallsOf(S.L)) { const pieces = kind === 'front' ? [[a, (a + b) / 2 - 0.6], [(a + b) / 2 + 0.6, b]] : kind === 'back' && S.L.wing ? [[a, S.L.dc - 0.65], [S.L.dc + 0.65, b]] : [[a, b]];
        for (const [u, v] of pieces) { const c = alongX ? X.rect(u, v, at - 0.13, at + 0.13) : X.rect(at - 0.13, at + 0.13, u, v); c.baseYAt = () => Y0; ctx.colliders.push(c); S.cols.push(c); } } }
    const pct = Math.floor(t * 100);
    if (pct !== S.pct || st !== S.stage) { S.pct = pct; S.stage = st;
      const old = S.board.material.map; S.board.material.map = ctx.makeTex(512, 256, q => { q.fillStyle = '#ffd23f'; q.fillRect(0, 0, 512, 256); q.fillStyle = '#111'; q.textAlign = 'center'; q.font = 'bold 44px sans-serif'; q.fillText('YOUR HOUSE · ' + pct + '%', 256, 62);
        q.fillStyle = '#2a2e33'; q.fillRect(40, 86, 432, 26); q.fillStyle = '#2f8f5f'; q.fillRect(42, 88, 428 * t, 22); q.fillStyle = '#111'; q.font = '24px sans-serif';
        const words = st.text.charAt(0).toUpperCase() + st.text.slice(1); let line = '', y = 148; for (const w of words.split(' ')) { if ((line + w).length > 34) { q.fillText(line.trim(), 256, y); y += 30; line = ''; } line += w + ' '; } q.fillText(line.trim(), 256, y);
        q.font = 'bold 22px sans-serif'; q.fillText('Maple Fields Homebuilders', 256, 238); });
      S.board.material.needsUpdate = true; old?.dispose?.(); }
    S.t = t; S.wallTop = wallTop; S.top = top;
  }
  // the crew: they're only there in working hours, and only made when you're near enough to see them
  function worker(i) {
    const pp = ctx.makePerson?.({ outfit: [0xff8c1a, 0x2f6fd6, 0xff8c1a, 0x3a3f45][i % 4], hair: [0x2b1d14, 0x5a3b22, 0x111111, 0xc9a26a][i % 4], pants: 0x2d3142, skin: [0xffdcc0, 0xe0ac69, 0x8d5524, 0xc68642][i % 4] });
    if (!pp) return null;
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), siteM.hat); hat.position.set(0, 1.93, 0); pp.rig.add(hat);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), siteM.vest); vest.position.set(0, 1.42, 0); pp.rig.add(vest);
    root.add(pp.root); return pp;
  }
  function animateSite(h, dt, v) {
    const S = h.site, near = v && Math.hypot(v.x - (h.wb.minX + h.wb.maxX) / 2, v.z - (h.wb.minZ + h.wb.maxZ) / 2) < 160, on = near && working();
    if (!on) { if (S.team.length) { for (const m of S.team) root.remove(m.p.root); S.team = []; } return; }
    if (!S.team.length) for (let i = 0; i < 4; i++) { const pp = worker(i); if (pp) S.team.push({ p: pp, role: ['carry', 'hammer', 'top', 'walk'][i], ph: i * 2.3 }); }
    S.clock += dt; const L = S.L, X = h.X, t = S.t, key = S.stage?.key;
    if (S.exc.visible) { S.excTop.rotation.y = Math.sin(S.clock * 0.5) * 0.9; S.excBoom.rotation.x = 0.3 + Math.sin(S.clock * 1.1) * 0.3; }
    if (S.mixer.visible) S.drum.rotation.y += dt * 2;
    const place = (m, x, y, z, yaw) => { const [wx, wz] = X.toW(x, z); m.p.root.position.set(wx, y, wz); m.p.root.rotation.y = yaw + X.rot; };
    for (const m of S.team) {
      m.ph += dt; const P = m.p;
      if (m.role === 'carry' || (m.role === 'walk' && key === 'inside')) {   // from the pallets to the house and back
        const a = m.role === 'carry' ? [S.pile.position.x + 0.7, S.pile.position.z + 2.2] : [L.hx0 + 1.5, L.hz0 + 1.5], b = m.role === 'carry' ? [L.cx - 2, L.hz0 - 1.4] : [L.hx1 - 3.5, L.hz1 - 1.5];
        const T = 8, f = (m.ph % (2 * T)) / T, go = f < 1, u = go ? f : 2 - f, e = u * u * (3 - 2 * u), dx = (b[0] - a[0]) * (go ? 1 : -1), dz = (b[1] - a[1]) * (go ? 1 : -1);
        place(m, a[0] + (b[0] - a[0]) * e, key === 'inside' && m.role === 'walk' ? Y0 : 0, a[1] + (b[1] - a[1]) * e, Math.atan2(dx, dz)); ctx.animatePerson?.(P, true, dt); if (m.role === 'carry' && go) P.armL.pivot.rotation.x = P.armR.pivot.rotation.x = -1.2;
      } else if (m.role === 'hammer') {   // at the side wall: laying blocks, fixing, then working inside
        const inside = key === 'inside'; place(m, inside ? L.hx0 + 1 : L.hx0 - 1.6, inside ? Y0 : 0, (L.hz0 + L.hz1) / 2, inside ? -Math.PI / 2 : Math.PI / 2); ctx.animatePerson?.(P, false, dt);
        P.armR.pivot.rotation.x = -1.6 + Math.sin(m.ph * 8) * 0.7; P.rig.rotation.x = 0.2;
      } else if (m.role === 'top') {   // up on the scaffold where the wall is being built (or the roof), or by the digger early on
        if (t < 0.14) { place(m, S.exc.position.x + 2, 0, S.exc.position.z + 2.5, -Math.PI * 0.75); ctx.animatePerson?.(P, false, dt); P.armR.pivot.rotation.x = -0.8; continue; }
        const y = Math.min(S.top, Math.max(0, (S.wallTop ?? 0) - 0.9)), u = 0.5 + 0.5 * Math.sin(m.ph * 0.2);
        place(m, L.hx0 + (L.hx1 - L.hx0) * u, key === 'roof' ? S.top : y, L.hz0 - 0.9, Math.PI); ctx.animatePerson?.(P, false, dt); P.armR.pivot.rotation.x = -1.3 + Math.sin(m.ph * 6) * 0.4; P.rig.rotation.x = 0.3;
      } else {   // the site manager walks round with the plans
        const u = 0.5 + 0.5 * Math.sin(m.ph * 0.15), x = L.hx0 - 2 + (L.hx1 - L.hx0 + 4) * u, dir = Math.cos(m.ph * 0.15) >= 0 ? 1 : -1;
        place(m, x, 0, L.hz0 - 3, dir > 0 ? Math.PI / 2 : -Math.PI / 2); ctx.animatePerson?.(P, true, dt); P.armL.pivot.rotation.x = -0.9;
      }
    }
  }
  function removeSite(h) {
    const S = h.site; if (!S) return;
    h.g.remove(S.g); for (const m of S.team) root.remove(m.p.root);
    for (const c of S.cols) { const i = ctx.colliders.indexOf(c); if (i >= 0) ctx.colliders.splice(i, 1); }
    for (const it of S.its) { const i = ctx.interactables.indexOf(it); if (i >= 0) ctx.interactables.splice(i, 1); }
    h.site = null;
  }

  // ---------------- buying, and saving ----------------
  const KEY = 'aw-homes';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = () => { try { const o = {}; for (const h of homes.values()) if (h.spec) o[h.id] = { spec: h.spec, startAt: h.startAt, doneAt: h.doneAt, ...(h.maple ? {} : { place: h.place, size: h.size }) }; localStorage.setItem(KEY, JSON.stringify(o)); } catch { } };
  const addDestination = h => { const [x, z] = h.X.toW(0, h.layout ? h.layout.hz0 - 6 : localPlot(h).z0 - 2); ctx.destinations?.push({ name: h.maple ? `Your house (Maple Fields plot ${h.n})` : `Your house (near ${nearOf(h.place)})`, x, z }); };
  function begin(h, spec, startAt, doneAt) {
    h.spec = clampSpec(spec); h.startAt = startAt; h.doneAt = doneAt; if (h.sale) h.sale.visible = false;
    if (progressOf(h) >= 1) build(h); else startSite(h);
    addDestination(h);
  }
  for (const [id, rec] of Object.entries(load())) {
    if (!rec?.spec) continue;
    let h = homes.get(id);
    if (!h && rec.place && rec.size) h = makeHome(id, { x: +rec.place.x, z: +rec.place.z, rot: +rec.place.rot || 0, ...(rec.place.near ? { near: String(rec.place.near) } : {}) }, { pw: +rec.size.pw, pd: +rec.size.pd });
    if (!h || h.spec) continue;
    // (houses bought before building took months were finished long ago)
    const doneAt = +rec.doneAt || 0, startAt = Number.isFinite(+rec.startAt) && rec.startAt ? +rec.startAt : doneAt;
    begin(h, rec.spec, startAt, doneAt);
  }
  function pay(spec) {
    const price = priceOf(spec);
    if (ctx.money() < price) return `Not enough gold: this house costs ${price.toLocaleString()} and you have ${Math.floor(ctx.money()).toLocaleString()}.`;
    ctx.spend(price); return null;
  }
  function buyPlot(id, spec) {
    const h = homes.get(id); if (!h?.maple) return 'Pick a plot first.'; if (h.spec) return `Plot ${h.n} is already yours.`;
    const err = pay(spec); if (err) return err;
    const now = Date.now(); begin(h, spec, now, now + BUILD_MS); save();
    toast(`🏗️ You bought plot ${h.n} at Maple Fields for ${priceOf(spec).toLocaleString()} gold. The builders start today; your house will take ${describeLeft(h)}. Go and watch them work any time.`);
    return null;
  }

  // ---------------- building anywhere: pick the spot yourself ----------------
  // The land shows in front of you (the house's front faces you). It's green where you can build and red where you
  // can't (a road, water, something already built, uneven ground, outside the dome). Walk it into place and press E.
  let placing = null;
  const snapRot = yaw => { const q = Math.round((yaw + Math.PI) / (Math.PI / 2)); return ((q % 4) + 4) % 4 * (Math.PI / 2); };
  function whyNot(place, size) {
    const X = xf(place), r = X.rect(-size.pw / 2, size.pw / 2, -size.pd / 2, size.pd / 2);
    if (overlap(r, MAPLE_RECT)) return 'this is Maple Fields: buy a plot here at the office instead';
    if (overlap(r, { minX: OFFICE.x - 8, maxX: OFFICE.x + 8, minZ: OFFICE.z - 9, maxZ: OFFICE.z + 8 })) return "it's the builder's office";
    for (const h of homes.values()) if (!h.maple && h.spec && overlap(r, h.wb)) return 'it runs into another of your houses';
    for (let x = r.minX; x <= r.maxX + 0.01; x += 2.5) for (let z = r.minZ; z <= r.maxZ + 0.01; z += 2.5) { const why = ctx.landCheck?.(Math.min(x, r.maxX), Math.min(z, r.maxZ)); if (why) return why; }
    return null;
  }
  function startPlacing(spec0) {
    const s = clampSpec(spec0), size = plotSize(s), g = new THREE.Group(); root.add(g);
    const land = new THREE.Mesh(new THREE.PlaneGeometry(size.pw, size.pd), new THREE.MeshBasicMaterial({ color: 0x3fbf7f, transparent: true, opacity: 0.35, depthWrite: false })); land.rotation.x = -Math.PI / 2; land.position.y = 0.12; g.add(land);
    const edgeM = new THREE.MeshBasicMaterial({ color: 0x3fbf7f, transparent: true, opacity: 0.8 }), hw = size.pw / 2, hd = size.pd / 2;   // (a bright rope round the edge, on posts, so you can see the land from anywhere)
    for (const [w, d, x, z] of [[size.pw, 0.12, 0, -hd], [size.pw, 0.12, 0, hd], [0.12, size.pd, -hw, 0], [0.12, size.pd, hw, 0]]) { const m = new THREE.Mesh(geoBox, edgeM); m.scale.set(w, 0.12, d); m.position.set(x, 1, z); g.add(m); }
    for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) { const m = new THREE.Mesh(geoBox, edgeM); m.scale.set(0.2, 2.4, 0.2); m.position.set(x, 1.2, z); g.add(m); }
    const L = layout({ x0: -size.pw / 2, x1: size.pw / 2, z0: -size.pd / 2, z1: size.pd / 2 }, s), houseM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    for (const r of [{ x0: L.hx0, x1: L.hx1, z0: L.hz0, z1: L.hz1 }, ...(L.wing ? [{ x0: L.wing.x0, x1: L.wing.x1, z0: L.wing.z0, z1: L.wing.z1 }] : [])]) { const m = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, 2, r.z1 - r.z0), houseM); m.position.set((r.x0 + r.x1) / 2, 1, (r.z0 + r.z1) / 2); g.add(m); }
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 3), houseM); arrow.rotation.x = -Math.PI / 2; arrow.position.set(L.cx, 2.6, L.hz0 - 2); g.add(arrow);   // (points at the front)
    const it = { pos: new THREE.Vector3(), r: 4, get label() { return placing?.ok ? `Build your house here (${priceOf(s).toLocaleString()} gold)` : `You can't build here: ${placing?.why || 'look around'}`; }, action: () => confirmPlace() };
    ctx.interactables.push(it);
    placing = { spec: s, size, g, land, edgeM, it, key: '', ok: false, why: '' };
    toast('📐 Walk to where you want your house. The land in front of you turns green where you can build (the front of the house faces you). Press E to build there, or Esc to stop.');
  }
  function updatePlacing() {
    const v = ctx.view?.(); if (!v) return; const P = placing, rot = snapRot(v.yaw), dist = P.size.pd / 2 + 3;   // (the land's depth runs the way you're looking)
    const x = Math.round(v.x - Math.sin(v.yaw) * dist), z = Math.round(v.z - Math.cos(v.yaw) * dist), key = x + ',' + z + ',' + rot;
    P.it.pos.set(v.x, v.y, v.z);
    if (key === P.key) return; P.key = key; P.place = { x, z, rot };
    P.g.position.set(x, 0, z); P.g.rotation.y = rot;
    P.why = whyNot(P.place, P.size); P.ok = !P.why; P.land.material.color.setHex(P.ok ? 0x3fbf7f : 0xd64545); P.edgeM.color.setHex(P.ok ? 0x3fbf7f : 0xd64545);
  }
  function stopPlacing() { if (!placing) return; root.remove(placing.g); const i = ctx.interactables.indexOf(placing.it); if (i >= 0) ctx.interactables.splice(i, 1); placing = null; }
  function confirmPlace() {
    const P = placing; if (!P) return; if (!P.ok) { toast(`🚧 You can't build here: ${P.why}.`); return; }
    const err = pay(P.spec); if (err) { toast(err); return; }
    nearOf(P.place); const h = makeHome('own' + Date.now().toString(36), P.place, P.size), now = Date.now(); stopPlacing(); begin(h, P.spec, now, now + BUILD_MS); save();
    toast(`🏗️ The land is yours and the builders start today: your house near ${nearOf(h.place)} will take ${describeLeft(h)}. (${priceOf(h.spec).toLocaleString()} gold.)`);
  }

  // ---------------- the office: the designer ----------------
  const css = document.createElement('style');
  css.textContent = `#homeBuilder{position:fixed;inset:0;z-index:60;background:rgba(8,10,14,.7);display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;color:#f4f1ea}
  #homeBuilder[hidden]{display:none}
  #homeBuilder .card{background:#1b2027;border-radius:16px;padding:16px;width:min(980px,96vw);max-height:92vh;overflow:auto;display:grid;grid-template-columns:minmax(260px,1fr) minmax(280px,1.2fr);gap:16px}
  @media(max-width:720px){#homeBuilder .card{grid-template-columns:1fr}}
  #homeBuilder h2{margin:0 0 6px;font-size:19px}#homeBuilder h3{margin:12px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#9fb0c2}
  #homeBuilder label{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:5px 0}
  #homeBuilder select,#homeBuilder input[type=range]{flex:1;max-width:60%}
  #homeBuilder select{background:#2a313a;color:#fff;border:1px solid #3a424c;border-radius:7px;padding:4px}
  #homeBuilder .designs{display:flex;flex-wrap:wrap;gap:6px}
  #homeBuilder button{background:#2f3a46;color:#fff;border:1px solid #3a4652;border-radius:9px;padding:6px 10px;cursor:pointer;font:inherit}
  #homeBuilder button.on{background:#3f6f9f;border-color:#6fa3d6}#homeBuilder .buy{background:#2f8f5f;border-color:#3fbf7f;font-weight:700;padding:10px 14px}
  #homeBuilder .extras{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}#homeBuilder .extras label{justify-content:flex-start}
  #homeBuilder canvas{width:100%;background:#cfe3f1;border-radius:10px;display:block}
  #homeBuilder .price{font-size:22px;font-weight:800;margin:10px 0 2px}#homeBuilder .msg{color:#ffd23f;min-height:18px}
  #homeBuilder .row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}`;
  document.head.append(css);
  const panel = document.createElement('div'); panel.id = 'homeBuilder'; panel.hidden = true; document.body.append(panel);
  let spec = clampSpec(DESIGNS[1]), plotId = null, where = 'maple';
  const opt = (obj, v) => Object.entries(obj).map(([k, o]) => `<option value="${k}"${k === v ? ' selected' : ''}>${o.name}</option>`).join('');
  const status = h => { const t = progressOf(h); return t >= 1 ? 'finished: the keys are yours' : `${Math.floor(t * 100)}% built (${stageAt(t).text}), ready in ${describeLeft(h)}`; };
  function render() {
    const free = PLOTS.filter(p => !homes.get(p.id).spec);
    if (!free.find(p => p.id === plotId)) plotId = free[0]?.id ?? null;
    const mine = [...homes.values()].filter(h => h.spec), canBuy = where === 'own' || !!plotId;
    panel.innerHTML = `<div class="card"><div>
      <div class="row"><h2>🏡 Maple Fields Homebuilders</h2><button type="button" data-close>Close (Esc)</button></div>
      <div style="color:#aab4bf">Pick a design to start from, then change anything you like.</div>
      <h3>Our designs</h3><div class="designs">${DESIGNS.map((d, i) => `<button type="button" data-design="${i}">${d.name}</button>`).join('')}</div>
      <h3>Where</h3><label>Build it <select data-k="where"><option value="maple"${where === 'maple' ? ' selected' : ''}>On a plot here at Maple Fields</option><option value="own"${where === 'own' ? ' selected' : ''}>Anywhere else: I'll pick the spot</option></select></label>
      ${where === 'maple' ? `<label>Plot <select data-k="plot">${free.length ? free.map(p => `<option value="${p.id}"${p.id === plotId ? ' selected' : ''}>Plot ${p.n}</option>`).join('') : '<option>All plots are sold</option>'}</select></label>` : `<div style="color:#aab4bf">You'll walk to the spot and see the land (${plotSize(spec).pw} × ${plotSize(spec).pd} m) laid out in front of you.</div>`}
      <h3>Structure</h3>
      <label>Shape <select data-k="shape">${opt(SHAPES, spec.shape)}</select></label>
      <label>Floors <select data-k="floors">${[1, 2, 3].map(n => `<option${n === spec.floors ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Width: ${spec.w} m <input type="range" min="8" max="20" step="1" value="${spec.w}" data-k="w"></label>
      <label>Depth: ${spec.d} m <input type="range" min="8" max="16" step="1" value="${spec.d}" data-k="d"></label>
      <label>Roof <select data-k="roof">${opt(ROOFS, spec.roof)}</select></label>
      <label>Windows <select data-k="windows">${opt(WINDOWS, spec.windows)}</select></label>
      <h3>Materials and colours</h3>
      <label>Walls made of <select data-k="wall">${opt(MATERIALS, spec.wall)}</select></label>
      <label>Wall colour <input type="color" value="${spec.wallColor}" data-k="wallColor"></label>
      <label>Roof colour <input type="color" value="${spec.roofColor}" data-k="roofColor"></label>
      <label>Window frames <input type="color" value="${spec.trim}" data-k="trim"></label>
      <label>Front door <input type="color" value="${spec.door}" data-k="door"></label>
      <h3>Extras</h3><div class="extras">${Object.entries(EXTRAS).map(([k, e]) => `<label><input type="checkbox" data-x="${k}"${spec.extras[k] ? ' checked' : ''}${k === 'balcony' && spec.floors < 2 ? ' disabled' : ''}> ${e.name} <small style="color:#8a96a2">+${e.cost}</small></label>`).join('')}</div>
    </div><div>
      <canvas width="640" height="420"></canvas>
      <div class="price">${priceOf(spec).toLocaleString()} gold</div>
      <div style="color:#aab4bf">${SHAPES[spec.shape].name.split(' (')[0]} · ${spec.floors} floor${spec.floors > 1 ? 's' : ''} · ${spec.w} × ${spec.d} m · ${MATERIALS[spec.wall].name.toLowerCase()} walls · ${ROOFS[spec.roof].name.toLowerCase()} roof · you have ${Math.floor(ctx.money()).toLocaleString()} gold</div>
      <div class="msg"></div>
      <div class="row"><span style="color:#aab4bf">Includes the land. Building takes about 6 months on the game's calendar (about 60 real days); the builders keep working while you're away.</span><button type="button" class="buy"${canBuy ? '' : ' disabled'}>${where === 'own' ? 'Pick the spot' : 'Buy and start building'}</button></div>
      <h3>Your houses</h3><div>${mine.map(h => `<div style="margin:4px 0"><b>${h.spec.name || 'Your design'}</b>, ${nameOf(h)}: ${status(h)}</div>`).join('') || '<span style="color:#8a96a2">None yet.</span>'}</div>
    </div></div>`;
    draw(panel.querySelector('canvas'));
  }
  panel.addEventListener('input', e => {
    const t = e.target, k = t.dataset.k, x = t.dataset.x;
    if (k === 'plot') plotId = t.value; else if (k === 'where') where = t.value; else if (k) spec = clampSpec({ ...spec, name: 'Your own design', [k]: t.type === 'range' || k === 'floors' ? +t.value : t.value });
    if (x) spec = clampSpec({ ...spec, name: 'Your own design', extras: { ...spec.extras, [x]: t.checked } });
    if (t.type === 'color' || t.type === 'range') { const c = panel.querySelector('canvas'); draw(c); panel.querySelector('.price').textContent = priceOf(spec).toLocaleString() + ' gold'; if (t.type === 'range') t.parentElement.firstChild.textContent = (k === 'w' ? 'Width: ' : 'Depth: ') + t.value + ' m '; }
    else render();
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.close != null) return closePanel();
    if (b.dataset.design != null) { spec = clampSpec(DESIGNS[+b.dataset.design]); return render(); }
    if (b.classList.contains('buy')) {
      if (where === 'own') { if (ctx.money() < priceOf(spec)) { panel.querySelector('.msg').textContent = `Not enough gold: this house costs ${priceOf(spec).toLocaleString()}.`; return; } closePanel(); stopPlacing(); startPlacing(spec); return; }
      const err = buyPlot(plotId, spec); if (err) panel.querySelector('.msg').textContent = err; else closePanel(); }
  });
  addEventListener('keydown', e => { if (e.code !== 'Escape') return; if (!panel.hidden) { e.stopImmediatePropagation(); closePanel(); } else if (placing) { e.stopImmediatePropagation(); stopPlacing(); toast('You stopped looking for a spot. The builder\'s office will keep your design.'); } }, true);
  function openPanel() { render(); panel.hidden = false; ctx.pause?.(); }
  function closePanel() { panel.hidden = true; ctx.resume?.(); }
  // the front of the house, drawn to scale (1 m = 18 px), and a plan of its shape from above
  function draw(cv) {
    const g = cv.getContext('2d'), s = spec, S = 18, W = cv.width, H = cv.height, ground = H - 40, hw = s.w * S, x0 = (W - hw) / 2 - (s.extras.garage ? 60 : 0);
    const sky = g.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#9fc9ea'); sky.addColorStop(1, '#e3f0f8'); g.fillStyle = sky; g.fillRect(0, 0, W, ground);
    g.fillStyle = '#6f9a4a'; g.fillRect(0, ground, W, H - ground);
    const wallH = s.floors * FH * S, top = ground - wallH;
    const pattern = (x, y, w, h) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = s.wallColor; g.fillRect(x, y, w, h);
      if (s.wall === 'brick') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (let yy = y, r = 0; yy < y + h; yy += 6, r++) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); for (let xx = x + (r % 2) * 7; xx < x + w; xx += 14) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 6); g.stroke(); } } }
      else if (s.wall === 'stone') { g.strokeStyle = 'rgba(0,0,0,.25)'; for (let yy = y; yy < y + h; yy += 10) for (let xx = x + ((yy / 10) % 2) * 8; xx < x + w; xx += 16 + ((xx * 7) % 9)) g.strokeRect(xx, yy, 16, 10); }
      else if (s.wall === 'wood') { g.strokeStyle = 'rgba(0,0,0,.3)'; for (let yy = y; yy < y + h; yy += 7) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } }
      else if (s.wall === 'concrete') { g.strokeStyle = 'rgba(0,0,0,.18)'; for (let xx = x; xx < x + w; xx += 54) g.strokeRect(xx, y, 54, h); }
      else if (s.wall === 'glass') { g.fillStyle = 'rgba(255,255,255,.25)'; for (let xx = x; xx < x + w; xx += 36) g.fillRect(xx + 4, y, 4, h); g.strokeStyle = s.trim; g.lineWidth = 3; for (let xx = x; xx <= x + w; xx += 36) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); } }
      g.restore(); };
    if (s.extras.garage) { const gx = x0 + hw + 4, gh = 3 * S; pattern(gx, ground - gh, 6.6 * S, gh); g.fillStyle = s.door; g.fillRect(gx + 0.8 * S, ground - 2.4 * S, 5 * S, 2.4 * S); g.strokeStyle = 'rgba(255,255,255,.35)'; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(gx + 0.8 * S, ground - k * 0.4 * S); g.lineTo(gx + 5.8 * S, ground - k * 0.4 * S); g.stroke(); } g.fillStyle = s.roofColor; g.fillRect(gx - 3, ground - gh - 5, 6.6 * S + 6, 6); }
    pattern(x0, top, hw, wallH);
    g.fillStyle = s.roofColor;
    if (s.roof === 'flat') { g.fillRect(x0 - 6, top - 8, hw + 12, 8); g.fillStyle = s.wallColor; g.fillRect(x0 - 6, top - 18, hw + 12, 10); }
    else if (s.roof === 'gable') { const rise = Math.min(4, s.d * 0.38) * S; g.beginPath(); g.moveTo(x0 - 10, top); g.lineTo(x0 + hw + 10, top); g.lineTo(x0 + hw + 10, top - rise * 0.9); g.lineTo(x0 - 10, top - rise * 0.9); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.15)'; for (let yy = top - rise * 0.9; yy < top; yy += 6) g.fillRect(x0 - 10, yy, hw + 20, 1); }
    else { const rise = Math.min(4, Math.min(s.w, s.d) * 0.4) * S; g.beginPath(); g.moveTo(x0 - 10, top); g.lineTo(x0 + hw + 10, top); g.lineTo(x0 + hw - rise * 0.8, top - rise); g.lineTo(x0 + rise * 0.8, top - rise); g.closePath(); g.fill(); }
    if (s.extras.chimney) { g.fillStyle = '#8a4a3a'; g.fillRect(x0 + 1.2 * S, top - (s.roof === 'flat' ? 1.6 : 4) * S, 0.9 * S, (s.roof === 'flat' ? 1.6 : 4) * S); }
    const Wd = WINDOWS[s.windows];
    for (let k = 0; k < s.floors; k++) {
      const yb = ground - k * FH * S, n = Math.max(1, Math.floor(s.w / (Wd.w + 1.6))), gap = s.w / n;
      if (s.wall !== 'glass') for (let i = 0; i < n; i++) { const c = gap * (i + 0.5); if (k === 0 && Math.abs(c - s.w / 2) < Wd.w / 2 + 1.1) continue; const wx = x0 + (c - Wd.w / 2) * S, wy = yb - (Wd.sill + Wd.h) * S;
        g.fillStyle = '#5f86a6'; g.fillRect(wx, wy, Wd.w * S, Wd.h * S); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(wx + 3, wy + 3, Wd.w * S * 0.3, Wd.h * S - 6); g.strokeStyle = s.trim; g.lineWidth = 3; g.strokeRect(wx, wy, Wd.w * S, Wd.h * S); }
    }
    g.fillStyle = s.door; g.fillRect(x0 + hw / 2 - 0.6 * S, ground - 2.3 * S, 1.2 * S, 2.3 * S); g.fillStyle = '#d4af37'; g.beginPath(); g.arc(x0 + hw / 2 + 0.35 * S, ground - 1.1 * S, 2.5, 0, 7); g.fill();
    if (s.extras.porch) { g.fillStyle = s.roofColor; g.fillRect(x0 + hw / 2 - 1.7 * S, ground - 2.8 * S, 3.4 * S, 5); g.fillStyle = s.trim; for (const sd of [-1, 1]) g.fillRect(x0 + hw / 2 + sd * 1.5 * S - 2, ground - 2.8 * S, 4, 2.8 * S); }
    if (s.extras.balcony && s.floors > 1) { const by = ground - FH * S; g.fillStyle = '#8f938f'; g.fillRect(x0 + hw * 0.25, by - 3, hw * 0.5, 6); g.fillStyle = 'rgba(160,200,230,.5)'; g.fillRect(x0 + hw * 0.25, by - 1 * S, hw * 0.5, 1 * S); g.fillStyle = s.trim; g.fillRect(x0 + hw * 0.25, by - 1 * S, hw * 0.5, 3); }
    if (s.extras.fence) { g.fillStyle = '#f2efe9'; for (let xx = 6; xx < W - 6; xx += 10) if (Math.abs(xx - (x0 + hw / 2)) > 2 * S) g.fillRect(xx, ground + 6, 3, 18); g.fillRect(6, ground + 10, W / 2 - 40, 3); g.fillRect(W / 2 + 40, ground + 10, W / 2 - 46, 3); }
    g.fillStyle = '#1b2027'; g.font = '12px sans-serif'; g.fillText(`${s.w} m`, x0 + hw / 2 - 12, ground + 34);
    // the plan (from above, front at the bottom), top left
    { const sz = plotSize(s), L = layout({ x0: -sz.pw / 2, x1: sz.pw / 2, z0: -sz.pd / 2, z1: sz.pd / 2 }, s), k = Math.min(130 / sz.pw, 120 / sz.pd), ox = 12 + 65, oy = 12 + 60, X = x => ox + x * k, Z = z => oy - z * k;   // (z grows to the back, drawn upwards)
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(6, 6, 142, 150); g.fillStyle = '#7fa35a'; g.fillRect(X(-sz.pw / 2), Z(sz.pd / 2), sz.pw * k, sz.pd * k);
      const box = (x0b, x1b, z0b, z1b, c) => { g.fillStyle = c; g.fillRect(X(x0b), Z(z1b), (x1b - x0b) * k, (z1b - z0b) * k); };
      box(L.hx0, L.hx1, L.hz0, L.hz1, s.wallColor); if (L.wing) box(L.wing.x0, L.wing.x1, L.wing.z0, L.wing.z1, s.wallColor);
      if (s.extras.garage) box(L.hx1 + 0.2, L.hx1 + 6.8, L.hz0, L.hz0 + 7, '#9a9a9a'); if (s.extras.pool) box(L.cx - Math.min(s.w, 10) / 2, L.cx + Math.min(s.w, 10) / 2, L.back + 3.5, Math.min(sz.pd / 2 - 2, L.back + 10.5), '#3fa9d6');
      g.strokeStyle = '#1b2027'; g.lineWidth = 1; g.strokeRect(X(L.hx0), Z(L.hz1), s.w * k, s.d * k); if (L.wing) g.strokeRect(X(L.wing.x0), Z(L.wing.z1), (L.wing.x1 - L.wing.x0) * k, (L.wing.z1 - L.wing.z0) * k);
      g.fillStyle = '#1b2027'; g.font = '11px sans-serif'; g.fillText('From above (front ↓)', 12, 152); }
  }

  let tick = 0;
  // where the floors, stairs and pool rim of a house are (plot coordinates)
  function localGround(h, x, z, y) {
    const s = h.spec, L = h.layout;
    if (!h.built) { const S = h.site; if (!S || S.t < 0.06) return null; for (const r of S.blocks) if (x >= r.x0 - 0.2 && x <= r.x1 + 0.2 && z >= r.z0 - 0.2 && z <= r.z1 + 0.2) return Y0; return null; }
    const P = h.pool;
    if (P && x > P.x0 - 0.8 && x < P.x1 + 0.8 && z > P.z0 - 3.3 && z < P.z1 + 0.8) {
      if (x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1) return 0.05;   // the bottom of the pool
      if (z >= P.z0 - 0.8) return P.rim;   // walking round the rim
      if (Math.abs(x - P.cx) < 1) return Math.max(0, Math.min(P.rim, Math.ceil((z - (P.z0 - 3.3)) / 0.5) * P.rim / 5));   // the steps
      return null; }
    if (s.extras.porch && Math.abs(x - L.cx) < 1.7 && z > L.hz0 - 2 && z < L.hz0) return Y0;
    const levelOf = () => Math.max(0, Math.min(s.floors - 1, Math.floor((y - Y0 + 1.2) / FH)));
    if (L.wing && x >= L.wing.x0 && x <= L.wing.x1 && z > L.wing.z0 && z <= L.wing.z1) return Y0 + levelOf() * FH;
    if (x < L.hx0 || x > L.hx1 || z < L.hz0 || z > L.hz1) return null;
    for (let k = 0; k < s.floors - 1; k++) { const f = h.flight(k), yb = Y0 + k * FH; if (x >= f.x0 && x <= f.x1 && z >= Math.min(f.zLow, f.zHigh) && z <= Math.max(f.zLow, f.zHigh)) { const t = (z - f.zLow) / (f.zHigh - f.zLow), hh = yb + FH * Math.max(0, Math.min(1, t)); if (y > hh - 1.1 && y < hh + 1.6) return hh; } }
    let level = levelOf();
    for (; level > 0; level--) { const f = h.flight(level - 1), lo = Math.min(f.zLow + (f.zHigh - f.zLow) * 0.4, f.zHigh), hi = Math.max(f.zLow + (f.zHigh - f.zLow) * 0.4, f.zHigh); if (!(x >= f.x0 - 0.05 && x <= f.x1 + 0.05 && z >= lo && z <= hi)) break; }
    return Y0 + level * FH;
  }
  return {
    plots: PLOTS, homes, open: openPanel, priceOf, report,
    get isOpen() { return !panel.hidden; },
    get placing() { return placing; },
    pickSpot: s => { stopPlacing(); startPlacing(s || spec); },
    groundAt(x, z, y = 0) {
      for (const h of homes.values()) {
        if (!h.spec || x < h.wb.minX || x > h.wb.maxX || z < h.wb.minZ || z > h.wb.maxZ) continue;
        const [lx, lz] = h.X.toL(x, z), r = localGround(h, lx, lz, y); if (r != null) return r;
      }
      return null;
    },
    update(dt) {
      if (placing) updatePlacing();
      const v = ctx.view?.();
      for (const h of homes.values()) if (h.site) animateSite(h, dt, v);
      if ((tick -= dt) > 0) return; tick = 1;
      for (const h of homes.values()) if (h.spec && !h.built) {
        const t = progressOf(h);
        if (t >= 1) { removeSite(h); build(h); toast(`🏡 Your house on ${nameOf(h)} is finished. The keys are yours.`); }
        else stageSite(h, t);
      }
    },
  };
}
