// BUILD YOUR OWN HOUSE: Maple Fields, a new estate on the south road, ten plots for sale, and the builder's
// office where you design the house and buy it.
//
// Start from one of the builder's designs or make your own: how many floors (1 to 3), how wide and deep, the
// roof (flat, gable or hip), what the walls are made of (brick, stone, timber, render, concrete or glass), the
// colours of the walls, roof, window frames and front door, the size of the windows, and extras (a garage, a
// pool, a garden fence, a porch, a balcony, a chimney). The office shows the front of the house as you change it
// and what it will cost. Pay, and the builders put it up on your plot (scaffolding first, a couple of minutes),
// then it's yours: a real house you walk into, with stairs between floors, a living room and kitchen, bedrooms
// and a bathroom (toilet, shower, basin), all working. Your houses are remembered on this device.
import * as THREE from 'three';

export const ESTATE = { name: 'Maple Fields', roadZ: 1176 };
const PLOT_XS = [-90, -48, -6, 36, 78, 120, 255, 297, 339, 381];
export const PLOTS = PLOT_XS.map((x, i) => ({ id: 'plot' + (i + 1), n: i + 1, x0: x, x1: x + 38, z0: 1184, z1: 1232 }));
const OFFICE = { x: 170, z: 1196 };

export const MATERIALS = { brick: { name: 'Brick', cost: 9 }, stone: { name: 'Stone', cost: 12 }, wood: { name: 'Timber', cost: 7 }, render: { name: 'Render (plaster)', cost: 8 }, concrete: { name: 'Concrete', cost: 8 }, glass: { name: 'Glass', cost: 15 } };
export const ROOFS = { flat: { name: 'Flat', cost: 2 }, gable: { name: 'Gable (pitched)', cost: 3 }, hip: { name: 'Hip (four slopes)', cost: 3.5 } };
export const WINDOWS = { small: { name: 'Small', w: 1, h: 1, sill: 1.1, k: 1 }, medium: { name: 'Medium', w: 1.4, h: 1.4, sill: 0.9, k: 1.05 }, large: { name: 'Large', w: 2.2, h: 1.9, sill: 0.6, k: 1.12 }, full: { name: 'Floor to ceiling', w: 2.4, h: 2.6, sill: 0.1, k: 1.25 } };
export const EXTRAS = { garage: { name: 'Garage', cost: 900 }, pool: { name: 'Swimming pool', cost: 1600 }, fence: { name: 'Garden fence', cost: 250 }, porch: { name: 'Porch', cost: 300 }, balcony: { name: 'Balcony', cost: 400 }, chimney: { name: 'Chimney', cost: 150 } };
export const DESIGNS = [
  { name: 'Starter cottage', floors: 1, w: 10, d: 8, roof: 'gable', wall: 'brick', wallColor: '#b5563c', roofColor: '#3a3f45', trim: '#f2efe9', door: '#2f4a6b', windows: 'small', extras: { porch: true, fence: true, chimney: true } },
  { name: 'Family house', floors: 2, w: 14, d: 10, roof: 'gable', wall: 'render', wallColor: '#efe6d2', roofColor: '#5a3a2a', trim: '#ffffff', door: '#7a1f1f', windows: 'medium', extras: { garage: true, fence: true, porch: true, chimney: true } },
  { name: 'Modern villa', floors: 2, w: 18, d: 12, roof: 'flat', wall: 'render', wallColor: '#f7f7f4', roofColor: '#2a2e33', trim: '#2a2e33', door: '#3a3f45', windows: 'large', extras: { pool: true, balcony: true, garage: true } },
  { name: 'Timber lodge', floors: 2, w: 12, d: 10, roof: 'gable', wall: 'wood', wallColor: '#8a5a36', roofColor: '#2f3a2a', trim: '#e8dcc0', door: '#3f2a1a', windows: 'medium', extras: { porch: true, chimney: true, fence: true } },
  { name: 'Glass house', floors: 1, w: 16, d: 12, roof: 'flat', wall: 'glass', wallColor: '#9fc4d6', roofColor: '#1f2328', trim: '#1f2328', door: '#1f2328', windows: 'full', extras: { pool: true } },
  { name: 'Stone townhouse', floors: 3, w: 9, d: 12, roof: 'hip', wall: 'stone', wallColor: '#b9ad98', roofColor: '#3a3f45', trim: '#f2efe9', door: '#2d5d3a', windows: 'medium', extras: { chimney: true } },
];
export function priceOf(s) {
  const area = s.w * s.d, body = area * s.floors * MATERIALS[s.wall].cost * WINDOWS[s.windows].k, roof = area * ROOFS[s.roof].cost;
  const extras = Object.entries(s.extras || {}).reduce((a, [k, v]) => a + (v && EXTRAS[k] ? EXTRAS[k].cost : 0), 0);
  return Math.round((600 + body + roof + extras) / 50) * 50;   // (600 is the plot)
}
const clampSpec = s => ({ ...s, floors: Math.max(1, Math.min(3, s.floors | 0)), w: Math.max(8, Math.min(20, +s.w)), d: Math.max(8, Math.min(16, +s.d)), extras: { ...(s.extras || {}) } });

export function createHouseBuilder(ctx) {
  // ctx: { scene, colliders, interactables, sitSpots, planeBlocks, poolZones, doors, makeTex, toast, money(), spend(n),
  //        pause(), resume(), sleep(), chore(kind), destinations, sign(text,x,y,z,w,colour) }
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
  const plotState = new Map();   // id -> { spec, doneAt, group, site }
  for (const p of PLOTS) {
    const cx = (p.x0 + p.x1) / 2;
    B(p.x1 - p.x0, 0.04, p.z1 - p.z0, cx, 0.02, (p.z0 + p.z1) / 2, lawn);
    B(3, 0.05, p.z0 - ESTATE.roadZ + 0.5, cx, 0.03, (ESTATE.roadZ + p.z0) / 2, paving);   // a drive from the road
    const sale = new THREE.Group(); sale.position.set(cx + 6, 0, p.z0 + 1.5); root.add(sale); B(0.12, 2.2, 0.12, 0, 1.1, 0, 0x6b4a2f, false, sale);
    const t = ctx.makeTex(256, 128, g => { g.fillStyle = '#c0392b'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('PLOT ' + p.n, 128, 50); g.font = 'bold 26px sans-serif'; g.fillText('FOR SALE · BUILD YOUR OWN', 128, 95); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: t })); s.position.set(0, 2.1, -0.07); s.rotation.y = Math.PI; sale.add(s);
    plotState.set(p.id, { plot: p, sale });
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

  // ---------------- building a house on a plot ----------------
  const FH = 3.2, Y0 = 0.15, RUN = 5.4;
  function layout(p, s) {   // where the house sits on its plot (set back from the road, centred), front faces the road (-z)
    const cx = (p.x0 + p.x1) / 2 - (s.extras.garage ? 3.5 : 0), hz0 = p.z0 + 10;
    return { hx0: cx - s.w / 2, hx1: cx + s.w / 2, hz0, hz1: hz0 + s.d, cx };
  }
  function stairs(L) {   // flights: even ones front->back by the right wall (strip A), odd ones back->front beside it (strip B)
    const A = [L.hx1 - 1.45, L.hx1 - 0.2], Bs = [L.hx1 - 2.85, L.hx1 - 1.6], s0 = L.hz0 + 1.0, s1 = s0 + RUN;
    return k => k % 2 === 0 ? { x0: A[0], x1: A[1], zLow: s0, zHigh: s1 } : { x0: Bs[0], x1: Bs[1], zLow: s1 + 0.5, zHigh: s1 + 0.5 - RUN };
  }
  function build(p, s) {
    const st = plotState.get(p.id); st.sale.visible = false;
    const g = new THREE.Group(); g.name = 'house ' + p.id; root.add(g); st.group = g;
    const L = layout(p, s), { hx0, hx1, hz0, hz1, cx } = L, W = s.w, D = s.d, cols = [];
    const solid = (x0, x1, z0, z1, base) => { const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }; if (base != null) c.baseYAt = () => base; ctx.colliders.push(c); cols.push(c); return c; };
    const Bx = (w, h, d, x, y, z, m) => B(w, h, d, x, y, z, m, false, g);
    const wallMat = s.wall === 'glass' ? flat(s.wallColor, { opacity: 0.35, rough: 0.05, metal: 0.4 }) : new THREE.MeshStandardMaterial({ color: s.wallColor, map: wallTex(s.wall), roughness: s.wall === 'render' ? 0.85 : 0.9 });
    const trim = flat(s.trim, { rough: 0.5 }), glassM = flat(0x9fc4d6, { opacity: 0.3, rough: 0.05, metal: 0.3 }), inner = flat(0xf3efe6, { rough: 0.85 });
    const wpiece = (alongX, at, a, b, y0, y1) => { const len = b - a, h = y1 - y0; if (len < 0.02 || h < 0.02) return; const out = (alongX ? at === hz0 : at === hx0) ? -1 : 1, mats = Array(6).fill(wallMat);   // (plastered inside: only the outside face shows the brick, stone or timber)
      if (s.wall !== 'glass') mats[alongX ? (out > 0 ? 5 : 4) : (out > 0 ? 1 : 0)] = inner;
      const m = new THREE.Mesh(alongX ? boxUV(len, h, 0.25, TILE[s.wall]) : boxUV(0.25, h, len, TILE[s.wall]), mats); m.position.set(alongX ? (a + b) / 2 : at, (y0 + y1) / 2, alongX ? at : (a + b) / 2); m.castShadow = true; m.receiveShadow = true; g.add(m); };
    const Wd = WINDOWS[s.windows];
    const openings = (len, isFront, ground) => {   // windows spaced along a wall, the front door in the middle of the front
      const list = [], n = Math.max(1, Math.floor(len / (Wd.w + 1.6))), gap = len / n;
      for (let i = 0; i < n; i++) { const c = gap * (i + 0.5); if (isFront && ground && Math.abs(c - len / 2) < Wd.w / 2 + 1.1) continue; list.push({ a: c - Wd.w / 2, b: c + Wd.w / 2, y0: Wd.sill, y1: Math.min(FH - 0.25, Wd.sill + Wd.h), glass: true }); }
      if (isFront && ground) list.push({ a: len / 2 - 0.6, b: len / 2 + 0.6, y0: 0, y1: 2.3, door: true });
      return list.sort((u, v) => u.a - v.a);
    };
    for (let k = 0; k < s.floors; k++) {
      const yb = Y0 + k * FH, yt = yb + FH;
      for (const [alongX, at, a, b, front] of [[true, hz0, hx0, hx1, true], [true, hz1, hx0, hx1, false], [false, hx0, hz0, hz1, false], [false, hx1, hz0, hz1, false]]) {
        const ops = s.wall === 'glass' ? (front && k === 0 ? [{ a: (b - a) / 2 - 0.6, b: (b - a) / 2 + 0.6, y0: 0, y1: 2.3, door: true }] : []) : openings(b - a, front, k === 0);
        let pos = a;
        for (const o of ops) {
          const oa = a + o.a, ob = a + o.b; wpiece(alongX, at, pos, oa, yb, yt); if (oa - pos > 0.02) alongX ? solid(pos, oa, at - 0.13, at + 0.13, yb) : solid(at - 0.13, at + 0.13, pos, oa, yb);
          wpiece(alongX, at, oa, ob, yb, yb + o.y0); wpiece(alongX, at, oa, ob, yb + o.y1, yt);
          if (o.glass) { const gw = ob - oa, gh = o.y1 - o.y0, gm = alongX ? [gw, gh, 0.04, (oa + ob) / 2, yb + (o.y0 + o.y1) / 2, at] : [0.04, gh, gw, at, yb + (o.y0 + o.y1) / 2, (oa + ob) / 2]; Bx(...gm.slice(0, 3), ...gm.slice(3), glassM);
            alongX ? (Bx(gw + 0.14, 0.1, 0.32, (oa + ob) / 2, yb + o.y0, at, trim), Bx(gw + 0.14, 0.1, 0.32, (oa + ob) / 2, yb + o.y1, at, trim), Bx(0.08, gh, 0.32, oa, yb + (o.y0 + o.y1) / 2, at, trim), Bx(0.08, gh, 0.32, ob, yb + (o.y0 + o.y1) / 2, at, trim)) : (Bx(0.32, 0.1, gw + 0.14, at, yb + o.y0, (oa + ob) / 2, trim), Bx(0.32, 0.1, gw + 0.14, at, yb + o.y1, (oa + ob) / 2, trim), Bx(0.32, gh, 0.08, at, yb + (o.y0 + o.y1) / 2, oa, trim), Bx(0.32, gh, 0.08, at, yb + (o.y0 + o.y1) / 2, ob, trim));
            alongX ? solid(oa, ob, at - 0.1, at + 0.1, yb) : solid(at - 0.1, at + 0.1, oa, ob, yb); }
          if (o.door) ctx.doors?.add({ a: [oa, at], b: [ob, at], y: yb, h: 2.3, color: new THREE.Color(s.door).getHex(), glass: s.wall === 'glass' });
          pos = ob;
        }
        wpiece(alongX, at, pos, b, yb, yt); if (b - pos > 0.02) alongX ? solid(pos, b, at - 0.13, at + 0.13, yb) : solid(at - 0.13, at + 0.13, pos, b, yb);
        if (s.wall === 'glass') for (let m2 = a; m2 <= b + 0.01; m2 += 2) alongX ? Bx(0.1, FH, 0.3, m2, yb + FH / 2, at, trim) : Bx(0.3, FH, 0.1, at, yb + FH / 2, m2, trim);
      }
    }
    // floors and ceilings, with the stairwells left open
    const flight = stairs(L), floorM = flat(0xc9a77a, { rough: 0.55 }), ceilM = flat(0xf4f1ea, { emissive: 0x4a4844, ei: 0.4 });
    const voidOf = k => { if (k <= 0) return null; const f = flight(k - 1), hi = f.zHigh, lo = f.zLow, z0 = Math.min(lo + (hi - lo) * 0.4, hi), z1 = Math.max(lo + (hi - lo) * 0.4, hi); return { x0: f.x0 - 0.05, x1: f.x1 + 0.05, z0, z1 }; };
    const slab = (y, h, m, hole) => { const parts = hole ? [[hx0, hole.x0, hz0, hz1], [hole.x1, hx1, hz0, hz1], [hole.x0, hole.x1, hz0, hole.z0], [hole.x0, hole.x1, hole.z1, hz1]] : [[hx0, hx1, hz0, hz1]]; for (const [a, b, c, d] of parts) if (b - a > 0.02 && d - c > 0.02) Bx(b - a - 0.02, h, d - c - 0.02, (a + b) / 2, y, (c + d) / 2, m); };
    Bx(W + 0.4, Y0, D + 0.4, cx, Y0 / 2, (hz0 + hz1) / 2, flat(0x8f938f));   // the foundation
    slab(Y0 + 0.01, 0.02, floorM);
    for (let k = 1; k <= s.floors; k++) { const y = Y0 + k * FH, hole = k < s.floors ? voidOf(k) : null; if (k < s.floors) { slab(y - 0.12, 0.24, floorM, hole); slab(y - 0.26, 0.03, ceilM, hole); } else slab(y - 0.04, 0.04, ceilM); }
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
    const top = Y0 + s.floors * FH, roofM = flat(s.roofColor, { rough: 0.7 });
    if (s.roof === 'flat') { Bx(W + 0.6, 0.3, D + 0.6, cx, top + 0.15, (hz0 + hz1) / 2, roofM); for (const [w, d, x, z] of [[W + 0.6, 0.2, cx, hz0 - 0.2], [W + 0.6, 0.2, cx, hz1 + 0.2], [0.2, D + 0.6, hx0 - 0.2, (hz0 + hz1) / 2], [0.2, D + 0.6, hx1 + 0.2, (hz0 + hz1) / 2]]) Bx(w, 0.6, d, x, top + 0.6, z, wallMat); }
    else if (s.roof === 'gable') { const rise = Math.min(4, D * 0.38), sh = new THREE.Shape(); sh.moveTo(-D / 2 - 0.5, 0); sh.lineTo(D / 2 + 0.5, 0); sh.lineTo(0, rise); sh.closePath(); const r = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: W + 0.8, bevelEnabled: false }), roofM); r.rotation.y = Math.PI / 2; r.position.set(hx0 - 0.4, top, (hz0 + hz1) / 2); r.castShadow = true; g.add(r);
      for (const x of [hx0 + 0.02, hx1 - 0.02]) { const gsh = new THREE.Shape(); gsh.moveTo(-D / 2, 0); gsh.lineTo(D / 2, 0); gsh.lineTo(0, rise - 0.3); gsh.closePath(); const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gsh, { depth: 0.2, bevelEnabled: false }), wallMat); gm.rotation.y = Math.PI / 2; gm.position.set(x - 0.1, top, (hz0 + hz1) / 2); g.add(gm); } }
    else { const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(W, D) / 2 + 0.6, Math.min(4, Math.min(W, D) * 0.4), 4, 1), roofM); r.rotation.y = Math.PI / 4; r.scale.set(W / Math.hypot(W, D) * 1.414, 1, D / Math.hypot(W, D) * 1.414); r.position.set(cx, top + Math.min(4, Math.min(W, D) * 0.4) / 2, (hz0 + hz1) / 2); r.castShadow = true; g.add(r); }
    // ---- extras ----
    if (s.extras.chimney) Bx(0.9, s.roof === 'flat' ? 1.6 : 4.2, 0.9, hx0 + 1.5, top + (s.roof === 'flat' ? 0.8 : 2.1), hz1 - 2, flat(0x8a4a3a));
    if (s.extras.porch) { Bx(3.4, 0.15, 2, cx, Y0 + 2.7, hz0 - 1, roofM); for (const sd of [-1, 1]) Bx(0.15, 2.7, 0.15, cx + sd * 1.5, Y0 + 1.35, hz0 - 1.9, trim); Bx(3.4, Y0, 2, cx, Y0 / 2, hz0 - 1, flat(0x8f938f)); }
    if (s.extras.balcony && s.floors > 1) { const y = Y0 + FH; Bx(W * 0.5, 0.2, 1.6, cx, y, hz0 - 0.8, flat(0x8f938f)); Bx(W * 0.5, 1, 0.05, cx, y + 0.6, hz0 - 1.6, glassM); Bx(W * 0.5, 0.06, 0.08, cx, y + 1.1, hz0 - 1.6, trim); }
    if (s.extras.garage) { const gx = hx1 + 3.5; Bx(6.6, 3, 7, gx, 1.5, hz0 + 3.5, wallMat); Bx(6.9, 0.25, 7.3, gx, 3.1, hz0 + 3.5, roofM); Bx(5, 2.4, 0.06, gx, 1.25, hz0 - 0.03, flat(new THREE.Color(s.door).getHex())); for (let k = 0; k < 6; k++) Bx(5, 0.04, 0.08, gx, 0.3 + k * 0.4, hz0 - 0.06, trim); solid(gx - 3.3, gx + 3.3, hz0, hz0 + 7); Bx(5, 0.05, hz0 - p.z0, gx, 0.03, (p.z0 + hz0) / 2, paving); }
    let poolRect = null;
    if (s.extras.pool) {   // a raised pool in the back garden: a stone rim you walk round (steps up at the house end), 1.2 m of water
      const pz0 = hz1 + 3.5, pz1 = Math.min(p.z1 - 2, pz0 + 7), pw = Math.min(W, 10), x0 = cx - pw / 2, x1 = cx + pw / 2, rim = flat(0xe8e2d6, { rough: 0.8 }), RIM = 1.25;
      for (const [w, d, x, z] of [[pw + 1.6, 0.8, cx, pz0 - 0.4], [pw + 1.6, 0.8, cx, pz1 + 0.4], [0.8, pz1 - pz0, x0 - 0.4, (pz0 + pz1) / 2], [0.8, pz1 - pz0, x1 + 0.4, (pz0 + pz1) / 2]]) Bx(w, RIM, d, x, RIM / 2, z, rim);
      Bx(pw, 0.05, pz1 - pz0, cx, 0.03, (pz0 + pz1) / 2, flat(0x2f8fbf));
      Bx(pw, 0.04, pz1 - pz0, cx, RIM - 0.17, (pz0 + pz1) / 2, flat(0x3fa9d6, { opacity: 0.7, rough: 0.05, emissive: 0x0b4f6a, ei: 0.35 }));
      for (let i = 0; i < 5; i++) Bx(2, RIM * (i + 1) / 5, 0.5, cx, RIM * (i + 1) / 10, pz0 - 0.8 - (4 - i) * 0.5 - 0.25, rim);   // the steps up
      ctx.poolZones?.push({ minX: x0, maxX: x1, minZ: pz0, maxZ: pz1, waterY: RIM - 0.15 });
      const under = -0.9;   // (the rim's walls stop you walking into it from the lawn, or swimming out except by the steps; on top you walk freely)
      for (const [mx0, mx1, mz0, mz1] of [[x0 - 0.8, x1 + 0.8, pz1, pz1 + 0.8], [x0 - 0.8, x0, pz0 - 0.8, pz1 + 0.8], [x1, x1 + 0.8, pz0 - 0.8, pz1 + 0.8], [x0, cx - 1.1, pz0 - 0.8, pz0], [cx + 1.1, x1, pz0 - 0.8, pz0]]) solid(mx0, mx1, mz0, mz1, under);
      poolRect = { x0, x1, z0: pz0, z1: pz1, rim: RIM, cx }; }
    if (s.extras.fence) { const fm = flat(0xf2efe9, { rough: 0.6 }); for (const [a, b, z] of [[p.x0, cx - 2, p.z0 + 0.3], [cx + 2, s.extras.garage ? hx1 + 0.8 : p.x1, p.z0 + 0.3], ...(s.extras.garage ? [[hx1 + 6.2, p.x1, p.z0 + 0.3]] : [])]) if (b > a) { Bx(b - a, 0.08, 0.06, (a + b) / 2, 0.85, z, fm); Bx(b - a, 0.08, 0.06, (a + b) / 2, 0.45, z, fm); for (let x = a; x <= b; x += 0.6) Bx(0.08, 1, 0.08, x, 0.5, z, fm); solid(a, b, z - 0.1, z + 0.1); }
      for (const x of [p.x0, p.x1]) { Bx(0.06, 1, p.z1 - p.z0, x, 0.5, (p.z0 + p.z1) / 2, fm); solid(x - 0.1, x + 0.1, p.z0, p.z1); } Bx(p.x1 - p.x0, 1, 0.06, (p.x0 + p.x1) / 2, 0.5, p.z1, fm); solid(p.x0, p.x1, p.z1 - 0.1, p.z1 + 0.1); }
    Bx(1.6, 0.05, hz0 - p.z0, cx, 0.03, (p.z0 + hz0) / 2, paving);   // the path to the door
    // ---- inside ----
    furnish(g, s, L, flight, solid);
    ctx.planeBlocks?.push({ minX: hx0, maxX: hx1, minZ: hz0, maxZ: hz1, top: top + 1 });   // indoors: first person
    st.cols = cols; st.layout = L; st.flight = flight; st.pool = poolRect; ctx.rebuild?.();
  }
  function furnish(g, s, L, flight, solid) {
    const { hx0, hx1, hz0, hz1, cx } = L, Bx = (w, h, d, x, y, z, m) => B(w, h, d, x, y, z, m, false, g);
    const wood = flat(0x6b4a33, { rough: 0.6 }), cream = flat(0xe9e4da, { rough: 0.8 }), white = flat(0xf8f8f5, { rough: 0.25 }), dark = flat(0x2a2e33, { rough: 0.5 }), tile = flat(0xdfe6ea, { rough: 0.35 });
    const spot = (x, z, y, r, label, action) => { const it = { pos: new THREE.Vector3(x, y, z), r, label, action }; ctx.interactables.push(it); };
    const seat = (x, z, y, yaw, label, extra = {}) => ctx.sitSpots?.push({ x, z, yaw, seatY: y, label, ...extra });
    const xR = s.floors > 1 ? hx1 - 3.1 : hx1 - 0.3;   // (the stairs take the right-hand side)
    const y0 = Y0;
    // ground floor: the living room at the front left (a sofa facing the TV on the side wall), the kitchen along the back
    { const sx = hx0 + 2.9, sz = hz0 + 2.6, rug = flat(0x7b2f2f, { rough: 1 });
      Bx(0.9, 0.45, 2.4, sx, y0 + 0.25, sz, cream); Bx(0.22, 0.6, 2.4, sx + 0.4, y0 + 0.7, sz, cream); solid(sx - 0.45, sx + 0.5, sz - 1.2, sz + 1.2, y0); for (const dz of [-0.7, 0.7]) seat(sx - 0.05, sz + dz, y0 + 0.45, -Math.PI / 2, 'Sit on the sofa');
      Bx(0.6, 0.35, 1.2, sx - 1.3, y0 + 0.18, sz, wood); solid(sx - 1.6, sx - 1.0, sz - 0.6, sz + 0.6, y0); Bx(2.4, 0.02, 2.8, sx - 1.2, y0 + 0.03, sz, rug);
      Bx(0.4, 0.5, 1.8, hx0 + 0.4, y0 + 0.25, sz, wood); Bx(0.06, 0.85, 1.5, hx0 + 0.45, y0 + 1.0, sz, flat(0x050505, { rough: 0.2 })); solid(hx0, hx0 + 0.6, sz - 0.9, sz + 0.9, y0);
      spot(sx - 0.8, sz, y0, 1.6, 'Watch TV', () => { ctx.rest?.(5); toast('📺 You put your feet up and watch TV in your own living room.'); }); }
    { const ka = hx0 + (s.floors > 1 ? 0.3 : 3.6), kb = Math.min(xR - 0.2, ka + 5); if (kb - ka > 1.5) { Bx(kb - ka, 0.9, 0.6, (ka + kb) / 2, y0 + 0.45, hz1 - 0.42, white); Bx(kb - ka + 0.05, 0.05, 0.65, (ka + kb) / 2, y0 + 0.92, hz1 - 0.42, dark); solid(ka, kb, hz1 - 0.75, hz1, y0);
        spot((ka + kb) / 2, hz1 - 1.3, y0, 1.6, 'Cook something', () => { ctx.eat?.(25); toast('🍳 You cook a proper meal in your own kitchen.'); });
        const tx = (ka + kb) / 2, tz = hz1 - 2.6; if (tz - hz0 > 4) { Bx(1.6, 0.06, 0.9, tx, y0 + 0.76, tz, wood); Bx(0.1, 0.74, 0.1, tx, y0 + 0.38, tz, wood); for (const dx of [-0.5, 0.5]) for (const sd of [-1, 1]) { Bx(0.4, 0.45, 0.4, tx + dx, y0 + 0.23, tz + sd * 0.75, wood); seat(tx + dx, tz + sd * 0.75, y0 + 0.47, sd > 0 ? Math.PI : 0, 'Sit at the table'); } solid(tx - 0.8, tx + 0.8, tz - 0.45, tz + 0.45, y0); } } }
    // the bathroom and bedroom: upstairs if there is one, otherwise at the back of the ground floor
    const by = s.floors > 1 ? Y0 + FH : y0;
    const bx0 = hx0, bx1 = hx0 + 3.2, bz0 = hz1 - 3.2, bz1 = hz1;   // bathroom: the back-left corner
    { const inner = flat(0xf3efe6, { rough: 0.85 }), h = FH - 0.3;
      Bx(0.15, h, 3.2, bx1, by + h / 2, (bz0 + bz1) / 2, inner); solid(bx1 - 0.08, bx1 + 0.08, bz0, bz1, by);
      Bx(1.8, h, 0.15, bx0 + 0.9, by + h / 2, bz0, inner); Bx(0.4, h, 0.15, bx1 - 0.2, by + h / 2, bz0, inner); Bx(1.0, h - 2.2, 0.15, bx0 + 2.3, by + 2.2 + (h - 2.2) / 2, bz0, inner);
      solid(bx0, bx0 + 1.8, bz0 - 0.08, bz0 + 0.08, by); solid(bx1 - 0.4, bx1, bz0 - 0.08, bz0 + 0.08, by);
      ctx.doors?.add({ a: [bx0 + 1.8, bz0], b: [bx0 + 2.8, bz0], y: by, color: 0xf2efe9 });
      Bx(3.1, 0.02, 3.1, (bx0 + bx1) / 2, by + 0.025, (bz0 + bz1) / 2, tile);
      Bx(0.4, 0.4, 0.5, bx0 + 0.45, by + 0.2, bz0 + 0.7, white); Bx(0.16, 0.38, 0.42, bx0 + 0.18, by + 0.62, bz0 + 0.7, white); seat(bx0 + 0.5, bz0 + 0.7, by + 0.45, Math.PI / 2, 'Use the toilet', { toilet: true });
      Bx(1.3, 0.1, 1.3, bx1 - 0.75, by + 0.06, bz1 - 0.75, white); Bx(0.04, 2, 1.3, bx1 - 1.4, by + 1.05, bz1 - 0.75, glassM2()); spot(bx1 - 0.75, bz1 - 0.75, by, 1, 'Take a shower', () => ctx.chore?.('shower'));
      Bx(0.6, 0.85, 0.42, bx0 + 1.6, by + 0.43, bz1 - 0.3, white); spot(bx0 + 1.6, bz1 - 0.95, by, 0.8, 'Wash your hands', () => ctx.chore?.('handwash')); }
    { const bedX = s.floors > 1 ? hx0 + 2 : hx1 - 1.3, bedZ = s.floors > 1 ? hz0 + 2.2 : hz0 + 1.6;   // the bed (a bungalow's is in the front right corner)
      Bx(1.8, 0.45, 2.2, bedX, by + 0.25, bedZ, wood); Bx(1.7, 0.22, 2.1, bedX, by + 0.55, bedZ, white); Bx(1.75, 0.05, 1.2, bedX, by + 0.68, bedZ + 0.4, flat(0x2f4a6b)); solid(bedX - 0.9, bedX + 0.9, bedZ - 1.1, bedZ + 1.1, by);
      spot(bedX + (s.floors > 1 ? 1.4 : -1.4), bedZ, by, 1.4, 'Sleep in your bed', () => ctx.sleep?.()); }
    if (s.floors > 2) { const y2 = Y0 + 2 * FH; Bx(1.6, 0.45, 2, hx0 + 2, y2 + 0.25, hz1 - 1.5, wood); Bx(1.5, 0.22, 1.9, hx0 + 2, y2 + 0.55, hz1 - 1.5, white); solid(hx0 + 1.2, hx0 + 2.8, hz1 - 2.5, hz1 - 0.5, y2); spot(hx0 + 3.2, hz1 - 1.5, y2, 1.4, 'Sleep in the spare bed', () => ctx.sleep?.());
      Bx(1.6, 0.06, 0.8, hx0 + 2, y2 + 0.76, hz0 + 1.2, wood); seat(hx0 + 2, hz0 + 1.9, y2 + 0.47, Math.PI, 'Sit at the desk'); }
  }
  const glassM2 = () => flat(0x9fd3ff, { opacity: 0.3, rough: 0.05 });
  function scaffold(p, s) {   // while it's being built: a frame of poles and boards the size of the house, and a sign
    const st = plotState.get(p.id); st.sale.visible = false;
    const g = new THREE.Group(); root.add(g); st.site = g;
    const L = layout(p, s), h = Y0 + s.floors * FH + 1, pole = flat(0xc9a24a, { metal: 0.4 }), board = flat(0x8a6a3a);
    for (let x = L.hx0 - 0.8; x <= L.hx1 + 0.81; x += 2) for (const z of [L.hz0 - 0.8, L.hz1 + 0.8]) B(0.08, h, 0.08, x, h / 2, z, pole, false, g);
    for (let y = 1.6; y < h; y += 1.6) { B(L.hx1 - L.hx0 + 1.6, 0.06, 0.6, (L.hx0 + L.hx1) / 2, y, L.hz0 - 0.8, board, false, g); B(L.hx1 - L.hx0 + 1.6, 0.06, 0.6, (L.hx0 + L.hx1) / 2, y, L.hz1 + 0.8, board, false, g); }
    B(s.w, Y0, s.d, L.cx, Y0 / 2, (L.hz0 + L.hz1) / 2, flat(0x8f938f), false, g);
    const t = ctx.makeTex(256, 96, q => { q.fillStyle = '#ffd23f'; q.fillRect(0, 0, 256, 96); q.fillStyle = '#111'; q.font = 'bold 30px sans-serif'; q.textAlign = 'center'; q.fillText('UNDER CONSTRUCTION', 128, 42); q.font = '20px sans-serif'; q.fillText('Maple Fields Homebuilders', 128, 76); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshStandardMaterial({ map: t })); sg.position.set(L.cx + 5, 1.6, p.z0 + 1.4); sg.rotation.y = Math.PI; g.add(sg);
  }
  // ---------------- saving ----------------
  const KEY = 'aw-homes';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = () => { try { const o = {}; for (const [id, st] of plotState) if (st.spec) o[id] = { spec: st.spec, doneAt: st.doneAt }; localStorage.setItem(KEY, JSON.stringify(o)); } catch { } };
  for (const [id, rec] of Object.entries(load())) { const st = plotState.get(id); if (!st || !rec?.spec) continue; st.spec = clampSpec(rec.spec); st.doneAt = rec.doneAt || 0; if (Date.now() >= st.doneAt) build(st.plot, st.spec); else scaffold(st.plot, st.spec); }
  const BUILD_MS = 120000;
  function buy(p, spec) {
    const st = plotState.get(p.id), price = priceOf(spec);
    if (st.spec) return `Plot ${p.n} is already yours.`;
    if (ctx.money() < price) return `Not enough gold: this house costs ${price.toLocaleString()} and you have ${Math.floor(ctx.money()).toLocaleString()}.`;
    ctx.spend(price); st.spec = clampSpec(spec); st.doneAt = Date.now() + BUILD_MS; save(); scaffold(p, st.spec);
    toast(`🏗️ Bought plot ${p.n} at Maple Fields for ${price.toLocaleString()} gold. The builders are on it: your house will be ready in about two minutes.`);
    return null;
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
  let spec = clampSpec(DESIGNS[1]), plotId = null;
  const opt = (obj, v) => Object.entries(obj).map(([k, o]) => `<option value="${k}"${k === v ? ' selected' : ''}>${o.name}</option>`).join('');
  function render() {
    const free = PLOTS.filter(p => !plotState.get(p.id).spec);
    if (!free.find(p => p.id === plotId)) plotId = free[0]?.id ?? null;
    panel.innerHTML = `<div class="card"><div>
      <div class="row"><h2>🏡 Maple Fields Homebuilders</h2><button type="button" data-close>Close (Esc)</button></div>
      <div style="color:#aab4bf">Pick a design to start from, then change anything you like.</div>
      <h3>Our designs</h3><div class="designs">${DESIGNS.map((d, i) => `<button type="button" data-design="${i}">${d.name}</button>`).join('')}</div>
      <h3>Plot</h3><label>Plot <select data-k="plot">${free.length ? free.map(p => `<option value="${p.id}"${p.id === plotId ? ' selected' : ''}>Plot ${p.n}</option>`).join('') : '<option>All plots are sold</option>'}</select></label>
      <h3>Structure</h3>
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
      <div style="color:#aab4bf">${spec.floors} floor${spec.floors > 1 ? 's' : ''} · ${spec.w} × ${spec.d} m · ${MATERIALS[spec.wall].name.toLowerCase()} walls · ${ROOFS[spec.roof].name.toLowerCase()} roof · you have ${Math.floor(ctx.money()).toLocaleString()} gold</div>
      <div class="msg"></div>
      <div class="row"><span style="color:#aab4bf">Includes the plot. Built in about two minutes.</span><button type="button" class="buy"${plotId ? '' : ' disabled'}>Buy and build</button></div>
      <h3>Your houses</h3><div>${PLOTS.filter(p => plotState.get(p.id).spec).map(p => { const st = plotState.get(p.id); return `Plot ${p.n}: ${st.spec.name || 'your design'} ${Date.now() < st.doneAt ? '(being built)' : ''}`; }).join('<br>') || '<span style="color:#8a96a2">None yet.</span>'}</div>
    </div></div>`;
    draw(panel.querySelector('canvas'));
  }
  panel.addEventListener('input', e => {
    const t = e.target, k = t.dataset.k, x = t.dataset.x;
    if (k === 'plot') plotId = t.value; else if (k) spec = clampSpec({ ...spec, name: 'Your own design', [k]: t.type === 'range' || k === 'floors' ? +t.value : t.value });
    if (x) spec = clampSpec({ ...spec, name: 'Your own design', extras: { ...spec.extras, [x]: t.checked } });
    if (t.type === 'color' || t.type === 'range') { const c = panel.querySelector('canvas'); draw(c); panel.querySelector('.price').textContent = priceOf(spec).toLocaleString() + ' gold'; if (t.type === 'range') t.parentElement.firstChild.textContent = (k === 'w' ? 'Width: ' : 'Depth: ') + t.value + ' m '; }
    else render();
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.close != null) return closePanel();
    if (b.dataset.design != null) { spec = clampSpec(DESIGNS[+b.dataset.design]); return render(); }
    if (b.classList.contains('buy')) { const p = PLOTS.find(q => q.id === plotId); if (!p) return; const err = buy(p, spec); if (err) panel.querySelector('.msg').textContent = err; else { closePanel(); } }
  });
  addEventListener('keydown', e => { if (!panel.hidden && e.code === 'Escape') { e.stopImmediatePropagation(); closePanel(); } }, true);
  function openPanel() { render(); panel.hidden = false; ctx.pause?.(); }
  function closePanel() { panel.hidden = true; ctx.resume?.(); }
  // the front of the house, drawn to scale (1 m = 18 px), as you design it
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
    if (s.extras.pool) { g.fillStyle = '#3fa9d6'; g.fillRect(W - 110, ground + 18, 90, 14); g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.fillText('pool (behind)', W - 110, ground + 15); }
    g.fillStyle = '#1b2027'; g.font = '12px sans-serif'; g.fillText(`${s.w} m`, x0 + hw / 2 - 12, ground + 34);
  }

  let tick = 0;
  return {
    plots: PLOTS, state: plotState, open: openPanel, priceOf,
    get isOpen() { return !panel.hidden; },
    // the stairs and upper floors of the houses you've built
    groundAt(x, z, y = 0) {
      if (z < 1180 || z > 1240 || x < -100 || x > 430) return null;
      for (const st of plotState.values()) {
        if (!st.layout || !st.group) continue; const L = st.layout, s = st.spec, P = st.pool;
        if (P && x > P.x0 - 0.8 && x < P.x1 + 0.8 && z > P.z0 - 3.3 && z < P.z1 + 0.8) {
          if (x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1) return 0.05;   // the bottom of the pool
          if (z >= P.z0 - 0.8) return P.rim;   // walking round the rim
          if (Math.abs(x - P.cx) < 1) return Math.max(0, Math.min(P.rim, Math.ceil((z - (P.z0 - 3.3)) / 0.5) * P.rim / 5));   // the steps
          continue; }
        if (s.extras.porch && Math.abs(x - L.cx) < 1.7 && z > L.hz0 - 2 && z < L.hz0) return Y0;
        if (x < L.hx0 || x > L.hx1 || z < L.hz0 || z > L.hz1) continue;
        for (let k = 0; k < s.floors - 1; k++) { const f = st.flight(k), yb = Y0 + k * FH; if (x >= f.x0 && x <= f.x1 && z >= Math.min(f.zLow, f.zHigh) && z <= Math.max(f.zLow, f.zHigh)) { const t = (z - f.zLow) / (f.zHigh - f.zLow), h = yb + FH * Math.max(0, Math.min(1, t)); if (y > h - 1.1 && y < h + 1.6) return h; } }
        let level = Math.max(0, Math.min(s.floors - 1, Math.floor((y - Y0 + 1.2) / FH)));
        for (; level > 0; level--) { const f = st.flight(level - 1), lo = Math.min(f.zLow + (f.zHigh - f.zLow) * 0.4, f.zHigh), hi = Math.max(f.zLow + (f.zHigh - f.zLow) * 0.4, f.zHigh); if (!(x >= f.x0 - 0.05 && x <= f.x1 + 0.05 && z >= lo && z <= hi)) break; }
        return Y0 + level * FH;
      }
      return null;
    },
    update(dt) {
      if ((tick -= dt) > 0) return; tick = 1;
      for (const st of plotState.values()) if (st.spec && !st.group && Date.now() >= st.doneAt) { st.site?.parent?.remove(st.site); st.site = null; build(st.plot, st.spec); toast(`🏡 Your house on plot ${st.plot.n} at Maple Fields is finished. The keys are yours.`); }
    },
  };
}
